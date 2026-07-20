/**
 * MapCanvas stories — the one renderer in its three modes (Brief 06 §5),
 * restyled to the Questra V1 Prototype sheet. Driven by a small room and the
 * real contracts geometry. The Table story shows the choke point: the play/table
 * views receive a room already filtered by filterRoomForViewer, so unrevealed
 * cells and hidden/staged tokens never reach the client.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import { filterRoomForViewer, type Room } from '@questra/contracts';
import { MapCanvas } from './MapCanvas.js';

import '@questra/theme/styles.css';
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
  gridSize: { w: 7, h: 5 },
  cellTags: { '2,3': { difficultTerrain: true }, '3,3': { difficultTerrain: true } },
  revealed: ['0,0', '1,0', '2,0', '3,0', '4,0', '0,1', '1,1', '2,1', '3,1', '4,1', '0,2', '1,2', '2,2', '3,2', '4,2', '0,3', '1,3', '2,3', '3,3', '4,3', '0,4', '1,4', '2,4', '3,4', '4,4'],
  assets: [
    { id: 'tomb', imageRef: 'asset/tomb', cell: { x: 4, y: 1 }, footprint: { w: 2, h: 1 }, flags: { blocking: true, movable: false, interactive: true, difficultTerrain: false }, state: 'closed', prepNote: 'opens on a DC 15 STR check' },
  ],
  tokens: [
    { id: 't-torvald', creatureRef: 'pc-torvald', cell: { x: 1, y: 1 }, size: 'medium', hidden: false, staged: false },
    { id: 't-goblin', creatureRef: 'npc-goblin-1', cell: { x: 3, y: 1 }, size: 'small', hidden: false, staged: false },
    { id: 't-ambush', creatureRef: 'npc-goblin-boss', cell: { x: 5, y: 3 }, size: 'medium', hidden: true, staged: false },
  ],
};

/** Class colours + status tags for the demo cast — the seam a screen supplies. */
const tokenMeta = (ref: string) => {
  if (ref === 'pc-torvald') return { color: 'var(--qa-class-fighter)' };
  if (ref === 'npc-goblin-1') return { foe: true, tag: 'Bloodied' };
  if (ref === 'npc-goblin-boss') return { foe: true };
  return undefined;
};

/** Stage each map on the sheet's gradient ground, as its figures sit. */
function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 30,
        borderRadius: 'var(--qa-radius-lg)',
        border: '1px solid var(--qa-hairline-soft)',
        background:
          'radial-gradient(ellipse 70% 65% at 50% 30%, var(--qa-ink-raised2), var(--qa-ink-char) 55%, var(--qa-ink-deep) 100%)',
      }}
    >
      {children}
    </div>
  );
}

/** Edit (planner): the whole room incl. the fogged area, the hidden ambush token, prep notes. */
export const EditMode: Story = {
  render: () => (
    <Frame>
      <MapCanvas room={room} mode="edit" cellPx={36} tokenMeta={tokenMeta} />
    </Frame>
  ),
};

/** Play (DM): fog respected; range rings measured from Torvald. His token is spotlit. */
export const PlayModeWithRange: Story = {
  render: () => (
    <Frame>
      <MapCanvas room={room} mode="play" cellPx={36} measureFrom={{ x: 1, y: 1 }} youTokenId="t-torvald" tokenMeta={tokenMeta} />
    </Frame>
  ),
};

/** Play (DM): a 15-ft-radius sphere anchored on the goblin — the affectedCells highlight. */
export const AoePreview: Story = {
  render: () => (
    <Frame>
      <MapCanvas room={room} mode="play" cellPx={36} aoe={{ shape: { kind: 'sphere', radiusFt: 15 }, anchor: { x: 3, y: 1 } }} tokenMeta={tokenMeta} />
    </Frame>
  ),
};

/** Table (spectator): the player-filtered room — no fogged cells, NO hidden ambush token. */
export const TableModeFiltered: Story = {
  render: () => {
    const forPlayer = filterRoomForViewer(room, { role: 'player', accountId: 'acct-torvald' });
    return (
      <Frame>
        <MapCanvas room={forPlayer} mode="table" cellPx={36} tokenMeta={tokenMeta} />
      </Frame>
    );
  },
};

/**
 * Terrain image — MapCanvas draws room.terrainImageRef as the ground layer when
 * a resolver is supplied (the Session Planner fills the ref via Brief 09a). The
 * grid and tokens compose over it; here an inline SVG data-URI stands in for a
 * generated map.
 */
export const WithTerrainImage: Story = {
  render: () => {
    const svg =
      'data:image/svg+xml;utf8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="252" height="180"><defs><radialGradient id="g" cx="40%" cy="35%"><stop offset="0%" stop-color="#3a2f1c"/><stop offset="60%" stop-color="#241c10"/><stop offset="100%" stop-color="#14100a"/></radialGradient></defs><rect width="252" height="180" fill="url(#g)"/><path d="M0 120 Q120 90 252 130" stroke="#4a3d26" stroke-width="14" fill="none" opacity="0.6"/></svg>`,
      );
    return (
      <Frame>
        <MapCanvas room={room} mode="play" cellPx={36} resolveTerrain={() => svg} tokenMeta={tokenMeta} youTokenId="t-torvald" />
      </Frame>
    );
  },
};
