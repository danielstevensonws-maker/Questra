import type { CSSProperties, ReactNode, ReactElement } from 'react';

export interface LabelProps {
  children?: ReactNode;
  /** dim (default) · faint · bright · accent (ember). */
  tone?: 'dim' | 'faint' | 'bright' | 'accent';
  /** Override color with any CSS color (e.g. a semantic token). */
  accent?: string;
  style?: CSSProperties;
}

/**
 * The micro-label: tiny, uppercase, wide-tracked mono. The HUD's connective tissue.
 * Pair a 10px Label directly over a large tabular number — that scale jump is the game feel.
 *
 * Ported from components/core/Label.jsx; reads only --qa-* tokens.
 */
export function Label({ children, tone = 'dim', accent, style = {} }: LabelProps): ReactElement {
  const color =
    tone === 'accent'
      ? 'var(--qa-ember)'
      : tone === 'faint'
        ? 'var(--qa-vellum-faint)'
        : tone === 'bright'
          ? 'var(--qa-vellum)'
          : 'var(--qa-vellum-dim)';
  return (
    <span
      style={{
        fontFamily: 'var(--qa-font-mono)',
        fontSize: 10,
        letterSpacing: 'var(--qa-track-label)',
        textTransform: 'uppercase',
        color: accent ?? color,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
