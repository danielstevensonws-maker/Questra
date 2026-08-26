/**
 * The map a new campaign opens onto.
 *
 * The assertions that matter here are not about aesthetics — they are about
 * the room being a legal Room that the fog filter and the geometry functions
 * can both operate on. A seed that produced an almost-valid room would fail at
 * the table rather than here.
 */
import { describe, it, expect } from 'vitest';
import { RoomSchema, distFt, filterRoomForViewer, type Room } from '@questra/contracts';
import { starterRoom, seatLatecomers } from '../src/sim/starter-room.js';

describe('the starter room', () => {
  it('is a valid Room', () => {
    const room = starterRoom({ roomId: 'room_1', creatureIds: ['char_a', 'char_b'] });
    expect(() => RoomSchema.parse(room)).not.toThrow();
  });

  it('places every character on the map exactly once', () => {
    const ids = ['char_a', 'char_b', 'char_c'];
    const room = starterRoom({ roomId: 'room_1', creatureIds: ids });
    expect(room.tokens).toHaveLength(3);
    expect(room.tokens.map((t) => t.creatureRef).sort()).toEqual([...ids].sort());
  });

  it('keeps everyone inside the grid', () => {
    /* Ten characters is more than any real table, and the point: a party that
       overflowed the column must wrap rather than walk off the map. */
    const ids = Array.from({ length: 10 }, (_, i) => `char_${String(i)}`);
    const room = starterRoom({ roomId: 'room_1', creatureIds: ids });
    for (const t of room.tokens) {
      expect(t.cell.x, `${t.creatureRef} x`).toBeGreaterThanOrEqual(0);
      expect(t.cell.y, `${t.creatureRef} y`).toBeGreaterThanOrEqual(0);
      expect(t.cell.x, `${t.creatureRef} x`).toBeLessThan(room.gridSize.w);
      expect(t.cell.y, `${t.creatureRef} y`).toBeLessThan(room.gridSize.h);
    }
  });

  it('never stacks two characters on the same cell', () => {
    const ids = Array.from({ length: 8 }, (_, i) => `char_${String(i)}`);
    const room = starterRoom({ roomId: 'room_1', creatureIds: ids });
    const keys = room.tokens.map((t) => `${String(t.cell.x)},${String(t.cell.y)}`);
    expect(new Set(keys).size, 'two tokens share a cell').toBe(keys.length);
  });

  /* Spread rather than packed: adjacent tokens read as a huddle. Five feet is
     one cell, so neighbours should be two cells (10 ft) apart. */
  it('gives the party room to stand', () => {
    const room = starterRoom({ roomId: 'room_1', creatureIds: ['a', 'b'] });
    const [first, second] = room.tokens;
    expect(distFt(first!.cell, second!.cell)).toBeGreaterThanOrEqual(10);
  });

  it('starts fully lit, with nothing hidden', () => {
    const room = starterRoom({ roomId: 'room_1', creatureIds: ['a'] });
    expect(room.revealed).toHaveLength(room.gridSize.w * room.gridSize.h);
    expect(room.tokens.every((t) => !t.hidden && !t.staged)).toBe(true);
  });

  /**
   * The reason fog is stored whole and filtered on the way out: a player must
   * receive the same room as the DM only while nothing is hidden. This asserts
   * the filter runs cleanly over the seed rather than that it does nothing —
   * the moment a DM hides a cell, the two payloads diverge.
   */
  it('survives the viewer filter unchanged while nothing is hidden', () => {
    const room = starterRoom({ roomId: 'room_1', creatureIds: ['a', 'b'] });
    const asPlayer = filterRoomForViewer(room, { role: 'player', accountId: 'acct_a' });
    expect(asPlayer.tokens).toHaveLength(room.tokens.length);
    expect(asPlayer.revealed).toHaveLength(room.revealed.length);
  });

  it('hides an unrevealed cell from a player but not from the DM', () => {
    const room = starterRoom({ roomId: 'room_1', creatureIds: ['a'] });
    /* Take one cell back, as a DM drawing fog would. */
    const dark = room.revealed[room.revealed.length - 1]!;
    const foggy = { ...room, revealed: room.revealed.filter((c) => c !== dark) };

    const asDm = filterRoomForViewer(foggy, { role: 'dm', accountId: 'acct_dm' });
    const asPlayer = filterRoomForViewer(foggy, { role: 'player', accountId: 'acct_a' });

    /* The DM keeps the whole room, minus the one cell actually taken back —
       the filter is a pass-through for them, not a re-derivation. */
    expect(asDm.revealed).toEqual(foggy.revealed);
    expect(asPlayer.revealed).not.toContain(dark);
    /* And the cell is not merely absent from `revealed`: its tags must not
       ride along in the payload either, which is the actual leak to guard. */
    expect(Object.keys(asPlayer.cellTags)).not.toContain(dark);
  });

  it('gives an empty party an empty map rather than failing', () => {
    const room = starterRoom({ roomId: 'room_1', creatureIds: [] });
    expect(() => RoomSchema.parse(room)).not.toThrow();
    expect(room.tokens).toEqual([]);
  });
});

