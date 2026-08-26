/**
 * The swing a fleeing goblin should have to risk.
 *
 * WHAT WAS BROKEN. Brief 08's prompt machinery was complete and unreachable.
 * `sim/prompts.ts` built opportunity prompts, tracked the reaction economy and
 * held legendary cascades, with its own golden suite green — and nothing in the
 * server ever CALLED any of it. `SyncCore` armed a timeout for
 * `reaction_prompted` and the play screens rendered the card, so both ends of
 * the wire were wired to a producer that did not exist. A monster walked out of
 * a fighter's reach every round of every fight and the fighter was never asked.
 *
 * Brief 02 §6 #5 had deferred the detection to "the movement/reaction system"
 * and Brief 08 declared it out of its own scope ("Brief 02/06 own it"), so it
 * fell between the two.
 *
 * The GEOMETRY is the engine's and is tested there (`reach.golden.test.ts`).
 * What is tested here is the part this file owns: that a move produces the
 * prompt, that taking it actually swings, and that the economy is spent.
 */
import { describe, it, expect } from 'vitest';
import type { Cell, PlayEvent, Room, Viewer } from '@questra/contracts';
import { makeSliceResolver } from '../src/app.js';
import type { Combatant, ProjectionState } from '@questra/engine';

const DM: Viewer = { role: 'dm', accountId: 'acct-dm' };
const PLAYER: Viewer = { role: 'player', accountId: 'acct-mira' };

const combatant = (id: string, name: string, isPlayer: boolean, cell: Cell, ac: number): Combatant & { cell: Cell } => ({
  id, name,
  abilities: { str: 14, dex: 12, con: 12, int: 10, wis: 10, cha: 10 },
  profBonus: 2, maxHp: 12, hp: 12, tempHp: 0, ac,
  conditions: [], isPlayer,
  cell,
});

/**
 * Torvald stands at 5,5; the goblin is beside him at 6,5 and about to run.
 * Their armour differs so a roll can be attributed to the creature it was
 * rolled AGAINST — the pipeline records `vs`, not a target id.
 */
const TORVALD = combatant('pc-torvald', 'Torvald', true, { x: 5, y: 5 }, 18);
const GOBLIN = combatant('foe-goblin', 'Goblin Warrior', false, { x: 6, y: 5 }, 13);

const room = (): Room => ({
  id: 'room_1',
  terrainImageRef: 'steading.png',
  gridSize: { w: 12, h: 10 },
  cellTags: {},
  revealed: [],
  assets: [],
  tokens: [TORVALD, GOBLIN].map((c) => ({
    id: `tok_${c.id}`,
    creatureRef: c.id,
    cell: c.cell,
    size: 'medium' as const,
    hidden: false,
    staged: false,
  })),
});

const state = (over: Partial<ProjectionState> = {}): ProjectionState => ({
  combatants: {
    [TORVALD.id]: { ...TORVALD },
    [GOBLIN.id]: { ...GOBLIN },
  },
  round: 1,
  order: [TORVALD.id, GOBLIN.id],
  activeCreatureId: GOBLIN.id,
  nextSeq: 10,
  ...over,
});

let key = 0;
const envelope = (intent: unknown) => ({ idempotencyKey: `k-${String(++key).padStart(8, '0')}`, intent });

const seated = () => makeSliceResolver({ roomFor: () => room() });

/** The goblin runs from 6,5 out to 8,5 — past Torvald's reach on the way. */
const flee = { kind: 'move', tokenId: 'tok_foe-goblin', path: [{ x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }] };

const ok = (out: ReturnType<ReturnType<typeof seated>>): PlayEvent[] => {
  expect(out.ok).toBe(true);
  if (!out.ok) throw new Error(out.reason);
  return out.events;
};

const bodies = (events: readonly PlayEvent[]): string[] => events.map((e) => e.body.t);

