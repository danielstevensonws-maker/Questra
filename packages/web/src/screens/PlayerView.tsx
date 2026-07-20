/**
 * PlayerView — the composed player screen (design request §1), the M2 slice's
 * visible half rebuilt to the prototype. A fixed 1728×1080 stage: the map is the
 * full-bleed ground; every HUD region floats over it as glass. Live state comes
 * from the sync client; the DiceTray rolls on the MAP surface and the *result*
 * lands in the log as a breakdown line (design request §6, ADR-0008).
 *
 * Scope (this pass): the core frame + live wiring — scene header, party rail,
 * identity+vitals, bottom action bar, right log. Folio drawer, dying/first-contact
 * states, theme switcher, and chat send are the rest of Brief 10 (later passes).
 */
import { useMemo, type ReactElement } from 'react';
import type { ComputedSheet, Room, PlayEvent } from '@questra/contracts';
import type { Combatant } from '@questra/engine';
import { MapCanvas } from '../primitives/MapCanvas.js';
import { DiceTray } from '../primitives/DiceTray.js';
import { Panel } from '@questra/ui';
import { Stage, Region, STAGE_W, STAGE_H } from './Stage.js';
import {
  SceneHeader, PartyRail, IdentityVitals, ActionBarRegion, LogChat,
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
  /** scene chrome (title/round/turn/timer) — round/turn also come from live state. */
  scene: Omit<SceneVM, 'round' | 'turnName'> & { title: string };
  /** per-member display info; HP is overlaid from live projection. */
  party: Array<{ id: string; name: string; klass: string; classColor?: string }>;
}

/** Roll + narration events → the log's entries (design request §6: result lands here). */
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

  const sceneVM: SceneVM = {
    ...scene,
    round: state.projection.round,
    ...(state.projection.activeCreatureId ? { turnName: `${nameOf(state.projection.activeCreatureId)}'s turn` } : {}),
  };

  return (
    <Stage>
      {/* the map is the ground — full-bleed, the whole stage */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <MapCanvas room={room} mode="table" cellPx={Math.round(STAGE_W / room.gridSize.w)} />
      </div>
      {/* atmosphere overlays (design tokens) */}
      <div style={{ position: 'absolute', inset: 0, background: 'var(--qa-grain)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'var(--qa-vignette)', pointerEvents: 'none' }} />

      {/* the die rolls ON the map surface (design request §6), not over the HUD */}
      {lastRoll && (
        <Region style={{ top: STAGE_H / 2 - 160, left: STAGE_W / 2 - 160, width: 320, height: 320, pointerEvents: 'none' }} aria-label="dice">
          <DiceTray result={lastRoll} />
        </Region>
      )}

      {me ? (
        <>
          <SceneHeader scene={sceneVM} />
          <PartyRail members={partyVM} />
          <IdentityVitals identity={identity} vitals={toVitals(sheet, me)} />
          <ActionBarRegion
            tiles={toActionTiles(sheet, me, state.projection, targetId, { activeTurnEnforced: state.projection.activeCreatureId !== undefined })}
            {...(targetName ? { targetName } : {})}
            yourTurn={yourTurn}
            onUse={onUse}
          />
          <LogChat entries={toLog(state.log, nameOf)} />
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
