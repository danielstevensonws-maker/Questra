/**
 * DiceLog — the table's combined chat + dice + assistant record (Brief 10
 * §2). Narration entries are the engine's plain-English narration for a
 * resolved event (the pipeline's narration step, M2.9); chat entries are
 * what players actually typed; a `suggestion` entry is an embedded AI ruling
 * proposal (Brief 09c) with its own accept/tweak/reject-shaped actions.
 * Together the log reads like table talk, never like math.
 *
 * Presentational: it takes already-formatted entries (built from the folded
 * log upstream) and renders newest-last. No game state here — `open` (the
 * drawer) is UI-only state, same footing as InfoPanel's layer-expand state.
 *
 * Design reference (v2): "Referrence images/LOG CLOSED.PNG" + "LOG OPEN.PNG",
 * laid out per "Desktop - 1.png" — a full-height panel docked to the screen
 * edge, not a small floating box. Collapsed, it's a thin strip with a
 * rotated label and a notification dot; open, it's a proper panel with a
 * pinned notes callout, a plain `LABEL / sentence` feed (lighter than a
 * bordered card per entry), and a free-text input at the bottom (CLAUDE.md
 * law 2's escape hatch). Because it's full-height now, it's a SIBLING of
 * PlayerHub in a screen composition, not a child of it.
 */
import { useState, type ReactElement } from 'react';
import { itemName, prose, sectionLabel, statMeta } from './hudType.js';

export interface DiceLogAction {
  label: string;
  onClick: () => void;
}

export interface DiceLogEntry {
  id: string;
  tone?: 'roll' | 'narration' | 'chat' | 'system' | 'suggestion';
  /** speaker/source label, e.g. "DM", "Torvald", "Engine", "Ruling Suggestion". */
  actor?: string;
  /** narration prose, a chat message, a roll summary, or a suggestion's quoted trigger. */
  text: string;
  /** roll entries: "HIT — 8 slashing". suggestion entries: "Suggested: DEX (Acrobatics) · DC 13 — on a fail, she lands prone." */
  outcome?: string;
  breakdown?: { label: string; value: number }[];
  total?: number;
  /** suggestion entries only — up to three responses (e.g. Ask for the roll / Change it / No roll). */
  actions?: DiceLogAction[];
}

export interface DiceLogProps {
  entries: DiceLogEntry[];
  /** a pinned callout above the feed — the DM's session notes for this scene. */
  notes?: { title: string; lines: string[] };
  emptyLabel?: string;
  /** the drawer starts open or collapsed. Default true. */
  defaultOpen?: boolean;
  /** shown on the collapsed strip when > 0 — "N suggestion(s)" instead of the idle label. */
  pendingCount?: number;
  /** the free-text escape hatch — omit to render read-only, with no input row. */
  onSend?: (text: string) => void;
}


const OPEN_WIDTH = 340;
const CLOSED_WIDTH = 52;

