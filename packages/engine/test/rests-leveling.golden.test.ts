/**
 * Brief 07 §5 golden tests — rests, advancement, level-up, and shop.
 * #1 long-rest (all HP/HD, exhaustion 3→2, slots full; 16h lockout; 90-min
 *    interruption ⇒ short benefits). #2 short-rest interactive Hit Dice + Second
 *    Wind partial recharge. #3 Fighter 4→5 diff byte-matched (prof 2→3 ripple +
 *    Extra Attack). #4 XP even split + threshold crossing. #5 shop atomicity.
 */
import { describe, it, expect } from 'vitest';
import type { CharacterChoices } from '@questra/contracts';
import {
  longRest, canLongRest, spendHitDie, completeShortRest, onInterruption, type RestResources,
} from '../src/sim/rest.js';
import {
  levelForXp, awardDefeatXp, levelOfferAfterXp, averageHp, hpGainedForLevel, levelUp, diffSheets, XP_THRESHOLDS,
} from '../src/sim/advancement.js';
import { buy, sell, coinsToCp, cpToCoins, defaultSellPriceCp } from '../src/sim/shop.js';
import { computeSheet, buildSheetRulesData } from '../src/sim/sheet.js';
import { CLASSES } from '../src/data/classes.js';
import { DRAFT_ITEMS } from '../src/data/items.js';

const rules = buildSheetRulesData([...CLASSES, ...DRAFT_ITEMS], 30);

const restBase: RestResources = {
  creatureId: 'pc-torvald', hp: 20, maxHp: 44, hitDie: 10,
  hitDiceRemaining: 2, hitDiceMax: 5, conMod: 2, exhaustion: 3,
  pools: [{ id: 'second_wind', max: 2, remaining: 0, recharge: 'per_short_rest', partialRecharge: 1 }],
  slots: {},
};

// ---- §5 #1 — long rest ---------------------------------------------------

describe('Brief 07 §5 #1 — long rest: all HP, all Hit Dice, exhaustion 3→2, slots full', () => {
  it('emits the full itemized cascade + one rest_completed', () => {
    const r = longRest(restBase);
    expect(r.events).toEqual([
      { t: 'healing_applied', creatureId: 'pc-torvald', amount: 24, resultingHp: 44 },
      { t: 'resource_changed', creatureId: 'pc-torvald', pool: 'hit_dice', delta: 3, remaining: 5 },
      { t: 'exhaustion_changed', creatureId: 'pc-torvald', level: 2 },
      { t: 'resource_changed', creatureId: 'pc-torvald', pool: 'second_wind', delta: 2, remaining: 2 },
      { t: 'rest_completed', creatureIds: ['pc-torvald'], kind: 'long', applied: { hpHealed: 24, pools: { hit_dice: 5, second_wind: 2 }, exhaustion: 2 } },
    ]);
  });

  it('restores every spell-slot level', () => {
    const caster = longRest({ ...restBase, slots: { '1': { max: 4, remaining: 1 }, '2': { max: 3, remaining: 0 } } });
    expect(caster.events).toContainEqual({ t: 'resource_changed', creatureId: 'pc-torvald', pool: 'slot_1', delta: 3, remaining: 4 });
    expect(caster.events).toContainEqual({ t: 'resource_changed', creatureId: 'pc-torvald', pool: 'slot_2', delta: 3, remaining: 3 });
  });

  it('the 16-hour lockout rejects with a plain-language string', () => {
    const now = 1_000_000_000_000;
    const tooSoon = canLongRest({ ...restBase, hp: 44, lastLongRestAt: now - 60 * 60 * 1000 }, now);
    expect(tooSoon.ok).toBe(false);
    expect(tooSoon.ok === false && tooSoon.reason).toMatch(/16 hours/);
    // 16h+1 later: allowed
    expect(canLongRest({ ...restBase, hp: 44, lastLongRestAt: now - 17 * 60 * 60 * 1000 }, now).ok).toBe(true);
    // at 0 HP: rejected even with no lockout
    expect(canLongRest({ ...restBase, hp: 0 }, now).ok).toBe(false);
  });

  it('a 90-minute interruption commits short-rest benefits as interrupted_partial; <60 min applies nothing', () => {
    const partial = onInterruption(restBase, 90);
    expect(partial?.kind).toBe('interrupted_partial');
    expect(partial?.events.at(-1)).toMatchObject({ t: 'rest_completed', kind: 'interrupted_partial' });
    expect(onInterruption(restBase, 45)).toBeNull();
  });
});

