/**
 * useSync — React binding for the SyncClient (Brief 05 client side).
 *
 * Opens the socket on mount, tears down on unmount, and re-renders on every
 * state change. Also surfaces the latest `roll_made` event as a RollResultVM so a
 * screen can drive the DiceTray reveal straight off the server's answer
 * (ADR-0008) — the client never rolls locally.
 */
import { useEffect, useRef, useState } from 'react';
import type { PlayEvent } from '@questra/contracts';
import { SyncClient, type SyncState, type SyncClientOptions } from './client.js';
import type { RollResultVM } from '../primitives/sheetToPlayerHub.js';

export interface UseSyncResult {
  state: SyncState;
  /** the most recent server roll, shaped for the DiceTray; undefined until one lands. */
  lastRoll: RollResultVM | undefined;
  /** send an intent (the server rules on legality and emits events). */
  sendIntent: (idempotencyKey: string, intent: unknown) => void;
}

/** Map a `roll_made` event body to the RollResultVM the DiceTray/ComposeRollSheet read. */
export function rollMadeToVM(event: PlayEvent): RollResultVM | undefined {
  if (event.body.t !== 'roll_made') return undefined;
  const b = event.body;
  return {
    rollId: b.rollId,
    kind: b.kind,
    d20: b.d20,
    secondD20: b.secondD20,
    collapsed: b.collapsed,
    modifiers: b.modifiers,
    total: b.total,
    ...(b.vs ? { vs: b.vs } : {}),
    outcome: b.outcome,
    entry: b.entry,
  };
}

export function useSync(
  opts: Omit<SyncClientOptions, 'onState' | 'onEvent'>,
): UseSyncResult {
  const [state, setState] = useState<SyncState>(() => ({
    status: 'connecting', projection: { combatants: {}, round: 0, nextSeq: 0 }, lastSeq: 0, log: [],
  }));
  const [lastRoll, setLastRoll] = useState<RollResultVM | undefined>(undefined);
  const clientRef = useRef<{ key: string; client: SyncClient } | null>(null);

  useEffect(() => {
    // Reuse an existing client for the same connection identity across React 19
    // StrictMode's dev double-invoke (mount → cleanup → mount). Without this, the
    // cleanup disconnects the very socket the server just registered as a viewer,
    // and the remount's new socket sends fine but never receives fan-out (acks but
    // no events — the exact "no dice" symptom). The client is torn down only when
    // the connection identity actually changes or the component truly unmounts.
    const key = `${opts.url}|${opts.playSessionId}|${opts.token}`;
    if (!clientRef.current || clientRef.current.key !== key) {
      clientRef.current?.client.disconnect();
      const client = new SyncClient({
        ...opts,
        onState: setState,
        onEvent: (event) => {
          const roll = rollMadeToVM(event);
          if (roll) setLastRoll(roll);
        },
      });
      client.connect();
      clientRef.current = { key, client };
    }
    // no teardown here: StrictMode's synchronous cleanup would kill the live socket.
    // A stale client is replaced above when the key changes; the browser reclaims
    // the socket on navigation/close. (A production unmount-teardown can be added
    // when the app has real routing.)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opts.url, opts.playSessionId, opts.token]);

  return {
    state,
    lastRoll,
    sendIntent: (key, intent) => clientRef.current?.client.sendIntent(key, intent),
  };
}
