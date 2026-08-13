/**
 * Character-sheet computation — Brief 03. The pure function from wizard choices +
 * rules data → ComputedSheet, every value carrying its derivation (info-layer 2).
 * Pure and deterministic (§4 #2): same choices + same rules-data version ⇒
 * identical sheet. Imports nothing AI (ADR-0005).
 *
 * The computation reads the rules dataset for class traits (saves, hit die,
 * caster type, level features) and item meta (AC, weapon damage). Illegal choices
 * are rejected with plain-language reasons (§4 #3).
 */
import {
  ABILITIES,
  type Ability,
  type Skill,
  type NamedModifier,
  type RulesEntity,
  type CharacterChoices,
  type ComputedSheet,
  type AttackCard,
  type FeatureCard,
} from '@questra/contracts';
import { abilityMod } from './state.js';

/** Standard proficiency bonus by character level (SRD advancement table). */
function profBonusForLevel(level: number): number {
  return 2 + Math.floor((level - 1) / 4);
}

/** Spell-slot progression by caster type + level. Full caster (Wizard/etc.) table, SRD. */
const FULL_CASTER_SLOTS: Record<number, Record<string, number>> = {
  1: { '1': 2 }, 2: { '1': 3 }, 3: { '1': 4, '2': 2 }, 4: { '1': 4, '2': 3 },
  5: { '1': 4, '2': 3, '3': 2 },
  // (higher levels omitted for the slice; extend when a brief needs them)
};

export interface SheetRulesData {
  classesById: Map<string, RulesEntity>;
  itemsById: Map<string, RulesEntity>;
  speciesSpeedFt: number;
}

export function buildSheetRulesData(entities: readonly RulesEntity[], speciesSpeedFt = 30): SheetRulesData {
  const classesById = new Map<string, RulesEntity>();
  const itemsById = new Map<string, RulesEntity>();
  for (const e of entities) {
    if (e.entityType === 'class') classesById.set(e.id, e);
    if (e.entityType === 'item') itemsById.set(e.id, e);
  }
  return { classesById, itemsById, speciesSpeedFt };
}

/** A choice-validation failure, in plain language (Brief 03 §4 #3). */
export class IllegalChoiceError extends Error {}

const d = <T>(value: T, derivation: NamedModifier[]) => ({ value, derivation });

/** SRD point-buy cost table (score → points); 27-point budget. */
const POINT_BUY_COST: Record<number, number> = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };

function validateChoices(choices: CharacterChoices): void {
  // point-buy budget (§4 #3)
  if (choices.abilityMethod === 'point_buy') {
    let spent = 0;
    for (const ab of ABILITIES) {
      const score = choices.baseScores[ab];
      const cost = POINT_BUY_COST[score];
      if (cost === undefined) throw new IllegalChoiceError(`Point buy can't reach ${score} in ${ab.toUpperCase()} — scores must be 8–15 before bonuses.`);
      spent += cost;
    }
    if (spent > 27) throw new IllegalChoiceError(`That's ${spent} points of ability scores, but you only have 27 to spend.`);
  }
  // background bonuses must sum to 3 (+2/+1 or +1/+1/+1)
  const bonusSum = Object.values(choices.backgroundBonuses).reduce((s, v) => s + (v ?? 0), 0);
  if (bonusSum !== 3) throw new IllegalChoiceError(`Background ability bonuses must add up to 3, not ${bonusSum}.`);
}

