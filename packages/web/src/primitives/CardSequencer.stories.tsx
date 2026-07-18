/**
 * CardSequencer stories — reordering scenes in a session and sessions in a
 * campaign (the two canonical uses). State lives in the harness so the reorder
 * and remove controls are exercised live. Labels stay plain-language: scenes
 * and sessions, never beats or nodes.
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { CardSequencer, type SequenceItem } from './CardSequencer.js';

import '../theme/index.css';

const meta: Meta<typeof CardSequencer> = {
  title: 'Primitives/CardSequencer',
  component: CardSequencer,
};
export default meta;
type Story = StoryObj<typeof CardSequencer>;

function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 560, padding: 24, background: 'var(--q-bg)' }}>{children}</div>;
}

interface Scene {
  id: string;
  title: string;
  note: string;
}

function SceneCard({ scene }: { scene: Scene }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--q-font-display)', fontSize: 'var(--q-text-lg)', color: 'var(--q-ink)' }}>{scene.title}</div>
      <div style={{ fontSize: 'var(--q-text-sm)', color: 'var(--q-ink-soft)' }}>{scene.note}</div>
    </div>
  );
}

const START: Scene[] = [
  { id: 's1', title: 'The shuttered market', note: 'Social — the party arrives at dusk.' },
  { id: 's2', title: 'Ambush at the fountain', note: 'Combat — two cutpurses, a Goblin Warrior.' },
  { id: 's3', title: 'The almshouse door', note: 'Investigation — Sister Aldous stalls them.' },
  { id: 's4', title: 'Down into the vault', note: 'Exploration — the sunless descent.' },
];

/** Scenes in a session — reorder with the up/down controls or drag. */
export const ScenesInASession: Story = {
  render: () => {
    const [scenes, setScenes] = useState<Scene[]>(START);
    const items: SequenceItem[] = scenes.map((s) => ({ id: s.id, render: <SceneCard scene={s} /> }));
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

/** Sessions in a campaign — same primitive, different noun. */
export const SessionsInACampaign: Story = {
  render: () => {
    const [sessions, setSessions] = useState<Scene[]>([
      { id: 'e1', title: 'Session 1 — The summons', note: 'The letter from Ambergate.' },
      { id: 'e2', title: 'Session 2 — The long road', note: 'Wilderness travel, a first fight.' },
      { id: 'e3', title: 'Session 3 — The vault', note: 'The dungeon proper.' },
    ]);
    const items: SequenceItem[] = sessions.map((s) => ({ id: s.id, render: <SceneCard scene={s} /> }));
    return (
      <Frame>
        <CardSequencer itemNoun="sessions" items={items} onReorder={(ids) => setSessions(ids.map((id) => sessions.find((s) => s.id === id)!))} />
      </Frame>
    );
  },
};
