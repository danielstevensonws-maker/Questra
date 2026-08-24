/**
 * The room, with everybody standing where they actually are.
 *
 * THE MAP WAS FROZEN. A room arrives once over HTTP and never changes, while
 * `token_moved` events flow past on the socket — and nothing applied them, so
 * tokens sat wherever they were when the page loaded no matter how much the
 * table moved. Movement was wired end to end on the server and invisible on
 * every screen.
 *
 * WHY NOT FOLD THE ROOM INTO PROJECTION STATE. The projection is combatants,
 * turns and rounds — the numbers a fight is made of. A room is geometry, fog
 * and art, it is fetched per viewer already filtered, and it changes for
 * reasons that have nothing to do with the event log (a DM editing the map
 * between sessions). Keeping them apart means neither has to know about the
 * other; this function is the one place they meet.
 *
 * REPLAYING FROM THE FETCHED ROOM RATHER THAN MUTATING IT is what makes this
 * safe: the room is the base, the moves are the log, and the result is derived
 * fresh. A refetch mid-session cannot desync, because the next render simply
 * replays the same moves onto the newer room.
 */
import type { PlayEvent, Room } from '@questra/contracts';

export function roomWithMoves(room: Room | null, events: readonly PlayEvent[]): Room | null {
  if (!room) return null;

  /* Last known cell per token — later moves win, which is what makes this a
     replay rather than an accumulation. */
  const moved = new Map<string, { x: number; y: number }>();
  /* Cells revealed by walking into them. Fog is the server's to lift, but a
     token standing in a square nobody can see is worse than a square that
     turned out to be visible early. */
  const walked = new Set<string>();

  for (const e of events) {
    const b = e.body as { t: string; tokenId?: string; to?: { x: number; y: number }; path?: { x: number; y: number }[] };
    if (b.t !== 'token_moved' || !b.tokenId || !b.to) continue;
    moved.set(b.tokenId, b.to);
    for (const step of b.path ?? []) walked.add(`${String(step.x)},${String(step.y)}`);
  }

  if (moved.size === 0) return room;

  return {
    ...room,
    revealed: [...new Set([...room.revealed, ...walked])],
    tokens: room.tokens.map((t) => {
      /**
       * Tokens are matched on `creatureRef` as well as `id` because a move
       * names the CREATURE — that is what a player selected — while the room
       * names the token that stands for it. Matching only one of the two
       * silently drops half the moves.
       */
      const to = moved.get(t.id) ?? moved.get(t.creatureRef);
      return to ? { ...t, cell: to } : t;
    }),
  };
}