describe('a move that walks out of reach', () => {
  it('emits the move first, then the prompt — the card never precedes the step', () => {
    const events = ok(seated()(envelope(flee), state(), DM, { playSessionId: 'ps', log: [] }));
    expect(bodies(events)).toEqual(['token_moved', 'reaction_prompted']);
  });

  it('names the mover, the provoker and the step it happened on', () => {
    const events = ok(seated()(envelope(flee), state(), DM, { playSessionId: 'ps', log: [] }));
    const prompt = events[1]!.body as Extract<PlayEvent['body'], { t: 'reaction_prompted' }>;
    expect(prompt.creatureId).toBe(TORVALD.id);
    expect(prompt.context.kind).toBe('opportunity_attack');
    if (prompt.context.kind !== 'opportunity_attack') return;
    expect(prompt.context.moverId).toBe(GOBLIN.id);
    expect(prompt.context.provokerId).toBe(TORVALD.id);
    /* Torvald is at 5,5: 6,5 is adjacent to him, 7,5 is not — so the crossing
       is the first step, not the last. */
    expect(prompt.context.pathStep).toEqual({ from: { x: 6, y: 5 }, to: { x: 7, y: 5 } });
  });

  it('comes from the engine, not from whoever ran away', () => {
    const events = ok(seated()(envelope(flee), state(), DM, { playSessionId: 'ps', log: [] }));
    expect(events[1]!.actor.kind).toBe('engine');
  });

  it('gets a seq of its own, so the log stays linear', () => {
    const events = ok(seated()(envelope(flee), state(), DM, { playSessionId: 'ps', log: [] }));
    expect(events.map((e) => e.seq)).toEqual([10, 11]);
  });

  it('says nothing when the mover stays inside reach', () => {
    const shuffle = { kind: 'move', tokenId: 'tok_foe-goblin', path: [{ x: 6, y: 5 }, { x: 6, y: 6 }] };
    const events = ok(seated()(envelope(shuffle), state(), DM, { playSessionId: 'ps', log: [] }));
    expect(bodies(events)).toEqual(['token_moved']);
  });

  it('does not offer a swing at somebody on your own side', () => {
    const alliedGoblin = state();
    alliedGoblin.combatants[GOBLIN.id]!.isPlayer = true;
    const events = ok(seated()(envelope(flee), alliedGoblin, DM, { playSessionId: 'ps', log: [] }));
    expect(bodies(events)).toEqual(['token_moved']);
  });

  it('does not offer a swing to somebody already down', () => {
    const downed = state();
    downed.combatants[TORVALD.id]!.hp = 0;
    const events = ok(seated()(envelope(flee), downed, DM, { playSessionId: 'ps', log: [] }));
    expect(bodies(events)).toEqual(['token_moved']);
  });

  it('still moves when the table has no map open', () => {
    const events = ok(makeSliceResolver()(envelope(flee), state(), DM, { playSessionId: 'ps', log: [] }));
    expect(bodies(events)).toEqual(['token_moved']);
  });
});

