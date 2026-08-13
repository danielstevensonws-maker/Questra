/**
 * Ingestion driver — Brief 01 §7. Runs the deterministic half of the pipeline
 * against the SRD PDF and writes draft skeletons for the human QA pass.
 *
 *   npm run ingest -w @questra/engine
 *
 * Steps:
 *   1. pdftotext -raw <SRD.pdf> → raw text (raw mode reads the two-column
 *      glossary in correct order; see ingest/conditions.ts).
 *   2. ingestConditions(raw) → 15 qa:draft skeletons with verbatim srd_text.
 *   3. Write them to ingest/.extracted/condition-drafts.json for review.
 *
 * Promotion to the verified dataset (adding plain + effects + meta, flipping
 * qa:verified) is the authored step in src/data/conditions.ts — deliberately not
 * automated (Brief 01 §1 rule 1: effect encoding is a rules-lawyer judgment).
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ingestConditions, ingestSpells, ingestMonsters, ingestClasses, ingestNamed, ingestItems, ingestTables } from '../src/ingest/pipeline.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = here + '../../../';
const pdfPath = process.argv[2] ?? repoRoot + 'SRD_CC_v5.2.1.pdf';
const extractedDir = here + '.extracted/';
const rawPath = extractedDir + 'srd-raw.txt';

mkdirSync(extractedDir, { recursive: true });

if (!existsSync(rawPath) || process.argv.includes('--reextract')) {
  if (!existsSync(pdfPath)) {
    console.error(`SRD PDF not found at ${pdfPath}. Pass a path: npm run ingest -w @questra/engine -- <path>`);
    process.exit(1);
  }
  console.log(`Extracting ${pdfPath} → ${rawPath} (pdftotext -raw)…`);
  execFileSync('pdftotext', ['-raw', pdfPath, rawPath], { stdio: 'inherit' });
}

const raw = readFileSync(rawPath, 'utf8');

// Condition draft skeletons (review artifact for the QA pass).
const condDrafts = ingestConditions(raw);
const condOut = extractedDir + 'condition-drafts.json';
writeFileSync(condOut, JSON.stringify(condDrafts, null, 2) + '\n');
console.log(`Wrote ${condDrafts.length} condition draft(s) → ${condOut}`);

// Spell draft entities → committed data the dataset imports (no runtime fs).
const dataDir = here + '../src/data/';
const spellDrafts = ingestSpells(raw);
const spellOut = dataDir + 'spells.draft.json';
writeFileSync(spellOut, JSON.stringify(spellDrafts, null, 2) + '\n');
console.log(`Wrote ${spellDrafts.length} spell draft(s) → ${spellOut}`);

// Monster draft entities.
const monsterDrafts = ingestMonsters(raw);
const monsterOut = dataDir + 'monsters.draft.json';
writeFileSync(monsterOut, JSON.stringify(monsterDrafts, null, 2) + '\n');
console.log(`Wrote ${monsterDrafts.length} monster draft(s) → ${monsterOut}`);

// Class level tables → committed data the verified class dataset combines with core traits.
const classTables = ingestClasses(raw);
const classOut = dataDir + 'classes.levels.json';
const levelsById = Object.fromEntries(classTables.map((c) => [c.classId, c.levels]));
writeFileSync(classOut, JSON.stringify(levelsById, null, 2) + '\n');
console.log(`Wrote ${classTables.length} class level table(s) → ${classOut}`);

// Species / backgrounds / feats draft entities (loose meta).
const namedDrafts = ingestNamed(raw);
const namedOut = dataDir + 'named.draft.json';
writeFileSync(namedOut, JSON.stringify(namedDrafts, null, 2) + '\n');
console.log(`Wrote ${namedDrafts.length} named draft(s) (species/background/feat) → ${namedOut}`);

// Item draft entities (weapons/armor/gear with prices).
const itemDrafts = ingestItems(raw);
const itemOut = dataDir + 'items.draft.json';
writeFileSync(itemOut, JSON.stringify(itemDrafts, null, 2) + '\n');
console.log(`Wrote ${itemDrafts.length} item draft(s) → ${itemOut}`);

// Reference tables (XP advancement + encounter XP budget) — not entities.
const tables = ingestTables(raw);
const tablesOut = dataDir + 'tables.json';
writeFileSync(tablesOut, JSON.stringify(tables, null, 2) + '\n');
console.log(`Wrote reference tables (advancement ${tables.advancement.length}, budget ${tables.encounterBudget.length}) → ${tablesOut}`);
