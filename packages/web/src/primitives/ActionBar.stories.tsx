import type { Meta, StoryObj } from '@storybook/react-vite';
import { ActionBar } from './ActionBar.js';
import { toActionTiles } from './sheetToPlayerHub.js';
import { sheet, torvald, state, Ground } from './playFixtures.js';

const meta: Meta = { title: 'Play/ActionBar', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;

export const Actions: Story = {
  render: () => (
    <Ground>
      <div style={{ width: 520 }}>
        <ActionBar
          tiles={toActionTiles(sheet, torvald, state, 'npc-goblin-1', { activeTurnEnforced: true })}
          onUse={(id) => console.log('use', id)}
          onExplain={(id) => console.log('explain', id)}
        />
      </div>
    </Ground>
  ),
};

export const ActionsGreyed: Story = {
  // it isn't Torvald's turn ⇒ every tile greys with the reject string as its tooltip.
  render: () => (
    <Ground>
      <div style={{ width: 520 }}>
        <ActionBar
          tiles={toActionTiles(sheet, torvald, { ...state, activeCreatureId: 'npc-goblin-1' }, 'npc-goblin-1', { activeTurnEnforced: true })}
          onUse={(id) => console.log('use', id)}
        />
      </div>
    </Ground>
  ),
};

export const ActionsWithEmptySlots: Story = {
  // Torvald has one attack and one bonus feature — the rest of each row pads with equip placeholders.
  render: () => (
    <Ground>
      <div style={{ width: 520 }}>
        <ActionBar
          tiles={toActionTiles(sheet, torvald, state, 'npc-goblin-1', { activeTurnEnforced: true })}
          onUse={(id) => console.log('use', id)}
          onExplain={(id) => console.log('explain', id)}
          onEquip={(economy) => console.log('equip', economy)}
        />
      </div>
    </Ground>
  ),
};
