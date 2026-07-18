/**
 * PullFromCampaignPicker — the "pull from campaign" reference picker. Playbook
 * §3 primitive, reused by cast→scene, locations, rewards, and recurring maps:
 * anywhere you reference something that already exists in the campaign instead
 * of authoring it fresh. Reference, don't duplicate — the picked item stays one
 * source of truth; the scene just points at it.
 *
 * Content-agnostic: it takes a list of PickableItem view-models (id, name, a
 * kind label, an optional one-line hint) and reports which ids were picked.
 * The caller maps its campaign entities (cast, locations, …) into that shape —
 * the same seam entityToInfoPanel is for the InfoPanel. Single- or multi-select.
 *
 * Themed entirely via theme/tokens.css variables. No hardcoded look.
 */
import { useId, useMemo, useState, type ReactNode } from 'react';

export interface PickableItem {
  id: string;
  name: string;
  /** Plain-language category ("Cast", "Location", "Reward"). */
  kind: string;
  /** One-line hint shown under the name (a role, a district, a rarity). */
  hint?: string;
}

export interface PullFromCampaignPickerProps {
  /** What we're pulling ("Pull cast into this scene"). Plain language. */
  title: string;
  items: PickableItem[];
  /** Ids already pulled in — shown selected and toggleable. */
  selectedIds: string[];
  onChange: (nextSelectedIds: string[]) => void;
  /** Single-select collapses selection to one id. Default multi. */
  mode?: 'single' | 'multi';
  /** Shown when the campaign has nothing of this kind yet. */
  emptyLabel?: ReactNode;
  searchPlaceholder?: string;
}

export function PullFromCampaignPicker({
  title,
  items,
  selectedIds,
  onChange,
  mode = 'multi',
  emptyLabel = 'Nothing in the campaign to pull from yet.',
  searchPlaceholder = 'Search the campaign…',
}: PullFromCampaignPickerProps) {
  const [query, setQuery] = useState('');
  const searchId = useId();
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) => it.name.toLowerCase().includes(q) || it.kind.toLowerCase().includes(q) || (it.hint?.toLowerCase().includes(q) ?? false),
    );
  }, [items, query]);

  function toggle(id: string) {
    if (mode === 'single') {
      onChange(selected.has(id) ? [] : [id]);
      return;
    }
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  return (
    <section
      style={{
        background: 'var(--q-surface)',
        border: '1px solid var(--q-line)',
        borderRadius: 'var(--q-radius-lg)',
        boxShadow: 'var(--q-shadow-panel)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 420,
      }}
    >
      <header className="px-5 py-3" style={{ borderBottom: '1px solid var(--q-line)' }}>
        <h3 style={{ margin: 0, fontFamily: 'var(--q-font-display)', fontSize: 'var(--q-text-lg)', color: 'var(--q-ink)' }}>{title}</h3>
        <div style={{ marginTop: 'var(--q-space-2)' }}>
          <label htmlFor={searchId} className="sr-only" style={srOnly}>
            {searchPlaceholder}
          </label>
          <input
            id={searchId}
            type="search"
            value={query}
            placeholder={searchPlaceholder}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--q-surface-raised)',
              border: '1px solid var(--q-line)',
              borderRadius: 'var(--q-radius)',
              color: 'var(--q-ink)',
              fontFamily: 'var(--q-font-body)',
              fontSize: 'var(--q-text-sm)',
              padding: 'var(--q-space-2) var(--q-space-3)',
              outline: 'none',
            }}
          />
        </div>
      </header>

      <ul role="listbox" aria-multiselectable={mode === 'multi'} style={{ margin: 0, padding: 0, listStyle: 'none', overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <li style={{ padding: 'var(--q-space-5)', color: 'var(--q-ink-faint)', fontSize: 'var(--q-text-sm)', textAlign: 'center' }}>
            {query.trim() ? 'No matches.' : emptyLabel}
          </li>
        ) : (
          filtered.map((it) => {
            const isSelected = selected.has(it.id);
            return (
              <li key={it.id}>
                <button
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => toggle(it.id)}
                  className="flex w-full items-center gap-3 text-left"
                  style={{
                    width: '100%',
                    background: isSelected ? 'color-mix(in srgb, var(--q-accent) 8%, transparent)' : 'transparent',
                    border: 'none',
                    borderBottom: '1px solid var(--q-line)',
                    padding: 'var(--q-space-3) var(--q-space-4)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--q-space-3)',
                  }}
                >
                  <Check on={isSelected} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', color: 'var(--q-ink)', fontSize: 'var(--q-text-base)' }}>{it.name}</span>
                    {it.hint && (
                      <span style={{ display: 'block', color: 'var(--q-ink-faint)', fontSize: 'var(--q-text-sm)' }}>{it.hint}</span>
                    )}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--q-font-mono)',
                      fontSize: 'var(--q-text-xs)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: 'var(--q-ink-faint)',
                    }}
                  >
                    {it.kind}
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        width: 18,
        height: 18,
        flexShrink: 0,
        borderRadius: 'var(--q-radius-sm)',
        border: `1px solid ${on ? 'var(--q-accent)' : 'var(--q-line)'}`,
        background: on ? 'var(--q-accent)' : 'transparent',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        lineHeight: 1,
        transition: 'background var(--q-dur-fast) var(--q-ease), border-color var(--q-dur-fast) var(--q-ease)',
      }}
    >
      {on ? '✓' : ''}
    </span>
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
