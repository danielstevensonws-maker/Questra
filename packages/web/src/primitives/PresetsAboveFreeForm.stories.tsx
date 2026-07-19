/**
 * PresetsAboveFreeForm stories — the two shapes of the pattern, restyled to the
 * Questra V1 Prototype sheet: single-pick (a premise: tap a preset or write your
 * own) and multi-tag (appearance traits: toggle presets and add free-form ones).
 * Both keep the free-form path open, so the presets teach without caging.
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label } from '@questra/ui';
import { PresetsAboveFreeForm, type Preset } from './PresetsAboveFreeForm.js';
import { TableBackdrop } from './TableBackdrop.js';

import '@questra/theme/styles.css';
import '../theme/index.css';

const meta: Meta<typeof PresetsAboveFreeForm> = {
  title: 'Primitives/PresetsAboveFreeForm',
  component: PresetsAboveFreeForm,
  decorators: [(Story) => <TableBackdrop height={520} center><Story /></TableBackdrop>],
};
export default meta;
type Story = StoryObj<typeof PresetsAboveFreeForm>;

function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 330 }}>{children}</div>;
}

const PREMISES: Preset[] = [
  { id: 'heist', label: 'A heist gone wrong' },
  { id: 'haunt', label: 'A haunted frontier town' },
  { id: 'court', label: 'A fae court intrigue' },
];

/**
 * Single-pick — the campaign premise, opening with a preset already chosen.
 * Edit the text and the chip quietly lets go: the active chip is derived from
 * the value, never stored, so going your own way needs no extra motion.
 */
export const Premise: Story = {
  render: () => {
    const [value, setValue] = useState('A heist gone wrong');
    return (
      <Frame>
        <PresetsAboveFreeForm
          label="The premise"
          help="Start from a spark, or write your own in one line."
          presets={PREMISES}
          value={value}
          onChange={setValue}
        />
        <p
          style={{
            marginTop: 10,
            fontFamily: 'var(--qa-font-mono)',
            fontSize: 9,
            letterSpacing: 1,
            color: 'var(--qa-vellum-faint)',
          }}
        >
          EDIT THE TEXT AND THE CHIP QUIETLY LETS GO
        </p>
      </Frame>
    );
  },
};

/** Single-pick, empty — nothing chosen yet, every chip at rest. */
export const PremiseEmpty: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <Frame>
        <PresetsAboveFreeForm
          label="The premise"
          help="Start from a spark, or write your own in one line."
          presets={PREMISES}
          value={value}
          onChange={setValue}
        />
      </Frame>
    );
  },
};

const TRAITS: Preset[] = [
  { id: 'weathered', label: 'Weathered' },
  { id: 'scarred', label: 'Scarred' },
  { id: 'regal', label: 'Regal' },
];

/**
 * Multi-tag — appearance traits for a portrait prompt, seeded with one preset
 * and one free-form addition. A typed trait is first-class: same chip shape,
 * an ember wash, and its own remove control.
 */
export const AppearanceTraits: Story = {
  render: () => {
    const [values, setValues] = useState<string[]>(['Weathered', 'One eye']);
    return (
      <Frame>
        <PresetsAboveFreeForm
          mode="tags"
          label="Appearance traits"
          help="Pick a few, or add your own words."
          presets={TRAITS}
          value={values}
          onChange={setValues}
        />
        <p style={{ marginTop: 10 }}>
          <Label tone="faint" style={{ textTransform: 'none' }}>
            {JSON.stringify(values)}
          </Label>
        </p>
      </Frame>
    );
  },
};