export function DiceLog({ entries, notes, emptyLabel = 'Rolls and story will gather here once the session starts.', defaultOpen = true, pendingCount = 0, onSend }: DiceLogProps): ReactElement {
  const [open, setOpen] = useState(defaultOpen);
  const [draft, setDraft] = useState('');

  function commit() {
    const text = draft.trim();
    if (text === '' || onSend === undefined) return;
    onSend(text);
    setDraft('');
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open the table log"
        aria-expanded={false}
        style={{
          width: CLOSED_WIDTH,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--qa-s3)',
          padding: 'var(--qa-s4) 0',
          background: 'var(--qa-glass-solid)',
          border: 'var(--qa-hairline) solid var(--qa-glass-border)',
          borderRight: 'none',
          borderRadius: 'var(--qa-radius-lg) 0 0 var(--qa-radius-lg)',
          cursor: 'pointer',
        }}
      >
        {/* writing-mode (not a transform) so the box is actually tall-and-narrow
            in layout, not just in paint — a rotate() hack leaves the flex gap
            computed against the text's UNROTATED (short, wide) box, which is
            what put the dot on top of the label instead of past its end.
            vertical-rl + rotate(180deg) reads bottom-to-top, so the END of the
            sentence sits at the TOP of its box — the dot goes above it (rendered
            first here) to land past the end, not the start. */}
        {pendingCount > 0 && (
          <span
            aria-hidden="true"
            style={{ width: 7, height: 7, borderRadius: 'var(--qa-radius-round)', background: 'var(--qa-accent)', boxShadow: '0 0 8px var(--qa-accent-glow)', flex: 'none' }}
          />
        )}
        <span
          style={{
            ...sectionLabel,
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
            whiteSpace: 'nowrap',
            color: pendingCount > 0 ? 'var(--qa-accent)' : 'var(--qa-ink-faint)',
          }}
        >
          {pendingCount > 0 ? `Assistant · ${pendingCount} suggestion${pendingCount === 1 ? '' : 's'}` : 'Table Log'}
        </span>
      </button>
    );
  }

  return (
    <section
      aria-label="Table log"
      style={{
        width: OPEN_WIDTH,
        height: '100%',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 'var(--qa-radius-lg) 0 0 var(--qa-radius-lg)',
        background: 'var(--qa-glass-solid)',
        border: 'var(--qa-hairline) solid var(--qa-glass-border)',
        borderRight: 'none',
        overflow: 'hidden',
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--qa-s3) var(--qa-s4)', borderBottom: 'var(--qa-hairline) solid var(--qa-glass-border)' }}>
        <span style={{ ...sectionLabel, color: 'var(--qa-ink-dim)' }}>Assistant · Table Log</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Collapse the table log"
          aria-expanded={true}
          style={{ ...sectionLabel, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          »
        </button>
      </header>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--qa-s4)', display: 'flex', flexDirection: 'column', gap: 'var(--qa-s4)' }}>
        {notes !== undefined && (
          <div style={{ background: 'var(--qa-chip)', border: 'var(--qa-hairline) solid var(--qa-glass-border)', borderRadius: 'var(--qa-radius)', padding: 'var(--qa-s3)' }}>
            <p style={{ ...sectionLabel, margin: '0 0 var(--qa-s2)' }}>{notes.title}</p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {notes.lines.map((line, i) => (
                <li key={i} style={prose}>
                  — {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        {entries.length === 0 ? (
          <p style={{ ...prose, margin: 0, fontStyle: 'italic', color: 'var(--qa-ink-faint)' }}>{emptyLabel}</p>
        ) : (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--qa-s3)' }}>
            {entries.map((e) => (
              <li key={e.id}>
                <Entry entry={e} />
              </li>
            ))}
          </ol>
        )}
      </div>

      {onSend !== undefined && (
        <div style={{ display: 'flex', gap: 'var(--qa-s2)', padding: 'var(--qa-s3) var(--qa-s4)', borderTop: 'var(--qa-hairline) solid var(--qa-glass-border)' }}>
          <input
            type="text"
            value={draft}
            onChange={(ev) => setDraft(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === 'Enter') {
                ev.preventDefault();
                commit();
              }
            }}
            placeholder="Prompt, roleplay, or ask the assistant…"
            aria-label="Prompt, roleplay, or ask the assistant"
            style={{
              ...prose,
              flex: 1,
              minWidth: 0,
              background: 'var(--qa-chip)',
              border: 'var(--qa-hairline) solid var(--qa-glass-border)',
              borderRadius: 'var(--qa-radius)',
              padding: 'var(--qa-s2)',
              color: 'var(--qa-ink)',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={commit}
            aria-label="Send"
            disabled={draft.trim() === ''}
            style={{
              ...statMeta,
              flex: 'none',
              width: 32,
              borderRadius: 'var(--qa-radius)',
              border: 'none',
              background: 'var(--qa-accent)',
              color: 'var(--qa-accent-ink)',
              opacity: draft.trim() === '' ? 0.4 : 1,
              cursor: draft.trim() === '' ? 'default' : 'pointer',
            }}
          >
            ↵
          </button>
        </div>
      )}
    </section>
  );
}

function Entry({ entry }: { entry: DiceLogEntry }): ReactElement {
  const tone = entry.tone ?? 'narration';

  if (tone === 'system') {
    return (
      <p style={{ ...sectionLabel, margin: 0 }}>{entry.text}</p>
    );
  }

  if (tone === 'suggestion') return <SuggestionEntry entry={entry} />;

  // roll, narration, and chat share one shape now: a small mono-caps source
  // label on its own line, then a plain sentence — matching the reference's
  // restraint (no bordered card for an ordinary line).
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {entry.actor !== undefined && <span style={sectionLabel}>{entry.actor}</span>}
      <span style={{ ...prose, fontStyle: tone === 'narration' ? 'italic' : 'normal' }}>{entry.text}</span>
      {entry.outcome !== undefined && <span style={{ ...statMeta, color: 'var(--qa-ink-faint)' }}>{entry.outcome}</span>}
    </div>
  );
}

/** An embedded AI ruling proposal — the log's own compact accept/tweak/reject shape. */
function SuggestionEntry({ entry }: { entry: DiceLogEntry }): ReactElement {
  return (
    <div
      style={{
        border: '1px solid var(--qa-accent-line)',
        background: 'var(--qa-accent-soft)',
        borderRadius: 'var(--qa-radius)',
        padding: 'var(--qa-s3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--qa-s2)',
      }}
    >
      <span style={{ ...sectionLabel, color: 'var(--qa-accent)' }}>{entry.actor ?? 'Ruling Suggestion'}</span>
      <span style={{ ...prose, fontStyle: 'italic', color: 'var(--qa-ink)' }}>&ldquo;{entry.text}&rdquo;</span>
      {entry.outcome !== undefined && <span style={prose}>{entry.outcome}</span>}
      {entry.actions !== undefined && entry.actions.length > 0 && (
        <div style={{ display: 'flex', gap: 'var(--qa-s2)', flexWrap: 'wrap' }}>
          {entry.actions.map((a, i) => (
            <button
              key={a.label}
              type="button"
              onClick={a.onClick}
              style={{
                ...itemName,
                padding: '4px var(--qa-s2)',
                borderRadius: 'var(--qa-radius-sm)',
                cursor: 'pointer',
                background: i === 0 ? 'var(--qa-accent)' : 'transparent',
                color: i === 0 ? 'var(--qa-accent-ink)' : 'var(--qa-ink-dim)',
                border: i === 0 ? 'none' : 'var(--qa-hairline) solid var(--qa-glass-border)',
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
