import type { CSSProperties, ReactElement } from 'react';

export interface AbilityCardProps {
  name: string;
  /** Cost / kind: "ACTION" | "BONUS" | "REACTION" | "RIDER". */
  tag: string;
  /** What it does when legal (damage, range). */
  note?: string;
  /** If set, the ability is illegal now; this italic reason replaces the note. */
  reason?: string;
  style?: CSSProperties;
}

/**
 * A player's action tile — legal ones invite a tap, illegal ones dim and explain why.
 * The app teaches the rules by only ever offering legal moves and showing why (Law 5):
 * pass `reason` only when illegal and the component handles the dim + disabled + italic.
 *
 * Ported from components/hud/AbilityCard.jsx; reads only --qa-* tokens.
 */
export function AbilityCard({ name, tag, note, reason, style = {} }: AbilityCardProps): ReactElement {
  const legal = reason === undefined;
  return (
    <button
      disabled={!legal}
      style={{
        width: 116,
        height: 100,
        padding: '10px 11px',
        borderRadius: 'var(--qa-radius)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        background: 'var(--qa-glass)',
        border: '1px solid var(--qa-glass-border)',
        backdropFilter: 'blur(var(--qa-blur))',
        WebkitBackdropFilter: 'blur(var(--qa-blur))',
        color: legal ? 'var(--qa-glass-text)' : 'var(--qa-glass-dim)',
        opacity: legal ? 1 : 0.55,
        cursor: legal ? 'pointer' : 'not-allowed',
        fontFamily: 'var(--qa-font-body)',
        textAlign: 'left',
        transition:
          'border-color var(--qa-dur) var(--qa-ease), transform var(--qa-dur) var(--qa-ease)',
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--qa-font-mono)',
          fontSize: 8.5,
          letterSpacing: 1.2,
          padding: '2px 6px',
          borderRadius: 4,
          background: 'var(--qa-glass-chip)',
          color: legal ? 'var(--qa-glass-text)' : 'var(--qa-glass-dim)',
        }}
      >
        {tag}
      </span>
      <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.15 }}>{name}</span>
      <span
        style={{
          fontSize: 10,
          lineHeight: 1.3,
          fontStyle: legal ? 'normal' : 'italic',
          color: 'var(--qa-glass-dim)',
        }}
      >
        {reason ?? note}
      </span>
    </button>
  );
}
