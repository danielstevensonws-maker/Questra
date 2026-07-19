/**
 * PresetsAboveFreeForm — the presets-above-free-form input. Playbook §3
 * primitive, reused by wizard steps, premise chips, scene creation, and
 * onboarding Floor 1. The shape teaches the beginner (tap a preset) without
 * caging the veteran (type your own) — presets are a starting point, never a
 * fence. Edit the text and the chip quietly lets go.
 *
 * Two selection shapes:
 *   - 'pick' (single): choosing a preset REPLACES the free-form text — the field
 *     always holds one value (a premise, a class fantasy). Editing after picking
 *     is fine and leaves the chips unselected (you've gone your own way).
 *   - 'tags' (multi): presets are toggles that live alongside free-form additions
 *     — the value is a list (scene tags, appearance traits). Free-form entries
 *     become tags too (Enter to add), and render as first-class chips.
 *
 * Design: the Questra V1 Prototype sheet, §Picker and Presets. Themed entirely
 * via --qa-* tokens. The chips are body-font sentence-case buttons (NOT the
 * @questra/ui Chip, which is a mono uppercase status pill for a different job),
 * and focus wears the one --qa-focus-ring.
 */
import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { Label } from '@questra/ui';

export interface Preset {
  id: string;
  label: string;
}

interface Base {
  label: string;
  presets: Preset[];
  help?: ReactNode;
  placeholder?: string;
}

export interface PickProps extends Base {
  mode?: 'pick';
  /** The single free-form value. A picked preset's label becomes this value. */
  value: string;
  onChange: (value: string) => void;
}

export interface TagsProps extends Base {
  mode: 'tags';
  /** The list of chosen values (preset labels and/or free-form additions). */
  value: string[];
  onChange: (values: string[]) => void;
}

export type PresetsAboveFreeFormProps = PickProps | TagsProps;

export function PresetsAboveFreeForm(props: PresetsAboveFreeFormProps) {
  return props.mode === 'tags' ? <TagsField {...props} /> : <PickField {...props} />;
}

// ---- single-pick ---------------------------------------------------------

function PickField({ label, presets, value, onChange, help, placeholder }: PickProps) {
  const id = useId();
  // Derived, not stored: type your own and every chip quietly lets go.
  const activeId = presets.find((p) => p.label === value)?.id ?? null;

  return (
    <Field label={label} help={help} htmlFor={id}>
      <ChipRow>
        {presets.map((p) => (
          <PresetChip
            key={p.id}
            on={p.id === activeId}
            onClick={() => onChange(p.id === activeId ? '' : p.label)}
          >
            {p.label}
          </PresetChip>
        ))}
      </ChipRow>
      <TextInput
        id={id}
        value={value}
        placeholder={placeholder ?? 'Or write your own…'}
        onChange={onChange}
      />
    </Field>
  );
}

// ---- multi-tag -----------------------------------------------------------

function TagsField({ label, presets, value, onChange, help, placeholder }: TagsProps) {
  const id = useId();
  const [draft, setDraft] = useState('');
  const chosen = new Set(value);

  function toggle(labelText: string) {
    if (chosen.has(labelText)) onChange(value.filter((v) => v !== labelText));
    else onChange([...value, labelText]);
  }

  function addDraft() {
    const t = draft.trim();
    if (t && !chosen.has(t)) onChange([...value, t]);
    setDraft('');
  }

  // Free-form additions that aren't presets, so they can be shown as removable tags.
  const presetLabels = new Set(presets.map((p) => p.label));
  const customTags = value.filter((v) => !presetLabels.has(v));

  return (
    <Field label={label} help={help} htmlFor={id}>
      <ChipRow>
        {presets.map((p) => (
          <PresetChip key={p.id} on={chosen.has(p.label)} onClick={() => toggle(p.label)}>
            {p.label}
          </PresetChip>
        ))}
        {customTags.map((t) => (
          <PresetChip key={`custom-${t}`} on custom onRemove={() => toggle(t)}>
            {t}
          </PresetChip>
        ))}
      </ChipRow>
      <TextInput
        id={id}
        value={draft}
        placeholder={placeholder ?? 'Add your own — press Enter'}
        onChange={setDraft}
        onEnter={addDraft}
        onBlur={addDraft}
      />
    </Field>
  );
}

