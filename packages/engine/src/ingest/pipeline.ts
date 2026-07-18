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
