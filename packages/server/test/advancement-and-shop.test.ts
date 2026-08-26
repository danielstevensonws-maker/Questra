/**
 * Experience, levels and the shop — Brief 07, reachable at last.
 *
 * WHAT WAS BROKEN. `sim/advancement.ts` and `sim/shop.ts` were complete, golden
 * tested, and called by nothing. Every function in them — the XP thresholds, the
 * defeat split, the level offer, the recomputed sheet, buy, sell, the coin
 * maths — existed for a table that had no way to reach any of it. Rests were
 * wired; levelling was not, which meant a party could fight a whole arc and
 * never advance. The M3 exit criterion is "a real table can run a full
 * multi-session fight arc", and a table that cannot level cannot.
 *
 * The RULES are the engine's and are tested there (`rests-leveling.golden`).
 * What is tested here is the part this file owns: that the intents reach those
 * functions, that the numbers land on the log, and that the refusals are
 * sentences.
 */
import { describe, it, expect } from 'vitest';
import type { CharacterChoices, PlayEvent, Viewer } from '@questra/contracts';
import { makeSliceResolver } from '../src/app.js';
import {
  CLASSES, ITEMS, DRAFT_SPELLS, VERIFIED_BACKGROUNDS,
  buildSheetRulesData, combatantFromCharacter, speciesSpeedFt,
  type Combatant, type ProjectionState,
} from '@questra/engine';

const DM: Viewer = { role: 'dm', accountId: 'acct-dm' };
const PLAYER: Viewer = { role: 'player', accountId: 'acct-mira' };

