import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RulesEntitySchema, violatesPlainLanguage,
  PlayEventSchema, type PlayEvent,
  collapseAdvantage, bestCover, concentrationDc, passiveScore,
  eventVisibleTo, filterStream,
  parseExpr, evalExprString, isDeterministic, ExprParseError,
  ComputedSheetSchema, derivationSumsToValue,
  ClientMsgSchema, ServerMsgSchema,
  distFt, affectedCells, filterRoomForViewer, cellKey, footprintOf, type Room,
  RulingSuggestionSchema, NpcLineSchema, DIFFICULTY_LADDER, ladderFallback,
} from '../src/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (name: string) => JSON.parse(readFileSync(join(here, '../src/fixtures', name), 'utf8'));

// ---------------------------------------------------------------- fixtures
describe('fixtures validate against the schemas (Brief 01 acceptance #1–#2)', () => {
  it('condition.prone', () => {
    const parsed = RulesEntitySchema.parse(fx('prone.json'));
    expect(parsed.effects).toHaveLength(4);
    // the proof case: opposing scoped hooks on the same condition
    const kinds = parsed.effects.map((e) => e.hook);
    expect(kinds).toContain('advantage');
    expect(kinds).toContain('disadvantage');
  });

  it('spell.fireball', () => {
    const parsed = RulesEntitySchema.parse(fx('fireball.json'));
    if (parsed.entityType !== 'spell') throw new Error('wrong type');
    expect(parsed.meta.level).toBe(3);
    expect(parsed.meta.concentration).toBe(false);
    const trigger = parsed.effects[0]!;
    expect(trigger.hook).toBe('trigger');
  });

  it('monster.goblin-warrior (incl. the advantage rider the pipeline must feed)', () => {
    const parsed = RulesEntitySchema.parse(fx('goblin-warrior.json'));
    if (parsed.entityType !== 'monster') throw new Error('wrong type');
    expect(parsed.meta.ac).toBe(15);
    expect(parsed.meta.hp.average).toBe(10);
    expect(parsed.meta.senses.passivePerception).toBe(9);
    const scimitar = parsed.meta.actions.find((a) => a.name === 'Scimitar')!;
    expect(scimitar.hit?.rider?.when).toBe('attack_had_advantage');
  });

  it('class.fighter levels 1–5 + Second Wind + engine_native Extra Attack', () => {
    const f = fx('fighter.json');
    const klass = RulesEntitySchema.parse(f.class);
    if (klass.entityType !== 'class') throw new Error('wrong type');
    // Brief 01 acceptance #4: every present level grants ≥1 feature (schema enforces nonempty)
    expect(Object.keys(klass.meta.levels)).toEqual(['1', '2', '3', '4', '5']);
    expect(klass.meta.levels['4']!.setResources!['second_wind.max']).toBe(3);

    const sw = RulesEntitySchema.parse(f.secondWind);
    const pool = sw.effects.find((e) => e.hook === 'resource');
    expect(pool && pool.hook === 'resource' && pool.partialRecharge?.amount).toBe(1);

    const ea = RulesEntitySchema.parse(f.extraAttack);
    expect(ea.resolution).toBe('engine_native');
  });

  it('torvald-sheet + wizard-3-sheet validate; every Derived sums to its value (Brief 03 §2/§4)', () => {
    for (const name of ['torvald-sheet.json', 'wizard-3-sheet.json']) {
      const sheet = ComputedSheetSchema.parse(fx(name));
      // reconcile Torvald with the trace: +5 to hit = STR 3 + prof 2, longsword 1d8 + 3
      if (name === 'torvald-sheet.json') {
        const ls = sheet.attacks.find((a) => a.name === 'Longsword')!;
        expect(ls.toHit).toBe(5);
        expect(ls.damage).toBe('1d8 + 3');
        expect(sheet.hp.value.max).toBe(12);
        expect(sheet.acOptions[sheet.acDefault]!.value).toBe(18);
      }
      if (name === 'wizard-3-sheet.json') {
        expect(sheet.spellcasting!.saveDc.value).toBe(13);
        expect(sheet.spellcasting!.attackBonus.value).toBe(5);
        expect(sheet.spellcasting!.slots).toEqual({ '1': 4, '2': 2 });
      }
      // property: every numeric Derived's derivation sums to its value
      const numericDeriveds = [
        sheet.profBonus, sheet.initiative, sheet.speedFt,
        ...Object.values(sheet.abilities), ...Object.values(sheet.saves),
        ...Object.values(sheet.skills), sheet.passives.perception,
        sheet.passives.investigation, sheet.passives.insight,
        ...sheet.acOptions,
      ];
      for (const d of numericDeriveds) {
        expect(derivationSumsToValue(d as { value: number; derivation: { value: number }[] }), JSON.stringify(d)).toBe(true);
      }
    }
  });

  it('plain-language ban list holds for every fixture plain line (Brief 01 acceptance #5)', () => {
    const plains = [fx('prone.json').plain, fx('fireball.json').plain, fx('goblin-warrior.json').plain,
      fx('fighter.json').class.plain, fx('fighter.json').secondWind.plain];
    for (const p of plains) expect(violatesPlainLanguage(p)).toBeNull();
  });
});