describe('answering the card', () => {
  /** The prompt as it would already be sitting in the log when the reply lands. */
  const promptInLog = (): PlayEvent[] => ok(seated()(envelope(flee), state(), DM, { playSessionId: 'ps', log: [] }));

  const promptId = (log: readonly PlayEvent[]): string => {
    const p = log.find((e) => e.body.t === 'reaction_prompted')!;
    return (p.body as { promptId: string }).promptId;
  };

  it('taking it actually swings — the reaction runs the ordinary d20 pipeline', () => {
    const log = promptInLog();
    const events = ok(seated()(
      envelope({ kind: 'prompt_reply', promptId: promptId(log), take: true }),
      state(), PLAYER, { playSessionId: 'ps', log },
    ));
    expect(events[0]!.body.t).toBe('reaction_taken');
    /* An attack is a roll and its outcome, not a lone acknowledgement. */
    expect(events.length).toBeGreaterThan(1);
    expect(bodies(events)).toContain('roll_made');
  });

  it('the swing is the holder’s, aimed at whoever ran', () => {
    const log = promptInLog();
    const events = ok(seated()(
      envelope({ kind: 'prompt_reply', promptId: promptId(log), take: true }),
      state(), PLAYER, { playSessionId: 'ps', log },
    ));
    /* The pipeline stamps its cascade with the engine actor and records what
       was rolled AGAINST in `vs`, so the target is identified by the armour it
       was rolled against — which is why the two differ in this fixture. */
    const roll = events.find((e) => e.body.t === 'roll_made')!;
    expect((roll.body as { vs?: { value: number } }).vs?.value).toBe(GOBLIN.ac);
    /* And the swinger is named in the sentence the table reads. */
    const narration = events.find((e) => e.body.t === 'narration')!;
    expect((narration.body as { text: string }).text).toContain(TORVALD.name);
  });

  it('declining closes the card and swings at nobody', () => {
    const log = promptInLog();
    const events = ok(seated()(
      envelope({ kind: 'prompt_reply', promptId: promptId(log), take: false }),
      state(), PLAYER, { playSessionId: 'ps', log },
    ));
    expect(bodies(events)).toEqual(['reaction_declined']);
  });

  it('refuses a second answer, so two people tapping cannot swing twice', () => {
    const log = promptInLog();
    const answered = [...log, ...ok(seated()(
      envelope({ kind: 'prompt_reply', promptId: promptId(log), take: true }),
      state(), PLAYER, { playSessionId: 'ps', log },
    ))];
    const again = seated()(
      envelope({ kind: 'prompt_reply', promptId: promptId(log), take: true }),
      state(), PLAYER, { playSessionId: 'ps', log: answered },
    );
    expect(again.ok).toBe(false);
    if (again.ok) return;
    expect(again.reason).toBe('That prompt has already been answered.');
  });

  it('closes cleanly when the mover was cut down before the answer came', () => {
    const log = promptInLog();
    const gone = state();
    delete gone.combatants[GOBLIN.id];
    const events = ok(seated()(
      envelope({ kind: 'prompt_reply', promptId: promptId(log), take: true }),
      gone, PLAYER, { playSessionId: 'ps', log },
    ));
    expect(bodies(events)).toEqual(['reaction_taken']);
  });
});

describe('the reaction economy (Brief 08 §3 #2)', () => {
  const spent = (): PlayEvent[] => {
    const log = ok(seated()(envelope(flee), state(), DM, { playSessionId: 'ps', log: [] }));
    const p = log.find((e) => e.body.t === 'reaction_prompted')!;
    return [...log, ...ok(seated()(
      envelope({ kind: 'prompt_reply', promptId: (p.body as { promptId: string }).promptId, take: true }),
      state(), PLAYER, { playSessionId: 'ps', log },
    ))];
  };

  it('a holder who has already reacted is not asked again', () => {
    const events = ok(seated()(envelope(flee), state(), DM, { playSessionId: 'ps', log: spent() }));
    expect(bodies(events)).toEqual(['token_moved']);
  });

  it('their own turn hands the reaction back', () => {
    const log: PlayEvent[] = [...spent(), {
      seq: 99, id: 'e-turn', at: '2026-08-26T00:00:00.000Z',
      actor: { kind: 'dm', accountId: 'acct-dm' }, visibility: 'public',
      body: { t: 'turn_advanced', round: 2, activeCreatureId: TORVALD.id },
    }];
    const events = ok(seated()(envelope(flee), state(), DM, { playSessionId: 'ps', log }));
    expect(bodies(events)).toEqual(['token_moved', 'reaction_prompted']);
  });

  it('somebody else’s turn does not (a global reset would refund every spend)', () => {
    const log: PlayEvent[] = [...spent(), {
      seq: 99, id: 'e-turn', at: '2026-08-26T00:00:00.000Z',
      actor: { kind: 'dm', accountId: 'acct-dm' }, visibility: 'public',
      body: { t: 'turn_advanced', round: 2, activeCreatureId: GOBLIN.id },
    }];
    const events = ok(seated()(envelope(flee), state(), DM, { playSessionId: 'ps', log }));
    expect(bodies(events)).toEqual(['token_moved']);
  });
});
