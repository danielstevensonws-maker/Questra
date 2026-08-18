/**
 * Initial schema (ADR-0015). The append-only event table is the load-bearing
 * one — it is the single source of truth the engine folds. Core entity tables
 * accompany it (accounts/campaigns/memberships/characters/rooms); the shell
 * (brief-14, M3) fleshes their columns out, but the tables exist now so the
 * event log and its owning session have real foreign keys.
 */
import type { MigrationBuilder } from 'node-pg-migrate';

export const shorthands = undefined;

export function up(pgm: MigrationBuilder): void {
  // ---- entities (thin; brief-14 M3 extends columns) ----
  pgm.createTable('account', {
    id: { type: 'text', primaryKey: true },
    email: { type: 'text', notNull: true, unique: true },
    display_name: { type: 'text', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('campaign', {
    id: { type: 'text', primaryKey: true },
    name: { type: 'text', notNull: true },
    owner_account_id: { type: 'text', notNull: true, references: 'account', onDelete: 'RESTRICT' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createTable('play_session', {
    id: { type: 'text', primaryKey: true },
    campaign_id: { type: 'text', references: 'campaign', onDelete: 'CASCADE' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  // ---- the append-only event log (the source of truth) ----
  pgm.createTable('play_event', {
    play_session_id: { type: 'text', notNull: true },
    seq: { type: 'bigint', notNull: true },
    event: { type: 'jsonb', notNull: true },
    stored_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  // one row per (session, seq); the index that makes ordered replay cheap.
  pgm.addConstraint('play_event', 'play_event_pk', { primaryKey: ['play_session_id', 'seq'] });

  // Append-only guard: block UPDATE and DELETE at the database level, so "the log
  // is never rewritten" (Brief 02 §4) is enforced, not just conventional.
  pgm.createFunction(
    'refuse_mutation',
    [],
    { returns: 'trigger', language: 'plpgsql' },
    `BEGIN RAISE EXCEPTION 'play_event is append-only'; END;`,
  );
  pgm.createTrigger('play_event', 'play_event_no_update', {
    when: 'BEFORE', operation: ['UPDATE', 'DELETE'], level: 'ROW', function: 'refuse_mutation',
  });

  // ---- idempotency index (Brief 05 §2.3) ----
  pgm.createTable('idempotency', {
    play_session_id: { type: 'text', notNull: true },
    key: { type: 'text', notNull: true },
    first_seq: { type: 'bigint', notNull: true },
  });
  pgm.addConstraint('idempotency', 'idempotency_pk', { primaryKey: ['play_session_id', 'key'] });
}

export function down(pgm: MigrationBuilder): void {
  pgm.dropTable('idempotency');
  pgm.dropTrigger('play_event', 'play_event_no_update');
  pgm.dropFunction('refuse_mutation', []);
  pgm.dropTable('play_event');
  pgm.dropTable('play_session');
  pgm.dropTable('campaign');
  pgm.dropTable('account');
}
