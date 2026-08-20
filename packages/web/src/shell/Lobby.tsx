/**
 * Lobby — the room you wait in while the rest of the table arrives.
 *
 * THE ONE IDEA: the roster is who BELONGS, presence is who is HERE. Two
 * different questions, two different sources, deliberately kept apart. The
 * roster comes from GET /campaigns/:id/session (everyone with a membership,
 * with their names); presence arrives over the sync socket and carries account
 * ids only. Rendering the roster and lighting it up from presence means a
 * player who has not opened the app yet still appears — greyed, expected —
 * rather than being invisible until they connect. "Waiting on Ash" is only
 * possible because the roster knows Ash exists.
 *
 * WHY THE DM HOLDS THE START. No per-player ready flag: the person running the
 * game decides when it begins, which is how a real table works and which keeps
 * a ready state out of the protocol that nobody could see the point of until it
 * blocked them. Players are told plainly who they are waiting on.
 *
 * THIS SCREEN IS ALSO THE FIRST PROOF THE SOCKET WORKS. Before it, the web app
 * had no sync client at all and every play surface ran on fixtures. If two
 * browsers open this and see each other, multiplayer is real.
 */
import { useEffect, useState, type ReactElement } from 'react';
import type { CampaignSession } from '@questra/contracts';
import { ShellStyles } from './ShellStyles.js';
import { Road } from './road/Road.js';
import { usePrefersReducedMotion } from './shared.js';
import { useSync } from '../play/useSync.js';
import type { SessionApi } from './session.js';

export interface LobbyProps {
  campaignId: string;
  session: SessionApi;
  onBegin: () => void;
  onLeave: () => void;
  /** Where "make your character" goes. The lobby is the only route to it. */
  onMakeCharacter: () => void;
}

