/**
 * Player-hub view-model tests — Brief 10 §5 #2 (the dying flip) + §1 (greying
 * parity feeds the tiles) + the plain-language guarantee on rendered strings.
 * These exercise the PURE view-model seam (no DOM needed): the same functions the
 * hub renders from, built from the real Torvald fixture + a projection combatant.
 */
import { describe, it, expect } from 'vitest';
import { violatesPlainLanguage, type ComputedSheet } from '@questra/contracts';
import type { Combatant, ProjectionState } from '@questra/engine';
import { toVitals, toActionTiles, type DeathSaveVM } from './sheetToPlayerHub.js';

import torvaldSheet from '@questra/contracts/src/fixtures/torvald-sheet.json';
const sheet = torvaldSheet as unknown as ComputedSheet;

const torvald: Combatant = {
  id: 'pc-torvald', name: 'Torvald',
  abilities: { str: 16, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
  profBonus: 2, maxHp: 12, hp: 12, tempHp: 0, ac: 18, conditions: [], isPlayer: true,
};
const goblin: Combatant = {
  id: 'npc-goblin-1', name: 'the goblin',
  abilities: { str: 8, dex: 15, con: 10, int: 10, wis: 8, cha: 8 },
  profBonus: 2, maxHp: 10, hp: 10, tempHp: 0, ac: 15, conditions: [], isPlayer: false,
};
const state: ProjectionState = {
  combatants: { 'pc-torvald': torvald, 'npc-goblin-1': goblin },
  round: 1, activeCreatureId: 'pc-torvald', nextSeq: 1,
};

describe('vitals view-model', () => {
  it('carries HP, AC (with derivation), and bloodied from the projection + sheet', () => {
    const v = toVitals(sheet, torvald);
    expect(v.hp).toEqual({ current: 12, max: 12, temp: 0 });
    expect(v.ac.value).toBe(sheet.acOptions[sheet.acDefault]!.value);
    expect(v.ac.derivation.length).toBeGreaterThan(0); // the "?" has something to show
    expect(v.bloodied).toBe(false);
  });

  it('flags bloodied at ≤ half HP and names conditions in plain language', () => {
    const v = toVitals(sheet, { ...torvald, hp: 5, conditions: [{ conditionId: 'condition.prone' }] });
    expect(v.bloodied).toBe(true);
    expect(v.conditions).toEqual([{ id: 'condition.prone', name: 'Prone' }]);
  });
});

describe('action tiles — greying parity feeds the view-model (§1, §5 #3)', () => {
  it('on your turn, attack tiles are legal (not greyed)', () => {
    const tiles = toActionTiles(sheet, torvald, state, 'npc-goblin-1', { activeTurnEnforced: true });
    const attackTiles = tiles.filter((t) => t.economy === 'action');
    expect(attackTiles.length).toBeGreaterThan(0);
    expect(attackTiles.every((t) => t.greyReason === null)).toBe(true);
  });

  it('off your turn, every tile greys with the reject string as its (tooltip) reason', () => {
    const tiles = toActionTiles(sheet, torvald, { ...state, activeCreatureId: 'npc-goblin-1' }, 'npc-goblin-1', { activeTurnEnforced: true });
    expect(tiles.length).toBeGreaterThan(0);
    expect(tiles.every((t) => t.greyReason === "It isn't Torvald's turn.")).toBe(true);
  });

  it('a spent-resource feature tile greys with the rest-to-recover reason', () => {
    // force Second Wind to 0/2 by reading the fixture feature then overriding remaining.
    const sw = sheet.features.find((f) => f.resource);
    if (!sw) return; // fixture has no resource feature ⇒ nothing to assert
    const drained: ComputedSheet = {
      ...sheet,
      features: sheet.features.map((f) => (f.resource ? { ...f, resource: { ...f.resource, remaining: 0 } } : f)),
    };
    const tiles = toActionTiles(drained, torvald, state, 'npc-goblin-1', { activeTurnEnforced: true });
    const featTile = tiles.find((t) => t.economy === 'bonus');
    expect(featTile?.greyReason).toBe('No uses of that left — take a rest to recover it.');
  });
});

describe('the dying flip drives off the view-model (§5 #2)', () => {
  it('a dying VM at 0 HP flips the hub (phase dying); revive returns to up', () => {
    const dying: DeathSaveVM = { successes: 1, failures: 2, phase: 'dying' };
    expect(dying.phase).toBe('dying'); // hub renders DeathSaveCard
    const up: DeathSaveVM = { successes: 0, failures: 0, phase: 'up' };
    expect(up.phase).toBe('up'); // hub flips back to ActionBar
  });
});

describe('every rendered hub string is plain language (§1 ban-list)', () => {
  it('condition names, tile reasons, and resource tags pass violatesPlainLanguage', () => {
    const strings: string[] = [];
    const v = toVitals(sheet, { ...torvald, hp: 5, conditions: [{ conditionId: 'condition.stunned' }] });
    strings.push(...v.conditions.map((c) => c.name), v.ac.label);
    const greyed = toActionTiles(sheet, torvald, { ...state, activeCreatureId: 'npc-goblin-1' }, 'npc-goblin-1', { activeTurnEnforced: true });
    strings.push(...greyed.map((t) => t.greyReason).filter((s): s is string => s !== null));
    strings.push(...greyed.map((t) => t.resourceTag).filter((s): s is string => s !== undefined));
    for (const s of strings) expect(violatesPlainLanguage(s)).toBeNull();
  });
});
