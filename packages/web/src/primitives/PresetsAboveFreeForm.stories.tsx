/**
 * PresetsAboveFreeForm stories — the two shapes of the pattern: single-pick
 * (a premise: tap a preset or write your own) and multi-tag (appearance traits:
 * toggle presets and add free-form ones). Both keep the free-form path open, so
 * the presets teach without caging.
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PresetsAboveFreeForm, type Preset } from './PresetsAboveFreeForm.js';

import '../theme/index.css';

const meta: Meta<typeof PresetsAboveFreeForm> = {
  title: 'Primitives/PresetsAboveFreeForm',
  component: PresetsAboveFreeForm,
};
export default meta;
type Story = StoryObj<typeof PresetsAboveFreeForm>;

function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 520, padding: 24, background: 'var(--q-bg)' }}>{children}</div>;
}

const PREMISES: Preset[] = [
  { id: 'heist', label: 'A heist gone wrong' },
  { id: 'haunt', label: 'A haunted frontier town' },
  { id: 'war', label: 'A war on two fronts' },
  { id: 'court', label: 'Intrigue at a fae court' },
];

/** Single-pick — the campaign premise. Picking a chip fills the field; editing frees you. */
export const Premise: Story = {
  render: () => {
    const [value, setValue] = useState('');
    return (
      <Frame>
        <PresetsAboveFreeForm
          label="Campaign premise"
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
  { id: 'scarred', label: 'Scarred' },
  { id: 'weathered', label: 'Weathered' },
  { id: 'regal', label: 'Regal' },
  { id: 'youthful', label: 'Youthful' },
];

/** Multi-tag — appearance traits for a portrait prompt. Toggle presets, add your own with Enter. */
export const AppearanceTraits: Story = {
  render: () => {
    const [values, setValues] = useState<string[]>(['Weathered']);
    return (
      <Frame>
        <PresetsAboveFreeForm
          mode="tags"
          label="Appearance"
          help="Pick a few, or add your own words."
          presets={TRAITS}
          value={values}
          onChange={setValues}
        />
        <p style={{ marginTop: 12, fontSize: 'var(--q-text-xs)', fontFamily: 'var(--q-font-mono)', color: 'var(--q-ink-faint)' }}>
          {JSON.stringify(values)}
        </p>
      </Frame>
    );
  },
};
