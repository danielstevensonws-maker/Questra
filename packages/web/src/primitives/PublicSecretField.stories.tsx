/**
 * PublicSecretField stories — the public/secret split in its two shapes
 * (single-line for a cast entry, multiline for scene notes). The story shows
 * how each half maps to the contracts visibility it must be emitted with
 * (VISIBILITY_FOR), reinforcing that the split resolves to public vs dm_only.
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PublicSecretField, VISIBILITY_FOR, type PublicSecretValue } from './PublicSecretField.js';

import '../theme/index.css';

const meta: Meta<typeof PublicSecretField> = {
  title: 'Primitives/PublicSecretField',
  component: PublicSecretField,
};
export default meta;
type Story = StoryObj<typeof PublicSecretField>;

function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 520, padding: 24, background: 'var(--q-bg)' }}>{children}</div>;
}

/** A cast member: public name/role everyone sees, a secret motive only the DM sees. */
export const CastEntry: Story = {
  render: () => {
    const [v, setV] = useState<PublicSecretValue>({
      public: 'Sister Aldous, keeper of the almshouse',
      secret: 'Secretly the cult’s paymaster; flips on the party if paid enough.',
    });
    return (
      <Frame>
        <PublicSecretField
          label="Cast member"
          value={v}
          onChange={setV}
          help="The table meets the public face; the truth stays with you."
        />
        <Emitted value={v} />
      </Frame>
    );
  },
};

/** Scene notes: multiline. Public read-aloud + secret DM staging. */
export const SceneNotes: Story = {
  render: () => {
    const [v, setV] = useState<PublicSecretValue>({
      public: 'The market square is quiet, stalls shuttered against the cold.',
      secret: 'Two cutpurses shadow the party from the fountain. Perception DC 13 to notice.',
    });
    return (
      <Frame>
        <PublicSecretField label="Scene notes" value={v} onChange={setV} multiline />
        <Emitted value={v} />
      </Frame>
    );
  },
};

/** Shows the contracts visibility each half is emitted with — the seam to the wire. */
function Emitted({ value }: { value: PublicSecretValue }) {
  return (
    <dl
      style={{
        marginTop: 16,
        fontSize: 'var(--q-text-xs)',
        fontFamily: 'var(--q-font-mono)',
        color: 'var(--q-ink-faint)',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        gap: '2px 10px',
      }}
    >
      <dt>public →</dt>
      <dd style={{ margin: 0 }}>{JSON.stringify(VISIBILITY_FOR.public)}</dd>
      <dt>secret →</dt>
      <dd style={{ margin: 0 }}>{JSON.stringify(VISIBILITY_FOR.secret)}</dd>
    </dl>
  );
}
