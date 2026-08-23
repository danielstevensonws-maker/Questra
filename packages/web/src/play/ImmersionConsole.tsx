/**
 * ImmersionConsole — the DM's atmosphere controls (Brief 10 §3, §4).
 *
 * COLLAPSED BY DEFAULT, AND THAT IS THE DESIGN. A DM's attention during play is
 * the scarcest resource on the table; a permanently-open panel of effects is a
 * tab open on a decision nobody is making. It sits as one quiet button until
 * somebody reaches for it, which is exactly when a storm should start.
 *
 * EFFECTS ARE EPHEMERAL, NOT EVENTS (§4). Thunder has no replay value — nobody
 * reconnecting to a session wants the last hour of weather replayed at them, and
 * a log full of "shake" buries the story it exists to hold. They go out on the
 * channel, they land, they are gone. That is the opposite of the rule for
 * everything the composer sends, and the difference is whether it is part of the
 * play RECORD.
 *
 * REDUCE MOTION IS NON-NEGOTIABLE (§4, accessibility). The suppression lives at
 * the receiving end, per viewer, because it is a property of the person
 * watching rather than of the effect — a DM must not have to remember who at
 * the table gets motion sick.
 */
import { useState, type ReactElement } from 'react';

export type EffectId = 'shake' | 'torch' | 'rain' | 'thunder' | 'blood' | 'fade';

interface EffectDef {
  id: EffectId;
  label: string;
  /** What it does, said plainly — the tab is not a place for jargon. */
  hint: string;
}

/**
 * The six from the brief. Named for what a DM would SAY at the table ("torch
 * flicker") rather than for the CSS that implements them.
 */
const EFFECTS: EffectDef[] = [
  { id: 'shake', label: 'Shake', hint: 'The ground moves' },
  { id: 'torch', label: 'Torch flicker', hint: 'The light gutters' },
  { id: 'rain', label: 'Rain', hint: 'It starts to pour' },
  { id: 'thunder', label: 'Thunder', hint: 'A crack overhead' },
  { id: 'blood', label: 'Blood', hint: 'The edges go red' },
  { id: 'fade', label: 'Fade', hint: 'Everything goes dark' },
];

export interface ImmersionConsoleProps {
  onEffect: (effect: EffectId) => void;
}

export function ImmersionConsole({ onEffect }: ImmersionConsoleProps): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <div className={'qa-console' + (open ? ' is-open' : '')}>
      <button
        type="button"
        className="qa2-pill qa-console-toggle"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? 'Close' : 'Atmosphere'}
      </button>

      {open && (
        <div className="qa2-panel qa-console-panel" aria-label="Atmosphere">
          <p className="qa-console-note">Everyone at the table sees this. It is not recorded.</p>
          <div className="qa-console-grid">
            {EFFECTS.map((e) => (
              <button
                key={e.id}
                type="button"
                className="qa-console-effect"
                onClick={() => onEffect(e.id)}
              >
                <span className="qa-console-label">{e.label}</span>
                <span className="qa-console-hint">{e.hint}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
