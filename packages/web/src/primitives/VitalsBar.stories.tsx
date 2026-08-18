import type { Meta, StoryObj } from '@storybook/react-vite';
import { VitalsBar } from './VitalsBar.js';
import { toVitals } from './sheetToPlayerHub.js';
import { sheet, torvald, Ground } from './playFixtures.js';

const meta: Meta = { title: 'Play/VitalsBar', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;

export const Vitals: Story = {
  render: () => (
    <Ground>
      <VitalsBar vitals={toVitals(sheet, torvald)} onExplain={(r) => console.log('explain', r)} />
    </Ground>
  ),
};

export const VitalsBloodied: Story = {
  render: () => (
    <Ground>
      <VitalsBar vitals={toVitals(sheet, { ...torvald, hp: 5, conditions: [{ conditionId: 'condition.prone' }] })} />
    </Ground>
  ),
};
