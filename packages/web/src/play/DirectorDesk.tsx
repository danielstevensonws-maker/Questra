/**
 * DirectorDesk — the rail a DM runs the game from.
 *
 * WHY A RAIL AND NOT PANELS. The screen this replaces had nine floating glass
 * rectangles, all the same weight, several of which opened on top of the map
 * you were trying to read. Nothing said where to look, and every control was
 * named for a NOUN — "Rules", "Atmosphere", "Add a creature" — so it read as a
 * settings screen rather than a desk. A director does not open a settings
 * screen mid-scene.
 *
 * FOUR DECKS, AND THE ORDER IS THE ARGUMENT:
 *
 *   THE TABLE  — who is here, and how they are
 *   THE CAST   — who you are speaking as
 *   THE ROOM   — what it feels like
 *   THE SCENE  — what happens next
 *
 * That is the sequence a director actually works in, from the people in front
 * of them outward to the story. Reordering these would be reordering how the
 * job is done.
 *
 * THE COLOUR RULE IS THE WHOLE DESIGN. Terracotta (--qa-accent) means NEEDS YOU
 * and is spent on nothing else — not headings, not hovers, not decoration — so
 * a DM's eye can be trained on it. Gold (--qa-gold) means YOUR VOICE: the one
 * warm colour on the screen is always the DM speaking. Everything else lives in
 * ink-faint and only comes forward on hover. A screen with everybody's
 * information on it stays readable only if almost none of it is loud.
 *
 * ONE DECK OPEN AT A TIME. Not a space saving — a focus one. Four open decks is
 * the wall this replaced.
 */
import { useState, type ReactElement } from 'react';
import type { EffectId } from './ImmersionConsole.js';
import type { SpineEntryVM } from '../primitives/v2/viewModel.js';

export type DeckId = 'table' | 'cast' | 'room' | 'scene';

export interface DirectorDeskProps {
  cast: SpineEntryVM[];
  /** Who is connected, so the table deck can say who is missing. */
  seats: { accountId: string; displayName: string; characterName: string | null; here: boolean }[];
  exploring: boolean;
  round: number;
  /** Who the DM is currently speaking as, if anybody. */
  speakingAs: { creatureId?: string; name: string } | null;
  onSpeakAs: (as: { creatureId?: string; name: string } | null) => void;
  onSpotlight: (creatureId: string | null) => void;
  spotlit: string | null;
  onEffect: (effect: EffectId) => void;
  onStartCombat: () => void;
  onEndCombat: () => void;
  onAdvanceTurn: () => void;
  onRest: (rest: 'short' | 'long') => void;
  onAddCreature: () => void;
  onAskCheck: () => void;
  onRules: () => void;
  onRemoveCreature: (creatureId: string) => void;
}

/**
 * The six atmosphere triggers, named for what a DM would SAY rather than for
 * the CSS behind them. "Torch flicker" is a stage direction; "torch" is a
 * variable name.
 */
const WEATHER: { id: EffectId; label: string; hint: string }[] = [
  { id: 'thunder', label: 'Thunder', hint: 'A crack overhead' },
  { id: 'rain', label: 'Rain', hint: 'It starts to pour' },
  { id: 'torch', label: 'Torchlight', hint: 'The light gutters' },
  { id: 'shake', label: 'Tremor', hint: 'The ground moves' },
  { id: 'blood', label: 'Blood', hint: 'The edges go red' },
  { id: 'fade', label: 'Blackout', hint: 'Everything goes dark' },
];

