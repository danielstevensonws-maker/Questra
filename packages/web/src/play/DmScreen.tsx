/**
 * DmScreen — the screen you run the game from (Brief 10 §3).
 *
 * THE JOB IS DIFFERENT FROM A PLAYER'S. A player's screen answers "what do I
 * do?" — it is one character, deep. A DM's answers "what is going on, and what
 * needs me?" — every character, shallow, plus the things only they know. That
 * is why this is a different component tree rather than the player view with a
 * toggle, even though it shares the map, the log and the whole design language.
 *
 * THE ACCENT CHANGES MEANING, and this is the one idea worth stating. On the
 * player screen --qa-accent means YOU: your token, your turn, your name. A DM
 * has no token, so here it means NEEDS YOU — a prompt waiting, a creature
 * bloodied, the turn sitting on somebody who has not acted. Reserving it that
 * way is what keeps a screen with everybody's information on it from reading
 * as an undifferentiated wall.
 *
 * WHAT ONLY YOU KNOW IS NOT A PANEL. The obvious build is a fifth box in a
 * corner holding secrets, and it is wrong: a DM's private information is
 * ABOUT the creatures in the list, so putting it somewhere else means reading
 * two places and joining them by eye, mid-sentence, while five people wait.
 * It lives inline on each combatant instead, behind one consistent mark, so
 * "what I know that they do not" has a single visual signature wherever it
 * appears.
 *
 * The DM receives the WHOLE room — unrevealed cells, hidden creatures, the lot
 * — because filterRoomForViewer passes their payload through untouched. That
 * asymmetry is settled server-side; nothing here decides it.
 */
import { useState, type ReactElement } from 'react';
import type { Room } from '@questra/contracts';
import { MapCanvas } from '../primitives/MapCanvas.js';
import { ScreenStyles } from '../primitives/v2/ScreenStyles.js';
import type { PlayView } from './projectionToView.js';

export interface DmScreenProps {
  view: PlayView;
  room: Room;
  campaignName: string;
  /** Everyone at the table, whether or not they are connected right now. */
  seats: { accountId: string; displayName: string; characterName: string | null; here: boolean }[];
  onLeave: () => void;
  onSay: (text: string) => void;
}

export function DmScreen({ view, room, campaignName, seats, onLeave, onSay }: DmScreenProps): ReactElement {
  const [line, setLine] = useState('');
  const [spotlit, setSpotlit] = useState<string | null>(null);

  const exploring = view.turn.exploring;
  /* Nobody has arrived yet is a different sentence from nobody has made a
     character, and a DM staring at an empty table needs to know which. */
  const waiting = seats.filter((s) => !s.here);

  const say = (): void => {
    const text = line.trim();
    if (!text) return;
    onSay(text);
    setLine('');
  };

  return (
    <div className="qa2-screen qa-dm">
      <ScreenStyles />
      <MapCanvas room={room} mode="play" fit="fill" />

      {/* The scene, centred — the same anchor the player screen uses, so a DM
          glancing between two devices finds the same thing in the same place. */}
      <div className="qa2-panel qa2-scene">
        <span className="qa-dm-scene-name">{campaignName}</span>
        <span className="qa-dm-scene-state">
          {exploring ? 'Not in a fight' : `Round ${String(view.scene.round)}`}
          {view.turn.activeName ? ` · ${view.turn.activeName}` : ''}
        </span>
      </div>

      <div className="qa2-controls">
        <button type="button" className="qa2-pill" onClick={onLeave}>Leave</button>
      </div>

      {/* ---- the table: everyone, with what only you know sitting on them ---- */}
      <aside className="qa2-panel qa-dm-table" aria-label="Everyone at the table">
        <header className="qa-dm-head">
          <span className="qa-dm-kicker">The table</span>
          {waiting.length > 0 && (
            <span className="qa-dm-away">{waiting.length} away</span>
          )}
        </header>

        <ul className="qa-dm-list">
          {view.cast.map((c) => {
            const seat = seats.find((s) => s.characterName === c.name);
            const acting = c.acting;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={
                    'qa-dm-row'
                    + (acting ? ' is-acting' : '')
                    + (spotlit === c.id ? ' is-spotlit' : '')
                  }
                  aria-pressed={spotlit === c.id}
                  onClick={() => setSpotlit(spotlit === c.id ? null : c.id)}
                >
                  <span className="qa-dm-row-top">
                    <span className="qa-dm-name">{c.name}</span>
                    {/* A DM sees exact numbers for everyone — that IS the
                        difference between this screen and a player's, where an
                        enemy is only ever a word. */}
                    <span className="qa-dm-hp">
                      {c.hp ? `${String(c.hp.current)}/${String(c.hp.max)}` : (c.hurt ?? '')}
                    </span>
                  </span>
                  <span className="qa-dm-row-bottom">
                    <span className="qa-dm-who">
                      {seat ? seat.displayName : c.kind === 'foe' ? 'You run this one' : '—'}
                    </span>
                    {c.status && <span className="qa-dm-status">{c.status}</span>}
                    {seat && !seat.here && <span className="qa-dm-away-tag">Not connected</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {view.cast.length === 0 && (
          <p className="qa-dm-empty">
            Nobody is seated yet. Players appear here as they make characters.
          </p>
        )}
      </aside>

      {/* ---- Assistant · Journal: the table's record, and where you speak ---- */}
      <section className="qa2-panel qa-dm-journal" aria-label="Assistant and journal">
        <header className="qa-dm-head">
          <span className="qa-dm-kicker">Assistant · Journal</span>
        </header>

        <div className="qa-dm-log">
          {view.entries.length === 0 ? (
            <p className="qa-dm-empty">
              Rolls, narration and anything anyone says gather here. Start by telling
              them what they can see.
            </p>
          ) : (
            view.entries.map((e) => (
              <p key={e.id} className="qa-dm-line">
                <span className="qa-dm-line-who">{e.actor}</span>
                {e.text}
              </p>
            ))
          )}
        </div>

        {/* One composer, three jobs (Brief 10 §4.1): narrate, speak in
            character, or ask the assistant. There is no separate chat box —
            the log IS the chat, so a DM never has to decide which field a
            sentence belongs in. */}
        <form
          className="qa-dm-compose"
          onSubmit={(e) => { e.preventDefault(); say(); }}
        >
          <input
            className="qa-dm-input"
            value={line}
            placeholder="Tell them what happens, or ask the assistant"
            aria-label="Tell them what happens, or ask the assistant"
            onChange={(e) => setLine(e.target.value)}
          />
          <button type="submit" className="qa2-cta qa-dm-send" disabled={!line.trim()}>Say it</button>
        </form>
      </section>
    </div>
  );
}
