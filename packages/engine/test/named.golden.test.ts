/**
 * Species / backgrounds / feats golden tests — Brief 01 §2. The SRD subset
 * ingests to draft: all validate, correct entity types and ids, verbatim text.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { RulesEntitySchema } from '@questra/contracts';
import { ingestNamed } from '../src/ingest/pipeline.js';
import { SPECIES_NAMES, BACKGROUND_NAMES, FEAT_NAMES } from '../src/ingest/namedEntities.js';
import { draftNamed } from '../src/data/named.js';
import { loadEntities } from '../src/data/loader.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const rawSrd = readFileSync(here + '../ingest/.extracted/srd-raw.txt', 'utf8');

describe('species / backgrounds / feats ingestion', () => {
  const named = ingestNamed(rawSrd);

  it('extracts all 9 species, 4 backgrounds, 17 feats', () => {
    expect(named.filter((n) => n.entityType === 'species')).toHaveLength(SPECIES_NAMES.length);
    expect(named.filter((n) => n.entityType === 'background')).toHaveLength(BACKGROUND_NAMES.length);
    expect(named.filter((n) => n.entityType === 'feat')).toHaveLength(FEAT_NAMES.length);
  });
  it('every entity validates against the contracts schema', () => {
    for (const n of named) {
      const r = RulesEntitySchema.safeParse(n);
      expect(r.success, `${n.id}: ${r.success ? '' : JSON.stringify(r.error.issues[0])}`).toBe(true);
    }
  });
  it('every entity is qa:draft with verbatim (non-empty) srd_text', () => {
    for (const n of named) {
      expect(n.qa).toBe('draft');
      expect(n.srd_text.length).toBeGreaterThan(n.name.length + 2);
    }
  });
  it('ids are well-formed type-prefixed slugs', () => {
    for (const n of named) expect(n.id).toMatch(/^(species|background|feat)\.[a-z0-9-]+$/);
  });
});

describe('the draft named dataset', () => {
  it('is refused outside dev', () => {
    expect(() => loadEntities(draftNamed().slice(0, 3), { allowDraft: false })).toThrow(/draft/i);
  });
});

/**
 * The feat roster, by category.
 *
 * IT WAS FOUR — the Origin feats a background grants — and stopped there, so
 * the two other moments a feat exists for had nothing to offer: ASI-or-feat at
 * level-up, and a Fighter's level-one Fighting Style. Neither name was in the
 * extraction list, so neither was in the data, so neither could be built.
 *
 * The counts are asserted per category rather than as one total, because the
 * failure this guards against is a whole category quietly going missing again —
 * which a single number would absorb.
 */
describe('the feat roster covers every SRD category', () => {
  const feats = ingestNamed(rawSrd).filter((n) => n.entityType === 'feat');
  /**
   * The category is printed on the line directly under the feat's name, so it
   * is matched as a PREFIX rather than searched for anywhere in the block. A
   * loose search finds the next category's heading too: the last feat of each
   * category runs up to the following one's name, and the heading in between
   * comes with it.
   */
  const inCategory = (label: string): string[] =>
    feats.filter((f) => f.srd_text.startsWith(`${f.name}. ${label} Feat`)).map((f) => f.name);

  it('four Origin feats — one is granted by every background', () => {
    expect(inCategory('Origin').sort()).toEqual(['Alert', 'Magic Initiate', 'Savage Attacker', 'Skilled']);
  });

  it('two General feats, including the one the level-up flow offers', () => {
    expect(inCategory('General').sort()).toEqual(['Ability Score Improvement', 'Grappler']);
  });

  it('four Fighting Style feats — a Fighter picks one at level one', () => {
    expect(inCategory('Fighting Style').sort())
      .toEqual(['Archery', 'Defense', 'Great Weapon Fighting', 'Two-Weapon Fighting']);
  });

  it('seven Epic Boon feats', () => {
    expect(inCategory('Epic Boon')).toHaveLength(7);
  });

  it('and every one carries its own printed text, not a stub', () => {
    for (const f of feats) {
      expect(f.srd_text.startsWith(`${f.name}.`), `${f.name} should open with its own name`).toBe(true);
      expect(f.srd_text.length, `${f.name} should carry its rule`).toBeGreaterThan(60);
    }
  });
});
