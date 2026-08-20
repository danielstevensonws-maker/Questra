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
import { DmScreen } from './DmScreen.js';
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

  /**
   * The roster and the map, in parallel — neither depends on the other, and
   * serialising them would double the wait before the table appears.
   *
   * REFETCHED WHEN THE PAGE COMES BACK INTO VIEW, not only on mount. A player
   * who rebuilds their character in another tab, or leaves this one open
   * overnight, was otherwise looking at a snapshot taken when the page first
   * loaded — showing a character that no longer exists, with no way to tell
   * that was what had happened (owner, 2026-08-20: rebuilt as an Orc Monk and
   * the table still showed the Goliath Fighter it replaced).
   *
   * Focus rather than a poll: the roster changes when a PERSON does something,
   * and coming back to the tab is exactly when that has just happened.
   */
  useEffect(() => {
    let cancelled = false;

    const load = (): void => {
      Promise.all([
        session.authedRequest<CampaignSession>(`/campaigns/${campaignId}/session`),
        session.authedRequest<Room>(`/campaigns/${campaignId}/room`),
      ])
        .then(([t, r]) => { if (!cancelled) { setTable(t); setRoom(r); setLoadError(null); } })
        .catch((e) => {
          /* Only surface a failure if there is nothing on screen yet. A refetch
             that fails while the table is already rendered should leave the
             table alone rather than replacing it with an error. */
          if (!cancelled && !table) setLoadError(e instanceof Error ? e.message : 'Could not open this table.');
        });
    };

    load();
    const onFocus = (): void => { if (document.visibilityState === 'visible') load(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
    /* `table` is deliberately not a dependency: it is read only inside the
       error branch, and depending on it would restart the listeners on every
       successful load. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /* Every character's CURRENT name, so the cast list is not stale for the same
     reason the hero panel was — see projectionToView's note on rebuilt
     characters. */
  const rosterNames = useMemo(() => {
    const out: Record<string, string> = {};
    for (const m of table?.members ?? []) if (m.character) out[m.character.id] = m.character.name;
    return out;
  }, [table]);

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
      rosterNames,
    });
  }, [sync.snapshot, sync.events, room, myCharacter, table, rosterNames]);

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
   * The DM runs the game rather than playing a character, so they get their own
   * screen: everybody's numbers instead of one character's, and the composer
   * they narrate from. Same map, same glass, same corners.
   */
  if (table.yourRole === 'dm') {
    return (
      <DmScreen
        view={view}
        room={room}
        campaignName={table.campaignName}
        seats={table.members
          .filter((m) => m.role === 'player')
          .map((m) => ({
            accountId: m.accountId,
            displayName: m.displayName,
            characterName: m.character?.name ?? null,
            here: sync.present.some((p) => p.accountId === m.accountId),
          }))}
        onLeave={onLeave}
        onSay={(text) => {
          /* Straight onto the shared log, where every connected player sees it.
             The DM narrating and a player describing an action take the SAME
             path — one composer, one event, no separate chat to keep in sync. */
          sync.sendIntent({
            idempotencyKey: 'say-' + String(Date.now()) + '-' + String(Math.random()).slice(2, 8),
            intent: { kind: 'free_text', creatureId: table.members.find((m) => m.role === 'dm')?.character?.id ?? 'dm', text },
          });
        }}
      />
    );
  }

  /**
   * A player who has not made a character has nobody for the near edge to be.
   * Saying so plainly beats inventing one, and the lobby is where they fix it.
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
            You have not made a character yet, so there is nobody for you to play.
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
