/**
 * Join, judged whole — the invitation. Things to judge: whether the campaign
 * name reads as something you were HANDED rather than a page title, whether
 * the signed-out auth-then-join path feels continuous (one card, not a
 * redirect), and whether a dead link's error reads as direction rather than
 * an apology.
 *
 * NOTE: the join-preview fetch (apiRequest, not SessionApi) is real and
 * unmocked here — without a server at localhost:8787 both stories render the
 * ShellError state rather than a populated card. Judge the chrome and the
 * loading/error states from these; judge the populated card from the
 * campaign-ladder golden test's real data plus Landing's auth-sheet story,
 * which is the same card material.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { JoinFlow } from './JoinFlow.js';
import { mockSession, MOCK_ACCOUNT } from './mockSession.js';

const meta: Meta<typeof JoinFlow> = { title: 'Shell/Join', component: JoinFlow, parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj<typeof JoinFlow>;

export const SignedOut: Story = {
  args: { code: 'a7k92xqp', session: mockSession(), onJoined: (id: string) => console.log('joined', id) },
};

export const SignedIn: Story = {
  args: { code: 'a7k92xqp', session: mockSession({ account: MOCK_ACCOUNT }), onJoined: (id: string) => console.log('joined', id) },
};
