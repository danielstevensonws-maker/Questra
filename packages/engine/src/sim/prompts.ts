/**
 * Boss machinery & the interrupt-prompt lifecycle — Brief 08. Pure and AI-free
 * (ADR-0005). ONE component ("prompt the holder") used six ways: opportunity
 * attacks, reaction features, readied actions, legendary actions, legendary
 * resistance, and lair actions. The server owns the wire lifecycle
 * (reaction_prompted → reaction_taken/declined); this module is the pure decision
 * logic feeding it: what to prompt, in what order, and how the economy moves.
 *
 * Reaction economy (§3 #2): a reaction spent on someone else's turn is
 * unavailable until the HOLDER's next turn start — per-creature, never a global
 * reset. `resetReactionsOnTurn` resets only the creature whose turn began.
 *
 * The legendary pool (§3 #3) can only be offered at TURN BOUNDARIES, never
 * mid-cascade, so the event log stays linear. Legendary resistance (§3 #4) is
 * the one interrupt that DOES fire mid-cascade: `heldCascade` holds a failed
 * save's downstream events until the prompt resolves.
 */
import type { Ability, PlayEvent, PromptContext, PromptOption } from '@questra/contracts';

type Body = PlayEvent['body'];

// ---- prompt lifecycle (§1) ------------------------------------------------

export const DEFAULT_TIMEOUT_SEC = 60;

export interface PromptRequest {
  promptId: string;
  holderId: string;
  context: PromptContext;
  timeoutSec: number;
}

/** Build a `reaction_prompted` event body from a request (§1). */
export function promptedEvent(req: PromptRequest): Body {
  return { t: 'reaction_prompted', promptId: req.promptId, creatureId: req.holderId, context: req.context, timeoutSec: req.timeoutSec };
}

/** Resolve a prompt: taken (optionally a named choice) or declined (with a reason). */
export function takenEvent(promptId: string, choice?: string): Body {
  return { t: 'reaction_taken', promptId, ...(choice ? { choice } : {}) };
}
export function declinedEvent(promptId: string, reason: 'holder' | 'timeout' | 'dm'): Body {
  return { t: 'reaction_declined', promptId, reason };
}

/**
 * One modal-priority prompt at a time per viewer; the rest queue (§1). Given the
 * pending prompts for a viewer, return the active one (first) and the queued rest.
 * The DM can always answer for anyone, so DM-held prompts never block a player's.
 */
export function activePromptFor(viewerHolderId: string, pending: readonly PromptRequest[]): { active: PromptRequest | null; queued: PromptRequest[] } {
  const mine = pending.filter((p) => p.holderId === viewerHolderId);
  const [active, ...queued] = mine;
  return { active: active ?? null, queued };
}

// ---- opportunity attacks (§2, §3 #1) --------------------------------------

/**
 * Multiple OA candidates on one move step resolve in initiative order, each
 * spending its own reaction (§3 #1). Given the candidate holders (already sorted
 * by initiative) that still have a reaction, build one prompt each.
 */
export function opportunityPrompts(
  moverId: string,
  step: { from: { x: number; y: number }; to: { x: number; y: number } },
  candidates: readonly { holderId: string; attackOptions: string[]; reactionAvailable: boolean }[],
  nextPromptId: (i: number) => string,
): PromptRequest[] {
  return candidates
    .filter((c) => c.reactionAvailable && c.attackOptions.length > 0)
    .map((c, i) => ({
      promptId: nextPromptId(i),
      holderId: c.holderId,
      timeoutSec: DEFAULT_TIMEOUT_SEC,
      context: {
        kind: 'opportunity_attack' as const,
        moverId, provokerId: c.holderId,
        pathStep: { from: step.from, to: step.to },
        attackOptions: c.attackOptions as [string, ...string[]],
      },
    }));
}

// ---- reaction economy (§3 #2) ---------------------------------------------

/** Per-creature reaction availability, folded from taken/turn events. */
export type ReactionState = Record<string, { reactionAvailable: boolean }>;

/** A reaction was taken ⇒ the holder's reaction is spent until their next turn. */
export function spendReaction(state: ReactionState, holderId: string): ReactionState {
  return { ...state, [holderId]: { reactionAvailable: false } };
}

/**
 * `turn_advanced` resets the reaction of ONLY the creature whose turn began —
 * never every creature (§3 #2). This is the fix the brief asks to verify: a
 * global reset would wrongly refund reactions spent on other turns.
 */
