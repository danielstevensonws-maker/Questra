/**
 * v2/type — the Player View v2 type ramp, expressed as ROLES.
 *
 * Same discipline as the v1 hub's `hudType.ts` and for the same reason: a
 * component asks for a role and therefore cannot pick a number. What differs
 * is the range. v1 was a bar and got by on three sizes; v2 is a whole screen
 * with a hero moment (a settled dice total) and a dense rail (six combatants
 * down the left edge), so it uses the full existing ramp — whisper 10, label
 * 12, body 16, lg 20, title 28, display 40. Every one of those is already in
 * @questra/theme; nothing here invents a size, because `packages/theme` is
 * byte-identity-guarded against the upstream Design project.
 *
 * THE RULE UNDERNEATH (Player View design request §3): **prose is a serif,
 * data is mono.** A player can tell at a glance whether they are reading the
 * story or reading their character. v2 leans on it harder than v1 did: the
 * round spine sets every combatant's name in the display serif and every
 * initiative number in mono, so the rail reads as a cast list with a running
 * order rather than as a table of rows.
 */
import type { CSSProperties } from 'react';

const mono = 'var(--qa-font-mono)';
const body = 'var(--qa-font-body)';
const display = 'var(--qa-font-display)';

/** The quiet heading over a region or a readout — ROUND 3, ACTION, TARGET. */
export const eyebrow: CSSProperties = {
  fontFamily: mono,
  fontSize: 'var(--qa-text-whisper)',
  letterSpacing: 'var(--qa-tracking-caps)',
  textTransform: 'uppercase',
  color: 'var(--qa-ink-faint)',
};

/** Your own name, on the near edge. The largest fiction voice on the screen. */
export const heroName: CSSProperties = {
  fontFamily: display,
  fontSize: 'var(--qa-text-title)',
  color: 'var(--qa-ink)',
  lineHeight: 1,
};

/** The scene's name in the top rail. */
export const sceneName: CSSProperties = {
  fontFamily: display,
  fontSize: 'var(--qa-text-lg)',
  color: 'var(--qa-ink)',
  lineHeight: 1.1,
};

/** A member of the cast, on the round spine. Serif — these are people, not rows. */
export const castName: CSSProperties = {
  fontFamily: display,
  fontSize: 'var(--qa-text-body)',
  color: 'var(--qa-ink)',
  lineHeight: 1.1,
};

/** The number a player reads across the table: HP, AC, an ability modifier. */
export const statValue: CSSProperties = {
  fontFamily: mono,
  fontSize: 'var(--qa-text-lg)',
  fontWeight: 600,
  color: 'var(--qa-ink)',
  lineHeight: 1,
};

/** The settled total of a roll — the one hero number on the screen. */
export const rollTotal: CSSProperties = {
  fontFamily: mono,
  fontSize: 'var(--qa-text-display)',
  fontWeight: 600,
  color: 'var(--qa-ink)',
  lineHeight: 1,
  fontVariantNumeric: 'tabular-nums',
};

/** Data supporting a value — a to-hit, a damage die, a resource count. */
export const statMeta: CSSProperties = {
  fontFamily: mono,
  fontSize: 'var(--qa-text-label)',
  color: 'var(--qa-ink-dim)',
  fontVariantNumeric: 'tabular-nums',
};

/** The smallest data there is — an initiative number, an HP fraction on the rail. */
export const micro: CSSProperties = {
  fontFamily: mono,
  fontSize: 'var(--qa-text-whisper)',
  color: 'var(--qa-ink-faint)',
  fontVariantNumeric: 'tabular-nums',
};

/** The name of a thing you can act on — an action tile, an inventory line. */
export const itemName: CSSProperties = {
  fontFamily: body,
  fontSize: 'var(--qa-text-label)',
  color: 'var(--qa-ink)',
  lineHeight: 1.2,
};

/** The story voice: narration, rulings, the DM talking. Given real size. */
export const narration: CSSProperties = {
  fontFamily: body,
  fontSize: 'var(--qa-text-body)',
  color: 'var(--qa-ink)',
  lineHeight: 1.45,
};

/** Secondary prose — table talk, help text, a flavour line. */
export const prose: CSSProperties = {
  fontFamily: body,
  fontSize: 'var(--qa-text-label)',
  color: 'var(--qa-ink-dim)',
  lineHeight: 1.4,
};

/** Something a player said, quoted back to them before a ruling lands on it. */
export const quote: CSSProperties = {
  fontFamily: display,
  fontSize: 'var(--qa-text-body)',
  fontStyle: 'italic',
  color: 'var(--qa-ink)',
  lineHeight: 1.35,
};
