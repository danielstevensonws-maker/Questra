/**
 * CardSequencer — the reorderable card list. Playbook §3 primitive, reused by
 * scenes in a session and sessions in a campaign: the "one pattern, three
 * floors" ordering made concrete.
 *
 * Plain language (CLAUDE.md non-negotiable #7): these are SCENES and SESSIONS,
 * never "beats" or "nodes". The item labels come from the caller; the reorder
 * announcements below stay in plain terms.
 *
 * Reordering is keyboard-first: every item has Move up / Move down controls, so
 * it works without a pointer (accessibility is not an enhancement). Native drag
 * is layered on top for mouse users; it never becomes the only way to reorder.
 *
 * Content-agnostic: each item is a SequenceItem {id, render()} view-model; the
 * caller decides what a card looks like. The sequencer owns only the order.
 *
 * Design: the Questra V1 Prototype sheet, §CardSequencer. Rows are opaque
 * --qa-ink-raised with a ⠿ handle + position column, 24px square move buttons
 * (dimmed at the ends), a danger-outlined remove, an ember drop indicator while
 * dragging, and a dashed empty state. Themed entirely via --qa-* tokens.
 */
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';

export interface SequenceItem {
  id: string;
  /** The card body. The caller renders scene/session content; we frame + order it. */
  render: ReactNode;
}

export interface CardSequencerProps {
  /** Plural noun for what's being ordered ("scenes", "sessions"). Plain language. */
  itemNoun: string;
  items: SequenceItem[];
  /** Called with the reordered id list on every move. The caller owns the data. */
  onReorder: (nextOrderedIds: string[]) => void;
  /** Optional per-item remove. Omit for fixed-membership lists. */
  onRemove?: (id: string) => void;
  /** Shown when there are no items yet. */
  emptyLabel?: ReactNode;
}

export function CardSequencer({
  itemNoun,
  items,
  onReorder,
  onRemove,
  emptyLabel = 'Nothing here yet.',
}: CardSequencerProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const liveRef = useRef<HTMLDivElement>(null);
  const singular = itemNoun.replace(/s$/, '');

  function moveTo(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const next = items.map((it) => it.id);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    onReorder(next);
    setAnnounce(`Moved ${singular} to position ${to + 1} of ${items.length}.`);
  }

  if (items.length === 0) {
    return (
      <div
        style={{
          padding: '20px 12px',
          border: '1px dashed var(--qa-hairline)',
          borderRadius: 'var(--qa-radius)',
          textAlign: 'center',
          fontSize: 12.5,
          fontStyle: 'italic',
          color: 'var(--qa-vellum-dim)',
        }}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div>
      {/* screen-reader announcement of each reorder */}
      <div ref={liveRef} aria-live="polite" style={srOnly}>
        {announce}
      </div>

      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => {
          const dragging = dragId === it.id;
          return (
            <li key={it.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* ember drop indicator above the row the drag is over */}
              {overId === it.id && dragId !== it.id && <DropBar />}
              <div
                draggable
                onDragStart={() => setDragId(it.id)}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                onDragOver={(e) => { e.preventDefault(); setOverId(it.id); }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragId === null) return;
                  const from = items.findIndex((x) => x.id === dragId);
                  if (from !== -1) moveTo(from, i);
                  setDragId(null);
                  setOverId(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderRadius: 'var(--qa-radius)',
                  background: 'var(--qa-ink-raised)',
                  border: '1px solid var(--qa-hairline-soft)',
                  opacity: dragging ? 0.5 : 1,
                  transition: 'opacity var(--qa-dur-fast) var(--qa-ease)',
                }}
              >
                {/* handle + position */}
                <span
                  aria-hidden
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 2,
                    width: 20,
                    color: 'var(--qa-vellum-faint)',
                    cursor: 'grab',
                  }}
                >
                  <span style={{ fontSize: 12 }}>⠿</span>
                  <span style={{ fontFamily: 'var(--qa-font-mono)', fontSize: 9 }}>{i + 1}</span>
                </span>

                <span style={{ flex: 1, minWidth: 0 }}>{it.render}</span>

                {dragging ? (
                  <span style={{ fontFamily: 'var(--qa-font-mono)', fontSize: 8, letterSpacing: 1, color: 'var(--qa-vellum-faint)' }}>
                    DRAGGING
                  </span>
                ) : (
                  <span style={{ display: 'flex', gap: 4 }}>
                    <MoveButton label={`Move ${singular} up`} disabled={i === 0} onClick={() => moveTo(i, i - 1)}>
                      ↑
                    </MoveButton>
                    <MoveButton label={`Move ${singular} down`} disabled={i === items.length - 1} onClick={() => moveTo(i, i + 1)}>
                      ↓
                    </MoveButton>
                    {onRemove && (
                      <MoveButton label={`Remove ${singular}`} tone="danger" onClick={() => onRemove(it.id)}>
                        ✕
                      </MoveButton>
                    )}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function DropBar() {
  return (
    <div
      aria-hidden
      style={{
        height: 2,
        borderRadius: 1,
        background: 'var(--qa-ember)',
        boxShadow: '0 0 8px color-mix(in srgb, var(--qa-ember) 60%, transparent)',
      }}
    />
  );
}

function MoveButton({
  children,
  label,
  onClick,
  disabled,
  tone,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'danger';
}) {
  const [focused, setFocused] = useState(false);
  const danger = tone === 'danger';
  const base: CSSProperties = {
    width: 24,
    height: 24,
    borderRadius: 'var(--qa-radius-xs)',
    fontSize: 12,
    lineHeight: 1,
    cursor: disabled ? 'default' : 'pointer',
    background: danger ? 'transparent' : 'var(--qa-vellum-ghost)',
    border: danger
      ? '1px solid color-mix(in srgb, var(--qa-danger) 45%, transparent)'
      : '1px solid var(--qa-hairline)',
    color: danger
      ? 'var(--qa-danger)'
      : disabled
        ? 'var(--qa-vellum-faint)'
        : 'var(--qa-vellum-dim)',
    opacity: disabled ? 0.4 : 1,
    ...(focused && !disabled ? { boxShadow: 'var(--qa-focus-ring)' } : {}),
  };
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={base}
    >
      {children}
    </button>
  );
}

const srOnly: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
};
