import type { CSSProperties, ReactElement } from 'react';

export interface MapTokenProps {
  /** Mono initial(s): "W", "G1". */
  label: string;
  /** Class colour (allies) or --qa-danger (foes). */
  color?: string;
  /** Enemy — slightly lower fill alpha. */
  foe?: boolean;
  /** Spotlit / selected — gets the vellum ring. */
  active?: boolean;
  /** Optional status tag rendered beneath (Bloodied, Unhurt). */
  tag?: string;
  size?: number;
  style?: CSSProperties;
}

/**
 * A draggable creature disk for the shared battle map. Class/foe colour at low
 * alpha with a solid ring, a mono initial, and an optional status tag beneath.
 * `active` gets the vellum spotlight ring — only one token is spotlit at a time.
 * Drag handling lives in the screen, not the component.
 *
 * Ported from components/hud/MapToken.jsx; reads only --qa-* tokens.
 */
export function MapToken({
  label,
  color = 'var(--qa-class-neutral)',
  foe = false,
  active = false,
  tag,
  size = 52,
  style = {},
}: MapTokenProps): ReactElement {
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        background: `color-mix(in srgb, ${color} ${foe ? 18 : 24}%, transparent)`,
        border: `2px solid ${active ? 'var(--qa-vellum)' : color}`,
        boxShadow: active
          ? '0 0 0 4px rgba(230,220,196,.35), 0 4px 14px rgba(0,0,0,.5)'
          : '0 4px 14px rgba(0,0,0,.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--qa-font-mono)',
          fontSize: Math.round(size * 0.28),
          fontWeight: 600,
          color: '#F0E8D4',
          textShadow: '0 1px 3px rgba(0,0,0,.6)',
        }}
      >
        {label}
      </span>
      {tag !== undefined && (
        <span
          style={{
            position: 'absolute',
            top: '106%',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: 'var(--qa-font-mono)',
            fontSize: 9,
            letterSpacing: 0.5,
            padding: '2px 7px',
            borderRadius: 5,
            background: 'rgba(5,6,9,.6)',
            color: tag === 'Unhurt' ? 'rgba(230,220,196,.75)' : 'var(--qa-ember-bright)',
            whiteSpace: 'nowrap',
          }}
        >
          {tag}
        </span>
      )}
    </div>
  );
}
