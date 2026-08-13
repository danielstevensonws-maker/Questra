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
import { ingestConditions } from '../src/ingest/pipeline.js';

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
const drafts = ingestConditions(raw);
const out = extractedDir + 'condition-drafts.json';
writeFileSync(out, JSON.stringify(drafts, null, 2) + '\n');
console.log(`Wrote ${drafts.length} condition draft(s) → ${out}`);
