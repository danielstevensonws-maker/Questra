/**
 * PublicSecretField — the public/secret split input. Playbook §3 primitive,
 * reused by scene notes, bonds, cast, secrets, and locations: anywhere a DM
 * writes something with a part the table sees and a part only they see.
 *
 * It speaks the contracts visibility vocabulary (play/events.ts): the public
 * part is `public`, the secret part is `dm_only`. The two map 1:1 so a caller
 * can emit them as two events (or one with dm_only detail) with no translation.
 *
 * SECURITY BOUNDARY DISCLAIMER (CLAUDE.md non-negotiable #3): this is authoring
 * UI, NOT the filter. Secret text is kept out of player payloads SERVER-SIDE by
 * eventVisibleTo/filterStream — never by this component. The gold `--qa-secret`
 * tint is a reminder to the DM about what they're typing, not a lock. A player
 * client must never be sent the secret half in the first place.
 *
 * Design: the Questra V1 Prototype sheet, §PublicSecretField. Themed entirely
 * via --qa-* tokens; the secret half carries the `--qa-secret` tint and the
 * focused half wears the one `--qa-focus-ring` (ADR-0014).
 */
import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { Label } from '@questra/ui';
import type { Visibility } from '@questra/contracts';

/** The field's value: a part everyone sees, and a part only the DM sees. */
export interface PublicSecretValue {
  public: string;
  secret: string;
}

/** Map a half of the field to the contracts visibility it must be emitted with. */
export const VISIBILITY_FOR: Record<keyof PublicSecretValue, Visibility> = {
  public: 'public',
  secret: 'dm_only',
};

export interface PublicSecretFieldProps {
  label: string;
  value: PublicSecretValue;
  onChange: (next: PublicSecretValue) => void;
  /** Placeholder for the public half. */
  publicPlaceholder?: string;
  /** Placeholder for the secret half. */
  secretPlaceholder?: string;
  /** Single-line inputs by default; multiline renders textareas (scene notes). */
  multiline?: boolean;
  /** Optional helper text under the label. */
  help?: ReactNode;
}

export function PublicSecretField({
  label,
  value,
  onChange,
  publicPlaceholder = 'Everyone at the table sees this',
  secretPlaceholder = 'Only you (the DM) see this',
  multiline = false,
  help,
}: PublicSecretFieldProps) {
  const publicId = useId();
  const secretId = useId();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-space-4)' }}>
      <div>
        <Label tone="faint">{label}</Label>
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

      <Half
        id={publicId}
        tone="public"
        badge="Public"
        placeholder={publicPlaceholder}
        multiline={multiline}
        value={value.public}
        onChange={(text) => onChange({ ...value, public: text })}
      />
      <Half
        id={secretId}
        tone="secret"
        badge="Secret · Only you see this"
        placeholder={secretPlaceholder}
        multiline={multiline}
        value={value.secret}
        onChange={(text) => onChange({ ...value, secret: text })}
      />
    </div>
  );
}

function Half({
  id,
  tone,
  badge,
  placeholder,
  multiline,
  value,
  onChange,
}: {
  id: string;
  tone: 'public' | 'secret';
  badge: string;
  placeholder: string;
  multiline: boolean;
  value: string;
  onChange: (text: string) => void;
}) {
  // Focus lives here so the whole half can wear the one focus ring — the inner
  // control is chromeless, so a ring on the input alone would read as nothing.
  const [focused, setFocused] = useState(false);
  const secret = tone === 'secret';

  const wrapStyle: CSSProperties = {
    border: secret
      ? `1px solid color-mix(in srgb, var(--qa-secret) 45%, transparent)`
      : '1px solid var(--qa-hairline-soft)',
    borderLeft: `3px solid ${secret ? 'var(--qa-secret)' : 'var(--qa-hairline)'}`,
    borderRadius: 'var(--qa-radius-sm)',
    padding: '9px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    background: secret
      ? 'color-mix(in srgb, var(--qa-secret) 5%, var(--qa-ink-raised))'
      : 'var(--qa-ink-raised)',
    ...(focused ? { boxShadow: 'var(--qa-focus-ring)' } : {}),
    transition: 'box-shadow var(--qa-dur-fast) var(--qa-ease)',
  };

  const fieldStyle: CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    padding: 0,
    color: 'var(--qa-vellum)',
    fontFamily: 'var(--qa-font-body)',
    fontSize: 14,
    ...(multiline ? { lineHeight: 1.5, resize: 'vertical' as const } : {}),
  };

  return (
    <div style={wrapStyle}>
      <label htmlFor={id}>
        <Label {...(secret ? { accent: 'var(--qa-secret)' } : { tone: 'faint' as const })}>
          {badge}
        </Label>
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={2}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={fieldStyle}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={fieldStyle}
        />
      )}
    </div>
  );
}
