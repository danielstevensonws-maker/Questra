/**
 * The M2 slice's fixed content — the Torvald PC sheet + the yard room. In the full
 * app these come from the character wizard (sheet) and the session planner (room);
 * for the slice they are the same canonical fixtures the primitives' stories use,
 * so "what you see in Storybook" and "what you see connected to the server" match.
 */
import type { ComputedSheet, Room } from '@questra/contracts';
import torvaldSheet from '@questra/contracts/src/fixtures/torvald-sheet.json';

export const SLICE_SHEET = torvaldSheet as unknown as ComputedSheet;

export const SLICE_IDENTITY = {
  name: 'Torvald Ironoath',
  level: 3,
  className: 'Fighter',
  classColor: 'var(--qa-class-fighter)',
};

/** The player's own creature id in the projection (whose hub this is). */
export const SLICE_MY_CREATURE_ID = 'pc-torvald';

/** Scene chrome (title + place/time). Round + whose-turn come from live state. */
export const SLICE_SCENE = {
  title: 'The Ruined Steading',
  subtitle: 'Outskirts · Dusk',
};

/** The party rail. The slice seeds only Torvald server-side; HP overlays from live
 *  projection, so members without a live combatant simply read empty until seeded. */
export const SLICE_PARTY = [
  { id: 'pc-torvald', name: 'Torvald', klass: 'Fighter · Lv 3', classColor: 'var(--qa-class-fighter)' },
];

export const SLICE_ROOM: Room = {
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