export function resetReactionsOnTurn(state: ReactionState, activeCreatureId: string): ReactionState {
  return { ...state, [activeCreatureId]: { reactionAvailable: true } };
}

// ---- legendary actions (§2, §3 #3) ----------------------------------------

export interface LegendaryPool {
  bossId: string;
  poolMax: number;
  remaining: number;
  options: { name: string; cost: number; action: string }[];
}

/** The pool resets to full at the boss's own turn start (`resource_changed`). */
export function resetLegendaryPool(pool: LegendaryPool): { pool: LegendaryPool; event: Body } {
  return {
    pool: { ...pool, remaining: pool.poolMax },
    event: { t: 'resource_changed', creatureId: pool.bossId, pool: 'legendary', delta: pool.poolMax - pool.remaining, remaining: pool.poolMax },
  };
}

/** Options the boss can currently AFFORD (offered only at a turn boundary, §3 #3). */
export function affordableLegendary(pool: LegendaryPool): PromptOption[] {
  return pool.options.filter((o) => o.cost <= pool.remaining).map((o) => ({ name: o.name, cost: o.cost }));
}

/**
 * After another creature's turn ends, if affordable options exist, build the
 * quiet DM prompt (§2). Returns null if nothing is affordable (no prompt).
 */
export function legendaryPromptAtTurnEnd(pool: LegendaryPool, promptId: string): PromptRequest | null {
  const options = affordableLegendary(pool);
  if (options.length === 0) return null;
  return {
    promptId, holderId: pool.bossId, timeoutSec: DEFAULT_TIMEOUT_SEC,
    context: { kind: 'legendary_action', poolRemaining: pool.remaining, options: options as [PromptOption, ...PromptOption[]] },
  };
}

/** Spend a chosen legendary option: cost leaves the pool (`resource_changed`);
 *  the action itself then resolves via the normal pipeline (the caller runs it). */
export function spendLegendary(pool: LegendaryPool, optionName: string): { pool: LegendaryPool; events: Body[] } | null {
  const opt = pool.options.find((o) => o.name === optionName);
  if (!opt || opt.cost > pool.remaining) return null;
  const remaining = pool.remaining - opt.cost;
  return {
    pool: { ...pool, remaining },
    events: [{ t: 'resource_changed', creatureId: pool.bossId, pool: 'legendary', delta: -opt.cost, remaining }],
  };
}

// ---- legendary resistance (§3 #4: the held cascade) -----------------------

export interface LegendaryResistance {
  bossId: string;
  usesLeft: number;
}

/**
 * The boss just FAILED a save. Legendary resistance may flip it — so the failure's
 * downstream events are HELD until the prompt resolves (§3 #4, the one mid-cascade
 * interrupt). Returns the prompt to raise + a resolver over the held cascade.
 */
export function heldCascade(
  lr: LegendaryResistance,
  save: { ability: Ability; dc: number },
  downstream: Body[],
  promptId: string,
): {
  prompt: PromptRequest | null;
  /** call with the DM's decision; returns the events to actually emit + the new LR state. */
  resolve: (useResistance: boolean) => { events: Body[]; lr: LegendaryResistance };
} {
  const canUse = lr.usesLeft > 0;
  const prompt: PromptRequest | null = canUse
    ? {
        promptId, holderId: lr.bossId, timeoutSec: DEFAULT_TIMEOUT_SEC,
        context: { kind: 'legendary_resistance', save, usesLeft: lr.usesLeft },
      }
    : null;
  return {
    prompt,
    resolve: (useResistance: boolean) => {
      if (canUse && useResistance) {
        // flip to a success: NONE of the downstream failure events ever emit; the
        // use is spent and logged (the caller stamps dm_only visibility on the note).
        return {
          events: [{ t: 'resource_changed', creatureId: lr.bossId, pool: 'legendary_resistance', delta: -1, remaining: lr.usesLeft - 1 }],
          lr: { ...lr, usesLeft: lr.usesLeft - 1 },
        };
      }
      // declined (or none left): the normal failure cascade proceeds.
      return { events: downstream, lr };
    },
  };
}

// ---- readied actions (§2) -------------------------------------------------

export interface ReadiedAction {
  holderId: string;
  triggerText: string;
  response: string;
  /** set if the readied response is a spell — the slot is spent at ready time. */
  spellId?: string;
  slotLevel?: number;
  /** whether it was released before the encounter ended. */
  released: boolean;
}

