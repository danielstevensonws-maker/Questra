/**
 * Player Hub stories — the §2 tree's primitives, driven by the REAL Torvald
 * fixture (contracts) + a folded projection combatant (engine), restyled to the
 * Questra V1 Prototype sheet. Acceptance #1: a Storybook story per component
 * against fixtures, no backend. The view-models come from sheetToPlayerHub, so
 * what renders is exactly what the sync client would feed at the table.
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { Panel } from '@questra/ui';
import type { ComputedSheet, Room } from '@questra/contracts';
import type { Combatant, ProjectionState } from '@questra/engine';
import { TableBackdrop } from './TableBackdrop.js';

import { VitalsBar } from './VitalsBar.js';
import { ActionBar } from './ActionBar.js';
import { DeathSaveCard } from './DeathSaveCard.js';
import { DiceLog } from './DiceLog.js';
import { PlayerHub } from './PlayerHub.js';
import { ComposeRollSheet } from './ComposeRollSheet.js';
import { DiceTray } from './DiceTray.js';
import {
  toVitals, toActionTiles,
  type DeathSaveVM, type ComposeDraftVM, type ComposeSubjectVM, type RollResultVM,
} from './sheetToPlayerHub.js';

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

/** The identity block — Fighter, so the avatar takes the fighter class tint. */
const identity = {
  name: 'Torvald Ironoath',
  level: 3,
  className: 'Fighter',
  classColor: 'var(--qa-class-fighter)',
};

/**
 * The room under the HUD. The design's panels are glass meant to float over the
 * map — on a flat canvas they read as washed out, so every story here is staged
 * over the real MapCanvas. Judge the glass here, not in isolation.
 */
const room: Room = {
  id: 'yard',
  terrainImageRef: 'terrain/yard',
  gridSize: { w: 10, h: 7 },
  cellTags: {},
  revealed: Array.from({ length: 10 }, (_, x) => Array.from({ length: 7 }, (_, y) => `${x},${y}`)).flat(),
  assets: [],
  tokens: [
    { id: 't-torvald', creatureRef: 'pc-torvald', cell: { x: 3, y: 3 }, size: 'medium', hidden: false, staged: false },
    { id: 't-goblin', creatureRef: 'npc-goblin-1', cell: { x: 5, y: 2 }, size: 'small', hidden: false, staged: false },
  ],
};

const meta: Meta = {
  title: 'Play/PlayerHub',
  // every story sits over the map, in the dark, with the design's atmosphere
  decorators: [(Story) => <TableBackdrop room={room}><Story /></TableBackdrop>],
};
export default meta;
type Story = StoryObj;

/** Leaf components are shown inside a Panel — the shell the hub gives them. */
function Section({ children, width = 330 }: { children: React.ReactNode; width?: number }) {
  return (
    <Panel style={{ width, padding: '11px 13px', gap: 8 }}>
      {children}
    </Panel>
  );
}

export const Vitals: Story = {
  render: () => (
    <Section>
      <VitalsBar vitals={toVitals(sheet, torvald)} onExplain={(r) => console.log('explain', r)} />
    </Section>
  ),
};

export const VitalsBloodied: Story = {
  render: () => (
    <Section>
      <VitalsBar
        vitals={toVitals(sheet, { ...torvald, hp: 5, conditions: [{ conditionId: 'condition.prone' }] })}
        onExplain={(r) => console.log('explain', r)}
      />
    </Section>
  ),
};

/** Temporary hit points read in heal-green beneath the bar. */
export const VitalsTemporaryHp: Story = {
  render: () => (
    <Section>
      <VitalsBar vitals={toVitals(sheet, { ...torvald, tempHp: 4 })} />
    </Section>
  ),
};

export const Actions: Story = {
  render: () => (
    <Section width={344}>
      <ActionBar
        tiles={toActionTiles(sheet, torvald, state, 'npc-goblin-1', { activeTurnEnforced: true })}
        onUse={(id) => console.log('use', id)}
        onExplain={(id) => console.log('explain', id)}
      />
    </Section>
  ),
};

export const ActionsGreyed: Story = {
  // it isn't Torvald's turn ⇒ every tile greys and prints the reject sentence.
  render: () => (
    <Section width={344}>
      <ActionBar
        tiles={toActionTiles(sheet, torvald, { ...state, activeCreatureId: 'npc-goblin-1' }, 'npc-goblin-1', { activeTurnEnforced: true })}
        onUse={(id) => console.log('use', id)}
      />
    </Section>
  ),
};

/**
 * Economy spent — the Action dot goes hollow once used, and the Reaction row
 * stays visible even with no live reaction tile (its dot still reads
 * available). The empty economy tells the player it exists.
 */
export const ActionsSpent: Story = {
  render: () => (
    <Section width={344}>
      <ActionBar
        tiles={toActionTiles(sheet, torvald, state, 'npc-goblin-1', { activeTurnEnforced: true })}
        onUse={(id) => console.log('use', id)}
        onExplain={(id) => console.log('explain', id)}
        spent={{ action: true }}
      />
    </Section>
  ),
};

export const DeathSaves: Story = {
  render: () => {
    const [vm, setVm] = useState<DeathSaveVM>({ successes: 1, failures: 2, phase: 'dying' });
    return (
      <div style={{ width: 280 }}>
        <DeathSaveCard state={vm} onRoll={() => setVm((s) => ({ ...s, successes: Math.min(3, s.successes + 1) }))} />
      </div>
    );
  },
};

