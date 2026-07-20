/**
 * DiceTray stories — the 3D dice over the map, against fixtures (§5 #1).
 *
 * "Roll" here does NOT roll: it hands the tray a pre-decided fixture `roll_made`
 * body, exactly as the sync client will in M3.6. The dice you see land on the
 * fixture's numbers (ADR-0008). three.js loads lazily on the first roll.
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';

import { DiceTray } from './DiceTray.js';
import { TableBackdrop } from './TableBackdrop.js';
import type { RollResultVM } from './sheetToPlayerHub.js';

import '@questra/theme/styles.css';
import '../theme/index.css';

const MODS = [{ label: 'STR', value: 3 }, { label: 'Proficiency', value: 2 }];

const HIT: RollResultVM = {
  rollId: 'r-hit', kind: 'attack_roll', d20: 14, secondD20: 6, collapsed: 'advantage',
  modifiers: MODS, total: 19, vs: { type: 'ac', value: 15 }, outcome: 'hit', entry: 'server',
};
const MISS: RollResultVM = {
  rollId: 'r-miss', kind: 'attack_roll', d20: 4, collapsed: 'straight',
  modifiers: MODS, total: 9, vs: { type: 'ac', value: 15 }, outcome: 'miss', entry: 'server',
};
const CRIT: RollResultVM = {
  rollId: 'r-crit', kind: 'attack_roll', d20: 20, collapsed: 'straight',
  modifiers: MODS, total: 25, vs: { type: 'ac', value: 15 }, outcome: 'crit', entry: 'server',
};
const FUMBLE: RollResultVM = {
  rollId: 'r-fumble', kind: 'attack_roll', d20: 1, collapsed: 'straight',
  modifiers: MODS, total: 6, vs: { type: 'ac', value: 15 }, outcome: 'fumble', entry: 'server',
};

const meta: Meta<typeof DiceTray> = {
  title: 'Primitives/DiceTray',
  component: DiceTray,
  decorators: [(Story) => <TableBackdrop height={420}><Story /></TableBackdrop>],
};
export default meta;
type Story = StoryObj<typeof DiceTray>;

/** Roll a fixture answer, then reset — stands in for the server round-trip. */
function Harness({ answer, still }: { answer: RollResultVM; still?: boolean }): React.ReactElement {
  const [result, setResult] = useState<RollResultVM | undefined>(undefined);
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, minHeight: 0 }}>
        <DiceTray result={result} still={still ?? false} />
      </div>
      <div style={{ display: 'flex', gap: 8, padding: 12, justifyContent: 'center' }}>
        <button type="button" onClick={() => { setResult(undefined); setTimeout(() => setResult(answer), 20); }}
          style={{ fontFamily: 'var(--qa-font-mono)', fontSize: 11, padding: '6px 14px', borderRadius: 4,
            background: 'var(--qa-glass-chip)', border: '1px solid var(--qa-glass-border)', color: 'var(--qa-glass-text)', cursor: 'pointer' }}>
          Roll
        </button>
        <button type="button" onClick={() => setResult(undefined)}
          style={{ fontFamily: 'var(--qa-font-mono)', fontSize: 11, padding: '6px 14px', borderRadius: 4,
            background: 'transparent', border: '1px solid var(--qa-glass-border)', color: 'var(--qa-glass-dim)', cursor: 'pointer' }}>
          Clear
        </button>
      </div>
    </div>
  );
}

/** A straight d20 — the common case (a check or save). */
export const Roll: Story = { render: () => <Harness answer={MISS} /> };

/** Advantage: two d20s, keeps the 14, the 6 darkens and slides aside. */
export const Advantage: Story = { render: () => <Harness answer={HIT} /> };

/** Natural 20 — the ember lives inside the die. */
export const CriticalHit: Story = { render: () => <Harness answer={CRIT} /> };

/** Natural 1 — the die goes cold. */
export const Fumble: Story = { render: () => <Harness answer={FUMBLE} /> };

/** Reduced motion: the die lands pre-settled, no tumble — same information. */
export const ReducedMotion: Story = { render: () => <Harness answer={HIT} still /> };
