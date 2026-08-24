/**
 * DmScreen — the screen you run the game from (Brief 10 §3).
 *
 * THE JOB IS DIFFERENT FROM A PLAYER'S. A player's screen answers "what do I
 * do?" — one character, deep. A DM's answers "what is going on, and what needs
 * me?" — every character, shallow, plus the things only they know.
 *
 * THREE ZONES, AND NOTHING FLOATS OVER THE MAP:
 *
 *   the desk (left rail)  — every control, four decks, always in the same place
 *   the map (centre)      — never covered; it is what everyone is looking at
 *   the journal (right)   — the record, and the composer you speak from
 *
 * The version this replaces had nine glass panels of equal weight, several of
 * which opened on top of the map. Nothing said where to look, and every control
 * was named for a NOUN rather than the act it performs (owner, 2026-08-25: "the
 * design feels flat and not engaging"). The desk is the fix: one home for the
 * eye, a verb on every button, and the map left alone.
 *
 * THE ACCENT MEANS NEEDS YOU. On a player's screen --qa-accent means YOU. A DM
 * has no token, so here it marks the thing waiting on a decision — a turn, a
 * prompt, a player who has described something. Reserving it that strictly is
 * what keeps a screen carrying everybody's information from reading as a wall.
 *
 * GOLD MEANS YOUR VOICE, and appears nowhere else. Pick somebody from the cast
 * deck and the composer turns gold, sets itself in the story face, and what
 * lands in the journal is the goblin speaking rather than the DM narrating.
 *
 * The DM receives the WHOLE room — unrevealed cells, hidden creatures, the lot
 * — because filterRoomForViewer passes their payload through untouched. That
 * asymmetry is settled server-side; nothing here decides it.
 */
import { useEffect, useRef, useState, type ReactElement } from 'react';
import type { Cell, Room } from '@questra/contracts';
import { MapCanvas, type TokenPresentation } from '../primitives/MapCanvas.js';
import { ScreenStyles } from '../primitives/v2/ScreenStyles.js';
import { PromptDock, type PromptVM } from './PromptDock.js';
import { EffectLayer } from './EffectLayer.js';
import { Compendium } from './Compendium.js';
import { AskForCheck } from './AskForCheck.js';
import { AddCreature } from './AddCreature.js';
import { RulingDock } from './RulingDock.js';
import { DirectorDesk } from './DirectorDesk.js';
import type { EffectId } from './ImmersionConsole.js';
import type { RulingRequestVM } from './rulingsFrom.js';
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
  seats: DmSeat[];
  prompts: PromptVM[];
  rulings: RulingRequestVM[];
  effect: EffectId | null;
  fetchJson: <T>(path: string) => Promise<T>;
  onLeave: () => void;
  onSay: (text: string) => void;
  onSpeakAs: (as: { creatureId?: string; name: string }, text: string) => void;
  onWhisper: (toAccountId: string, text: string) => void;
  onStartCombat: () => void;
  onEndCombat: () => void;
  onAdvanceTurn: () => void;
  onRest: (rest: 'short' | 'long') => void;
  onAnswerPrompt: (promptId: string, take: boolean, optionName?: string) => void;
  onAskCheck: (ask: { skill: string; creatureIds: string[]; secret: boolean }) => void;
  onRule: (onSeq: number, verdict: 'allow' | 'refuse') => void;
  onAddCreature: (c: { name: string; maxHp: number; ac: number; monsterId?: string }) => void;
  onRemoveCreature: (creatureId: string) => void;
  onEffect: (effect: EffectId) => void;
  /** Moving somebody around the board by hand. */
  onMove: (tokenId: string, path: Cell[]) => void;
}

