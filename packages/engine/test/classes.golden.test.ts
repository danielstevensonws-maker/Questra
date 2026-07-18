/**
 * Class ingestion golden tests — Brief 01 §6/§7. All 12 classes verify with
 * full 1–20 level tables, and acceptance #4 (every level grants ≥1 feature id)
 * is asserted across every class and level. class.fighter's rows match the
 * canonical Fighter fixture's feature-id convention.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { RulesEntitySchema, violatesPlainLanguage, type RulesEntity } from '@questra/contracts';
import { CLASSES } from '../src/data/classes.js';
import { CLASS_NAMES } from '../src/ingest/classes.js';
import { loadEntities } from '../src/data/loader.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const fighterFixture = JSON.parse(
  readFileSync(here + '../../contracts/src/fixtures/fighter.json', 'utf8'),
) as { class: RulesEntity & { meta: { levels: Record<string, { profBonus: number; features: string[] }> } } };

describe('all 12 SRD classes verify', () => {
  it('covers exactly the 12 class names', () => {
    expect(CLASSES).toHaveLength(12);
    expect(new Set(CLASSES.map((c) => c.name))).toEqual(new Set(CLASS_NAMES));
  });
  it('every class validates against the contracts schema', () => {
    for (const c of CLASSES) expect(() => RulesEntitySchema.parse(c)).not.toThrow();
  });
  it('every class is qa:verified and loads with drafts disallowed', () => {
    for (const c of CLASSES) expect(c.qa).toBe('verified');
    expect(() => loadEntities(CLASSES, { allowDraft: false })).not.toThrow();
  });
  it('plain lines pass the plain-language ban list', () => {
    for (const c of CLASSES) expect(violatesPlainLanguage(c.plain), c.id).toBeNull();
  });
});

describe('Brief 01 acceptance #4 — every class level 1–20 grants ≥1 feature id', () => {
  it('all 12 classes have all 20 levels, each with a non-empty feature list', () => {
    for (const c of CLASSES) {
      const levels = (c.meta as { levels: Record<string, { features: string[] }> }).levels;
      for (let l = 1; l <= 20; l++) {
        const row = levels[String(l)];
        expect(row, `${c.id} missing level ${l}`).toBeDefined();
        expect(row!.features.length, `${c.id} level ${l} has no feature`).toBeGreaterThanOrEqual(1);
      }
    }
  });
  it('every feature id is a well-formed slug', () => {
    for (const c of CLASSES) {
      const levels = (c.meta as { levels: Record<string, { features: string[] }> }).levels;
      for (const row of Object.values(levels)) {
        for (const f of row.features) expect(f).toMatch(/^(feature|choice)\.[a-z0-9.-]+$/);
      }
    }
  });
});

describe('class.fighter matches the canonical fixture convention', () => {
  const fighter = CLASSES.find((c) => c.id === 'class.fighter')! as RulesEntity & {
    meta: { levels: Record<string, { profBonus: number; features: string[] }> };
  };
  // The parser owns feature ids + proficiency bonus per level. The fixture also
  // carries per-class `setResources` (e.g. Second Wind / Weapon Mastery counts) —
  // a further hand-encoding of the resource columns that isn't lifted here; that
  // refinement is a follow-up on top of the verified feature/PB rows.
  it('levels 1–5 feature ids + proficiency bonus equal the fixture', () => {
    for (let l = 1; l <= 5; l++) {
      const got = fighter.meta.levels[String(l)]!;
      const want = fighterFixture.class.meta.levels[String(l)]!;
      expect(got.features, `L${l} features`).toEqual(want.features);
      expect(got.profBonus, `L${l} profBonus`).toEqual(want.profBonus);
    }
  });
});
