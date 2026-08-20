/**
 * The projection becomes what the screen draws.
 *
 * The assertions that matter are about RESOLUTION, not layout: an ally's exact
 * hit points versus an enemy's one-word condition. That distinction is what a
 * player is owed at a real table, and getting it backwards would either leak
 * the DM's numbers or hide an ally's.
 *
 * Note what this adapter does NOT do: hide anything. Visibility is settled
 * server-side before the payload is built, so anything reaching this function
 * is already permitted. These tests are about presentation.
 */
import { describe, it, expect } from 'vitest';
import { castFrom, heroFrom, logFrom, projectionToView, type Combatant, type Projection } from '../src/play/projectionToView.js';

function combatant(over: Partial<Combatant> & { id: string; name: string }): Combatant {
  return {
    abilities: { str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8 },
    profBonus: 2,
    proficientSkills: [],
    proficientSaves: ['str', 'con'],
    maxHp: 12,
    hp: 12,
    tempHp: 0,
    ac: 16,
    conditions: [],
    isPlayer: true,
    ...over,
  };
}

const projection = (combatants: Combatant[], over: Partial<Projection> = {}): Projection => ({
  combatants: Object.fromEntries(combatants.map((c) => [c.id, c])),
  round: 1,
  nextSeq: 0,
  ...over,
});

describe('the play view', () => {
  it('shows an ally exact hit points and an enemy only a word', () => {
    const cast = castFrom(
      projection([
        combatant({ id: 'mira', name: 'Mira', hp: 5, maxHp: 12 }),
        combatant({ id: 'gob', name: 'Goblin', hp: 3, maxHp: 12, isPlayer: false }),
      ]),
      'mira',
    );

    const mira = cast.find((c) => c.id === 'mira')!;
    const goblin = cast.find((c) => c.id === 'gob')!;

    expect(mira.hp).toEqual({ current: 5, max: 12 });
    expect(goblin.hp, "an enemy's exact hit points are the DM's to reveal").toBeUndefined();
    expect(goblin.hurt).toBe('Bloodied');
  });

  it('knows which one is you', () => {
    const cast = castFrom(
      projection([
        combatant({ id: 'mira', name: 'Mira' }),
        combatant({ id: 'bren', name: 'Bren' }),
        combatant({ id: 'gob', name: 'Goblin', isPlayer: false }),
      ]),
      'mira',
    );
    expect(cast.find((c) => c.id === 'mira')!.kind).toBe('you');
    expect(cast.find((c) => c.id === 'bren')!.kind).toBe('ally');
    expect(cast.find((c) => c.id === 'gob')!.kind).toBe('foe');
  });

  /** Bloodied is at or below half, per the SRD. */
  it('calls half health bloodied and no less', () => {
    const at = castFrom(projection([combatant({ id: 'g', name: 'G', hp: 6, maxHp: 12, isPlayer: false })]), null);
    const above = castFrom(projection([combatant({ id: 'g', name: 'G', hp: 7, maxHp: 12, isPlayer: false })]), null);
    expect(at[0]!.hurt).toBe('Bloodied');
    expect(above[0]!.hurt).toBe('Hurt');
  });

  it('marks a downed player dying and a downed enemy down', () => {
    const cast = castFrom(
      projection([
        combatant({ id: 'mira', name: 'Mira', hp: 0 }),
        combatant({ id: 'gob', name: 'Goblin', hp: 0, isPlayer: false }),
      ]),
      'mira',
    );
    expect(cast.find((c) => c.id === 'mira')!.status).toBe('Dying');
    expect(cast.find((c) => c.id === 'gob')!.status).toBe('Down');
  });

  it('marks whose turn it is from the projection, not from the list', () => {
    const cast = castFrom(
      projection(
        [combatant({ id: 'mira', name: 'Mira' }), combatant({ id: 'bren', name: 'Bren' })],
        { activeCreatureId: 'bren' },
      ),
      'mira',
    );
    expect(cast.find((c) => c.id === 'bren')!.acting).toBe(true);
    expect(cast.find((c) => c.id === 'mira')!.acting).toBe(false);
  });

  it('carries the arithmetic behind every number', () => {
    const hero = heroFrom(combatant({ id: 'mira', name: 'Mira' }), 'The Ash Moor');
    /* +2 DEX from a 14. The derivation is the info layer a new player needs. */
    expect(hero.initiative.value).toBe('+2');
    const str = hero.abilities.find((a) => a.key === 'str')!;
    expect(str.score).toBe(16);
    expect(str.mod).toBe(3);
    /* A Fighter is proficient in STR and CON saves: +3 STR and +2 proficiency. */
    expect(hero.saves.find((s) => s.key === 'str')!.mod).toBe(5);
    expect(hero.saves.find((s) => s.key === 'dex')!.mod).toBe(2);
  });

  /**
   * The journal is the table's record, not a firehose. Mechanical events change
   * numbers the screen already shows; putting them in the log would bury the
   * story under bookkeeping, which is what the journal exists to prevent.
   */
  it('logs what was said, not every mechanical tick', () => {
    const entries = logFrom([
      { seq: 1, id: 'a', at: 't', actor: { kind: 'system' }, visibility: 'public', body: { t: 'narration', text: 'The door gives.' } },
      { seq: 2, id: 'b', at: 't', actor: { kind: 'system' }, visibility: 'public', body: { t: 'resource_changed', creatureId: 'x', pool: 'p', delta: -1 } },
    ] as never);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.text).toBe('The door gives.');
  });

  it('says the table is exploring when nobody has rolled initiative', () => {
    const view = projectionToView({
      projection: projection([combatant({ id: 'mira', name: 'Mira' })]),
      room: null, myCreatureId: 'mira', role: 'player', events: [], campaignName: 'The Ash Moor',
    });
    expect(view.turn.exploring).toBe(true);
    expect(view.scene.subtitle).toBe('Not in a fight');
  });

  it('gives a DM no hero of their own', () => {
    const view = projectionToView({
      projection: projection([combatant({ id: 'mira', name: 'Mira' })]),
      room: null, myCreatureId: null, role: 'dm', events: [], campaignName: 'The Ash Moor',
    });
    expect(view.hero, 'a DM plays nobody').toBeNull();
    expect(view.cast, 'but still sees the table').toHaveLength(1);
  });
});
