/**
 * DeathSaveCard — replaces the ActionBar when a character is dying (Brief 10 §2:
 * "the hub flips"). Three success pips + three failure pips, and one big roll.
 * The card only surfaces the state + reports the roll; the SERVER decides the
 * outcome (the Brief 04 dying ladder) — this never mutates counters locally.
 *
 * Presentational, driven by the DeathSaveVM.
 *
 * Design: the Questra V1 Prototype sheet, §DeathSaveCard. A raised glass card
 * whose border carries the phase: danger while dying or dead, heal on revival.
 * Each phase says what it means in a plain sentence — including "Dead", which
 * hands the moment back to the table rather than closing it off.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';
import type { DeathSaveVM } from './sheetToPlayerHub.js';

export interface DeathSaveCardProps {
  state: DeathSaveVM;
  /** roll the one death save; disabled unless phase === 'dying'. */
  onRoll: () => void;
}

const HEADLINE: Record<DeathSaveVM['phase'], string> = {
  dying: 'Making death saves',
  stable: 'Stable',
  dead: 'Dead',
  up: 'Back on your feet',
};

/** Each phase says what it means — the app narrates, it doesn't just label. */
const BLURB: Record<DeathSaveVM['phase'], string> = {
  dying: 'The server counts. This card only reports the roll.',
  stable: 'Unconscious, but no longer dying.',
  dead: "The table decides what happens next — the app doesn't say no.",
  up: 'Revived — the flip returns the action tiles.',
};

const HEADLINE_COLOR: Record<DeathSaveVM['phase'], string> = {
  dying: 'var(--qa-glass-text)',
  stable: 'var(--qa-heal)',
  dead: 'var(--qa-danger)',
  up: 'var(--qa-glass-text)',
};

const BORDER: Record<DeathSaveVM['phase'], string> = {
  dying: 'color-mix(in srgb, var(--qa-danger) 45%, transparent)',
  stable: 'var(--qa-glass-border)',
  dead: 'color-mix(in srgb, var(--qa-danger) 45%, transparent)',
  up: 'color-mix(in srgb, var(--qa-heal) 45%, transparent)',
};

const microLabel: CSSProperties = {
  fontFamily: 'var(--qa-font-mono)',
  fontSize: 8.5,
  letterSpacing: 'var(--qa-track-label)',
  color: 'var(--qa-glass-dim)',
};

function Pips({
  n,
  filled,
  tone,
}: {
  n: number;
  filled: number;
  tone: 'success' | 'danger';
}): ReactElement {
  const color = tone === 'success' ? 'var(--qa-heal)' : 'var(--qa-danger)';
  return (
    <div
      style={{ display: 'flex', gap: 6 }}
      aria-label={`${filled} of ${n} ${tone === 'success' ? 'successes' : 'failures'}`}
    >
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: i < filled ? color : 'transparent',
            border: i < filled ? 'none' : `1px solid color-mix(in srgb, ${color} 60%, transparent)`,
            transition: 'background var(--qa-dur-fast) var(--qa-ease)',
          }}
        />
      ))}
    </div>
  );
}

export function DeathSaveCard({ state, onRoll }: DeathSaveCardProps): ReactElement {
  const [focused, setFocused] = useState(false);
  const dying = state.phase === 'dying';
  // Dead and revived are terminal — there is no save left to roll.
  const showRoll = dying || state.phase === 'stable';

  return (
    <div
      role="group"
      aria-label="Death saves"
      style={{
        padding: dying ? 16 : 14,
        borderRadius: 'var(--qa-radius-md)',
        background: 'var(--qa-glass-raised)',
        border: `1px solid ${BORDER[state.phase]}`,
        backdropFilter: 'blur(var(--qa-blur-raised))',
        WebkitBackdropFilter: 'blur(var(--qa-blur-raised))',
        display: 'flex',
        flexDirection: 'column',
        gap: dying ? 12 : 6,
        alignItems: 'center',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--qa-font-display)',
          fontSize: dying ? 'var(--qa-text-xl)' : 19,
          color: HEADLINE_COLOR[state.phase],
        }}
      >
        {HEADLINE[state.phase]}
      </span>

      {dying && (
        <div style={{ display: 'flex', gap: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            <Pips n={3} filled={state.successes} tone="success" />
            <span style={microLabel}>SAVES</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            <Pips n={3} filled={state.failures} tone="danger" />
            <span style={microLabel}>FAILS</span>
          </div>
        </div>
      )}

      {showRoll && (
        <button
          type="button"
          disabled={!dying}
          onClick={onRoll}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          title={dying ? undefined : 'No save needed while stable'}
          style={{
            width: '100%',
            fontFamily: 'var(--qa-font-display)',
            fontSize: dying ? 15 : 14,
            letterSpacing: dying ? '.5px' : undefined,
            border: 'none',
            borderRadius: 'var(--qa-radius-sm)',
            padding: dying ? '12px 26px' : 10,
            background: 'linear-gradient(180deg,var(--qa-ember),var(--qa-ember-deep))',
            color: 'var(--qa-vellum-bright)',
            boxShadow: dying ? 'var(--qa-glow-ember)' : 'none',
            opacity: dying ? 1 : 0.4,
            cursor: dying ? 'pointer' : 'default',
            ...(focused ? { boxShadow: 'var(--qa-focus-ring), var(--qa-glow-ember)' } : {}),
          }}
        >
          Roll a death save
        </button>
      )}

      <span
        style={{
          fontSize: 11.5,
          fontStyle: 'italic',
          color: 'var(--qa-glass-dim)',
          textAlign: 'center',
        }}
      >
        {BLURB[state.phase]}
      </span>
    </div>
  );
}