/** The other three phases — each says what it means in a plain sentence. */
export const DeathSavePhases: Story = {
  render: () => (
    <div style={{ width: 280, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <DeathSaveCard state={{ successes: 3, failures: 1, phase: 'stable' }} onRoll={() => {}} />
      <DeathSaveCard state={{ successes: 1, failures: 3, phase: 'dead' }} onRoll={() => {}} />
      <DeathSaveCard state={{ successes: 0, failures: 0, phase: 'up' }} onRoll={() => {}} />
    </div>
  ),
};

export const Log: Story = {
  render: () => (
    <Panel label="TABLE LOG" style={{ width: 344, gap: 0 }}>
      <DiceLog
        entries={[
          { id: '1', tone: 'roll', text: 'Torvald swings the longsword at the goblin.', breakdown: [{ label: 'd20', value: 14 }, { label: 'STR', value: 3 }, { label: 'Proficiency', value: 2 }], total: 19 },
          { id: '2', tone: 'narration', text: 'The blade bites deep — the goblin staggers back against the tomb.' },
          { id: '3', tone: 'system', text: 'Wren joined the table' },
        ]}
      />
    </Panel>
  ),
};

/** Before the first roll lands. */
export const LogEmpty: Story = {
  render: () => (
    <Panel label="TABLE LOG" style={{ width: 344, gap: 0 }}>
      <DiceLog entries={[]} />
    </Panel>
  ),
};

const hubLog = [
  { id: '1', tone: 'roll' as const, text: 'Torvald swings the longsword at the goblin.', breakdown: [{ label: 'd20', value: 14 }, { label: 'STR', value: 3 }, { label: 'Proficiency', value: 2 }], total: 19 },
  { id: '2', tone: 'narration' as const, text: 'The blade bites deep — the goblin staggers back against the tomb.' },
];

export const Hub: Story = {
  render: () => (
    <PlayerHub
      identity={identity}
      vitals={toVitals(sheet, torvald)}
      tiles={toActionTiles(sheet, torvald, state, 'npc-goblin-1', { activeTurnEnforced: true })}
      log={hubLog}
      onUse={(id) => console.log('use', id)}
      onExplain={(r) => console.log('explain', r)}
    />
  ),
};

export const HubDyingFlip: Story = {
  // the hub flips: ActionBar → DeathSaveCard, vitals dim to 45%.
  render: () => (
    <PlayerHub
      identity={identity}
      vitals={toVitals(sheet, { ...torvald, hp: 0 })}
      tiles={toActionTiles(sheet, torvald, state, 'npc-goblin-1')}
      log={[{ id: '1', tone: 'narration', text: 'Torvald falls. The goblin turns toward Wren.' }]}
      dying={{ successes: 1, failures: 2, phase: 'dying' }}
      onUse={(id) => console.log('use', id)}
      onRollDeathSave={() => console.log('death save')}
    />
  ),
};

/**
 * THE REVIEW STORY — the whole surface at once, over the map.
 *
 * Every hub primitive on screen together, in the design's real context: the
 * identity header, vitals, the action tiles with a greyed one, the dice log, and
 * the compose sheet mid-roll. This is the story to judge composition from —
 * which components hold up wearing the right tokens and which are structurally
 * wrong — rather than inferring it from isolated parts.
 */
export const HubComposedReview: Story = {
  render: function Review() {
    const [draft, setDraft] = useState<ComposeDraftVM>({
      tileId: 'attack.Longsword', position: 'straight', situational: 0,
    });
    const [result, setResult] = useState<RollResultVM | undefined>(undefined);
    const [settled, setSettled] = useState(false);
    const [pending, setPending] = useState(false);

    const subject: ComposeSubjectVM = {
      tileId: 'attack.Longsword', name: 'Longsword', kind: 'attack_roll',
      modifiers: [{ label: 'STR', value: 3 }, { label: 'Proficiency', value: 2 }],
      vs: { type: 'ac', value: 15 }, targetName: 'the goblin',
    };

    return (
      <>
        {/* the dice roll on the map behind everything */}
        <div style={{ position: 'absolute', inset: 0 }}>
          <DiceTray result={result} onSettled={() => setSettled(true)} />
        </div>

        <div style={{ position: 'relative', display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap', maxWidth: '100%' }}>
          <PlayerHub
            identity={identity}
            vitals={toVitals(sheet, { ...torvald, hp: 6, conditions: [{ conditionId: 'condition.prone' }] })}
            tiles={toActionTiles(sheet, torvald, state, 'npc-goblin-1', { activeTurnEnforced: true })}
            log={hubLog}
            onUse={() => {}}
            onExplain={() => {}}
          />

          <div style={{ flex: 'none' }}>
            <ComposeRollSheet
              subject={subject}
              draft={draft}
              onDraftChange={setDraft}
              pending={pending}
              result={result}
              settled={settled}
              onCommit={() => {
                setSettled(false);
                setPending(true);
                setTimeout(() => setResult({
                  rollId: 'roll-review', kind: 'attack_roll', d20: 14, secondD20: 6,
                  collapsed: 'advantage', modifiers: subject.modifiers, total: 19,
                  vs: { type: 'ac', value: 15 }, outcome: 'hit', entry: 'server',
                }), 300);
              }}
              onCancel={() => { setResult(undefined); setSettled(false); setPending(false); }}
            />
          </div>
        </div>
      </>
    );
  },
};
