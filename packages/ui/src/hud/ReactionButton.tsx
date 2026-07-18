import type { CSSProperties, MouseEvent, ReactElement } from 'react';

export interface ReactionButtonProps {
  /** The emoji to fling. */
  emoji: string;
  onClick?: () => void;
  size?: number;
  style?: CSSProperties;
}

/**
 * Round glass emoji reaction button — the sanctioned use of emoji in Questra.
 * A reaction thrown during someone else's turn costs zero reading (Law 4).
 * Keep the set small (6); emoji are NOT allowed anywhere else in the product.
 *
 * Ported from components/hud/ReactionButton.jsx; reads only --qa-* tokens.
 */
export function ReactionButton({ emoji, onClick, size = 34, style = {} }: ReactionButtonProps): ReactElement {
  const scale = (e: MouseEvent<HTMLButtonElement>, v: string): void => {
    e.currentTarget.style.transform = v;
  };
  return (
    <button
      onClick={onClick}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: '1px solid var(--qa-glass-border)',
        background: 'var(--qa-glass)',
        backdropFilter: 'blur(var(--qa-blur))',
        WebkitBackdropFilter: 'blur(var(--qa-blur))',
        fontSize: Math.round(size * 0.44),
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        transition: 'transform var(--qa-dur-fast) var(--qa-ease), background var(--qa-dur) var(--qa-ease)',
        ...style,
      }}
      onMouseEnter={(e) => scale(e, 'scale(1.18)')}
      onMouseLeave={(e) => scale(e, 'scale(1)')}
      onMouseDown={(e) => scale(e, 'scale(.92)')}
      onMouseUp={(e) => scale(e, 'scale(1.18)')}
    >
      {emoji}
    </button>
  );
}
