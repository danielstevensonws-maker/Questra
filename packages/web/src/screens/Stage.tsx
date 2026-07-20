/**
 * Stage — the fixed 1728×1080 composition surface (Player View design request §1).
 *
 * Everything in the Player View is positioned on this stage in absolute px; the
 * stage is uniformly scaled to fit the viewport (letterboxed, origin top-left),
 * so the composition stays byte-exact at any window size. The prototype does this
 * and the request says keep it.
 *
 *   scale = min(vw / 1728, vh / 1080)
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type ReactElement } from 'react';

export const STAGE_W = 1728;
export const STAGE_H = 1080;

export function Stage({ children }: { children: ReactNode }): ReactElement {
  const [scale, setScale] = useState(1);
  const outer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fit = (): void => {
      const el = outer.current;
      const vw = el?.clientWidth ?? window.innerWidth;
      const vh = el?.clientHeight ?? window.innerHeight;
      setScale(Math.min(vw / STAGE_W, vh / STAGE_H));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const outerStyle: CSSProperties = {
    position: 'fixed', inset: 0, background: 'var(--qa-ink)',
    display: 'grid', placeItems: 'center', overflow: 'hidden',
  };
  const stageStyle: CSSProperties = {
    position: 'relative', width: STAGE_W, height: STAGE_H,
    transform: `scale(${scale})`, transformOrigin: 'center center',
    fontFamily: 'var(--qa-font-body)',
  };

  return (
    <div ref={outer} style={outerStyle}>
      <div style={stageStyle}>{children}</div>
    </div>
  );
}

/** A stage-positioned region. Coordinates are absolute px on the 1728×1080 stage. */
export function Region({
  style, children, 'aria-label': label,
}: { style: CSSProperties; children: ReactNode; 'aria-label'?: string }): ReactElement {
  return (
    <div aria-label={label} style={{ position: 'absolute', ...style }}>
      {children}
    </div>
  );
}
