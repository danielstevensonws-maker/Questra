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
import type { ComputedSheet, Intent } from '@questra/contracts';
import { greyingReason, type Combatant, type ProjectionState } from '@questra/engine';
import type { DerivationLine } from './InfoPanel.js';

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
  mods.map((m) => ({ label: m.label, value: m.value }));

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
