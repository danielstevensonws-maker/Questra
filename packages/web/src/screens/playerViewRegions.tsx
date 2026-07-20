/**
 * Player View chrome that has no existing primitive of its own: the scene header
 * and the party rail (design request §1 regions). Everything else on the screen —
 * identity, vitals, action bar, dice log — is the real PlayerHub primitive,
 * composed by PlayerView (never reinvented here; CLAUDE.md: screens compose
 * primitives). All colour via --qa-* tokens (ghost theme).
 */
import type { CSSProperties, ReactElement } from 'react';
import { Panel, HPBar, Avatar } from '@questra/ui';
import { Region } from './Stage.js';

const mono: CSSProperties = { fontFamily: 'var(--qa-font-mono)' };
const serif: CSSProperties = { fontFamily: 'var(--qa-font-body)' };
const label: CSSProperties = {
  ...mono, fontSize: 10, letterSpacing: 'var(--qa-track-label)',
  textTransform: 'uppercase', color: 'var(--qa-glass-dim)',
};

// ---------------------------------------------------------------- scene header
export interface SceneVM {
  title: string;
  subtitle?: string;
  round: number;
  turnName?: string;
  timer?: string;
}

export function SceneHeader({ scene }: { scene: SceneVM }): ReactElement {
  return (
    <Region style={{ top: 14, left: '50%', transform: 'translateX(-50%)' }} aria-label="scene">
      <Panel style={{ padding: '8px 22px', flexDirection: 'row', alignItems: 'center', gap: 22 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--qa-font-display)', fontSize: 'var(--qa-text-lg)', color: 'var(--qa-glass-text)', lineHeight: 1.1 }}>
            {scene.title}
          </div>
          {scene.subtitle && <div style={label}>{scene.subtitle}</div>}
        </div>
        <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--qa-glass-border)' }} />
        <span style={label}>Round <span style={{ color: 'var(--qa-glass-text)' }}>{scene.round}</span></span>
        {scene.turnName && (
          <span style={{ ...mono, fontSize: 11, letterSpacing: 'var(--qa-track-label)', textTransform: 'uppercase', color: 'var(--qa-ember)' }}>
            {scene.turnName}
          </span>
        )}
        {scene.timer && <span style={{ ...mono, fontSize: 12, color: 'var(--qa-glass-dim)' }}>{scene.timer}</span>}
      </Panel>
    </Region>
  );
}

// ---------------------------------------------------------------- party rail
export interface PartyMemberVM {
  id: string;
  name: string;
  klass: string;
  hp: number;
  maxHp: number;
  classColor?: string;
  isYou?: boolean;
}

export function PartyRail({ members }: { members: PartyMemberVM[] }): ReactElement {
  return (
    <Region style={{ top: 72, left: 20, width: 236 }} aria-label="party">
      <Panel label={`PARTY · ${members.length}`} collapsible>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar initial={m.name.charAt(0)} shape="square" size={34} {...(m.classColor ? { color: m.classColor } : {})} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ ...serif, fontSize: 'var(--qa-text-sm)', color: 'var(--qa-glass-text)' }}>{m.name}</span>
                  {m.isYou && <span style={{ ...label, color: 'var(--qa-ember)' }}>YOU</span>}
                </div>
                <div style={{ ...label, marginBottom: 3 }}>{m.klass}</div>
                <HPBar value={m.hp} max={m.maxHp} showText height={5} />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </Region>
  );
}

// ---------------------------------------------------------------- terrain
/** An inline SVG ground for the yard so the map isn't a black grid (a generated
 *  terrain image fills this ref in the real app via the Session Planner, Brief 09a). */
export function yardTerrain(): string {
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="672">` +
      `<defs><radialGradient id="g" cx="42%" cy="34%">` +
      `<stop offset="0%" stop-color="#4a3f27"/><stop offset="55%" stop-color="#2b2214"/>` +
      `<stop offset="100%" stop-color="#15100a"/></radialGradient></defs>` +
      `<rect width="960" height="672" fill="url(#g)"/>` +
      `<path d="M0 430 Q460 340 960 470" stroke="#5c4c2e" stroke-width="46" fill="none" opacity="0.55"/>` +
      `<path d="M120 0 Q220 300 90 672" stroke="#3c3016" stroke-width="30" fill="none" opacity="0.4"/>` +
      `<circle cx="700" cy="230" r="120" fill="#2f2717" opacity="0.35"/>` +
      `</svg>`,
    )
  );
}
