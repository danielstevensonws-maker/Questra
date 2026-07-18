/**
 * Cascade helpers — Brief 02 §3 step 7 and §6 criteria #3/#4. Pure functions
 * that decide the follow-on events after damage: concentration checks, the 0-HP
 * branch (character unconscious vs monster dies), and the massive-damage rule.
 * These return decisions, not events; the pipeline/caller emits them, so the
 * logic is unit-testable in isolation.
 */
import { concentrationDc } from '@questra/contracts';
import type { Combatant } from './state.js';

export { concentrationDc };

/** Does taking `damage` force a concentration save, and at what DC? (SRD: only while concentrating.) */
export function concentrationCheck(target: Combatant, damage: number): { required: boolean; dc: number } {
  if (!target.concentratingOn || damage <= 0) return { required: false, dc: 0 };
  return { required: true, dc: concentrationDc(damage) };
}

export type DeathOutcome =
  | { kind: 'none' }
  | { kind: 'unconscious' }          // player at 0 HP, not massive damage → dying
  | { kind: 'died'; cause: string }; // monster at 0 HP, or massive damage on anyone

/**
 * The 0-HP branch (§6 #4). A monster reduced to 0 dies. A player reduced to 0
 * falls unconscious and starts death saves — UNLESS the leftover damage past 0
 * meets/exceeds their HP maximum (massive damage), which kills outright.
 *
 * `overkill` is the damage remaining after HP hit 0 (i.e. dealtDamage - hpBefore).
 */
export function deathOutcome(target: Combatant, resultingHp: number, overkill: number): DeathOutcome {
  if (resultingHp > 0) return { kind: 'none' };
  if (overkill >= target.maxHp) return { kind: 'died', cause: 'massive_damage' };
  if (!target.isPlayer) return { kind: 'died', cause: 'reduced_to_0' };
  return { kind: 'unconscious' };
}

export type DeathSaveResult = 'success' | 'failure' | 'double_failure' | 'revive_1hp' | 'stable' | 'dead';

/**
 * Resolve a single death save d20 into its result (§6 #4). Nat 20 → revive at 1 HP;
 * nat 1 → two failures; ≥10 → success; else failure. Stabilizes at 3 successes;
 * dies at 3 failures. `priorSuccesses`/`priorFailures` are the running tallies.
 */
export function deathSave(d20: number, priorSuccesses: number, priorFailures: number): {
  successes: number;
  failures: number;
  result: DeathSaveResult;
} {
  if (d20 === 20) return { successes: 0, failures: 0, result: 'revive_1hp' };
  if (d20 === 1) {
    const failures = priorFailures + 2;
    return { successes: priorSuccesses, failures, result: failures >= 3 ? 'dead' : 'double_failure' };
  }
  if (d20 >= 10) {
    const successes = priorSuccesses + 1;
    return { successes, failures: priorFailures, result: successes >= 3 ? 'stable' : 'success' };
  }
  const failures = priorFailures + 1;
  return { successes: priorSuccesses, failures, result: failures >= 3 ? 'dead' : 'failure' };
}
