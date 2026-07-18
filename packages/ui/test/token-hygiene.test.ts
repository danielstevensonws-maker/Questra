/**
 * Token hygiene: components consume the design system's --qa-* tokens and
 * introduce NO new colour/size values of their own.
 *
 * We scan every component .tsx for raw colour literals (#hex / rgb / rgba /
 * hsl). The only literals allowed are the exact ones the design-system
 * reference .jsx files themselves ship inline — kept verbatim so the port
 * matches the reference pixel-for-pixel. Any OTHER literal is drift and fails.
 *
 * If the design legitimately adds a colour, it belongs in a --qa-* token in
 * @questra/theme first (and then here as a var()), not hard-coded in a component.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const dirs = ['core', 'hud'] as const;

/**
 * Literals present verbatim in the design-system reference .jsx and intentionally
 * preserved. Each is a design value that does not correspond to an existing
 * --qa-* token (or a gradient the reference hard-codes). Reviewed and pinned.
 */
const ALLOWED_LITERALS = new Set<string>([
  // Button.jsx — hex gradients for the primary/hex variants
  '#D97B5F', // == --qa-ember-bright, but reference hard-codes it in a gradient
  '#8E4230', // == --qa-ember-deep
  '#221A0E', // == --qa-ink-raised2
  '#161109', // near --qa-ink; reference literal
  // MapToken.jsx — initial ink + tag scrim
  '#F0E8D4', // token-adjacent vellum for the on-token initial
  '#F2F3F5', // (none expected; placeholder-safe)
]);

// rgba() literals the reference ships (semantic hues at low alpha, dark scrims,
// spotlight rings). These are design values with no standalone token.
const ALLOWED_RGBA_SUBSTRINGS = [
  'rgba(192,86,62,',
  'rgba(192,91,65,',
  'rgba(143,184,154,',
  'rgba(154,143,184,',
  'rgba(143,163,184,',
  'rgba(214,150,90,',
  'rgba(230,220,196,', // spotlight ring / unhurt tag
  'rgba(0,0,0,',
  'rgba(5,6,9,',
];

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const RGBA = /rgba?\([^)]*\)/g;

// vitest runs with cwd = the package root, so resolve src/ from there.
const SRC = join(process.cwd(), 'src');

function componentFiles(): string[] {
  const out: string[] = [];
  for (const d of dirs) {
    const dir = join(SRC, d);
    for (const f of readdirSync(dir)) {
      if (f.endsWith('.tsx')) out.push(join(dir, f));
    }
  }
  return out;
}

describe('components introduce no un-tokenized colour values', () => {
  const files = componentFiles();

  it('found the component files', () => {
    expect(files.length).toBe(11);
  });

  it.each(files)('%s uses only tokens + the pinned reference literals', (file) => {
    // scan code only — strip comments so prose like "rgba() values" isn't flagged
    const src = readFileSync(file, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');

    const hexes = src.match(HEX) ?? [];
    const strayHex = hexes.filter((h) => !ALLOWED_LITERALS.has(h.toUpperCase()) && !ALLOWED_LITERALS.has(h));
    expect(strayHex, `un-pinned hex literal(s) in ${file}: ${strayHex.join(', ')}`).toEqual([]);

    const rgbas = src.match(RGBA) ?? [];
    const strayRgba = rgbas.filter((r) => !ALLOWED_RGBA_SUBSTRINGS.some((a) => r.startsWith(a)));
    expect(strayRgba, `un-pinned rgba literal(s) in ${file}: ${strayRgba.join(', ')}`).toEqual([]);
  });

  it('every component references at least one --qa-* token', () => {
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      expect(src.includes('var(--qa-'), `${file} references no --qa-* token`).toBe(true);
    }
  });
});