/** Compute the full sheet. Throws IllegalChoiceError (plain-language) on illegal input. */
export function computeSheet(choices: CharacterChoices, rules: SheetRulesData): ComputedSheet {
  validateChoices(choices);

  const klass = rules.classesById.get(choices.classId);
  if (!klass || klass.entityType !== 'class') throw new IllegalChoiceError(`Unknown class "${choices.classId}".`);
  const meta = klass.meta;
  const prof = profBonusForLevel(choices.level);

  // ---- abilities: base + background ----
  const abilities = {} as ComputedSheet['abilities'];
  const scores = {} as Record<Ability, number>;
  for (const ab of ABILITIES) {
    const base = choices.baseScores[ab];
    const bonus = choices.backgroundBonuses[ab] ?? 0;
    const score = base + bonus;
    scores[ab] = score;
    const derivation: NamedModifier[] = [{ label: 'Base', value: base }];
    if (bonus !== 0) derivation.push({ label: 'Background', value: bonus });
    abilities[ab] = d(score, derivation);
  }
  const mod = (ab: Ability) => abilityMod(scores[ab]);

  // ---- proficiency bonus ----
  const profBonus = d(prof, [{ label: `Level ${choices.level}`, value: prof }]);

  // ---- HP ----
  const dieSize = Number(meta.hitDie.slice(1));
  const conMod = mod('con');
  const hpDerivation: NamedModifier[] = [{ label: 'Hit die (max at level 1)', value: dieSize }, { label: 'CON', value: conMod }];
  let maxHp = dieSize + conMod;
  if (choices.level > 1) {
    const avg = Math.ceil(dieSize / 2) + 1; // fixed-average per later level
    const perLevel = avg + conMod;
    maxHp += perLevel * (choices.level - 1);
    hpDerivation.push({ label: `Levels 2-${choices.level} (average ${avg} + CON each)`, value: perLevel * (choices.level - 1) });
  }
  const hp = d({ max: maxHp, hitDie: meta.hitDie, hitDiceMax: choices.level }, hpDerivation);

  // ---- AC options from equipment ----
  const acOptions: ComputedSheet['acOptions'][number][] = [];
  const dexMod = mod('dex');
  // unarmored 10 + DEX
  acOptions.push(d(10 + dexMod, [{ label: 'Unarmored', value: 10 }, { label: 'DEX', value: dexMod }]));
  // armor from equipment item meta (loose meta: read ac if present)
  const hasShield = choices.equipment.some((id) => /shield/i.test(id));
  for (const id of choices.equipment) {
    const item = rules.itemsById.get(id);
    if (!item) continue;
    const ac = parseArmorAc(item);
    if (ac !== undefined) {
      const label = item.name;
      acOptions.push(d(ac.base + (ac.dexUp ? Math.min(dexMod, ac.dexCap ?? Infinity) : 0),
        ac.dexUp
          ? [{ label, value: ac.base }, { label: 'DEX', value: Math.min(dexMod, ac.dexCap ?? Infinity) }]
          : [{ label, value: ac.base }]));
      if (hasShield) {
        const armorVal = acOptions[acOptions.length - 1]!;
        acOptions.push(d(armorVal.value + 2, [...armorVal.derivation, { label: 'Shield', value: 2 }]));
      }
    }
  }
  // default = best legal AC
  let acDefault = 0;
  for (let i = 1; i < acOptions.length; i++) if (acOptions[i]!.value > acOptions[acDefault]!.value) acDefault = i;

  // ---- initiative ----
  const initiative = d(dexMod, [{ label: 'DEX', value: dexMod }]);

  // ---- saves ----
  const saves = {} as ComputedSheet['saves'];
  const classSaves = new Set<Ability>(meta.saves);
  for (const ab of ABILITIES) {
    const m = mod(ab);
    const derivation: NamedModifier[] = [{ label: ab.toUpperCase(), value: m }];
    let value = m;
    if (classSaves.has(ab)) { derivation.push({ label: 'Proficiency', value: prof }); value += prof; }
    saves[ab] = d(value, derivation);
  }

  // ---- skills (chosen proficiencies) ----
  const skills = {} as ComputedSheet['skills'];
  const skillAbility: Partial<Record<Skill, Ability>> = {
    athletics: 'str', acrobatics: 'dex', sleight_of_hand: 'dex', stealth: 'dex',
    arcana: 'int', history: 'int', investigation: 'int', nature: 'int', religion: 'int',
    animal_handling: 'wis', insight: 'wis', medicine: 'wis', perception: 'wis', survival: 'wis',
    deception: 'cha', intimidation: 'cha', performance: 'cha', persuasion: 'cha',
  };
  for (const sk of choices.skillChoices) {
    const ab = skillAbility[sk] ?? 'int';
    const m = mod(ab);
    skills[sk] = d(m + prof, [{ label: ab.toUpperCase(), value: m }, { label: 'Proficiency', value: prof }]);
  }

  // ---- passives (perception/investigation/insight): 10 + mod (+ prof if proficient) ----
  const passiveFor = (sk: Skill, ab: Ability) => {
    const m = mod(ab);
    const proficient = choices.skillChoices.includes(sk);
    const derivation: NamedModifier[] = [{ label: 'Base', value: 10 }, { label: ab.toUpperCase(), value: m }];
    let value = 10 + m;
    if (proficient) { derivation.push({ label: 'Proficiency', value: prof }); value += prof; }
    return d(value, derivation);
  };
  const passives = {
    perception: passiveFor('perception', 'wis'),
    investigation: passiveFor('investigation', 'int'),
    insight: passiveFor('insight', 'wis'),
  };

  // ---- speed ----
  const speedFt = d(rules.speciesSpeedFt, [{ label: 'Species', value: rules.speciesSpeedFt }]);

  // ---- attacks from weapon equipment ----
  const attacks: AttackCard[] = [];
  for (const id of choices.equipment) {
    const item = rules.itemsById.get(id);
    if (!item) continue;
    const weapon = parseWeaponMeta(item);
    if (!weapon) continue;
    // finesse: pick the better of STR/DEX
    const useAbility: Ability = weapon.finesse && dexMod > mod('str') ? 'dex' : weapon.melee ? 'str' : 'dex';
    const abMod = mod(useAbility);
    attacks.push({
      name: item.name,
      toHit: abMod + prof,
      toHitDerivation: [{ label: useAbility.toUpperCase(), value: abMod }, { label: 'Proficiency', value: prof }],
      damage: `${weapon.die} + ${abMod}`,
      damageType: weapon.damageType,
      ability: useAbility,
      tags: ['action', weapon.melee ? 'melee' : 'ranged', ...(weapon.finesse ? ['finesse'] : [])],
    });
  }

  // ---- features from the class level table (resource pools from setResources) ----
  const features: FeatureCard[] = [];
  const levelRow = meta.levels[String(choices.level)];
  if (levelRow) {
    for (const fid of levelRow.features) {
      if (fid.startsWith('choice.')) continue;
      const name = featureName(fid);
      const res = resourceFor(fid, meta.levels, choices.level);
      features.push(res ? { id: fid, name, resource: res } : { id: fid, name });
    }
  }

  // ---- spellcasting ----
  let spellcasting: ComputedSheet['spellcasting'];
  if (meta.casterType === 'full') {
    const castAbility: Ability = meta.primaryAbility === 'str_or_dex' ? 'int' : (meta.primaryAbility as Ability);
    const am = mod(castAbility);
    spellcasting = {
      ability: castAbility,
      saveDc: d(8 + prof + am, [{ label: 'Base', value: 8 }, { label: 'Proficiency', value: prof }, { label: castAbility.toUpperCase(), value: am }]),
      attackBonus: d(prof + am, [{ label: 'Proficiency', value: prof }, { label: castAbility.toUpperCase(), value: am }]),
      slots: FULL_CASTER_SLOTS[choices.level] ?? {},
      prepared: [],
    };
  }

  // ---- coins ----
  const coins = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };

  const sheet: ComputedSheet = {
    abilities, profBonus, hp,
    acOptions: acOptions as ComputedSheet['acOptions'],
    acDefault, initiative, saves, skills, passives, speedFt, attacks, features,
    ...(spellcasting ? { spellcasting } : {}),
    coins,
  };
  return sheet;
}

