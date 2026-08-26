/**
 * Everybody the table can put a name to.
 *
 * THE ROSTER IS ONLY THE PLAYERS. It comes from the campaign's members, so it
 * knows Torvald and Mira and nothing else — and the creatures a DM brings in
 * mid-session are exactly the ones the fight is about. Every surface that turns
 * an id into a sentence was therefore one monster away from printing the
 * server's own bookkeeping at a player.
 *
 * It did. The opportunity-attack card read "foe-1787742502386-22 is moving out
 * of reach", which is the plain-language law failing in the one place it is
 * least affordable: a card with a timer on it, that somebody has seconds to
 * read. Found by running the app — and invisible before the card existed,
 * because until then nothing had ever asked a monster its name.
 *
 * DERIVED FROM THE LOG, not fetched. `creature_added` carries the name the DM
 * chose, so the events already know; keeping a separate lookup in step with
 * them would be a second copy free to drift, and the drift is a card that names
 * the wrong creature.
 */
import type { PlayEvent } from '@questra/contracts';

export function namesFrom(
  /** The party, from the campaign roster — the names that exist before play starts. */
  roster: Readonly<Record<string, string>>,
  events: readonly PlayEvent[],
): Record<string, string> {
  const out: Record<string, string> = { ...roster };
  for (const e of events) {
    const b = e.body as { t: string; creatureId?: string; name?: string };
    /* Later wins: a creature added, removed and added again under a new name is
       known by the name it has now. */
    if (b.t === 'creature_added' && b.creatureId !== undefined && b.name !== undefined) {
      out[b.creatureId] = b.name;
    }
  }
  return out;
}
