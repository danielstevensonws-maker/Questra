/**
 * PlayerView — the composed player screen (design request §1), the M2 slice's
 * visible half. A fixed 1728×1080 stage: the map is the full-bleed ground; the HUD
 * floats over it as glass. It COMPOSES the real primitives — VitalsBar, ActionBar,
 * DiceLog (each already restyled to the prototype) — laid out to the prototype's
 * arrangement (party rail + identity/vitals/actions left, map center, dice log
 * right). It does not reinvent them (CLAUDE.md).
 *
 * Live state comes from the sync client; the DiceTray rolls on the MAP surface and
 * the *result* lands in the DiceLog (design request §6, ADR-0008).
 *
 * Scope (this pass): the core frame + live wiring. Folio drawer, dying/first-contact
 * states, theme switcher, chat composer are the rest of Brief 10 (later passes).
 */
import { useMemo, type CSSProperties, type ReactElement } from 'react';
import type { ComputedSheet, Room, Cell, PlayEvent } from '@questra/contracts';
import type { Combatant } from '@questra/engine';
import { Panel } from '@questra/ui';
import { MapCanvas } from '../primitives/MapCanvas.js';
import { DiceTray } from '../primitives/DiceTray.js';
import { VitalsBar } from '../primitives/VitalsBar.js';
import { ActionBar } from '../primitives/ActionBar.js';
import { DiceLog } from '../primitives/DiceLog.js';
import { Stage, Region, STAGE_W, STAGE_H } from './Stage.js';
import {
  SceneHeader, PartyRail, yardTerrain,
  type SceneVM, type PartyMemberVM,
} from './playerViewRegions.js';
import { toVitals, toActionTiles } from '../primitives/sheetToPlayerHub.js';
import type { DiceLogEntry } from '../primitives/DiceLog.js';
import { useSync } from '../sync/useSync.js';

export interface PlayerViewProps {
  url: string;
  playSessionId: string;
  token: string;
  myCreatureId: string;
  sheet: ComputedSheet;
  identity: { name: string; level: number; className?: string; classColor?: string };
  room: Room;
  scene: { title: string; subtitle?: string; timer?: string };
  party: Array<{ id: string; name: string; klass: string; classColor?: string }>;
}

const mono: CSSProperties = { fontFamily: 'var(--qa-font-mono)' };
const label: CSSProperties = {
  ...mono, fontSize: 10, letterSpacing: 'var(--qa-track-label)',
  textTransform: 'uppercase', color: 'var(--qa-glass-dim)',
};

/** Roll + narration events → DiceLog entries (design request §6: result lands here). */
function toLog(log: PlayEvent[], nameOf: (id: string) => string): DiceLogEntry[] {
  const out: DiceLogEntry[] = [];
  for (const e of log) {
    if (e.body.t === 'roll_made') {
      const verb = e.body.outcome === 'hit' || e.body.outcome === 'crit' ? 'Hit'
        : e.body.outcome === 'miss' || e.body.outcome === 'fumble' ? 'Miss' : e.body.outcome;
      out.push({ id: e.id, text: `Attack — ${verb}`, breakdown: e.body.modifiers, total: e.body.total, tone: 'roll' });
    } else if (e.body.t === 'narration') {
      out.push({ id: e.id, text: e.body.text, tone: 'narration' });
    } else if (e.body.t === 'damage_applied') {
      out.push({ id: e.id, text: `${nameOf(e.body.creatureId)} takes ${e.body.amount} ${e.body.type}.`, tone: 'narration' });
    }
  }
  return out;
}

