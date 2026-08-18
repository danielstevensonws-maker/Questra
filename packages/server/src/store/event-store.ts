/**
 * The event-store seam (ADR-0015). SyncCore reads/writes the append-only log and
 * the idempotency index through this interface — never a concrete store — so the
 * in-memory store (dev/tests) and the Postgres store (durable) are swappable with
 * no protocol change. Snapshots always come from the engine `fold`; the store
 * only persists the events `fold` replays (§2.8).
 *
 * The interface is async (Postgres is), but SyncCore keeps a hydrated in-memory
 * mirror per active session for synchronous hot-path reads — memory is a cache of
 * the durable log. Durability comes from write-through on append + hydrate on
 * load. That is exactly what makes fold(reloaded) === fold(pre-restart) hold.
 */
import type { PlayEvent } from '@questra/contracts';

export interface EventStore {
  /** Append events to a session's log (in order). Durable before it resolves. */
  append(playSessionId: string, events: readonly PlayEvent[]): Promise<void>;
  /** Load a session's full log, seq-ascending (for hydrate-on-first-access / restart). */
  load(playSessionId: string): Promise<PlayEvent[]>;
  /** Record an idempotency key → firstSeq (once per key per session). */
  recordIdempotency(playSessionId: string, key: string, firstSeq: number): Promise<void>;
  /** Load the idempotency index for a session (key → firstSeq). */
  loadIdempotency(playSessionId: string): Promise<Map<string, number>>;
  /** Release any resources (connection pool). */
  close(): Promise<void>;
}

/**
 * In-memory event store — the default (dev/tests), the behavior SyncCore had
 * inline before the seam. Not durable across process restarts (that's the whole
 * point of the Postgres store); fine for CI and single-process dev.
 */
export class InMemoryEventStore implements EventStore {
  private logs = new Map<string, PlayEvent[]>();
  private idem = new Map<string, Map<string, number>>();

  async append(playSessionId: string, events: readonly PlayEvent[]): Promise<void> {
    const log = this.logs.get(playSessionId) ?? [];
    log.push(...events);
    this.logs.set(playSessionId, log);
  }
  async load(playSessionId: string): Promise<PlayEvent[]> {
    return [...(this.logs.get(playSessionId) ?? [])];
  }
  async recordIdempotency(playSessionId: string, key: string, firstSeq: number): Promise<void> {
    const m = this.idem.get(playSessionId) ?? new Map();
    m.set(key, firstSeq);
    this.idem.set(playSessionId, m);
  }
  async loadIdempotency(playSessionId: string): Promise<Map<string, number>> {
    return new Map(this.idem.get(playSessionId) ?? new Map());
  }
  async close(): Promise<void> {
    // nothing to release
  }
}
