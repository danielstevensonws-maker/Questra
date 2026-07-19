/**
 * PullFromCampaignPicker stories — the picker pulling REAL fixtures as if they
 * were campaign entries, restyled to the Questra V1 Prototype sheet. Goblin
 * Warrior (a recurring foe → cast), the Fighter class, and Fireball are mapped
 * into PickableItem view-models via the same kind of adapter entityToInfoPanel
 * is for InfoPanel — proving the picker references existing contracts content
 * with no bespoke shape.
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RulesEntitySchema, type RulesEntity } from '@questra/contracts';
import { PullFromCampaignPicker, type PickableItem } from './PullFromCampaignPicker.js';
import { TableBackdrop } from './TableBackdrop.js';

import goblin from '@questra/contracts/src/fixtures/goblin-warrior.json';
import fireball from '@questra/contracts/src/fixtures/fireball.json';
import fighter from '@questra/contracts/src/fixtures/fighter.json';

import '@questra/theme/styles.css';
import '../theme/index.css';

const meta: Meta<typeof PullFromCampaignPicker> = {
  title: 'Primitives/PullFromCampaignPicker',
  component: PullFromCampaignPicker,
  decorators: [(Story) => <TableBackdrop height={520} center><Story /></TableBackdrop>],
};
export default meta;
type Story = StoryObj<typeof PullFromCampaignPicker>;

/** Adapter: a rules entity → a pickable reference (the seam to real content). */
function toPickable(entity: RulesEntity): PickableItem {
  const kind =
    entity.entityType === 'monster' ? 'Cast' : entity.entityType === 'class' ? 'Class' : 'Reference';
  return { id: entity.id, name: entity.name, kind, hint: entity.plain };
}

const items: PickableItem[] = [
  toPickable(RulesEntitySchema.parse(goblin)),
  toPickable(RulesEntitySchema.parse(fighter.class)),
  toPickable(RulesEntitySchema.parse(fireball)),
];

function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 290 }}>{children}</div>;
}

/** Multi-select: pull several recurring pieces into a scene. One already selected. */
export const PullIntoScene: Story = {
  render: () => {
    const [sel, setSel] = useState<string[]>([items[0]!.id]);
    return (
      <Frame>
        <PullFromCampaignPicker
          title="Pull into this scene"
          items={items}
          selectedIds={sel}
          onChange={setSel}
        />
      </Frame>
    );
  },
};

/** Single-select: pick the one recurring map / location this scene uses. */
export const SinglePick: Story = {
  render: () => {
    const [sel, setSel] = useState<string[]>([]);
    return (
      <Frame>
        <PullFromCampaignPicker
          title="Recurring map for this scene"
          items={items}
          selectedIds={sel}
          onChange={setSel}
          mode="single"
        />
      </Frame>
    );
  },
};

/**
 * The two empty states, side by side — they are different facts and each says
 * so. Typing a term that matches nothing is not the same as a fresh campaign
 * with nothing of this kind yet.
 */
export const EmptyStates: Story = {
  render: () => {
    const [sel, setSel] = useState<string[]>([]);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 290 }}>
        {/* typed-but-no-match: seeded by searching for something absent */}
        <PullFromCampaignPicker
          title="Pull into this scene"
          items={items}
          selectedIds={sel}
          onChange={setSel}
          searchPlaceholder="Try typing “wyvern”"
        />
        {/* fresh campaign: nothing of this kind exists at all */}
        <PullFromCampaignPicker
          title="Pull rewards"
          items={[]}
          selectedIds={[]}
          onChange={() => {}}
          emptyLabel="No rewards defined in this campaign yet."
        />
      </div>
    );
  },
};
