/**
 * CreateCampaign (Brief 14 §2/§3) — the one form Home's "Create a campaign"
 * CTA leads to. Calls the real POST /campaigns (createCampaign mints the
 * Membership{role:dm}, the play session, and the join code in one call — see
 * campaign-service.ts) and, critically, SURFACES the join code afterward:
 * brief-14 §2 makes creating a campaign inseparable from getting a link to
 * hand out, so a screen that created the campaign but never showed the code
 * would leave the DM with nobody to invite.
 */
import { useState, type FormEvent, type ReactElement } from 'react';
import type { Campaign } from '@questra/contracts';
import { heroTitle, eyebrow, narration, micro } from '../design/index.js';
import { ShellStyles } from './ShellStyles.js';
import { AuthField } from './AuthField.js';
import type { SessionApi } from './session.js';

export interface CreateCampaignProps {
  session: SessionApi;
  onCreated: (campaignId: string) => void;
  onCancel: () => void;
}

interface CreateResult { campaign: Campaign; joinCode: string; playSessionId: string }

export function CreateCampaign({ session, onCreated, onCancel }: CreateCampaignProps): ReactElement {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateResult | null>(null);
  const [copied, setCopied] = useState(false);

  const joinUrl = result ? `${window.location.origin}/join/${result.joinCode}` : '';

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await session.authedRequest<CreateResult>('/campaigns', { method: 'POST', body: { name } });
      setResult(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (): Promise<void> => {
    await navigator.clipboard.writeText(joinUrl).catch(() => {});
    setCopied(true);
  };

  return (
    <div className="qa-join">
      <ShellStyles />
      <div className="qa2-map is-fill"><div className="qa2-map-ground" /></div>
      <div className="qa2-sheet qa-join-card" style={{ position: 'static' }}>
        <div className="qa2-sheet-body">
          {!result ? (
            <>
              <p style={eyebrow}>Name your campaign</p>
              <h1 style={heroTitle}>New table</h1>
              <form className="qa-auth-form" onSubmit={submit}>
                <AuthField id="campaign-name" label="Campaign name" type="text" value={name} onChangeText={setName} />
                {error && <p className="qa-auth-error" style={micro}>{error}</p>}
                <div style={{ display: 'flex', gap: 'var(--qa-s3)' }}>
                  <button type="button" className="qa2-quiet-link" onClick={onCancel}>Cancel</button>
                  <button type="submit" className="qa2-cta" aria-disabled={busy}>{busy ? 'Creating…' : 'Create'}</button>
                </div>
              </form>
            </>
          ) : (
            <>
              <p style={eyebrow}>{result.campaign.name} is ready</p>
              <h1 style={heroTitle}>Send this to your table</h1>
              <p style={narration}>
                Anyone with this link can join as a player. It stays live until you regenerate it.
              </p>
              <div className="qa2-field-box">
                <span style={eyebrow}>Join link</span>
                <span style={{ ...micro, wordBreak: 'break-all' }}>{joinUrl}</span>
              </div>
              <div style={{ display: 'flex', gap: 'var(--qa-s3)' }}>
                <button type="button" className="qa2-quiet-link" onClick={() => { void copyLink(); }}>
                  {copied ? 'Copied' : 'Copy link'}
                </button>
                <button type="button" className="qa2-cta" onClick={() => onCreated(result.campaign.id)}>Continue</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
