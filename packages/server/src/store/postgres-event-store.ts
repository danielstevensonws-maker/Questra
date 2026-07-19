/**
 * Postgres event store (ADR-0015) — the durable implementation of EventStore.
 * The append-only `play_event` table is the single source of truth the engine
 * `fold`s; nothing here mutates or deletes an event (undo is itself an appended
 * event). Indexed by (play_session_id, seq); the full row (the PlayEvent) is
 * stored as JSONB so the wire shape and the stored shape are identical.
 *
 * This makes the ADR-0015 exit criterion hold by construction: after a restart,
 * `load` returns the same rows in the same order, so `fold(reloaded) ===
 * fold(pre-restart)`.
 */
import pg from 'pg';
import type { PlayEvent } from '@questra/contracts';
import type { EventStore } from './event-store.js';

const { Pool } = pg;

export class PostgresEventStore implements EventStore {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async append(playSessionId: string, events: readonly PlayEvent[]): Promise<void> {
    if (events.length === 0) return;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      for (const e of events) {
        await client.query(
          `INSERT INTO play_event (play_session_id, seq, event)
           VALUES ($1, $2, $3)
           ON CONFLICT (play_session_id, seq) DO NOTHING`,
          [playSessionId, e.seq, JSON.stringify(e)],
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async load(playSessionId: string): Promise<PlayEvent[]> {
    const { rows } = await this.pool.query<{ event: PlayEvent }>(
      `SELECT event FROM play_event WHERE play_session_id = $1 ORDER BY seq ASC`,
      [playSessionId],
    );
    return rows.map((r) => r.event);
  }

  async recordIdempotency(playSessionId: string, key: string, firstSeq: number): Promise<void> {
    await this.pool.query(
      `INSERT INTO idempotency (play_session_id, key, first_seq)
       VALUES ($1, $2, $3)
       ON CONFLICT (play_session_id, key) DO NOTHING`,
      [playSessionId, key, firstSeq],
    );
  }

  async loadIdempotency(playSessionId: string): Promise<Map<string, number>> {
    const { rows } = await this.pool.query<{ key: string; first_seq: number }>(
      `SELECT key, first_seq FROM idempotency WHERE play_session_id = $1`,
      [playSessionId],
    );
    return new Map(rows.map((r) => [r.key, Number(r.first_seq)]));
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
