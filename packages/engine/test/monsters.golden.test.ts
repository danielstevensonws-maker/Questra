/**
 * Monster ingestion golden tests — Brief 01 §7 acceptance for the monster
 * roster. The SRD monsters ingest to draft (every entity validates), and the
 * Goblin Warrior's structured meta matches its canonical fixture.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { RulesEntitySchema, type RulesEntity } from '@questra/contracts';
import { ingestMonsters } from '../src/ingest/pipeline.js';
import { draftMonsters, INGESTED_MONSTERS, MONSTERS } from '../src/data/monsters.js';
import { loadEntities } from '../src/data/loader.js';
import { verdictFor, promoteVerifiable } from '../src/ingest/verify.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const rawSrd = readFileSync(here + '../ingest/.extracted/srd-raw.txt', 'utf8');
const goblinFixture = JSON.parse(
  readFileSync(here + '../../contracts/src/fixtures/goblin-warrior.json', 'utf8'),
) as RulesEntity & { meta: Record<string, unknown> };

// Known coverage gap — logged, not hidden (Playbook "no silent caps"). These
// dragon variants aren't split cleanly yet and are picked up in a follow-up.
const KNOWN_MISSING = [
  'Gold Dragon Wyrmling', 'Silver Dragon Wyrmling', 'White Dragon Wyrmling',
  'Young White Dragon', 'Adult White Dragon',
];

describe('monster ingestion — the SRD roster', () => {
  const monsters = ingestMonsters(rawSrd);

  it('extracts the bulk of the roster (300+)', () => {
    expect(monsters.length).toBeGreaterThanOrEqual(300);
  });
  it('every monster validates against the contracts schema (acceptance #1)', () => {
    for (const m of monsters) {
      const r = RulesEntitySchema.safeParse(m);
      expect(r.success, `${m.id}: ${r.success ? '' : JSON.stringify(r.error.issues[0])}`).toBe(true);
    }
  });
  it('every monster is qa:draft', () => {
    for (const m of monsters) expect(m.qa).toBe('draft');
  });
  it('ids are unique lowercase-dotted slugs', () => {
    const ids = monsters.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^monster\.[a-z0-9.-]+$/);
  });
  it('documents its known coverage gap (these are not silently dropped)', () => {
    const names = new Set(monsters.map((m) => m.name));
    for (const missing of KNOWN_MISSING) expect(names.has(missing)).toBe(false);
  });
});

describe('Goblin Warrior structured meta matches its fixture', () => {
  const goblin = ingestMonsters(rawSrd).find((m) => m.id === 'monster.goblin-warrior')!;

  it('parses the header/ability/other fields identically (actions differ: fixture is hand-encoded)', () => {
    const strip = (meta: Record<string, unknown>) => {
      const { actions, bonusActions, ...rest } = meta;
      return rest;
    };
    expect(strip(goblin.meta as Record<string, unknown>)).toEqual(strip(goblinFixture.meta));
  });
});

describe('the draft monster dataset', () => {
  it('excludes the verified Goblin Warrior (no duplicate ids)', () => {
    const ids = draftMonsters().map((m) => m.id);
    expect(ids).not.toContain('monster.goblin-warrior');
    expect(new Set(ids).size).toBe(ids.length);
  });
  /**
   * The loader's rule is unchanged and still bites — what changed is which
   * entities are subject to it. As INGESTED every monster is draft and refused;
   * promotion is what moves them across, and only with evidence.
   */
  it('is refused outside dev before promotion', () => {
    expect(() => loadEntities(INGESTED_MONSTERS.slice(0, 5), { allowDraft: false })).toThrow(/draft/i);
  });

  it('is accepted outside dev after it', () => {
    expect(() => loadEntities(MONSTERS, { allowDraft: false })).not.toThrow();
  });

  /**
   * The promotion is only worth anything if it can FAIL. A stat block whose
   * recorded armour class stops matching the one printed in its own text must
   * fall back to draft — otherwise `verified` is a rubber stamp, and the loader
   * is guarding nothing.
   */
  it('refuses to promote a stat block that disagrees with its own printed rule', () => {
    const sound = INGESTED_MONSTERS[0]!;
    expect(verdictFor(sound).verified).toBe(true);

    /* Re-parsed rather than spread: `meta` is keyed off entityType, so the only
       honest way to build a wrong one is to build a whole entity. */
    const mistyped = RulesEntitySchema.parse({
      ...(sound as unknown as Record<string, unknown>),
      meta: { ...(sound.meta as Record<string, unknown>), ac: (sound.meta as { ac: number }).ac + 1 },
    });
    const verdict = verdictFor(mistyped);
    expect(verdict.verified).toBe(false);
    expect(verdict.reason).toMatch(/armour class/);
    expect(promoteVerifiable([mistyped])[0]!.qa).toBe('draft');
  });

  it('every promoted monster carries the evidence that promoted it', () => {
    for (const m of MONSTERS.filter((x) => x.qa === 'verified')) {
      const evidence = verdictFor(RulesEntitySchema.parse({ ...(m as unknown as Record<string, unknown>), qa: 'draft' })).evidence;
      expect(evidence.length, `${m.id} should have checkable claims`).toBeGreaterThan(0);
      expect(evidence.every((e) => e.holds), `${m.id} evidence should hold`).toBe(true);
    }
  });
});