/**
 * The chair a latecomer gets on a map that was drawn without them.
 *
 * FOUND BY RUNNING THE APP. A campaign's room is minted the first time anybody
 * opens it — the DM, before a single player has run the wizard — so it is built
 * with nobody on it, and every character made afterwards had a seat in the turn
 * order and no token on the board, permanently. The symptom was opportunity
 * attacks: a goblin walked out of a fighter's reach and provoked nothing,
 * because the fighter was not anywhere for the geometry to find.
 */
describe('seating somebody who arrived after the map was drawn', () => {
  const empty = starterRoom({ roomId: 'room_1', creatureIds: [] });

  it('a room built before anybody existed has no tokens at all', () => {
    expect(empty.tokens).toHaveLength(0);
  });

  it('gives the latecomer a token, on a legal square', () => {
    const seated = seatLatecomers(empty, ['char_torvald']);
    expect(seated.tokens).toHaveLength(1);
    expect(seated.tokens[0]!.creatureRef).toBe('char_torvald');
    expect(RoomSchema.safeParse(seated).success).toBe(true);
    const { x, y } = seated.tokens[0]!.cell;
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeGreaterThanOrEqual(0);
    expect(x).toBeLessThan(seated.gridSize.w);
    expect(y).toBeLessThan(seated.gridSize.h);
  });

  it('seats them beside the party, not where a monster would arrive', () => {
    /* The party column is the west edge; an arrival lands about two thirds
       across. A character who came in late is one of the party. */
    const seated = seatLatecomers(empty, ['char_torvald']);
    expect(seated.tokens[0]!.cell.x).toBeLessThan(seated.gridSize.w / 2);
  });

  it('leaves anybody already on the map exactly where they are', () => {
    const withOne = starterRoom({ roomId: 'room_1', creatureIds: ['char_a'] });
    const moved: Room = {
      ...withOne,
      tokens: withOne.tokens.map((t) => ({ ...t, cell: { x: 11, y: 9 }, hidden: true })),
    };
    const seated = seatLatecomers(moved, ['char_a', 'char_b']);
    const a = seated.tokens.find((t) => t.creatureRef === 'char_a')!;
    /* Rebuilding an existing token would silently undo a move, a hide or a
       stage — which is why this only ever adds. */
    expect(a.cell).toEqual({ x: 11, y: 9 });
    expect(a.hidden).toBe(true);
    expect(seated.tokens).toHaveLength(2);
  });

  it('does not stack a latecomer on somebody already standing there', () => {
    const withOne = starterRoom({ roomId: 'room_1', creatureIds: ['char_a'] });
    const seated = seatLatecomers(withOne, ['char_a', 'char_b']);
    const a = seated.tokens.find((t) => t.creatureRef === 'char_a')!;
    const b = seated.tokens.find((t) => t.creatureRef === 'char_b')!;
    expect(a.cell).not.toEqual(b.cell);
  });

  it('is a no-op — the same object — when nobody is missing', () => {
    const withOne = starterRoom({ roomId: 'room_1', creatureIds: ['char_a'] });
    expect(seatLatecomers(withOne, ['char_a'])).toBe(withOne);
    expect(seatLatecomers(withOne, [])).toBe(withOne);
  });

  it('seats several at once, each on their own square', () => {
    const seated = seatLatecomers(empty, ['a', 'b', 'c']);
    const cells = seated.tokens.map((t) => `${String(t.cell.x)},${String(t.cell.y)}`);
    expect(new Set(cells).size).toBe(3);
  });
});
