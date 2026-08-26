/**
 * Items + reference-tables golden tests — Brief 01 §7 ("items + prices; XP +
 * difficulty-ladder tables").
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { RulesEntitySchema } from '@questra/contracts';
import { ingestItems, ingestTables } from '../src/ingest/pipeline.js';
import { draftItems, INGESTED_ITEMS, ITEMS } from '../src/data/items.js';
import { verdictFor, promoteVerifiable } from '../src/ingest/verify.js';
import { ADVANCEMENT, ENCOUNTER_BUDGET, xpForLevel, encounterBudget } from '../src/data/tables.js';
import { loadEntities } from '../src/data/loader.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const rawSrd = readFileSync(here + '../ingest/.extracted/srd-raw.txt', 'utf8');

describe('item ingestion — equipment with prices', () => {
  const items = ingestItems(rawSrd);

  it('extracts a substantial equipment list (100+)', () => {
    expect(items.length).toBeGreaterThanOrEqual(100);
  });
  it('every item validates against the contracts schema', () => {
    for (const it of items) {
      const r = RulesEntitySchema.safeParse(it);
      expect(r.success, `${it.id}: ${r.success ? '' : JSON.stringify(r.error.issues[0])}`).toBe(true);
    }
  });
  it('prices are captured in copper pieces where the row has a cost', () => {
    const withCost = items.filter((it) => (it.meta as { costCp?: number }).costCp !== undefined);
    expect(withCost.length).toBeGreaterThan(80);
    // spot-check known SRD prices (in cp): Dagger 2 GP = 200, Studded Leather 45 GP = 4500
    const dagger = items.find((it) => it.id === 'item.dagger');
    expect((dagger?.meta as { costCp?: number })?.costCp).toBe(200);
  });
  it('ids are unique type-prefixed slugs; all qa:draft', () => {
    const ids = items.map((it) => it.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const it of items) { expect(it.id).toMatch(/^item\.[a-z0-9-]+$/); expect(it.qa).toBe('draft'); }
  });
  /**
   * The loader's rule is unchanged and still bites — what changed is which
   * entities are subject to it. As INGESTED every row is draft and refused;
   * promotion is what moves them across, and only where the price checks out.
   */
  it('the item dataset is refused outside dev before promotion', () => {
    expect(() => loadEntities(INGESTED_ITEMS.slice(0, 5), { allowDraft: false })).toThrow(/draft/i);
  });

  it('and accepted outside dev after it', () => {
    expect(() => loadEntities(ITEMS, { allowDraft: false })).not.toThrow();
  });

  /**
   * Promotion has to be able to FAIL, or `verified` is a rubber stamp. A price
   * that no longer matches the one on its own equipment row falls back to draft.
   */
  it('refuses to promote a price that disagrees with the printed one', () => {
    const sound = INGESTED_ITEMS[0]!;
    expect(verdictFor(sound).verified).toBe(true);

    /* Re-parsed rather than spread: `meta` is keyed off entityType. */
    const mistyped = RulesEntitySchema.parse({
      ...(sound as unknown as Record<string, unknown>),
      meta: { ...(sound.meta as Record<string, unknown>), costCp: (sound.meta as { costCp: number }).costCp + 1 },
    });
    expect(verdictFor(mistyped).reason).toMatch(/price/);
    expect(promoteVerifiable([mistyped])[0]!.qa).toBe('draft');
  });
});

describe('reference tables — XP advancement + encounter budget', () => {
  it('the advancement table has all 20 levels with the SRD thresholds', () => {
    expect(ADVANCEMENT).toHaveLength(20);
    expect(xpForLevel(1)).toBe(0);
    expect(xpForLevel(5)).toBe(6500);
    expect(xpForLevel(20)).toBe(355000);
    expect(ADVANCEMENT.find((r) => r.level === 5)?.profBonus).toBe(3);
  });
  it('the encounter XP budget ladder has all 20 levels with low/moderate/high', () => {
    expect(ENCOUNTER_BUDGET).toHaveLength(20);
    expect(encounterBudget(1, 'low')).toBe(50);
    expect(encounterBudget(1, 'high')).toBe(100);
    expect(encounterBudget(20, 'high')).toBe(22000);
  });
  it('re-parsing the raw SRD reproduces the committed tables (no drift)', () => {
    const fresh = ingestTables(rawSrd);
    expect(fresh.advancement).toEqual(ADVANCEMENT);
    expect(fresh.encounterBudget).toEqual(ENCOUNTER_BUDGET);
  });
});
