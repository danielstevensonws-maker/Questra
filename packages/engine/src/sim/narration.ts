/**
 * The narration template pack (Brief 02 §3 step 8, GAP-AUDIT A5) — the Engine's
 * plain-English voice. One template per outcome type, rendered from the resolved
 * event data. NEVER an AI call (ADR-0005): these are deterministic string
 * templates, so the same outcome always reads the same and the golden trace
 * stays byte-stable.
 *
 * Every produced line must pass the plain-language ban list (non-negotiable #7):
 * no "beat"/"node"/jargon. `narrationBanned()` is asserted across the pack in
 * the golden suite.
 *
 * The templates are intentionally terse and table-facing — they narrate what
 * just happened at the table, not purple prose (that's the AI creative-text
 * tier's job, 09b; this is the always-on floor).
 */
import { violatesPlainLanguage } from '@questra/contracts';

/** A creature as far as narration cares: a display name and (for health color) its HP frame. */
export interface NarrationActor {
  name: string;
  maxHp: number;
  /** true if the attacker is Prone (colors the "fighting from the ground" opener). */
  prone?: boolean;
}

/** Capitalize the first letter of a sentence (so "the goblin" → "The goblin"). */
export function sentenceCase(s: string): string {
  return s.length > 0 ? s[0]!.toUpperCase() + s.slice(1) : s;
}

/** Health clause for a target after taking damage — drives the "how hurt" phrasing. */
function healthClause(target: NarrationActor, resultingHp: number): string {
  if (resultingHp === 0) return `${target.name} drops.`;
  if (resultingHp <= Math.floor(target.maxHp / 2)) return `${target.name} is barely standing.`;
  return `${target.name} takes it.`;
}

// ---- the templates, one per outcome type ---------------------------------

export const narration = {
  /** A hit that deals damage. Prone attacker gets the "from the ground" opener
   *  (this reproduces the Torvald trace line byte-for-byte). */
  hit(attacker: NarrationActor, target: NarrationActor, amount: number, damageType: string, resultingHp: number): string {
    const opener = attacker.prone
      ? `${attacker.name}, fighting from the ground, still lands it`
      : `${attacker.name} lands the hit`;
    return `${opener} — ${amount} ${damageType}. ${sentenceCase(healthClause(target, resultingHp))}`;
  },

  /** A critical hit. */
  crit(attacker: NarrationActor, target: NarrationActor, amount: number, damageType: string, resultingHp: number): string {
    return `${attacker.name} strikes true — a critical hit for ${amount} ${damageType}. ${sentenceCase(healthClause(target, resultingHp))}`;
  },

  /** A miss. */
  miss(attacker: NarrationActor, target: NarrationActor): string {
    return `${attacker.name} swings at ${target.name} and misses.`;
  },

  /** A natural-1 fumble. */
  fumble(attacker: NarrationActor, target: NarrationActor): string {
    return `${attacker.name} swings wide — the attack goes nowhere near ${target.name}.`;
  },

  /** Healing applied. */
  heal(target: NarrationActor, amount: number, resultingHp: number): string {
    return `${target.name} recovers ${amount} hit points${resultingHp >= target.maxHp ? ' — back to full' : ''}.`;
  },

  /** A condition applied to a creature (plain condition name, not the id). */
  conditionApplied(target: NarrationActor, conditionName: string): string {
    return `${target.name} is now ${conditionName}.`;
  },

  /** A condition ending. */
  conditionRemoved(target: NarrationActor, conditionName: string): string {
    return `${target.name} is no longer ${conditionName}.`;
  },

  /** A creature drops to 0 and (for a monster) dies, or (for a PC) falls unconscious. */
  died(target: NarrationActor, cause?: string): string {
    return cause === 'massive_damage'
      ? `${target.name} is struck down by the sheer force of the blow.`
      : `${target.name} falls.`;
  },

  unconscious(target: NarrationActor): string {
    return `${target.name} drops, unconscious and dying.`;
  },

  stabilized(target: NarrationActor): string {
    return `${target.name} steadies — stable, but still down.`;
  },
} as const;

/** Guard for tests: does a produced narration line trip the plain-language ban list? */
export function narrationBanned(line: string): string | null {
  return violatesPlainLanguage(line);
}
