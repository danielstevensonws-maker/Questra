/**
 * DiceLog — the running record of rolls + outcomes in plain English (Brief 10 §2).
 * Each entry is the engine's narration for a resolved event (the pipeline's
 * narration step, M2.9) — so the log reads like table talk, never like math.
 * A roll entry carries its itemized modifiers (the named-modifier breakdown the
 * roll_made event ships) and its total.
 *
 * Presentational: it takes already-formatted entries (built from the folded log
 * upstream) and renders newest-last. No game state here.
 *
 * Design: the Questra V1 Prototype sheet, §DiceLog. Three tones, each with its
 * own voice:
 *   roll      — soft ink, mono breakdown beneath, total right-aligned
 *   narration — full-strength ink, reads like table talk
 *   system    — a mono whisper
 */
import type { CSSProperties, ReactElement } from 'react';

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
  /** shown before the first entry lands. */
  emptyLabel?: string;
}

const whisper: CSSProperties = {
  fontFamily: 'var(--qa-font-mono)',
  fontSize: 9,
  letterSpacing: 1,
  color: 'var(--qa-vellum-faint)',
};

function Entry({ entry }: { entry: DiceLogEntry }): ReactElement {
  const tone = entry.tone ?? 'narration';

  if (tone === 'system') {
    return (
      <li style={{ ...whisper, fontSize: 10, textTransform: 'uppercase' }}>{entry.text}</li>
    );
  }

  if (tone === 'roll') {
    return (
      <li style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--qa-glass-dim)' }}>{entry.text}</span>
          {entry.total !== undefined && (
            <span
              style={{ fontFamily: 'var(--qa-font-mono)', fontSize: 12, color: 'var(--qa-glass-text)' }}
            >
              {entry.total}
            </span>
          )}
        </div>
        {entry.breakdown && entry.breakdown.length > 0 && (
          <span style={{ ...whisper, textTransform: 'uppercase' }}>
            {entry.breakdown
              .map((m) => `${m.label} ${m.value >= 0 ? '+' : ''}${m.value}`)
              .join(' · ')}
          </span>
        )}
      </li>
    );
  }

  // narration — the loudest voice in the log, because it is the story
  return <li style={{ fontSize: 12.5, color: 'var(--qa-glass-text)' }}>{entry.text}</li>;
}

export function DiceLog({
  entries,
  emptyLabel = 'Rolls and story will gather here once the session starts.',
}: DiceLogProps): ReactElement {
  if (entries.length === 0) {
    return (
      <p
        style={{
          margin: 0,
          padding: '18px 0',
          fontSize: 12.5,
          fontStyle: 'italic',
          color: 'var(--qa-glass-dim)',
        }}
      >
        {emptyLabel}
      </p>
    );
  }

  return (
    <ol
      aria-label="Table log"
      style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 9 }}
    >
      {entries.map((e) => (
        <Entry key={e.id} entry={e} />
      ))}
    </ol>
  );
}
