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
 * Themed entirely via theme/tokens.css variables. No hardcoded look.
 */
import { useRef, useState, type ReactNode } from 'react';

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
}

export function CardSequencer({ itemNoun, items, onReorder, onRemove }: CardSequencerProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const liveRef = useRef<HTMLDivElement>(null);

  function moveTo(from: number, to: number) {
    if (to < 0 || to >= items.length || from === to) return;
    const next = items.map((it) => it.id);
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    onReorder(next);
    setAnnounce(`Moved ${itemNoun.replace(/s$/, '')} to position ${to + 1} of ${items.length}.`);
  }

  return (
    <div>
      {/* screen-reader announcement of each reorder */}
      <div ref={liveRef} aria-live="polite" style={srOnly}>
        {announce}
      </div>

      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--q-space-3)' }}>
        {items.map((it, i) => (
          <li
            key={it.id}
            draggable
            onDragStart={() => setDragId(it.id)}
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (dragId === null) return;
              const from = items.findIndex((x) => x.id === dragId);
              if (from !== -1) moveTo(from, i);
              setDragId(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'stretch',
              gap: 'var(--q-space-2)',
              background: 'var(--q-surface)',
              border: '1px solid var(--q-line)',
              borderRadius: 'var(--q-radius-lg)',
              boxShadow: 'var(--q-shadow-panel)',
              opacity: dragId === it.id ? 0.5 : 1,
              transition: 'opacity var(--q-dur-fast) var(--q-ease)',
            }}
          >
            {/* order handle + position */}
            <div
              aria-hidden
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--q-space-2)',
                borderRight: '1px solid var(--q-line)',
                color: 'var(--q-ink-faint)',
                cursor: 'grab',
                fontFamily: 'var(--q-font-mono)',
                fontSize: 'var(--q-text-sm)',
              }}
            >
              <span style={{ fontSize: 'var(--q-text-lg)', lineHeight: 1 }}>⠿</span>
              <span style={{ marginTop: 4 }}>{i + 1}</span>
            </div>

            <div style={{ flex: 1, minWidth: 0, padding: 'var(--q-space-3) var(--q-space-4)' }}>{it.render}</div>

            {/* keyboard-first reorder controls */}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 'var(--q-space-1)', padding: 'var(--q-space-2)' }}>
              <MoveButton label={`Move ${itemNoun.replace(/s$/, '')} up`} disabled={i === 0} onClick={() => moveTo(i, i - 1)}>
                ↑
              </MoveButton>
              <MoveButton label={`Move ${itemNoun.replace(/s$/, '')} down`} disabled={i === items.length - 1} onClick={() => moveTo(i, i + 1)}>
                ↓
              </MoveButton>
              {onRemove && (
                <MoveButton label={`Remove ${itemNoun.replace(/s$/, '')}`} tone="danger" onClick={() => onRemove(it.id)}>
                  ✕
                </MoveButton>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
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
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 28,
        height: 28,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: '1px solid var(--q-line)',
        borderRadius: 'var(--q-radius-sm)',
        color: disabled ? 'var(--q-ink-faint)' : tone === 'danger' ? 'var(--q-danger)' : 'var(--q-ink-soft)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        fontSize: 'var(--q-text-sm)',
        lineHeight: 1,
      }}
    >
      {children}
    </button>
  );
}

const srOnly: React.CSSProperties = {
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
