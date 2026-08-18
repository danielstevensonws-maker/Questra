/**
 * DeathSaveCard — replaces the ActionBar when a character is dying (Brief 10
 * §2: "the hub flips"). Three success pips + three failure pips, and one big
 * roll. The card only surfaces the state + reports the roll; the SERVER
 * decides the outcome (the Brief 04 dying ladder) — this never mutates
 * counters locally.
 *
 * Presentational, driven by the DeathSaveVM. A raised glass card whose
 * border carries the phase: danger while dying or dead, success on
 * revival/stable. Each phase says what it means in a plain sentence —
 * including "Dead", which hands the moment back to the table rather than
 * closing it off (CLAUDE.md law 2: the app never says no).
 */
import { useState, type ReactElement } from 'react';
import type { DeathSaveVM } from './sheetToPlayerHub.js';

export interface DeathSaveCardProps {
  state: DeathSaveVM;
  /** roll the one death save; disabled unless phase === 'dying'. */
  onRoll: () => void;
}

const mono = 'var(--qa-font-mono)';
const body = 'var(--qa-font-body)';
const display = 'var(--qa-font-display)';

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
  up: 'Revived — action tiles are back.',
};

const PHASE_COLOR: Record<DeathSaveVM['phase'], string> = {
  dying: 'var(--qa-ink)',
  stable: 'var(--qa-success)',
  dead: 'var(--qa-danger)',
  up: 'var(--qa-success)',
};

const BORDER: Record<DeathSaveVM['phase'], string> = {
  dying: 'var(--qa-danger)',
  stable: 'var(--qa-glass-border)',
  dead: 'var(--qa-danger)',
  up: 'var(--qa-success)',
};

function Pips({ n, filled, tone }: { n: number; filled: number; tone: 'success' | 'danger' }): ReactElement {
  const color = tone === 'success' ? 'var(--qa-success)' : 'var(--qa-danger)';
  return (
    <div style={{ display: 'flex', gap: 6 }} aria-label={`${filled} of ${n} ${tone === 'success' ? 'successes' : 'failures'}`}>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          style={{
            width: 12,
            height: 12,
            borderRadius: 'var(--qa-radius-round)',
            background: i < filled ? color : 'transparent',
            border: `1.5px solid ${color}`,
            opacity: i < filled ? 1 : 0.4,
          }}
        />
      ))}
    </div>
  );
}

export function DeathSaveCard({ state, onRoll }: DeathSaveCardProps): ReactElement {
  const dying = state.phase === 'dying';
  const showRoll = dying || state.phase === 'stable';

  return (
    <div
      role="group"
      aria-label="Death saves"
      style={{
        padding: 'var(--qa-s5)',
        borderRadius: 'var(--qa-radius-lg)',
        background: 'var(--qa-glass-solid)',
        border: `1px solid ${BORDER[state.phase]}`,
        backdropFilter: 'blur(var(--qa-glass-blur))',
        WebkitBackdropFilter: 'blur(var(--qa-glass-blur))',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--qa-s4)',
      }}
    >
      <span style={{ fontFamily: display, fontSize: 'var(--qa-text-lg)', color: PHASE_COLOR[state.phase] }}>{HEADLINE[state.phase]}</span>

      {dying && (
        <div style={{ display: 'flex', gap: 'var(--qa-s6)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s2)', alignItems: 'center' }}>
            <Pips n={3} filled={state.successes} tone="success" />
            <span style={{ fontFamily: mono, fontSize: 'var(--qa-text-whisper)', letterSpacing: 'var(--qa-tracking-caps)', color: 'var(--qa-ink-faint)' }}>
              Saves
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s2)', alignItems: 'center' }}>
            <Pips n={3} filled={state.failures} tone="danger" />
            <span style={{ fontFamily: mono, fontSize: 'var(--qa-text-whisper)', letterSpacing: 'var(--qa-tracking-caps)', color: 'var(--qa-ink-faint)' }}>
              Fails
            </span>
          </div>
        </div>
      )}

      {showRoll && (
        <button
          type="button"
          disabled={!dying}
          onClick={onRoll}
          title={dying ? undefined : 'No save needed while stable'}
          style={{
            width: '100%',
            height: 44,
            fontFamily: body,
            fontSize: 'var(--qa-text-body)',
            fontWeight: 500,
            border: 'none',
            borderRadius: 'var(--qa-radius)',
            background: 'var(--qa-accent)',
            color: 'var(--qa-accent-ink)',
            opacity: dying ? 1 : 0.4,
            cursor: dying ? 'pointer' : 'default',
            boxShadow: dying ? '0 8px 24px -8px var(--qa-accent-glow)' : 'none',
            transition: 'box-shadow var(--qa-dur) var(--qa-ease)',
          }}
        >
          Roll a death save
        </button>
      )}

      <span style={{ fontFamily: body, fontSize: 'var(--qa-text-whisper)', fontStyle: 'italic', color: 'var(--qa-ink-faint)', textAlign: 'center' }}>
        {BLURB[state.phase]}
      </span>
    </div>
  );
}
