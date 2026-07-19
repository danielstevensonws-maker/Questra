/**
 * PublicSecretField stories — the public/secret split in its two shapes
 * (single-line for a cast entry, multiline for scene notes), restyled to the
 * Questra V1 Prototype sheet. The story shows how each half maps to the
 * contracts visibility it must be emitted with (VISIBILITY_FOR), reinforcing
 * that the split resolves to public vs dm_only — and that the gold tint is a
 * reminder, never the filter (which is server-side).
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Label } from '@questra/ui';
import { PublicSecretField, VISIBILITY_FOR, type PublicSecretValue } from './PublicSecretField.js';
import { TableBackdrop } from './TableBackdrop.js';

import '@questra/theme/styles.css';
import '../theme/index.css';

const meta: Meta<typeof PublicSecretField> = {
  title: 'Primitives/PublicSecretField',
  component: PublicSecretField,
  // authoring UI still sits in the product's dark room — judge it there
  decorators: [(Story) => <TableBackdrop height={520} center><Story /></TableBackdrop>],
};
export default meta;
type Story = StoryObj<typeof PublicSecretField>;

function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ width: 380 }}>{children}</div>;
}

/** A cast member: public name/role everyone sees, a secret motive only the DM sees. */
export const CastEntry: Story = {
  render: () => {
    const [v, setV] = useState<PublicSecretValue>({
      public: 'Sister Aldous — kindly almoner',
      secret: "She is the cult's paymaster.",
    });
    return (
      <Frame>
        <PublicSecretField
          label="Cast entry"
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
      public: 'Lantern light spills from the almshouse door, and someone inside is singing.',
      secret: 'Two cutpurses in the loft. Perception DC 13 to hear the floorboard.',
    });
    return (
      <Frame>
        <PublicSecretField label="Scene notes" value={v} onChange={setV} multiline />
        <Emitted value={v} />
      </Frame>
    );
  },
};

/**
 * Empty — both halves at rest, showing the placeholders that state the audience
 * plainly. Focus either half to see the one focus ring (--qa-focus-ring).
 */
export const Empty: Story = {
  render: () => {
    const [v, setV] = useState<PublicSecretValue>({ public: '', secret: '' });
    return (
      <Frame>
        <PublicSecretField label="Location" value={v} onChange={setV} />
        <Emitted value={v} />
      </Frame>
    );
  },
};

/** Shows the contracts visibility each half is emitted with — the seam to the wire. */
function Emitted({ value }: { value: PublicSecretValue }) {
  void value;
  return (
    <dl
      style={{
        margin: '10px 0 0',
        padding: '9px 12px',
        border: '1px solid var(--qa-hairline-soft)',
        borderRadius: 'var(--qa-radius-sm)',
        background: 'var(--qa-ink)',
        display: 'flex',
        flexDirection: 'column',
        gap: 3,
      }}
    >
      <div style={{ display: 'flex', gap: 10 }}>
        <dt><Label tone="faint" style={{ textTransform: 'none' }}>public</Label></dt>
        <dd style={{ margin: 0 }}>
          <Label tone="dim" style={{ textTransform: 'none' }}>
            → {JSON.stringify(VISIBILITY_FOR.public)}
          </Label>
        </dd>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <dt><Label tone="faint" style={{ textTransform: 'none' }}>secret</Label></dt>
        <dd style={{ margin: 0 }}>
          <Label accent="var(--qa-secret)" style={{ textTransform: 'none' }}>
            → {JSON.stringify(VISIBILITY_FOR.secret)}
          </Label>
        </dd>
      </div>
    </dl>
  );
}
