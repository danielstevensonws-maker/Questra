/**
 * shell/App — the M3 minimal shell's routing (Brief 14 §3): landing → home →
 * join → nav. A signed-in visitor never sees Landing (redirected to Home); a
 * signed-out visitor is bounced to Landing off any page that needs an
 * account, EXCEPT /join/:code, whose public preview is deliberately visible
 * logged-out (brief-14 §3: "the join link is a player's entire front door").
 */
import type { ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { SessionProvider, useSession } from './session.js';
import { Landing } from './Landing.js';
import { Home } from './Home.js';
import { JoinFlow } from './JoinFlow.js';
import { CreateCampaign } from './CreateCampaign.js';
import { CampaignPlaceholder } from './CampaignPlaceholder.js';
import { Nav } from './Nav.js';
import { ShellStyles } from './ShellStyles.js';
import { ShellLoading } from './ShellStates.js';

/** The account-gated pages share the persistent nav; Landing and Join do not
 *  (they are the threshold and the invitation — neither wants a wayfinding
 *  bar competing with the one moment they're staging). */
function SignedInLayout({ children }: { children: ReactElement }): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  return (
    <>
      <ShellStyles />
      <Nav session={session} onHome={() => navigate('/home')} />
      {children}
    </>
  );
}

function LandingRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  if (session.loading) return <ShellLoading label="Finding your seat…" />;
  if (session.account) return <Navigate to="/home" replace />;
  return <Landing session={session} onEntered={() => navigate('/home')} />;
}

function HomeRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  if (session.loading) return <ShellLoading label="Finding your seat…" />;
  if (!session.account) return <Navigate to="/" replace />;
  return (
    <SignedInLayout>
      <Home
        session={session}
        onOpenCampaign={(id) => navigate(`/campaign/${id}`)}
        onCreateCampaign={() => navigate('/campaign/new')}
      />
    </SignedInLayout>
  );
}

function JoinRoute(): ReactElement {
  const { code } = useParams<{ code: string }>();
  const session = useSession();
  const navigate = useNavigate();
  if (session.loading) return <ShellLoading label="Finding your seat…" />;
  if (!code) return <Navigate to="/" replace />;
  return <JoinFlow code={code} session={session} onJoined={(campaignId) => navigate(`/campaign/${campaignId}`)} />;
}

function CreateCampaignRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  if (session.loading) return <ShellLoading label="Finding your seat…" />;
  if (!session.account) return <Navigate to="/" replace />;
  return (
    <CreateCampaign
      session={session}
      onCreated={(id) => navigate(`/campaign/${id}`)}
      onCancel={() => navigate('/home')}
    />
  );
}

function CampaignRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  if (session.loading) return <ShellLoading label="Finding your seat…" />;
  if (!session.account) return <Navigate to="/" replace />;
  // Where joining and campaign creation both land once they have a real id —
  // the actual campaign-scoped screens (Session Planner, the play screen)
  // are M4/M2's measurement gate, not this brief.
  return <CampaignPlaceholder onHome={() => navigate('/home')} />;
}

function Shell(): ReactElement {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route path="/home" element={<HomeRoute />} />
      <Route path="/join/:code" element={<JoinRoute />} />
      <Route path="/campaign/new" element={<CreateCampaignRoute />} />
      <Route path="/campaign/:id" element={<CampaignRoute />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <SessionProvider>
        <Shell />
      </SessionProvider>
    </BrowserRouter>
  );
}
