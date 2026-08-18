/**
 * sheetToPlayerHub — the seam between @questra/contracts (ComputedSheet) +
 * @questra/engine (projection Combatant, legality) and the Player Hub primitives
 * (Brief 10 §2). This is where "every number renders from a Derived value or
 * projection state" (§1) becomes literal: each view-model field carries its
 * source so tap-"?" can open the InfoPanel derivation — no orphan math.
 *
 * Zero component-local game state (§1): the hub reads these view-models, built
 * purely from the sync snapshot (sheet + folded projection). UI state (open tabs)
 * lives in the components; game state never does.
 */
import type { ComputedSheet, Intent, Skill } from '@questra/contracts';
import { greyingReason, type Combatant, type ProjectionState } from '@questra/engine';
import type { DerivationLine } from './entityToInfoPanel.js';

/** A number plus the derivation the "?" reveals (mirrors InfoPanelData's shape). */
export interface HubValue {
  value: number;
  label: string;
  derivation: DerivationLine[];
}

export interface VitalsVM {
  hp: { current: number; max: number; temp: number };
  ac: HubValue;
  conditions: { id: string; name: string }[];
  bloodied: boolean;
}

/** One action tile in the ActionBar, with its greying reason (== server reject). */
export interface ActionTileVM {
  id: string;
  name: string;
  /** economy row this tile belongs to. */
  economy: 'action' | 'bonus' | 'reaction';
  toHit?: number;
  damage?: string;
  damageType?: string;
  /** resource tag ("2 of 2", "1 slot") shown on the tile, if any. */
  resourceTag?: string;
  /** null ⇒ legal (not greyed); a string ⇒ greyed, and this is the tooltip. */
  greyReason: string | null;
}

const asDerivation = (mods: { label: string; value: number }[]): DerivationLine[] =>
  mods.map((m) => ({ label: m.label, value: String(m.value) }));

const CONDITION_NAME: Record<string, string> = {
  'condition.prone': 'Prone', 'condition.blinded': 'Blinded', 'condition.charmed': 'Charmed',
  'condition.deafened': 'Deafened', 'condition.exhaustion': 'Exhaustion', 'condition.frightened': 'Frightened',
  'condition.grappled': 'Grappled', 'condition.incapacitated': 'Incapacitated', 'condition.invisible': 'Invisible',
  'condition.paralyzed': 'Paralyzed', 'condition.petrified': 'Petrified', 'condition.poisoned': 'Poisoned',
  'condition.restrained': 'Restrained', 'condition.stunned': 'Stunned', 'condition.unconscious': 'Unconscious',
};

/** Vitals from the projection combatant + the sheet's AC derivation. */
export function toVitals(sheet: ComputedSheet, me: Combatant): VitalsVM {
  const acD = sheet.acOptions[sheet.acDefault]!;
  return {
    hp: { current: me.hp, max: me.maxHp, temp: me.tempHp },
    ac: { value: acD.value, label: 'Armor Class', derivation: asDerivation(acD.derivation) },
    conditions: me.conditions.map((c) => ({ id: c.conditionId, name: CONDITION_NAME[c.conditionId] ?? c.conditionId })),
    bloodied: me.hp > 0 && me.hp <= Math.floor(me.maxHp / 2),
  };
}

/**
 * The action tiles from the sheet's attacks + resource-bearing features, each run
 * through the SHARED legality function so the tile's grey state + tooltip == the
 * server's reject string (§1, §5 #3). `state` is the folded projection; `opts`
 * carries per-tile geometry/resource the caller computed.
 */
export function toActionTiles(
  sheet: ComputedSheet,
  me: Combatant,
  state: ProjectionState,
  targetId: string | undefined,
  opts: { activeTurnEnforced?: boolean; targetInRange?: (attackName: string) => boolean } = {},
): ActionTileVM[] {
  const tiles: ActionTileVM[] = [];

  for (const atk of sheet.attacks) {
    const intent: Intent = { kind: 'attack', attackerId: me.id, targetId: targetId ?? '', actionName: atk.name };
    const inRange = opts.targetInRange?.(atk.name);
    tiles.push({
      id: `attack.${atk.name}`,
      name: atk.name,
      economy: 'action',
      toHit: atk.toHit,
      damage: atk.damage,
      damageType: atk.damageType,
      greyReason: greyingReason(intent, state, {
        ...(opts.activeTurnEnforced !== undefined ? { activeTurnEnforced: opts.activeTurnEnforced } : {}),
        ...(inRange !== undefined ? { targetInRange: inRange } : {}),
      }),
    });
  }

  for (const feat of sheet.features) {
    if (!feat.resource) continue;
    const intent: Intent = { kind: 'use_feature', creatureId: me.id, featureId: feat.id };
    tiles.push({
      id: `feature.${feat.id}`,
      name: feat.name,
      economy: 'bonus',
      resourceTag: `${feat.resource.remaining} of ${feat.resource.max}`,
      greyReason: greyingReason(intent, state, {
        resourceRemaining: feat.resource.remaining,
        ...(opts.activeTurnEnforced !== undefined ? { activeTurnEnforced: opts.activeTurnEnforced } : {}),
      }),
    });
  }

  return tiles;
}

/** A death-save track view-model from the dying counters (Brief 04 dying ladder). */
export interface DeathSaveVM {
  successes: number;
  failures: number;
  phase: 'dying' | 'stable' | 'dead' | 'up';
}

// ---- StatBar + Player Menu (Brief 10 §2: the "STATS" box, and the hub's overlay) --------