// ------------------------------------------------------------ expressions
describe('the closed expression language (Brief 01 §1 rule 2)', () => {
  it('formula: -2 * exhaustion_level at level 3 → -6', () => {
    expect(evalExprString('-2 * exhaustion_level', { exhaustion_level: 3 }).total).toBe(-6);
  });

  it('dice + variable: 1d10 + level (seeded rng)', () => {
    const rng = (sides: number) => (sides === 10 ? 7 : 1);
    const r = evalExprString('1d10 + level', { level: 4 }, rng);
    expect(r.total).toBe(11);
    expect(r.rolls).toEqual([{ sides: 10, result: 7 }]);
  });

  it('plain dice: 8d6 rolls eight dice', () => {
    const r = evalExprString('8d6', {}, () => 4);
    expect(r.total).toBe(32);
    expect(r.rolls).toHaveLength(8);
  });

  it('rejects unknown variables and arbitrary code', () => {
    expect(() => parseExpr('hp_max + 1')).toThrow(ExprParseError);
    expect(() => parseExpr('process.exit(1)')).toThrow(ExprParseError);
  });

  it('isDeterministic distinguishes display-safe formulas from dice', () => {
    expect(isDeterministic(parseExpr('prof_bonus + str_mod'))).toBe(true);
    expect(isDeterministic(parseExpr('1d4 + 2'))).toBe(false);
  });
});

// ------------------------------------------------------- shared pure rules
describe('shared pure functions (client greying = server truth)', () => {
  it('advantage collapse: counts never matter (golden test #1)', () => {
    expect(collapseAdvantage(['a', 'b'], ['c'])).toBe('straight');
    expect(collapseAdvantage(['a'], [])).toBe('advantage');
    expect(collapseAdvantage([], ['c'])).toBe('disadvantage');
    expect(collapseAdvantage([], [])).toBe('straight');
  });

  it('cover: best degree only, never summed (golden test #2)', () => {
    expect(bestCover(['half', 'three_quarters'])).toBe('three_quarters');
    expect(bestCover(['half', 'total'])).toBe('total');
    expect(bestCover([])).toBe('none');
  });

  it('concentration DC: max(10, half damage) — 22 damage ⇒ DC 11 (golden test #3)', () => {
    expect(concentrationDc(22)).toBe(11);
    expect(concentrationDc(9)).toBe(10);
    expect(concentrationDc(21)).toBe(10);
  });

  it('passive score: 10 + bonus, ±5 for adv/dis (SRD example: +4 ⇒ 14, adv ⇒ 19)', () => {
    expect(passiveScore(4)).toBe(14);
    expect(passiveScore(4, 'advantage')).toBe(19);
    expect(passiveScore(-1)).toBe(9); // the Goblin Warrior: WIS −1 ⇒ PP 9
  });
});

