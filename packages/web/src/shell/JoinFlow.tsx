/**
 * Join (Brief 14 §3, M3 minimal) — `/join/:code`. "This is the player's entire
 * front door — it gets polish priority" (brief-14 §3). The public preview
 * (campaign name only — no premise shape exists yet, that's the Campaign
 * Wrapper, M4) shows before sign-in; joining is one action once signed in.
 *
 * READ AS AN INVITATION, NOT A FORM. Centred and narrow — an invitation is
 * handed to one person, so this never spreads to Landing's full-bleed width —
 * over the same ground everything else in the shell is built from.
 */
import { useEffect, useState, type FormEvent, type ReactElement } from 'react';
import { Button } from '@questra/ui';
import type { JoinPreview } from '@questra/contracts';
import { heroTitle, eyebrow, narration, micro } from '../design/index.js';
import { ShellStyles } from './ShellStyles.js';
import { Room } from './Room.js';
import { AuthField } from './AuthField.js';
import { ShellLoading, ShellError } from './ShellStates.js';
import type { SessionApi } from './session.js';
import { apiRequest, ApiError } from './api.js';

export interface JoinFlowProps {
  code: string;
  session: SessionApi;
  onJoined: (campaignId: string) => void;
}

type AuthMode = 'signup' | 'login';

export function JoinFlow({ code, session, onJoined }: JoinFlowProps): ReactElement {
  const [preview, setPreview] = useState<JoinPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiRequest<JoinPreview>(`/join/${code}`)
      .then((r) => { if (!cancelled) setPreview(r); })
      .catch((e) => { if (!cancelled) setPreviewError(e instanceof ApiError ? e.message : "That invite link doesn't work anymore."); });
    return () => { cancelled = true; };
  }, [code]);

  const doJoin = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const r = await session.authedRequest<{ campaignId: string; campaignName: string }>(`/join/${code}`, { method: 'POST' });
      onJoined(r.campaignId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const submitAuth = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') await session.signup(email, password, displayName);
      else await session.login(email, password);
      await doJoin();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
      setBusy(false);
    }
  };

  return (
    <div className="qa-join">
      <ShellStyles />
      <Room />

      {!preview && !previewError && <ShellLoading label="Finding your invitation…" />}
      {previewError && <ShellError title="This link doesn't work" detail={previewError} />}

      {preview && (
        <div className="qa2-sheet qa-join-card" style={{ position: 'static' }}>
          <div className="qa2-sheet-body">
            <p style={eyebrow}>You&rsquo;ve been invited to</p>
            <h1 className="qa-join-name" style={heroTitle}>{preview.campaignName}</h1>

            {session.account ? (
              <>
                <p style={narration}>Joining as {session.account.displayName}.</p>
                {error && <p className="qa-auth-error" style={micro}>{error}</p>}
                <button type="button" className="qa2-cta" aria-disabled={busy} onClick={doJoin}>
                  {busy ? 'Joining…' : 'Join the table'}
                </button>
              </>
            ) : (
              <>
                <div className="qa2-tabs" style={{ padding: 0, border: 'none' }}>
                  <button type="button" className={mode === 'signup' ? 'qa2-tab is-on' : 'qa2-tab'} onClick={() => setMode('signup')}>New here</button>
                  <button type="button" className={mode === 'login' ? 'qa2-tab is-on' : 'qa2-tab'} onClick={() => setMode('login')}>Returning</button>
                </div>
                <form className="qa-auth-form" onSubmit={submitAuth}>
                  {mode === 'signup' && (
                    <AuthField id="join-name" label="What should we call you" type="text" value={displayName} onChangeText={setDisplayName} autoComplete="nickname" />
                  )}
                  <AuthField id="join-email" label="Email" type="email" value={email} onChangeText={setEmail} autoComplete="email" />
                  <AuthField id="join-password" label="Password" type="password" value={password} onChangeText={setPassword} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
                  {error && <p className="qa-auth-error" style={micro}>{error}</p>}
                  <Button type="submit" variant="primary" disabled={busy} aria-disabled={busy}>
                    {busy ? 'One moment…' : mode === 'signup' ? 'Create account & join' : 'Sign in & join'}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
