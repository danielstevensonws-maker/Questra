/**
 * Who a move walks away from — the opportunity-attack DETECTION that Brief 02
 * §6 #5 deferred to "the movement/reaction system" and Brief 08 explicitly
 * declares out of its own scope ("the underlying OA detection (Brief 02/06 own
 * it)"). Brief 08 builds the prompt once a candidate exists; this decides who
 * the candidates are. Without it the prompt machinery had no producer: every
 * function in `prompts.ts` was tested and unreachable, and a goblin could walk
 * out of a fighter's reach untouched.
 *
 * Pure geometry over cells. No dice, no AI, no rules judgement — the DM still
 * decides whether the swing lands in the fiction, and the holder still gets to
 * decline. All this says is "you had the chance".
 *
 * THE METRIC IS ADR-0012: Chebyshev, five feet a square. Diagonals cost the
 * same as orthogonals, which is the choice the whole app already draws with
 * (`token_moved.costFt` computes exactly this), so reach is a square ring
 * around a creature rather than a circle. A ten-foot reach threatens the two
 * rings out, all the way into the corners.
 */
import type { Cell, PlacedToken, Room } from '@questra/contracts';

/** Five feet a square, measured Chebyshev (ADR-0012). */
export const FEET_PER_CELL = 5;

/** Reach of an ordinary melee weapon, in feet — the default when nothing says otherwise. */
export const DEFAULT_REACH_FT = 5;

/** Distance between two squares in feet, by the grid's own metric (ADR-0012). */
export function distanceFt(a: Cell, b: Cell): number {
  return FEET_PER_CELL * Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

/** Where every creature on a room stands, keyed by the creature the token stands for. */
export function positionsOf(room: Room): Map<string, Cell> {
  const out = new Map<string, Cell>();
  for (const t of room.tokens) out.set(t.creatureRef, t.cell);
  return out;
}

/** The token standing for a creature, if the room has one. */
export function tokenFor(room: Room, creatureId: string): PlacedToken | undefined {
  return room.tokens.find((t) => t.creatureRef === creatureId);
}

/**
 * The creature a token stands for. A `move` intent names the TOKEN — that is
 * what a person dragged — while everything about reach is about creatures, so
 * this is the join. Falls back to the `tok_<creatureId>` convention arrivals
 * use, so a move that lands before the room snapshot catches up still resolves.
 */
export function creatureForToken(room: Room | null, tokenId: string): string | null {
  const byId = room?.tokens.find((t) => t.id === tokenId);
  if (byId) return byId.creatureRef;
  return tokenId.startsWith('tok_') ? tokenId.slice(4) : null;
}

/** A creature that might get a swing in as somebody walks away from it. */
export interface Threat {
  creatureId: string;
  /** How far it threatens, in feet. Defaults to five. */
  reachFt?: number;
  /** Action names the holder may swing with — the prompt's options. */
  attackOptions: string[];
  /** Whether its reaction is still available this round (see `reactionsFrom`). */
  reactionAvailable: boolean;
}

/** One provoked opportunity: who, and on which step of the path it happened. */
export interface Provocation {
  threat: Threat;
  step: { from: Cell; to: Cell };
}

/**
 * The opportunities a path hands out.
 *
 * SRD: you provoke when you move OUT OF a hostile creature's reach — not when
 * you move within it, and not when you move further away having already left.
 * So per threat this looks for the first step that crosses the boundary from
 * inside reach to outside it, and reports that step. A creature that starts
 * outside reach never provokes; one that steps around inside reach never
 * provokes; one that leaves provokes exactly once, which is all its single
 * reaction could pay for anyway.
 *
 * Order is the caller's: Brief 08 §3 #1 wants prompts resolved in initiative
 * order, so `threats` arrives already sorted and the result preserves it.
 * A threat with no reaction left, or nothing to swing with, is dropped here
 * rather than prompted and refused — a card that can only be declined is noise
 * at a table with five people waiting.
 */
export function provocations(
  path: readonly Cell[],
  positions: ReadonlyMap<string, Cell>,
  threats: readonly Threat[],
): Provocation[] {
  if (path.length < 2) return [];

  const out: Provocation[] = [];
  for (const threat of threats) {
    if (!threat.reactionAvailable || threat.attackOptions.length === 0) continue;
    const at = positions.get(threat.creatureId);
    if (!at) continue;
    const reach = threat.reachFt ?? DEFAULT_REACH_FT;

    for (let i = 1; i < path.length; i++) {
      const from = path[i - 1]!;
      const to = path[i]!;
      if (distanceFt(at, from) <= reach && distanceFt(at, to) > reach) {
        out.push({ threat, step: { from, to } });
        break;
      }
    }
  }
  return out;
}
