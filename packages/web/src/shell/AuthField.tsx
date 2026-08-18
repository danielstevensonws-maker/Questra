/**
 * shell/AuthField — a labelled email/password/text input for the auth sheet.
 *
 * NOT design/parts.tsx's `Field`: that component's `secret` prop means
 * "DM-only visibility" (a lock glyph, a heavier rule), not "mask what's
 * typed" — reusing it for a password field would misuse its actual contract.
 * This reuses the same `.qa2-field-box`/`.qa2-field-input` CHROME (still one
 * material, still token-driven) with an honest native `type`.
 */
import type { ReactElement } from 'react';
import { eyebrow } from '../design/index.js';

export function AuthField({
  id, label, type, value, onChangeText, autoComplete,
}: {
  id: string;
  label: string;
  type: 'email' | 'password' | 'text';
  value: string;
  onChangeText: (text: string) => void;
  autoComplete?: string;
}): ReactElement {
  return (
    <span className="qa2-field-box">
      <label htmlFor={id} style={eyebrow}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        required
        minLength={type === 'password' ? 8 : undefined}
        className="qa2-field-input"
        onChange={(e) => onChangeText(e.target.value)}
      />
    </span>
  );
}
