/**
 * Ingestion pipeline orchestrator — Brief 01 §7.
 *
 *   pdftotext -raw SRD.pdf  →  extractConditions()  →  draft skeletons
 *
 * A "draft skeleton" is a RulesEntity with the verbatim `srd_text` filled in and
 * everything the pipeline CANNOT derive left blank: `plain` (a human sentence)
 * and `effects[]` (the rules-lawyer encoding). Skeletons carry `qa: 'draft'`.
 * The verified dataset (src/data/) is authored by promoting these drafts: adding
 * plain + effects + meta and flipping `qa: 'verified'`.
 *
 * This module is the deterministic half. It imports only @questra/contracts —
 * never anything AI (ADR-0005), never the dataset it feeds.
 */
import { CONDITION_IDS } from '@questra/contracts';
import { extractConditions, CONDITION_NAMES, type ConditionName } from './conditions.js';
import { extractSpells } from './spells.js';
import { extractMonsters } from './monsters.js';
import { extractClasses, type ClassTable } from './classes.js';
import { extractNamed, SPECIES_NAMES, BACKGROUND_NAMES, FEAT_NAMES } from './namedEntities.js';

/** Dataset version stamped on ingested entities. Pinned; bumping is an append-only release (Brief 01 acceptance #6). */
export const DATASET_VERSION = '2026.07.0';

/** Name → contracts condition id ('Prone' → 'condition.prone'). */
export function conditionId(name: ConditionName): (typeof CONDITION_IDS)[number] {
  const id = `condition.${name.toLowerCase()}` as (typeof CONDITION_IDS)[number];
  if (!(CONDITION_IDS as readonly string[]).includes(id)) {
    throw new Error(`No contracts condition id for "${name}" (expected ${id})`);
  }
  return id;
}

/** A draft condition skeleton — verbatim text in, rules encoding still to author. */
export interface ConditionDraft {
  id: (typeof CONDITION_IDS)[number];
  entityType: 'condition';
  name: string;
  source: 'srd-5.2.1';
  version: string;
  qa: 'draft';
  srd_text: string;
}

/** Run extraction over a raw SRD text blob and return the 15 draft skeletons. */
export function ingestConditions(rawSrdText: string): ConditionDraft[] {
  const lines = rawSrdText.replace(/\r/g, '').split('\n');
  const extracted = extractConditions(lines);
  const byName = new Map(extracted.map((e) => [e.name, e.srdText]));

  return CONDITION_NAMES.map((name) => {
    const srd = byName.get(name);
    if (srd === undefined) throw new Error(`Ingestion missed condition "${name}" — expected all ${CONDITION_NAMES.length}.`);
    return {
      id: conditionId(name),
      entityType: 'condition' as const,
      name,
      source: 'srd-5.2.1' as const,
      version: DATASET_VERSION,
      qa: 'draft' as const,
      srd_text: srd,
    };
  });
}

/** Slice a raw SRD blob to a labelled section by its start header and the header that follows it. */
export function sliceSection(rawSrdText: string, startHeader: string, endHeader: string): string[] {
  const lines = rawSrdText.replace(/\r/g, '').split('\n');
  const start = lines.findIndex((l) => l.trim() === startHeader);
  if (start === -1) throw new Error(`Section start "${startHeader}" not found`);
  const end = lines.findIndex((l, i) => i > start && l.trim() === endHeader);
  return lines.slice(start + 1, end === -1 ? undefined : end);
}

/** A draft spell entity — full contracts-shaped meta, verbatim srd_text, qa:draft (plain/effects await the rules-lawyer pass). */
export interface SpellEntityDraft {
  id: string;
  entityType: 'spell';
  name: string;
  source: 'srd-5.2.1';
  version: string;
  qa: 'draft';
  plain: string;
  srd_text: string;
  effects: [];
  resolution: 'routine';
  meta: Record<string, unknown>;
}

/**
 * Ingest all SRD spell descriptions to draft entities. Every draft validates
 * against the contracts SpellMetaSchema; `plain` is a placeholder (the spell
 * name) and `effects` is empty until the curated verification pass fills them.
 */
export function ingestSpells(rawSrdText: string): SpellEntityDraft[] {
  const region = sliceSection(rawSrdText, 'Spell Descriptions', 'Rules Glossary');
  return extractSpells(region).map((s) => ({
    id: s.id,
    entityType: 'spell' as const,
    name: s.name,
    source: 'srd-5.2.1' as const,
    version: DATASET_VERSION,
    qa: 'draft' as const,
    plain: `${s.name} — a level ${s.meta.level} ${s.meta.school} spell.`,
    srd_text: s.srdText,
    effects: [] as [],
    resolution: 'routine' as const,
    meta: s.meta as unknown as Record<string, unknown>,
  }));
}

