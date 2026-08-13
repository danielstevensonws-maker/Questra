/**
 * PresetsAboveFreeForm — presets teach the beginner without caging the
 * veteran (Build Playbook §3; Character Creation Wizard, Campaign Wrapper,
 * Session Planner, and Onboarding Floor 1 all use it).
 *
 * Tap a chip to learn what a good answer looks like, or ignore them entirely
 * and type your own. Presets are a starting point, never a fence — the free
 * text box is always right there, never hidden behind the chips.
 *
 * A discriminated union on `mode` gives two genuinely different behaviours
 * from one component:
 *
 * - `'pick'` (default) — one value. Choosing a preset REPLACES the text with
 *   its label; re-tapping the active chip clears the field. The active chip
 *   is derived, never stored (`presets.find(p => p.label === value)`), so
 *   editing the text after a pick naturally leaves every chip unselected —
 *   no extra state needed to track "you went your own way".
 * - `'tags'` — a `string[]`. Presets toggle; free-form entries become tags
 *   too (Enter or blur to add, duplicates rejected). Custom tags render as
 *   removable (✕) chips, visually distinct from the always-toggleable
 *   preset chips.
 *
 * Controlled in both modes — `value`/`onChange` in, nothing owned here
 * except the transient `draft` text buffer in tags mode.
 */
import { useId, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';

export interface PresetOption {
  label: string;
}

interface SharedProps {
  label: string;
  help?: string;
  presets: PresetOption[];
  placeholder?: string;
}

export interface PickFieldProps extends SharedProps {
  mode?: 'pick';
  value: string;
  onChange: (next: string) => void;
}

export interface TagsFieldProps extends SharedProps {
  mode: 'tags';
  value: string[];
  onChange: (next: string[]) => void;
}

export type PresetsAboveFreeFormProps = PickFieldProps | TagsFieldProps;

const mono = 'var(--qa-font-mono)';
const body = 'var(--qa-font-body)';

export function PresetsAboveFreeForm(props: PresetsAboveFreeFormProps) {
  if (props.mode === 'tags') return <TagsField {...props} />;
  return <PickField {...props} />;
}

function PickField({ label, help, presets, value, onChange, placeholder = 'Or write your own…' }: PickFieldProps) {
  const inputId = useId();
  const activeLabel = presets.find((p) => p.label === value)?.label;

  function tap(preset: PresetOption) {
    onChange(preset.label === value ? '' : preset.label);
  }

  return (
    <Field id={inputId} label={label} help={help}>
      <ChipRow>
        {presets.map((preset) => (
          <Chip key={preset.label} selected={preset.label === activeLabel} onClick={() => tap(preset)}>
            {preset.label}
          </Chip>
        ))}
      </ChipRow>
      <input
        id={inputId}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={inputStyle}
      />
    </Field>
  );
}

function TagsField({ label, help, presets, value, onChange, placeholder = 'Add your own — press Enter' }: TagsFieldProps) {
  const inputId = useId();
  const [draft, setDraft] = useState('');

  function togglePreset(preset: PresetOption) {
    onChange(value.includes(preset.label) ? value.filter((v) => v !== preset.label) : [...value, preset.label]);
  }

  function removeTag(tag: string) {
    onChange(value.filter((v) => v !== tag));
  }

  function commitDraft() {
    const next = draft.trim();
    if (next !== '' && !value.includes(next)) onChange([...value, next]);
    setDraft('');
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitDraft();
    }
  }

  const customTags = value.filter((v) => !presets.some((p) => p.label === v));

  return (
    <Field id={inputId} label={label} help={help}>
      <ChipRow>
        {presets.map((preset) => (
          <Chip key={preset.label} selected={value.includes(preset.label)} onClick={() => togglePreset(preset)}>
            {preset.label}
          </Chip>
        ))}
        {customTags.map((tag) => (
          <Chip key={tag} selected onRemove={() => removeTag(tag)}>
            {tag}
          </Chip>
        ))}
      </ChipRow>
      <input
        id={inputId}
        type="text"
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commitDraft}
        style={inputStyle}
      />
    </Field>
  );
}

function Field({ id, label, help, children }: { id: string; label: string; help?: string | undefined; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s2)', fontFamily: body }}>
      <label
        htmlFor={id}
        style={{
          fontFamily: mono,
          fontSize: 'var(--qa-text-whisper)',
          letterSpacing: 'var(--qa-tracking-caps)',
          textTransform: 'uppercase',
          color: 'var(--qa-ink-dim)',
        }}
      >
        {label}
      </label>
      {children}
      {help !== undefined && (
        <p
          style={{
            fontFamily: body,
            fontStyle: 'italic',
            fontSize: 'var(--qa-text-whisper)',
            color: 'var(--qa-ink-faint)',
            margin: 0,
          }}
        >
          {help}
        </p>
      )}
    </div>
  );
}

function ChipRow({ children }: { children: ReactNode }) {
  return <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--qa-s2)' }}>{children}</div>;
}

function Chip({
  children,
  selected,
  onClick,
  onRemove,
}: {
  children: ReactNode;
  selected: boolean;
  onClick?: () => void;
  onRemove?: () => void;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px var(--qa-s3)',
        borderRadius: 'var(--qa-radius-round)',
        border: `var(--qa-hairline) solid ${selected ? 'var(--qa-accent-line)' : 'var(--qa-glass-border)'}`,
        background: selected ? 'var(--qa-accent-soft)' : 'var(--qa-chip)',
        fontFamily: body,
        fontSize: 'var(--qa-text-whisper)',
        color: selected ? 'var(--qa-ink)' : 'var(--qa-ink-dim)',
      }}
    >
      {onClick !== undefined ? (
        <button
          type="button"
          aria-pressed={selected}
          onClick={onClick}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
            font: 'inherit',
            color: 'inherit',
            cursor: 'pointer',
          }}
        >
          {children}
        </button>
      ) : (
        <span>{children}</span>
      )}
      {onRemove !== undefined && (
        <button
          type="button"
          aria-label={`Remove ${typeof children === 'string' ? children : 'tag'}`}
          onClick={onRemove}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            margin: 0,
            fontFamily: mono,
            fontSize: 10,
            color: 'var(--qa-ink-faint)',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--qa-danger)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--qa-ink-faint)')}
        >
          ✕
        </button>
      )}
    </span>
  );
}

const inputStyle = {
  width: '100%',
  background: 'var(--qa-chip)',
  border: 'var(--qa-hairline) solid var(--qa-glass-border)',
  borderRadius: 'var(--qa-radius)',
  padding: 'var(--qa-s3)',
  fontFamily: body,
  fontSize: 'var(--qa-text-body)',
  color: 'var(--qa-ink)',
  outline: 'none',
} as const;
