/**
 * PresetsAboveFreeForm — the presets-above-free-form input. Playbook §3
 * primitive, reused by wizard steps, premise chips, scene creation, and
 * onboarding Floor 1. The shape teaches the beginner (tap a preset) without
 * caging the veteran (type your own) — presets are a starting point, never a
 * fence.
 *
 * Two selection shapes:
 *   - 'pick' (single): choosing a preset REPLACES the free-form text — the field
 *     always holds one value (a premise, a class fantasy). Editing after picking
 *     is fine and leaves the chips unselected (you've gone your own way).
 *   - 'tags' (multi): presets are toggles that live alongside free-form additions
 *     — the value is a list (scene tags, appearance traits). Free-form entries
 *     become tags too (Enter to add).
 *
 * Themed entirely via theme/tokens.css variables. No hardcoded look.
 */
import { useId, useState, type ReactNode } from 'react';

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
  const activeId = presets.find((p) => p.label === value)?.id ?? null;

  return (
    <Field label={label} help={help} htmlFor={id}>
      <ChipRow>
        {presets.map((p) => (
          <Chip key={p.id} on={p.id === activeId} onClick={() => onChange(p.id === activeId ? '' : p.label)}>
            {p.label}
          </Chip>
        ))}
      </ChipRow>
      <input
        id={id}
        type="text"
        value={value}
        placeholder={placeholder ?? 'Or write your own…'}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
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
          <Chip key={p.id} on={chosen.has(p.label)} onClick={() => toggle(p.label)}>
            {p.label}
          </Chip>
        ))}
        {customTags.map((t) => (
          <Chip key={`custom-${t}`} on onClick={() => toggle(t)} removable>
            {t}
          </Chip>
        ))}
      </ChipRow>
      <input
        id={id}
        type="text"
        value={draft}
        placeholder={placeholder ?? 'Add your own — press Enter'}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addDraft();
          }
        }}
        onBlur={addDraft}
        style={inputStyle}
      />
    </Field>
  );
}

// ---- shared bits ---------------------------------------------------------

function Field({ label, help, htmlFor, children }: { label: string; help?: ReactNode; htmlFor: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--q-space-2)' }}>
      <div>
        <label
          htmlFor={htmlFor}
          style={{
            fontFamily: 'var(--q-font-mono)',
            fontSize: 'var(--q-text-xs)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--q-ink-soft)',
          }}
        >
          {label}
        </label>
        {help && <p style={{ margin: '2px 0 0', fontSize: 'var(--q-text-sm)', color: 'var(--q-ink-faint)' }}>{help}</p>}
      </div>
      {children}
    </div>
  );
}

function ChipRow({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--q-space-2)' }}>{children}</div>;
}

function Chip({ children, on, onClick, removable }: { children: ReactNode; on: boolean; onClick: () => void; removable?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--q-space-1)',
        background: on ? 'var(--q-accent)' : 'var(--q-surface)',
        color: on ? '#fff' : 'var(--q-ink-soft)',
        border: `1px solid ${on ? 'var(--q-accent)' : 'var(--q-line)'}`,
        borderRadius: '999px',
        padding: 'var(--q-space-1) var(--q-space-3)',
        fontSize: 'var(--q-text-sm)',
        cursor: 'pointer',
        transition: 'background var(--q-dur-fast) var(--q-ease), color var(--q-dur-fast) var(--q-ease), border-color var(--q-dur-fast) var(--q-ease)',
      }}
    >
      {children}
      {removable && <span aria-hidden style={{ opacity: 0.8 }}>✕</span>}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'var(--q-surface)',
  border: '1px solid var(--q-line)',
  borderRadius: 'var(--q-radius)',
  color: 'var(--q-ink)',
  fontFamily: 'var(--q-font-body)',
  fontSize: 'var(--q-text-base)',
  lineHeight: 'var(--q-leading-normal)',
  padding: 'var(--q-space-2) var(--q-space-3)',
  outline: 'none',
};
