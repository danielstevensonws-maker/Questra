/**
 * DmScreen — the screen you run the game from (Brief 10 §3).
 *
 * THE JOB IS DIFFERENT FROM A PLAYER'S. A player's screen answers "what do I
 * do?" — one character, deep. A DM's answers "what is going on, and what needs
 * me?" — every character, shallow, plus the things only they know. That is why
 * this is a different component tree rather than the player view with a toggle,
 * even though it shares the map, the log and the whole design language.
 *
 * THE ACCENT CHANGES MEANING, and this is the one idea worth stating. On the
 * player screen --qa-accent means YOU: your token, your turn, your name. A DM
 * has no token, so here it means NEEDS YOU — a prompt waiting, a creature
 * bloodied, the turn sitting on somebody who has not acted. Reserving it that
 * way is what keeps a screen with everybody's information on it from reading
 * as an undifferentiated wall.
 *
 * WHAT ONLY YOU KNOW IS NOT A PANEL OF SECRETS. The obvious build is a box in a
 * corner holding hidden things, and it is wrong: a DM's private information is
 * ABOUT the creatures in the list, so putting it elsewhere means reading two
 * places and joining them by eye, mid-sentence, while five people wait. What
 * lives in the drawer is only what has no creature to sit on — the whisper
 * composer and undo. Everything else is inline on the row it concerns.
 *
 * FIRST CONTACT (Brief 10 §3): the console and the drawer start collapsed. A DM
 * running their first session sees a map, a table and a place to type, which is
 * the whole game; the rest opens when they go looking for it.
 *
 * The DM receives the WHOLE room — unrevealed cells, hidden creatures, the lot
 * — because filterRoomForViewer passes their payload through untouched. That
 * asymmetry is settled server-side; nothing here decides it.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { Room } from '@questra/contracts';
import { MapCanvas } from '../primitives/MapCanvas.js';
import { ScreenStyles } from '../primitives/v2/ScreenStyles.js';
import { PromptDock, type PromptVM } from './PromptDock.js';
import { ImmersionConsole, type EffectId } from './ImmersionConsole.js';
import { EffectLayer } from './EffectLayer.js';
import type { PlayView } from './projectionToView.js';

export interface DmSeat {
  accountId: string;
  displayName: string;
  characterName: string | null;
  here: boolean;
}

export interface DmScreenProps {
  view: PlayView;
  room: Room;
  campaignName: string;
  /** Everyone at the table, whether or not they are connected right now. */
  seats: DmSeat[];
  prompts: PromptVM[];
  onLeave: () => void;
  onSay: (text: string) => void;
  onWhisper: (toAccountId: string, text: string) => void;
  onStartCombat: () => void;
  onEndCombat: () => void;
  onAdvanceTurn: () => void;
  onAnswerPrompt: (promptId: string, take: boolean, optionName?: string) => void;
  onEffect: (effect: EffectId) => void;
  /** The effect currently playing, if any — drawn over the map for everyone. */
  effect: EffectId | null;
}

