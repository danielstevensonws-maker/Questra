/**
 * entityToInfoPanel — the seam between @questra/contracts and the InfoPanel
 * primitive. This is where "the schema IS the info panel's data source"
 * (Brief 01 §1.3) becomes literal: plain → summary, srd_text → rulesText,
 * and per-type meta → the kind label. Derivation is passed in by the caller
 * (it's computed at runtime for sheet values; static entities often have none).
 *
 * Because this adapter is the ONLY mapping, a new entity type needs no InfoPanel
 * changes — just a case here for its kind label.
 */
import type { RulesEntity } from '@questra/contracts';
import type { InfoPanelData, DerivationLine } from './InfoPanel.js';

const SCHOOL_TITLE: Record<string, string> = {
  abjuration: 'Abjuration', conjuration: 'Conjuration', divination: 'Divination',
  enchantment: 'Enchantment', evocation: 'Evocation', illusion: 'Illusion',
  necromancy: 'Necromancy', transmutation: 'Transmutation',
};

function kindLabel(entity: RulesEntity): string {
  switch (entity.entityType) {
    case 'class': return `Class — ${cap(entity.meta.complexity)} complexity`;
    case 'spell': return `Spell — Level ${entity.meta.level} ${SCHOOL_TITLE[entity.meta.school] ?? ''}`.trim();
    case 'monster': return `Creature — CR ${entity.meta.cr}`;
    case 'condition': return 'Condition';
    case 'subclass': return 'Subclass';
    case 'species': return 'Species';
    case 'background': return 'Background';
    case 'feat': return 'Feature';
    case 'item': return 'Item';
  }
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function entityToInfoPanel(
  entity: RulesEntity,
  derivation?: DerivationLine[],
): InfoPanelData {
  return {
    name: entity.name,
    kind: kindLabel(entity),
    source: entity.source,
    summary: entity.plain,
    ...(derivation ? { derivation } : {}),
    ...(entity.srd_text ? { rulesText: entity.srd_text } : {}),
  };
}
