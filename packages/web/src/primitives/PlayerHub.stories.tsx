/**
 * PlayerHub composition stories.
 *
 * The hub is ONE frame now, not three floating cards: it owns the identity,
 * action and stats bays itself, plus the turn strip along its top edge. So
 * `StatBar` is passed IN (as the `stats` prop) rather than placed beside the
 * hub as a sibling — that's what lets the three bays share a border, a radius
 * and a padding scale instead of each inventing their own.
 *
 * `FullBottomBar` is the story to judge from: hub + scene header + log, over
 * the map, which is what actually ships together on "Desktop - 1".
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { PlayerHub } from './PlayerHub.js';
import { SceneHeader } from './SceneHeader.js';
import { PlayerMenu, type PlayerMenuTab } from './PlayerMenu.js';
import { DiceLog } from './DiceLog.js';
import { toVitals, toActionTiles, toStats, toSaves, toPassives, toSkills, toReadiness, fmtCoins } from './sheetToPlayerHub.js';
import { sheet, torvald, state, Ground, LOG_ENTRIES, NOTES, TORVALD_INVENTORY } from './playFixtures.js';

const meta: Meta = { title: 'Play/PlayerHub', parameters: { layout: 'fullscreen' } };
export default meta;
type Story = StoryObj;

const IDENTITY = { name: 'Torvald', level: 3, className: 'Fighter' };

const TARGETS = [
  { id: 'npc-goblin-1', name: 'skirmisher', selected: true },
  { id: 'npc-goblin-2', name: 'lookout', selected: false },
];

const MAP_GROUND = 'radial-gradient(120% 90% at 56% 30%, var(--qa-map-hi) 0%, var(--qa-map-mid) 44%, var(--qa-map-lo) 100%)';

/** The whole player screen: scene header top, hub docked bottom, log down the right edge. */
export const FullBottomBar: Story = {
  render: function FullBottomBarStory() {
    const [menu, setMenu] = useState<{ open: boolean; tab?: PlayerMenuTab | undefined }>({ open: false });
    return (
      <div style={{ position: 'relative', height: '100vh', background: MAP_GROUND }}>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'flex-end' }}>
          <DiceLog entries={LOG_ENTRIES} notes={NOTES} pendingCount={1} onSend={(text) => console.log('send', text)} />
        </div>

        <div style={{ position: 'absolute', top: 24, left: 24, right: 380, display: 'flex', justifyContent: 'center' }}>
          <SceneHeader title="The Ruined Steading" subtitle="Outskirts · Dusk" round={3} turn={{ name: 'Torvald', isYou: true }} elapsed="01:42:33" />
        </div>

        <div style={{ position: 'absolute', left: 24, right: 380, bottom: 24 }}>
          <PlayerHub
            identity={IDENTITY}
            vitals={toVitals(sheet, torvald)}
            readiness={toReadiness(sheet)}
            stats={toStats(sheet)}
            turn={{ active: true, targets: TARGETS, movement: { left: 15, max: 30 } }}
            tiles={toActionTiles(sheet, torvald, state, 'npc-goblin-1', { activeTurnEnforced: true })}
            onUse={(id) => console.log('use', id)}
            onExplain={(r) => console.log('explain', r)}
            onEquip={(economy) => console.log('equip', economy)}
            onTarget={(id) => console.log('target', id)}
            onOpenMenu={(tab) => setMenu({ open: true, tab })}
          />
        </div>

        <PlayerMenu
          open={menu.open}
          onClose={() => setMenu({ open: false })}
          {...(menu.tab !== undefined ? { initialTab: menu.tab } : {})}
          identity={IDENTITY}
          vitals={toVitals(sheet, torvald)}
          stats={toStats(sheet)}
          saves={toSaves(sheet)}
          passives={toPassives(sheet)}
          skills={toSkills(sheet)}
          coins={fmtCoins(sheet.coins)}
          inventory={TORVALD_INVENTORY}
          onExplain={(r) => console.log('explain', r)}
        />
      </div>
    );
  },
};

/** Someone else's turn — the badge names them, the strip quiets, every tile greys with the server's reason. */
export const Waiting: Story = {
  render: () => (
    <Ground>
      <div style={{ width: 1080 }}>
        <PlayerHub
          identity={IDENTITY}
          vitals={toVitals(sheet, torvald)}
          readiness={toReadiness(sheet)}
          stats={toStats(sheet)}
          turn={{ active: false, activeName: 'the goblin', targets: TARGETS, movement: { left: 0, max: 30 } }}
          tiles={toActionTiles(sheet, torvald, { ...state, activeCreatureId: 'npc-goblin-1' }, 'npc-goblin-1', { activeTurnEnforced: true })}
          onUse={(id) => console.log('use', id)}
          onExplain={(r) => console.log('explain', r)}
          onEquip={(economy) => console.log('equip', economy)}
        />
      </div>
    </Ground>
  ),
};

