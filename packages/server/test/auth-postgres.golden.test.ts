/**
 * ADR-0015 dev-env DoD — accounts + tokens PROVEN IN FACT against live Postgres.
 *
 * This is where the Brief 14 §1 "typechecked but unrun" caveat closes. It exercises
 * PostgresAuthRepo end to end and runs a real signup → verify → login → resolveToken
 * round-trip: the JWT minted at login, verified by makeResolveToken against a real
 * membership row read from Postgres, yields the right role. Also proves the deletion
 * guard reads the real campaign.owner_account_id FK.
 *
 * SKIPS cleanly when DATABASE_URL is unset/unreachable (CI stays green without a DB);
 * runs for real against docker-compose Postgres:
 *   docker compose up -d && npm run migrate:up -w @questra/server && DATABASE_URL=… vitest
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import {
  AuthService, PostgresAuthRepo, LogMailer, makeResolveToken, signSession, verifySession,
  type TokenConfig,
} from '../src/auth/index.js';

const DATABASE_URL = process.env.DATABASE_URL;
const SECRET = new TextEncoder().encode('pg-round-trip-secret-32-bytes-long!!');
const tokens: TokenConfig = { secret: SECRET };
const RUN = Date.now().toString(36); // unique-per-run ids so re-runs don't collide

async function postgresReady(): Promise<boolean> {
  if (!DATABASE_URL) return false;
  const pool = new pg.Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 1500 });
  try {
    await pool.query('SELECT 1 FROM membership LIMIT 1'); // needs the §1 migration applied
    return true;
  } catch {
    return false;
  } finally {
    await pool.end().catch(() => {});
  }
}

function extractToken(body: string): string {
  return body.split('token: ')[1]!.trim();
}

describe('accounts + tokens round-trip against live Postgres (ADR-0015 dev-env DoD)', () => {
  let ready = false;
  let pool: pg.Pool | null = null;
  let repo: PostgresAuthRepo | null = null;

  const CAMPAIGN = `camp_${RUN}`;
  const SESSION = `sess_${RUN}`;
  const email = `alice_${RUN}@example.com`;

  beforeAll(async () => {
    ready = await postgresReady();
    if (!ready) return;
    pool = new pg.Pool({ connectionString: DATABASE_URL! });
    repo = new PostgresAuthRepo(DATABASE_URL!);
  });

  afterAll(async () => {
    // clean up rows this run created (best-effort; FKs cascade from account/campaign)
    if (pool) {
      await pool.query(`DELETE FROM membership WHERE campaign_id = $1`, [CAMPAIGN]).catch(() => {});
      await pool.query(`DELETE FROM play_session WHERE id = $1`, [SESSION]).catch(() => {});
      await pool.query(`DELETE FROM account WHERE email = $1`, [email]).catch(() => {});
      await pool.query(`DELETE FROM campaign WHERE id = $1`, [CAMPAIGN]).catch(() => {});
      await pool.end().catch(() => {});
    }
    await repo?.close();
  });

  it('signup → verify → login → resolveToken(real membership) → role [skips without PG]', async () => {
    if (!ready || !repo || !pool) {
      console.warn('[auth-postgres] SKIPPED — no reachable Postgres with the §1 migration (docker compose up -d && npm run migrate:up)');
      return;
    }
    const mailer = new LogMailer(() => {});
    const svc = new AuthService({
      repo, mailer, tokens,
      newAccountId: () => `acc_${RUN}`,
    });

    // 1. signup writes a real account row (with an argon2id hash) to Postgres
    const { self } = await svc.signup(email, 'correct horse battery', 'Alice');
    expect(self.id).toBe(`acc_${RUN}`);
    const dbRow = (await pool.query(`SELECT password_hash, email_verified FROM account WHERE id = $1`, [self.id])).rows[0];
    expect(dbRow.password_hash).toMatch(/^\$argon2id\$/); // hashed at rest
    expect(dbRow.email_verified).toBe(false);

    // 2. verify (token from the mailer) flips the real row
    await svc.verifyEmail(extractToken(mailer.lastTo(email)!.body));
    expect((await repo.accountById(self.id))!.emailVerified).toBe(true);

    // 3. seed a campaign Alice OWNS + a session + her DM membership (§2 CRUD stand-in)
    await pool.query(`INSERT INTO campaign (id, name, owner_account_id) VALUES ($1,$2,$3)`, [CAMPAIGN, 'The Sunless Keep', self.id]);
    await pool.query(`INSERT INTO play_session (id, campaign_id) VALUES ($1,$2)`, [SESSION, CAMPAIGN]);
    await repo.addMembership({ campaignId: CAMPAIGN, accountId: self.id, role: 'dm', createdAt: new Date(0).toISOString() });

    // 4. login mints a real JWT; its sub is the account id
    const session = await svc.login(email, 'correct horse battery');
    const claims = await verifySession(session.access, tokens);
    expect(claims!.sub).toBe(self.id);

    // 5. THE round-trip: resolveToken reads the real membership from Postgres and
    //    returns the right role for the right session — the stub is truly dead.
    const resolveToken = makeResolveToken(repo, tokens);
    const resolved = await resolveToken(session.access, SESSION);
    expect(resolved).toEqual({ accountId: self.id, role: 'dm', playSessionId: SESSION });

    // a valid token for a DIFFERENT (non-existent) session → not resolvable → null
    expect(await resolveToken(session.access, `${SESSION}-nope`)).toBeNull();

    // 6. deletion guard reads the real owner_account_id FK: Alice owns a campaign → 409
    await expect(svc.deleteAccount(self.id)).rejects.toMatchObject({ status: 409, code: 'owns_campaign' });
  });
});
