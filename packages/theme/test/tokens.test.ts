/**
 * Token guard (ADR-0014).
 *
 * The token set is TRANSCRIBED from Claude Design, not authored here. This
 * suite pins the values so a later hand-edit can't silently drift the design,
 * and pins the [data-qa-theme] switching structure so the slate/ivory themes
 * can drop in later with zero component edits.
 *
 * If the design genuinely changes: re-sync tokens.css from the Design project
 * and update the expectations here in the same commit — deliberately, never as
 * a side effect of feature work.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const css = readFileSync(join(here, '../src/tokens.css'), 'utf8');

/** Pull a `--name:value;` declaration out of a given selector block. */
function tokenIn(selector: string, name: string): string | undefined {
  const block = css.split(selector)[1]?.split('}')[0];
  if (block === undefined) return undefined;
  const match = block.match(new RegExp(`${name}\\s*:\\s*([^;]+)[;\\s]`));
  return match?.[1]?.trim();
}

const base = (name: string) => tokenIn('[data-qa-theme]{', name);
const ghost = (name: string) => tokenIn('[data-qa-theme="ghost"]{', name);

describe('the switching pattern is intact', () => {
  it('declares a theme-independent base block', () => {
    expect(css).toContain('[data-qa-theme]{');
  });

  it('declares ghost as a named theme, not as the base', () => {
    expect(css).toContain('[data-qa-theme="ghost"]{');
  });

  it('keeps per-theme values OUT of the base block', () => {
    // Glass and ink are what a theme redefines; they must not be in base, or
    // slate/ivory could never override them cleanly.
    expect(base('--qa-glass')).toBeUndefined();
    expect(base('--qa-ink')).toBeUndefined();
  });
});

describe('base tokens — theme-independent', () => {
  it('accent set', () => {
    expect(base('--qa-accent')).toBe('#C05B41');
    expect(base('--qa-accent-ink')).toBe('#FBEEE6');
    expect(base('--qa-accent-soft')).toBe('rgba(192,91,65,.22)');
    expect(base('--qa-accent-line')).toBe('rgba(192,91,65,.55)');
  });

  it('status colours', () => {
    expect(base('--qa-danger')).toBe('#C8453A');
    expect(base('--qa-success')).toBe('#6F9463');
    expect(base('--qa-gold')).toBe('#C79A47');
  });

  it('map ground tri-tone', () => {
    expect(base('--qa-map-hi')).toBe('#2A2115');
    expect(base('--qa-map-mid')).toBe('#1B1610');
    expect(base('--qa-map-lo')).toBe('#12100A');
  });

  it('the three typefaces — prose is a serif, data is mono', () => {
    expect(base('--qa-font-display')).toBe("'IM Fell English',serif");
    expect(base('--qa-font-body')).toBe("'EB Garamond',serif");
    expect(base('--qa-font-mono')).toBe("'IBM Plex Mono',monospace");
  });

  it('spacing, radii, hairline', () => {
    expect(base('--qa-s1')).toBe('4px');
    expect(base('--qa-s4')).toBe('16px');
    expect(base('--qa-s8')).toBe('64px');
    expect(base('--qa-hud-inset')).toBe('24px');
    expect(base('--qa-radius')).toBe('6px');
    expect(base('--qa-radius-lg')).toBe('10px');
    expect(base('--qa-hairline')).toBe('1px');
  });

  it('motion — including the dice settle the roll choreography depends on', () => {
    expect(base('--qa-dur')).toBe('220ms');
    expect(base('--qa-dice-settle')).toBe('840ms');
    expect(base('--qa-ease')).toBe('cubic-bezier(.2,.7,.2,1)');
  });
});

describe('ghost theme — the only theme shipping in v1', () => {
  it('glass surfaces', () => {
    expect(ghost('--qa-glass')).toBe('rgba(19,16,9,.55)');
    expect(ghost('--qa-glass-solid')).toBe('rgba(28,24,15,.94)');
    expect(ghost('--qa-glass-border')).toBe('rgba(230,220,196,.14)');
    expect(ghost('--qa-glass-blur')).toBe('14px');
  });

  it('chip fill', () => {
    expect(ghost('--qa-chip')).toBe('rgba(230,220,196,.08)');
  });

  it('the ink triple', () => {
    expect(ghost('--qa-ink')).toBe('#E6DCC4');
    expect(ghost('--qa-ink-dim')).toBe('rgba(230,220,196,.62)');
    expect(ghost('--qa-ink-faint')).toBe('rgba(230,220,196,.34)');
  });
});
