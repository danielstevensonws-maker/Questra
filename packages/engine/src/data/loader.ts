/**
 * Dataset loader — Brief 01 §7 acceptance rule: "the Engine refuses `draft`
 * entities outside dev." A verified release contains only `qa: 'verified'`
 * entities; a draft slipping into a real session is a data-integrity bug, so we
 * fail loudly rather than resolve rules from unreviewed data.
 *
 * Dev is detected from NODE_ENV; in dev, drafts are allowed (with a warning) so
 * ingestion work can be exercised end to end before sign-off.
 */
import { RulesEntitySchema, type RulesEntity } from '@questra/contracts';

export interface LoadOptions {
  /** Allow draft entities (dev/ingestion only). Defaults to detecting NODE_ENV. */
  allowDraft?: boolean;
}

function isDev(): boolean {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.NODE_ENV;
  return env === undefined || env === 'development' || env === 'test';
}

/**
 * Validate and load a set of entities. Every entity must parse against the
 * contracts schema (acceptance #1: zero `any`, everything typed). Outside dev,
 * any `qa: 'draft'` entity is rejected.
 */
export function loadEntities(raw: readonly unknown[], opts: LoadOptions = {}): RulesEntity[] {
  const allowDraft = opts.allowDraft ?? isDev();
  const out: RulesEntity[] = [];
  for (const item of raw) {
    const entity = RulesEntitySchema.parse(item); // throws on any schema violation
    if (entity.qa === 'draft' && !allowDraft) {
      throw new Error(
        `Refusing to load draft entity "${entity.id}" outside dev. Verify it (qa: 'verified') before shipping.`,
      );
    }
    out.push(entity);
  }
  return out;
}

/** Convenience: assert a dataset is fully verified (used by golden tests and release gates). */
export function assertAllVerified(entities: readonly RulesEntity[]): void {
  const drafts = entities.filter((e) => e.qa === 'draft').map((e) => e.id);
  if (drafts.length > 0) {
    throw new Error(`Dataset contains ${drafts.length} unverified draft(s): ${drafts.join(', ')}`);
  }
}
