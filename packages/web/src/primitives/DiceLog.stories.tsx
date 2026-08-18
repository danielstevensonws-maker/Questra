import type { Meta, StoryObj } from '@storybook/react-vite';
import { DiceLog } from './DiceLog.js';
import { LOG_ENTRIES, NOTES, FullHeightScreen } from './playFixtures.js';

const meta: Meta = { title: 'Play/DiceLog', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;

export const Log: Story = {
  render: () => (
    <FullHeightScreen>
      <DiceLog entries={LOG_ENTRIES} notes={NOTES} onSend={(text) => console.log('send', text)} />
    </FullHeightScreen>
  ),
};

/** Collapsed — a thin strip flush to the edge with a rotated label. Click it to reopen. */
export const LogCollapsed: Story = {
  render: () => (
    <FullHeightScreen>
      <DiceLog entries={LOG_ENTRIES} defaultOpen={false} pendingCount={1} onSend={(text) => console.log('send', text)} />
    </FullHeightScreen>
  ),
};
