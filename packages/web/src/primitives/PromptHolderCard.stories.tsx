/**
 * PromptHolderCard stories — the one interrupt card across its consumers
 * (Brief 08): an opportunity attack (options seeded from the REAL Goblin Warrior
 * fixture's attack), a legendary-action prompt with a pooled cost, a lair action,
 * and a DM answering a ruling on a player's behalf.
 *
 * Timeouts are set long here so the countdown doesn't auto-decline during a
 * static Storybook snapshot; in production the server owns the real 60s.
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RulesEntitySchema } from '@questra/contracts';
import { PromptHolderCard, type HolderPrompt } from './PromptHolderCard.js';

import goblin from '@questra/contracts/src/fixtures/goblin-warrior.json';

import '../theme/index.css';

const meta: Meta<typeof PromptHolderCard> = {
  title: 'Primitives/PromptHolderCard',
  component: PromptHolderCard,
};
export default meta;
type Story = StoryObj<typeof PromptHolderCard>;

function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 460, padding: 24, background: 'var(--q-bg)' }}>{children}</div>;
}

/** Small harness that shows what the holder chose. */
function Resolvable({ prompt }: { prompt: HolderPrompt }) {
  const [done, setDone] = useState<string | null>(null);
  if (done) {
    return <p style={{ color: 'var(--q-ink-soft)', fontSize: 'var(--q-text-sm)' }}>{done}</p>;
  }
  return (
    <PromptHolderCard
      prompt={prompt}
      onTake={(id) => setDone(`Took: ${id ?? 'reaction'}`)}
      onDecline={() => setDone('Declined.')}
    />
  );
}

/** Opportunity attack — the option is the Goblin Warrior's real scimitar attack. */
export const OpportunityAttack: Story = {
  render: () => {
    const g = RulesEntitySchema.parse(goblin);
    const attack = g.entityType === 'monster' ? g.meta.actions[0] : undefined;
    return (
      <Frame>
        <Resolvable
          prompt={{
            promptId: 'p-oa-1',
            kind: 'opportunity_attack',
            holder: g.name,
            trigger: 'The rogue steps out of reach.',
            context: ['Reaction available', 'Target within 5 ft as they leave'],
            options: attack ? [{ id: attack.name, label: attack.name, detail: 'Reaction' }] : [],
            timeoutSec: 600,
          }}
        />
      </Frame>
    );
  },
};

/** Legendary action — a pooled cost the DM spends at a turn boundary. */
export const LegendaryAction: Story = {
  render: () => (
    <Frame>
      <Resolvable
        prompt={{
          promptId: 'p-leg-1',
          kind: 'legendary',
          holder: 'Ancient White Dragon',
          trigger: 'A creature’s turn just ended. 3 legendary actions remain.',
          options: [
            { id: 'detect', label: 'Detect', detail: '1 action' },
            { id: 'tail', label: 'Tail Attack', detail: '1 action' },
            { id: 'wing', label: 'Wing Attack', detail: '2 actions' },
          ],
          timeoutSec: 600,
        }}
      />
    </Frame>
  ),
};

/** Lair action — the lair acts at initiative 20 (losing ties). */
export const LairAction: Story = {
  render: () => (
    <Frame>
      <Resolvable
        prompt={{
          promptId: 'p-lair-1',
          kind: 'lair',
          holder: 'The frozen cavern',
          trigger: 'Initiative 20 — the lair acts.',
          options: [
            { id: 'ice', label: 'Grasping ice', detail: 'DC 13 or restrained' },
            { id: 'fog', label: 'Freezing fog' },
            { id: 'skip', label: 'Skip' },
          ],
          timeoutSec: 600,
        }}
      />
    </Frame>
  ),
};

/** DM answers a ruling on a player’s behalf — the asDm note appears. */
export const DmAnswersRuling: Story = {
  render: () => (
    <Frame>
      <PromptHolderCard
        asDm
        prompt={{
          promptId: 'p-rule-1',
          kind: 'ruling',
          holder: 'Torvald',
          trigger: 'Torvald wants to swing across the chasm on the chandelier.',
          context: ['Suggested: Dexterity (Acrobatics)', 'DC 14'],
          options: [
            { id: 'roll', label: 'Ask for the roll' },
            { id: 'auto', label: 'Let it happen' },
          ],
          timeoutSec: 600,
        }}
        onTake={() => {}}
        onDecline={() => {}}
      />
    </Frame>
  ),
};
