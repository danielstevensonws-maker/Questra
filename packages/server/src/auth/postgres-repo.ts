/**
 * Postgres AuthRepo (Brief 14 §1) — the durable implementation behind the AuthRepo
 * seam. Parameterized SQL, no ORM (same discipline as PostgresEventStore). Token
 * rows store only the sha256 hash; raw tokens never touch the database. Reads the
 * `campaign.owner_account_id` FK (from the initial migration) for the deletion
 * guard, and joins `play_session → campaign` for resolveToken.
 */
import pg from 'pg';
import type { Membership } from '@questra/contracts';
import type { AuthRepo, AccountRow, TokenRow } from './repo.js';

const { Pool } = pg;

type AccountDb = {
  id: string; email: string; email_verified: boolean; display_name: string;
  password_hash: string | null; onboarding: string; settings: Record<string, unknown>;
  age_bracket: 'under13' | '13to17' | 'adult' | null; created_at: Date; deleted_at: Date | null;
};

function toAccountRow(r: AccountDb): AccountRow {
  return {
    id: r.id, email: r.email, emailVerified: r.email_verified, displayName: r.display_name,
    passwordHash: r.password_hash, onboarding: r.onboarding, settings: r.settings,
    ageBracket: r.age_bracket, createdAt: r.created_at.toISOString(),
    deletedAt: r.deleted_at ? r.deleted_at.toISOString() : null,
  };
}

export class PostgresAuthRepo implements AuthRepo {
  private pool: pg.Pool;
  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async createAccount(a: Omit<AccountRow, 'createdAt' | 'deletedAt'> & { createdAt: string }): Promise<void> {
    await this.pool.query(
      `INSERT INTO account (id, email, email_verified, display_name, password_hash, onboarding, settings, age_bracket, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [a.id, a.email, a.emailVerified, a.displayName, a.passwordHash, a.onboarding, JSON.stringify(a.settings), a.ageBracket, a.createdAt],
    );
  }
  async accountByEmail(email: string): Promise<AccountRow | null> {
    const { rows } = await this.pool.query<AccountDb>(`SELECT * FROM account WHERE lower(email) = lower($1)`, [email]);
    return rows[0] ? toAccountRow(rows[0]) : null;
  }
  async accountById(id: string): Promise<AccountRow | null> {
    const { rows } = await this.pool.query<AccountDb>(`SELECT * FROM account WHERE id = $1`, [id]);
    return rows[0] ? toAccountRow(rows[0]) : null;
  }
  async setEmailVerified(id: string): Promise<void> {
    await this.pool.query(`UPDATE account SET email_verified = true WHERE id = $1`, [id]);
  }
  async setPasswordHash(id: string, hash: string): Promise<void> {
    await this.pool.query(`UPDATE account SET password_hash = $2 WHERE id = $1`, [id, hash]);
  }
  async softDeleteAccount(id: string, at: string): Promise<void> {
    await this.pool.query(`UPDATE account SET deleted_at = $2 WHERE id = $1`, [id, at]);
  }
  async hardDeleteAccountsDeletedBefore(cutoffIso: string): Promise<number> {
    const { rowCount } = await this.pool.query(
      `DELETE FROM account WHERE deleted_at IS NOT NULL AND deleted_at < $1`, [cutoffIso],
    );
    return rowCount ?? 0;
  }

  async addMembership(m: Membership): Promise<void> {
    await this.pool.query(
      `INSERT INTO membership (campaign_id, account_id, role, created_at) VALUES ($1,$2,$3,$4)
       ON CONFLICT (campaign_id, account_id) DO UPDATE SET role = EXCLUDED.role`,
      [m.campaignId, m.accountId, m.role, m.createdAt],
    );
  }
  async membership(accountId: string, campaignId: string): Promise<Membership | null> {
    const { rows } = await this.pool.query<{ campaign_id: string; account_id: string; role: Membership['role']; created_at: Date }>(
      `SELECT * FROM membership WHERE account_id = $1 AND campaign_id = $2`, [accountId, campaignId],
    );
    const r = rows[0];
    return r ? { campaignId: r.campaign_id, accountId: r.account_id, role: r.role, createdAt: r.created_at.toISOString() } : null;
  }
  async ownedCampaigns(accountId: string): Promise<{ id: string; name: string }[]> {
    const { rows } = await this.pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM campaign WHERE owner_account_id = $1`, [accountId],
    );
    return rows;
  }
  async campaignIdForSession(playSessionId: string): Promise<string | null> {
    const { rows } = await this.pool.query<{ campaign_id: string | null }>(
      `SELECT campaign_id FROM play_session WHERE id = $1`, [playSessionId],
    );
    return rows[0]?.campaign_id ?? null;
  }

  async putVerification(t: TokenRow): Promise<void> {
    await this.pool.query(
      `INSERT INTO email_verification (token_hash, account_id, expires_at) VALUES ($1,$2, to_timestamp($3))`,
      [t.tokenHash, t.accountId, t.expiresAt],
    );
  }
  async takeVerification(tokenHash: string): Promise<TokenRow | null> {
    const { rows } = await this.pool.query<{ account_id: string; expires_at: Date }>(
      `DELETE FROM email_verification WHERE token_hash = $1 RETURNING account_id, expires_at`, [tokenHash],
    );
    const r = rows[0];
    return r ? { tokenHash, accountId: r.account_id, expiresAt: Math.floor(r.expires_at.getTime() / 1000) } : null;
  }
  async putReset(t: TokenRow): Promise<void> {
    await this.pool.query(
      `INSERT INTO password_reset (token_hash, account_id, expires_at) VALUES ($1,$2, to_timestamp($3))`,
      [t.tokenHash, t.accountId, t.expiresAt],
    );
  }
  async takeReset(tokenHash: string): Promise<TokenRow | null> {
    const { rows } = await this.pool.query<{ account_id: string; expires_at: Date }>(
      `DELETE FROM password_reset WHERE token_hash = $1 AND used_at IS NULL RETURNING account_id, expires_at`, [tokenHash],
    );
    const r = rows[0];
    return r ? { tokenHash, accountId: r.account_id, expiresAt: Math.floor(r.expires_at.getTime() / 1000) } : null;
  }
  async putRefresh(t: TokenRow): Promise<void> {
    await this.pool.query(
      `INSERT INTO session_refresh (token_hash, account_id, expires_at) VALUES ($1,$2, to_timestamp($3))`,
      [t.tokenHash, t.accountId, t.expiresAt],
    );
  }
  async getRefresh(tokenHash: string): Promise<TokenRow | null> {
    const { rows } = await this.pool.query<{ account_id: string; expires_at: Date; revoked_at: Date | null }>(
      `SELECT account_id, expires_at, revoked_at FROM session_refresh WHERE token_hash = $1`, [tokenHash],
    );
    const r = rows[0];
    if (!r || r.revoked_at) return null;
    return { tokenHash, accountId: r.account_id, expiresAt: Math.floor(r.expires_at.getTime() / 1000) };
  }
  async revokeRefresh(tokenHash: string): Promise<void> {
    await this.pool.query(`UPDATE session_refresh SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL`, [tokenHash]);
  }
  async revokeAllRefresh(accountId: string): Promise<void> {
    await this.pool.query(`UPDATE session_refresh SET revoked_at = now() WHERE account_id = $1 AND revoked_at IS NULL`, [accountId]);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
