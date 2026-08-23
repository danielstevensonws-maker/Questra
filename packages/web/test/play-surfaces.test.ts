/**
 * The pieces the play screens are assembled from.
 *
 * These are the adapters, not the pixels: what a prompt SAYS, what a tile
 * carries, when the death ladder appears, and what reaches the journal. Each
 * one is a pure function of what arrived, which is the property that lets the
 * screens stay dumb.
 */
import { describe, it, expect } from 'vitest';
import type { PlayEvent } from '@questra/contracts';
import { promptsFrom } from '../src/play/promptsFrom.js';
import { tilesFrom } from '../src/play/tilesFrom.js';
import { dyingFrom, logFrom, castFrom, type Combatant, type Projection } from '../src/play/projectionToView.js';

const at = '2026-08-23T00:00:00.000Z';
const ev = (seq: number, body: unknown): PlayEvent =>
  ({ seq, id: `e${String(seq)}`, at, actor: { kind: 'engine' }, visibility: 'public', body } as PlayEvent);

function combatant(over: Partial<Combatant> & { id: string; name: string }): Combatant {
  return {
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    profBonus: 2, maxHp: 12, hp: 12, tempHp: 0, ac: 16,
    conditions: [], isPlayer: true,
    ...over,
  };
}

describe('reaction prompts', () => {
  const prompted = (promptId: string, context: unknown) =>
    ev(1, { t: 'reaction_prompted', promptId, creatureId: 'mira', context, timeoutSec: 60 });

  /**
   * The translation IS the feature. A player mid-fight has seconds to decide,
   * and "opportunity_attack" is not something a first-timer can act on.
   */
  it('says what happened in words, not in engine vocabulary', () => {
    const [p] = promptsFrom(
      [prompted('p1', {
        kind: 'opportunity_attack',
        moverId: 'goblin', provokerId: 'mira',
        pathStep: { from: { x: 1, y: 1 }, to: { x: 2, y: 1 } },
        attackOptions: ['Longsword'],
      })],
      { goblin: 'the goblin' },
    );

    expect(p!.context).toBe('the goblin is moving out of reach. You can take a swing as they go.');
    expect(p!.context).not.toMatch(/opportunity|provoke|pathStep/i);
    expect(p!.options).toEqual([{ name: 'Longsword', cost: 'Your reaction' }]);
  });

  it('closes when it is answered, whichever way', () => {
    const taken = promptsFrom([
      prompted('p1', { kind: 'feature', featureId: 'f', trigger: 'take_damage' }),
      ev(2, { t: 'reaction_taken', promptId: 'p1' }),
    ]);
    const declined = promptsFrom([
      prompted('p1', { kind: 'feature', featureId: 'f', trigger: 'take_damage' }),
      ev(2, { t: 'reaction_declined', promptId: 'p1', reason: 'timeout' }),
    ]);
    expect(taken, 'a card that will not go away is the worst failure here').toHaveLength(0);
    expect(declined, 'letting it lapse is a real answer').toHaveLength(0);
  });

  it('counts legendary actions in words a person reads', () => {
    const [p] = promptsFrom([prompted('p1', {
      kind: 'legendary_action',
      poolRemaining: 1,
      options: [{ name: 'Tail Attack', cost: 1 }],
    })]);
    expect(p!.context).toContain('1 action');
    expect(p!.context, 'singular, because "1 actions" reads as a bug').not.toContain('1 actions');
  });

  it('leaves declining off the option list, since the card always offers it', () => {
    const [p] = promptsFrom([prompted('p1', { kind: 'feature', featureId: 'f', trigger: 'custom' })]);
    expect(p!.options.map((o) => o.name)).not.toContain('Let it pass');
  });
});

describe('the action rows', () => {
  const sheet = {
    attacks: [{
      name: 'Longsword', toHit: 5,
      toHitDerivation: [{ label: 'STR', value: 3 }, { label: 'Proficiency', value: 2 }],
      damage: '1d8 + 3', damageType: 'slashing', ability: 'str',
    }],
    features: [{ id: 'second-wind', name: 'Second Wind', resource: { pool: 'sw', max: 1, remaining: 1 } }],
  } as never;

  it('carries the arithmetic behind the attack bonus, off the sheet', () => {
    const [tile] = tilesFrom(sheet);
    expect(tile!.name).toBe('Longsword');
    expect(tile!.roll).toEqual({ bonus: 5 });
    expect(tile!.explain.rows).toEqual([
      { label: 'STR', value: '+3' },
      { label: 'Proficiency', value: '+2' },
    ]);
  });

  /**
   * A player does not know a target's armour class before they swing. Handing
   * it over on the tile would give them a number the character has not earned.
   */
  it('never shows what it is rolling against before the roll', () => {
    const [tile] = tilesFrom(sheet);
    expect(tile!.roll?.against).toBeUndefined();
  });

  it('shows a limited feature what is left of it', () => {
    const tiles = tilesFrom(sheet);
    const feature = tiles.find((t) => t.id.startsWith('feature:'))!;
    expect(feature.resource).toBe('1 of 1');
    expect(feature.detail).toContain('a rest brings them back');
  });

  it('greys nothing on its own guess — that is the server’s answer', () => {
    for (const tile of tilesFrom(sheet)) expect(tile.greyReason).toBeNull();
  });

  it('has nothing to show without a sheet', () => {
    expect(tilesFrom(null)).toEqual([]);
  });
});