// ------------------------------------------------------------- event trace
describe('the Torvald trace (Brief 02 §5 fixture)', () => {
  const trace: PlayEvent[] = fx('torvald-trace.json').events.map((e: unknown) => PlayEventSchema.parse(e));

  it('every event validates against the vocabulary', () => {
    expect(trace).toHaveLength(6);
  });

  it('the attack roll matches the worked trace exactly', () => {
    const roll = trace.find((e) => e.body.t === 'roll_made')!;
    if (roll.body.t !== 'roll_made') throw new Error('unreachable');
    expect(roll.body.collapsed).toBe('disadvantage');
    expect(roll.body.d20).toBe(9);
    expect(roll.body.secondD20).toBe(14);
    expect(roll.body.total).toBe(17);
    expect(roll.body.vs).toEqual({ type: 'ac', value: 17 }); // AC 15 + half cover 2
    expect(roll.body.outcome).toBe('hit'); // ties hit
  });

  it('cascade shares one causeId; undo reverses exactly that group (golden test: undo semantics)', () => {
    const cascade = trace.filter((e) => e.causeId === 'evt-0041');
    expect(cascade.map((e) => e.seq)).toEqual([42, 43, 44]);
    const undo = trace.find((e) => e.body.t === 'undo_applied')!;
    if (undo.body.t !== 'undo_applied') throw new Error('unreachable');
    expect(undo.body.reversedSeqs).toEqual([42, 43, 44]);
  });

  it('dm_only never reaches a player or the table display — wire-level (golden test #7)', () => {
    const player = filterStream(trace, { role: 'player', accountId: 'acct-torvald' });
    const table = filterStream(trace, { role: 'table_display' });
    const dm = filterStream(trace, { role: 'dm', accountId: 'acct-dm' });
    expect(player.some((e) => e.visibility === 'dm_only')).toBe(false);
    expect(table.some((e) => e.visibility === 'dm_only')).toBe(false);
    expect(dm).toHaveLength(6);
    expect(player).toHaveLength(5);
    // sequence gaps for non-DM viewers are expected, not errors
    expect(player.map((e) => e.seq)).toEqual([41, 42, 43, 44, 46]);
  });

  it('whispers reach only the addressee', () => {
    const whisperEvent: PlayEvent = {
      ...trace[4]!,
      visibility: { whisperTo: 'acct-torvald' },
    };
    expect(eventVisibleTo(whisperEvent, { role: 'player', accountId: 'acct-torvald' })).toBe(true);
    expect(eventVisibleTo(whisperEvent, { role: 'player', accountId: 'acct-mira' })).toBe(false);
    expect(eventVisibleTo(whisperEvent, { role: 'table_display' })).toBe(false);
    expect(eventVisibleTo(whisperEvent, { role: 'dm' })).toBe(true);
  });
});

// ---------------------------------------------------------------- wire (Brief 05 §1)
describe('wire messages validate against the schemas', () => {
  it('accepts each ClientMsg variant', () => {
    const msgs = [
      { m: 'hello', playSessionId: 'ps-1', token: 'tok', lastSeq: 40 },
      { m: 'intent', envelope: { idempotencyKey: 'key-abcdef12', intent: { kind: 'move', tokenId: 't1', path: [{ x: 0, y: 0 }] } } },
      { m: 'ruling_response', promptId: 'p1', response: { decision: 'ask_roll' } },
      { m: 'ping' },
    ];
    for (const msg of msgs) expect(() => ClientMsgSchema.parse(msg)).not.toThrow();
  });

  it('accepts each ServerMsg variant, incl. an opaque welcome snapshot', () => {
    const msgs = [
      { m: 'welcome', viewer: { role: 'player' }, snapshotSeq: 40, snapshot: { anything: true } },
      { m: 'intent_ack', idempotencyKey: 'key-abcdef12', accepted: true, firstSeq: 41 },
      { m: 'intent_rejected', idempotencyKey: 'key-abcdef12', reason: "It isn't your turn." },
      { m: 'presence', connected: [{ accountId: 'acct-torvald', role: 'player' }], activeCreatureId: 'pc-torvald' },
      { m: 'error', code: 'rate_limited', detail: 'slow down' },
      { m: 'pong' },
    ];
    for (const msg of msgs) expect(() => ServerMsgSchema.parse(msg)).not.toThrow();
  });

  it('rejects an unknown message discriminator', () => {
    expect(() => ClientMsgSchema.parse({ m: 'nope' })).toThrow();
  });
});

