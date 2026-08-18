/**
 * shell/ShellStates — empty / loading / error, shared across every shell
 * screen (Brief 14 §4). Built from primitives + tokens like everything else,
 * not one-off markup per screen: an error boundary that says something
 * different on every page teaches nothing, and a plain "Loading…" string is
 * the one place text was doing a job a small piece of chrome could do quieter.
 */
import type { ReactElement } from 'react';
import { eyebrow, prose } from '../design/index.js';

/** A quiet page-level wait — never a spinner graphic (the app's whole visual
 *  language is glass and serif, not iconography), just the eyebrow role with
 *  the same blink the play screen's AI caret already uses for "still working." */
export function ShellLoading({ label }: { label: string }): ReactElement {
  return (
    <div className="qa-shell-loading">
      <p style={eyebrow}>
        <span className="qa-shell-loading-mark">●</span> {label}
      </p>
    </div>
  );
}

/**
 * Recovery, not an apology (Frontend writing guidance: errors don't apologize
 * and are never vague about what happened). `detail` is the server's own
 * plain-language reason (AuthError.message) when there is one.
 */
export function ShellError({ title, detail, action }: { title: string; detail?: string; action?: { label: string; onClick: () => void } }): ReactElement {
  return (
    <div className="qa2-sheet qa-shell-error" style={{ position: 'static' }}>
      <div className="qa2-sheet-body">
        <p style={eyebrow}>{title}</p>
        {detail && <p style={prose}>{detail}</p>}
        {action && <button type="button" className="qa2-cta" onClick={action.onClick}>{action.label}</button>}
      </div>
    </div>
  );
}
