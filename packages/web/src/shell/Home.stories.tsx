/**
 * Home, judged whole — deliberately quieter than Landing: the same ground at
 * rest, no seam, no scale. Things to judge: whether the DM'd/playing-in split
 * reads at a glance, whether the empty state invites rather than apologises,
 * and whether it's genuinely calmer than Landing (spend the boldness once).
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Home } from './Home.js';
import { mockSession, MOCK_ACCOUNT } from './mockSession.js';

const meta: Meta<typeof Home> = { title: 'Shell/Home', component: Home, parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof Home>;

export const WithCampaigns: Story = {
  args: {
    session: mockSession({
      account: MOCK_ACCOUNT,
      authedRequest: async () => ({
        dming: [{ campaignId: 'camp_1', campaignName: 'The Sunless Keep' }],
        playing: [{ campaignId: 'camp_2', campaignName: "Bob's One-Shot" }, { campaignId: 'camp_3', campaignName: 'The Long Road North' }],
      }) as never,
    }),
    onOpenCampaign: (id: string) => console.log('open', id),
    onCreateCampaign: () => console.log('create'),
  },
};

export const Empty: Story = {
  args: {
    session: mockSession({
      account: MOCK_ACCOUNT,
      authedRequest: async () => ({ dming: [], playing: [] }) as never,
    }),
    onOpenCampaign: (id: string) => console.log('open', id),
    onCreateCampaign: () => console.log('create'),
  },
};

export const LoadFailed: Story = {
  args: {
    session: mockSession({
      account: MOCK_ACCOUNT,
      authedRequest: async () => { throw new Error('Could not reach the server.'); },
    }),
    onOpenCampaign: (id: string) => console.log('open', id),
    onCreateCampaign: () => console.log('create'),
  },
};
