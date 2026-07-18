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
 * eventVisibleTo/filterStream — never by this component. The visual "secret"
 * treatment here is a reminder to the DM, not a protection. A player client must
 * never be sent the secret half in the first place.
 *
 * Themed entirely via theme/tokens.css variables. No hardcoded look.
 */
import { useId, type ReactNode } from 'react';
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--q-space-2)' }}>
      <div>
        <span
          style={{
            fontFamily: 'var(--q-font-mono)',
            fontSize: 'var(--q-text-xs)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            color: 'var(--q-ink-soft)',
          }}
        >
          {label}
        </span>
        {help && (
          <p style={{ margin: '2px 0 0', fontSize: 'var(--q-text-sm)', color: 'var(--q-ink-faint)' }}>{help}</p>
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
        badge="Secret · DM only"
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
  const accent = tone === 'secret' ? 'var(--q-secret)' : 'var(--q-ink-faint)';
  const wrapStyle: React.CSSProperties = {
    position: 'relative',
    background: 'var(--q-surface)',
    border: `1px solid ${tone === 'secret' ? 'color-mix(in srgb, var(--q-secret) 35%, var(--q-line))' : 'var(--q-line)'}`,
    borderLeft: `3px solid ${accent}`,
    borderRadius: 'var(--q-radius)',
    padding: 'var(--q-space-2) var(--q-space-3)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--q-space-1)',
  };
  const fieldStyle: React.CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--q-ink)',
    fontFamily: 'var(--q-font-body)',
    fontSize: 'var(--q-text-base)',
    lineHeight: 'var(--q-leading-normal)',
    resize: multiline ? 'vertical' : 'none',
  };

  return (
    <div style={wrapStyle}>
      <label
        htmlFor={id}
        style={{
          fontSize: 'var(--q-text-xs)',
          fontWeight: 600,
          letterSpacing: '0.03em',
          color: accent,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--q-space-1)',
        }}
      >
        {tone === 'secret' && <LockMark />}
        {badge}
      </label>
      {multiline ? (
        <textarea id={id} rows={2} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={fieldStyle} />
      ) : (
        <input id={id} type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} style={fieldStyle} />
      )}
    </div>
  );
}

function LockMark() {
  return (
    <span aria-hidden style={{ fontSize: 'var(--q-text-xs)', lineHeight: 1 }}>
      🔒
    </span>
  );
}
