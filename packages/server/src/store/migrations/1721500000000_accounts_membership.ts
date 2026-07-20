/**
 * Brief 14 §1 — accounts, membership, and auth-token tables.
 *
 * EXTENDS the existing `account` table (created by 1721400000000_initial) — it does
 * NOT re-create it. Adds the columns the shell/auth need, plus `membership` (what
 * resolveToken reads to answer "what role here?") and the three single-use token
 * tables (verification / password-reset / refresh). Token strings are stored HASHED
 * (sha256), never raw (ADR-0004 discipline).
 */
import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export function up(pgm: MigrationBuilder): void {
  // ---- extend the existing account table (do NOT re-create it) ----
  pgm.addColumns('account', {
    password_hash: { type: 'text', notNull: false }, // null iff oauth-only (future)
    oauth: { type: 'jsonb', notNull: false },        // reserved seam; unused in the slice
    email_verified: { type: 'boolean', notNull: true, default: false },
    onboarding: { type: 'text', notNull: true, default: 'floor0' }, // brief-13 floor state
    settings: { type: 'jsonb', notNull: true, default: '{}' },
    age_bracket: { type: 'text', notNull: false }, // C5 reserved
    deleted_at: { type: 'timestamptz', notNull: false }, // soft-delete; purge job hard-deletes
  });
  pgm.addConstraint('account', 'account_age_bracket_chk', {
    check: `age_bracket IS NULL OR age_bracket IN ('under13','13to17','adult')`,
  });

  // ---- membership: (account, campaign) → role. resolveToken's lookup. ----
  pgm.createTable('membership', {
    campaign_id: { type: 'text', notNull: true, references: 'campaign', onDelete: 'CASCADE' },
    account_id: { type: 'text', notNull: true, references: 'account', onDelete: 'CASCADE' },
    role: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.addConstraint('membership', 'membership_pk', { primaryKey: ['campaign_id', 'account_id'] });
  pgm.addConstraint('membership', 'membership_role_chk', {
    check: `role IN ('dm','player','table_display')`,
  });
  // resolveToken looks up by (account_id, campaign_id); the PK covers campaign-first,
  // this index covers the account-first hop from a JWT sub.
  pgm.createIndex('membership', 'account_id', { name: 'membership_by_account' });

  // ---- single-use token tables (hashed at rest) ----
  pgm.createTable('email_verification', {
    token_hash: { type: 'text', primaryKey: true },
    account_id: { type: 'text', notNull: true, references: 'account', onDelete: 'CASCADE' },
    expires_at: { type: 'timestamptz', notNull: true },
  });
  pgm.createTable('password_reset', {
    token_hash: { type: 'text', primaryKey: true },
    account_id: { type: 'text', notNull: true, references: 'account', onDelete: 'CASCADE' },
    expires_at: { type: 'timestamptz', notNull: true },
    used_at: { type: 'timestamptz', notNull: false },
  });
  pgm.createTable('session_refresh', {
    token_hash: { type: 'text', primaryKey: true },
    account_id: { type: 'text', notNull: true, references: 'account', onDelete: 'CASCADE' },
    expires_at: { type: 'timestamptz', notNull: true },
    revoked_at: { type: 'timestamptz', notNull: false },
  });
  pgm.createIndex('session_refresh', 'account_id', { name: 'session_refresh_by_account' });
}

export function down(pgm: MigrationBuilder): void {
  // dropping a table drops its own indexes (membership_by_account,
  // session_refresh_by_account) — no explicit dropIndex needed.
  pgm.dropTable('session_refresh');
  pgm.dropTable('password_reset');
  pgm.dropTable('email_verification');
  pgm.dropTable('membership');
  pgm.dropConstraint('account', 'account_age_bracket_chk', { ifExists: true });
  pgm.dropColumns('account', [
    'password_hash', 'oauth', 'email_verified', 'onboarding', 'settings', 'age_bracket', 'deleted_at',
  ]);
}
