/**
 * Primitives/InfoPanel
 *
 * Three of these four stories parse REAL contracts fixtures through
 * RulesEntitySchema before rendering. That is deliberate: it proves the panel
 * renders official data with no per-type code and no backend. Invented sample
 * data would prove nothing.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { RulesEntitySchema } from '@questra/contracts';
import { Button } from '@questra/ui';
import { InfoPanel } from './InfoPanel.js';
import { entityToInfoPanel, type InfoPanelData } from './entityToInfoPanel.js';

import prone from '@questra/contracts/src/fixtures/prone.json';
import fireball from '@questra/contracts/src/fixtures/fireball.json';
import fighter from '@questra/contracts/src/fixtures/fighter.json';

/**
 * Every story starts open and offers a way back in, so the panel can be opened
 * and closed repeatedly while judging it.
 */
function Harness({
  data,
  onChoose,
}: {
  data: InfoPanelData;
  onChoose?: (() => void) | undefined;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ minHeight: '100vh', padding: 'var(--qa-hud-inset)' }}>
      <Button onClick={() => setOpen(true)}>Open {data.name}</Button>
      <InfoPanel
        data={data}
        open={open}
        onClose={() => setOpen(false)}
        {...(onChoose !== undefined ? { onChoose } : {})}
      />
    </div>
  );
}

// Typed loosely on purpose: every story drives the panel through `Harness`
// (which owns the open/close state), so none of them pass component args.
const meta: Meta = {
  title: 'Primitives/InfoPanel',
  component: InfoPanel,
  parameters: { layout: 'fullscreen' },
};

export default meta;
type Story = StoryObj;

/**
 * A condition, from the real `prone.json`. No derivation, so only layers 1 and
 * 3 render — and no Choose, because a condition is pure reference.
 */
export const Condition: Story = {
  render: () => <Harness data={entityToInfoPanel(RulesEntitySchema.parse(prone))} />,
};

/**
 * A spell, from the real `fireball.json`. The `kind` line pulls level and
 * school straight out of `meta`. With Choose.
 */
export const Spell: Story = {
  render: () => (
    <Harness
      data={entityToInfoPanel(RulesEntitySchema.parse(fireball))}
      onChoose={() => console.log('chose Fireball')}
    />
  ),
};

/**
 * Layer 2 in full, including `parts` breakdowns — as a computed sheet value
 * would supply. The derivation here is explicitly SYNTHETIC: the fixture
 * doesn't carry one, because in production it is computed at runtime from the
 * character's sheet.
 */
export const WithDerivation: Story = {
  render: () => {
    const entity = RulesEntitySchema.parse(
      (fighter as { class: unknown }).class,
    );
    return (
      <Harness
        data={{
          ...entityToInfoPanel(entity),
          derivation: [
            { label: 'Hit points', value: 12, parts: ['10 hit die (max)', '2 CON mod'] },
            { label: 'Armor Class', value: 18, parts: ['16 chain mail', '2 shield'] },
            { label: 'Proficiency bonus', value: '+2' },
          ],
        }}
        onChoose={() => console.log('chose Fighter')}
      />
    );
  },
};

/**
 * Homebrew renders in the IDENTICAL panel. The only difference is one quiet
 * tinted badge — a tint, never a warning. Custom content never looks
 * second-class.
 */
export const Homebrew: Story = {
  render: () => (
    <Harness
      data={{
        name: 'Spellblade',
        kind: 'Class — Average complexity',
        summary:
          'A duelist who sharpens spells into a blade. Fights up close and pays for it with slots.',
        rulesText:
          'Hit Dice: 1d8 per Spellblade level.\nArmor: Light armor, shields.\nWeapons: Simple and martial weapons.\n\nSpell-Bound Strike. When you hit with a melee weapon attack, you can expend a spell slot to deal extra force damage.',
        homebrew: true,
      }}
      onChoose={() => console.log('chose Spellblade')}
    />
  ),
};
