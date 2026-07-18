import type { CSSProperties, ReactNode, ReactElement } from 'react';

export interface ButtonProps {
  /** Visual treatment. `hex` is the hero CTA; `primary` for standard commit actions. */
  variant?: 'primary' | 'hex' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  disabled?: boolean;
  children?: ReactNode;
  onClick?: () => void;
  title?: string;
  style?: CSSProperties;
}

/**
 * Questra action button in the warm ember family.
 * Never spend ember on more than one primary/hex action per view — restraint is the strategy.
 *
 * Ported verbatim from the design-system reference (components/core/Button.jsx);
 * reads only --qa-* tokens.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  children,
  onClick,
  title,
  style = {},
}: ButtonProps): ReactElement {
  const pad = size === 'sm' ? '8px 14px' : '12px 26px';
  const fontSize = size === 'sm' ? 13 : 15;

  const base: CSSProperties = {
    fontFamily: 'var(--qa-font-display)',
    fontSize,
    letterSpacing: '.5px',
    cursor: disabled ? 'default' : 'pointer',
    border: 'none',
    borderRadius: 'var(--qa-radius-sm)',
    transition:
      'filter var(--qa-dur) var(--qa-ease), transform var(--qa-dur-fast) var(--qa-ease), color var(--qa-dur) var(--qa-ease), border-color var(--qa-dur) var(--qa-ease)',
    opacity: disabled ? 0.4 : 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  };

  const handleClick = disabled ? undefined : onClick;

  if (variant === 'ghost') {
    return (
      <button
        title={title}
        onClick={handleClick}
        style={{
          ...base,
          background: 'none',
          padding: '2px 4px',
          fontFamily: 'var(--qa-font-body)',
          fontStyle: 'italic',
          color: 'var(--qa-vellum-dim)',
          borderBottom: '1px solid var(--qa-hairline)',
          borderRadius: 0,
          ...style,
        }}
      >
        {children}
      </button>
    );
  }

  if (variant === 'secondary') {
    return (
      <button
        title={title}
        onClick={handleClick}
        style={{
          ...base,
          padding: pad,
          background: 'var(--qa-glass-chip)',
          border: '1px solid var(--qa-glass-border)',
          color: 'var(--qa-vellum)',
          fontFamily: 'var(--qa-font-body)',
          ...style,
        }}
      >
        {children}
      </button>
    );
  }

  if (variant === 'hex') {
    // double-layer hexagon: 1px ember-lit border frame + dark interior
    const outer =
      'polygon(13px 0%, calc(100% - 13px) 0%, 100% 50%, calc(100% - 13px) 100%, 13px 100%, 0% 50%)';
    const inner =
      'polygon(12.5px 0%, calc(100% - 12.5px) 0%, calc(100% - 1px) 50%, calc(100% - 12.5px) 100%, 12.5px 100%, 1px 50%)';
    return (
      <span
        style={{
          display: 'inline-block',
          padding: 1,
          background: 'linear-gradient(180deg,#D97B5F,#8E4230)',
          clipPath: outer,
          opacity: disabled ? 0.4 : 1,
        }}
      >
        <button
          title={title}
          onClick={handleClick}
          style={{
            ...base,
            display: 'block',
            padding: '10px 30px',
            background: 'linear-gradient(180deg,#221A0E,#161109)',
            color: 'var(--qa-vellum)',
            clipPath: inner,
            borderRadius: 0,
            ...style,
          }}
        >
          {children}
        </button>
      </span>
    );
  }

  // primary — solid ember gradient with warm glow
  return (
    <button
      title={title}
      onClick={handleClick}
      style={{
        ...base,
        padding: pad,
        background: 'linear-gradient(180deg,var(--qa-ember),var(--qa-ember-deep))',
        color: 'var(--qa-vellum-bright)',
        boxShadow: 'var(--qa-glow-ember)',
        ...style,
      }}
    >
      {children}
    </button>
  );
}
