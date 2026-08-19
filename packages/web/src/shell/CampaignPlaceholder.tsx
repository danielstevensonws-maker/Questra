/**
 * shell/CampaignPlaceholder — where joining a table and opening a campaign
 * card both land today.
 *
 * The real campaign-scoped screens (Session Planner, Campaign Wrapper, the
 * play screen wired to a campaign) are M4/M2 work, not this brief. This says
 * so honestly instead of pretending a destination exists — but it says it in
 * the shell's own voice rather than as a build note, because the person
 * reading it just accepted an invitation from a friend and the one thing they
 * need to know is that it worked.
 */
import type { ReactElement } from 'react';
import { ShellStyles } from './ShellStyles.js';
import { Road } from './road/Road.js';
import { usePrefersReducedMotion } from './shared.js';

export function CampaignPlaceholder({ onHome }: { onHome: () => void }): ReactElement {
  const reduced = usePrefersReducedMotion();
  return (
    <div className={'rd qa-make' + (reduced ? ' is-still' : '')}>
      <ShellStyles />
      <Road distance="camp" />
      <main className="rd-panel qa-make-panel">
        <p className="rd-label">Your seat is saved</p>
        <h1 className="rd-title">You caught them up</h1>
        <p className="rd-detail">
          The table itself is not built yet — the session planner and the play screen come
          in a later round of work. Nothing you have done here is lost, and this campaign
          will be waiting on your home screen.
        </p>
        <div className="rd-actions">
          <button type="button" className="qa2-cta" onClick={onHome}>Back to the fire</button>
        </div>
      </main>
    </div>
  );
}
