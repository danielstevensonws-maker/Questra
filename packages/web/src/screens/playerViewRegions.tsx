/**
 * Player View regions (design request §1 layout). Each is a stage-positioned glass
 * surface over the full-bleed map. Coordinates are absolute px on the 1728×1080
 * stage. All colour via --qa-* tokens (ghost theme). These are composed by
 * PlayerView; the data comes from live sync state.
 */
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { Panel, HPBar, Avatar, Chip } from '@questra/ui';
import { Region } from './Stage.js';
import type { VitalsVM, ActionTileVM } from '../primitives/sheetToPlayerHub.js';
import type { DiceLogEntry } from '../primitives/DiceLog.js';

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
  turnName?: string;   // whose turn ("Wren's turn")
  timer?: string;      // "01:42:20"
}

export function SceneHeader({ scene }: { scene: SceneVM }): ReactElement {
  return (
    <Region style={{ top: 14, left: '50%', transform: 'translateX(-50%)' }} aria-label="scene">
      <Panel style={{ padding: '8px 22px', flexDirection: 'row', alignItems: 'center', gap: 22 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ ...serif, fontFamily: 'var(--qa-font-display)', fontSize: 'var(--qa-text-lg)', color: 'var(--qa-glass-text)', lineHeight: 1.1 }}>
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
  klass: string;   // "Fighter · Lv 3"
  hp: number;
  maxHp: number;
  classColor?: string;
  isYou?: boolean;
}

export function PartyRail({ members }: { members: PartyMemberVM[] }): ReactElement {
  return (
    <Region style={{ top: 72, left: 20, width: 232 }} aria-label="party">
      <Panel label={`PARTY · ${members.length}`} collapsible style={{ gap: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {members.map((m) => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative' }}>
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

// ---------------------------------------------------------------- identity + vitals
export function IdentityVitals({
  identity, vitals,
}: {
  identity: { name: string; level: number; className?: string; classColor?: string };
  vitals: VitalsVM;
}): ReactElement {
  return (
    <Region style={{ bottom: 20, left: 20, width: 300 }} aria-label="identity">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Panel style={{ padding: '10px 13px', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Avatar initial={identity.name.charAt(0)} shape="square" size={44} {...(identity.classColor ? { color: identity.classColor } : {})} />
          <div>
            <div style={{ ...serif, fontFamily: 'var(--qa-font-display)', fontSize: 'var(--qa-text-xl)', color: 'var(--qa-glass-text)', lineHeight: 1.05 }}>
              {identity.name}
            </div>
            <div style={label}>{identity.className ? `${identity.className} · ` : ''}Level {identity.level}</div>
          </div>
        </Panel>
        <Panel label="VITALS" style={{ gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ ...label }}>HP</span>
            <div style={{ flex: 1 }}><HPBar value={vitals.hp.current} max={vitals.hp.max} height={7} /></div>
            <span style={{ ...mono, fontSize: 13, color: 'var(--qa-glass-text)' }}>{vitals.hp.current} / {vitals.hp.max}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Chip outline>AC {vitals.ac.value}</Chip>
            {vitals.bloodied && <Chip tone="danger">Bloodied</Chip>}
            {vitals.conditions.map((c) => <Chip key={c.id} tone="steel">{c.name}</Chip>)}
          </div>
        </Panel>
      </div>
    </Region>
  );
}

// ---------------------------------------------------------------- action bar
export function ActionBarRegion({
  tiles, targetName, moveLeft, yourTurn, onUse,
}: {
  tiles: ActionTileVM[];
  targetName?: string;
  moveLeft?: string;
  yourTurn: boolean;
  onUse: (id: string) => void;
}): ReactElement {
  const rows: Array<'action' | 'bonus' | 'reaction'> = ['action', 'bonus', 'reaction'];
  return (
    <Region style={{ bottom: 20, left: '50%', transform: 'translateX(-50%)', width: 760 }} aria-label="actions">
      <Panel style={{ gap: 10 }}>
        {/* top strip: turn badge · target · move */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
          <Chip tone={yourTurn ? 'accent' : 'default'}>{yourTurn ? 'YOUR TURN' : 'WAITING…'}</Chip>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={label}>Target</span>
            <Chip tone="accent">{targetName ?? '—'}</Chip>
          </div>
          <span style={{ ...label }}>{moveLeft ?? ''}</span>
        </div>
        {/* the three economy rows */}
        {rows.map((row) => {
          const rowTiles = tiles.filter((t) => t.economy === row);
          return (
            <div key={row} style={{ display: 'flex', alignItems: 'stretch', gap: 10 }}>
              <span style={{ ...label, width: 66, alignSelf: 'center' }}>{row}</span>
              <div style={{ display: 'flex', gap: 10, flex: 1 }}>
                {rowTiles.length === 0
                  ? <span style={{ ...serif, fontSize: 12, fontStyle: 'italic', color: 'var(--qa-glass-dim)', alignSelf: 'center' }}>Nothing here this turn.</span>
                  : rowTiles.map((t) => <ActionTile key={t.id} tile={t} onUse={onUse} />)}
              </div>
            </div>
          );
        })}
      </Panel>
    </Region>
  );
}

function ActionTile({ tile, onUse }: { tile: ActionTileVM; onUse: (id: string) => void }): ReactElement {
  const greyed = tile.greyReason !== null;
  return (
    <button
      type="button"
      disabled={greyed}
      onClick={() => onUse(tile.id)}
      title={tile.greyReason ?? tile.name}
      style={{
        flex: 1, textAlign: 'left', cursor: greyed ? 'default' : 'pointer',
        opacity: greyed ? 0.5 : 1, padding: '8px 11px', borderRadius: 'var(--qa-radius-sm)',
        background: 'var(--qa-glass-chip)', border: '1px solid var(--qa-glass-border)',
        color: 'var(--qa-glass-text)',
      }}
    >
      <div style={{ ...serif, fontSize: 'var(--qa-text-sm)', marginBottom: 3 }}>{tile.name}</div>
      <div style={{ display: 'flex', gap: 8, ...mono, fontSize: 10, color: 'var(--qa-glass-dim)' }}>
        {tile.toHit !== undefined && <span>+{tile.toHit}</span>}
        {tile.damage && <span>{tile.damage} {tile.damageType}</span>}
        {tile.resourceTag && <span>{tile.resourceTag}</span>}
      </div>
    </button>
  );
}

// ---------------------------------------------------------------- log + chat
export function LogChat({ entries, children }: { entries: DiceLogEntry[]; children?: ReactNode }): ReactElement {
  return (
    <Region style={{ bottom: 20, right: 20, width: 344, height: 520 }} aria-label="log">
      <Panel label="TABLE · DICE LOG" collapsible style={{ height: '100%' }}>
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 10 }}>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {entries.length === 0
              ? <span style={{ ...serif, fontSize: 12, fontStyle: 'italic', color: 'var(--qa-glass-dim)' }}>Rolls and story will gather here once the session starts.</span>
              : entries.map((e) => <LogEntry key={e.id} entry={e} />)}
          </div>
          {children}
        </div>
      </Panel>
    </Region>
  );
}

function LogEntry({ entry }: { entry: DiceLogEntry }): ReactElement {
  if (entry.tone === 'roll') {
    return (
      <div style={{ borderLeft: '2px solid var(--qa-ember)', paddingLeft: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ ...serif, fontSize: 'var(--qa-text-sm)', color: 'var(--qa-glass-text)' }}>{entry.text}</span>
          {entry.total !== undefined && <span style={{ ...mono, fontSize: 16, color: 'var(--qa-ember)' }}>{entry.total}</span>}
        </div>
        {entry.breakdown && entry.breakdown.length > 0 && (
          <div style={{ ...mono, fontSize: 10, color: 'var(--qa-glass-dim)', marginTop: 2 }}>
            {entry.breakdown.map((b, i) => (
              <span key={i}>{i > 0 ? ' · ' : ''}{b.label} {b.value >= 0 ? '+' : ''}{b.value}</span>
            ))}
          </div>
        )}
      </div>
    );
  }
  // narration — the storytelling voice (IM Fell / display serif)
  return (
    <div style={{ ...serif, fontFamily: 'var(--qa-font-display)', fontSize: 'var(--qa-text-sm)', color: 'var(--qa-glass-text)', fontStyle: 'italic', lineHeight: 1.35 }}>
      {entry.text}
    </div>
  );
}