describe('the death-save ladder', () => {
  it('stays hidden while you are on your feet', () => {
    expect(dyingFrom([], 'mira', 12)).toBeUndefined();
  });

  it('counts successes and failures from the rolls themselves', () => {
    const d = dyingFrom([
      ev(1, { t: 'creature_unconscious', creatureId: 'mira' }),
      ev(2, { t: 'roll_made', creatureId: 'mira', kind: 'death_save', d20: 15, collapsed: 'straight', sources: [], modifiers: [], total: 15, outcome: 'success', entry: 'server' }),
      ev(3, { t: 'roll_made', creatureId: 'mira', kind: 'death_save', d20: 4, collapsed: 'straight', sources: [], modifiers: [], total: 4, outcome: 'failure', entry: 'server' }),
    ], 'mira', 0);
    expect(d).toEqual({ successes: 1, failures: 1, phase: 'dying' });
  });

  /** A natural 1 is two failures (SRD). */
  it('counts a fumble twice', () => {
    const d = dyingFrom([
      ev(1, { t: 'creature_unconscious', creatureId: 'mira' }),
      ev(2, { t: 'roll_made', creatureId: 'mira', kind: 'death_save', d20: 1, collapsed: 'straight', sources: [], modifiers: [], total: 1, outcome: 'fumble', entry: 'server' }),
    ], 'mira', 0);
    expect(d!.failures).toBe(2);
  });

  it('wipes the ladder when somebody heals you', () => {
    const d = dyingFrom([
      ev(1, { t: 'creature_unconscious', creatureId: 'mira' }),
      ev(2, { t: 'roll_made', creatureId: 'mira', kind: 'death_save', d20: 4, collapsed: 'straight', sources: [], modifiers: [], total: 4, outcome: 'failure', entry: 'server' }),
      ev(3, { t: 'healing_applied', creatureId: 'mira', amount: 5 }),
    ], 'mira', 5);
    expect(d, 'back on your feet is not a ladder with one rung ticked').toBeUndefined();
  });

  it('is only ever about your own character', () => {
    const d = dyingFrom([
      ev(1, { t: 'creature_unconscious', creatureId: 'bren' }),
      ev(2, { t: 'roll_made', creatureId: 'bren', kind: 'death_save', d20: 4, collapsed: 'straight', sources: [], modifiers: [], total: 4, outcome: 'failure', entry: 'server' }),
    ], 'mira', 12);
    expect(d).toBeUndefined();
  });
});

describe('the journal', () => {
  it('shows the arithmetic of a roll, which is the whole promise', () => {
    const [line] = logFrom([
      ev(1, {
        t: 'roll_made', rollId: 'r1', kind: 'attack_roll', creatureId: 'mira',
        d20: 12, collapsed: 'straight', sources: [], modifiers: [{ label: 'STR', value: 5 }],
        total: 17, vs: { type: 'ac', value: 15 }, outcome: 'hit', entry: 'server',
      }),
    ], { mira: 'Mira' });

    expect(line!.actor).toBe('Mira');
    expect(line!.text, 'a bare 17 teaches nothing').toBe('Attack: rolled 12 +5 STR = 17 against 15 — a hit');
  });

  it('names the round and who is up when the turn moves', () => {
    const [line] = logFrom([ev(1, { t: 'turn_advanced', round: 2, activeCreatureId: 'goblin' })], { goblin: 'Goblin' });
    expect(line!.text).toBe('Goblin is up.');
    expect(line!.actor).toBe('Round 2');
  });

  it('marks a whisper as private so it is not read aloud by mistake', () => {
    const [line] = logFrom([ev(1, { t: 'whisper_sent', text: 'The floor is a trap.' })]);
    expect(line!.actor).toBe('Just to you');
  });

  it('still leaves bookkeeping out of the story', () => {
    const lines = logFrom([ev(1, { t: 'resource_changed', creatureId: 'mira', pool: 'p', delta: -1 })]);
    expect(lines).toHaveLength(0);
  });
});

describe('the cast list', () => {
  const projection = (over: Partial<Projection>): Projection => ({
    combatants: {
      zara: combatant({ id: 'zara', name: 'Zara' }),
      arn: combatant({ id: 'arn', name: 'Arn' }),
    },
    round: 1, nextSeq: 0,
    ...over,
  });

  /**
   * A turn order sorted alphabetically is actively misleading: the list's whole
   * job in a fight is to answer "who is next?".
   */
  it('follows initiative in a fight, not the alphabet', () => {
    const cast = castFrom(projection({ order: ['zara', 'arn'], activeCreatureId: 'zara' }), 'arn');
    expect(cast.map((c) => c.id)).toEqual(['zara', 'arn']);
  });

  it('falls back to the alphabet when nobody has rolled', () => {
    const cast = castFrom(projection({}), 'arn');
    expect(cast.map((c) => c.id)).toEqual(['arn', 'zara']);
  });

  it('puts somebody who joined mid-fight at the end rather than the front', () => {
    const p = projection({ order: ['zara'], activeCreatureId: 'zara' });
    const cast = castFrom(p, 'arn');
    expect(cast.map((c) => c.id)).toEqual(['zara', 'arn']);
  });
});
