import type { CSSProperties, ReactNode, ReactElement } from 'react';

export interface PanelProps {
  /** Tiny mono uppercase header label, e.g. "WHAT ONLY YOU KNOW". */
  label?: string;
  /** Show a — / + collapse control. Every HUD panel should be collapsible. */
  collapsible?: boolean;
  collapsed?: boolean;
  onToggle?: () => void;
  /** Raised = menus/modals: heavier fill + stronger blur. */
  raised?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
}

/**
 * The floating translucent glass shell. Everything on a HUD lives inside one.
 * Panels sit in fixed positions and never move — muscle memory is a feature.
 * Never solid — the battlemap must read through it.
 *
 * Ported from components/core/Panel.jsx; reads only --qa-* tokens.
 */
export function Panel({
  label,
  collapsible = false,
  collapsed = false,
  onToggle,
  raised = false,
  children,
  style = {},
}: PanelProps): ReactElement {
  const blur = raised ? 'var(--qa-blur-raised)' : 'var(--qa-blur)';
  const shell: CSSProperties = {
    borderRadius: 'var(--qa-radius-md)',
    background: raised ? 'var(--qa-glass-raised)' : 'var(--qa-glass)',
    border: '1px solid var(--qa-glass-border)',
    backdropFilter: `blur(${blur})`,
    WebkitBackdropFilter: `blur(${blur})`,
    color: 'var(--qa-glass-text)',
    display: 'flex',
    flexDirection: 'column',
    ...style,
  };

  return (
    <div style={shell}>
      {label !== undefined && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 13px',
            borderBottom: collapsed ? 'none' : '1px solid var(--qa-glass-border)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--qa-font-mono)',
              fontSize: 10,
              letterSpacing: 'var(--qa-track-label)',
              color: 'var(--qa-glass-dim)',
            }}
          >
            {label}
          </span>
          {collapsible && (
            <button
              onClick={onToggle}
              title={collapsed ? 'Expand' : 'Collapse'}
              style={{
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: 'var(--qa-glass-dim)',
                fontSize: 13,
                lineHeight: 1,
                padding: 0,
              }}
            >
              {collapsed ? '+' : '—'}
            </button>
          )}
        </div>
      )}
      {!collapsed && (
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
      )}
    </div>
  );
}
