/**
 * PublicSecretField — the public/secret split input (Build Playbook §3;
 * component-list A4; CLAUDE.md non-negotiable #3).
 *
 * DM-authoring only (Session Planner scene notes/cast/secrets/locations,
 * Campaign Wrapper bonds/cast/locations). Never appears on the Player View —
 * by definition a player never authors a DM-only half.
 *
 * ⚠ THIS IS AUTHORING UI, NOT THE SECURITY FILTER. Secret text is kept out of
 * player payloads by `eventVisibleTo` / `filterStream` in
 * `@questra/contracts`'s `play/visibility.ts` — the actual choke point — and
 * NEVER by this component. The visual "secret" treatment here is a reminder
 * to the DM about what they're typing, not a protection. If the only thing
 * stopping a player from seeing a secret were this component's styling, the
 * system would already be broken.
 *
 * It speaks the contracts visibility vocabulary directly (`VISIBILITY_FOR`),
 * so a caller emits the two halves with no translation step and no
 * opportunity for a mapping bug to mislabel a secret as public.
 *
 * PROVISIONAL STYLING: the design hasn't supplied a `--qa-secret` tint yet —
 * packages/theme/test/tokens.test.ts deliberately asserts it's still absent,
 * to stop a session from inventing one. The secret half is differentiated by
 * label text, the lock mark, and a neutral ink-weight accent (--qa-ink-dim
 * vs public's --qa-ink-faint) only. Swap in the real token — and drop the
 * `tokens.test.ts` guard line for it — the day Design supplies it.
 */
import { useId } from 'react';
import type { CSSProperties } from 'react';
import type { Visibility } from '@questra/contracts';

export interface PublicSecretValue {
  public: string;
  secret: string;
}

/** The two halves map 1:1 onto contracts `Visibility` values — use this, never a hand-written 'dm_only'. */
export const VISIBILITY_FOR: Record<keyof PublicSecretValue, Visibility> = {
  public: 'public',
  secret: 'dm_only',
};

export interface PublicSecretFieldProps {
  value: PublicSecretValue;
  /** Fires with the whole next value on every keystroke, in either half. */
  onChange: (next: PublicSecretValue) => void;
  /** Switches BOTH halves between a single-line input and a resizable textarea. Default false. */
  multiline?: boolean;
  publicPlaceholder?: string;
  secretPlaceholder?: string;
  /** Optional guidance line under the field, e.g. "The table meets the public face; the truth stays with you." */
  help?: string;
}

const mono = 'var(--qa-font-mono)';
const body = 'var(--qa-font-body)';

export function PublicSecretField({
  value,
  onChange,
  multiline = false,
  publicPlaceholder = 'Everyone at the table sees this',
  secretPlaceholder = 'Only you (the DM) see this',
  help,
}: PublicSecretFieldProps) {
  const publicId = useId();
  const secretId = useId();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s3)', fontFamily: body }}>
      <Half
        id={publicId}
        badge="Public"
        accent="var(--qa-ink-faint)"
        value={value.public}
        onChangeText={(text) => onChange({ ...value, public: text })}
        placeholder={publicPlaceholder}
        multiline={multiline}
      />
      <Half
        id={secretId}
        badge="Secret · DM only"
        lock
        accent="var(--qa-ink-dim)"
        value={value.secret}
        onChangeText={(text) => onChange({ ...value, secret: text })}
        placeholder={secretPlaceholder}
        multiline={multiline}
      />
      {help !== undefined && (
        <p
          style={{
            fontFamily: body,
            fontStyle: 'italic',
            fontSize: 'var(--qa-text-whisper)',
            lineHeight: 1.5,
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

function Half({
  id,
  badge,
  lock = false,
  accent,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  id: string;
  badge: string;
  lock?: boolean;
  accent: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline: boolean;
}) {
  const fieldStyle: CSSProperties = {
    width: '100%',
    background: 'transparent',
    border: 'none',
    outline: 'none',
    resize: multiline ? 'vertical' : 'none',
    fontFamily: body,
    fontSize: 'var(--qa-text-body)',
    lineHeight: 1.5,
    color: 'var(--qa-ink)',
    padding: 0,
  };

  return (
    <div
      style={{
        background: 'var(--qa-chip)',
        borderLeft: `3px solid ${accent}`,
        borderRadius: 'var(--qa-radius-sm)',
        padding: 'var(--qa-s3) var(--qa-s4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--qa-s2)',
      }}
    >
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
        {lock ? `🔒 ${badge}` : badge}
      </label>
      {multiline ? (
        <textarea
          id={id}
          rows={2}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChangeText(e.target.value)}
          style={fieldStyle}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChangeText(e.target.value)}
          style={fieldStyle}
        />
      )}
    </div>
  );
}
