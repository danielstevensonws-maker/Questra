/**
 * The dying state machine — Brief 04 §3. Orchestrates the full ladder for a
 * character at 0 HP, on top of the pure helpers in cascade.ts (deathSave,
 * deathOutcome). Pure and AI-free (ADR-0005): each step takes the current dying
 * state + an input and returns the next state + the events to emit.
 *
 * States: up → unconscious_dying → stable → up | dead.
 */
import { deathSave, type DeathSaveResult } from './cascade.js';
import type { PlayEvent } from '@questra/contracts';

export type DyingPhase = 'up' | 'dying' | 'stable' | 'dead';

/** A character's dying-track state. Cleared on revive/heal. */
export interface DyingState {
  creatureId: string;
  phase: DyingPhase;
  successes: number;
  failures: number;
}

export function initialDying(creatureId: string): DyingState {
  return { creatureId, phase: 'up', successes: 0, failures: 0 };
}

/** Event bodies the machine emits (thin — the caller stamps seq/id/at). */
export type DyingEventBody =
  | Extract<PlayEvent['body'], { t: 'creature_unconscious' }>
  | Extract<PlayEvent['body'], { t: 'death_save_rolled' }>
  | Extract<PlayEvent['body'], { t: 'creature_stabilized' }>
  | Extract<PlayEvent['body'], { t: 'creature_died' }>
  | Extract<PlayEvent['body'], { t: 'healing_applied' }>;

export interface DyingStep {
  state: DyingState;
  events: DyingEventBody[];
}

/**
 * A player character drops to 0 HP (not massive damage) ⇒ unconscious + dying,
 * death-save counters reset. (Massive damage / monster death is handled by the
 * caller via cascade.deathOutcome before this is reached.)
 */
export function onReducedToZero(state: DyingState): DyingStep {
  return {
    state: { ...state, phase: 'dying', successes: 0, failures: 0 },
    events: [{ t: 'creature_unconscious', creatureId: state.creatureId }],
  };
}

/**
 * A death save at turn start while dying (§3). d20 → result via cascade.deathSave;
 * nat-20 revives at 1 HP (+ healing_applied 1); 3 successes ⇒ stable; 3 failures
 * ⇒ dead.
 */
export function onDeathSave(state: DyingState, d20: number): DyingStep {
  if (state.phase !== 'dying') return { state, events: [] };
  const r = deathSave(d20, state.successes, state.failures);
  const rolled: DyingEventBody = {
    t: 'death_save_rolled',
    creatureId: state.creatureId,
    d20,
    successes: r.successes,
    failures: r.failures,
    result: r.result,
  };
  return afterSaveResult(state, r.successes, r.failures, r.result, [rolled]);
}

/**
 * Damage taken while at 0 HP (§3): one auto-failure, or two on a critical hit.
 * If failures reach 3 ⇒ dead. (Damage ≥ hpMax ⇒ massive-damage death is the
 * caller's deathOutcome branch, not here.)
 */
export function onDamageWhileDying(state: DyingState, isCrit: boolean): DyingStep {
  if (state.phase !== 'dying') {
    // a stable creature taking damage drops back to dying (§3)
    if (state.phase === 'stable') return onReducedToZero({ ...state, phase: 'up' });
    return { state, events: [] };
  }
  const failures = state.failures + (isCrit ? 2 : 1);
  const rolled: DyingEventBody = {
    t: 'death_save_rolled',
    creatureId: state.creatureId,
    d20: 0, // 0 = an auto-failure from damage, not a rolled die
    successes: state.successes,
    failures,
    result: failures >= 3 ? 'dead' : isCrit ? 'double_failure' : 'failure',
  };
  return afterSaveResult(state, state.successes, failures, rolled.result, [rolled]);
}

/** Help action on a dying target (§3): a DC-10 WIS(Medicine) success stabilizes. */
export function onHelpStabilize(state: DyingState, succeeded: boolean): DyingStep {
  if (state.phase !== 'dying' || !succeeded) return { state, events: [] };
  return {
    state: { ...state, phase: 'stable', successes: 0, failures: 0 },
    events: [{ t: 'creature_stabilized', creatureId: state.creatureId }],
  };
}

/** Any healing while dying/stable ⇒ back up (conscious). */
export function onHealed(state: DyingState): DyingStep {
  if (state.phase === 'up' || state.phase === 'dead') return { state, events: [] };
  return { state: { ...state, phase: 'up', successes: 0, failures: 0 }, events: [] };
}

/** Shared tail: interpret a (successes, failures, result) into state + terminal events. */
function afterSaveResult(
  state: DyingState,
  successes: number,
  failures: number,
  result: DeathSaveResult,
  events: DyingEventBody[],
): DyingStep {
  if (result === 'revive_1hp') {
    return {
      state: { ...state, phase: 'up', successes: 0, failures: 0 },
      events: [...events, { t: 'healing_applied', creatureId: state.creatureId, amount: 1, resultingHp: 1 }],
    };
  }
  if (result === 'dead') {
    return { state: { ...state, phase: 'dead' }, events: [...events, { t: 'creature_died', creatureId: state.creatureId }] };
  }
  if (result === 'stable') {
    return { state: { ...state, phase: 'stable', successes: 0, failures: 0 }, events: [...events, { t: 'creature_stabilized', creatureId: state.creatureId }] };
  }
  // success / failure / double_failure that isn't terminal: stay dying, update counters
  return { state: { ...state, successes, failures }, events };
}
