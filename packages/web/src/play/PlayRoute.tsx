/**
 * PlayRoute — the table, live.
 *
 * Everything else in the app exists to get somebody here: an account, a
 * campaign, a join code, a character, a map, a socket. This is the first screen
 * that renders all of it at once.
 *
 * ONE SCREEN, TWO ROLES — NOT TWO SCREENS. The map, the log and the design
 * language are shared; what differs is the panels around them and the data that
 * arrives. A player receives a room with unrevealed cells already stripped and
 * never sees a whisper meant for somebody else, because `filterRoomForViewer`
 * and `eventVisibleTo` settle that server-side before the payload is built.
 * Re-deciding any of it here would be a second security model free to disagree
 * with the first.
 *
 * WHAT A NEW PLAYER GETS. Every number on the near edge arrives with the
 * arithmetic that produced it, straight off the computed sheet — tap armour
 * class and read where it came from. That is the product's whole promise: you
 * learn the rules by playing, not before playing.
 */
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import type { CampaignSession, Room } from '@questra/contracts';
import { PlayerViewV2 } from '../primitives/v2/PlayerViewV2.js';
import { ShellStyles } from '../shell/ShellStyles.js';
import { Road } from '../shell/road/Road.js';
import { usePrefersReducedMotion } from '../shell/shared.js';
import type { SessionApi } from '../shell/session.js';
import { useSync } from './useSync.js';
import { projectionToView, type MyCharacter, type Projection } from './projectionToView.js';

export interface PlayRouteProps {
  campaignId: string;
  session: SessionApi;
  onLeave: () => void;
}

export function PlayRoute({ campaignId, session, onLeave }: PlayRouteProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  const [table, setTable] = useState<CampaignSession | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  /* The roster and the map, in parallel — neither depends on the other, and
     serialising them would double the wait before the table appears. */
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      session.authedRequest<CampaignSession>(`/campaigns/${campaignId}/session`),
      session.authedRequest<Room>(`/campaigns/${campaignId}/room`),
    ])
      .then(([t, r]) => { if (!cancelled) { setTable(t); setRoom(r); } })
      .catch((e) => { if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not open this table.'); });
    return () => { cancelled = true; };
  }, [campaignId, session]);

  const sync = useSync({
    playSessionId: table?.playSessionId ?? '',
    token: session.accessToken(),
    enabled: table !== null,
  });

  /* Who this viewer plays. A DM has no character, which is not a missing value
     — it is what running the game means. */
  const myCharacter = useMemo<MyCharacter | null>(() => {
    const me = table?.members.find((m) => m.accountId === session.account?.id);
    return me?.character ?? null;
  }, [table, session.account?.id]);

  const view = useMemo(() => {
    /* The snapshot is the engine's projection, opaque to contracts — the sync
       client deliberately does not fold it, so this is where it becomes a
       shape the screen understands. */
    const projection = (sync.snapshot ?? { combatants: {}, round: 1, nextSeq: 0 }) as Projection;
    return projectionToView({
      projection,
      room,
      myCharacter,
      role: table?.yourRole ?? 'player',
      events: sync.events,
      campaignName: table?.campaignName ?? '',
    });
  }, [sync.snapshot, sync.events, room, myCharacter, table]);

  if (loadError) {
    return (
      <div className={'rd qa-make' + (reduced ? ' is-still' : '')}>
        <ShellStyles />
        <Road distance="camp" />
        <main className="rd-panel qa-make-panel">
          <p className="rd-label">This table will not open</p>
          <p className="rd-detail">{loadError}</p>
          <div className="rd-actions">
            <button type="button" className="qa2-cta" onClick={onLeave}>Back to your campaigns</button>
          </div>
        </main>
      </div>
    );
  }

  /* The map is the one thing the screen cannot draw without. Everything else
     degrades — an empty cast, no log — but a table with no floor is nothing. */
  if (!room || !table) {
    return (
      <div className={'rd qa-make' + (reduced ? ' is-still' : '')}>
        <ShellStyles />
        <Road distance="camp" />
        <main className="rd-panel qa-make-panel">
          <p className="rd-micro">Setting out the table…</p>
        </main>
      </div>
    );
  }

  /**
   * A DM has no character, so the near edge has nobody to be. Until the DM
   * screen's own panels exist, they get the table without a hero rather than a
   * fabricated one — saying so plainly beats inventing a character for them.
   */
  if (!view.hero) {
    return (
      <div className={'rd qa-make' + (reduced ? ' is-still' : '')}>
        <ShellStyles />
        <Road distance="camp" />
        <main className="rd-panel qa-make-panel">
          <p className="rd-label">{table.campaignName}</p>
          <h1 className="rd-title">The table is set</h1>
          <p className="rd-detail">
            {table.yourRole === 'dm'
              ? 'The screen you run the game from is still being built. Everyone who has made a character is seated and connected.'
              : 'You have not made a character yet, so there is nobody for you to play.'}
          </p>
          <ul className="qa-lobby-list">
            {view.cast.map((c) => (
              <li key={c.id} className="qa-seat is-here">
                <span className="qa-seat-dot" aria-hidden="true" />
                <span className="qa-seat-name">{c.name}</span>
                <span className="rd-micro qa-seat-role">
                  {c.hp ? `${String(c.hp.current)}/${String(c.hp.max)}` : (c.hurt ?? '')}
                </span>
              </li>
            ))}
          </ul>
          <div className="rd-actions">
            <button type="button" className="qa2-cta" onClick={onLeave}>Back to the lobby</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <PlayerViewV2
      scene={view.scene}
      hero={view.hero}
      cast={view.cast}
      room={room}
      /* The action rows, spells and inventory come from the character's own
         sheet and are the next piece of wiring — empty rather than fabricated,
         because a tile that does nothing when tapped is worse than no tile. */
      tiles={[]}
      turn={view.turn}
      entries={view.entries}
      features={[]}
      inventory={[]}
      onMenuPick={(action) => { if (action === 'leave') onLeave(); }}
    />
  );
}
