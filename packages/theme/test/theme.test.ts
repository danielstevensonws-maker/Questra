/**
 * Theme drift guard.
 *
 * The design ("Questra V1 Prototype" in Claude Design) is the source of
 * truth; tokens/*.css is its transcription (ADR-0014). This test pins a
 * representative subset of values so an accidental hand-edit that drifts
 * the repo away from the design fails CI — the same discipline the
 * contracts package applies to its canonical fixtures.
 *
 * It also asserts the TypeScript token map (index.ts) and the CSS stay in
 * lockstep: every CSS var name a consumer can reference must be declared,
 * and every declared token must be a real CSS custom property.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { token } from '../src/index.js';

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(`../src/${rel}`, import.meta.url)), 'utf8');

const colors = read('tokens/colors.css');
const typography = read('tokens/typography.css');
const spacing = read('tokens/spacing.css');
const effects = read('tokens/effects.css');
const fonts = read('tokens/fonts.css');
const allCss = colors + typography + spacing + effects + effects + read('base.css');

describe('color tokens — transcribed from the design, semantic only', () => {
  it('warm near-black ground (never pure #000)', () => {
    expect(colors).toContain('--qa-ink:         #131009;');
    expect(colors).toContain('--qa-ink-deep:    #0E0B06;');
    // no pure-black value anywhere (the only "#000" is the comment warning against it)
    expect(colors).not.toMatch(/:\s*#000(?:000)?\b/);
  });

  it('the signature ember accent family', () => {
    expect(colors).toContain('--qa-ember:        #C05B41;');
    expect(colors).toContain('--qa-ember-bright: #D97B5F;');
    expect(colors).toContain('--qa-candle:       #D6965A;');
  });

  it('semantic hues each mean one thing', () => {
    expect(colors).toContain('--qa-danger:  #C0563E;');
    expect(colors).toContain('--qa-heal:    #8FB89A;');
    expect(colors).toContain('--qa-arcane:  #9A8FB8;');
  });

  it('ships the three opt-in HUD glass themes', () => {
    expect(colors).toContain('.qa-hud-slate');
    expect(colors).toContain('.qa-hud-ivory');
  });
});

describe('typography tokens — three roles, extreme scale contrast', () => {
  it('the three families are the shipped faces', () => {
    expect(typography).toContain('"IM Fell English"');
    expect(typography).toContain('"EB Garamond"');
    expect(typography).toContain('"IBM Plex Mono"');
  });

  it('scale spans the whisper (8.5px) to the moment (56px)', () => {
    expect(typography).toContain('--qa-text-micro: 8.5px;');
    expect(typography).toContain('--qa-text-4xl:   56px;');
  });

  it('display/body faces top out at 600 — no heavier weight token', () => {
    expect(typography).toContain('--qa-weight-bold: 600;');
    expect(typography).not.toMatch(/--qa-weight-\w+:\s*[789]00/);
  });

  it('loads all three families from the webfont import', () => {
    expect(fonts).toContain('IM+Fell+English');
    expect(fonts).toContain('EB+Garamond');
    expect(fonts).toContain('IBM+Plex+Mono');
  });
});

describe('spacing & effects tokens', () => {
  it('restrained radii — panels 4, chips 3', () => {
    expect(spacing).toContain('--qa-radius:    4px;');
    expect(spacing).toContain('--qa-radius-sm: 3px;');
  });

  it('motion arrives, it does not spring (damped ease, no bounce)', () => {
    expect(effects).toContain('--qa-ease:      cubic-bezier(0.2, 0, 0, 1);');
    expect(effects).toContain('--qa-dur-fast:  160ms;');
  });

  it('borders are hairlines, and the shadow is rare', () => {
    expect(colors).toContain('--qa-hairline:');
    expect(effects).toContain('--qa-shadow-menu:');
  });
});

describe('TS token map <-> CSS stay in lockstep', () => {
  it('every declared token is a real CSS custom property', () => {
    const missing = Object.values(token).filter((v) => !allCss.includes(`${v}:`));
    expect(missing, `tokens with no CSS declaration: ${missing.join(', ')}`).toEqual([]);
  });

  it('cssVar names are unique (no accidental duplicate mapping)', () => {
    const vars = Object.values(token);
    expect(new Set(vars).size).toBe(vars.length);
  });
});
