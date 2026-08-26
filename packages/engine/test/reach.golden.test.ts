/**
 * Opportunity-attack detection — the piece Brief 02 §6 #5 deferred to "the
 * movement/reaction system" and Brief 08 put out of its own scope. Until this
 * landed, every function in `prompts.ts` was tested and unreachable: a goblin
 * could walk out of a fighter's reach and nothing anywhere asked whether the
 * fighter wanted to swing.
 *
 * The rule being encoded is narrow on purpose. You provoke when you move OUT OF
 * reach — not when you approach, not when you shuffle around inside it, and not
 * a second time once you have already left.
 */
import { describe, it, expect } from 'vitest';
import type { Cell, PlayEvent, Room } from '@questra/contracts';
import {
  distanceFt, positionsOf, creatureForToken, provocations, DEFAULT_REACH_FT,
  type Threat,
} from '../src/sim/reach.js';
import { reactionsFrom, hasReaction, openPromptsFrom } from '../src/sim/prompts.js';

const goblin = (over: Partial<Threat> = {}): Threat => ({
  creatureId: 'foe-goblin',
  attackOptions: ['Scimitar'],
  reactionAvailable: true,
  ...over,
});

const at = (positions: Record<string, Cell>): Map<string, Cell> =>
  new Map(Object.entries(positions));

describe('the grid metric is ADR-0012 — Chebyshev, five feet a square', () => {
  it('a diagonal costs the same as an orthogonal step', () => {
    expect(distanceFt({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(5);
    expect(distanceFt({ x: 0, y: 0 }, { x: 1, y: 1 })).toBe(5);
    expect(distanceFt({ x: 0, y: 0 }, { x: 2, y: 2 })).toBe(10);
  });

  it('reach is a square ring, so ten feet threatens into the corners', () => {
    expect(distanceFt({ x: 5, y: 5 }, { x: 7, y: 7 })).toBe(10);
    expect(distanceFt({ x: 5, y: 5 }, { x: 8, y: 5 })).toBeGreaterThan(10);
  });
});

describe('provocations — who a path walks away from', () => {
  it('leaving reach provokes, and names the step it happened on', () => {
    const found = provocations(
      [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }],
      at({ 'foe-goblin': { x: 5, y: 5 } }),
      [goblin()],
    );
    expect(found).toHaveLength(1);
    expect(found[0]!.threat.creatureId).toBe('foe-goblin');
    /* The crossing is the FIRST step out of reach: 6,5 is still adjacent, 7,5
       is not, so the provoking step is the second one. */
    expect(found[0]!.step).toEqual({ from: { x: 6, y: 5 }, to: { x: 7, y: 5 } });
  });

  it('moving around inside reach provokes nothing', () => {
    const found = provocations(
      [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 6, y: 6 }],
      at({ 'foe-goblin': { x: 5, y: 5 } }),
      [goblin()],
    );
    expect(found).toEqual([]);
  });

  it('walking toward a creature provokes nothing', () => {
    const found = provocations(
      [{ x: 9, y: 5 }, { x: 8, y: 5 }, { x: 7, y: 5 }, { x: 6, y: 5 }],
      at({ 'foe-goblin': { x: 5, y: 5 } }),
      [goblin()],
    );
    expect(found).toEqual([]);
  });

  it('provokes once, not once per step, however far the mover runs', () => {
    const found = provocations(
      [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }, { x: 9, y: 5 }],
      at({ 'foe-goblin': { x: 5, y: 5 } }),
      [goblin()],
    );
    expect(found).toHaveLength(1);
  });

  it('a ten-foot reach lets the mover get one square further before provoking', () => {
    const path = [{ x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }];
    const positions = at({ 'foe-goblin': { x: 5, y: 5 } });
    expect(provocations(path, positions, [goblin()])[0]!.step)
      .toEqual({ from: { x: 6, y: 5 }, to: { x: 7, y: 5 } });
    expect(provocations(path, positions, [goblin({ reachFt: 10 })])[0]!.step)
      .toEqual({ from: { x: 7, y: 5 }, to: { x: 8, y: 5 } });
  });

  it('a spent reaction is dropped rather than prompted and refused (§3 #2)', () => {
    const found = provocations(
      [{ x: 5, y: 5 }, { x: 7, y: 5 }],
      at({ 'foe-goblin': { x: 5, y: 5 } }),
      [goblin({ reactionAvailable: false })],
    );
    expect(found).toEqual([]);
  });

  it('nothing to swing with means no card', () => {
    const found = provocations(
      [{ x: 5, y: 5 }, { x: 7, y: 5 }],
      at({ 'foe-goblin': { x: 5, y: 5 } }),
      [goblin({ attackOptions: [] })],
    );
    expect(found).toEqual([]);
  });

  it('a creature nobody can find on the map cannot threaten', () => {
    expect(provocations([{ x: 5, y: 5 }, { x: 7, y: 5 }], at({}), [goblin()])).toEqual([]);
  });

  it('several threats keep the order they arrived in (§3 #1: initiative order)', () => {
    const found = provocations(
      [{ x: 5, y: 5 }, { x: 7, y: 7 }],
      at({ first: { x: 5, y: 5 }, second: { x: 4, y: 5 }, third: { x: 4, y: 4 } }),
      [
        goblin({ creatureId: 'first' }),
        goblin({ creatureId: 'second' }),
        goblin({ creatureId: 'third' }),
      ],
    );
    expect(found.map((p) => p.threat.creatureId)).toEqual(['first', 'second', 'third']);
  });

  it('a path with nowhere to go provokes nothing', () => {
    expect(provocations([{ x: 5, y: 5 }], at({ 'foe-goblin': { x: 5, y: 5 } }), [goblin()])).toEqual([]);
    expect(provocations([], at({}), [goblin()])).toEqual([]);
  });

  it('the default reach is five feet', () => {
    expect(DEFAULT_REACH_FT).toBe(5);
  });
});

