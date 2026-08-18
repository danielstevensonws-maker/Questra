/**
 * shell/CampaignPlaceholder — where "join the table" and "open a campaign
 * card" land today. The actual campaign-scoped screens (Session Planner,
 * Campaign Wrapper, the play screen wired to a real campaign) are M4/M2's
 * measurement gate, not this brief — this says so honestly rather than
 * pretending a real destination exists.
 */
import type { ReactElement } from 'react';
import { heroTitle, narration } from '../design/index.js';
import { ShellStyles } from './ShellStyles.js';

export function CampaignPlaceholder({ onHome }: { onHome: () => void }): ReactElement {
  return (
    <div className="qa-join">
      <ShellStyles />
      <div className="qa2-map is-fill"><div className="qa2-map-ground" /></div>
      <div className="qa2-sheet qa-join-card" style={{ position: 'static' }}>
        <div className="qa2-sheet-body">
          <h1 style={heroTitle}>You&rsquo;re in</h1>
          <p style={narration}>
            The table itself isn&rsquo;t wired up yet — the Session Planner and the play
            screen land in a later milestone. Your seat is saved.
          </p>
          <button type="button" className="qa2-cta" onClick={onHome}>Back to home</button>
        </div>
      </div>
    </div>
  );
}
