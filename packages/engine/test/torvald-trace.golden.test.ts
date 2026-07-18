/**
 * The canonical Brief 02 §5 trace as a golden test. Torvald (Fighter 1, STR 16,
 * prof +2, longsword 1d8+3, Prone, Bless) attacks the Goblin Warrior (AC 15)
 * behind half cover from 5 ft. The pipeline must reproduce the fixture's
 * roll_made / damage_applied / narration events byte-for-byte, and the fold +
 * undo property (§4/§6) must hold.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { RulesEntitySchema, type PlayEvent } from '@questra/contracts';
import { CONDITIONS } from '../src/data/conditions.js';
import { buildRulesData, resolveAttack, type Rng, type EmitContext, type AttackInput } from '../src/sim/pipeline.js';
import { initialState, fold } from '../src/sim/projection.js';
import type { Combatant } from '../src/sim/state.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const trace = JSON.parse(readFileSync(here + '../../contracts/src/fixtures/torvald-trace.json', 'utf8')) as {
  events: PlayEvent[];
};

/** Scripted RNG returning the fixture's exact rolls in order: Bless d4=3, d20 14, d20 9, damage d8=6. */
function scriptedRng(sequence: number[]): Rng {
  let i = 0;
  return () => sequence[i++]!;
}

const torvald: Combatant = {
  id: 'pc-torvald',
  name: 'Torvald',
  abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10 },
  profBonus: 2,
  maxHp: 12,
  hp: 12,
  tempHp: 0,
  ac: 16,
  conditions: [{ conditionId: 'condition.prone' }],
  isPlayer: true,
};

const goblin: Combatant = {
  id: 'npc-goblin-1',
  name: 'the goblin',
  abilities: { str: 8, dex: 15, con: 10, int: 10, wis: 8, cha: 8 },
  profBonus: 2,
  maxHp: 10,
  hp: 10,
  tempHp: 0,
  ac: 15,
  conditions: [],
  isPlayer: false,
};

const attackInput: AttackInput = {
  kind: 'attack',
  attackerId: 'pc-torvald',
  targetId: 'npc-goblin-1',
  actionName: 'Longsword',
  damageDice: '1d8 + 3',
  damageType: 'slashing',
  coverDegree: 'half',
  attackModHooks: [{ label: 'Bless (1d4)', dice: '1d4', sourceId: 'spell.bless' }],
};

function runTrace() {
  const rules = buildRulesData(CONDITIONS.map((c) => RulesEntitySchema.parse(c)));
  const state = initialState([torvald, goblin]);
  const rng = scriptedRng([3, 14, 9, 6]); // d4=3, d20=14, d20=9 (min→9), d8=6
  const ctx: EmitContext = {
    seq: 42,
    timestamps: ['2026-07-18T09:15:02.120Z', '2026-07-18T09:15:02.140Z', '2026-07-18T09:15:02.150Z'],
    ids: ['evt-0042', 'evt-0043', 'evt-0044'],
    rollId: 'roll-777',
    actor: { kind: 'player', accountId: 'acct-torvald', creatureId: 'pc-torvald' },
  };
  return { events: resolveAttack(attackInput, state, rules, rng, ctx, 'evt-0041'), state };
}

describe('Brief 02 §5 — the Torvald trace reproduces the fixture', () => {
  const { events } = runTrace();
  const fx = trace.events;
  const byT = (evts: PlayEvent[], t: string) => evts.find((e) => e.body.t === t)!;

  it('emits roll_made with the fixture values (disadvantage collapse, Bless d4=3, total 17 vs AC 17, hit)', () => {
    const got = byT(events, 'roll_made');
    const want = byT(fx, 'roll_made');
    expect(got.body).toEqual(want.body);
  });

  it('emits damage_applied with 9 slashing, goblin 10→1 HP', () => {
    const got = byT(events, 'damage_applied');
    const want = byT(fx, 'damage_applied');
    expect(got.body).toEqual(want.body);
  });

  it('emits the narration verbatim', () => {
    const got = byT(events, 'narration');
    const want = byT(fx, 'narration');
    expect(got.body).toEqual(want.body);
  });

  it('every cascade event carries causeId = the intent seq (§4)', () => {
    for (const e of events) expect(e.causeId).toBe('evt-0041');
  });
});

describe('Brief 02 §6 — replay determinism and the undo property', () => {
  it('folding the fixture events yields the goblin at 1 HP after the hit, back to 10 after undo', () => {
    // fold everything EXCEPT the trailing undo → goblin at 1
    const state0 = initialState([{ ...torvald }, { ...goblin }]);
    const preUndo = trace.events.filter((e) => e.body.t !== 'undo_applied' && e.body.t !== 'whisper_sent');
    const afterHit = fold(state0, preUndo);
    expect(afterHit.combatants['npc-goblin-1']!.hp).toBe(1);

    // fold the full log (with undo) → goblin back to 10 (undo reverses the cascade)
    const afterUndo = fold(initialState([{ ...torvald }, { ...goblin }]), trace.events);
    expect(afterUndo.combatants['npc-goblin-1']!.hp).toBe(10);
  });

  it('undo property: fold(log) === fold(log + cause + undo(cause))', () => {
    const base = () => initialState([{ ...torvald }, { ...goblin }]);
    const empty = trace.events.filter((e) => e.seq < 42); // just the intent, no cascade yet is not in fixture; use base
    const foldEmpty = fold(base(), empty);
    const foldWithUndo = fold(base(), trace.events); // cause + cascade + undo all present
    expect(foldWithUndo.combatants['npc-goblin-1']!.hp).toBe(foldEmpty.combatants['npc-goblin-1']!.hp);
  });
});
