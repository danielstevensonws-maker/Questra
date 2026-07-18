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

  it('extracts all 9 species, 4 backgrounds, 4 feats', () => {
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
