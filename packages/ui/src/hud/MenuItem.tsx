import type { CSSProperties, MouseEvent, ReactElement, ReactNode } from 'react';

export interface MenuItemProps {
  /** Leading glyph (unicode symbol or emoji). */
  icon?: ReactNode;
  label: string;
  /** Second, dimmer line explaining the action. */
  sub?: string;
  tone?: 'default' | 'accent' | 'danger';
  onClick?: () => void;
  style?: CSSProperties;
}

/**
 * A menu / private-channel row: glyph, stacked label + explanation, hover wash.
 * Every item carries a sub-line — the app explains what a control does in place (Law 5).
 * Reserve `accent`/`danger` for navigation and destructive rows.
 *
 * Ported from components/hud/MenuItem.jsx; reads only --qa-* tokens.
 */
export function MenuItem({ icon, label, sub, tone = 'default', onClick, style = {} }: MenuItemProps): ReactElement {
  const labelColor =
    tone === 'accent' ? 'var(--qa-ember)' : tone === 'danger' ? 'var(--qa-danger)' : 'var(--qa-glass-text)';
  const wash = (e: MouseEvent<HTMLButtonElement>, on: boolean): void => {
    e.currentTarget.style.background = on ? 'var(--qa-glass-chip)' : 'transparent';
  };
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        width: '100%',
        border: 'none',
        background: 'transparent',
        borderRadius: 'var(--qa-radius)',
        cursor: 'pointer',
        transition: 'background var(--qa-dur-fast) var(--qa-ease)',
        ...style,
      }}
      onMouseEnter={(e) => wash(e, true)}
      onMouseLeave={(e) => wash(e, false)}
    >
      {icon != null && (
        <span style={{ fontSize: 14, width: 20, textAlign: 'center', flex: 'none' }}>{icon}</span>
      )}
      <span
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          textAlign: 'left',
          flex: 1,
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--qa-font-body)',
            fontSize: 13.5,
            fontWeight: 600,
            color: labelColor,
          }}
        >
          {label}
        </span>
        {sub !== undefined && (
          <span style={{ fontSize: 10.5, color: 'var(--qa-glass-dim)' }}>{sub}</span>
        )}
      </span>
    </button>
  );
}
