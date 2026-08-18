/**
 * v2/JournalRail — the right edge: one place for everything the table said.
 *
 * ONE AREA, NOT THREE. The design request is explicit that the journal, the
 * log, and the rolls are a single area rather than three tabs a player has to
 * choose between: what happened, what was rolled, and what the assistant is
 * proposing all arrive in one stream in the order they happened, because that
 * is the order a table experiences them in. The player's own notes ride at the
 * top as a pinned callout, and the DM's secret notes never appear at all.
 *
 * ROLLS COLLAPSE (design request §6). A roll is one line — what was rolled and
 * what it came to. Tapping it opens the working: the die, each named modifier,
 * and the verdict against whatever it was compared to. Expanded by default
 * would turn a busy round into a wall of arithmetic, and law 4 says nothing on
 * this screen may demand reading while somebody is talking.
 *
 * A RULING SUGGESTION IS A PROPOSAL, NEVER A RULING. When the assistant reads a
 * player's free text it offers a roll and a difficulty with three responses —
 * ask for it, change it, skip it. Law 1: the engine resolves the maths, the
 * table decides the fiction. Nothing in this card applies itself.
 *
 * Collapsed, the rail is a thin strip with a rotated label and a dot when
 * something is waiting, exactly as in the LOG CLOSED reference — a player who
 * wants the map back gets the map back without losing the notification.
 */
import { useState, type FormEvent, type ReactElement } from 'react';
import { Button } from '@questra/ui';
import { Eyebrow, Glyph, narration, prose, quote, statMeta, statValue } from '../../design/index.js';
import type { LogEntryVM } from './viewModel.js';

const REACTIONS = ['👏', '🔥', '😂', '😮', '✨', '❤️'] as const;

export interface JournalRailProps {
  entries: LogEntryVM[];
  /** the player's own notes for this scene, pinned above the feed. */
  notes?: { title: string; lines: string[] };
  open: boolean;
  onToggle: () => void;
  /** how many suggestions are waiting — shown on the collapsed strip. */
  pendingCount?: number;
  onSend?: (text: string) => void;
  onReact?: (emoji: string) => void;
}

export function JournalRail({ entries, notes, open, onToggle, pendingCount = 0, onSend, onReact }: JournalRailProps): ReactElement {
  const [draft, setDraft] = useState('');

  // Collapsed, a pill in the corner rather than a strip down the window edge —
  // the point of collapsing it is to give the map back, and a full-height strip
  // gives back rather less than it looks like.
  if (!open) {
    return (
      <button type="button" className="qa2-pill is-journal" onClick={onToggle} aria-expanded={false} aria-label="Show the journal">
        {pendingCount > 0 && <span className="qa2-pill-dot" />}
        {pendingCount > 0 ? `Assistant · ${pendingCount} waiting` : 'Assistant · Journal'}
      </button>
    );
  }

  const send = (ev: FormEvent): void => {
    ev.preventDefault();
    const text = draft.trim();
    if (text.length === 0 || onSend === undefined) return;
    onSend(text);
    setDraft('');
  };

  return (
    <aside className="qa2-panel qa2-journal" aria-label="Journal">
      <div className="qa2-journal-head">
        <Eyebrow>Assistant · Journal</Eyebrow>
        <button type="button" className="qa2-ctl" style={{ width: 24, height: 24 }} onClick={onToggle} aria-label="Hide the journal" aria-expanded>
          <Glyph name="chevronRight" size={13} />
        </button>
      </div>

      <div className="qa2-feed">
        {notes !== undefined && (
          <div className="qa2-notes">
            <Eyebrow>{notes.title}</Eyebrow>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--qa-s2)' }}>
              {notes.lines.map((line) => (
                <li key={line} style={prose}>{line}</li>
              ))}
            </ul>
          </div>
        )}

        {/* marginTop:auto sits the stream on the composer — a short evening's
            log pinned to the top of a tall rail reads as an empty room. It is
            inline because a plain `margin: 0` here would out-specify the
            stylesheet and quietly undo it. */}
        <ol style={{ listStyle: 'none', margin: 0, marginTop: 'auto', padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--qa-s4)' }}>
          {entries.map((e) => (
            <li key={e.id}>
              <Entry entry={e} />
            </li>
          ))}
        </ol>

        {entries.length === 0 && notes === undefined && (
          <p style={{ ...prose, margin: 0 }}>Rolls and story gather here once the session starts.</p>
        )}
      </div>

      {onReact !== undefined && (
        <div className="qa2-react">
          {REACTIONS.map((emoji) => (
            <button key={emoji} type="button" className="qa2-reactbtn" onClick={() => onReact(emoji)} aria-label={`React with ${emoji}`}>
              <span aria-hidden="true">{emoji}</span>
            </button>
          ))}
        </div>
      )}

      {onSend !== undefined && (
        <form className="qa2-compose" onSubmit={send}>
          <label className="qa2-sr" htmlFor="qa2-journal-input">Say something to the table</label>
          <span className="qa2-open" style={{ flex: 1 }}>
            <input
              id="qa2-journal-input"
              className="qa2-input"
              value={draft}
              onChange={(ev) => setDraft(ev.target.value)}
              placeholder="Say something, or ask the assistant"
              autoComplete="off"
            />
          </span>
          <button type="submit" className="qa2-ctl" aria-label="Send">
            <Glyph name="send" size={14} />
          </button>
        </form>
      )}
    </aside>
  );
}

