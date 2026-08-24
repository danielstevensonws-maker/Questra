/**
 * DmScreen — the screen you run the game from (Brief 10 §3).
 *
 * THE JOB IS DIFFERENT FROM A PLAYER'S. A player's screen answers "what do I
 * do?" — one character, deep. A DM's answers "what is going on, and what needs
 * me?" — every character, shallow, plus the things only they know.
 *
 * FOUR SURFACES, EACH WHERE IT BELONGS:
 *
 *   what only you know   top-left, quiet — the private verbs
 *   the roster           bottom-left, the player's own card language
 *   the console          bottom-centre, tabs over the thing they control
 *   the journal          the full right edge, collapsible to a spine
 *
 * WHAT WENT WRONG BEFORE. The first pass was a left rail of full-width slabs
 * in one flat caps voice, and a journal in a small floating box. It shared no
 * vocabulary with the player's screen and had no hierarchy — everything was
 * the same size and the same weight, so nothing had rank (owner, 2026-08-25).
 *
 * The fix was to stop inventing a second design language and match the one the
 * player's screen already speaks: cards with a chip, a name in the story face,
 * a mono line, and a bar. Three levels of contrast and no more.
 *
 * THE ACCENT IS RATIONED. Terracotta marks whoever the table is waiting for.
 * --qa-danger carries hurt. Gold is the DM's own voice and appears only on a
 * chosen NPC and the composer they speak from.
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
import { Console } from './Console.js';
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
  const [whisperOpen, setWhisperOpen] = useState(false);
  const [whisperTo, setWhisperTo] = useState('');
  const [whisperText, setWhisperText] = useState('');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  /* The journal starts open: it is the play record, and a DM reads it
     constantly. Closing it is the deliberate act. */
  const [railOpen, setRailOpen] = useState(true);
  const [voice, setVoice] = useState<{ creatureId?: string; name: string } | null>(null);
  const [moving, setMoving] = useState<{ tokenId: string; from: Cell } | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const exploring = view.turn.exploring;

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
    setWhisperOpen(false);
  };

  /** Who each token is, to the DM: everybody by name, foes marked as foes. */
  const present: Record<string, TokenPresentation> = {};
  for (const c of view.cast) {
    present[c.id] = {
      name: c.name,
      side: c.kind === 'foe' ? 'foe' : 'ally',
      acting: c.acting,
      ...(c.status ? { tag: c.status } : c.hurt ? { tag: c.hurt } : {}),
    };
  }

  const waiting = prompts.length + rulings.length;

  return (
    <div className="qa2-screen qa-dm">
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

      {/* The scene, centred over the map — the same anchor a player's screen
          uses, so a DM glancing between two devices finds it in one place. */}
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

      <DirectorDesk
        cast={view.cast}
        seats={seats}
        spotlit={spotlit}
        onSpotlight={setSpotlit}
        /* Override and undo are the engine's to implement (Brief 10 §3); until
           they are, saying so beats a button that lies about working. */
        onOverride={() => { onSay('(override is not wired yet)'); }}
        onUndo={() => { onSay('(undo is not wired yet)'); }}
        onSecretRoll={() => { setAskOpen(true); }}
        onWhisper={() => { setWhisperOpen(true); }}
      />

      <Console
        cast={view.cast}
        exploring={exploring}
        voice={voice}
        onVoice={setVoice}
        onEffect={onEffect}
        onStartCombat={onStartCombat}
        onEndCombat={onEndCombat}
        onAdvanceTurn={onAdvanceTurn}
        onRest={onRest}
        onAddCreature={() => { setAddOpen(true); }}
        onRemoveCreature={onRemoveCreature}
        onAskCheck={() => { setAskOpen(true); }}
        onRules={() => { setRulesOpen(true); }}
      />

      <PromptDock prompts={prompts} onAnswer={onAnswerPrompt} />

      <RulingDock
        requests={rulings}
        onRule={onRule}
        onAskRoll={(onSeq, skill, creatureIds) => {
          onAskCheck({ skill, creatureIds, secret: false });
          onRule(onSeq, 'allow');
        }}
        creatureIdFor={(r) => view.cast.find((c) => c.name === r.who)?.id ?? null}
      />

      {/* ---- the journal: the full right edge, collapsible ---------------- */}
      <aside className={'qa-rail' + (railOpen ? '' : ' is-shut')} aria-label="Assistant and journal">
        {railOpen ? (
          <>
            <header className="qa-rail-head">
              <span className="qa-rail-title">Assistant · Journal</span>
              <button
                type="button"
                className="qa-rail-toggle"
                aria-expanded
                aria-label="Close the journal"
                onClick={() => { setRailOpen(false); }}
              >
                →
              </button>
            </header>

            <div className="qa-rail-body">
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

              {whisperOpen && (
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

              {/* One composer, and the chosen voice decides what it IS. */}
              <form
                className={'qa-dm-compose' + (voice ? ' is-voiced' : '')}
                onSubmit={(e) => { e.preventDefault(); say(); }}
              >
                {voice && <span className="qa-dm-voicetag">As {voice.name}</span>}
                <input
                  className="qa-dm-input"
                  value={line}
                  placeholder={voice ? `What does ${voice.name} say?` : 'Prompt, roleplay, or ask the assistant'}
                  aria-label={voice ? `Speak as ${voice.name}` : 'Prompt, roleplay, or ask the assistant'}
                  onChange={(e) => { setLine(e.target.value); }}
                />
                <button type="submit" className="qa2-cta qa-dm-send" disabled={!line.trim()}>Say it</button>
              </form>
            </div>
          </>
        ) : (
          /* Shut, it still reports what is waiting — closing the journal must
             never mean losing track of a player who needs an answer. */
          <button
            type="button"
            className="qa-rail-spine"
            aria-expanded={false}
            aria-label="Open the journal"
            onClick={() => { setRailOpen(true); }}
          >
            Assistant
            {waiting > 0 && (
              <span className="is-waiting">
                {waiting === 1 ? '1 waiting' : `${String(waiting)} waiting`}
              </span>
            )}
          </button>
        )}
      </aside>

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
