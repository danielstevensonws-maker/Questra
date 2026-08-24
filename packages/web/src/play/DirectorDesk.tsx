/**
 * DirectorDesk — the combatant roster and the DM's private controls.
 *
 * WHAT WENT WRONG THE FIRST TIME. The version this replaces was a left rail of
 * full-width slabs — ROLL FOR INITIATIVE, SHORT REST, LONG REST — all caps,
 * all one size, all the same weight. That is a mobile menu, not a director's
 * desk, and it shared no vocabulary at all with the player's screen (owner,
 * 2026-08-25: "the hierarchy looks terrible… it doesn't look consistent with
 * the player view").
 *
 * THE FIX IS TO STOP INVENTING AND START MATCHING. The player's action bar is
 * built from CARDS: a chip with initials, a name in the story face, a class
 * line in mono, and a bar. That is the language this screen should already
 * have been speaking, so the roster is now the same card, two columns, with
 * the numbers a DM needs instead of the ones a player does.
 *
 * HIERARCHY COMES FROM CONTRAST, NOT SIZE. Three levels and no more:
 *   the name      story face, full ink — what you read first
 *   the numbers   mono, dim, tabular — what you check
 *   the labels    mono caps, faint — what you almost never read
 * Everything was previously at level three, which is exactly why nothing had
 * rank.
 *
 * THE ACCENT IS RATIONED. Terracotta marks whoever the table is waiting for and
 * nothing else. --qa-danger carries hurt. Gold is reserved for the DM's own
 * voice and is spent in the console, not here.
 */
import type { ReactElement } from 'react';
import type { SpineEntryVM } from '../primitives/v2/viewModel.js';

export interface DeskSeat {
  accountId: string;
  displayName: string;
  characterName: string | null;
  here: boolean;
}

export interface DirectorDeskProps {
  cast: SpineEntryVM[];
  seats: DeskSeat[];
  spotlit: string | null;
  onSpotlight: (creatureId: string | null) => void;
  /** The four things only a DM can do, and their one-line explanations. */
  onOverride: () => void;
  onUndo: () => void;
  onSecretRoll: () => void;
  onWhisper: () => void;
}

/**
 * A creature's hit points as a fraction, for the bar. Enemies arrive as a WORD
 * rather than a number on a player's screen — but this is the DM's, and exact
 * numbers for everybody are precisely what makes it theirs.
 */
function fraction(c: SpineEntryVM): number {
  if (!c.hp || c.hp.max === 0) return c.status === 'Down' || c.status === 'Dying' ? 0 : 1;
  return Math.max(0, Math.min(1, c.hp.current / c.hp.max));
}

export function DirectorDesk({
  cast, seats, spotlit, onSpotlight, onOverride, onUndo, onSecretRoll, onWhisper,
}: DirectorDeskProps): ReactElement {
  return (
    <>
      {/**
       * WHAT ONLY YOU KNOW, top-left and deliberately quiet. Four verbs with a
       * line each saying what they do — a DM uses these rarely and needs to
       * remember what they are when they do, which is why the explanation sits
       * on the control rather than in a manual.
       */}
      <section className="qa-only" aria-label="What only you know">
        <header className="qa-only-head">What only you know</header>
        <button type="button" className="qa-only-row" onClick={onOverride}>
          <span className="qa-only-name">Override</span>
          <span className="qa-only-hint">Set any value by hand — silently</span>
        </button>
        <button type="button" className="qa-only-row" onClick={onUndo}>
          <span className="qa-only-name">Undo</span>
          <span className="qa-only-hint">Reverse the last event, anyone's</span>
        </button>
        <button type="button" className="qa-only-row" onClick={onSecretRoll}>
          <span className="qa-only-name">Secret roll</span>
          <span className="qa-only-hint">Hidden by default, per-type</span>
        </button>
        <button type="button" className="qa-only-row" onClick={onWhisper}>
          <span className="qa-only-name">Whisper</span>
          <span className="qa-only-hint">One player. Only they see it</span>
        </button>
      </section>

      {/**
       * THE ROSTER, bottom-left, as the player's own card language: chip, name,
       * class line, and a bar. Two columns because a table of four plus two
       * monsters is six cards, and six in one column is a scroll.
       */}
      <section className="qa-roster" aria-label="Combatants">
        <header className="qa-roster-head">
          <span className="qa-roster-kicker">Combatants · tap to spotlight</span>
        </header>

        <div className="qa-roster-grid">
          {cast.map((c) => {
            const seat = seats.find((s) => s.characterName === c.name);
            const pct = fraction(c);
            return (
              <button
                key={c.id}
                type="button"
                className={
                  'qa-card'
                  + (c.acting ? ' is-acting' : '')
                  + (spotlit === c.id ? ' is-spotlit' : '')
                  + (c.kind === 'foe' ? ' is-foe' : '')
                }
                aria-pressed={spotlit === c.id}
                onClick={() => { onSpotlight(spotlit === c.id ? null : c.id); }}
              >
                <span className="qa-card-chip" aria-hidden="true">{c.name.slice(0, 1)}</span>

                <span className="qa-card-name">{c.name}</span>
                {/* AC on the same line as the name, right-aligned: it is the
                    number a DM reads most, because it is what every attack in
                    the room is measured against. */}
                <span className="qa-card-ac">{c.ac !== undefined ? `AC ${String(c.ac)}` : ''}</span>

                <span className="qa-card-sub">
                  {seat ? seat.displayName : c.kind === 'foe' ? 'Yours' : '—'}
                  {c.acting ? ' · turn' : ''}
                </span>

                <span className="qa-card-bar" aria-hidden="true">
                  <span
                    className={'qa-card-fill' + (pct <= 0.5 ? ' is-low' : '')}
                    style={{ width: `${String(Math.round(pct * 100))}%` }}
                  />
                </span>
                <span className="qa-card-hp">
                  {c.hp ? `${String(c.hp.current)}/${String(c.hp.max)}` : (c.hurt ?? '')}
                </span>

                {/* A condition worth knowing about, on the card it belongs to —
                    a DM should never have to join two lists by eye mid-fight. */}
                {c.status && <span className="qa-card-note">{c.status}</span>}
                {seat && !seat.here && <span className="qa-card-note is-quiet">Not connected</span>}
              </button>
            );
          })}
        </div>

        {cast.length === 0 && (
          <p className="qa-roster-empty">
            Nobody is on the board yet. Bring somebody in from the NPCs tab below.
          </p>
        )}
      </section>
    </>
  );
}
