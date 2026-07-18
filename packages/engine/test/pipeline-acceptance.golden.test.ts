/**
 * Brief 02 §6 acceptance criteria as golden tests (the ones the M2.1 engine core
 * owns). #1 trace + advantage collapse; #2 cover cap; #3 concentration DC; #4
 * death / massive damage / death saves; #7 visibility filter. #5 (OA movement
 * prompts) and #8 (idempotency) are noted below as out of M2.1 scope.
 */
import { describe, it, expect } from 'vitest';
import {
  collapseAdvantage,
  bestCover,
  COVER_AC_BONUS,
  eventVisibleTo,
  filterStream,
  type PlayEvent,
} from '@questra/contracts';
import { concentrationCheck, deathOutcome, deathSave } from '../src/sim/cascade.js';
import type { Combatant } from '../src/sim/state.js';

const base: Combatant = {
  id: 'c', name: 'C', abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  profBonus: 2, maxHp: 12, hp: 12, tempHp: 0, ac: 12, conditions: [], isPlayer: true,
};

describe('§6 #1 — advantage collapse: counts never matter', () => {
  it('adv + adv + dis ⇒ straight', () => {
    expect(collapseAdvantage(['a', 'b'], ['c'])).toBe('straight');
  });
  it('adv only ⇒ advantage; dis only ⇒ disadvantage', () => {
    expect(collapseAdvantage(['a'], [])).toBe('advantage');
    expect(collapseAdvantage([], ['a'])).toBe('disadvantage');
  });
});

describe('§6 #2 — cover: best degree only, never summed', () => {
  it('half + three-quarters declared ⇒ +5 only', () => {
    const best = bestCover(['half', 'three_quarters']);
    expect(best).toBe('three_quarters');
    expect(COVER_AC_BONUS[best as 'three_quarters']).toBe(5);
  });
});

describe('§6 #3 — concentration save on damage', () => {
  it('22 damage to a concentrating caster ⇒ CON save DC 11', () => {
    const caster: Combatant = { ...base, concentratingOn: 'spell.bless' };
    const check = concentrationCheck(caster, 22);
    expect(check).toEqual({ required: true, dc: 11 });
  });
  it('DC floors at 10 for small hits; no check when not concentrating', () => {
    const caster: Combatant = { ...base, concentratingOn: 'spell.bless' };
    expect(concentrationCheck(caster, 3).dc).toBe(10);
    expect(concentrationCheck(base, 22).required).toBe(false);
  });
});

describe('§6 #4 — death, massive damage, death saves', () => {
  it('damage 18 vs 6 HP (overkill 12 ≥ maxHp 6) ⇒ died{massive_damage}', () => {
    const t: Combatant = { ...base, maxHp: 6, hp: 6 };
    // 18 damage: resultingHp 0, overkill = 18 - 6 = 12 ≥ maxHp 6 → massive
    expect(deathOutcome(t, 0, 12)).toEqual({ kind: 'died', cause: 'massive_damage' });
  });
  it('a monster reduced to 0 dies; a player reduced to 0 (non-massive) falls unconscious', () => {
    expect(deathOutcome({ ...base, isPlayer: false }, 0, 3).kind).toBe('died');
    expect(deathOutcome({ ...base, isPlayer: true }, 0, 3).kind).toBe('unconscious');
  });
  it('nat-1 death save ⇒ double_failure; nat-20 ⇒ revive_1hp', () => {
    expect(deathSave(1, 0, 0).result).toBe('double_failure');
    expect(deathSave(20, 0, 0).result).toBe('revive_1hp');
  });
  it('three failures ⇒ dead; three successes ⇒ stable', () => {
    expect(deathSave(5, 0, 2).result).toBe('dead');
    expect(deathSave(15, 2, 0).result).toBe('stable');
  });
});

describe('§6 #7 — a dm_only event never reaches a player channel', () => {
  const events: PlayEvent[] = [
    { seq: 1, id: 'e1', at: '2026-07-19T00:00:00.000Z', actor: { kind: 'engine' }, visibility: 'public', body: { t: 'narration', text: 'x', from: 'engine' } },
    { seq: 2, id: 'e2', at: '2026-07-19T00:00:01.000Z', actor: { kind: 'dm', accountId: 'dm' }, visibility: 'dm_only', body: { t: 'whisper_sent', text: 'secret' } },
  ];
  it('the player stream excludes the dm_only event (filtered, not hidden)', () => {
    const playerView = filterStream(events, { role: 'player', accountId: 'p1' });
    expect(playerView.map((e) => e.seq)).toEqual([1]);
    expect(eventVisibleTo(events[1]!, { role: 'player', accountId: 'p1' })).toBe(false);
    expect(eventVisibleTo(events[1]!, { role: 'dm' })).toBe(true);
  });
});

// §6 #5 (opportunity-attack movement prompts) needs the movement/reaction system
// (Brief 06 map + Brief 08 prompt machinery) and is built in M2.4/M3, not M2.1.
// §6 #8 (intent idempotency) is a server/transport concern owned by Brief 05.
