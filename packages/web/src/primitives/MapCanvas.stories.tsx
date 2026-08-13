/**
 * MapCanvas stories — the one renderer in its three modes (Brief 06 §5), driven
 * by a small room and the real contracts geometry. The Fog story shows the
 * choke point: the play/table views receive a room already filtered by
 * filterRoomForViewer, so unrevealed cells and hidden/staged tokens never reach
 * the client.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { filterRoomForViewer, type Room } from '@questra/contracts';
import { MapCanvas } from './MapCanvas.js';

import '../theme/index.css';

const meta: Meta<typeof MapCanvas> = {
  title: 'Primitives/MapCanvas',
  component: MapCanvas,
};
export default meta;
type Story = StoryObj<typeof MapCanvas>;

const room: Room = {
  id: 'vault',
  terrainImageRef: 'terrain/vault',
  gridSize: { w: 8, h: 6 },
  cellTags: { '5,4': { difficultTerrain: true }, '6,4': { difficultTerrain: true } },
  revealed: ['0,0', '1,0', '2,0', '0,1', '1,1', '2,1', '3,1', '2,2', '3,2'],
  assets: [
    { id: 'tomb', imageRef: 'asset/tomb', cell: { x: 3, y: 2 }, footprint: { w: 1, h: 1 }, flags: { blocking: true, movable: false, interactive: true, difficultTerrain: false }, state: 'closed', prepNote: 'opens on a DC 15 STR check' },
  ],
  tokens: [
    { id: 't-torvald', creatureRef: 'pc-torvald', cell: { x: 1, y: 1 }, size: 'medium', hidden: false, staged: false },
    { id: 't-goblin', creatureRef: 'npc-goblin-1', cell: { x: 2, y: 1 }, size: 'small', hidden: false, staged: false },
    { id: 't-ambush', creatureRef: 'npc-goblin-boss', cell: { x: 6, y: 4 }, size: 'medium', hidden: true, staged: false },
  ],
};

function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: 24, background: 'var(--q-bg)', display: 'inline-block' }}>{children}</div>;
}

/** Edit (planner): sees the whole room incl. the fogged area, the hidden ambush token, and prep notes. */
export const EditMode: Story = {
  render: () => (
    <Frame>
      <MapCanvas room={room} mode="edit" />
    </Frame>
  ),
};

/** Play (DM): fog respected in the render, but the DM still receives the full room. Range rings from Torvald. */
export const PlayModeWithRange: Story = {
  render: () => (
    <Frame>
      <MapCanvas room={room} mode="play" measureFrom={{ x: 1, y: 1 }} />
    </Frame>
  ),
};

/** Play (DM): a 20-ft-radius sphere AoE preview anchored on the goblin — the affectedCells highlight. */
export const AoePreview: Story = {
  render: () => (
    <Frame>
      <MapCanvas room={room} mode="play" aoe={{ shape: { kind: 'sphere', radiusFt: 15 }, anchor: { x: 2, y: 1 } }} />
    </Frame>
  ),
};

/** Table (spectator): the player-filtered room — no fogged cells, NO hidden ambush token, no prep notes. */
export const TableModeFiltered: Story = {
  render: () => {
    const forPlayer = filterRoomForViewer(room, { role: 'player', accountId: 'acct-torvald' });
    return (
      <Frame>
        <MapCanvas room={forPlayer} mode="table" />
      </Frame>
    );
  },
};
