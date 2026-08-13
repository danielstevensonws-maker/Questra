/**
 * Spell ingestion golden tests — Brief 01 §7 acceptance for the spell corpus.
 * The full SRD spell list ingests to draft (acceptance: counts + every entity
 * validates), and Fireball reproduces its canonical fixture byte-for-byte.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { RulesEntitySchema, violatesPlainLanguage, type RulesEntity } from '@questra/contracts';
import { ingestSpells } from '../src/ingest/pipeline.js';
import { draftSpells } from '../src/data/spells.js';
import { loadEntities } from '../src/data/loader.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const rawSrd = readFileSync(here + '../ingest/.extracted/srd-raw.txt', 'utf8');
const fireballFixture = JSON.parse(
  readFileSync(here + '../../contracts/src/fixtures/fireball.json', 'utf8'),
) as RulesEntity;

describe('spell ingestion — the full SRD spell list', () => {
  const spells = ingestSpells(rawSrd);

  it('extracts the full spell corpus (300+)', () => {
    expect(spells.length).toBeGreaterThanOrEqual(300);
  });
  it('every spell validates against the contracts schema (acceptance #1)', () => {
    for (const s of spells) {
      const r = RulesEntitySchema.safeParse(s);
      expect(r.success, `${s.id}: ${r.success ? '' : JSON.stringify(r.error.issues[0])}`).toBe(true);
    }
  });
  it('every spell is qa:draft (bulk is unverified until the rules-lawyer pass)', () => {
    for (const s of spells) expect(s.qa).toBe('draft');
  });
  it('ids are unique lowercase-dotted slugs', () => {
    const ids = spells.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^spell\.[a-z0-9.-]+$/);
  });
  it('placeholder plain lines pass the plain-language ban list', () => {
    for (const s of spells) expect(violatesPlainLanguage(s.plain), s.id).toBeNull();
  });
});

describe('Fireball reproduces its canonical fixture', () => {
  const fireball = ingestSpells(rawSrd).find((s) => s.id === 'spell.fireball')!;

  it('srd_text byte-matches the fixture', () => {
    expect(fireball.srd_text).toBe(fireballFixture.srd_text);
  });
  it('meta byte-matches the fixture', () => {
    expect(fireball.meta).toEqual(fireballFixture.meta);
  });
});

describe('the draft spell dataset', () => {
  it('excludes the verified Fireball (no duplicate ids with the verified core)', () => {
    const ids = draftSpells().map((s) => s.id);
    expect(ids).not.toContain('spell.fireball');
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('is refused outside dev (drafts are dev-only)', () => {
    expect(() => loadEntities(draftSpells().slice(0, 5), { allowDraft: false })).toThrow(/draft/i);
  });
});
