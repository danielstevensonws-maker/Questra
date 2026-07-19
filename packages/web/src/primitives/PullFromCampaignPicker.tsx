/**
 * PullFromCampaignPicker — the "pull from campaign" reference picker. Playbook
 * §3 primitive, reused by cast→scene, locations, rewards, and recurring maps:
 * anywhere you reference something that already exists in the campaign instead
 * of authoring it fresh. Reference, don't duplicate — the picked item stays one
 * source of truth; the scene just points at it. Edit the member once and every
 * scene that references them follows.
 *
 * Content-agnostic: it takes a list of PickableItem view-models (id, name, a
 * kind label, an optional one-line hint) and reports which ids were picked.
 * The caller maps its campaign entities (cast, locations, …) into that shape —
 * the same seam entityToInfoPanel is for the InfoPanel. Single- or multi-select.
 *
 * Design: the Questra V1 Prototype sheet, §Picker and Presets. Themed entirely
 * via --qa-* tokens; rows wash on hover, the selected row wears an ember tint,
 * and focus wears the one --qa-focus-ring.
 */
import { useId, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Chip, Label } from '@questra/ui';

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
  const [searchFocused, setSearchFocused] = useState(false);
  const searchId = useId();
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        it.kind.toLowerCase().includes(q) ||
        (it.hint?.toLowerCase().includes(q) ?? false),
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
        border: '1px solid var(--qa-hairline-soft)',
        borderRadius: 'var(--qa-radius-md)',
        background: 'var(--qa-ink-raised)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 420,
      }}
    >
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--qa-hairline-soft)' }}>
        <Label tone="dim" style={{ display: 'block', marginBottom: 8 }}>
          {title}
        </Label>
        <label htmlFor={searchId} style={srOnly}>
          {searchPlaceholder}
        </label>
        <input
          id={searchId}
          type="search"
          value={query}
          placeholder={searchPlaceholder}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            fontFamily: 'var(--qa-font-body)',
            fontSize: 13,
            color: 'var(--qa-vellum)',
            background: 'var(--qa-vellum-ghost)',
            border: '1px solid var(--qa-hairline)',
            borderRadius: 'var(--qa-radius-sm)',
            padding: '8px 10px',
            outline: 'none',
            ...(searchFocused ? { boxShadow: 'var(--qa-focus-ring)' } : {}),
            transition: 'box-shadow var(--qa-dur-fast) var(--qa-ease)',
          }}
        />
      </div>

      <div
        role="listbox"
        aria-multiselectable={mode === 'multi'}
        style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}
      >
        {filtered.length === 0 ? (
          // Typed-but-no-match and fresh-campaign are different facts; each says so.
          <p
            style={{
              margin: 0,
              padding: '18px 12px',
              fontSize: 12.5,
              fontStyle: 'italic',
              color: 'var(--qa-vellum-dim)',
            }}
          >
            {query.trim() ? 'No matches.' : emptyLabel}
          </p>
        ) : (
          filtered.map((it) => (
            <Row
              key={it.id}
              item={it}
              selected={selected.has(it.id)}
              onToggle={() => toggle(it.id)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function Row({
  item,
  selected,
  onToggle,
}: {
  item: PickableItem;
  selected: boolean;
  onToggle: () => void;
}) {
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);

  const background = selected
    ? 'color-mix(in srgb, var(--qa-ember) 8%, transparent)'
    : hover
      ? 'var(--qa-vellum-ghost)'
      : 'transparent';

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        textAlign: 'left',
        padding: '10px 12px',
        border: 'none',
        background,
        cursor: 'pointer',
        ...(focused ? { boxShadow: 'var(--qa-focus-ring)' } : {}),
        transition: 'background var(--qa-dur-fast) var(--qa-ease)',
      }}
    >
      <Check on={selected} />
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--qa-vellum)' }}>{item.name}</span>
        {item.hint && (
          <span style={{ fontSize: 10.5, color: 'var(--qa-vellum-dim)' }}>{item.hint}</span>
        )}
      </span>
      <Chip>{item.kind}</Chip>
    </button>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      style={{
        width: 16,
        height: 16,
        flex: 'none',
        borderRadius: 'var(--qa-radius-xs)',
        border: `1px solid ${on ? 'var(--qa-ember)' : 'var(--qa-hairline)'}`,
        background: on ? 'color-mix(in srgb, var(--qa-ember) 30%, transparent)' : 'transparent',
        color: 'var(--qa-vellum-bright)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 10,
        lineHeight: 1,
        transition:
          'background var(--qa-dur-fast) var(--qa-ease), border-color var(--qa-dur-fast) var(--qa-ease)',
      }}
    >
      {on ? '✓' : ''}
    </span>
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
