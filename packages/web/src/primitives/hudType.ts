/**
 * hudType — the Player HUD's type ramp, as five semantic roles.
 *
 * WHY THIS FILE EXISTS. The hub drifted into four different sizes doing one
 * job: 8.5px, 9px, 9.5px and the real `--qa-text-whisper` (10px) were all
 * rendering "small mono caps label", plus one-off 13px/22px. Nothing caught
 * it — `packages/ui`'s token-hygiene suite scans only that package, and the
 * hub primitives live here in `packages/web`. The result read as sloppy
 * because it *was*: the same label was a different size in three components.
 *
 * The fix is to name the ROLES rather than the sizes, so a component asks for
 * `sectionLabel` and cannot pick a number at all. Every role below composes
 * only tokens that already exist in @questra/theme — `packages/theme` is
 * byte-identity-guarded against the upstream Claude Design project, so adding
 * a new size token is not available to us and nothing here invents one.
 *
 * THE RULE UNDERNEATH (Player View design request §3): **prose is a serif,
 * data is mono.** A player should be able to tell at a glance whether they're
 * reading the story or reading their character. Display serif is reserved for
 * names — the character, the scene — because those are the two things that
 * belong to the fiction rather than the arithmetic.
 *
 * Only three sizes are in play: whisper (10) for labels, label (12) for
 * secondary data and names-of-things, lg (20) for the numbers a player reads
 * across the table. `--qa-text-label` was previously unused in the hub, which
 * is exactly why 13px kept getting invented to fill the 10→16 gap.
 */
import type { CSSProperties } from 'react';

const mono = 'var(--qa-font-mono)';
const body = 'var(--qa-font-body)';
const display = 'var(--qa-font-display)';

/** A section's quiet heading — VITALS, ACTION, STATS, the log's actor names. */
export const sectionLabel: CSSProperties = {
  fontFamily: mono,
  fontSize: 'var(--qa-text-whisper)',
  letterSpacing: 'var(--qa-tracking-caps)',
  textTransform: 'uppercase',
  color: 'var(--qa-ink-faint)',
};

/** A name that belongs to the fiction — the character, the scene. */
export const name: CSSProperties = {
  fontFamily: display,
  fontSize: 'var(--qa-text-lg)',
  color: 'var(--qa-ink)',
  lineHeight: 1.05,
};

/** The number a player reads across the table: HP, an ability modifier, AC. */
export const statValue: CSSProperties = {
  fontFamily: mono,
  fontSize: 'var(--qa-text-lg)',
  fontWeight: 600,
  color: 'var(--qa-ink)',
  lineHeight: 1.1,
};

/** Data that supports a value — the raw score, a to-hit, a resource count. */
export const statMeta: CSSProperties = {
  fontFamily: mono,
  fontSize: 'var(--qa-text-label)',
  color: 'var(--qa-ink-dim)',
};

/** The name of a thing you can act on — an ability tile, an inventory line. */
export const itemName: CSSProperties = {
  fontFamily: body,
  fontSize: 'var(--qa-text-label)',
  color: 'var(--qa-ink-dim)',
  lineHeight: 1.2,
};

/** Narration, chat, rules text — the story voice. */
export const prose: CSSProperties = {
  fontFamily: body,
  fontSize: 'var(--qa-text-label)',
  color: 'var(--qa-ink-dim)',
};
