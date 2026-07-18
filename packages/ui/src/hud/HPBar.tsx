import type { CSSProperties, ReactElement } from 'react';

export interface HPBarProps {
  value?: number;
  max?: number;
  /** Show the mono `22/27` readout after the bar. */
  showText?: boolean;
  /** Enemy bar — reads ember at all fill levels. */
  foe?: boolean;
  /** Track height in px (5 default; 7 for the portrait panel). */
  height?: number;
  style?: CSSProperties;
}

/**
 * Party / creature hit-point bar; turns ember when bloodied (below 40%).
 * The colour shift IS the information — glanceable danger with no numbers (Law 4).
 * `foe` bars read ember throughout.
 *
 * Ported from components/hud/HPBar.jsx; reads only --qa-* tokens.
 */
export function HPBar({
  value = 0,
  max = 1,
  showText = true,
  foe = false,
  height = 5,
  style = {},
}: HPBarProps): ReactElement {
  const pct = Math.max(0, Math.min(1, value / max));
  const low = pct < 0.4;
  const fill = foe || low ? 'var(--qa-hp-low)' : 'var(--qa-hp-full)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...style }}>
      <div
        style={{
          flex: 1,
          height,
          borderRadius: 3,
          background: 'var(--qa-hp-track)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct * 100}%`,
            height: '100%',
            borderRadius: 3,
            background: fill,
            transition: 'width var(--qa-dur-slow) var(--qa-ease)',
          }}
        />
      </div>
      {showText && (
        <span
          style={{
            fontFamily: 'var(--qa-font-mono)',
            fontSize: 10,
            color: 'var(--qa-vellum-dim)',
            whiteSpace: 'nowrap',
          }}
        >
          {value}/{max}
        </span>
      )}
    </div>
  );
}