/** Ready an action/spell: the action is spent now; a readied spell also spends
 *  its slot now and starts concentration (until release). Returns the events. */
export function readyAction(r: ReadiedAction): Body[] {
  const events: Body[] = [];
  if (r.spellId && r.slotLevel !== undefined) {
    events.push({ t: 'resource_changed', creatureId: r.holderId, pool: `slot_${r.slotLevel}`, delta: -1, remaining: 0 });
    events.push({ t: 'concentration_started', creatureId: r.holderId, spellId: r.spellId });
  }
  return events;
}

/** The DM marked the trigger met ⇒ prompt the holder to release (§2). */
export function releasePrompt(r: ReadiedAction, promptId: string): PromptRequest {
  return {
    promptId, holderId: r.holderId, timeoutSec: DEFAULT_TIMEOUT_SEC,
    context: { kind: 'readied', triggerText: r.triggerText, response: r.response, ...(r.spellId ? { spellId: r.spellId } : {}) },
  };
}

/** An unreleased readied spell at encounter end: the slot stays spent (§4 #4);
 *  concentration ends (voluntary). Returns the cleanup events. */
export function readiedExpired(r: ReadiedAction): Body[] {
  if (r.released || !r.spellId) return [];
  return [{ t: 'concentration_ended', creatureId: r.holderId, spellId: r.spellId, reason: 'voluntary' }];
}

// ---- lair actions (§2) ----------------------------------------------------

/** The lair's initiative-20 turn: prompt the DM with the lair's options or skip. */
export function lairPrompt(
  bossId: string,
  options: { name: string; text: string }[],
  promptId: string,
): PromptRequest {
  return {
    promptId, holderId: bossId, timeoutSec: DEFAULT_TIMEOUT_SEC,
    context: { kind: 'lair', options: options.map((o) => ({ name: o.name })) },
  };
}

// ---- reading the lifecycle back out of the log ----------------------------

/**
 * A PROMPT IS NOT STATE ANYBODY OWNS — it is a fact about the log, exactly as
 * the play screens already treat it (`promptsFrom` on the web). The server needs
 * the same reading for the opposite reason: to answer a reply it has to know
 * which prompt is still open, who holds it, and what it was about.
 *
 * Keeping both sides derived is what stops them drifting. A prompt list held
 * beside the log is a second copy of the truth, and the drift shows up as a
 * card that will not go away while five people wait.
 */
export function openPromptsFrom(events: readonly PlayEvent[]): Map<string, PromptRequest> {
  const open = new Map<string, PromptRequest>();
  for (const e of events) {
    const b = e.body;
    if (b.t === 'reaction_prompted') {
      open.set(b.promptId, {
        promptId: b.promptId,
        holderId: b.creatureId,
        context: b.context,
        timeoutSec: b.timeoutSec ?? DEFAULT_TIMEOUT_SEC,
      });
    } else if (b.t === 'reaction_taken' || b.t === 'reaction_declined') {
      open.delete(b.promptId);
    }
  }
  return open;
}

/**
 * Whose reaction is still available, folded from the log (§3 #2).
 *
 * A reaction is spent by TAKING a prompt, and the taking event names only the
 * prompt — so the holder is recovered from the `reaction_prompted` that opened
 * it. Declining costs nothing, which is why only the taken branch spends.
 *
 * `turn_advanced` refunds ONLY the creature whose turn began. This is the fix
 * Brief 08 §3 #2 asks to verify: a global reset would hand back reactions spent
 * on other creatures' turns, and a fighter would get a free swing every round.
 *
 * Creatures absent from the result have their reaction: unspent is the default,
 * so a creature that has never reacted needs no entry.
 */
export function reactionsFrom(events: readonly PlayEvent[]): ReactionState {
  const holderOf = new Map<string, string>();
  let state: ReactionState = {};
  for (const e of events) {
    const b = e.body;
    if (b.t === 'reaction_prompted') {
      holderOf.set(b.promptId, b.creatureId);
    } else if (b.t === 'reaction_taken') {
      const holder = holderOf.get(b.promptId);
      if (holder !== undefined) state = spendReaction(state, holder);
    } else if (b.t === 'turn_advanced') {
      state = resetReactionsOnTurn(state, b.activeCreatureId);
    }
  }
  return state;
}

/** Whether a creature may spend a reaction right now (default: yes). */
export function hasReaction(state: ReactionState, creatureId: string): boolean {
  return state[creatureId]?.reactionAvailable ?? true;
}
