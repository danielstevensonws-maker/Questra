/**
 * Campaign + membership flows (Brief 14 §2) — create, the join link, listing an
 * account's campaigns, removing a member, and minting a table_display credential.
 * Same shape as AuthService: testable async functions the routes are a thin shell
 * over. This is deliberately NOT Brief 11's full Campaign Data Ops (premise chips,
 * pools, bonds web, promotions) — that is M4. This is only what M3's shell needs to
 * make "create → join → land in the party view" real.
 */
import type { Campaign, CampaignSession, MyCampaigns } from '@questra/contracts';
import type { AuthRepo } from './repo.js';
import { hashToken, newRefreshToken, type Clock, systemClock } from './tokens.js';
import { AuthError } from './service.js';

/** A join code is short and typeable (shared verbally, in a Discord message), unlike
 *  a verification/reset token — but stored + matched the same hashed way (ADR-0004). */
function newJoinCode(): string {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'; // no 0/o/1/i/l — read-aloud safe
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

export interface CampaignDeps {
  repo: AuthRepo;
  clock?: Clock;
  newCampaignId: () => string;
  newPlaySessionId: () => string;
  /** Raw code/token generator. Defaults to a CSPRNG; tests inject a fixed sequence. */
  newSecret?: () => string;
}

export class CampaignService {
  private now: Clock;
  private newSecret: () => string;
  constructor(private deps: CampaignDeps) {
    this.now = deps.clock ?? systemClock;
    this.newSecret = deps.newSecret ?? newJoinCode;
  }
  private nowIso(): string {
    return new Date(this.now() * 1000).toISOString();
  }

  private async requireDm(accountId: string, campaignId: string): Promise<void> {
    const m = await this.deps.repo.membership(accountId, campaignId);
    if (!m || m.role !== 'dm') throw new AuthError('not_dm', "Only this campaign's DM can do that.", 403);
  }

  /**
   * Create ⇒ Membership{role:dm} + a play session + a join code, all at once (brief-14
   * §2's "create campaign ⇒ Membership{role:dm} + join link"). One play session per
   * campaign for the slice — brief-11's session/room CRUD (M4) is what lets a DM run
   * more than one.
   */
  async createCampaign(ownerAccountId: string, name: string): Promise<{ campaign: Campaign; joinCode: string; playSessionId: string }> {
    const campaign: Campaign = { id: this.deps.newCampaignId(), name, ownerAccountId, createdAt: this.nowIso() };
    await this.deps.repo.createCampaign(campaign);

    const playSessionId = this.deps.newPlaySessionId();
    await this.deps.repo.createPlaySession(playSessionId, campaign.id, this.nowIso());

    await this.deps.repo.addMembership({ campaignId: campaign.id, accountId: ownerAccountId, role: 'dm', createdAt: this.nowIso() });

    const joinCode = this.newSecret();
    await this.deps.repo.setJoinTokenHash(campaign.id, await hashToken(joinCode));

    return { campaign, joinCode, playSessionId };
  }

  /** The public half a logged-out visitor sees at /join/:code (brief-14 §3). */
  async joinPreview(code: string): Promise<{ campaignName: string }> {
    const campaign = await this.deps.repo.campaignByJoinTokenHash(await hashToken(code));
    if (!campaign) throw new AuthError('bad_code', "That invite link doesn't work anymore.", 404);
    return { campaignName: campaign.name };
  }

  /** Join ⇒ Membership{role:player} (brief-14 §2). Already a member ⇒ no-op, not an error —
   *  clicking your own invite link twice should land you in the campaign, not fail. */
  async join(accountId: string, code: string): Promise<{ campaignId: string; campaignName: string }> {
    const campaign = await this.deps.repo.campaignByJoinTokenHash(await hashToken(code));
    if (!campaign) throw new AuthError('bad_code', "That invite link doesn't work anymore.", 404);

    const existing = await this.deps.repo.membership(accountId, campaign.id);
    if (!existing) {
      await this.deps.repo.addMembership({ campaignId: campaign.id, accountId, role: 'player', createdAt: this.nowIso() });
    }
    return { campaignId: campaign.id, campaignName: campaign.name };
  }

  /** Home's two lists: campaigns this account DMs vs plays in. */
  async myCampaigns(accountId: string): Promise<MyCampaigns> {
    const rows = await this.deps.repo.membershipsForAccount(accountId);
    const toEntry = (r: (typeof rows)[number]) => ({ campaignId: r.campaignId, campaignName: r.campaignName });
    return {
      dming: rows.filter((r) => r.role === 'dm').map(toEntry),
      playing: rows.filter((r) => r.role === 'player').map(toEntry),
    };
  }

  /** DM-only: remove a member. The DM cannot remove themself this way (transfer/archive
   *  is the deletion-guard's job, same as AuthService.deleteAccount). */
  async removeMember(callerAccountId: string, campaignId: string, targetAccountId: string): Promise<void> {
    await this.requireDm(callerAccountId, campaignId);
    if (targetAccountId === callerAccountId) {
      throw new AuthError('cannot_remove_self', "You can't remove yourself as DM — hand off or archive the campaign instead.", 409);
    }
    await this.deps.repo.removeMembership(targetAccountId, campaignId);
  }

  /**
   * What a member needs to open a campaign: the play session to sync against
   * and who else belongs at the table.
   *
   * Gated on MEMBERSHIP, not on being the DM — every player needs this to say
   * hello on the socket. But it is gated: a campaign's roster is not public,
   * and the unauthenticated join preview deliberately exposes only the name.
   */
  async session(callerAccountId: string, campaignId: string): Promise<CampaignSession> {
    const me = await this.deps.repo.membership(callerAccountId, campaignId);
    if (!me) throw new AuthError('not_member', 'You are not part of this campaign.', 403);

    const campaign = await this.deps.repo.campaignById(campaignId);
    if (!campaign) throw new AuthError('no_campaign', 'That campaign no longer exists.', 404);

    const playSessionId = await this.deps.repo.sessionIdForCampaign(campaignId);
    /* Every campaign gets a play session at creation, so a missing one is a
       broken invariant rather than an expected state — say so plainly instead
       of returning a half-populated session the client cannot use. */
    if (!playSessionId) throw new AuthError('no_session', 'This campaign has no play session yet.', 409);

    return {
      campaignId,
      campaignName: campaign.name,
      playSessionId,
      members: await this.deps.repo.membersOfCampaign(campaignId),
      /* A membership row's role is typed with the full ViewerRole union, but a
         table_display credential never has one — it is not an account. Narrow
         here rather than widening the contract to admit a case that cannot occur. */
      yourRole: me.role === 'dm' ? 'dm' : 'player',
    };
  }

  /**
   * DM-only: mint a table_display credential (brief-14 §2). Regenerating revokes every
   * prior one for this campaign first — there is exactly one live shared-screen token at
   * a time, same "regenerable" contract as the join code.
   */
  async mintTableDisplayToken(callerAccountId: string, campaignId: string): Promise<{ token: string }> {
    await this.requireDm(callerAccountId, campaignId);
    await this.deps.repo.revokeTableDisplayTokens(campaignId);
    const token = newRefreshToken(); // opaque, high-entropy — same generator as a refresh token
    await this.deps.repo.putTableDisplayToken({ tokenHash: await hashToken(token), campaignId, createdAt: this.nowIso() });
    return { token };
  }
}
