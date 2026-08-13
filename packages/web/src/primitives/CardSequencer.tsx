/**
 * CardSequencer — the reorderable card list (Build Playbook §3; component-list
 * A6; Session Planner + Campaign Wrapper design specs).
 *
 * Owns ORDER AND NOTHING ELSE. The caller decides what a card looks like
 * (`SequenceItem.render`); the sequencer frames it, numbers it, and reports
 * the new order via `onReorder`. One primitive serves both "scenes within a
 * session" and "sessions within a campaign" — the only difference is the
 * caller's card component and `itemNoun`.
 *
 * KEYBOARD-FIRST, DRAG SECOND (accessibility is not an enhancement). Every
 * row has explicit Move up / Move down buttons — the primary mechanism, and
 * the only one required to work. Native HTML5 drag is layered on top for
 * mouse users; it is never the only way to reorder.
 *
 * Plain language (CLAUDE.md non-negotiable #7): the noun comes from the
 * caller and threads through every generated string ("Move scene up",
 * "Moved scene to position 3 of 4") — there is no hardcoded "beat"/"node"
 * jargon to leak.
 */
import { useState } from 'react';
import type { DragEvent, ReactNode } from 'react';

export interface SequenceItem {
  id: string;
  render: ReactNode;
}

export interface CardSequencerProps {
  items: SequenceItem[];
  /** Fires with the FULL reordered id list on every move — the caller owns the array. */
  onReorder: (nextOrderedIds: string[]) => void;
  /** Plural, e.g. "scenes" / "sessions" — singularised internally for labels and announcements. */
  itemNoun: string;
  /** Omit for a fixed-membership list — the ✕ column only renders when this is supplied. */
  onRemove?: (id: string) => void;
}

const mono = 'var(--qa-font-mono)';
const body = 'var(--qa-font-body)';

const srOnly = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 'none',
} as const;

function singular(noun: string): string {
  return noun.replace(/s$/, '');
}

/** The one reorder path both buttons and drag call. Bounds-guarded; returns null for a no-op move. */
function moveTo<T>(items: T[], from: number, to: number): T[] | null {
  if (to < 0 || to >= items.length || from === to) return null;
  const next = items.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved as T);
  return next;
}

export function CardSequencer({ items, onReorder, itemNoun, onRemove }: CardSequencerProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const noun = singular(itemNoun);
  const handleRemove = onRemove;

  function move(from: number, to: number) {
    const next = moveTo(items, from, to);
    if (next === null) return;
    onReorder(next.map((item) => item.id));
    setAnnouncement(`Moved ${noun} to position ${to + 1} of ${items.length}.`);
  }

  function onDrop(targetId: string) {
    if (draggedId === null) return;
    const from = items.findIndex((item) => item.id === draggedId);
    const to = items.findIndex((item) => item.id === targetId);
    if (from !== -1 && to !== -1) move(from, to);
    setDraggedId(null);
  }

  return (
    <div>
      <span aria-live="polite" style={srOnly}>
        {announcement}
      </span>
      <ol
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          background: 'var(--qa-chip)',
          border: 'var(--qa-hairline) solid var(--qa-glass-border)',
          borderRadius: 'var(--qa-radius)',
          overflow: 'hidden',
        }}
      >
        {items.map((item, i) => (
          <li
            key={item.id}
            draggable
            onDragStart={() => setDraggedId(item.id)}
            onDragOver={(e: DragEvent<HTMLLIElement>) => e.preventDefault()}
            onDrop={() => onDrop(item.id)}
            onDragEnd={() => setDraggedId(null)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--qa-s3)',
              padding: 'var(--qa-s3) var(--qa-s4)',
              borderTop: i === 0 ? undefined : 'var(--qa-hairline) solid var(--qa-glass-border)',
              opacity: draggedId === item.id ? 0.5 : 1,
              fontFamily: body,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                flex: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontFamily: mono,
                fontSize: 'var(--qa-text-whisper)',
                color: 'var(--qa-ink-faint)',
                cursor: 'grab',
              }}
            >
              <span>⠿</span>
              <span>{i + 1}</span>
            </span>

            <div style={{ flex: 1, minWidth: 0 }}>{item.render}</div>

            <div style={{ flex: 'none', display: 'flex', gap: 'var(--qa-s1)' }}>
              <RowButton label={`Move ${noun} up`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                ▲
              </RowButton>
              <RowButton label={`Move ${noun} down`} disabled={i === items.length - 1} onClick={() => move(i, i + 1)}>
                ▼
              </RowButton>
              {handleRemove !== undefined && (
                <RowButton label={`Remove ${noun}`} danger onClick={() => handleRemove(item.id)}>
                  ✕
                </RowButton>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function RowButton({
  label,
  disabled = false,
  danger = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  danger?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 24,
        height: 24,
        display: 'grid',
        placeItems: 'center',
        background: 'transparent',
        border: 'var(--qa-hairline) solid var(--qa-glass-border)',
        borderRadius: 'var(--qa-radius-sm)',
        fontFamily: mono,
        fontSize: 10,
        color: danger ? 'var(--qa-danger)' : 'var(--qa-ink-dim)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.3 : 1,
        transition: 'border-color var(--qa-dur) var(--qa-ease), background var(--qa-dur) var(--qa-ease)',
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.borderColor = danger ? 'var(--qa-danger)' : 'var(--qa-ink-faint)';
        if (danger) e.currentTarget.style.background = 'var(--qa-danger-soft)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--qa-glass-border)';
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}
