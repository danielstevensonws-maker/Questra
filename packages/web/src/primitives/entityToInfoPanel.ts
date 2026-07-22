/**
 * The adapter from a contracts `RulesEntity` to the panel's view-model.
 *
 * WHY A VIEW-MODEL AND NOT THE ENTITY DIRECTLY
 * Non-entity things need this panel too: a computed AC from a character's
 * sheet, a homebrew draft mid-authoring. Keeping `InfoPanelData` thin means
 * InfoPanel serves all of them, and this file stays the ONLY mapping — so a
 * new entity type needs no InfoPanel change at all, just a new case in
 * `kindLabel()`.
 *
 * Note `derivation` (info-layer 2) is intentionally NOT mapped here. Static
 * entities rarely carry one; sheet values compute theirs at runtime. The
 * caller supplies it.
 */
import type { RulesEntity } from '@questra/contracts';

/** One line of "where the numbers come from". */
export interface DerivationLine {
  label: string;
  /** Rendered in mono — it's data, not prose. */
  value: string | number;
  /** Optional breakdown, e.g. `10 hit die (max)` + `2 CON mod`. */
  parts?: readonly string[];
}

/** The thin shape InfoPanel renders. Anything can produce one. */
export interface InfoPanelData {
  name: string;
  /** Plain-language category line, e.g. `Spell — Level 3 Evocation`. */
  kind: string;
  /** Info-layer 1: one sentence, always visible. */
  summary: string;
  /** Info-layer 2: supplied by the caller, not the entity. */
  derivation?: readonly DerivationLine[];
  /** Info-layer 3: the verbatim rules text. */
  rulesText?: string;
  /** Homebrew gets a quiet tint, never a warning. */
  homebrew?: boolean;
}

const SCHOOL_NAMES: Record<string, string> = {
  abjuration: 'Abjuration',
  conjuration: 'Conjuration',
  divination: 'Divination',
  enchantment: 'Enchantment',
  evocation: 'Evocation',
  illusion: 'Illusion',
  necromancy: 'Necromancy',
  transmutation: 'Transmutation',
};

/**
 * The plain-language category line. Plain language is a standing rule
 * (ADR-0009) — this says "Creature", not "statblock"; "Level 3 Evocation",
 * not "lvl3 evo".
 */
export function kindLabel(entity: RulesEntity): string {
  switch (entity.entityType) {
    case 'class': {
      // `complexity` is required on ClassMeta, so there's no absent case.
      const c = entity.meta.complexity;
      return `Class — ${c[0]!.toUpperCase()}${c.slice(1)} complexity`;
    }
    case 'subclass':
      return 'Subclass';
    case 'species':
      return 'Species';
    case 'background':
      return 'Background';
    case 'feat':
      return 'Feat';
    case 'spell': {
      const { level, school } = entity.meta;
      const schoolName = SCHOOL_NAMES[school] ?? school;
      return level === 0 ? `Spell — ${schoolName} cantrip` : `Spell — Level ${level} ${schoolName}`;
    }
    case 'monster':
      // `cr` is already a string in the schema ("1/4"), pre-formatted the way
      // the books write it — no numeric conversion to get wrong here.
      return `Creature — CR ${entity.meta.cr}`;
    case 'item':
      return 'Item';
    case 'condition':
      return 'Condition';
    default: {
      // Exhaustiveness guard: when a new entityType lands in contracts, this
      // stops compiling — which is the point. A new type needs a label here,
      // and nothing else in InfoPanel changes.
      const unreachable: never = entity;
      void unreachable;
      return 'Reference';
    }
  }
}

/** Map a contracts entity onto the panel's view-model. */
export function entityToInfoPanel(entity: RulesEntity): InfoPanelData {
  return {
    name: entity.name,
    kind: kindLabel(entity),
    summary: entity.plain,
    rulesText: entity.srd_text,
    homebrew: entity.source === 'homebrew',
  };
}
