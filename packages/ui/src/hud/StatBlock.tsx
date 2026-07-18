import type { CSSProperties, ReactElement } from 'react';

export interface StatBlockProps {
  /** Short mono label, e.g. "DEX", "AC", "SPEED". */
  label: string;
  /** The large tabular value — a modifier ("+3"), a score ("14"), "30 ft". */
  mod: string | number;
  /** Optional secondary value shown small beneath (raw score under a modifier). */
  score?: string | number;
  size?: 'sm' | 'md' | 'lg';
  style?: CSSProperties;
}

interface SizeSpec {
  pad: string;
  label: number;
  mod: number;
  score: number;
}

const SIZES: Record<NonNullable<StatBlockProps['size']>, SizeSpec> = {
  sm: { pad: '6px 10px', label: 9, mod: 14, score: 9 },
  md: { pad: '10px 6px', label: 9.5, mod: 18, score: 10 },
  lg: { pad: '12px 8px', label: 10, mod: 22, score: 11 },
};

/**
 * Ability-score / stat cell — tiny label, big tabular value, small sub-value.
 * The signature Questra scale-contrast in miniature (whisper-label over big number).
 *
 * Ported from components/hud/StatBlock.jsx; reads only --qa-* tokens.
 */
export function StatBlock({ label, mod, score, size = 'md', style = {} }: StatBlockProps): ReactElement {
  const s = SIZES[size] ?? SIZES.md;
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        padding: s.pad,
        borderRadius: 'var(--qa-radius-sm)',
        background: 'var(--qa-glass-chip)',
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--qa-font-mono)',
          fontSize: s.label,
          letterSpacing: 1,
          color: 'var(--qa-glass-dim)',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: 'var(--qa-font-mono)',
          fontSize: s.mod,
          fontWeight: 600,
          color: 'var(--qa-glass-text)',
        }}
      >
        {mod}
      </span>
      {score != null && (
        <span style={{ fontSize: s.score, color: 'var(--qa-glass-dim)' }}>{score}</span>
      )}
    </div>
  );
}