export function DirectorDesk(props: DirectorDeskProps): ReactElement {
  const {
    cast, seats, exploring, round, speakingAs, onSpeakAs, onSpotlight, spotlit,
    onEffect, onStartCombat, onEndCombat, onAdvanceTurn, onRest,
    onAddCreature, onAskCheck, onRules, onRemoveCreature,
  } = props;

  /* The table leads, because the first question is always who is here. */
  const [deck, setDeck] = useState<DeckId>('table');
  const away = seats.filter((s) => !s.here).length;
  const foes = cast.filter((c) => c.kind === 'foe');
  const acting = cast.find((c) => c.acting);

  return (
    <aside className="qa-desk" aria-label="Director's desk">
      {/* The state of play, stated once, at the top of the desk where a
          director's eye returns between beats. */}
      <header className="qa-desk-head">
        <span className="qa-desk-state">{exploring ? 'Between scenes' : `Round ${String(round)}`}</span>
        {acting && <span className="qa-desk-acting">{acting.name} is up</span>}
      </header>

      <Deck
        id="table" label="The table" open={deck === 'table'} onOpen={setDeck}
        badge={away > 0 ? `${String(away)} away` : undefined}
      >
        <ul className="qa-desk-cast">
          {cast.map((c) => {
            const seat = seats.find((s) => s.characterName === c.name);
            return (
              <li key={c.id}>
                <button
                  type="button"
                  className={
                    'qa-desk-row'
                    + (c.acting ? ' is-acting' : '')
                    + (spotlit === c.id ? ' is-spotlit' : '')
                  }
                  aria-pressed={spotlit === c.id}
                  onClick={() => { onSpotlight(spotlit === c.id ? null : c.id); }}
                >
                  <span className="qa-desk-row-name">{c.name}</span>
                  {/* A DM sees exact numbers for everybody — that IS the
                      difference between this screen and a player's. */}
                  <span className={'qa-desk-row-hp' + (c.status ? ' is-down' : '')}>
                    {c.hp ? `${String(c.hp.current)}/${String(c.hp.max)}` : (c.hurt ?? '')}
                  </span>
                  <span className="qa-desk-row-who">
                    {c.status ?? (seat ? seat.displayName : c.kind === 'foe' ? 'Yours' : '—')}
                  </span>
                </button>
              </li>
            );
          })}
          {cast.length === 0 && (
            <li className="qa-desk-empty">Nobody is seated yet. Players appear as they make characters.</li>
          )}
        </ul>

        <div className="qa-desk-actions">
          <button type="button" className="qa-desk-do" onClick={onAddCreature}>Bring something in</button>
          <button type="button" className="qa-desk-do" onClick={onAskCheck}>Ask for a roll</button>
        </div>
      </Deck>

      {/**
       * THE SIGNATURE. Picking a voice changes what the composer IS: the
       * placeholder becomes "As the Goblin Boss", the line renders in the DM's
       * own gold, and the journal records who said it. One control that turns
       * a narrator into a performer.
       */}
      <Deck
        id="cast" label="The cast" open={deck === 'cast'} onOpen={setDeck}
        badge={speakingAs ? speakingAs.name : undefined}
      >
        <p className="qa-desk-note">Pick a voice and the composer speaks as them.</p>
        <div className="qa-desk-voices">
          <button
            type="button"
            className={'qa-desk-voice' + (speakingAs === null ? ' is-on' : '')}
            onClick={() => { onSpeakAs(null); }}
          >
            Yourself
            <span className="qa-desk-voice-hint">Narrating the world</span>
          </button>
          {foes.map((f) => (
            <button
              key={f.id}
              type="button"
              className={'qa-desk-voice' + (speakingAs?.creatureId === f.id ? ' is-on' : '')}
              onClick={() => { onSpeakAs({ creatureId: f.id, name: f.name }); }}
            >
              {f.name}
              <span className="qa-desk-voice-hint">{f.hurt ?? 'On the board'}</span>
            </button>
          ))}
          {foes.length === 0 && (
            <p className="qa-desk-empty">
              Nothing here to speak as yet. Bring something in from the table deck.
            </p>
          )}
        </div>
        <NameAVoice onSpeakAs={onSpeakAs} />
      </Deck>

      <Deck id="room" label="The room" open={deck === 'room'} onOpen={setDeck}>
        <p className="qa-desk-note">Everyone sees this. Nothing is written down.</p>
        <div className="qa-desk-weather">
          {WEATHER.map((w) => (
            <button key={w.id} type="button" className="qa-desk-effect" onClick={() => { onEffect(w.id); }}>
              <span className="qa-desk-effect-label">{w.label}</span>
              <span className="qa-desk-effect-hint">{w.hint}</span>
            </button>
          ))}
        </div>
        {foes.length > 0 && (
          <>
            <p className="qa-desk-note">Take something off the board.</p>
            <div className="qa-desk-remove">
              {foes.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="qa-desk-do"
                  onClick={() => { onRemoveCreature(f.id); }}
                >
                  Remove {f.name}
                </button>
              ))}
            </div>
          </>
        )}
      </Deck>

      <Deck
        id="scene" label="The scene" open={deck === 'scene'} onOpen={setDeck}
        badge={exploring ? undefined : 'In a fight'}
      >
        {exploring ? (
          <div className="qa-desk-actions">
            {/* The loudest control on the desk, because starting a fight is the
                biggest thing a DM does to a table. */}
            <button type="button" className="qa-desk-go" onClick={onStartCombat}>
              Roll for initiative
            </button>
            <button type="button" className="qa-desk-do" onClick={() => { onRest('short'); }}>Short rest</button>
            <button type="button" className="qa-desk-do" onClick={() => { onRest('long'); }}>Long rest</button>
          </div>
        ) : (
          <div className="qa-desk-actions">
            <button type="button" className="qa-desk-go" onClick={onAdvanceTurn}>Next turn</button>
            <button type="button" className="qa-desk-do" onClick={onEndCombat}>End the fight</button>
          </div>
        )}
        <button type="button" className="qa-desk-do" onClick={onRules}>Look up a rule</button>
      </Deck>
    </aside>
  );
}

/**
 * One deck. Closed decks are a label and a badge — the badge is what lets a
 * closed deck still be useful ("2 away", "Goblin Boss"), which is what makes
 * one-open-at-a-time survivable.
 */
function Deck({
  id, label, badge, open, onOpen, children,
}: {
  id: DeckId;
  label: string;
  badge?: string | undefined;
  open: boolean;
  onOpen: (id: DeckId) => void;
  children: React.ReactNode;
}): ReactElement {
  return (
    <section className={'qa-deck' + (open ? ' is-open' : '')}>
      <button
        type="button"
        className="qa-deck-tab"
        aria-expanded={open}
        onClick={() => { onOpen(id); }}
      >
        <span className="qa-deck-label">{label}</span>
        {badge && <span className="qa-deck-badge">{badge}</span>}
      </button>
      {open && <div className="qa-deck-body">{children}</div>}
    </section>
  );
}

/**
 * A voice for somebody who is not on the board — the innkeeper, the voice
 * behind the door, the god who answers a prayer. Most of the people a DM
 * speaks as never become tokens, and a cast list limited to combatants would
 * miss nearly all of them.
 */
function NameAVoice({ onSpeakAs }: { onSpeakAs: (as: { name: string }) => void }): ReactElement {
  const [name, setName] = useState('');
  return (
    <form
      className="qa-desk-newvoice"
      onSubmit={(e) => {
        e.preventDefault();
        const n = name.trim();
        if (!n) return;
        onSpeakAs({ name: n });
        setName('');
      }}
    >
      <input
        className="qa-desk-input"
        value={name}
        placeholder="Somebody else — the innkeeper…"
        aria-label="Speak as somebody not on the board"
        onChange={(e) => { setName(e.target.value); }}
      />
      <button type="submit" className="qa-desk-do" disabled={!name.trim()}>Become them</button>
    </form>
  );
}
