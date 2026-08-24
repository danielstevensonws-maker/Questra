/**
 * Console — the tab strip a DM works from, over the map.
 *
 * WHY A STRIP AND NOT A RAIL. Five concerns that are each occasionally the
 * whole job — sound, music, voices, the board, effects — and never two at once.
 * A rail gives all five permanent width for the four you are not using; tabs
 * give the one you are using all of it. It sits bottom-centre because that is
 * where a control surface belongs when the thing it controls is above it.
 *
 * THE TAB IS A NOUN AND THE CONTENT IS VERBS. "NPCs" names a place to go;
 * "Become" is what you do when you get there. Naming the tabs as verbs would
 * make five verbs compete, and the strip is navigation rather than action.
 *
 * IT SITS OVER THE MAP AND THAT IS THE POINT. A DM adjusting the light is
 * looking at the room while they do it, not at a settings screen — the previous
 * version put these behind panels that covered what they were adjusting.
 */
import { useState, type ReactElement } from 'react';
import type { EffectId } from './ImmersionConsole.js';
import type { SpineEntryVM } from '../primitives/v2/viewModel.js';

export type ConsoleTab = 'sound' | 'music' | 'npcs' | 'map' | 'effects';

export interface ConsoleProps {
  cast: SpineEntryVM[];
  exploring: boolean;
  /** Who the DM is speaking as, if anybody. */
  voice: { creatureId?: string; name: string } | null;
  onVoice: (v: { creatureId?: string; name: string } | null) => void;
  onEffect: (e: EffectId) => void;
  onStartCombat: () => void;
  onEndCombat: () => void;
  onAdvanceTurn: () => void;
  onRest: (rest: 'short' | 'long') => void;
  onAddCreature: () => void;
  onRemoveCreature: (creatureId: string) => void;
  onAskCheck: () => void;
  onRules: () => void;
}

const TABS: { id: ConsoleTab; label: string }[] = [
  { id: 'sound', label: 'Sound' },
  { id: 'music', label: 'Music' },
  { id: 'npcs', label: 'NPCs' },
  { id: 'map', label: 'Map' },
  { id: 'effects', label: 'Effects' },
];

/** Named for what a DM would say, not for the CSS behind them. */
const EFFECTS: { id: EffectId; label: string; hint: string }[] = [
  { id: 'thunder', label: 'Thunder', hint: 'A crack overhead' },
  { id: 'rain', label: 'Rain', hint: 'It starts to pour' },
  { id: 'torch', label: 'Torchlight', hint: 'The light gutters' },
  { id: 'shake', label: 'Tremor', hint: 'The ground moves' },
  { id: 'blood', label: 'Blood', hint: 'The edges go red' },
  { id: 'fade', label: 'Blackout', hint: 'Everything goes dark' },
];

export function Console(props: ConsoleProps): ReactElement {
  const {
    cast, exploring, voice, onVoice, onEffect,
    onStartCombat, onEndCombat, onAdvanceTurn, onRest,
    onAddCreature, onRemoveCreature, onAskCheck, onRules,
  } = props;

  const [tab, setTab] = useState<ConsoleTab | null>('npcs');
  const [newVoice, setNewVoice] = useState('');
  const foes = cast.filter((c) => c.kind === 'foe');

  return (
    <div className="qa-console2">
      <div className="qa-console2-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={'qa-console2-tab' + (tab === t.id ? ' is-on' : '')}
            onClick={() => { setTab(tab === t.id ? null : t.id); }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab !== null && (
        <div className="qa-console2-body">
          {/**
           * SOUND AND MUSIC ARE HONEST ABOUT NOT EXISTING. Both need a vendor
           * decision (ADR-0016 DP-2) and a licensed library before they can
           * play anything, and a tab full of dead buttons is worse than a tab
           * that says what it is waiting for.
           */}
          {tab === 'sound' && (
            <p className="qa-console2-soon">
              Ambience and one-shots land here once the audio library is chosen. Nothing plays yet.
            </p>
          )}
          {tab === 'music' && (
            <p className="qa-console2-soon">
              Scene music lands here once the audio library is chosen. Nothing plays yet.
            </p>
          )}

          {tab === 'npcs' && (
            <>
              <div className="qa-console2-cards">
                <button
                  type="button"
                  className={'qa-npc' + (voice === null ? ' is-on' : '')}
                  onClick={() => { onVoice(null); }}
                >
                  <span className="qa-npc-name">Yourself</span>
                  <span className="qa-npc-voice">Narrating the world</span>
                  <span className="qa-npc-do">{voice === null ? 'Speaking' : 'Become'}</span>
                </button>

                {foes.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    className={'qa-npc' + (voice?.creatureId === f.id ? ' is-on' : '')}
                    onClick={() => { onVoice({ creatureId: f.id, name: f.name }); }}
                  >
                    <span className="qa-npc-name">{f.name}</span>
                    <span className="qa-npc-voice">{f.hurt ?? 'On the board'}</span>
                    <span className="qa-npc-do">{voice?.creatureId === f.id ? 'Speaking' : 'Become'}</span>
                  </button>
                ))}
              </div>

              {/* Most people a DM speaks as never become tokens — the
                  innkeeper, the voice behind the door, the god who answers. */}
              <form
                className="qa-console2-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  const n = newVoice.trim();
                  if (!n) return;
                  onVoice({ name: n });
                  setNewVoice('');
                }}
              >
                <input
                  className="qa-console2-input"
                  value={newVoice}
                  placeholder="Somebody not on the board — the innkeeper…"
                  aria-label="Speak as somebody not on the board"
                  onChange={(e) => { setNewVoice(e.target.value); }}
                />
                <button type="submit" className="qa-console2-do" disabled={!newVoice.trim()}>Become them</button>
              </form>
            </>
          )}

          {tab === 'map' && (
            <div className="qa-console2-row">
              <button type="button" className="qa-console2-do" onClick={onAddCreature}>Bring something in</button>
              {foes.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className="qa-console2-do"
                  onClick={() => { onRemoveCreature(f.id); }}
                >
                  Remove {f.name}
                </button>
              ))}
            </div>
          )}

          {tab === 'effects' && (
            <div className="qa-console2-cards">
              {EFFECTS.map((e) => (
                <button key={e.id} type="button" className="qa-npc" onClick={() => { onEffect(e.id); }}>
                  <span className="qa-npc-name">{e.label}</span>
                  <span className="qa-npc-voice">{e.hint}</span>
                  <span className="qa-npc-do">Play it</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/**
       * THE SCENE CONTROLS SIT OUTSIDE THE TABS, always visible, because
       * whose turn it is cannot be behind a tab. One loud button — the thing
       * you are most likely to press next — and the rest quiet beside it.
       */}
      <div className="qa-console2-scene">
        {exploring ? (
          <>
            <button type="button" className="qa-console2-go" onClick={onStartCombat}>Roll for initiative</button>
            <button type="button" className="qa-console2-do" onClick={onAskCheck}>Ask for a roll</button>
            <button type="button" className="qa-console2-do" onClick={() => { onRest('short'); }}>Short rest</button>
            <button type="button" className="qa-console2-do" onClick={() => { onRest('long'); }}>Long rest</button>
          </>
        ) : (
          <>
            <button type="button" className="qa-console2-go" onClick={onAdvanceTurn}>Next turn</button>
            <button type="button" className="qa-console2-do" onClick={onAskCheck}>Ask for a roll</button>
            <button type="button" className="qa-console2-do" onClick={onEndCombat}>End the fight</button>
          </>
        )}
        <button type="button" className="qa-console2-do" onClick={onRules}>Rules</button>
      </div>
    </div>
  );
}