export function PlayerView(props: PlayerViewProps): ReactElement {
  const { url, playSessionId, token, myCreatureId, sheet, identity, room, scene, party } = props;
  const { state, lastRoll, sendIntent } = useSync({ url, playSessionId, token });

  const combatants = state.projection.combatants;
  const me: Combatant | undefined = combatants[myCreatureId];
  const nameOf = (id: string): string => combatants[id]?.name ?? id;

  const targetId = useMemo(
    () => Object.values(combatants).find((c) => !c.isPlayer)?.id,
    [combatants],
  );
  const targetName = targetId ? combatants[targetId]?.name : undefined;

  const partyVM: PartyMemberVM[] = useMemo(
    () => party.map((p) => {
      const c = combatants[p.id];
      return {
        id: p.id, name: p.name, klass: p.klass,
        hp: c?.hp ?? 0, maxHp: c?.maxHp ?? 1,
        ...(p.classColor ? { classColor: p.classColor } : {}),
        isYou: p.id === myCreatureId,
      };
    }),
    [party, combatants, myCreatureId],
  );

  const yourTurn = state.projection.activeCreatureId === undefined
    || state.projection.activeCreatureId === myCreatureId;

  const onUse = (tileId: string): void => {
    if (!me || !targetId) return;
    if (tileId.startsWith('attack.')) {
      sendIntent(`attack-${me.id}-${Date.now()}`, {
        kind: 'attack', attackerId: me.id, targetId, actionName: tileId.slice('attack.'.length),
      });
    } else if (tileId.startsWith('feature.')) {
      sendIntent(`feature-${me.id}-${Date.now()}`, { kind: 'use_feature', creatureId: me.id, featureId: tileId.slice('feature.'.length) });
    }
  };

  // the map: real terrain ground + class-coloured tokens + your spotlight ring.
  const tokenMeta = (ref: string): { color?: string; foe?: boolean; tag?: string } | undefined => {
    const c = combatants[ref];
    if (!c) return undefined;
    if (c.isPlayer) return { color: identity.classColor ?? 'var(--qa-class-fighter)' };
    const bloodied = c.hp > 0 && c.hp <= Math.floor(c.maxHp / 2);
    return { foe: true, ...(bloodied ? { tag: 'Bloodied' } : c.hp <= 0 ? { tag: 'Down' } : {}) };
  };
  const youTokenId = room.tokens.find((t) => t.creatureRef === myCreatureId)?.id;
  const myCell: Cell | undefined = room.tokens.find((t) => t.creatureRef === myCreatureId)?.cell;
  const cellPx = Math.round(STAGE_W / room.gridSize.w);

  const sceneVM: SceneVM = {
    title: scene.title,
    ...(scene.subtitle ? { subtitle: scene.subtitle } : {}),
    ...(scene.timer ? { timer: scene.timer } : {}),
    round: state.projection.round,
    ...(state.projection.activeCreatureId ? { turnName: `${nameOf(state.projection.activeCreatureId)}'s turn` } : {}),
  };

  return (
    <Stage>
      {/* the map is the ground — full-bleed, real terrain + tokens */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <MapCanvas
          room={room}
          mode="table"
          cellPx={cellPx}
          resolveTerrain={yardTerrain}
          tokenMeta={tokenMeta}
          {...(youTokenId ? { youTokenId } : {})}
          {...(myCell ? { measureFrom: myCell } : {})}
        />
      </div>
      {/* atmosphere overlays */}
      <div style={{ position: 'absolute', inset: 0, background: 'var(--qa-grain)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'var(--qa-vignette)', pointerEvents: 'none' }} />

      {/* the die rolls ON the map (design request §6), not over the HUD */}
      {lastRoll && (
        <Region style={{ top: STAGE_H / 2 - 160, left: STAGE_W / 2 - 160, width: 320, height: 320, pointerEvents: 'none' }} aria-label="dice">
          <DiceTray result={lastRoll} />
        </Region>
      )}

      {me ? (
        <>
          <SceneHeader scene={sceneVM} />
          <PartyRail members={partyVM} />

          {/* identity + vitals — lower left, glass, over the map */}
          <Region style={{ bottom: 20, left: 20, width: 300 }} aria-label="identity">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Panel style={{ padding: '10px 13px', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: 'var(--qa-radius-sm)', background: identity.classColor ?? 'var(--qa-class-fighter)', display: 'grid', placeItems: 'center', fontFamily: 'var(--qa-font-display)', fontSize: 22, color: 'var(--qa-ink)' }}>
                  {identity.name.charAt(0)}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--qa-font-display)', fontSize: 'var(--qa-text-xl)', color: 'var(--qa-glass-text)', lineHeight: 1.05 }}>{identity.name}</div>
                  <div style={label}>{identity.className ? `${identity.className} · ` : ''}Level {identity.level}</div>
                </div>
              </Panel>
              <Panel label="VITALS">
                <VitalsBar vitals={toVitals(sheet, me)} />
              </Panel>
            </div>
          </Region>

          {/* action bar — bottom center, the real ActionBar primitive */}
          <Region style={{ bottom: 20, left: '50%', transform: 'translateX(-50%)', width: 720 }} aria-label="actions">
            <Panel>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ ...mono, fontSize: 11, letterSpacing: 'var(--qa-track-label)', textTransform: 'uppercase', color: yourTurn ? 'var(--qa-ember)' : 'var(--qa-glass-dim)' }}>
                  {yourTurn ? 'YOUR TURN' : 'WAITING…'}
                </span>
                {targetName && (
                  <span style={label}>Target · <span style={{ color: 'var(--qa-ember)' }}>{targetName}</span></span>
                )}
              </div>
              <ActionBar
                tiles={toActionTiles(sheet, me, state.projection, targetId, { activeTurnEnforced: state.projection.activeCreatureId !== undefined })}
                onUse={onUse}
              />
            </Panel>
          </Region>

          {/* dice log — right, the real DiceLog primitive */}
          <Region style={{ bottom: 20, right: 20, width: 344, height: 520 }} aria-label="log">
            <Panel label="TABLE · DICE LOG" collapsible style={{ height: '100%' }}>
              <DiceLog entries={toLog(state.log, nameOf)} />
            </Panel>
          </Region>
        </>
      ) : (
        <Region style={{ top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 360 }} aria-label="status">
          <Panel style={{ padding: '16px 18px' }}>
            <span style={{ color: 'var(--qa-glass-text)', fontFamily: 'var(--qa-font-body)', fontSize: 'var(--qa-text-sm)' }}>
              {connMessage(state.status, state.error)}
            </span>
          </Panel>
        </Region>
      )}
    </Stage>
  );
}

function connMessage(status: string, error?: string): string {
  if (error === 'auth' || error === 'not_member') return 'This table link has expired or is not valid. Ask for a fresh link to rejoin.';
  if (status === 'connecting') return 'Joining the table…';
  if (status === 'closed') return 'The connection dropped. Reconnecting…';
  if (status === 'error') return 'Trouble reaching the table. Retrying…';
  return 'Connected — waiting for the table…';
}