export function Lobby({ campaignId, session, onBegin, onLeave, onMakeCharacter }: LobbyProps): ReactElement {
  const reduced = usePrefersReducedMotion();
  const [table, setTable] = useState<CampaignSession | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    session.authedRequest<CampaignSession>(`/campaigns/${campaignId}/session`)
      .then((r) => { if (!cancelled) setTable(r); })
      .catch((e) => { if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Could not open this campaign.'); });
    return () => { cancelled = true; };
  }, [campaignId, session]);

  /* The socket only opens once the roster has told us which play session to
     join — hello requires a playSessionId, so connecting earlier is impossible
     rather than merely premature. */
  const sync = useSync({
    playSessionId: table?.playSessionId ?? '',
    token: session.accessToken(),
    enabled: table !== null,
  });

  const here = new Set(sync.present.map((p) => p.accountId));

  /**
   * Re-fetch the roster when somebody turns up who is not on it.
   *
   * The roster is a snapshot taken on mount, and people JOIN THE CAMPAIGN while
   * the lobby is open — a DM sitting here having just sent the link is the
   * normal case, not an edge one. Presence can only light up seats the roster
   * already knows about, so without this the DM watched an empty room while the
   * player's own screen correctly showed them both. Presence is the trigger
   * because it is the only signal that a stranger has arrived.
   */
  const unknownPresent = sync.present.some(
    (p) => p.role !== 'table_display' && !(table?.members ?? []).some((m) => m.accountId === p.accountId),
  );
  useEffect(() => {
    if (!unknownPresent) return;
    let cancelled = false;
    session.authedRequest<CampaignSession>(`/campaigns/${campaignId}/session`)
      .then((r) => { if (!cancelled) setTable(r); })
      .catch(() => { /* the roster we have still renders; presence keeps working */ });
    return () => { cancelled = true; };
  }, [unknownPresent, campaignId, session]);

  const isDm = table?.yourRole === 'dm';
  const me = table?.members.find((m) => m.accountId === session.account?.id);
  /* A DM does not play a character, so they are never "missing" one. */
  const needCharacter = table?.members.filter((m) => m.role === 'player' && !m.character) ?? [];
  const iNeedCharacter = me?.role === 'player' && !me.character;
  const dm = table?.members.find((m) => m.role === 'dm');
  const waitingOn = table?.members.filter((m) => !here.has(m.accountId)) ?? [];

  if (loadError) {
    return (
      <div className={'rd qa-make' + (reduced ? ' is-still' : '')}>
        <ShellStyles />
        <Road distance="camp" />
        <main className="rd-panel qa-make-panel">
          <p className="rd-label">This campaign will not open</p>
          <p className="rd-detail">{loadError}</p>
          <div className="rd-actions">
            <button type="button" className="qa2-cta" onClick={onLeave}>Back to your campaigns</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={'rd qa-lobby' + (reduced ? ' is-still' : '')}>
      <ShellStyles />
      <Road distance="camp" />

      <main className="rd-panel qa-lobby-panel">
        <header className="qa-lobby-head">
          <p className="rd-label">Gathering</p>
          <h1 className="rd-title">{table ? table.campaignName : ' '}</h1>
        </header>

        <ConnectionNote status={sync.status} error={sync.error} />

        <ul className="qa-lobby-list">
          {table?.members.map((m) => {
            const present = here.has(m.accountId);
            const you = m.accountId === session.account?.id;
            return (
              <li key={m.accountId} className={present ? 'qa-seat is-here' : 'qa-seat'}>
                <span className="qa-seat-dot" aria-hidden="true" />
                <span className="qa-seat-name">{m.displayName}{you && <span className="qa-seat-you"> (you)</span>}</span>
                <span className="rd-micro qa-seat-role">
                  {m.role === 'dm'
                    ? 'Runs the game'
                    : m.character
                      ? m.character.name
                      : present ? 'Choosing' : 'Not yet'}
                </span>
              </li>
            );
          })}
        </ul>

        {table && (
          isDm ? (
            <>
              <p className="rd-detail">
                {waitingOn.length > 0
                  ? `Still to arrive: ${waitingOn.map((m) => m.displayName).join(', ')}. You can begin without them — they will drop in when they open the link.`
                  : needCharacter.length > 0
                    ? `Still choosing: ${needCharacter.map((m) => m.displayName).join(', ')}. You can begin without them, but they will have nobody to play.`
                    : 'Everyone is here and ready. Begin whenever you like.'}
              </p>
              <div className="rd-actions">
                <button type="button" className="qa2-cta" onClick={onBegin}>Begin the session</button>
                <button type="button" className="qa2-quiet-link" onClick={onLeave}>Back to your campaigns</button>
              </div>
            </>
          ) : (
            <>
              {/* The one thing a player can actually DO here. Until they have a
                  character they are not waiting on the DM — they are waiting on
                  themselves, and saying so is the difference between a lobby
                  that stalls and one that moves. */}
              {iNeedCharacter ? (
                <>
                  <p className="rd-detail">
                    You have a seat. Now you need somebody to sit in it.
                  </p>
                  <div className="rd-actions">
                    <button type="button" className="qa2-cta" onClick={onMakeCharacter}>Make your character</button>
                    <button type="button" className="qa2-quiet-link" onClick={onLeave}>Leave for now</button>
                  </div>
                </>
              ) : (
                <>
                  <p className="rd-detail">
                    {me?.character ? `Playing as ${me.character.name}. ` : ''}
                    {dm
                      ? `${dm.displayName} starts the session when the table is ready.`
                      : 'Waiting for whoever runs this game to begin.'}
                  </p>
                  <div className="rd-actions">
                    {me?.character && (
                      <button type="button" className="qa2-quiet-link" onClick={onMakeCharacter}>
                        Change your character
                      </button>
                    )}
                    <button type="button" className="qa2-quiet-link" onClick={onLeave}>Leave for now</button>
                  </div>
                </>
              )}
            </>
          )
        )}
      </main>
    </div>
  );
}

/**
 * The socket's state, in words a player can act on. Silent while live — a
 * healthy connection is not news, and a permanent green badge is just noise on
 * a screen somebody is watching for other people's names.
 */
function ConnectionNote({ status, error }: { status: string; error: string | null }): ReactElement | null {
  if (status === 'live' && !error) return null;
  if (status === 'failed') {
    return <p className="rd-error">{error ?? 'Could not join this session.'}</p>;
  }
  if (status === 'reconnecting') {
    return <p className="rd-micro qa-lobby-note">Lost the connection — trying again…</p>;
  }
  return <p className="rd-micro qa-lobby-note">Connecting…</p>;
}