export function DmScreen({
  view, room, campaignName, seats, prompts,
  onLeave, onSay, onWhisper, onStartCombat, onEndCombat, onAdvanceTurn, onAnswerPrompt, onEffect, effect,
}: DmScreenProps): ReactElement {
  const [line, setLine] = useState('');
  const [spotlit, setSpotlit] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [whisperTo, setWhisperTo] = useState<string>('');
  const [whisperText, setWhisperText] = useState('');
  const logRef = useRef<HTMLDivElement>(null);

  const exploring = view.turn.exploring;
  /* Nobody has arrived yet is a different sentence from nobody has made a
     character, and a DM staring at an empty table needs to know which. */
  const waiting = seats.filter((s) => !s.here);

  /* The newest line is the one you need. A journal that has to be scrolled to
     be current is a journal nobody reads mid-sentence. */
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [view.entries.length]);

  const say = (): void => {
    const text = line.trim();
    if (!text) return;
    onSay(text);
    setLine('');
  };

  const whisper = (): void => {
    const text = whisperText.trim();
    if (!text || !whisperTo) return;
    onWhisper(whisperTo, text);
    setWhisperText('');
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

      {/* ---- running the fight ------------------------------------------
          The controls that move the whole table sit together, because they are
          one decision: is this a fight, and whose turn is it? */}
      <div className="qa2-controls qa-dm-controls">
        {exploring ? (
          <button type="button" className="qa2-cta qa-dm-run" onClick={onStartCombat}>
            Roll for initiative
          </button>
        ) : (
          <>
            <button type="button" className="qa2-cta qa-dm-run" onClick={onAdvanceTurn}>
              Next turn
            </button>
            <button type="button" className="qa2-pill" onClick={onEndCombat}>End the fight</button>
          </>
        )}
        <button type="button" className="qa2-pill" onClick={onLeave}>Leave</button>
      </div>

      {/* ---- the table: everyone, with what only you know sitting on them ---- */}
      <aside className="qa2-panel qa-dm-table" aria-label="Everyone at the table">
        <header className="qa-dm-head">
          <span className="qa-dm-kicker">{exploring ? 'The table' : 'Turn order'}</span>
          {waiting.length > 0 && <span className="qa-dm-away">{waiting.length} away</span>}
        </header>

        <ul className="qa-dm-list">
          {view.cast.map((c) => {
            const seat = seats.find((s) => s.characterName === c.name);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={
                    'qa-dm-row'
                    + (c.acting ? ' is-acting' : '')
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

      {/* Reaction cards queue where the holder is looking (Brief 08 §1): for
          monsters, boss and lair, that is here. */}
      <PromptDock prompts={prompts} onAnswer={onAnswerPrompt} />

      {/* ---- Assistant · Journal: the table's record, and where you speak ---- */}
      <section className="qa2-panel qa-dm-journal" aria-label="Assistant and journal">
        <header className="qa-dm-head">
          <span className="qa-dm-kicker">Assistant · Journal</span>
          <button
            type="button"
            className="qa-dm-drawer-toggle"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(!drawerOpen)}
          >
            {drawerOpen ? 'Close' : 'Only you'}
          </button>
        </header>

        {/**
         * The drawer holds only what has no creature to sit on. A whisper is
         * addressed to a PERSON rather than a character, which is why it cannot
         * live on a row in the list above.
         */}
        {drawerOpen && (
          <div className="qa-dm-drawer">
            <p className="qa-dm-drawer-note">Nobody else sees what you send from here.</p>
            <form
              className="qa-dm-whisper"
              onSubmit={(e) => { e.preventDefault(); whisper(); }}
            >
              <select
                className="qa-dm-select"
                aria-label="Who to whisper to"
                value={whisperTo}
                onChange={(e) => setWhisperTo(e.target.value)}
              >
                <option value="">Choose somebody…</option>
                {seats.map((s) => (
                  <option key={s.accountId} value={s.accountId}>
                    {s.displayName}{s.characterName ? ` (${s.characterName})` : ''}
                  </option>
                ))}
              </select>
              <input
                className="qa-dm-input"
                value={whisperText}
                placeholder="Tell them something only they know"
                aria-label="Whisper"
                onChange={(e) => setWhisperText(e.target.value)}
              />
              <button
                type="submit"
                className="qa2-cta qa-dm-send"
                disabled={!whisperText.trim() || !whisperTo}
              >
                Whisper
              </button>
            </form>
          </div>
        )}

        <div className="qa-dm-log" ref={logRef}>
          {view.entries.length === 0 ? (
            <p className="qa-dm-empty">
              Rolls, narration and anything anyone says gather here. Start by telling
              them what they can see.
            </p>
          ) : (
            view.entries.map((e) => (
              <p key={e.id} className={`qa-dm-line is-${e.tone}`}>
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

      <ImmersionConsole onEffect={onEffect} />
      <EffectLayer effect={effect} />
    </div>
  );
}
