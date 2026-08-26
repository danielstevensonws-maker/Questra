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
export * from './ingest/classes.js';
export * from './ingest/namedEntities.js';
export * from './ingest/items.js';
export * from './ingest/tables.js';
export * from './ingest/pipeline.js';
export * from './data/conditions.js';
export * from './data/slice.js';
export * from './data/spells.js';
export * from './data/monsters.js';
export * from './data/classes.js';
export * from './data/named.js';
export * from './data/origins.js';
export * from './data/items.js';
export * from './data/tables.js';
export * from './data/loader.js';
export * from './sim/state.js';
export * from './sim/projection.js';
export * from './sim/encounter.js';
export * from './sim/pipeline.js';
export * from './sim/cascade.js';
export * from './sim/sheet.js';
export * from './sim/combatant-from-character.js';
export * from './sim/starter-room.js';
export * from './sim/placement.js';
export * from './sim/room-replay.js';
export * from './sim/reach.js';
export * from './sim/narration.js';
export * from './sim/duration.js';
export * from './sim/dying.js';
export * from './sim/rest.js';
export * from './sim/advancement.js';
export * from './sim/shop.js';
export * from './sim/prompts.js';
export * from './sim/legality.js';

import { CONDITIONS } from './data/conditions.js';
import { GOBLIN_WARRIOR, FIREBALL } from './data/slice.js';
import { CLASSES } from './data/classes.js';
import { ORIGINS } from './data/origins.js';
import { draftSpells } from './data/spells.js';
import { MONSTERS } from './data/monsters.js';
import { draftNamed } from './data/named.js';
import { ITEMS } from './data/items.js';
import type { RulesEntity } from '@questra/contracts';

/**
 * Everything safe to put in front of a real table.
 *
 * IT USED TO BE TWENTY-NINE ENTRIES — fifteen conditions, twelve classes, one
 * goblin and one fireball — because the whole ingested corpus sat at
 * `qa: 'draft'` and the loader refuses drafts outside dev (Brief 01 §7). The
 * compendium browser reads THIS list, and so does the DM's "bring something in":
 * a DM searching for a monster was offered a single goblin, with the entire SRD
 * bestiary present in the repo and unreachable.
 *
 * The monsters and items now arrive promoted — each one checked back against
 * the numbers printed in its own `srd_text` (`ingest/verify.ts`), never
 * rubber-stamped. Whatever could not be proven is still draft and still refused,
 * which is why this is a filter rather than a concatenation.
 *
 * SPELLS AND ORIGINS-AS-INGESTED ARE DELIBERATELY ABSENT. The 338 draft spells
 * carry `effects: []` with `resolution: 'routine'` — a claim that the engine
 * resolves mechanics nobody has encoded — and putting unreviewed rules in front
 * of players who cannot tell the app is wrong is the one failure this project
 * says is worse than a crash. They need the rules-lawyer pass the conditions
 * got. (The species and backgrounds ARE here, via `ORIGINS`, because they were
 * authored and signed off in `data/origins.ts`.)
 */
export const VERIFIED_DATASET: RulesEntity[] = [
  ...CONDITIONS,
  GOBLIN_WARRIOR,
  FIREBALL,
  ...CLASSES,
  ...ORIGINS,
  ...MONSTERS.filter((m) => m.qa === 'verified'),
  ...ITEMS.filter((i) => i.qa === 'verified'),
];

/**
 * Everything, verified or not — what dev and the ingestion tooling read.
 *
 * Deduplicated by id, because the verified list now CONTAINS most of the
 * monsters and items rather than sitting beside them, and a compendium that
 * offered two of every goblin would be its own bug.
 */
export function fullDataset(): RulesEntity[] {
  const byId = new Map<string, RulesEntity>();
  for (const e of [...VERIFIED_DATASET, ...draftSpells(), ...MONSTERS, ...draftNamed(), ...ITEMS]) {
    if (!byId.has(e.id)) byId.set(e.id, e);
  }
  return [...byId.values()];
}
