/**
 * DiceLog — the running record of rolls + outcomes in plain English (Brief 10 §2).
 * Each entry is the engine's narration for a resolved event (the pipeline's
 * narration step, M2.9) — so the log reads like table talk, never like math.
 * A roll entry can expand to its itemized modifiers (the named-modifier breakdown
 * the roll_made event carries).
 *
 * Presentational: it takes already-formatted entries (built from the folded log
 * upstream) and renders newest-last. No game state here.
 */
import type { ReactElement } from 'react';

export interface DiceLogEntry {
  id: string;
  /** the plain-English line (engine narration or a roll summary). */
  text: string;
  /** optional itemized modifiers for a roll ("STR +3", "Proficiency +2", "Bless (1d4) +3"). */
  breakdown?: { label: string; value: number }[];
  /** total, shown as the mono readout for a roll entry. */
  total?: number;
  tone?: 'roll' | 'narration' | 'system';
}

export interface DiceLogProps {
  entries: DiceLogEntry[];
}

export function DiceLog({ entries }: DiceLogProps): ReactElement {
  return (
    <ol className="flex flex-col gap-1.5 px-4 py-3" aria-label="Dice log">
      {entries.map((e) => (
        <li key={e.id} className="flex items-start justify-between gap-3 text-sm">
          <div className="flex flex-col gap-0.5">
            <span style={{ color: e.tone === 'narration' ? 'var(--q-ink)' : 'var(--q-ink-soft)' }}>{e.text}</span>
            {e.breakdown && e.breakdown.length > 0 && (
              <span className="font-mono text-xs text-ink-faint">
                {e.breakdown.map((m) => `${m.label} ${m.value >= 0 ? '+' : ''}${m.value}`).join('  ')}
              </span>
            )}
          </div>
          {e.total !== undefined && <span className="font-mono text-sm font-semibold text-ink">{e.total}</span>}
        </li>
      ))}
    </ol>
  );
}
