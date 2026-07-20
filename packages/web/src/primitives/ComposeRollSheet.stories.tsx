/**
 * ComposeRollSheet stories — the tap-to-roll surface against fixtures, no
 * backend (§5 #1). The "Roll" button here does NOT roll: it hands back a
 * pre-decided fixture `roll_made` body after a short delay, exactly the way the
 * sync client will hand over the server's event in M3.6. The dice you see are
 * the fixture's dice.
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { ComposeRollSheet } from './ComposeRollSheet.js';
import { TableBackdrop } from './TableBackdrop.js';
import type { ComposeDraftVM, ComposeSubjectVM, RollResultVM } from './sheetToPlayerHub.js';

import '@questra/theme/styles.css';
import '../theme/index.css';

/** Torvald's longsword swing at the goblin — the trace's opening attack. */
const subject: ComposeSubjectVM = {
  tileId: 'attack.Longsword',
  name: 'Longsword',
  kind: 'attack_roll',
  modifiers: [{ label: 'STR', value: 3 }, { label: 'Proficiency', value: 2 }],
  vs: { type: 'ac', value: 15 },
  targetName: 'the goblin',
};

/** Fixture server answers — what `roll_made` will carry off the wire. */
const HIT: RollResultVM = {
  rollId: 'roll-1', kind: 'attack_roll', d20: 14, secondD20: 6, collapsed: 'advantage',
  modifiers: subject.modifiers, total: 19, vs: { type: 'ac', value: 15 }, outcome: 'hit', entry: 'server',
};
const MISS: RollResultVM = {
  rollId: 'roll-2', kind: 'attack_roll', d20: 4, collapsed: 'straight',
  modifiers: subject.modifiers, total: 9, vs: { type: 'ac', value: 15 }, outcome: 'miss', entry: 'server',
};
const CRIT: RollResultVM = {
  rollId: 'roll-3', kind: 'attack_roll', d20: 20, collapsed: 'straight',
  modifiers: subject.modifiers, total: 25, vs: { type: 'ac', value: 15 }, outcome: 'crit', entry: 'server',
};

const meta: Meta<typeof ComposeRollSheet> = {
  title: 'Primitives/ComposeRollSheet',
  component: ComposeRollSheet,
  // glass is judged over the map, never on a flat canvas
  decorators: [(Story) => <TableBackdrop height={520} center><Story /></TableBackdrop>],
};
export default meta;
type Story = StoryObj<typeof ComposeRollSheet>;

/** The full loop: compose → commit → the fixture result arrives → the die settles. */
function Harness({ answer }: { answer: RollResultVM }): React.ReactElement {
  const [draft, setDraft] = useState<ComposeDraftVM>({ tileId: subject.tileId, position: 'straight', situational: 0 });
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<RollResultVM | undefined>(undefined);

  const reset = (): void => { setResult(undefined); setPending(false); };

  return (
    <div style={{ width: 420 }}>
      <ComposeRollSheet
        subject={subject}
        draft={draft}
        onDraftChange={setDraft}
        pending={pending}
        result={result}
        // stands in for "intent sent, server rolled, roll_made came back"
        onCommit={() => { setPending(true); setTimeout(() => setResult(answer), 400); }}
        onCancel={reset}
        onSettled={() => {}}
      />
      {result && (
        <button type="button" onClick={reset} style={{ marginTop: 12, fontSize: 12, opacity: 0.7 }}>
          ↺ compose again
        </button>
      )}
    </div>
  );
}

export const Compose: Story = { render: () => <Harness answer={HIT} /> };

/** Server rolled with advantage and kept the 14 — the 6 is named as dropped. */
export const HitWithAdvantage: Story = {
  render: () => {
    const [draft, setDraft] = useState<ComposeDraftVM>({ tileId: subject.tileId, position: 'advantage', situational: 0 });
    return (
      <div style={{ width: 420 }}>
        <ComposeRollSheet subject={subject} draft={draft} onDraftChange={setDraft}
          onCommit={() => {}} onCancel={() => {}} result={HIT} />
      </div>
    );
  },
};

export const Miss: Story = { render: () => <Harness answer={MISS} /> };
export const CriticalHit: Story = { render: () => <Harness answer={CRIT} /> };

/** Physical dice entered by hand — same surface, flagged (ADR-0008). */
export const EnteredByHand: Story = {
  render: () => {
    const [draft, setDraft] = useState<ComposeDraftVM>({ tileId: subject.tileId, position: 'straight', situational: 0 });
    return (
      <div style={{ width: 420 }}>
        <ComposeRollSheet subject={subject} draft={draft} onDraftChange={setDraft}
          onCommit={() => {}} onCancel={() => {}} result={{ ...HIT, entry: 'manual' }} />
      </div>
    );
  },
};
