import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlayerMenu } from './PlayerMenu.js';
import { toVitals, toStats, toSaves, toPassives, toSkills, fmtCoins } from './sheetToPlayerHub.js';
import { sheet, torvald, TORVALD_INVENTORY, Ground } from './playFixtures.js';

// A standalone overlay component — NOT part of PlayerHub. PlayerHub only exposes
// `onOpenMenu`, a callback the caller wires to render this; see PlayerHub.stories.tsx's
// `HubWithMenu` for that wiring. This file is where PlayerMenu is exercised on its own.
const meta: Meta = { title: 'Play/PlayerMenu', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;

export const Menu: Story = {
  render: () => (
    <Ground>
      <PlayerMenu
        open
        onClose={() => console.log('close')}
        identity={{ name: 'Torvald', level: 3, className: 'Fighter' }}
        vitals={toVitals(sheet, torvald)}
        stats={toStats(sheet)}
        saves={toSaves(sheet)}
        passives={toPassives(sheet)}
        skills={toSkills(sheet)}
        coins={fmtCoins(sheet.coins)}
        inventory={TORVALD_INVENTORY}
        onExplain={(r) => console.log('explain', r)}
      />
    </Ground>
  ),
};