function Entry({ entry }: { entry: LogEntryVM }): ReactElement {
  const [openRoll, setOpenRoll] = useState(false);

  if (entry.tone === 'suggestion' && entry.suggestion !== undefined) {
    return (
      <div className="qa2-entry">
        <Eyebrow>{entry.actor}</Eyebrow>
        <div className="qa2-suggestion">
          <p style={{ ...quote, margin: 0 }}>&ldquo;{entry.text}&rdquo;</p>
          <p style={{ ...prose, margin: 0, color: 'var(--qa-ink)' }}>{entry.suggestion.detail}</p>
          <div style={{ display: 'flex', gap: 'var(--qa-s2)', flexWrap: 'wrap' }}>
            {entry.suggestion.actions.map((a, i) => (
              <Button key={a.label} variant={i === 0 ? 'primary' : 'quiet'} onClick={a.onClick} style={{ fontSize: 'var(--qa-text-label)', padding: 'var(--qa-s1) var(--qa-s3)' }}>
                {a.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (entry.tone === 'roll' && entry.roll !== undefined) {
    const roll = entry.roll;
    return (
      <div className="qa2-entry">
        <Eyebrow>{entry.actor}</Eyebrow>
        <button
          type="button"
          className="qa2-rollrow"
          onClick={() => setOpenRoll((v) => !v)}
          aria-expanded={openRoll}
          aria-label={`${entry.text}, total ${roll.total}. ${roll.verdict}. Show how this was worked out.`}
        >
          <span style={{ ...prose, color: 'var(--qa-ink)' }}>{entry.text}</span>
          <span style={statValue}>{roll.total}</span>
        </button>
        {openRoll && (
          <>
            <ul className="qa2-breakdown">
              {roll.rows.map((r) => (
                <li key={r.label}>
                  <span style={{ ...statMeta, fontSize: 'var(--qa-text-whisper)' }}>{r.label}</span>
                  <span style={{ ...statMeta, fontSize: 'var(--qa-text-whisper)', color: 'var(--qa-ink)' }}>{r.value}</span>
                </li>
              ))}
            </ul>
            <span className={`qa2-verdict is-${roll.tone}`} style={{ marginTop: 'var(--qa-s2)', marginLeft: 'var(--qa-s3)' }}>
              {roll.verdict}
            </span>
          </>
        )}
      </div>
    );
  }

  const isStory = entry.tone === 'narration';
  return (
    <div className="qa2-entry">
      <Eyebrow>{entry.actor}</Eyebrow>
      <p style={{ ...(isStory ? narration : prose), margin: 0 }}>{entry.text}</p>
    </div>
  );
}
