/**
 * CardSequencer stories — reordering scenes in a session and sessions in a
 * campaign (the two canonical uses), restyled to the Questra V1 Prototype sheet.
 * State lives in the harness so the reorder and remove controls are exercised
 * live. Labels stay plain-language: scenes and sessions, never beats or nodes.
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CardSequencer, type SequenceItem } from './CardSequencer.js';

import '@questra/theme/styles.css';
import '../theme/index.css';

const meta: Meta<typeof CardSequencer> = {
  title: 'Primitives/CardSequencer',
  component: CardSequencer,
};
export default meta;
type Story = StoryObj<typeof CardSequencer>;

function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 560, padding: 24, background: 'var(--qa-ink)' }}>{children}</div>;
}

interface Row {
  id: string;
  title: string;
  note: string;
}

function RowCard({ row }: { row: Row }) {
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--qa-vellum)' }}>{row.title}</span>
      <span style={{ fontSize: 11, color: 'var(--qa-vellum-dim)' }}>{row.note}</span>
    </span>
  );
}

const START: Row[] = [
  { id: 's1', title: 'The night market', note: 'Meet the fence, hear the rumor' },
  { id: 's2', title: 'Ambush in the alley', note: 'Two cutpurses, Perception DC 13' },
  { id: 's3', title: 'The almshouse', note: 'Sister Aldous, and the ledger' },
  { id: 's4', title: 'The vault', note: 'The tomb, the trap, the goblin boss' },
];

/** Scenes in a session — reorder with the up/down controls or drag; remove enabled. */
export const ScenesInASession: Story = {
  render: () => {
    const [scenes, setScenes] = useState<Row[]>(START);
    const items: SequenceItem[] = scenes.map((s) => ({ id: s.id, render: <RowCard row={s} /> }));
    return (
      <Frame>
        <CardSequencer
          itemNoun="scenes"
          items={items}
          onReorder={(ids) => setScenes(ids.map((id) => scenes.find((s) => s.id === id)!))}
          onRemove={(id) => setScenes(scenes.filter((s) => s.id !== id))}
        />
      </Frame>
    );
  },
};

/** Sessions in a campaign — same primitive, different noun, no remove. */
export const SessionsInACampaign: Story = {
  render: () => {
    const [sessions, setSessions] = useState<Row[]>([
      { id: 'e1', title: 'The Broken Crown', note: 'Session one — played June 30' },
      { id: 'e2', title: "The Paymaster's Ledger", note: 'Session two — next up' },
    ]);
    const items: SequenceItem[] = sessions.map((s) => ({ id: s.id, render: <RowCard row={s} /> }));
    return (
      <Frame>
        <CardSequencer
          itemNoun="sessions"
          items={items}
          onReorder={(ids) => setSessions(ids.map((id) => sessions.find((s) => s.id === id)!))}
        />
      </Frame>
    );
  },
};

/** Empty — a fresh session with no scenes; the dashed prompt to add the first. */
export const Empty: Story = {
  render: () => (
    <Frame>
      <CardSequencer
        itemNoun="scenes"
        items={[]}
        onReorder={() => {}}
        emptyLabel="No scenes yet. Add the first one, or pull a spark from the campaign."
      />
    </Frame>
  ),
};
