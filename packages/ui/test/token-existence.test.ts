/**
 * Every --qa-* token a component references must actually be declared in
 * @questra/theme. This catches typo'd or invented token names (e.g.
 * `var(--qa-emberr)`) that the hygiene test's literal scan can't see — the
 * other half of "consume only the --qa-* tokens, no new values".
 *
 * Reads the theme's token CSS directly from the sibling package in the repo.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(process.cwd(), '..', '..');
const THEME_TOKENS = join(REPO, 'packages', 'theme', 'src', 'tokens');
const UI_SRC = join(process.cwd(), 'src');

function declaredTokens(): Set<string> {
  const out = new Set<string>();
  for (const f of readdirSync(THEME_TOKENS)) {
    if (!f.endsWith('.css')) continue;
    const css = readFileSync(join(THEME_TOKENS, f), 'utf8');
    for (const m of css.matchAll(/(--qa-[a-z0-9-]+)\s*:/g)) out.add(m[1]!);
  }
  return out;
}

function referencedTokens(): Set<string> {
  const out = new Set<string>();
  for (const d of ['core', 'hud']) {
    const dir = join(UI_SRC, d);
    for (const f of readdirSync(dir)) {
      if (!f.endsWith('.tsx')) continue;
      const src = readFileSync(join(dir, f), 'utf8');
      for (const m of src.matchAll(/var\((--qa-[a-z0-9-]+)\)/g)) out.add(m[1]!);
    }
  }
  return out;
}

describe('component token references resolve against @questra/theme', () => {
  it('finds the theme token declarations', () => {
    expect(declaredTokens().size).toBeGreaterThan(0);
  });

  it('every --qa-* the components use is declared in the theme', () => {
    const declared = declaredTokens();
    const missing = [...referencedTokens()].filter((t) => !declared.has(t)).sort();
    expect(missing, `component(s) reference undeclared token(s): ${missing.join(', ')}`).toEqual([]);
  });
});
