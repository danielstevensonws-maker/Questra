/**
 * Byte-identity guard: the shipped design-system files MUST equal the
 * "Questra V1 Prototype" source verbatim.
 *
 * `test/design-source/` holds the exact files pulled from the Claude Design
 * project (the source of truth). This test asserts the files under `src/`
 * that a consumer links — styles.css + tokens/*.css — are byte-for-byte the
 * same (normalizing only CRLF, which git may rewrite on Windows).
 *
 * If this fails, the repo has drifted from the design system. Do not "fix"
 * the source fixture to match the drift — re-sync src/ from the design, or
 * update BOTH deliberately when the design itself changed.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const FILES = [
  'styles.css',
  'tokens/fonts.css',
  'tokens/colors.css',
  'tokens/typography.css',
  'tokens/spacing.css',
  'tokens/effects.css',
] as const;

const lf = (s: string) => s.replace(/\r\n/g, '\n');
const shipped = (rel: string) =>
  lf(readFileSync(fileURLToPath(new URL(`../src/${rel}`, import.meta.url)), 'utf8'));
const source = (rel: string) =>
  lf(readFileSync(fileURLToPath(new URL(`./design-source/${rel}`, import.meta.url)), 'utf8'));

describe('design system is byte-identical to the Questra V1 Prototype source', () => {
  it.each(FILES)('%s matches the design source verbatim', (rel) => {
    expect(shipped(rel)).toBe(source(rel));
  });
});
