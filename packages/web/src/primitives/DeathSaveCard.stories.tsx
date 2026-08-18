import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { DeathSaveCard } from './DeathSaveCard.js';
import type { DeathSaveVM } from './sheetToPlayerHub.js';
import { Ground } from './playFixtures.js';

const meta: Meta = { title: 'Play/DeathSaveCard', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;

export const DeathSaves: Story = {
  render: function DeathSavesStory() {
    const [vm, setVm] = useState<DeathSaveVM>({ successes: 1, failures: 2, phase: 'dying' });
    return (
      <Ground>
        <div style={{ width: 320 }}>
          <DeathSaveCard state={vm} onRoll={() => setVm((s) => ({ ...s, successes: Math.min(3, s.successes + 1) }))} />
        </div>
      </Ground>
    );
  },
};

export const DeathSavesDead: Story = {
  render: () => (
    <Ground>
      <div style={{ width: 320 }}>
        <DeathSaveCard state={{ successes: 1, failures: 3, phase: 'dead' }} onRoll={() => {}} />
      </div>
    </Ground>
  ),
};