export function DmScreen(props: DmScreenProps): ReactElement {
  const {
    view, room, campaignName, seats, prompts, rulings, effect, fetchJson,
    onLeave, onSay, onSpeakAs, onWhisper, onStartCombat, onEndCombat, onAdvanceTurn,
    onRest, onAnswerPrompt, onAskCheck, onRule, onAddCreature, onRemoveCreature, onEffect, onMove,
  } = props;

  const [line, setLine] = useState('');
  const [spotlit, setSpotlit] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [whisperTo, setWhisperTo] = useState('');
  const [whisperText, setWhisperText] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  /* Who the DM is performing as. Null is the DM narrating as themselves. */
  const [voice, setVoice] = useState<{ creatureId?: string; name: string } | null>(null);
  /* Moving a token by hand: tap somebody, then tap where they go. */
  const [moving, setMoving] = useState<{ tokenId: string; from: Cell } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const exploring = view.turn.exploring;

  /* The newest line is the one you need. A journal that must be scrolled to be
     current is a journal nobody reads mid-sentence. */
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [view.entries.length]);

  const say = (): void => {
    const text = line.trim();
    if (!text) return;
    /* One composer, two acts: narrating the world, or performing in it. The
       chosen voice decides which, so the DM never hunts for a second box. */
    if (voice) onSpeakAs(voice, text);
    else onSay(text);
    setLine('');
  };

  const whisper = (): void => {
    const text = whisperText.trim();
    if (!text || !whisperTo) return;
    onWhisper(whisperTo, text);
    setWhisperText('');
  };

  /** Who each token is, to the DM: everybody by name, foes marked as foes. */
  const present: Record<string, TokenPresentation> = {};
  for (const c of view.cast) {
    present[c.id] = {
      name: c.name,
      side: c.kind === 'foe' ? 'foe' : 'ally',
      ...(c.status ? { tag: c.status } : c.hurt ? { tag: c.hurt } : {}),
    };
  }

  return (
    <div className="qa2-screen qa-dm qa-dm-desked">
      <ScreenStyles />
      <MapCanvas
        room={room}
        mode="play"
        fit="fill"
        present={present}
        {...(moving ? { measureFrom: moving.from } : {})}
        onTokenClick={(ref) => {
          /* A DM moves anybody. Tapping picks up; tapping again puts down. */
          const token = room.tokens.find((t) => t.creatureRef === ref || t.id === ref);
          if (!token) return;
          setSpotlit(ref);
          setMoving((m) => (m && m.tokenId === token.id ? null : { tokenId: token.id, from: token.cell }));
        }}
        onCellClick={(cell) => {
          if (!moving) return;
          onMove(moving.tokenId, [moving.from, cell]);
          setMoving(null);
        }}
      />

      {moving && <p className="qa-map-hint">Tap a square to move them there</p>}

      {/* Everything the DM presses, in one place that never covers the map. */}
      <DirectorDesk
        cast={view.cast}
        seats={seats}
        exploring={exploring}
        round={view.scene.round}
        speakingAs={voice}
        onSpeakAs={setVoice}
        spotlit={spotlit}
        onSpotlight={setSpotlit}
        onEffect={onEffect}
        onStartCombat={onStartCombat}
        onEndCombat={onEndCombat}
        onAdvanceTurn={onAdvanceTurn}
        onRest={onRest}
        onAddCreature={() => { setAddOpen(true); }}
        onAskCheck={() => { setAskOpen(true); }}
        onRules={() => { setRulesOpen(true); }}
        onRemoveCreature={onRemoveCreature}
      />

      {/* The scene name, centred over the map the way it is on a player's
          screen, so a DM glancing between two devices finds it in one place. */}
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

      <PromptDock prompts={prompts} onAnswer={onAnswerPrompt} />

      {/* What a player described and is waiting to hear about. Law 2's escape
          hatch only works if somebody is on the other side of it. */}
      <RulingDock
        requests={rulings}
        onRule={onRule}
        onAskRoll={(onSeq, skill, creatureIds) => {
          onAskCheck({ skill, creatureIds, secret: false });
          onRule(onSeq, 'allow');
        }}
        creatureIdFor={(r) => view.cast.find((c) => c.name === r.who)?.id ?? null}
      />

      {/* ---- Assistant · Journal: the record, and where you speak from ---- */}
      <section className="qa2-panel qa-dm-journal" aria-label="Assistant and journal">
        <header className="qa-dm-head">
          <span className="qa-dm-kicker">Assistant · Journal</span>
          <button
            type="button"
            className="qa-dm-drawer-toggle"
            aria-expanded={drawerOpen}
            onClick={() => { setDrawerOpen(!drawerOpen); }}
          >
            {drawerOpen ? 'Close' : 'Only you'}
          </button>
        </header>

        {drawerOpen && (
          <div className="qa-dm-drawer">
            <p className="qa-dm-drawer-note">Nobody else sees what you send from here.</p>
            <form className="qa-dm-whisper" onSubmit={(e) => { e.preventDefault(); whisper(); }}>
              <select
                className="qa-dm-select"
                aria-label="Who to whisper to"
                value={whisperTo}
                onChange={(e) => { setWhisperTo(e.target.value); }}
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
                onChange={(e) => { setWhisperText(e.target.value); }}
              />
              <button type="submit" className="qa2-cta qa-dm-send" disabled={!whisperText.trim() || !whisperTo}>
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

        {/* One composer, three jobs (Brief 10 §4.1) — and now a fourth: the
            voice chosen in the cast deck turns narration into performance
            without moving the DM to a different field. */}
        <form
          className={'qa-dm-compose' + (voice ? ' is-voiced' : '')}
          onSubmit={(e) => { e.preventDefault(); say(); }}
        >
          {voice && <span className="qa-dm-voicetag">As {voice.name}</span>}
          <input
            className="qa-dm-input"
            value={line}
            placeholder={voice ? `What does ${voice.name} say?` : 'Tell them what happens, or ask the assistant'}
            aria-label={voice ? `Speak as ${voice.name}` : 'Tell them what happens, or ask the assistant'}
            onChange={(e) => { setLine(e.target.value); }}
          />
          <button type="submit" className="qa2-cta qa-dm-send" disabled={!line.trim()}>Say it</button>
        </form>
      </section>

      {askOpen && (
        <AskForCheck
          targets={view.cast.filter((c) => c.kind !== 'foe').map((c) => ({ creatureId: c.id, name: c.name }))}
          onAsk={(ask) => { onAskCheck(ask); setAskOpen(false); }}
          onClose={() => { setAskOpen(false); }}
        />
      )}
      {addOpen && (
        <AddCreature
          fetchJson={fetchJson}
          onAdd={(c) => { onAddCreature(c); setAddOpen(false); }}
          onClose={() => { setAddOpen(false); }}
        />
      )}
      {rulesOpen && <Compendium fetchJson={fetchJson} onClose={() => { setRulesOpen(false); }} />}

      <EffectLayer effect={effect} />
    </div>
  );
}
