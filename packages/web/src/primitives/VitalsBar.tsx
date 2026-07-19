/**
 * VitalsBar — the player hub's at-a-glance state (Brief 10 §2): HP (watched), AC,
 * and conditions, each condition and AC carrying a tap-"?" to its InfoPanel
 * derivation (§1: no orphan math). Composes the design-system primitives
 * (@questra/ui HPBar + Chip) rather than reinventing bars/pills (Playbook §3).
 *
 * Presentational: it takes the VitalsVM view-model (built by sheetToPlayerHub)
 * and an onExplain callback the "?" fires — it holds no game state.
 */
import type { ReactElement } from 'react';
import { HPBar, Chip } from '@questra/ui';
import type { VitalsVM } from './sheetToPlayerHub.js';

export interface VitalsBarProps {
  vitals: VitalsVM;
  /** tap-"?" on AC or a condition ⇒ open its InfoPanel. `ref` is 'ac' or a condition id. */
  onExplain?: (ref: string) => void;
  /** dimmed while dying (Brief 10 §2: vitals dimmed in the death-save state). */
  dimmed?: boolean;
}

export function VitalsBar({ vitals, onExplain, dimmed = false }: VitalsBarProps): ReactElement {
  const { hp, ac, conditions, bloodied } = vitals;
  return (
    <div
      className="flex items-center gap-4 px-4 py-3"
      style={{ opacity: dimmed ? 0.45 : 1, transition: 'opacity var(--q-dur) var(--q-ease)' }}
      aria-label="Vitals"
    >
      {/* HP — watched; the bar turns ember when bloodied (the colour IS the info). */}
      <div className="min-w-[140px] flex-1">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-ink-faint">Hit Points</span>
          {bloodied && <Chip tone="danger">Bloodied</Chip>}
        </div>
        <HPBar value={hp.current} max={hp.max} height={7} />
        {hp.temp > 0 && <span className="mt-1 block text-xs text-ink-soft">+{hp.temp} temporary</span>}
      </div>

      {/* AC — tap-"?" reveals its derivation. */}
      <button
        type="button"
        className="flex flex-col items-center rounded-sm px-2 py-1 hover:bg-surface-raised"
        onClick={() => onExplain?.('ac')}
        aria-label={`Armor Class ${ac.value} — explain`}
      >
        <span className="text-lg font-semibold text-ink">{ac.value}</span>
        <span className="text-xs text-ink-faint">AC&nbsp;?</span>
      </button>

      {/* Conditions — each a tap-"?" chip. */}
      {conditions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {conditions.map((c) => (
            <button key={c.id} type="button" onClick={() => onExplain?.(c.id)} aria-label={`${c.name} — explain`}>
              <Chip tone="steel">{c.name}&nbsp;?</Chip>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
