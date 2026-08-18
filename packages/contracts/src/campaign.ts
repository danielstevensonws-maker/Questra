/**
 * @questra/contracts — campaign (Brief 14 §2, minimal).
 *
 * Only what the M3 shell needs: the campaign a Membership binds to, and the
 * public half a logged-out visitor sees at `/join/:code`. Brief-11's full
 * Campaign Data Ops (premise chips, pools, bonds web, promotions, secrets) is
 * M4 — this is deliberately not that shape. Extending it later is a contracts
 * PR like any other; this file does not pre-guess those fields.
 */
import { z } from 'zod';
import { AccountIdSchema } from './identity.js';

export const CampaignSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(80),
  ownerAccountId: AccountIdSchema,
  createdAt: z.string().datetime(),
});
export type Campaign = z.infer<typeof CampaignSchema>;

/**
 * What `/join/:code` shows before sign-in — brief-14 §3: "campaign name + premise
 * (public half only)". Premise doesn't exist as a shape yet (that's the Campaign
 * Wrapper, M4), so this is name-only for now rather than a guessed field.
 */
export const JoinPreviewSchema = z.object({
  campaignName: z.string(),
});
export type JoinPreview = z.infer<typeof JoinPreviewSchema>;

/** The two groups Home splits a account's campaigns into (brief-14 §3). */
export const MyCampaignSchema = z.object({
  campaignId: z.string().min(1),
  campaignName: z.string(),
});
export type MyCampaign = z.infer<typeof MyCampaignSchema>;

export const MyCampaignsSchema = z.object({
  dming: z.array(MyCampaignSchema),
  playing: z.array(MyCampaignSchema),
});
export type MyCampaigns = z.infer<typeof MyCampaignsSchema>;
