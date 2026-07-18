/**
 * @questra/engine — the pure event-sourced engine, sheet computation, and the
 * SRD ingestion pipeline. Depends on @questra/contracts for every shape; never
 * imports anything AI (ADR-0005).
 *
 * M1.1 surface: the ingestion pipeline + the verified rules dataset + a loader
 * that refuses `draft` entities outside dev. The event-sourced projection and
 * d20 pipeline arrive in M2 (Brief 02).
 */
export * from './ingest/conditions.js';
export * from './ingest/spells.js';
export * from './ingest/monsters.js';
export * from './ingest/pipeline.js';
export * from './data/conditions.js';
export * from './data/slice.js';
export * from './data/spells.js';
export * from './data/monsters.js';
export * from './data/loader.js';

import { CONDITIONS } from './data/conditions.js';
import { SLICE_ENTITIES } from './data/slice.js';
import { draftSpells } from './data/spells.js';
import { draftMonsters } from './data/monsters.js';
import type { RulesEntity } from '@questra/contracts';

/** The verified dataset: 15 conditions + the 3 slice entities. Refused-nowhere; safe in real sessions. */
export const VERIFIED_DATASET: RulesEntity[] = [...CONDITIONS, ...SLICE_ENTITIES];

/** The full dataset including drafts (verified core + draft spells + draft monsters). Drafts are dev-only via the loader. */
export function fullDataset(): RulesEntity[] {
  return [...VERIFIED_DATASET, ...draftSpells(), ...draftMonsters()];
}