export type AbilityKey = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
const ABILITY_ORDER: AbilityKey[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
export const ABILITY_LABEL: Record<AbilityKey, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution', int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

/** 5e's score→modifier curve — pure display math, not a ruling (nothing here decides anything). */
export const abilityMod = (score: number): number => Math.floor((score - 10) / 2);
/** "+3" / "-1" / "+0" — mono numbers always carry their sign so a glance can't misread a penalty as a bonus. */
export const fmtMod = (n: number): string => (n >= 0 ? `+${n}` : `${n}`);

export interface AbilityStatVM {
  ability: AbilityKey;
  score: number;
  mod: number;
  derivation: DerivationLine[];
}

export interface StatBarVM {
  ac: HubValue;
  speed: HubValue;
  abilities: AbilityStatVM[];
  /** the exploration-glance number — no roll, just a threshold (Brief 10 §2 density pass). */
  passivePerception: HubValue;
}

/** AC + Speed + all six abilities + passive Perception, each carrying the derivation its "?" reveals. */
export function toStats(sheet: ComputedSheet): StatBarVM {
  const acD = sheet.acOptions[sheet.acDefault]!;
  return {
    ac: { value: acD.value, label: 'Armor Class', derivation: asDerivation(acD.derivation) },
    speed: { value: sheet.speedFt.value, label: 'Speed', derivation: asDerivation(sheet.speedFt.derivation) },
    abilities: ABILITY_ORDER.map((a) => {
      const d = sheet.abilities[a];
      return { ability: a, score: d.value, mod: abilityMod(d.value), derivation: asDerivation(d.derivation) };
    }),
    passivePerception: {
      value: sheet.passives.perception.value,
      label: 'Passive Perception',
      derivation: asDerivation(sheet.passives.perception.derivation),
    },
  };
}

export interface SaveStatVM {
  ability: AbilityKey;
  mod: number;
  derivation: DerivationLine[];
}

/** The six saving throws — the Player Menu's Stats tab, beside the ability grid. */
export function toSaves(sheet: ComputedSheet): SaveStatVM[] {
  return ABILITY_ORDER.map((a) => {
    const d = sheet.saves[a];
    return { ability: a, mod: d.value, derivation: asDerivation(d.derivation) };
  });
}

export interface PassivesVM {
  perception: HubValue;
  investigation: HubValue;
  insight: HubValue;
}

/** The three passive scores every table leans on for "do they notice?" — no roll, just a threshold. */
export function toPassives(sheet: ComputedSheet): PassivesVM {
  const wrap = (label: string, d: ComputedSheet['passives']['perception']): HubValue => ({
    value: d.value, label, derivation: asDerivation(d.derivation),
  });
  return {
    perception: wrap('Passive Perception', sheet.passives.perception),
    investigation: wrap('Passive Investigation', sheet.passives.investigation),
    insight: wrap('Passive Insight', sheet.passives.insight),
  };
}

const SKILL_LABEL: Record<Skill, string> = {
  acrobatics: 'Acrobatics', animal_handling: 'Animal Handling', arcana: 'Arcana', athletics: 'Athletics',
  deception: 'Deception', history: 'History', insight: 'Insight', intimidation: 'Intimidation',
  investigation: 'Investigation', medicine: 'Medicine', nature: 'Nature', perception: 'Perception',
  performance: 'Performance', persuasion: 'Persuasion', religion: 'Religion', sleight_of_hand: 'Sleight of Hand',
  stealth: 'Stealth', survival: 'Survival',
};

export interface SkillLineVM {
  skill: Skill;
  label: string;
  mod: number;
  derivation: DerivationLine[];
}

/** Only the skills the sheet actually carries a bonus for (proficient/expertise) — no invented rows for the rest. */
export function toSkills(sheet: ComputedSheet): SkillLineVM[] {
  return (Object.entries(sheet.skills) as [Skill, ComputedSheet['skills'][Skill]][])
    .filter((entry): entry is [Skill, NonNullable<ComputedSheet['skills'][Skill]>] => entry[1] !== undefined)
    .map(([skill, d]) => ({ skill, label: SKILL_LABEL[skill], mod: d.value, derivation: asDerivation(d.derivation) }));
}

/** "12 gp, 4 sp" — only the denominations the character actually carries, largest first. */
export function fmtCoins(coins: ComputedSheet['coins']): string {
  const order: { key: keyof ComputedSheet['coins']; label: string }[] = [
    { key: 'pp', label: 'pp' }, { key: 'gp', label: 'gp' }, { key: 'ep', label: 'ep' },
    { key: 'sp', label: 'sp' }, { key: 'cp', label: 'cp' },
  ];
  const parts = order.filter((o) => coins[o.key] > 0).map((o) => `${coins[o.key]} ${o.label}`);
  return parts.length > 0 ? parts.join(', ') : 'No coin';
}

export interface ReadinessVM {
  initiative: HubValue;
  /** Hit Dice are a reference fact (die + how many at full level), not a live remaining-count —
   *  no event in the sync protocol tracks hit dice spent yet, so this never claims to. */
  hitDice: { die: string; max: number };
  coins: string;
}

/** The hub card's "combat readiness" row — Initiative, Hit Dice, and carried coin, all already on the sheet. */
export function toReadiness(sheet: ComputedSheet): ReadinessVM {
  return {
    initiative: { value: sheet.initiative.value, label: 'Initiative', derivation: asDerivation(sheet.initiative.derivation) },
    hitDice: { die: sheet.hp.value.hitDie, max: sheet.hp.value.hitDiceMax },
    coins: fmtCoins(sheet.coins),
  };
}