describe('reading positions off a room', () => {
  const room: Room = {
    id: 'room_1',
    terrainImageRef: 'steading.png',
    gridSize: { w: 10, h: 8 },
    cellTags: {},
    revealed: [],
    assets: [],
    tokens: [
      { id: 'tok_pc-torvald', creatureRef: 'pc-torvald', cell: { x: 1, y: 3 }, size: 'medium', hidden: false, staged: false },
      { id: 'goblin-piece', creatureRef: 'foe-goblin', cell: { x: 7, y: 3 }, size: 'small', hidden: false, staged: false },
    ],
  };

  it('keys by the creature the token stands for, not the token', () => {
    expect(positionsOf(room).get('foe-goblin')).toEqual({ x: 7, y: 3 });
  });

  it('a move names the token, so the creature is looked up from the room', () => {
    expect(creatureForToken(room, 'goblin-piece')).toBe('foe-goblin');
  });

  it('falls back to the arrival naming convention when the room has not caught up', () => {
    expect(creatureForToken(null, 'tok_foe-newcomer')).toBe('foe-newcomer');
    expect(creatureForToken(null, 'some-other-piece')).toBeNull();
  });
});

// ---- the economy, read back out of the log --------------------------------

let seq = 0;
const ev = (body: PlayEvent['body']): PlayEvent => ({
  seq: ++seq,
  id: `e${String(seq)}`,
  at: '2026-08-26T00:00:00.000Z',
  actor: { kind: 'engine' },
  visibility: 'public',
  body,
});

const prompted = (promptId: string, creatureId: string): PlayEvent =>
  ev({
    t: 'reaction_prompted',
    promptId,
    creatureId,
    timeoutSec: 60,
    context: {
      kind: 'opportunity_attack',
      moverId: 'foe-goblin',
      provokerId: creatureId,
      pathStep: { from: { x: 5, y: 5 }, to: { x: 7, y: 5 } },
      attackOptions: ['Longsword'],
    },
  });

describe('reactionsFrom — the economy is a fact about the log (§3 #2)', () => {
  it('a creature that has never reacted still has its reaction', () => {
    expect(hasReaction(reactionsFrom([]), 'pc-torvald')).toBe(true);
  });

  it('taking a prompt spends the HOLDER’s reaction, recovered from the prompt', () => {
    const state = reactionsFrom([
      prompted('p1', 'pc-torvald'),
      ev({ t: 'reaction_taken', promptId: 'p1' }),
    ]);
    expect(hasReaction(state, 'pc-torvald')).toBe(false);
  });

  it('declining costs nothing', () => {
    const state = reactionsFrom([
      prompted('p1', 'pc-torvald'),
      ev({ t: 'reaction_declined', promptId: 'p1', reason: 'holder' }),
    ]);
    expect(hasReaction(state, 'pc-torvald')).toBe(true);
  });

  it('a turn refunds ONLY the creature whose turn began — the §3 #2 fix', () => {
    const state = reactionsFrom([
      prompted('p1', 'pc-torvald'),
      ev({ t: 'reaction_taken', promptId: 'p1' }),
      prompted('p2', 'pc-brigid'),
      ev({ t: 'reaction_taken', promptId: 'p2' }),
      ev({ t: 'turn_advanced', round: 2, activeCreatureId: 'pc-torvald' }),
    ]);
    expect(hasReaction(state, 'pc-torvald')).toBe(true);
    expect(hasReaction(state, 'pc-brigid')).toBe(false);
  });

  it('a taken event whose prompt nobody opened spends nothing', () => {
    const state = reactionsFrom([ev({ t: 'reaction_taken', promptId: 'ghost' })]);
    expect(state).toEqual({});
  });
});

describe('openPromptsFrom — what is still waiting for an answer', () => {
  it('opens on prompted and closes on either resolution', () => {
    const log = [prompted('p1', 'pc-torvald'), prompted('p2', 'pc-brigid')];
    expect([...openPromptsFrom(log).keys()]).toEqual(['p1', 'p2']);

    const answered = [...log, ev({ t: 'reaction_taken', promptId: 'p1' })];
    expect([...openPromptsFrom(answered).keys()]).toEqual(['p2']);

    const bothGone = [...answered, ev({ t: 'reaction_declined', promptId: 'p2', reason: 'timeout' })];
    expect(openPromptsFrom(bothGone).size).toBe(0);
  });

  it('carries the holder and the context, so a reply can be resolved', () => {
    const open = openPromptsFrom([prompted('p1', 'pc-torvald')]).get('p1')!;
    expect(open.holderId).toBe('pc-torvald');
    expect(open.context.kind).toBe('opportunity_attack');
    expect(open.timeoutSec).toBe(60);
  });
});