/** A Fighter 1 whose background took the equipment package (and its small purse). */
const choices: CharacterChoices = {
  classId: 'class.fighter',
  level: 1,
  backgroundId: 'background.soldier',
  speciesId: 'species.human',
  abilityMethod: 'standard_array',
  baseScores: { str: 15, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
  backgroundBonuses: { str: 2, con: 1 },
  skillChoices: ['athletics', 'intimidation'],
  languageChoices: ['Common'],
  equipment: ['item.club'],
  featChoices: {},
  identity: { name: 'Torvald', personality: [], bonds: [], appearanceTokens: [] },
};

const rules = buildSheetRulesData(
  [...CLASSES, ...ITEMS, ...DRAFT_SPELLS, ...VERIFIED_BACKGROUNDS],
  speciesSpeedFt(choices.speciesId),
);

const torvald = (): Combatant => combatantFromCharacter({ id: 'char_torvald', choices }, rules);

const goblin = (id: string, monsterId?: string): Combatant => ({
  id, name: 'Goblin Warrior',
  abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
  profBonus: 2, maxHp: 7, hp: 0, tempHp: 0, ac: 15,
  conditions: [], isPlayer: false,
  ...(monsterId === undefined ? {} : { monsterId }),
});

const state = (extra: Combatant[] = []): ProjectionState => ({
  combatants: Object.fromEntries([torvald(), ...extra].map((c) => [c.id, c])),
  round: 1,
  nextSeq: 20,
});

let key = 0;
const envelope = (intent: unknown) => ({ idempotencyKey: `k-${String(++key).padStart(8, '0')}`, intent });

const resolver = (over: Parameters<typeof makeSliceResolver>[0] = {}) =>
  makeSliceResolver({ choicesFor: () => choices, ...over });

const died = (creatureId: string, seq: number): PlayEvent => ({
  seq, id: `e-die-${creatureId}`, at: '2026-08-26T00:00:00.000Z',
  actor: { kind: 'engine' }, visibility: 'public',
  body: { t: 'creature_died', creatureId },
});

const ok = (out: ReturnType<ReturnType<typeof resolver>>): PlayEvent[] => {
  expect(out.ok).toBe(true);
  if (!out.ok) throw new Error(out.reason);
  return out.events;
};

const refused = (out: ReturnType<ReturnType<typeof resolver>>): string => {
  expect(out.ok).toBe(false);
  if (out.ok) throw new Error('expected a refusal');
  return out.reason;
};

const ctx = (log: PlayEvent[] = []) => ({ playSessionId: 'ps', log });

// ---- experience (§2) ------------------------------------------------------

describe('handing out experience', () => {
  it('is the DM’s to do', () => {
    expect(refused(resolver()(envelope({ kind: 'award_xp', characterIds: [] }), state(), PLAYER, ctx())))
      .toBe('Only whoever runs the game can do that.');
  });

  it('prices the fight from the compendium when no amount is named', () => {
    const dead = goblin('foe-1', 'monster.goblin-warrior');
    const events = ok(resolver()(
      envelope({ kind: 'award_xp', characterIds: [] }),
      state([dead]), DM, ctx([died('foe-1', 21)]),
    ));
    const body = events[0]!.body as { t: string; perCharacter: number; source: string };
    expect(body.t).toBe('xp_awarded');
    expect(body.source).toBe('defeat');
    /* One goblin's worth, and one character to give it to. */
    expect(body.perCharacter).toBeGreaterThan(0);
  });

  it('splits a fight evenly and rounds down', () => {
    const party = [torvald(), { ...torvald(), id: 'char_brigid', name: 'Brigid' }];
    const dead = goblin('foe-1', 'monster.goblin-warrior');
    const s: ProjectionState = {
      combatants: Object.fromEntries([...party, dead].map((c) => [c.id, c])),
      round: 1, nextSeq: 20,
    };
    const single = ok(resolver()(envelope({ kind: 'award_xp', characterIds: [] }), state([dead]), DM, ctx([died('foe-1', 21)])));
    const shared = ok(resolver()(envelope({ kind: 'award_xp', characterIds: [] }), s, DM, ctx([died('foe-1', 21)])));
    const per = (e: PlayEvent): number => (e.body as { perCharacter: number }).perCharacter;
    expect(per(shared[0]!)).toBe(Math.floor(per(single[0]!) / 2));
  });

  it('will not pay for the same corpses twice', () => {
    const dead = goblin('foe-1', 'monster.goblin-warrior');
    const log = [died('foe-1', 21)];
    const first = ok(resolver()(envelope({ kind: 'award_xp', characterIds: [] }), state([dead]), DM, ctx(log)));
    const again = resolver()(
      envelope({ kind: 'award_xp', characterIds: [] }),
      state([dead]), DM, ctx([...log, ...first]),
    );
    expect(refused(again)).toBe('Nothing has been defeated since the last time you handed out experience.');
  });

  it('takes a flat amount for the things the rules do not price', () => {
    const events = ok(resolver()(
      envelope({ kind: 'award_xp', characterIds: [], amount: 250, reason: 'Talked the guard down.' }),
      state(), DM, ctx(),
    ));
    const body = events[0]!.body as { perCharacter: number; source: string; reason?: string };
    expect(body).toMatchObject({ perCharacter: 250, source: 'manual', reason: 'Talked the guard down.' });
  });

  it('says out loud when somebody has earned a level', () => {
    const events = ok(resolver()(
      envelope({ kind: 'award_xp', characterIds: [], amount: 300 }),
      state(), DM, ctx(),
    ));
    const said = events.find((e) => e.body.t === 'narration');
    expect((said?.body as { text: string } | undefined)?.text).toContain('level 2');
  });

  it('stays quiet when nobody has', () => {
    const events = ok(resolver()(
      envelope({ kind: 'award_xp', characterIds: [], amount: 10 }),
      state(), DM, ctx(),
    ));
    expect(events.map((e) => e.body.t)).toEqual(['xp_awarded']);
  });

  it('refuses an award nobody can be given', () => {
    const empty: ProjectionState = { combatants: {}, round: 1, nextSeq: 1 };
    expect(refused(resolver()(envelope({ kind: 'award_xp', characterIds: [], amount: 10 }), empty, DM, ctx())))
      .toBe('There is nobody here to earn it.');
  });
});

// ---- levelling (§3) -------------------------------------------------------

describe('taking a level', () => {
  it('records the level, the hit points it granted, and the choices behind it', () => {
    const events = ok(resolver()(
      envelope({ kind: 'level_up', characterId: 'char_torvald', toLevel: 2, hp: { method: 'average' } }),
      state(), PLAYER, ctx(),
    ));
    const body = events[0]!.body as { t: string; toLevel: number; hpGained: number; choices: Record<string, unknown> };
    expect(body.t).toBe('character_level_up');
    expect(body.toLevel).toBe(2);
    expect(body.hpGained).toBeGreaterThan(0);
    expect(body.choices['hp']).toEqual({ method: 'average' });
  });

  it('honours a rolled hit die over the average', () => {
    const rolled = ok(resolver()(
      envelope({ kind: 'level_up', characterId: 'char_torvald', toLevel: 2, hp: { method: 'rolled', roll: 10 } }),
      state(), PLAYER, ctx(),
    ));
    const averaged = ok(resolver()(
      envelope({ kind: 'level_up', characterId: 'char_torvald', toLevel: 2, hp: { method: 'average' } }),
      state(), PLAYER, ctx(),
    ));
    const gained = (e: PlayEvent[]): number => (e[0]!.body as { hpGained: number }).hpGained;
    expect(gained(rolled)).toBeGreaterThan(gained(averaged));
  });

  it('says what changed, in a sentence', () => {
    const events = ok(resolver()(
      envelope({ kind: 'level_up', characterId: 'char_torvald', toLevel: 2, hp: { method: 'average' } }),
      state(), PLAYER, ctx(),
    ));
    expect((events[1]!.body as { text: string }).text).toMatch(/Torvald is level 2 — \d+ more hit points\./);
  });

  it('writes the level through, so it is still there next session', () => {
    const persisted: { id: string; to: number }[] = [];
    ok(resolver({ onLevelUp: (_ps, id, to) => persisted.push({ id, to }) })(
      envelope({ kind: 'level_up', characterId: 'char_torvald', toLevel: 2, hp: { method: 'average' } }),
      state(), PLAYER, ctx(),
    ));
    expect(persisted).toEqual([{ id: 'char_torvald', to: 2 }]);
  });

  it('takes one level at a time', () => {
    expect(refused(resolver()(
      envelope({ kind: 'level_up', characterId: 'char_torvald', toLevel: 5, hp: { method: 'average' } }),
      state(), PLAYER, ctx(),
    ))).toBe('Levels are taken one at a time.');
  });

  it('refuses in a sentence when the sheet has not loaded', () => {
    expect(refused(makeSliceResolver()(
      envelope({ kind: 'level_up', characterId: 'char_torvald', toLevel: 2, hp: { method: 'average' } }),
      state(), PLAYER, ctx(),
    ))).toBe('That character sheet has not loaded yet — try again in a moment.');
  });

  it('refuses a character who is not at the table', () => {
    expect(refused(resolver()(
      envelope({ kind: 'level_up', characterId: 'char_nobody', toLevel: 2, hp: { method: 'average' } }),
      state(), PLAYER, ctx(),
    ))).toBe('That character is not at this table.');
  });
});

// ---- the shop (§4) --------------------------------------------------------

describe('buying and selling', () => {
  it('a character starts with the purse their background printed', () => {
    /* Soldier, package A: 14 GP. Without this the shop is a form over zeros. */
    expect(torvald().coins).toEqual({ cp: 0, sp: 0, ep: 0, gp: 14, pp: 0 });
  });

  it('charges the compendium’s list price', () => {
    const events = ok(resolver()(
      envelope({ kind: 'shop', characterId: 'char_torvald', direction: 'buy', lines: [{ itemId: 'item.club', qty: 2 }] }),
      state(), PLAYER, ctx(),
    ));
    const body = events[0]!.body as { t: string; direction: string; lines: { unitPriceCp: number }[] };
    expect(body.t).toBe('shop_transaction');
    expect(body.direction).toBe('buy');
    /* A club is 1 SP — ten copper. */
    expect(body.lines[0]!.unitPriceCp).toBe(10);
  });

  it('sells at half the list price by default', () => {
    const events = ok(resolver()(
      envelope({ kind: 'shop', characterId: 'char_torvald', direction: 'sell', lines: [{ itemId: 'item.club', qty: 1 }] }),
      state(), PLAYER, ctx(),
    ));
    expect((events[0]!.body as { lines: { unitPriceCp: number }[] }).lines[0]!.unitPriceCp).toBe(5);
  });

  it('lets the DM name a price, because haggling happens', () => {
    const events = ok(resolver()(
      envelope({
        kind: 'shop', characterId: 'char_torvald', direction: 'buy',
        lines: [{ itemId: 'item.club', qty: 1, unitPriceCp: 3 }],
      }),
      state(), DM, ctx(),
    ));
    expect((events[0]!.body as { lines: { unitPriceCp: number }[] }).lines[0]!.unitPriceCp).toBe(3);
  });

  it('refuses what cannot be afforded, with the price in the sentence', () => {
    const reason = refused(resolver()(
      envelope({ kind: 'shop', characterId: 'char_torvald', direction: 'buy', lines: [{ itemId: 'item.club', qty: 100_000 }] }),
      state(), PLAYER, ctx(),
    ));
    expect(reason).toMatch(/costs/);
    expect(reason).toMatch(/you only have/);
  });

  it('will not sell what is not in the pack', () => {
    expect(refused(resolver()(
      envelope({ kind: 'shop', characterId: 'char_torvald', direction: 'sell', lines: [{ itemId: 'item.club', qty: 4 }] }),
      state(), PLAYER, ctx(),
    ))).toMatch(/don't have/);
  });

  it('asks for a price rather than inventing one', () => {
    expect(refused(resolver()(
      envelope({ kind: 'shop', characterId: 'char_torvald', direction: 'buy', lines: [{ itemId: 'item.nothing-like-this', qty: 1 }] }),
      state(), PLAYER, ctx(),
    ))).toMatch(/say what it costs/);
  });

  it('moves the coins and the pack together, under one cause', () => {
    const events = ok(resolver()(
      envelope({ kind: 'shop', characterId: 'char_torvald', direction: 'buy', lines: [{ itemId: 'item.club', qty: 1 }] }),
      state(), PLAYER, ctx(),
    ));
    const body = events[0]!.body as { coinsDelta: { cp: number }; lines: unknown[] };
    expect(events[0]!.causeId).toBeDefined();
    expect(body.lines).toHaveLength(1);
    /* 14 gp becomes 13 gp 9 sp: the copper column is where the change lands. */
    expect(body.coinsDelta.cp).toBe(0);
  });
});
