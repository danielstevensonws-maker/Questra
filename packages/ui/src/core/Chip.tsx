import type { CSSProperties, ReactNode, ReactElement } from 'react';

export interface ChipProps {
  children?: ReactNode;
  /** Semantic tone. Each hue means one thing — `danger` = Bloodied, `arcane` = spell, etc. */
  tone?: 'default' | 'danger' | 'accent' | 'heal' | 'arcane' | 'steel' | 'gold' | 'bright';
  /** Hairline outline instead of the ghost fill. Use for badges over imagery. */
  outline?: boolean;
  style?: CSSProperties;
}

interface ChipTone {
  fg: string;
  bd: string;
}

const TONES: Record<NonNullable<ChipProps['tone']>, ChipTone> = {
  default: { fg: 'var(--qa-vellum-dim)', bd: 'var(--qa-hairline)' },
  danger: { fg: 'var(--qa-danger)', bd: 'rgba(192,86,62,.5)' },
  accent: { fg: 'var(--qa-ember-bright)', bd: 'rgba(192,91,65,.5)' },
  heal: { fg: 'var(--qa-heal)', bd: 'rgba(143,184,154,.5)' },
  arcane: { fg: 'var(--qa-arcane)', bd: 'rgba(154,143,184,.5)' },
  steel: { fg: 'var(--qa-steel)', bd: 'rgba(143,163,184,.5)' },
  gold: { fg: 'var(--qa-gold)', bd: 'rgba(214,150,90,.5)' },
  bright: { fg: 'var(--qa-vellum)', bd: 'var(--qa-hairline)' },
};

/**
 * Tiny mono status pill for conditions, tags and badges (Bloodied, Concentrating, NEW ENTRY).
 * Whispers by default; tone carries meaning, not decoration.
 *
 * Ported from components/core/Chip.jsx; reads only --qa-* tokens (the tone-border
 * rgba() values are the semantic hues at 0.5 alpha, matching the reference verbatim).
 */
export function Chip({ children, tone = 'default', outline = false, style = {} }: ChipProps): ReactElement {
  const t = TONES[tone] ?? TONES.default;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: 'var(--qa-font-mono)',
        fontSize: 'var(--qa-text-micro)',
        letterSpacing: 'var(--qa-track-label)',
        textTransform: 'uppercase',
        padding: '2px 7px',
        borderRadius: 'var(--qa-radius-xs)',
        color: t.fg,
        background: outline ? 'transparent' : 'var(--qa-vellum-ghost)',
        border: outline ? `1px solid ${t.bd}` : 'none',
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  );
}
