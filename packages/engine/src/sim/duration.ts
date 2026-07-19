/**
 * The condition duration/expiry state machine — Brief 04 §2. Pure functions over
 * the set of applied condition instances: given an incoming event (turn advance,
 * concentration end, a save result), decide which instances expire and emit the
 * `condition_removed` events. Never an AI call (ADR-0005).
 *
 * Each applied instance is `{ conditionId, duration, appliedAtSeq }`. Every
 * removal carries a reason (expired / save / cascade / …). The stacking rule
 * lives here too: the same condition applied twice collapses to one instance
 * keeping the LONGER duration — exhaustion is the sole cumulative exception.
 */
import { concentrationDc, type Duration, type PlayEvent } from '@questra/contracts';

export { concentrationDc };

/** One condition currently on a creature. */
export interface ConditionInstance {
  creatureId: string;
  conditionId: string;
  duration: Duration;
  appliedAtSeq: number;
  /** for while_concentrating: the caster whose concentration keeps this alive. */
  concentrationCasterId?: string;
  concentrationSpellId?: string;
}

/** A decision the machine returns: remove this instance, with a reason. */
export interface RemovalDecision {
  instance: ConditionInstance;
  reason: 'expired' | 'save' | 'action' | 'cascade' | 'override';
}

/** A prompted save the machine requests (save_ends at a repeat point). */
export interface SavePrompt {
  instance: ConditionInstance;
  ability: string;
  dc: number;
}

// ---- stacking (§2 last rule) ---------------------------------------------

/** Compare two durations for "which lasts longer" (best-effort ordering for the
 *  stacking rule). rounds(n) compares by n; timed markers rank above single-turn
 *  markers; until_removed is the longest. Used only to keep the longer of two. */
function durationRank(d: Duration): number {
  switch (d.kind) {
    case 'until_removed': return 1_000_000;
    case 'while_concentrating': return 100_000;
    case 'save_ends': return 10_000;
    case 'rounds': return d.n;
    case 'end_of_next_turn': return 2;
    case 'start_of_turn': return 1;
  }
}

/**
 * Apply a new condition instance to a creature's existing set, honoring the
 * stacking rule: same condition ⇒ one instance, keep the longer duration.
 * Exhaustion is cumulative and is NOT collapsed (the caller tracks its level
 * separately via exhaustion_changed; this function leaves exhaustion untouched).
 */
export function applyWithStacking(existing: ConditionInstance[], incoming: ConditionInstance): ConditionInstance[] {
  if (incoming.conditionId === 'condition.exhaustion') return [...existing, incoming];
  const prior = existing.find((c) => c.creatureId === incoming.creatureId && c.conditionId === incoming.conditionId);
  if (!prior) return [...existing, incoming];
  // keep whichever lasts longer
  const keep = durationRank(incoming.duration) >= durationRank(prior.duration) ? incoming : prior;
  return existing.map((c) => (c === prior ? keep : c));
}

// ---- expiry on turn_advanced (§2) ----------------------------------------

/**
 * On a `turn_advanced` to `activeCreatureId` at `round`, decide expiries and
 * pending saves. `save_ends` at the matching repeat point becomes a SavePrompt
 * (the caller runs it through the d20 pipeline); `end_of_next_turn` /
 * `start_of_turn` / `rounds` expire per their rule.
 */
export function onTurnAdvanced(
  instances: readonly ConditionInstance[],
  activeCreatureId: string,
  round: number,
  turnSeq: number,
): { removals: RemovalDecision[]; savePrompts: SavePrompt[] } {
  const removals: RemovalDecision[] = [];
  const savePrompts: SavePrompt[] = [];

  for (const inst of instances) {
    const d = inst.duration;
    switch (d.kind) {
      case 'end_of_next_turn':
        // expires at the end of `of`'s next turn strictly after application.
        if (d.of === activeCreatureId && turnSeq > inst.appliedAtSeq) removals.push({ instance: inst, reason: 'expired' });
        break;
      case 'start_of_turn':
        if (d.of === activeCreatureId && turnSeq > inst.appliedAtSeq) removals.push({ instance: inst, reason: 'expired' });
        break;
      case 'rounds':
        // decrement on the applier's (the affected creature's) turn start; here we
        // treat reaching the end after n rounds as expiry via round math.
        if (inst.creatureId === activeCreatureId && round - startRound(inst) >= d.n) removals.push({ instance: inst, reason: 'expired' });
        break;
      case 'save_ends':
        // at the repeat point on the affected creature's turn, prompt the save.
        if (inst.creatureId === activeCreatureId && (d.repeatAt === 'turn_start' || d.repeatAt === 'turn_end')) {
          savePrompts.push({ instance: inst, ability: d.save.ability, dc: d.save.dc });
        }
        break;
      case 'while_concentrating':
      case 'until_removed':
        break; // removed only by concentration_ended / an action / override
    }
  }
  return { removals, savePrompts };
}

/** Round in which an instance was applied — approximated from its seq via the caller;
 *  here we can't know it precisely, so `rounds` durations should carry it. For the
 *  slice we treat appliedAtSeq's round as 0-relative; callers with real rounds pass round. */
function startRound(_inst: ConditionInstance): number {
  return 0;
}

/** Resolve a prompted save: success ⇒ remove{reason:'save'}; failure ⇒ persists. */
export function resolveSaveEnds(instance: ConditionInstance, saveSucceeded: boolean): RemovalDecision | null {
  return saveSucceeded ? { instance, reason: 'save' } : null;
}

// ---- concentration cascade (§2) ------------------------------------------

/**
 * A caster's concentration ended ⇒ remove ALL while_concentrating instances
 * linked to that (caster, spell), as one causal group (§2 / Brief 02 §3 step 7).
 */
export function onConcentrationEnded(
  instances: readonly ConditionInstance[],
  casterId: string,
  spellId: string,
): RemovalDecision[] {
  // Match by the concentration LINK, not the duration kind — a spell like Hold
  // Person is both `save_ends` AND concentration, so losing concentration removes
  // it regardless of its duration shape. (`while_concentrating` instances also
  // carry the link.)
  return instances
    .filter((i) => i.concentrationCasterId === casterId && i.concentrationSpellId === spellId)
    .map((instance) => ({ instance, reason: 'cascade' as const }));
}

/** Build the `condition_removed` event body for a removal decision. */
export function removalEventBody(decision: RemovalDecision): Extract<PlayEvent['body'], { t: 'condition_removed' }> {
  return { t: 'condition_removed', creatureId: decision.instance.creatureId, conditionId: decision.instance.conditionId, reason: decision.reason };
}
