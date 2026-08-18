import type { Meta, StoryObj } from '@storybook/react-vite';
import { Nav } from './Nav.js';
import { mockSession, MOCK_ACCOUNT } from './mockSession.js';

const meta: Meta<typeof Nav> = { title: 'Shell/Nav', component: Nav, parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof Nav>;

export const SignedIn: Story = {
  args: { session: mockSession({ account: MOCK_ACCOUNT }), onHome: () => console.log('home') },
};
