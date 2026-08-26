/**
 * One way to say "this suite needs a real database".
 *
 * WHAT WENT WRONG BEFORE. Each durability suite guarded itself, and two of the
 * three did it by probing for Postgres and RETURNING EARLY from the test body
 * when it was missing. Vitest cannot tell that apart from a test that ran and
 * asserted nothing, so it reported them as PASSED: `persistence.golden` finished
 * in 3ms, went green, and had never touched a database. The ADR-0015 exit
 * criterion — "the event log survives a server restart" — looked verified for
 * weeks while three real bugs sat behind it (1fa5f95).
 *
 * THE THIRD STATE IS THE BUG. A suite that needs a database has exactly two
 * honest outcomes: it ran, or it was skipped and said so. "Passed without
 * running" is neither, and it is the one CI cannot see.
 *
 * So the rule here is: DATABASE_URL is the intent.
 *
 *   unset  → the suite is genuinely SKIPPED (vitest reports it), because a
 *            contributor with no database running should still get a green
 *            local run.
 *   set    → the suite MUST run. A database that is unreachable or unmigrated
 *            is a FAILURE with a sentence saying which, not a quiet pass —
 *            somebody asked for the database, so its absence is the news.
 */
import pg from 'pg';

export const DATABASE_URL = process.env.DATABASE_URL;

/** Whether a database was asked for at all. Suites use `describe.skipIf(!WANTS_POSTGRES)`. */
export const WANTS_POSTGRES = Boolean(DATABASE_URL);

/**
 * Assert the database named by DATABASE_URL is reachable AND migrated. Call in
 * `beforeAll`; it throws with the command that fixes each case, because the two
 * failures need different answers and "connection error" says neither.
 */
export async function requirePostgres(): Promise<void> {
  if (!DATABASE_URL) throw new Error('requirePostgres called without DATABASE_URL — guard the suite with skipIf(!WANTS_POSTGRES).');
  const pool = new pg.Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 3000 });
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    throw new Error(
      `DATABASE_URL is set but no Postgres answered at it (${String(err)}).\n` +
      `Start one with:  docker compose up -d`,
    );
  }
  try {
    await pool.query('SELECT 1 FROM play_event LIMIT 1');
  } catch {
    throw new Error(
      'Postgres is up but the schema is not migrated — the durability suites probe `play_event`.\n' +
      'Migrate it with:  npm run migrate:up -w @questra/server',
    );
  } finally {
    await pool.end().catch(() => { /* closing a pool we are already leaving */ });
  }
}
