/**
 * resolveToken (Brief 14 §1) — the payoff. This is the real function injected into
 * SyncCore, replacing main.ts's stub. It is where the "token identifies the person,
 * membership decides the role per campaign at hello" decision lives:
 *
 *   1. verify the JWT      → who (claims.sub, an account id)
 *   2. session → campaign  → which campaign owns this play session
 *   3. membership(who, campaign) → what role here (or not a member → null)
 *
 * The token is NOT campaign-scoped: one login is valid across every campaign the
 * account belongs to. The returned `accountId` is the SAME string the visibility
 * filter keys whispers on — that identity thread is what the whisper golden proves.
 */
import type { ResolvedToken } from '../sync-core.js';
import type { AuthRepo } from './repo.js';
import { verifySession, type TokenConfig } from './tokens.js';

export function makeResolveToken(
  repo: AuthRepo,
  cfg: TokenConfig,
): (token: string, playSessionId: string) => Promise<ResolvedToken | null> {
  return async (token, playSessionId) => {
    const claims = await verifySession(token, cfg);
    if (!claims) return null; // bad/expired token → hello answers { error: 'auth' }

    const campaignId = await repo.campaignIdForSession(playSessionId);
    if (!campaignId) return null;

    const membership = await repo.membership(claims.sub, campaignId);
    if (!membership) return null; // authenticated but not a member here

    return { accountId: claims.sub, role: membership.role, playSessionId };
  };
}
