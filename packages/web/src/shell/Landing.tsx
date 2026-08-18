/**
 * Landing (Brief 14 §3, M3 minimal) — the pitch + sign in / create account.
 * Public; a signed-in visitor never sees this (the app shell redirects to Home).
 *
 * THE SIGNATURE IDEA. This isn't a picture of the game, it's the room. The
 * backdrop is `.qa2-map.is-fill` — the exact class the real Player View draws
 * combatants on — at rest, empty, no token placed yet. Pressing Enter doesn't
 * navigate to a form page; the same glass the play screen uses for a held
 * prompt rises up over the same ground, because you're not leaving the
 * threshold to sign up, you're stepping further through it.
 *
 * Marketing copy here is owner-supplied content in the brief (§3: "structure
 * ships with a placeholder") — the wordmark and the one line of scene-setting
 * prose below are written to match CLAUDE.md's own framing of the product
 * ("a session, start to finish," not a toolbox), not invented ad copy.
 */
import { useState, type FormEvent, type ReactElement } from 'react';
import { Button } from '@questra/ui';
import { heroTitle, eyebrow, narration, micro } from '../design/index.js';
import { ShellStyles } from './ShellStyles.js';
import { AuthField } from './AuthField.js';
import type { SessionApi } from './session.js';

export interface LandingProps {
  session: SessionApi;
  /** Called once sign-in/signup succeeds — the host decides where "in" goes. */
  onEntered: () => void;
}

type Panel = 'closed' | 'signup' | 'login';

export function Landing({ session, onEntered }: LandingProps): ReactElement {
  const [panel, setPanel] = useState<Panel>('closed');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (panel === 'signup') await session.signup(email, password, displayName);
      else await session.login(email, password);
      onEntered();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="qa-landing">
      <ShellStyles />
      <div className="qa2-map is-fill">
        <div className="qa2-map-ground" />
      </div>
      <div className="qa-landing-seam" />
      <div className="qa-landing-scrim" />

      <div className="qa-landing-content">
        {panel === 'closed' ? (
          <>
            <p className="qa-landing-eyebrow" style={eyebrow}>A session, start to finish</p>
            <h1 className="qa-landing-wordmark" style={heroTitle}>Questra</h1>
            <p className="qa-landing-tagline" style={narration}>
              Five friends who&rsquo;ve never played before, finishing a real night of
              D&amp;D together &mdash; tonight, in a browser, no install.
            </p>
            <div className="qa-landing-actions">
              <button type="button" className="qa2-cta" onClick={() => setPanel('signup')}>
                Enter
              </button>
              <button type="button" className="qa2-quiet-link" onClick={() => setPanel('login')}>
                Already playing? Sign in
              </button>
            </div>
          </>
        ) : (
          <div className="qa2-sheet qa-auth-sheet" style={{ position: 'static' }}>
            <div className="qa2-sheet-head">
              <h1 style={heroTitle}>{panel === 'signup' ? 'Begin' : 'Welcome back'}</h1>
              <button type="button" className="qa2-mini" aria-label="Back" onClick={() => setPanel('closed')}>&larr;</button>
            </div>
            <div className="qa2-sheet-body">
              <div className="qa2-tabs" style={{ padding: 0, border: 'none' }}>
                <button type="button" className={panel === 'signup' ? 'qa2-tab is-on' : 'qa2-tab'} onClick={() => setPanel('signup')}>New here</button>
                <button type="button" className={panel === 'login' ? 'qa2-tab is-on' : 'qa2-tab'} onClick={() => setPanel('login')}>Returning</button>
              </div>
              <form className="qa-auth-form" onSubmit={submit}>
                {panel === 'signup' && (
                  <AuthField id="displayName" label="What should we call you" type="text" value={displayName} onChangeText={setDisplayName} autoComplete="nickname" />
                )}
                <AuthField id="email" label="Email" type="email" value={email} onChangeText={setEmail} autoComplete="email" />
                <AuthField id="password" label="Password" type="password" value={password} onChangeText={setPassword} autoComplete={panel === 'signup' ? 'new-password' : 'current-password'} />
                {error && <p className="qa-auth-error" style={micro}>{error}</p>}
                <Button type="submit" variant="primary" disabled={busy} aria-disabled={busy}>
                  {busy ? 'One moment…' : panel === 'signup' ? 'Create account' : 'Sign in'}
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