// ---- §5 #2 — short rest, interactive Hit Dice ----------------------------

describe('Brief 07 §5 #2 — short rest: d10+2 Hit-Dice sequence, stop after two; Second Wind 0/2 → 1/2', () => {
  it('two Hit-Dice spends heal (roll+CON, min 1) and decrement the pool', () => {
    // roll 7 (+2) = 9 ⇒ 20→29, HD 2→1; then roll 3 (+2) = 5 ⇒ 29→34, HD 1→0
    const d1 = spendHitDie(restBase, 7, 1);
    expect(d1.events).toEqual([
      { t: 'healing_applied', creatureId: 'pc-torvald', amount: 9, resultingHp: 29 },
      { t: 'resource_changed', creatureId: 'pc-torvald', pool: 'hit_dice', delta: -1, remaining: 1 },
    ]);
    const d2 = spendHitDie({ ...restBase, hp: d1.hpAfter, hitDiceRemaining: 1 }, 3, 0);
    expect(d2.hpAfter).toBe(34);

    // stop and finalize: Second Wind partial-recharges 0 → 1
    const done = completeShortRest({ ...restBase, hp: 34, hitDiceRemaining: 0 }, [...d1.events, ...d2.events]);
    expect(done.events).toContainEqual({ t: 'resource_changed', creatureId: 'pc-torvald', pool: 'second_wind', delta: 1, remaining: 1 });
    expect(done.events.at(-1)).toMatchObject({ t: 'rest_completed', kind: 'short' });
  });

  it('a Hit-Die heals at least 1 even with a negative CON mod', () => {
    const frail = spendHitDie({ ...restBase, conMod: -3, hp: 20 }, 1, 1); // 1 + (-3) = -2 ⇒ min 1
    expect(frail.events[0]).toMatchObject({ t: 'healing_applied', amount: 1 });
  });
});

// ---- §5 #3 — Fighter 4→5 level-up ----------------------------------------

describe('Brief 07 §5 #3 — Fighter 4→5: prof 2→3 ripples; Extra Attack + Tactical Shift; sheet recomputed, never hand-patched', () => {
  const torvaldChoices: CharacterChoices = {
    classId: 'class.fighter', level: 4,
    backgroundId: 'background.soldier', speciesId: 'species.human',
    abilityMethod: 'standard_array',
    baseScores: { str: 14, dex: 13, con: 13, int: 8, wis: 12, cha: 10 },
    backgroundBonuses: { str: 2, con: 1 },
    skillChoices: ['athletics', 'intimidation'],
    languageChoices: ['Common'],
    equipment: ['item.chain-mail', 'item.shield', 'item.longsword'],
    featChoices: {},
    identity: { name: 'Torvald', personality: [], bonds: [], appearanceTokens: [] },
  };

  it('the before/after diff is byte-matched', () => {
    const { diff, after } = levelUp('char_torvald', torvaldChoices, 5, { hp: { method: 'average' } }, rules);
    expect(diff).toEqual([
      { path: 'profBonus', before: 2, after: 3 },
      { path: 'hp.max', before: 36, after: 44 },
      { path: 'hp.hitDiceMax', before: 4, after: 5 },
      { path: 'saves.str', before: 5, after: 6 },
      { path: 'saves.con', before: 4, after: 5 },
      { path: 'skills.athletics', before: 5, after: 6 },
      { path: 'skills.intimidation', before: 2, after: 3 },
      { path: 'features', before: [], after: ['feature.fighter.extra-attack', 'feature.fighter.tactical-shift'] },
    ]);
    // the Longsword to-hit ripples 5 → 6 with the proficiency bump
    expect(after.attacks.find((a) => a.name === 'Longsword')!.toHit).toBe(6);
  });

  it('the recomputed sheet equals a fresh computeSheet at level 5 (no hand-patching)', () => {
    const { after } = levelUp('char_torvald', torvaldChoices, 5, { hp: { method: 'average' } }, rules);
    const fresh = computeSheet({ ...torvaldChoices, level: 5 }, rules);
    expect(after).toEqual(fresh);
  });

  it('average HP for a d10 is 6 (ceil(10/2)+1); +CON, minimum 1', () => {
    expect(averageHp(10)).toBe(6);
    expect(hpGainedForLevel(10, 1, { method: 'average' })).toBe(7);
    expect(hpGainedForLevel(10, 2, { method: 'rolled', roll: 8 })).toBe(10);
    expect(hpGainedForLevel(6, -5, { method: 'rolled', roll: 1 })).toBe(1); // min 1
  });
});

