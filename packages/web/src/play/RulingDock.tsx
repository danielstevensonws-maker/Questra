/**
 * What players want to do, waiting on the DM.
 *
 * THREE ANSWERS, NOT TWO. The obvious build gives a DM yes and no, and it is
 * wrong: the most common real answer to "can I do this?" is neither — it is
 * "try it and we will see", which is what a roll is for. So the middle button
 * turns the request into a check, and that is the one placed first among the
 * three because it is the one reached for most.
 *
 * IT SITS WHERE THE ACCENT MEANS "NEEDS YOU". On this screen the accent is
 * reserved for things waiting on a decision, and a player who has described
 * something and is waiting is the clearest case there is.
 *
 * REFUSING IS NOT RUDE AND IS NOT A FAILURE. "No, the door is iron" is a DM
 * doing their job, and the button says what it does rather than apologising for
 * it. What matters is that the player finds out — a request that silently
 * scrolls away is the thing this component exists to prevent.
 */
import { useState, type ReactElement } from 'react';
import { skillName } from './promptsFrom.js';
import type { RulingRequestVM } from './rulingsFrom.js';

/** The skills a DM reaches for when somebody tries something. */
const FOR_ATTEMPTS = [
  'athletics', 'acrobatics', 'perception', 'insight', 'persuasion', 'arcana',
] as const;

export interface RulingDockProps {
  requests: RulingRequestVM[];
  onRule: (onSeq: number, verdict: 'allow' | 'refuse') => void;
  onAskRoll: (onSeq: number, skill: string, creatureIds: string[]) => void;
  /** Who described it, so a roll can be asked of the right person. */
  creatureIdFor: (request: RulingRequestVM) => string | null;
}

export function RulingDock({ requests, onRule, onAskRoll, creatureIdFor }: RulingDockProps): ReactElement | null {
  const [pickingFor, setPickingFor] = useState<number | null>(null);

  const active = requests[0];
  if (!active) return null;

  const waiting = requests.length - 1;
  const creatureId = creatureIdFor(active);

  return (
    <div className="qa2-panel qa-ruling" aria-label="Waiting on you">
      <header className="qa-ruling-head">
        <span className="qa-ruling-kicker">{active.who} wants to</span>
        {waiting > 0 && (
          <span className="qa-prompt-queued">
            {waiting === 1 ? 'One more' : `${String(waiting)} more`}
          </span>
        )}
      </header>

      <p className="qa-ruling-text">{active.text}</p>

      {pickingFor === active.seq ? (
        <>
          <p className="qa-ruling-hint">What do they roll?</p>
          <div className="qa-ruling-skills">
            {FOR_ATTEMPTS.map((s) => (
              <button
                key={s}
                type="button"
                className="qa-ask-skill"
                onClick={() => {
                  onAskRoll(active.seq, s, creatureId ? [creatureId] : []);
                  setPickingFor(null);
                }}
              >
                {skillName(s)}
              </button>
            ))}
          </div>
          <button type="button" className="qa2-quiet-link" onClick={() => { setPickingFor(null); }}>
            Back
          </button>
        </>
      ) : (
        <div className="qa-ruling-actions">
          {/* First, because "try it and we will see" is the commonest answer. */}
          <button type="button" className="qa2-cta" onClick={() => { setPickingFor(active.seq); }}>
            Ask for a roll
          </button>
          <button type="button" className="qa2-pill" onClick={() => { onRule(active.seq, 'allow'); }}>
            It works
          </button>
          <button type="button" className="qa2-quiet-link" onClick={() => { onRule(active.seq, 'refuse'); }}>
            Not this time
          </button>
        </div>
      )}
    </div>
  );
}