// ---------------------------------------------------------------- world/room (Brief 06)
describe('grid geometry (ADR-0012: Chebyshev, diagonals cost 5 ft)', () => {
  it('distFt: orthogonal and diagonal both 5 ft per step (§1)', () => {
    expect(distFt({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(15);
    expect(distFt({ x: 0, y: 0 }, { x: 3, y: 3 })).toBe(15); // diagonal = 5 ft/step
    expect(distFt({ x: 0, y: 0 }, { x: 3, y: 1 })).toBe(15);
  });
  it('footprint by size', () => {
    expect(footprintOf('medium')).toBe(1);
    expect(footprintOf('large')).toBe(2);
    expect(footprintOf('gargantuan')).toBe(4);
  });
  it('affectedCells: a 20-ft-radius sphere = every cell within Chebyshev 20 ft (§4)', () => {
    const cells = affectedCells({ kind: 'sphere', radiusFt: 20 }, { x: 5, y: 5 });
    // radius 20 ft = 4 cells each direction → 9x9 block = 81 cells
    expect(cells).toHaveLength(81);
    expect(cells.every((c) => distFt({ x: 5, y: 5 }, c) <= 20)).toBe(true);
  });
  it('affectedCells: a 10-ft cube is 2x2 from the anchor', () => {
    const cells = affectedCells({ kind: 'cube', sizeFt: 10 }, { x: 0, y: 0 });
    expect(cells).toHaveLength(4);
  });
});

describe('fog / player payload cleanliness (Brief 06 §6.3 — the choke point)', () => {
  const room: Room = {
    id: 'room-1', terrainImageRef: 'img', gridSize: { w: 4, h: 4 },
    cellTags: { '0,0': { light: 'bright' }, '3,3': { difficultTerrain: true } },
    revealed: ['0,0', '1,0'],
    assets: [
      { id: 'a-open', imageRef: 'i', cell: { x: 0, y: 0 }, footprint: { w: 1, h: 1 }, flags: { blocking: false, movable: false, interactive: true, difficultTerrain: false }, prepNote: 'secret lever' },
      { id: 'a-hidden', imageRef: 'i', cell: { x: 3, y: 3 }, footprint: { w: 1, h: 1 }, flags: { blocking: true, movable: false, interactive: false, difficultTerrain: false } },
    ],
    tokens: [
      { id: 't-visible', creatureRef: 'pc-torvald', cell: { x: 0, y: 0 }, size: 'medium', hidden: false, staged: false },
      { id: 't-hidden', creatureRef: 'npc-goblin-1', cell: { x: 3, y: 3 }, size: 'small', hidden: true, staged: false },
      { id: 't-staged', creatureRef: 'npc-boss', cell: { x: 1, y: 0 }, size: 'large', hidden: false, staged: true },
    ],
  };

  it('a player payload contains zero unrevealed-cell data and zero hidden/staged tokens', () => {
    const player = filterRoomForViewer(room, { role: 'player', accountId: 'acct-torvald' });
    // only revealed cellTags survive
    expect(Object.keys(player.cellTags)).toEqual(['0,0']);
    // hidden/staged tokens gone; only the visible one on a revealed cell remains
    expect(player.tokens.map((t) => t.id)).toEqual(['t-visible']);
    // the asset on an unrevealed cell is gone; the revealed one keeps NO prepNote
    expect(player.assets.map((a) => a.id)).toEqual(['a-open']);
    expect(player.assets[0]!).not.toHaveProperty('prepNote');
  });

  it('the DM sees the full room, prep notes and all', () => {
    const dm = filterRoomForViewer(room, { role: 'dm', accountId: 'acct-dm' });
    expect(dm.tokens).toHaveLength(3);
    expect(dm.assets[0]!.prepNote).toBe('secret lever');
  });
});

// ---------------------------------------------------------------- AI schemas (Brief 09c)
describe('AI output schemas + difficulty ladder', () => {
  it('RulingSuggestion validates', () => {
    const r = { check: { kind: 'ability_check', ability: 'dex', skill: 'acrobatics' }, dc: 14, failConsequence: 'You fall.', rationale: 'Swinging on a rope is Acrobatics.' };
    expect(() => RulingSuggestionSchema.parse(r)).not.toThrow();
  });
  it('NpcLine validates with an attitude delta', () => {
    expect(() => NpcLineSchema.parse({ line: 'Well met.', attitudeDelta: 1 })).not.toThrow();
  });
  it('the difficulty ladder is the five SRD-style rungs', () => {
    expect(DIFFICULTY_LADDER.map((r) => r.dc)).toEqual([10, 13, 15, 18, 20]);
  });
  it('ladderFallback produces a valid RulingSuggestion with no model', () => {
    const rung = DIFFICULTY_LADDER.find((r) => r.label === 'Hard')!;
    const suggestion = ladderFallback('dex', rung);
    expect(() => RulingSuggestionSchema.parse(suggestion)).not.toThrow();
    expect(suggestion.dc).toBe(15);
  });
});