// ---- §5 #4 — XP mode -----------------------------------------------------

describe('Brief 07 §5 #4 — XP: 4-member party defeats CR 1/4 (50 XP) ⇒ +12 each; crossing 300 flags level 2', () => {
  it('the defeat award splits evenly, rounding down', () => {
    const { perCharacter, event } = awardDefeatXp(['a', 'b', 'c', 'd'], 50);
    expect(perCharacter).toBe(12); // 50/4 = 12.5 → 12
    expect(event).toEqual({ t: 'xp_awarded', characterIds: ['a', 'b', 'c', 'd'], perCharacter: 12, source: 'defeat' });
  });

  it('threshold crossing at 300 flags the level-2 offer', () => {
    expect(XP_THRESHOLDS[2]).toBe(300);
    expect(levelForXp(299)).toBe(1);
    expect(levelForXp(300)).toBe(2);
    expect(levelOfferAfterXp(1, 300)).toBe(2);
    expect(levelOfferAfterXp(1, 299)).toBeNull();
    // no double-offer once already at the level
    expect(levelOfferAfterXp(2, 300)).toBeNull();
  });
});

// ---- §5 #5 — shop atomicity ----------------------------------------------

describe('Brief 07 §5 #5 — shop: insufficient funds ⇒ zero deltas; success ⇒ coins + inventory in one group', () => {
  const wallet = { cp: 0, sp: 0, ep: 0, gp: 100, pp: 0 }; // 100 gp = 10 000 cp

  it('a successful buy moves coins down and inventory up in ONE event', () => {
    const r = buy('pc-1', wallet, [{ itemId: 'item.potion-healing', qty: 2, unitPriceCp: 5000 }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.event).toEqual({
      t: 'shop_transaction', characterId: 'pc-1', direction: 'buy',
      lines: [{ itemId: 'item.potion-healing', qty: 2, unitPriceCp: 5000 }],
      coinsDelta: { cp: 0, sp: 0, ep: 0, gp: -100, pp: 0 },
    });
    expect(coinsToCp(r.resultingCoins)).toBe(0);
  });

  it('insufficient funds ⇒ rejected with a plain string, zero deltas', () => {
    const r = buy('pc-1', wallet, [{ itemId: 'item.plate', qty: 1, unitPriceCp: 150000 }]);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toMatch(/only have/);
  });

  it('a sell is gated on ownership and defaults to half price', () => {
    expect(defaultSellPriceCp(5000)).toBe(2500);
    const owned = (id: string) => (id === 'item.potion-healing' ? 3 : 0);
    const ok = sell('pc-1', wallet, [{ itemId: 'item.potion-healing', qty: 1, unitPriceCp: 2500 }], owned);
    expect(ok.ok).toBe(true);
    if (ok.ok) expect(coinsToCp(ok.resultingCoins)).toBe(10000 + 2500);
    // can't sell more than owned
    const bad = sell('pc-1', wallet, [{ itemId: 'item.potion-healing', qty: 5, unitPriceCp: 2500 }], owned);
    expect(bad.ok).toBe(false);
  });

  it('coin conversion round-trips losslessly through copper', () => {
    expect(cpToCoins(11235)).toEqual({ pp: 11, gp: 2, ep: 0, sp: 3, cp: 5 });
    expect(coinsToCp(cpToCoins(98765))).toBe(98765);
  });
});