// ---- helpers -------------------------------------------------------------

/** Read an armor's AC from its item row: base value + whether/how DEX applies. */
interface ArmorAc { base: number; dexUp: boolean; dexCap?: number }
function parseArmorAc(item: RulesEntity): ArmorAc | undefined {
  if ((item.meta as { category?: string }).category !== 'armor') return undefined;
  const text = item.srd_text;
  // "<Name> <base>[ + Dex modifier[ (max N)]] ..."
  const m = text.match(/(\d{2})(\s*\+\s*Dex modifier(\s*\(max\s*(\d+)\))?)?/);
  if (!m) return undefined;
  const base = Number(m[1]);
  const dexUp = m[2] !== undefined;
  const cap = m[4] !== undefined ? Number(m[4]) : undefined;
  return { base, dexUp, ...(cap !== undefined ? { dexCap: cap } : {}) };
}

interface WeaponMeta { die: string; damageType: string; melee: boolean; finesse: boolean }
function parseWeaponMeta(item: RulesEntity): WeaponMeta | null {
  const category = (item.meta as { category?: string }).category;
  if (category !== 'weapon') return null;
  // weapon damage/finesse aren't structured in the loose item meta yet; derive from srd_text.
  const text = item.srd_text;
  const dm = text.match(/(\dd\d+)\s+(Bludgeoning|Piercing|Slashing)/i);
  if (!dm) return null;
  return {
    die: dm[1]!.toLowerCase(),
    damageType: dm[2]!.toLowerCase(),
    melee: !/Ranged|Ammunition/i.test(text),
    finesse: /Finesse/i.test(text),
  };
}

function featureName(id: string): string {
  const slug = id.split('.').pop() ?? id;
  return slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/** Read a resource pool for a feature from the class's setResources, if any. */
function resourceFor(
  featureId: string,
  levels: Record<string, { setResources?: Record<string, number> | undefined }>,
  level: number,
): { pool: string; max: number; remaining: number } | undefined {
  // map a couple of known pools (Second Wind) for the slice; general mapping is a follow-up.
  if (featureId === 'feature.fighter.second-wind') {
    // level-1 default max is 2 (raised to 3 at level 4 via setResources)
    let max = 2;
    for (let l = 1; l <= level; l++) {
      const sr = levels[String(l)]?.setResources;
      if (sr && typeof sr['second_wind.max'] === 'number') max = sr['second_wind.max']!;
    }
    return { pool: 'feature.second_wind', max, remaining: max };
  }
  return undefined;
}
