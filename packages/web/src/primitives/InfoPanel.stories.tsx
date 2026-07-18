/**
 * InfoPanel stories — driven by the REAL contracts fixtures (Prone, Fireball,
 * Fighter), proving the primitive renders official + homebrew + derivation-
 * carrying data with no per-type code. This is the Build Playbook pattern:
 * primitives get storybook entries against fixtures, so UI needs no backend.
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RulesEntitySchema } from '@questra/contracts';
import { InfoPanel, type InfoPanelData } from './InfoPanel.js';
import { entityToInfoPanel } from './entityToInfoPanel.js';

import prone from '@questra/contracts/src/fixtures/prone.json';
import fireball from '@questra/contracts/src/fixtures/fireball.json';
import fighterFixture from '@questra/contracts/src/fixtures/fighter.json';

import '../theme/index.css';

const meta: Meta<typeof InfoPanel> = {
  title: 'Primitives/InfoPanel',
  component: InfoPanel,
};
export default meta;
type Story = StoryObj<typeof InfoPanel>;

function Harness({ data, withChoose }: { data: InfoPanelData; withChoose?: boolean }) {
  const [open, setOpen] = useState(true);
  return (
    <div style={{ minHeight: 500 }}>
      <button onClick={() => setOpen(true)} style={{ padding: 8 }}>Open panel</button>
      <InfoPanel
        open={open}
        data={data}
        onClose={() => setOpen(false)}
        {...(withChoose ? { onChoose: () => alert('Chosen!'), chooseLabel: `Choose ${data.name}` } : {})}
      />
    </div>
  );
}

/** A condition — no derivation, just plain + rules text. Renders from the real fixture. */
export const Condition: Story = {
  render: () => <Harness data={entityToInfoPanel(RulesEntitySchema.parse(prone))} />,
};

/** A spell — the kind label pulls level + school from meta. */
export const Spell: Story = {
  render: () => <Harness data={entityToInfoPanel(RulesEntitySchema.parse(fireball))} withChoose />,
};

/** A class, with a synthetic derivation to show Layer 2 (as a computed sheet value would). */
export const WithDerivation: Story = {
  render: () => {
    const base = entityToInfoPanel(RulesEntitySchema.parse(fighterFixture.class));
    return (
      <Harness
        data={{
          ...base,
          derivation: [
            { label: 'Hit Points (level 1)', value: 12, parts: [{ label: 'hit die (max)', value: 10 }, { label: 'CON mod', value: 2 }] },
            { label: 'Armor Class (chain + shield)', value: 18, parts: [{ label: 'chain mail', value: 16 }, { label: 'shield', value: 2 }] },
          ],
        }}
        withChoose
      />
    );
  },
};

/** Homebrew — identical panel, quiet badge. "Custom content never looks second-class." */
export const Homebrew: Story = {
  render: () => (
    <Harness
      withChoose
      data={{
        name: 'Spellblade',
        kind: 'Class — Average complexity',
        source: 'homebrew',
        summary: 'A warrior who channels arcane power through their weapon, blending steel and spell.',
        rulesText: 'Hit Die: d10. Primary Ability: Strength & Intelligence. A homebrew class rendered in the exact same panel as an official one.',
      }}
    />
  ),
};
