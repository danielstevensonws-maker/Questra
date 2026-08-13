/**
 * PullFromCampaignPicker — the reference picker (Build Playbook §3;
 * component-list A5; Session Planner design spec).
 *
 * "Reference, don't duplicate." Anywhere the DM points at something that
 * already exists in the campaign (cast, locations, rewards, recurring maps)
 * instead of authoring it fresh — the picked item stays one source of truth,
 * so editing the NPC once updates every scene that references it.
 *
 * Content-agnostic via `PickableItem` — the same seam entityToInfoPanel.ts is
 * for InfoPanel. The caller adapts its campaign entities into this thin
 * shape; the picker itself has no knowledge of cast vs. locations vs.
 * rewards, so a new pullable category needs no component change.
 *
 * Owns no data: `selectedIds` in, `onChange(nextSelectedIds)` out. Search is
 * the picker's own local UI state (not reported to the caller).
 */
import { useId, useMemo, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';

export interface PickableItem {
  id: string;
  name: string;
  /** Plain-language category, e.g. "Cast", "Location", "Reward". */
  kind: string;
  /** One-line hint: a role, a district, a rarity. */
  hint?: string;
}

export type PickerMode = 'single' | 'multi';

export interface PullFromCampaignPickerProps {
  items: PickableItem[];
  selectedIds: string[];
  onChange: (nextSelectedIds: string[]) => void;
  /** "multi" (default) toggles freely; "single" collapses to at most one id, re-picking clears it. */
  mode?: PickerMode;
  /** Shown when there is nothing at all to pick from (a fresh campaign) — never confused with "no search matches". */
  emptyLabel?: string;
}

const mono = 'var(--qa-font-mono)';
const body = 'var(--qa-font-body)';

const srOnly: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
  border: 'none',
};

function matches(item: PickableItem, query: string): boolean {
  return (
    item.name.toLowerCase().includes(query) ||
    item.kind.toLowerCase().includes(query) ||
    (item.hint?.toLowerCase().includes(query) ?? false)
  );
}

export function PullFromCampaignPicker({
  items,
  selectedIds,
  onChange,
  mode = 'multi',
  emptyLabel = 'Nothing in the campaign to pull from yet.',
}: PullFromCampaignPickerProps) {
  const searchId = useId();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q === '' ? items : items.filter((item) => matches(item, q));
  }, [items, query]);

  const noItemsAtAll = items.length === 0;
  const noMatches = !noItemsAtAll && filtered.length === 0;

  function toggle(id: string) {
    if (mode === 'single') {
      onChange(selectedIds.includes(id) ? [] : [id]);
      return;
    }
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  function onRowKeyDown(e: KeyboardEvent<HTMLLIElement>, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle(id);
    }
  }

  return (
    <div
      style={{
        fontFamily: body,
        background: 'var(--qa-chip)',
        border: 'var(--qa-hairline) solid var(--qa-glass-border)',
        borderRadius: 'var(--qa-radius)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: 'var(--qa-s3)', borderBottom: 'var(--qa-hairline) solid var(--qa-glass-border)' }}>
        <label htmlFor={searchId} style={srOnly}>
          Search
        </label>
        <input
          id={searchId}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search…"
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            fontFamily: body,
            fontSize: 'var(--qa-text-body)',
            color: 'var(--qa-ink)',
            padding: 0,
          }}
        />
      </div>

      {noItemsAtAll && <EmptyMessage text={emptyLabel} />}
      {noMatches && <EmptyMessage text="No matches." />}

      {!noItemsAtAll && !noMatches && (
        <ul
          role="listbox"
          aria-multiselectable={mode === 'multi'}
          style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            maxHeight: 420,
            overflowY: 'auto',
          }}
        >
          {filtered.map((item) => {
            const selected = selectedIds.includes(item.id);
            return (
              <li
                key={item.id}
                role="option"
                aria-selected={selected}
                tabIndex={0}
                onClick={() => toggle(item.id)}
                onKeyDown={(e) => onRowKeyDown(e, item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--qa-s3)',
                  padding: 'var(--qa-s3) var(--qa-s4)',
                  borderTop: 'var(--qa-hairline) solid var(--qa-glass-border)',
                  background: selected ? 'var(--qa-accent-soft)' : 'transparent',
                  cursor: 'pointer',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    flex: 'none',
                    width: 16,
                    height: 16,
                    display: 'grid',
                    placeItems: 'center',
                    borderRadius: 'var(--qa-radius-sm)',
                    border: `var(--qa-hairline) solid ${selected ? 'var(--qa-accent-line)' : 'var(--qa-glass-border)'}`,
                    background: selected ? 'var(--qa-accent)' : 'transparent',
                    color: 'var(--qa-accent-ink)',
                    fontFamily: mono,
                    fontSize: 10,
                    lineHeight: 1,
                  }}
                >
                  {selected ? '✓' : ''}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 'var(--qa-text-body)', color: 'var(--qa-ink)' }}>{item.name}</div>
                  {item.hint !== undefined && (
                    <div
                      style={{
                        fontSize: 'var(--qa-text-whisper)',
                        color: 'var(--qa-ink-faint)',
                        marginTop: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.hint}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    flex: 'none',
                    fontFamily: mono,
                    fontSize: 'var(--qa-text-whisper)',
                    letterSpacing: 'var(--qa-tracking-caps)',
                    textTransform: 'uppercase',
                    color: 'var(--qa-ink-faint)',
                  }}
                >
                  {item.kind}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EmptyMessage({ text }: { text: string }) {
  return (
    <p
      style={{
        margin: 0,
        padding: 'var(--qa-s4)',
        fontFamily: body,
        fontStyle: 'italic',
        fontSize: 'var(--qa-text-body)',
        color: 'var(--qa-ink-faint)',
      }}
    >
      {text}
    </p>
  );
}
