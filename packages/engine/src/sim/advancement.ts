/**
 * Advancement — Brief 07 §2/§3. Two modes (milestone default, XP toggle), and
 * the level-up flow that re-runs the wizard for one level. Pure and AI-free
 * (ADR-0005). Mode is a campaign setting; switching mid-campaign keeps current
 * levels and only changes what triggers the offer (§2).
 *
 * The level-up flow's cardinal rule (§3 step 4): the new sheet is COMPUTED by
 * re-running `computeSheet` over the bumped choices — it is never hand-patched.
 * This module produces the `character_level_up` choices delta and the
 * before/after diff; the caller commits the event and the projection recomputes.
 */
import type { CharacterChoices, ComputedSheet, PlayEvent, RulesEntity } from '@questra/contracts';
import { computeSheet, type SheetRulesData } from './sheet.js';

type Body = PlayEvent['body'];

// ---- XP mode (§2) ---------------------------------------------------------

/** SRD 5.2.1 XP thresholds to reach each level (levels 1–20). Index = level. */
export const XP_THRESHOLDS: readonly number[] = [
  0, 0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
];

/** The highest level whose threshold `xp` has reached. */
export function levelForXp(xp: number): number {
  let level = 1;
  for (let l = 2; l <= 20; l++) if (xp >= (XP_THRESHOLDS[l] ?? Infinity)) level = l;
  return level;
}

/** Split a defeated-monster XP award evenly across the party, rounding DOWN
 *  (§2 / acceptance #4). Returns the per-character amount + the event body. */
export function awardDefeatXp(characterIds: string[], totalXp: number): { perCharacter: number; event: Body } {
  const perCharacter = Math.floor(totalXp / Math.max(1, characterIds.length));
  return {
    perCharacter,
    event: { t: 'xp_awarded', characterIds: characterIds as [string, ...string[]], perCharacter, source: 'defeat' },
  };
}

/** Sum a monster's meta.xp for a defeated set (defeated-monster XP, §2). */
export function defeatXpTotal(defeated: readonly RulesEntity[]): number {
  let total = 0;
  for (const m of defeated) {
    if (m.entityType === 'monster') {
      const xp = (m.meta as { xp?: number }).xp;
      if (typeof xp === 'number') total += xp;
    }
  }
  return total;
}

/** After an award, does a character crossing a threshold now qualify for a level
 *  offer? Returns the level they can advance TO, or null. */
export function levelOfferAfterXp(currentLevel: number, newXp: number): number | null {
  const eligible = levelForXp(newXp);
  return eligible > currentLevel ? currentLevel + 1 : null;
}

// ---- the level-up flow (§3) ----------------------------------------------

/** HP method for the new level: roll it, or take the fixed average. */
export type HpChoice = { method: 'average' } | { method: 'rolled'; roll: number };

/** SRD average HP for a hit die (`ceil(die/2)+1`), §3 step 1. */
export function averageHp(hitDieFaces: number): number {
  return Math.ceil(hitDieFaces / 2) + 1;
}

/** The HP gained at a level: (average or roll) + CON mod, minimum 1. */
export function hpGainedForLevel(hitDieFaces: number, conMod: number, hp: HpChoice): number {
  const base = hp.method === 'average' ? averageHp(hitDieFaces) : hp.roll;
  return Math.max(1, base + conMod);
}

/** The choices a level-up records, folded into `character_level_up.choices`. */
export interface LevelUpChoices {
  hp: HpChoice;
  /** feature-choice slots resolved this level (subclass pick, ASI/feat), by slot id. */
  featureChoices?: Record<string, unknown>;
  /** spells learned/prepared this level (caster). */
  spells?: string[];
}

/** A single Derived-value change in the before/after diff. */
export interface SheetDiffLine {
  path: string;
  before: unknown;
  after: unknown;
}

/**
 * Run the level-up: bump the character's level (and record HP + choices), recompute
 * the sheet via `computeSheet` (never hand-patched, §3 step 4), and produce the
 * before/after diff + the `character_level_up` event body. The caller commits it.
 */
export function levelUp(
  choices: CharacterChoices,
  toLevel: number,
  levelChoices: LevelUpChoices,
  rules: SheetRulesData,
): { before: ComputedSheet; after: ComputedSheet; diff: SheetDiffLine[]; event: Body } {
  const before = computeSheet(choices, rules);
  const nextChoices: CharacterChoices = { ...choices, level: toLevel };
  const after = computeSheet(nextChoices, rules);
  const diff = diffSheets(before, after);
  return {
    before,
    after,
    diff,
    event: {
      t: 'character_level_up',
      characterId: choices.classId, // caller overrides with the real character id
      toLevel,
      choices: { hp: levelChoices.hp, ...(levelChoices.featureChoices ? { featureChoices: levelChoices.featureChoices } : {}), ...(levelChoices.spells ? { spells: levelChoices.spells } : {}) },
    },
  };
}

/** Which new features a level grants (from `class.meta.levels[toLevel].features`),
 *  so the flow renders each in the info panel (§3 step 2). */
export function newFeaturesAtLevel(classEntity: RulesEntity, toLevel: number): string[] {
  if (classEntity.entityType !== 'class') return [];
  const row = (classEntity.meta.levels as Record<string, { features: string[] }>)[String(toLevel)];
  return row?.features ?? [];
}

// ---- the before/after diff (§3 step 4) ------------------------------------

/** Flatten a computed sheet to `path → value` for a stable diff (only the
 *  value of each Derived, not its derivation prose). */
function flatten(sheet: ComputedSheet): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const derived = (v: unknown): unknown => (v && typeof v === 'object' && 'value' in (v as object) ? (v as { value: unknown }).value : v);
  out['profBonus'] = derived(sheet.profBonus);
  out['hp.max'] = (sheet.hp.value as { max: number }).max;
  out['hp.hitDiceMax'] = (sheet.hp.value as { hitDiceMax: number }).hitDiceMax;
  out['initiative'] = derived(sheet.initiative);
  for (const [ab, d] of Object.entries(sheet.abilities)) out[`abilities.${ab}`] = derived(d);
  for (const [ab, d] of Object.entries(sheet.saves)) out[`saves.${ab}`] = derived(d);
  for (const [sk, d] of Object.entries(sheet.skills)) out[`skills.${sk}`] = derived(d);
  out['features'] = sheet.features.map((f) => f.id).sort();
  out['attacks'] = sheet.attacks.map((a) => a.name).sort();
  if (sheet.spellcasting) out['spellSlots'] = sheet.spellcasting.slots;
  return out;
}

/** Compute the ordered before/after diff between two computed sheets. */
export function diffSheets(before: ComputedSheet, after: ComputedSheet): SheetDiffLine[] {
  const fb = flatten(before);
  const fa = flatten(after);
  const lines: SheetDiffLine[] = [];
  for (const key of Object.keys(fa)) {
    const b = fb[key];
    const a = fa[key];
    if (JSON.stringify(b) !== JSON.stringify(a)) lines.push({ path: key, before: b, after: a });
  }
  return lines;
}
