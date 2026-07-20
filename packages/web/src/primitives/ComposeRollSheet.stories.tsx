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
import { DiceTray } from './DiceTray.js';
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
  // glass + dice are judged over the map, never on a flat canvas
  decorators: [(Story) => <TableBackdrop height={520}><Story /></TableBackdrop>],
};
export default meta;
type Story = StoryObj<typeof ComposeRollSheet>;

/**
 * The full loop as it will run at the table: compose in the panel → commit →
 * the fixture `roll_made` arrives → the 3D dice tumble ON THE MAP (DiceTray) →
 * the tray's `dice-settled` flips the panel to its verdict. No die in the panel.
 */
function Harness({ answer }: { answer: RollResultVM }): React.ReactElement {
  const [draft, setDraft] = useState<ComposeDraftVM>({ tileId: subject.tileId, position: 'straight', situational: 0 });
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<RollResultVM | undefined>(undefined);
  const [settled, setSettled] = useState(false);

  const reset = (): void => { setResult(undefined); setSettled(false); setPending(false); };

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      {/* the dice roll on the map, filling the stage behind the panel */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <DiceTray result={result} onSettled={() => setSettled(true)} />
      </div>

      {/* the compose panel — self-contained, floated CENTERED over the map */}
      <div
        style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 12, pointerEvents: 'none',
        }}
      >
        <div style={{ pointerEvents: 'auto' }}>
          <ComposeRollSheet
            subject={subject}
            draft={draft}
            onDraftChange={setDraft}
            pending={pending}
            result={result}
            settled={settled}
            // stands in for "intent sent, server rolled, roll_made came back"
            onCommit={() => { setPending(true); setTimeout(() => setResult(answer), 300); }}
            onCancel={reset}
          />
        </div>
        {result && (
          <button type="button" onClick={reset}
            style={{ pointerEvents: 'auto', fontSize: 12, opacity: 0.7, background: 'none', border: 'none', color: 'var(--qa-glass-dim)', cursor: 'pointer' }}>
            ↺ compose again
          </button>
        )}
      </div>
    </div>
  );
}

export const Compose: Story = { render: () => <Harness answer={HIT} /> };
export const HitWithAdvantage: Story = { render: () => <Harness answer={HIT} /> };
export const Miss: Story = { render: () => <Harness answer={MISS} /> };
export const CriticalHit: Story = { render: () => <Harness answer={CRIT} /> };
export const EnteredByHand: Story = { render: () => <Harness answer={{ ...HIT, entry: 'manual' }} /> };
