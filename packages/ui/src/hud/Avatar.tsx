import type { CSSProperties, ReactElement } from 'react';

export interface AvatarProps {
  /** Single display-serif initial. */
  initial: string;
  /** Class identity colour — use the --qa-class-* tokens. */
  color?: string;
  shape?: 'square' | 'circle';
  /** Edge length in px. */
  size?: number;
  style?: CSSProperties;
}

/**
 * Class-tinted initial tile for party cards, the sheet header and hero lists.
 * Always drive `color` from a --qa-class-* token so a character's hue is consistent
 * everywhere they appear.
 *
 * Ported from components/hud/Avatar.jsx; reads only --qa-* tokens.
 */
export function Avatar({
  initial,
  color = 'var(--qa-class-neutral)',
  shape = 'square',
  size = 40,
  style = {},
}: AvatarProps): ReactElement {
  return (
    <div
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: shape === 'circle' ? '50%' : 'var(--qa-radius-sm)',
        background: `color-mix(in srgb, ${color} 24%, transparent)`,
        border: `1px solid color-mix(in srgb, ${color} 60%, transparent)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--qa-font-display)',
        fontWeight: 600,
        fontSize: Math.round(size * 0.42),
        color: 'var(--qa-glass-text)',
        ...style,
      }}
    >
      {initial}
    </div>
  );
}