/** A draft monster entity — contracts-shaped meta, reflowed srd_text, qa:draft. */
export interface MonsterEntityDraft {
  id: string;
  entityType: 'monster';
  name: string;
  source: 'srd-5.2.1';
  version: string;
  qa: 'draft';
  plain: string;
  srd_text: string;
  effects: [];
  resolution: 'routine';
  meta: Record<string, unknown>;
}

/**
 * Ingest the SRD monster roster to draft entities. Every draft validates against
 * the contracts MonsterMetaSchema. Actions are captured as name+text (the
 * per-monster attack/hit/rider encoding is the rules-lawyer pass); `plain` and
 * `effects` await verification.
 *
 * Known coverage gap (logged, not hidden — Playbook "no silent caps"): a handful
 * of chromatic/metallic dragon variants aren't yet split cleanly and are dropped.
 * They're enumerated by the golden test and picked up in a follow-up.
 */
export function ingestMonsters(rawSrdText: string): MonsterEntityDraft[] {
  const lines = rawSrdText.replace(/\r/g, '').split('\n');
  const start = lines.findIndex((l) => l.trim() === 'Monsters');
  if (start === -1) throw new Error('Monsters section not found');
  return extractMonsters(lines.slice(start)).map((m) => ({
    id: m.id,
    entityType: 'monster' as const,
    name: m.name,
    source: 'srd-5.2.1' as const,
    version: DATASET_VERSION,
    qa: 'draft' as const,
    plain: `${m.name} — a CR ${m.meta.cr} ${m.meta.size} ${m.meta.type}.`,
    srd_text: m.srdText,
    effects: [] as [],
    resolution: 'routine' as const,
    meta: m.meta as unknown as Record<string, unknown>,
  }));
}

/** Parse the 12 class level tables (Brief 01 §6). The 1–20 rows the level table owns;
 *  the core traits (hit die, saves, caster type, …) are authored in data/classes.ts. */
export function ingestClasses(rawSrdText: string): ClassTable[] {
  const lines = rawSrdText.replace(/\r/g, '').split('\n');
  // classes live before the spell lists; bound the search to avoid the spell/monster regions
  const bound = lines.findIndex((l) => l.trim() === 'Spell Descriptions');
  return extractClasses(lines.slice(0, bound === -1 ? undefined : bound));
}

/** A draft entity for a loose-meta type (species/background/feat): verbatim text, empty meta. */
export interface NamedEntityDraft {
  id: string;
  entityType: 'species' | 'background' | 'feat';
  name: string;
  source: 'srd-5.2.1';
  version: string;
  qa: 'draft';
  plain: string;
  srd_text: string;
  effects: [];
  resolution: 'routine';
  meta: Record<string, never>;
}

function namedId(entityType: string, name: string): string {
  return `${entityType}.` + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function toNamedDraft(entityType: 'species' | 'background' | 'feat', name: string, srdText: string): NamedEntityDraft {
  return {
    id: namedId(entityType, name),
    entityType,
    name,
    source: 'srd-5.2.1',
    version: DATASET_VERSION,
    qa: 'draft',
    plain: `${name} — an SRD ${entityType}.`,
    srd_text: srdText,
    effects: [],
    resolution: 'routine',
    meta: {},
  };
}

/** Ingest the 9 species, 4 backgrounds, and 4 feats to draft entities (loose meta, verbatim text). */
export function ingestNamed(rawSrdText: string): NamedEntityDraft[] {
  const lines = rawSrdText.replace(/\r/g, '').split('\n');
  const region = (startHeader: string, endHeader: string) => {
    const s = lines.findIndex((l) => l.trim() === startHeader);
    const e = lines.findIndex((l, i) => i > s && l.trim() === endHeader);
    return lines.slice(s === -1 ? 0 : s, e === -1 ? undefined : e);
  };
  const species = extractNamed(region('Character Species', 'Feats'), SPECIES_NAMES).map((n) => toNamedDraft('species', n.name, n.srdText));
  const backgrounds = extractNamed(region('Character Backgrounds', 'Character Species'), BACKGROUND_NAMES).map((n) => toNamedDraft('background', n.name, n.srdText));
  const feats = extractNamed(region('Feat Descriptions', 'Equipment'), FEAT_NAMES).map((n) => toNamedDraft('feat', n.name, n.srdText));
  return [...species, ...backgrounds, ...feats];
}
