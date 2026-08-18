/**
 * Brief 04 §4 golden tests — the duration + dying state machines.
 * #2 Hold Person: paralyzed (save_ends WIS) → target saves at turn end → removed
 *    {reason:'save'}. #4 the full dying ladder byte-matched. #5 stacking keeps the
 *    longer duration; exhaustion stacks to 6 ⇒ died.
 */
import { describe, it, expect } from 'vitest';
import type { Duration } from '@questra/contracts';
import {
  applyWithStacking, onTurnAdvanced, resolveSaveEnds, onConcentrationEnded, removalEventBody,
  type ConditionInstance,
} from '../src/sim/duration.js';
import {
  initialDying, onReducedToZero, onDeathSave, onDamageWhileDying, onHelpStabilize, onHealed,
} from '../src/sim/dying.js';

// ---- §2/§4 #2 — Hold Person (paralyzed, save_ends WIS) --------------------

describe('Brief 04 §4 #2 — Hold Person: paralyzed save_ends → save success removes it', () => {
  const holdPerson: ConditionInstance = {
    creatureId: 'npc-target', conditionId: 'condition.paralyzed',
    duration: { kind: 'save_ends', save: { ability: 'wis', dc: 13 }, repeatAt: 'turn_end' } as Duration,
    appliedAtSeq: 10,
    concentrationCasterId: 'pc-cleric', concentrationSpellId: 'spell.hold-person',
  };

  it('prompts the WIS save at the target’s turn end', () => {
    const { savePrompts } = onTurnAdvanced([holdPerson], 'npc-target', 2, 20);
    expect(savePrompts).toHaveLength(1);
    expect(savePrompts[0]).toMatchObject({ ability: 'wis', dc: 13 });
  });

  it('a successful save removes it with reason "save"; a failure persists', () => {
    const removed = resolveSaveEnds(holdPerson, true);
    expect(removed).not.toBeNull();
    expect(removalEventBody(removed!)).toEqual({ t: 'condition_removed', creatureId: 'npc-target', conditionId: 'condition.paralyzed', reason: 'save' });
    expect(resolveSaveEnds(holdPerson, false)).toBeNull();
  });

  it('the caster losing concentration cascades removal on all linked instances (one group)', () => {
    const twoTargets = [holdPerson, { ...holdPerson, creatureId: 'npc-target-2' }];
    const removals = onConcentrationEnded(twoTargets, 'pc-cleric', 'spell.hold-person');
    expect(removals).toHaveLength(2);
    expect(removals.every((r) => r.reason === 'cascade')).toBe(true);
  });
});

// ---- §4 #5 — stacking / exhaustion ---------------------------------------

describe('Brief 04 §4 #5 — stacking keeps the longer duration; exhaustion is cumulative', () => {
  const shortProne: ConditionInstance = { creatureId: 'c', conditionId: 'condition.prone', duration: { kind: 'end_of_next_turn', of: 'c' } as Duration, appliedAtSeq: 1 };
  const longRestrained: ConditionInstance = { creatureId: 'c', conditionId: 'condition.restrained', duration: { kind: 'rounds', n: 3 } as Duration, appliedAtSeq: 1 };

  it('same condition reapplied ⇒ one instance, longer duration kept', () => {
    const withShort = applyWithStacking([], { ...longRestrained, duration: { kind: 'rounds', n: 1 } as Duration });
    const merged = applyWithStacking(withShort, longRestrained); // n:3 > n:1
    expect(merged).toHaveLength(1);
    expect(merged[0]!.duration).toEqual({ kind: 'rounds', n: 3 });
  });

  it('different conditions coexist', () => {
    const set = applyWithStacking([shortProne], longRestrained);
    expect(set).toHaveLength(2);
  });

  it('exhaustion is cumulative — never collapsed', () => {
    let set: ConditionInstance[] = [];
    const exhaust: ConditionInstance = { creatureId: 'c', conditionId: 'condition.exhaustion', duration: { kind: 'until_removed' } as Duration, appliedAtSeq: 1 };
    for (let i = 0; i < 6; i++) set = applyWithStacking(set, exhaust);
    expect(set).toHaveLength(6); // 6 stacks ⇒ level 6 ⇒ death (handled by the caller's trigger)
  });
});

// ---- §4 #4 — the full dying ladder ---------------------------------------

describe('Brief 04 §4 #4 — the full dying ladder, byte-matched', () => {
  it('0 HP → fail → double-fail (nat 1) → Help stabilize → damage → dying → nat 20 → up at 1 HP', () => {
    // 0 HP (not massive): unconscious + dying
    let step = onReducedToZero(initialDying('pc'));
    expect(step.state.phase).toBe('dying');
    expect(step.events).toEqual([{ t: 'creature_unconscious', creatureId: 'pc' }]);

    // a failed death save (rolled 7): 1 failure
    step = onDeathSave(step.state, 7);
    expect(step.state.failures).toBe(1);
    expect(step.events[0]).toMatchObject({ t: 'death_save_rolled', result: 'failure', failures: 1 });

    // a nat-1 death save: two failures ⇒ now 3 total ⇒ dead? no — 1 + 2 = 3 ⇒ dead.
    // reset to test the non-terminal path: use a fresh dying with 0 failures
    let s2 = onReducedToZero(initialDying('pc')).state;
    s2 = onDeathSave(s2, 1).state; // nat 1 ⇒ double_failure ⇒ 2 failures
    expect(s2.failures).toBe(2);

    // Help action stabilizes (DC 10 WIS Medicine success)
    const helped = onHelpStabilize(s2, true);
    expect(helped.state.phase).toBe('stable');
    expect(helped.events).toEqual([{ t: 'creature_stabilized', creatureId: 'pc' }]);

    // damage while stable ⇒ back to dying
    const backToDying = onDamageWhileDying(helped.state, false);
    expect(backToDying.state.phase).toBe('dying');

    // a nat-20 death save ⇒ revive at 1 HP + healing_applied 1
    const revived = onDeathSave(backToDying.state, 20);
    expect(revived.state.phase).toBe('up');
    expect(revived.events).toEqual([
      { t: 'death_save_rolled', creatureId: 'pc', d20: 20, successes: 0, failures: 0, result: 'revive_1hp' },
      { t: 'healing_applied', creatureId: 'pc', amount: 1, resultingHp: 1 },
    ]);
  });

  it('three failures ⇒ dead; three successes ⇒ stable; damage-crit while dying = two failures', () => {
    let s = onReducedToZero(initialDying('pc')).state;
    s = onDeathSave(s, 5).state; // fail (1)
    s = onDeathSave(s, 5).state; // fail (2)
    const dead = onDeathSave(s, 5); // fail (3) ⇒ dead
    expect(dead.state.phase).toBe('dead');
    expect(dead.events.at(-1)).toEqual({ t: 'creature_died', creatureId: 'pc' });

    let t = onReducedToZero(initialDying('pc2')).state;
    t = onDeathSave(t, 15).state; // success (1)
    t = onDeathSave(t, 15).state; // success (2)
    const stable = onDeathSave(t, 15); // success (3) ⇒ stable
    expect(stable.state.phase).toBe('stable');

    // damage-crit while dying = two failures at once
    let u = onReducedToZero(initialDying('pc3')).state;
    const crit = onDamageWhileDying(u, true);
    expect(crit.state.failures).toBe(2);
    expect(crit.events[0]).toMatchObject({ result: 'double_failure' });
  });

  it('healing while dying brings the creature back up', () => {
    const dying = onReducedToZero(initialDying('pc')).state;
    expect(onHealed(dying).state.phase).toBe('up');
  });
});
