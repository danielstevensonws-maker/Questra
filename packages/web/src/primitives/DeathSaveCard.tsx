/**
 * DeathSaveCard — replaces the ActionBar when a character is dying (Brief 10 §2:
 * "the hub flips"). Three success pips + three failure pips, and one big roll.
 * The card only surfaces the state + reports the roll; the SERVER decides the
 * outcome (the Brief 04 dying ladder) — this never mutates counters locally.
 *
 * Presentational, driven by the DeathSaveVM. Themed via tokens.
 */
import type { ReactElement } from 'react';
import type { DeathSaveVM } from './sheetToPlayerHub.js';

export interface DeathSaveCardProps {
  state: DeathSaveVM;
  /** roll the one death save; disabled unless phase === 'dying'. */
  onRoll: () => void;
}

function Pips({ n, filled, tone }: { n: number; filled: number; tone: 'success' | 'danger' }): ReactElement {
  const color = tone === 'success' ? 'var(--q-success)' : 'var(--q-danger)';
  return (
    <div className="flex gap-1.5" aria-label={`${filled} of ${n} ${tone === 'success' ? 'successes' : 'failures'}`}>
      {Array.from({ length: n }, (_, i) => (
        <span
          key={i}
          className="h-3 w-3 rounded-full"
          style={{
            background: i < filled ? color : 'transparent',
            border: `1.5px solid ${color}`,
            opacity: i < filled ? 1 : 0.4,
          }}
        />
      ))}
    </div>
  );
}

const HEADLINE: Record<DeathSaveVM['phase'], string> = {
  dying: 'Making death saves',
  stable: 'Stable',
  dead: 'Dead',
  up: 'Back on your feet',
};

export function DeathSaveCard({ state, onRoll }: DeathSaveCardProps): ReactElement {
  const dying = state.phase === 'dying';
  return (
    <div
      className="flex flex-col items-center gap-4 rounded-lg px-6 py-6"
      style={{ background: 'var(--q-surface-raised)', boxShadow: 'var(--q-shadow-panel)' }}
      role="group"
      aria-label="Death saves"
    >
      <span className="text-sm tracking-wide text-ink-soft uppercase">{HEADLINE[state.phase]}</span>

      <div className="flex items-center gap-8">
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs text-ink-faint">Successes</span>
          <Pips n={3} filled={state.successes} tone="success" />
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-xs text-ink-faint">Failures</span>
          <Pips n={3} filled={state.failures} tone="danger" />
        </div>
      </div>

      <button
        type="button"
        disabled={!dying}
        onClick={onRoll}
        className="rounded-md px-8 py-3 text-lg font-semibold disabled:opacity-40"
        style={{ background: 'var(--q-accent)', color: 'var(--q-bg)' }}
      >
        Roll death save
      </button>
    </div>
  );
}
