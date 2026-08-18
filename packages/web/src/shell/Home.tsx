/**
 * Home (Brief 14 §3, M3 minimal) — signed in: "Your campaigns" split DM'd vs
 * playing-in, and a resume-last-session card. The near-empty "let's make your
 * first scene" state for a brand-new account is Brief 13's Floor 0 (M7) — out
 * of scope here; this file's empty state is the plainer M3 one: create or
 * join, nothing to resume yet.
 *
 * QUIETER THAN LANDING, ON PURPOSE. Same ground, same material, but the
 * boldness was already spent at the door — this is camp between sessions, not
 * the threshold. Glass panels at rest; nothing scales up, nothing glows except
 * the one "Create a campaign" action, because a returning player opens this
 * screen far more often than they open Landing, and a screen you see daily
 * should not perform for you every time (CLAUDE.md law 4: screen time is a
 * cost, not a goal — the same law that keeps play screens quiet applies here).
 */
import { useEffect, useState, type ReactElement } from 'react';
import type { MyCampaigns } from '@questra/contracts';
import { heroTitle, eyebrow, sceneName, prose, micro } from '../design/index.js';
import { ShellStyles } from './ShellStyles.js';
import { ShellLoading } from './ShellStates.js';
import type { SessionApi } from './session.js';

export interface HomeProps {
  session: SessionApi;
  onOpenCampaign: (campaignId: string) => void;
  onCreateCampaign: () => void;
}

export function Home({ session, onOpenCampaign, onCreateCampaign }: HomeProps): ReactElement {
  const [mine, setMine] = useState<MyCampaigns | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    session.authedRequest<MyCampaigns>('/campaigns/mine')
      .then((r) => { if (!cancelled) setMine(r); })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load your campaigns.'); });
    return () => { cancelled = true; };
  }, [session]);

  const name = session.account?.displayName ?? 'Adventurer';

  return (
    <div className="qa-home">
      <ShellStyles />
      <div className="qa2-map is-fill"><div className="qa2-map-ground" /></div>
      <div className="qa-home-content">
        <div className="qa-home-head">
          <div>
            <p style={eyebrow}>Welcome back</p>
            <h1 style={heroTitle}>{name}</h1>
          </div>
          <button type="button" className="qa2-cta" onClick={onCreateCampaign}>Create a campaign</button>
        </div>

        {error && <p className="qa-shell-error qa2-sheet" style={micro}>{error}</p>}

        {!error && !mine && <ShellLoading label="Finding your table…" />}

        {mine && (
          <>
            <section className="qa-home-section">
              <p style={eyebrow}>Campaigns you run</p>
              {mine.dming.length === 0 ? (
                <EmptyRow text="No campaigns yet — create one and send the join link to your table." />
              ) : (
                <div className="qa-home-grid">
                  {mine.dming.map((c) => (
                    <button key={c.campaignId} type="button" className="qa2-card qa-camp-card" onClick={() => onOpenCampaign(c.campaignId)}>
                      <span className="qa2-badge is-yours">DM</span>
                      <span style={sceneName}>{c.campaignName}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="qa-home-section">
              <p style={eyebrow}>Campaigns you play in</p>
              {mine.playing.length === 0 ? (
                <EmptyRow text="Nothing yet — ask your DM for the join link." />
              ) : (
                <div className="qa-home-grid">
                  {mine.playing.map((c) => (
                    <button key={c.campaignId} type="button" className="qa2-card qa-camp-card" onClick={() => onOpenCampaign(c.campaignId)}>
                      <span className="qa2-badge">Player</span>
                      <span style={sceneName}>{c.campaignName}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {mine.dming.length === 0 && mine.playing.length === 0 && (
              <div className="qa-home-empty">
                <p style={{ ...heroTitle, fontSize: 'var(--qa-text-lg)' }}>Nothing on the table yet</p>
                <p style={prose}>Create a campaign to run, or ask a friend for their join link.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function EmptyRow({ text }: { text: string }): ReactElement {
  return <p className="qa2-help" style={prose}>{text}</p>;
}
