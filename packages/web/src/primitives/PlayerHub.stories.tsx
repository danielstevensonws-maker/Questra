/**
 * Player Hub stories — the §2 tree's primitives, driven by the REAL Torvald
 * fixture (contracts) + a folded projection combatant (engine). Acceptance #1:
 * a Storybook story per component against fixtures, no backend. The view-models
 * come from sheetToPlayerHub, so what renders is exactly what the sync client
 * would feed at the table.
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ComputedSheet } from '@questra/contracts';
import type { Combatant, ProjectionState } from '@questra/engine';

import { VitalsBar } from './VitalsBar.js';
import { ActionBar } from './ActionBar.js';
import { DeathSaveCard } from './DeathSaveCard.js';
import { DiceLog } from './DiceLog.js';
import { PlayerHub } from './PlayerHub.js';
import { toVitals, toActionTiles, type DeathSaveVM } from './sheetToPlayerHub.js';

import torvaldSheet from '@questra/contracts/src/fixtures/torvald-sheet.json';

import '@questra/theme/styles.css';
import '../theme/index.css';

const sheet = torvaldSheet as unknown as ComputedSheet;

// Torvald as a projection combatant (the trace's stated stats).
const torvald: Combatant = {
  id: 'pc-torvald', name: 'Torvald',
  abilities: { str: 16, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
  profBonus: 2, maxHp: 12, hp: 12, tempHp: 0, ac: 18, conditions: [], isPlayer: true,
};
const goblin: Combatant = {
  id: 'npc-goblin-1', name: 'the goblin',
  abilities: { str: 8, dex: 15, con: 10, int: 10, wis: 8, cha: 8 },
  profBonus: 2, maxHp: 10, hp: 10, tempHp: 0, ac: 15, conditions: [], isPlayer: false,
};
const state: ProjectionState = {
  combatants: { 'pc-torvald': torvald, 'npc-goblin-1': goblin },
  round: 1, activeCreatureId: 'pc-torvald', nextSeq: 1,
};

const meta: Meta = { title: 'Play/PlayerHub' };
export default meta;
type Story = StoryObj;

export const Vitals: Story = {
  render: () => <VitalsBar vitals={toVitals(sheet, torvald)} onExplain={(r) => console.log('explain', r)} />,
};

export const VitalsBloodied: Story = {
  render: () => <VitalsBar vitals={toVitals(sheet, { ...torvald, hp: 5, conditions: [{ conditionId: 'condition.prone' }] })} />,
};

export const Actions: Story = {
  render: () => (
    <ActionBar
      tiles={toActionTiles(sheet, torvald, state, 'npc-goblin-1', { activeTurnEnforced: true })}
      onUse={(id) => console.log('use', id)}
      onExplain={(id) => console.log('explain', id)}
    />
  ),
};

export const ActionsGreyed: Story = {
  // it isn't Torvald's turn ⇒ every tile greys with the reject string as its tooltip.
  render: () => (
    <ActionBar
      tiles={toActionTiles(sheet, torvald, { ...state, activeCreatureId: 'npc-goblin-1' }, 'npc-goblin-1', { activeTurnEnforced: true })}
      onUse={(id) => console.log('use', id)}
    />
  ),
};

export const DeathSaves: Story = {
  render: () => {
    const [vm, setVm] = useState<DeathSaveVM>({ successes: 1, failures: 2, phase: 'dying' });
    return <DeathSaveCard state={vm} onRoll={() => setVm((s) => ({ ...s, successes: Math.min(3, s.successes + 1) }))} />;
  },
};

export const Log: Story = {
  render: () => (
    <DiceLog
      entries={[
        { id: '1', tone: 'roll', text: 'Torvald swings his Longsword at the goblin.', breakdown: [{ label: 'd20', value: 14 }, { label: 'STR', value: 3 }, { label: 'Proficiency', value: 2 }], total: 19 },
        { id: '2', tone: 'narration', text: 'A clean hit — 9 slashing. The goblin is barely standing.' },
      ]}
    />
  ),
};

const hubLog = [
  { id: '1', tone: 'narration' as const, text: 'The goblin lunges from the dark.' },
];

export const Hub: Story = {
  render: () => (
    <PlayerHub
      identity={{ name: 'Torvald', level: 1 }}
      vitals={toVitals(sheet, torvald)}
      tiles={toActionTiles(sheet, torvald, state, 'npc-goblin-1', { activeTurnEnforced: true })}
      log={hubLog}
      onUse={(id) => console.log('use', id)}
      onExplain={(r) => console.log('explain', r)}
    />
  ),
};

export const HubDyingFlip: Story = {
  // the hub flips: ActionBar → DeathSaveCard, vitals dim.
  render: () => (
    <PlayerHub
      identity={{ name: 'Torvald', level: 1 }}
      vitals={toVitals(sheet, { ...torvald, hp: 0 })}
      tiles={toActionTiles(sheet, torvald, state, 'npc-goblin-1')}
      log={hubLog}
      dying={{ successes: 1, failures: 2, phase: 'dying' }}
      onUse={(id) => console.log('use', id)}
      onRollDeathSave={() => console.log('death save')}
    />
  ),
};
