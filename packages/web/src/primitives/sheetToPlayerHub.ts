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
import type { ComputedSheet, Intent, NamedModifier, RollKind } from '@questra/contracts';
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

// ---- compose / roll (Brief 10 §2 ComposeRollSheet) -----------------------

/**
 * What the player is composing before they commit. Advantage here is the
 * player's *stated* position — the server re-derives the real collapse from
 * effects (`collapseAdvantage`, Brief 02 step 4) and its answer wins. This is a
 * request, never a result.
 */
export interface ComposeDraftVM {
  tileId: string;
  /** the player's asserted position; server-side effects can still override. */
  position: 'advantage' | 'disadvantage' | 'straight';
  /** situational modifier the player dialed in (the DM-sanctioned ad-hoc ±). */
  situational: number;
}

/** The static parts of the roll the player is about to make. */
export interface ComposeSubjectVM {
  tileId: string;
  name: string;
  kind: RollKind;
  /** the fixed, sheet-derived modifiers ("DEX +3", "Proficiency +2"). */
  modifiers: NamedModifier[];
  /** what the roll is measured against, when the player is allowed to know it. */
  vs?: { type: 'ac' | 'dc'; value: number };
  /** plain-English target phrase for the headline ("the goblin"). */
  targetName?: string;
}

/**
 * The live formula string the compose sheet shows *before* committing — "2d20
 * keep highest + 3 DEX + 2 Proficiency". It is a PREVIEW of the request, so it
 * never shows a total: the total only exists once the server has rolled.
 */
export function composeFormula(subject: ComposeSubjectVM, draft: ComposeDraftVM): string {
  const die =
    draft.position === 'advantage' ? '2d20 keep highest'
    : draft.position === 'disadvantage' ? '2d20 keep lowest'
    : 'd20';
  const parts = subject.modifiers.map((m) => `${m.value >= 0 ? '+' : '−'} ${Math.abs(m.value)} ${m.label}`);
  if (draft.situational !== 0) {
    parts.push(`${draft.situational > 0 ? '+' : '−'} ${Math.abs(draft.situational)} situational`);
  }
  return [die, ...parts].join(' ');
}

/**
 * The settled roll the sheet animates TO. Built from a `roll_made` event body —
 * the server's answer (ADR-0008). The client never invents any field here; the
 * animation is a reveal of values that already exist.
 */
export interface RollResultVM {
  rollId: string;
  kind: RollKind;
  d20: number;
  /** present when the server rolled two dice; the one NOT used is the dropped die. */
  secondD20?: number | undefined;
  collapsed: 'advantage' | 'disadvantage' | 'straight';
  modifiers: NamedModifier[];
  total: number;
  vs?: { type: 'ac' | 'dc'; value: number };
  outcome: 'hit' | 'miss' | 'success' | 'failure' | 'crit' | 'fumble';
  entry: 'server' | 'manual';
}

/** The d20 the server kept, and the one it discarded (for the "(dropped 4)" line). */
export function keptAndDropped(r: RollResultVM): { kept: number; dropped?: number } {
  if (r.secondD20 === undefined || r.collapsed === 'straight') return { kept: r.d20 };
  const [hi, lo] = r.d20 >= r.secondD20 ? [r.d20, r.secondD20] : [r.secondD20, r.d20];
  return r.collapsed === 'advantage' ? { kept: hi, dropped: lo } : { kept: lo, dropped: hi };
}

/** Good/bad/neutral tone for the die + verdict, from the server's outcome. */
export function outcomeTone(outcome: RollResultVM['outcome']): 'good' | 'bad' | 'neutral' {
  switch (outcome) {
    case 'crit': case 'hit': case 'success': return 'good';
    case 'fumble': case 'miss': case 'failure': return 'bad';
    default: return 'neutral';
  }
}

/**
 * A roll's derivation row. Narrower than InfoPanel's `DerivationLine` (whose
 * value is `string | number` for prose derivations): a roll's rows are always
 * signed integers, because they must sum to the server's total. Keeping them
 * numeric is what lets the test assert that sum.
 */
export interface RollRow {
  label: string;
  value: number;
}

/**
 * The 3D dice-tray spec for a settled roll — what die(s) to show and which to
 * keep. d20-only for now (attacks/checks/saves/death saves); damage is multi-die
 * but `roll_made` reports only the total today. The kept index MUST agree with
 * `keptAndDropped` so the tray highlights the same die the log names.
 */
export interface DiceSpecVM {
  dice: 'd20'[];
  results: number[];
  keep?: number;
}
export function toDiceSpec(r: RollResultVM): DiceSpecVM {
  if (r.secondD20 !== undefined && r.collapsed !== 'straight') {
    const keptIsFirst =
      r.collapsed === 'advantage' ? r.d20 >= r.secondD20 : r.d20 <= r.secondD20;
    return { dice: ['d20', 'd20'], results: [r.d20, r.secondD20], keep: keptIsFirst ? 0 : 1 };
  }
  return { dice: ['d20'], results: [r.d20] };
}

/** The derivation rows the settled sheet lists — kept die first, then modifiers. */
export function resultRows(r: RollResultVM): RollRow[] {
  const { kept, dropped } = keptAndDropped(r);
  const d20Label = dropped !== undefined ? `d20 (dropped ${dropped})` : 'd20';
  return [{ label: d20Label, value: kept }, ...r.modifiers.map((m) => ({ label: m.label, value: m.value }))];
}

/**
 * The plain-English verdict (§7 — no jargon, no "beat"). Reads the outcome the
 * server already decided; it never re-decides it.
 */
export function verdictLine(r: RollResultVM): string {
  const vs = r.vs ? ` ${r.vs.type === 'ac' ? 'Armor Class' : 'DC'} ${r.vs.value}` : '';
  switch (r.outcome) {
    case 'crit': return 'Critical hit';
    case 'fumble': return 'Miss — a natural 1';
    case 'hit': return `Hit${vs ? ` — against${vs}` : ''}`;
    case 'miss': return `Miss${vs ? ` — against${vs}` : ''}`;
    case 'success': return `Success${vs ? ` — against${vs}` : ''}`;
    case 'failure': return `Failure${vs ? ` — against${vs}` : ''}`;
  }
}
