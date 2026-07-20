/**
 * InfoPanel stories — driven by the REAL contracts fixtures (Prone, Fireball,
 * Fighter), restyled to the Questra V1 Prototype sheet's InfoPanel. It proves
 * the primitive renders official + homebrew + derivation-carrying data with no
 * per-type code, and adds the sheet's loading + not-found states. This is the
 * Build Playbook pattern: primitives get storybook entries against fixtures.
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RulesEntitySchema } from '@questra/contracts';
import { InfoPanel, type InfoPanelData } from './InfoPanel.js';
import { entityToInfoPanel } from './entityToInfoPanel.js';
import { TableBackdrop } from './TableBackdrop.js';

import prone from '@questra/contracts/src/fixtures/prone.json';
import fireball from '@questra/contracts/src/fixtures/fireball.json';
import fighterFixture from '@questra/contracts/src/fixtures/fighter.json';

import '@questra/theme/styles.css';
import '../theme/index.css';

const meta: Meta<typeof InfoPanel> = {
  title: 'Primitives/InfoPanel',
  component: InfoPanel,
  // the panel is glass; judge it over the map
  decorators: [(Story) => <TableBackdrop height={560} center><Story /></TableBackdrop>],
};
export default meta;
type Story = StoryObj<typeof InfoPanel>;

function Harness({
  data,
  withChoose,
  defaultExpanded,
}: {
  data: InfoPanelData;
  withChoose?: boolean;
  defaultExpanded?: ('derivation' | 'rules')[];
}) {
  const [open, setOpen] = useState(true);
  return (
    <InfoPanel
      open={open}
      data={data}
      onClose={() => setOpen(false)}
      {...(defaultExpanded ? { defaultExpanded } : {})}
      {...(withChoose ? { onChoose: () => alert('Chosen!') } : {})}
    />
  );
}

/** A condition — no derivation, rules text open. Renders from the real fixture. */
export const Condition: Story = {
  render: () => <Harness data={entityToInfoPanel(RulesEntitySchema.parse(prone))} defaultExpanded={['rules']} />,
};

/** A spell — the kind label pulls level + school from meta. */
export const Spell: Story = {
  render: () => <Harness data={entityToInfoPanel(RulesEntitySchema.parse(fireball))} withChoose />,
};

/** A class, with a synthetic derivation to show Layer 2 open with its parts. */
export const WithDerivation: Story = {
  render: () => {
    const base = entityToInfoPanel(RulesEntitySchema.parse(fighterFixture.class));
    return (
      <Harness
        withChoose
        defaultExpanded={['derivation']}
        data={{
          ...base,
          derivation: [
            { label: 'Hit points', value: 12, parts: [{ label: 'hit die (max)', value: 10 }, { label: 'Constitution', value: 2 }] },
            { label: 'Armor Class', value: 18, parts: [{ label: 'chain mail', value: 16 }, { label: 'shield', value: 2 }] },
          ],
        }}
      />
    );
  },
};

/** Homebrew — identical panel, quiet gold badge. "Custom content never looks second-class." */
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

/** Loading — the lookup is still resolving; the candle-breath skeleton. */
export const Loading: Story = {
  render: () => <InfoPanel open data={null} loading onClose={() => {}} />,
};

/** Not found — the entry couldn't be resolved. A plain sentence, not an error code. */
export const NotFound: Story = {
  render: () => <InfoPanel open data={null} onClose={() => {}} />,
};
