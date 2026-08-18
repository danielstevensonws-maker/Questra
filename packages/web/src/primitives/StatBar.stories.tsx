import type { Meta, StoryObj } from '@storybook/react-vite';
import { StatBar } from './StatBar.js';
import { toStats } from './sheetToPlayerHub.js';
import { sheet, Ground } from './playFixtures.js';

const meta: Meta = { title: 'Play/StatBar', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;

export const Stats: Story = {
  render: () => (
    <Ground>
      <StatBar stats={toStats(sheet)} onExplain={(r) => console.log('explain', r)} />
    </Ground>
  ),
};