/** Click Torvald's portrait to open the menu on Stats, or "Carrying" to open it straight to Inventory. */
export const HubWithMenu: Story = {
  render: function HubWithMenuStory() {
    const [menu, setMenu] = useState<{ open: boolean; tab?: PlayerMenuTab | undefined }>({ open: false });
    return (
      <div style={{ position: 'relative', minHeight: 640 }}>
        <Ground>
          <div style={{ width: 1080 }}>
            <PlayerHub
              identity={IDENTITY}
              vitals={toVitals(sheet, torvald)}
              readiness={toReadiness(sheet)}
              stats={toStats(sheet)}
              turn={{ active: true, targets: TARGETS, movement: { left: 15, max: 30 } }}
              tiles={toActionTiles(sheet, torvald, state, 'npc-goblin-1', { activeTurnEnforced: true })}
              onUse={(id) => console.log('use', id)}
              onExplain={(r) => console.log('explain', r)}
              onEquip={(economy) => console.log('equip', economy)}
              onOpenMenu={(tab) => setMenu({ open: true, tab })}
            />
          </div>
        </Ground>
        <PlayerMenu
          open={menu.open}
          onClose={() => setMenu({ open: false })}
          {...(menu.tab !== undefined ? { initialTab: menu.tab } : {})}
          identity={IDENTITY}
          vitals={toVitals(sheet, torvald)}
          stats={toStats(sheet)}
          saves={toSaves(sheet)}
          passives={toPassives(sheet)}
          skills={toSkills(sheet)}
          coins={fmtCoins(sheet.coins)}
          inventory={TORVALD_INVENTORY}
          onExplain={(r) => console.log('explain', r)}
        />
      </div>
    );
  },
};

/** The hub with no stats bay and no turn strip — out-of-combat exploration, the smallest it gets. */
export const Hub: Story = {
  render: () => (
    <Ground>
      <div style={{ width: 860 }}>
        <PlayerHub
          identity={IDENTITY}
          vitals={toVitals(sheet, torvald)}
          readiness={toReadiness(sheet)}
          tiles={toActionTiles(sheet, torvald, state, 'npc-goblin-1', { activeTurnEnforced: true })}
          onUse={(id) => console.log('use', id)}
          onExplain={(r) => console.log('explain', r)}
        />
      </div>
    </Ground>
  ),
};

/** HP 0 — the action bay flips to the death-save card and the vitals dim. */
export const HubDyingFlip: Story = {
  render: () => (
    <Ground>
      <div style={{ width: 1080 }}>
        <PlayerHub
          identity={IDENTITY}
          vitals={toVitals(sheet, { ...torvald, hp: 0 })}
          readiness={toReadiness(sheet)}
          stats={toStats(sheet)}
          turn={{ active: true, movement: { left: 0, max: 30 } }}
          tiles={toActionTiles(sheet, torvald, state, 'npc-goblin-1')}
          dying={{ successes: 1, failures: 2, phase: 'dying' }}
          onUse={(id) => console.log('use', id)}
          onRollDeathSave={() => console.log('death save')}
        />
      </div>
    </Ground>
  ),
};

/** The hub docked bottom, the log flush to the right edge at full height — siblings, not parent/child. */
export const HubWithLog: Story = {
  render: () => (
    <div style={{ position: 'relative', height: '100vh', background: MAP_GROUND }}>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'flex-end' }}>
        <DiceLog entries={LOG_ENTRIES} notes={NOTES} pendingCount={1} onSend={(text) => console.log('send', text)} />
      </div>
      <div style={{ position: 'absolute', left: 24, right: 380, bottom: 24 }}>
        <PlayerHub
          identity={IDENTITY}
          vitals={toVitals(sheet, torvald)}
          readiness={toReadiness(sheet)}
          stats={toStats(sheet)}
          turn={{ active: true, targets: TARGETS, movement: { left: 15, max: 30 } }}
          tiles={toActionTiles(sheet, torvald, state, 'npc-goblin-1', { activeTurnEnforced: true })}
          onUse={(id) => console.log('use', id)}
          onExplain={(r) => console.log('explain', r)}
          onEquip={(economy) => console.log('equip', economy)}
        />
      </div>
    </div>
  ),
};
