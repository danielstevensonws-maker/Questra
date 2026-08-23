/**
 * A latecomer is caught up on the story, not just the numbers.
 *
 * WHY THIS EXISTS. A fresh join receives a folded snapshot, and folding keeps
 * numbers: hit points, positions, conditions. NARRATION IS NOT A NUMBER — it
 * has nowhere to live in projection state, so it vanished. Walking from the
 * lobby into the table opens a new socket, which is a fresh join, so the
 * session's opening line was gone by the time anybody arrived to read it
 * (owner, 2026-08-23: both screens showed an empty journal).
 *
 * The guard that matters is the second test. Replaying the log to a latecomer
 * is exactly the kind of change that leaks a secret, and it must not: every
 * replayed event still passes eventVisibleTo.
 */
import { describe, it, expect } from 'vitest';
import type { PlayEvent, ServerMsg } from '@questra/contracts';
import { SyncCore, type ResolvedToken } from '../src/sync-core.js';
import { connectMemory } from '../src/transport.js';

const PS = 'ps-replay';

const TOKENS: Record<string, ResolvedToken> = {
  'tok-dm': { accountId: 'acct-dm', role: 'dm', playSessionId: PS },
  'tok-mira': { accountId: 'acct-mira', role: 'player', playSessionId: PS },
};

/** A resolver that turns whatever it is handed into one narration event. */
function narrationCore(visibility: 'public' | 'private' = 'public', to?: string) {
  let n = 0;
  return new SyncCore({
    resolveToken: (token, playSessionId) => {
      const r = TOKENS[token];
      return r && r.playSessionId === playSessionId ? r : null;
    },
    resolveIntent: (envelope, state) => {
      const text = (envelope.intent as { text?: string }).text ?? '';
      n += 1;
      const event = {
        seq: state.nextSeq,
        id: 'e-' + String(n),
        at: '2026-08-23T00:00:00.000Z',
        causeId: 'c-' + String(n),
        actor: { kind: 'system' as const },
        visibility,
        ...(to === undefined ? {} : { to: [to] }),
        body: { t: 'narration' as const, text },
      } as PlayEvent;
      return { ok: true, events: [event] };
    },
  });
}

const eventsOf = (received: ServerMsg[]) =>
  received
    .filter((m): m is Extract<ServerMsg, { m: 'event' }> => m.m === 'event')
    .map((m) => (m.event.body as { text?: string }).text);

describe('joining a session already under way', () => {
  it('replays what was said, which the snapshot cannot carry', () => {
    const core = narrationCore();

    const dm = connectMemory(core);
    dm.send({ m: 'hello', playSessionId: PS, token: 'tok-dm' });
    dm.send({ m: 'intent', envelope: { idempotencyKey: 'k-begin-1', intent: { kind: 'free_text', creatureId: 'dm', text: 'The session begins.' } } });

    /* Mira arrives afterwards — the lobby-to-table walk, or simply opening the
       link late. She was not connected when it was said. */
    const mira = connectMemory(core);
    mira.send({ m: 'hello', playSessionId: PS, token: 'tok-mira' });

    expect(eventsOf(mira.received), 'the story so far must survive the join').toContain('The session begins.');
  });

  it('replays nothing to somebody a whisper was not meant for', () => {
    /* A private line addressed to the DM alone. */
    const core = narrationCore('private', 'acct-dm');

    const dm = connectMemory(core);
    dm.send({ m: 'hello', playSessionId: PS, token: 'tok-dm' });
    dm.send({ m: 'intent', envelope: { idempotencyKey: 'k-secret-1', intent: { kind: 'free_text', creatureId: 'dm', text: 'The floor is a trap.' } } });

    const mira = connectMemory(core);
    mira.send({ m: 'hello', playSessionId: PS, token: 'tok-mira' });

    expect(
      eventsOf(mira.received),
      'replay must go through the same visibility filter as live fan-out',
    ).not.toContain('The floor is a trap.');
  });
});
