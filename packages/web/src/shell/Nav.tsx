/**
 * Nav (Brief 14 §3, M3 minimal) — the persistent top-level nav for signed-in
 * pages: home / current campaign / settings, sign out. A signpost, not an app
 * bar — Landing spent the one dramatic moment already, so this is deliberately
 * the quiet part, built entirely from qa2-pill's existing vocabulary rather
 * than a fresh chrome idea. Campaign-scoped subnav (campaign / sessions /
 * party / cast) is brief-14 §3's fuller shell — M4, once those surfaces exist.
 */
import type { ReactElement } from 'react';
import { eyebrow, micro } from '../design/index.js';
import type { SessionApi } from './session.js';

export interface NavProps {
  session: SessionApi;
  onHome: () => void;
}

export function Nav({ session, onHome }: NavProps): ReactElement {
  return (
    <nav className="qa-nav">
      <button type="button" className="qa-nav-brand" onClick={onHome}>
        <span style={{ ...eyebrow, color: 'var(--qa-ink)' }}>Questra</span>
      </button>
      <div className="qa-nav-links">
        <button type="button" className="qa2-pill" onClick={onHome}>Home</button>
      </div>
      {session.account && (
        <div className="qa-nav-account">
          <span style={micro}>{session.account.displayName}</span>
          <button type="button" className="qa2-quiet-link" onClick={() => { void session.logout(); }}>Sign out</button>
        </div>
      )}
    </nav>
  );
}
