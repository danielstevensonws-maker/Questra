/**
 * "Give me a perception check." — the DM's most-used sentence, as a control.
 *
 * SKILLS ARE NOT ALPHABETICAL HERE. The eighteen SRD skills sorted by name put
 * Acrobatics first and Perception tenth, which is exactly backwards: a handful
 * get asked for constantly and the rest almost never. The common ones lead, so
 * the usual ask is one tap rather than a hunt through a list mid-sentence.
 *
 * WHO IT IS FOR DEFAULTS TO EVERYONE, because "everyone give me a perception
 * check" is the single most common form of this. Narrowing to one person is the
 * deliberate act, not the default one.
 *
 * SECRET IS A REAL TOOL, NOT A GIMMICK: players must not know they failed to
 * spot the ambush, because knowing they failed is itself information. It is off
 * by default — the ordinary case is said out loud, where everyone hears the ask
 * and watches the roll.
 */
import { useState, type ReactElement } from 'react';
import { skillName } from './promptsFrom.js';

/** The skills a DM actually reaches for, in the order they reach for them. */
const COMMON = [
  'perception', 'insight', 'investigation', 'persuasion', 'stealth', 'athletics',
] as const;

const REST = [
  'acrobatics', 'animal_handling', 'arcana', 'deception', 'history', 'intimidation',
  'medicine', 'nature', 'performance', 'religion', 'sleight_of_hand', 'survival',
] as const;

export interface CheckTarget {
  creatureId: string;
  name: string;
}

export interface AskForCheckProps {
  /** Everyone who could be asked — the players at the table. */
  targets: CheckTarget[];
  onAsk: (ask: { skill: string; creatureIds: string[]; secret: boolean }) => void;
}

export function AskForCheck({ targets, onAsk }: AskForCheckProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  /* Empty means everybody — the common case, so it is where this starts. */
  const [only, setOnly] = useState<string | null>(null);
  const [secret, setSecret] = useState(false);

  const ask = (skill: string): void => {
    onAsk({ skill, creatureIds: only ? [only] : [], secret });
    setOpen(false);
    setShowAll(false);
    setOnly(null);
    setSecret(false);
  };

  if (!open) {
    return (
      <button type="button" className="qa2-pill" onClick={() => { setOpen(true); }}>
        Ask for a roll
      </button>
    );
  }

  return (
    <div className="qa2-panel qa-ask">
      <header className="qa-ask-head">
        <span className="qa-dm-kicker">Ask for a roll</span>
        <button type="button" className="qa-dm-drawer-toggle" onClick={() => { setOpen(false); }}>Close</button>
      </header>

      {/* Who owes it. "Everyone" first because it is the usual answer. */}
      <div className="qa-ask-who">
        <button
          type="button"
          className={'qa2-pill' + (only === null ? ' is-on' : '')}
          onClick={() => { setOnly(null); }}
        >
          Everyone
        </button>
        {targets.map((t) => (
          <button
            key={t.creatureId}
            type="button"
            className={'qa2-pill' + (only === t.creatureId ? ' is-on' : '')}
            onClick={() => { setOnly(t.creatureId); }}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="qa-ask-skills">
        {COMMON.map((s) => (
          <button key={s} type="button" className="qa-ask-skill" onClick={() => { ask(s); }}>
            {skillName(s)}
          </button>
        ))}
        {showAll && REST.map((s) => (
          <button key={s} type="button" className="qa-ask-skill" onClick={() => { ask(s); }}>
            {skillName(s)}
          </button>
        ))}
      </div>

      {!showAll && (
        <button type="button" className="qa2-quiet-link" onClick={() => { setShowAll(true); }}>
          The rest of them
        </button>
      )}

      {/* Off by default: the ordinary ask is said out loud. */}
      <label className="qa-ask-secret">
        <input type="checkbox" checked={secret} onChange={(e) => { setSecret(e.target.checked); }} />
        <span>Roll it myself — do not tell them</span>
      </label>
    </div>
  );
}
