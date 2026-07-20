/**
 * PlayerView — the M2 slice's visible half: the first assembled SCREEN.
 *
 * Composes the existing primitives (PlayerHub over a real MapCanvas via
 * TableBackdrop, plus the DiceTray) and feeds them LIVE state from the sync client
 * through sheetToPlayerHub. No game state lives here — the projection comes from
 * the server's welcome + folded events; the dice reveal comes from the server's
 * `roll_made` (ADR-0008), never a local roll.
 *
 * Design: ember-on-glass over the map (Questra V1 Prototype §PlayerView) — the
 * TableBackdrop provides the lit-room ground + atmosphere overlays; the hub's glass
 * panels float over it. All colour via the aliased --qa-* tokens.
 */
import { useMemo, type ReactElement } from 'react';
import { Panel } from '@questra/ui';
import type { ComputedSheet, Room, PlayEvent } from '@questra/contracts';
import type { Combatant } from '@questra/engine';
import { PlayerHub } from '../primitives/PlayerHub.js';
import { DiceTray } from '../primitives/DiceTray.js';
import { TableBackdrop } from '../primitives/TableBackdrop.js';
import { toVitals, toActionTiles } from '../primitives/sheetToPlayerHub.js';
import type { DiceLogEntry } from '../primitives/DiceLog.js';
import { useSync } from '../sync/useSync.js';

export interface PlayerViewProps {
  /** where the sync server lives (ws://host:port). */
  url: string;
  playSessionId: string;
  /** the session token minted by /auth/login (Brief 14 §1). */
  token: string;
  /** the signed-in player's creature id in the projection (whose hub this is). */
  myCreatureId: string;
  /** the player's computed sheet (slice: the Torvald fixture; wizard-built later). */
  sheet: ComputedSheet;
  /** identity block for the header. */
  identity: { name: string; level: number; className?: string; classColor?: string };
  /** the room under the HUD. */
  room: Room;
}

/** Build the dice-log entries the hub shows from the event stream (server truth). */
function toLog(log: PlayEvent[]): DiceLogEntry[] {
  const entries: DiceLogEntry[] = [];
  for (const e of log) {
    if (e.body.t === 'roll_made') {
      entries.push({
        id: e.id,
        text: `${e.body.kind} roll`,
        breakdown: e.body.modifiers,
        total: e.body.total,
        tone: 'roll',
      });
    } else if (e.body.t === 'narration') {
      entries.push({ id: e.id, text: e.body.text, tone: 'narration' });
    }
  }
  return entries;
}

export function PlayerView({
  url, playSessionId, token, myCreatureId, sheet, identity, room,
}: PlayerViewProps): ReactElement {
  const { state, lastRoll, sendIntent } = useSync({ url, playSessionId, token });

  const me: Combatant | undefined = state.projection.combatants[myCreatureId];

  // pick the first non-player as the default target for attack tiles (slice).
  const targetId = useMemo(() => {
    return Object.values(state.projection.combatants).find((c) => !c.isPlayer)?.id;
  }, [state.projection.combatants]);

  const hub = useMemo(() => {
    if (!me) return null;
    return {
      vitals: toVitals(sheet, me),
      tiles: toActionTiles(sheet, me, state.projection, targetId, {
        activeTurnEnforced: state.projection.activeCreatureId !== undefined,
      }),
      log: toLog(state.log),
    };
  }, [me, sheet, state.projection, state.log, targetId]);

  // send the attack intent for a tapped tile (server rules + rolls + emits).
  const onUse = (tileId: string): void => {
    if (!me || !targetId) return;
    if (tileId.startsWith('attack.')) {
      const actionName = tileId.slice('attack.'.length);
      sendIntent(`attack-${me.id}-${Date.now()}`, {
        kind: 'attack', attackerId: me.id, targetId, actionName,
      });
    } else if (tileId.startsWith('feature.')) {
      const featureId = tileId.slice('feature.'.length);
      sendIntent(`feature-${me.id}-${Date.now()}`, { kind: 'use_feature', creatureId: me.id, featureId });
    }
  };

  return (
    <TableBackdrop room={room} height={1080}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24, height: '100%' }}>
        {/* the hub — glass column, floats over the map */}
        {hub ? (
          <PlayerHub
            identity={identity}
            vitals={hub.vitals}
            tiles={hub.tiles}
            log={hub.log}
            onUse={onUse}
          />
        ) : (
          <ConnectingPanel status={state.status} error={state.error} />
        )}

        {/* the dice tray — reveal-only, driven by the server's roll_made (ADR-0008) */}
        <div style={{ width: 320, height: 320, alignSelf: 'flex-end' }}>
          <DiceTray result={lastRoll} />
        </div>
      </div>
    </TableBackdrop>
  );
}

/** A glass status panel shown until the projection has the player's combatant. */
function ConnectingPanel({ status, error }: { status: string; error?: string | undefined }): ReactElement {
  const message =
    error === 'auth' ? 'This table link has expired or is not valid. Ask for a fresh link to rejoin.'
    : error === 'not_member' ? 'You are not seated at this table yet.'
    : status === 'connecting' ? 'Joining the table…'
    : status === 'open' ? 'Connected — waiting for the table…'
    : status === 'closed' ? 'The connection dropped. Reconnecting…'
    : status === 'error' ? 'Trouble reaching the table. Retrying…'
    : 'Connecting…';
  return (
    <Panel style={{ width: 344, padding: '16px 18px' }}>
      <span style={{ color: 'var(--qa-glass-text)', fontFamily: 'var(--qa-font-body)', fontSize: 'var(--qa-text-sm)' }}>
        {message}
      </span>
    </Panel>
  );
}