// ---- shared bits ---------------------------------------------------------

function Field({
  label,
  help,
  htmlFor,
  children,
}: {
  label: string;
  help?: ReactNode;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div>
        <label htmlFor={htmlFor}>
          <Label tone="dim">{label}</Label>
        </label>
        {help && (
          <p
            style={{
              margin: '4px 0 0',
              fontSize: 11.5,
              fontStyle: 'italic',
              color: 'var(--qa-vellum-dim)',
            }}
          >
            {help}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}

function ChipRow({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{children}</div>;
}

/**
 * A preset chip. Body font, sentence case — deliberately NOT the @questra/ui
 * Chip, which is a mono uppercase status pill (Bloodied, Concentrating) doing a
 * different job. A custom (free-form) tag is first-class: same chip, plus an
 * ember wash and a remove control.
 */
function PresetChip({
  children,
  on,
  custom = false,
  onClick,
  onRemove,
}: {
  children: ReactNode;
  on: boolean;
  custom?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}) {
  const [focused, setFocused] = useState(false);

  const shell: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontFamily: 'var(--qa-font-body)',
    fontSize: 12,
    padding: '5px 12px',
    borderRadius: 'var(--qa-radius-sm)',
    border: on
      ? '1px solid color-mix(in srgb, var(--qa-ember) 55%, transparent)'
      : '1px solid var(--qa-hairline)',
    background: custom
      ? 'color-mix(in srgb, var(--qa-ember) 10%, transparent)'
      : on
        ? 'var(--qa-vellum-ghost)'
        : 'transparent',
    color: on ? 'var(--qa-vellum-bright)' : 'var(--qa-vellum-dim)',
    cursor: onClick ? 'pointer' : 'default',
    ...(focused ? { boxShadow: 'var(--qa-focus-ring)' } : {}),
    transition:
      'background var(--qa-dur-fast) var(--qa-ease), border-color var(--qa-dur-fast) var(--qa-ease), color var(--qa-dur-fast) var(--qa-ease)',
  };

  // A custom tag is a span carrying its own remove button, so the two controls
  // stay separately reachable rather than nesting a button inside a button.
  if (custom) {
    return (
      <span style={shell}>
        {children}
        <button
          type="button"
          title="Remove"
          aria-label={`Remove ${String(children)}`}
          onClick={onRemove}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            border: 'none',
            background: 'none',
            color: 'var(--qa-vellum-dim)',
            cursor: 'pointer',
            padding: 0,
            fontSize: 11,
            lineHeight: 1,
          }}
        >
          ✕
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={shell}
    >
      {children}
    </button>
  );
}

function TextInput({
  id,
  value,
  placeholder,
  onChange,
  onEnter,
  onBlur,
}: {
  id: string;
  value: string;
  placeholder: string;
  onChange: (text: string) => void;
  onEnter?: () => void;
  onBlur?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      id={id}
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={
        onEnter
          ? (e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onEnter();
              }
            }
          : undefined
      }
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        onBlur?.();
      }}
      style={{
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: 'var(--qa-font-body)',
        fontSize: 14,
        color: 'var(--qa-vellum)',
        background: 'var(--qa-vellum-ghost)',
        border: '1px solid var(--qa-hairline)',
        borderRadius: 'var(--qa-radius-sm)',
        padding: '9px 11px',
        outline: 'none',
        ...(focused ? { boxShadow: 'var(--qa-focus-ring)' } : {}),
        transition: 'box-shadow var(--qa-dur-fast) var(--qa-ease)',
      }}
    />
  );
}
