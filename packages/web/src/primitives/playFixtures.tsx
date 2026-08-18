/**
 * Shared Storybook fixtures for the §2 Play primitives — the REAL Torvald
 * fixture (contracts) + a folded projection combatant (engine), plus the
 * backdrops every story floats over. Not a `.stories.tsx` file on purpose:
 * Storybook only picks up story files by that suffix, so this can be a
 * plain module every `*.stories.tsx` imports without becoming its own
 * sidebar entry.
 */
import type { ReactNode } from 'react';
import type { ComputedSheet } from '@questra/contracts';
import type { Combatant, ProjectionState } from '@questra/engine';
import type { DiceLogEntry } from './DiceLog.js';
import type { InventoryLineVM } from './PlayerMenu.js';

import torvaldSheet from '@questra/contracts/src/fixtures/torvald-sheet.json';

export const sheet = torvaldSheet as unknown as ComputedSheet;

export const torvald: Combatant = {
  id: 'pc-torvald', name: 'Torvald',
  abilities: { str: 16, dex: 13, con: 14, int: 8, wis: 12, cha: 10 },
  profBonus: 2, maxHp: 12, hp: 12, tempHp: 0, ac: 18, conditions: [], isPlayer: true,
};
export const goblin: Combatant = {
  id: 'npc-goblin-1', name: 'the goblin',
  abilities: { str: 8, dex: 15, con: 10, int: 10, wis: 8, cha: 8 },
  profBonus: 2, maxHp: 10, hp: 10, tempHp: 0, ac: 15, conditions: [], isPlayer: false,
};
export const state: ProjectionState = {
  combatants: { 'pc-torvald': torvald, 'npc-goblin-1': goblin },
  round: 1, activeCreatureId: 'pc-torvald', nextSeq: 1,
};

/** The battle-map ground every primitive's isolated story floats over — glass panels read as cut paper without it. */
export function Ground({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: 640,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: 48,
        background: 'radial-gradient(120% 90% at 56% 30%, var(--qa-map-hi) 0%, var(--qa-map-mid) 44%, var(--qa-map-lo) 100%)',
      }}
    >
      {children}
    </div>
  );
}

/** Docks flush against the right edge at genuine full viewport height — matching "LOG OPEN.PNG"/"LOG CLOSED.PNG", not a floating box. */
export function FullHeightScreen({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'radial-gradient(120% 90% at 56% 30%, var(--qa-map-hi) 0%, var(--qa-map-mid) 44%, var(--qa-map-lo) 100%)',
      }}
    >
      {children}
    </div>
  );
}

/** The mixed feed: plain narration/chat/system lines, and an embedded ruling suggestion with its own actions. */
export const NOTES = {
  title: 'The Ruined Steading — your notes',
  lines: [
    'Snick the lookout bolts when bloodied — straight for the barn.',
    'The well hides a cellar hatch, barred from below.',
    "Bram the farmer is tied up in the loft — he'll shout a warning.",
  ],
};

export const LOG_ENTRIES: DiceLogEntry[] = [
  { id: '1', tone: 'narration', actor: 'Engine', text: 'Torvald hits Goblin skirmisher — 8 slashing. It is bloodied.' },
  { id: '2', tone: 'narration', actor: 'Engine', text: 'Goblin lookout misses Mira (rolled 9 vs AC 16).' },
  { id: '3', tone: 'chat', actor: 'Wren', text: 'Wren declared an improvised action — see suggestion below.' },
  {
    id: '4',
    tone: 'suggestion',
    actor: 'Ruling Suggestion',
    text: 'I want to swing on the well-rope and drop on the lookout.',
    outcome: "Suggested: DEX (Acrobatics) · DC 13 — on a fail, she lands prone in the goblin's square.",
    actions: [
      { label: 'Ask for the roll', onClick: () => console.log('ask for the roll') },
      { label: 'Change it', onClick: () => console.log('change it') },
      { label: 'No roll', onClick: () => console.log('no roll') },
    ],
  },
];

/** Sample carried gear matching Torvald's fixture equipment — a stand-in until @questra/contracts grows a real Item catalog (see PlayerMenu.tsx). */
export const TORVALD_INVENTORY: InventoryLineVM[] = [
  { id: 'item.chain-mail', name: 'Chain Mail', note: 'Worn' },
  { id: 'item.shield', name: 'Shield', note: 'Worn' },
  { id: 'item.dagger', name: 'Dagger', qty: 2 },
  { id: 'item.explorers-pack', name: "Explorer's Pack" },
  { id: 'item.torch', name: 'Torch', qty: 5 },
];
