/**
 * The vertical-slice entities — the one monster, spell, and class the M2 slice
 * needs (Brief 01 §7: "start with conditions + the SRD monster + spell + class
 * you need for the slice").
 *
 * These three are the canonical fixtures (Goblin Warrior, Fireball, Fighter),
 * which are byte-compared by the contracts tests. We re-export them THROUGH the
 * contracts schema so the engine dataset and the fixtures can never diverge:
 * the fixture JSON is the single source of truth (CLAUDE.md non-negotiable #8),
 * and this module just validates + surfaces it.
 *
 * Full monster / spell / class *parsers* over the PDF are M1.2 (the complete
 * dataset). M1.1 needs these three present and verified, not re-derived.
 */
import { RulesEntitySchema, type RulesEntity } from '@questra/contracts';
import goblin from '@questra/contracts/src/fixtures/goblin-warrior.json' with { type: 'json' };
import fireball from '@questra/contracts/src/fixtures/fireball.json' with { type: 'json' };
import fighter from '@questra/contracts/src/fixtures/fighter.json' with { type: 'json' };

/** The slice monster — Goblin Warrior (SRD 5.2.1). */
export const GOBLIN_WARRIOR: RulesEntity = RulesEntitySchema.parse(goblin);

/** The slice spell — Fireball (SRD 5.2.1). */
export const FIREBALL: RulesEntity = RulesEntitySchema.parse(fireball);

/**
 * The slice class — Fighter (SRD 5.2.1). The fighter fixture nests the class
 * under `.class` alongside its feature entities; the class entity is what the
 * dataset carries.
 */
export const FIGHTER: RulesEntity = RulesEntitySchema.parse(
  (fighter as { class: unknown }).class,
);

/** The three slice entities, verified. */
export const SLICE_ENTITIES: RulesEntity[] = [GOBLIN_WARRIOR, FIREBALL, FIGHTER];
