/**
 * design/styles — the app's shared component stylesheet.
 *
 * WHAT LIVES HERE vs. IN A SCREEN'S OWN STYLESHEET. This file owns CHROME and
 * BEHAVIOUR: what a surface is made of (fill, border, radius, padding, rhythm,
 * shadow), what its controls look like, how they respond to hover and focus,
 * and what happens under reduced motion. It owns no POSITIONS. Where a panel
 * sits belongs to the screen composing it — see v2/ScreenStyles.tsx, which
 * adds `position: absolute` and coordinates to the same `.qa2-panel` class
 * this file defines. Keeping placement out is what lets an authoring surface
 * (wizard step, planner row, compendium entry) use the identical chrome inside
 * an ordinary document flow.
 *
 * WHY A STYLESHEET AND NOT INLINE STYLES. Inline styling cost the original
 * hub three things every surface needs: real `:hover`/`:focus-visible` without
 * a `useState` per control, `@media (prefers-reduced-motion)` (design request
 * §8, non-negotiable), and pseudo-elements. Every value below is still a
 * `--qa-*` token — `test/hud-type-hygiene.test.ts` scans this file for hex,
 * rgb(), literal durations and numeric font sizes exactly as it scans the
 * components.
 *
 * ON THE `qa2-` PREFIX. It is historical — this design language began as the
 * second generation of the play screen, and the first is now deleted. Read it
 * as "the Questra component layer", deliberately distinct from the `--qa-*`
 * design TOKENS it consumes, so a class and a custom property never read as
 * the same thing. Renaming ~200 references buys nothing but risk.
 *
 * THE STILL-EQUIVALENT DISCIPLINE. Nothing here animates INTO its resting
 * state from a hidden one via a persistent transform. An element's plain CSS
 * IS the finished state, and the keyframes run FROM a hidden state TO nothing.
 * So the reduced-motion block can simply say `animation: none` and every
 * moving part is left correctly drawn rather than stuck at zero. That is what
 * "design the reduced state" means in practice.
 *
 * ONE EDITING HAZARD, paid for repeatedly: the CSS below is a template
 * literal, so a BACKTICK anywhere inside it — including inside a CSS comment,
 * where quoting a class name is the natural thing to do — closes the string and
 * the whole file stops parsing. Write class names bare in those comments. The
 * type-hygiene suite asserts this file carries exactly the two backticks that
 * open and close the literal.
 */
import type { ReactElement } from 'react';

const CSS = `
/* ---- the shared chrome contract -------------------------------------------
   One radius, one padding, one rhythm, one fill. Every floating surface in the
   app is this class plus a placement supplied by whoever is composing it. The
   contract exists because the previous generation learned it the hard way: it
   was never the merging of cards that held a layout together, it was agreeing
   on the chrome. Add a surface through this class and it cannot drift. */
.qa2-panel {
  display: flex;
  flex-direction: column;
  gap: var(--qa-s3);
  padding: var(--qa-s3) var(--qa-s4);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius-lg);
  background: var(--qa-glass);
  backdrop-filter: blur(var(--qa-glass-blur));
  -webkit-backdrop-filter: blur(var(--qa-glass-blur));
  box-shadow: var(--qa-shadow);
}

/* A surface collapsed to a small pill rather than a strip welded to an edge —
   a floating HUD should not grow an edge when it shrinks. Placement is the
   composing screen's business; this is only what it is made of. */
.qa2-pill {
  display: flex;
  align-items: center;
  gap: var(--qa-s2);
  padding: var(--qa-s2) var(--qa-s3);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius-round);
  background: var(--qa-glass);
  backdrop-filter: blur(var(--qa-glass-blur));
  -webkit-backdrop-filter: blur(var(--qa-glass-blur));
  box-shadow: var(--qa-shadow);
  color: var(--qa-ink-dim);
  cursor: pointer;
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  white-space: nowrap;
  transition: color var(--qa-dur-fast) var(--qa-ease), border-color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-pill:hover { color: var(--qa-ink); border-color: var(--qa-accent-line); }
.qa2-pill-dot { width: 6px; height: 6px; flex: none; border-radius: var(--qa-radius-round); background: var(--qa-accent); }

/* ---- controls -------------------------------------------------------------- */
.qa2-ctl {
  width: 36px;
  height: 36px;
  flex: none;
  display: grid;
  place-items: center;
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius);
  background: var(--qa-chip);
  color: var(--qa-ink-dim);
  cursor: pointer;
  transition: color var(--qa-dur-fast) var(--qa-ease), border-color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-ctl:hover { color: var(--qa-ink); border-color: var(--qa-accent-line); }
.qa2-ctl.is-on { color: var(--qa-accent); border-color: var(--qa-accent-line); }

/*
 * EVERY NUMBER IS TAPPABLE (design request §5). A "?" circle beside each value
 * becomes a field of punctuation at any real density. Instead the readout's own
 * LABEL carries a dotted underline — the long-standing "there is more behind
 * this word" mark — and the whole readout is the button. It costs no space,
 * scales down to a log's breakdown rows, and reads as annotation rather than
 * chrome.
 */
.qa2-explain {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: help;
}
.qa2-explain > .qa2-explain-label {
  border-bottom: var(--qa-hairline) dotted var(--qa-ink-faint);
  transition: color var(--qa-dur-fast) var(--qa-ease), border-color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-explain:hover > .qa2-explain-label { color: var(--qa-accent); border-bottom-color: var(--qa-accent); }
.qa2-explain.is-row { flex-direction: row; align-items: baseline; gap: var(--qa-s2); }

.qa2-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--qa-s1);
  padding: 1px var(--qa-s2);
  border: var(--qa-hairline) solid transparent;
  border-radius: var(--qa-radius-sm);
  background: var(--qa-chip);
  color: var(--qa-ink-dim);
  cursor: pointer;
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  transition: border-color var(--qa-dur-fast) var(--qa-ease), color var(--qa-dur-fast) var(--qa-ease), background var(--qa-dur-fast) var(--qa-ease);
}
.qa2-chip:hover { border-color: var(--qa-accent-line); color: var(--qa-ink); }
.qa2-chip.is-danger { color: var(--qa-danger); background: var(--qa-danger-soft); }
.qa2-chip.is-accent { color: var(--qa-accent); background: var(--qa-accent-soft); }
.qa2-chip.is-static { cursor: default; }
/* One chip in a set is lit; the others sit back as plain text so the choice
   reads at a glance instead of as several equal boxes. */
.qa2-chip[aria-pressed] { background: transparent; }
.qa2-chip.is-selected { background: var(--qa-accent-soft); border-color: var(--qa-accent-line); color: var(--qa-accent); }

/* The one accent-FILLED element on a surface. Used sparingly, by contract —
   design request §2: one accent, never decorative. */
.qa2-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--qa-s2);
  padding: var(--qa-s1) var(--qa-s3);
  border-radius: var(--qa-radius-sm);
  background: var(--qa-chip);
  color: var(--qa-ink-dim);
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
}
.qa2-badge.is-yours { background: var(--qa-accent); color: var(--qa-accent-ink); box-shadow: 0 0 18px -4px var(--qa-accent-glow); }

.qa2-meter { width: 96px; height: 4px; border-radius: var(--qa-radius-round); background: var(--qa-chip); overflow: hidden; }
.qa2-meter > span { display: block; height: 100%; border-radius: var(--qa-radius-round); background: var(--qa-ink-dim); transition: width var(--qa-dur-slow) var(--qa-ease); }

/* ---- hit points ------------------------------------------------------------
   Temporary hit points sit ON the bar as a hatched overlay rather than as a
   second number: they ARE hit points, and somebody reading their health should
   not have to add two figures together. */
.qa2-hpwrap { position: relative; height: 10px; border-radius: var(--qa-radius-round); background: var(--qa-chip); overflow: hidden; }
.qa2-hpfill { position: absolute; inset: 0 auto 0 0; border-radius: var(--qa-radius-round); background: var(--qa-success); transition: width var(--qa-dur-slow) var(--qa-ease); }
.qa2-hpfill.is-bloodied { background: var(--qa-danger); }
.qa2-hptemp {
  position: absolute;
  top: 0;
  bottom: 0;
  background-image: repeating-linear-gradient(115deg, var(--qa-gold) 0 2px, transparent 2px 6px);
  background-color: var(--qa-gold-soft);
}

/* ---- pips ------------------------------------------------------------------
   A countable track: death saves, spell slots, uses remaining. Filled reads as
   spent-or-held depending on the caller's tone class, which is why the base is
   an empty ring rather than a dot. */
.qa2-pips { display: flex; gap: var(--qa-s2); }
.qa2-savepip {
  width: 14px;
  height: 14px;
  border-radius: var(--qa-radius-round);
  border: var(--qa-hairline) solid var(--qa-ink-faint);
  background: transparent;
}
.qa2-savepip.is-success { background: var(--qa-success); border-color: var(--qa-success); }
.qa2-savepip.is-failure { background: var(--qa-danger); border-color: var(--qa-danger); }

/* ---- icon tiles and empty sockets -----------------------------------------
   A square you can act on, and a dashed square where one will go. Dashed means
   "not yours yet" everywhere in the app, so nothing already-owned is ever drawn
   dashed. */
.qa2-tile {
  position: relative;
  width: 46px;
  height: 46px;
  flex: none;
  display: grid;
  place-items: center;
  padding: 0;
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius);
  background: var(--qa-chip);
  cursor: pointer;
  transition: border-color var(--qa-dur-fast) var(--qa-ease), background var(--qa-dur-fast) var(--qa-ease), transform var(--qa-dur-fast) var(--qa-ease);
}
.qa2-tile:hover { border-color: var(--qa-accent-line); background: var(--qa-accent-soft); transform: translateY(-1px); }
.qa2-tile[aria-disabled="true"] { opacity: 0.5; cursor: not-allowed; }
.qa2-tile[aria-disabled="true"]:hover { border-color: var(--qa-glass-border); background: var(--qa-chip); transform: none; }
.qa2-glyph { flex: none; color: var(--qa-ink-dim); }
.qa2-tile:hover .qa2-glyph { color: var(--qa-accent); }
/* The one number allowed on a tile face: how many uses are left. "Have I still
   got one of these" must be answerable without hovering; "what is its damage
   die" need not be. */
.qa2-tile-badge {
  position: absolute;
  right: 3px;
  bottom: 1px;
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  color: var(--qa-ink-dim);
  line-height: 1;
}
.qa2-tile[aria-disabled="true"] .qa2-tile-badge { color: var(--qa-danger); }
/* Solid, never dashed — an overflowing item very much IS yours, it just does
   not fit. Tinted with the accent so it reads as a door, not a seventh icon. */
.qa2-tile.is-overflow { color: var(--qa-accent); border-style: solid; }
.qa2-tile.is-overflow:hover { background: var(--qa-accent-soft); border-color: var(--qa-accent); }

.qa2-socket {
  width: 46px;
  height: 46px;
  flex: none;
  display: grid;
  place-items: center;
  border: var(--qa-hairline) dashed var(--qa-glass-border);
  border-radius: var(--qa-radius);
  background: transparent;
  color: var(--qa-ink-faint);
  cursor: pointer;
  transition: color var(--qa-dur-fast) var(--qa-ease), border-color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-socket:hover { color: var(--qa-accent); border-color: var(--qa-accent-line); }

/* ---- the open line ---------------------------------------------------------
   The escape hatch, drawn as an ordinary row rather than a button in a corner:
   describing something should feel like the next option in a list, not like an
   admission the interface failed you (law 2). */
.qa2-open {
  display: flex;
  align-items: center;
  gap: var(--qa-s2);
  padding: var(--qa-s2) var(--qa-s3);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius);
  background: transparent;
  transition: border-color var(--qa-dur-fast) var(--qa-ease), background var(--qa-dur-fast) var(--qa-ease);
}
.qa2-open:focus-within { border-color: var(--qa-accent-line); background: var(--qa-chip); }
.qa2-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--qa-ink);
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-label);
}
.qa2-input::placeholder { color: var(--qa-ink-faint); }
.qa2-input[type="textarea"], textarea.qa2-input { resize: vertical; min-height: 64px; line-height: 1.45; }

/* ---- overlays -------------------------------------------------------------- */
.qa2-scrim { position: absolute; inset: 0; z-index: 5; background: var(--qa-scrim); border: none; padding: 0; cursor: pointer; animation: qa2-fade var(--qa-dur-fast) var(--qa-ease); }
.qa2-sheet {
  position: absolute;
  z-index: 6;
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius-lg);
  background: var(--qa-glass-solid);
  box-shadow: var(--qa-shadow-pop);
  display: flex;
  flex-direction: column;
  animation: qa2-rise var(--qa-dur) var(--qa-ease-out);
}
.qa2-sheet-head { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--qa-s3); padding: var(--qa-s4); border-bottom: var(--qa-hairline) solid var(--qa-glass-border); }
.qa2-sheet-body { padding: var(--qa-s4); overflow-y: auto; display: flex; flex-direction: column; gap: var(--qa-s3); scrollbar-width: thin; }
.qa2-rowline { display: flex; align-items: baseline; justify-content: space-between; gap: var(--qa-s3); padding-bottom: var(--qa-s1); border-bottom: var(--qa-hairline) solid var(--qa-glass-border); }
.qa2-rowline.is-sum { border-bottom: none; border-top: var(--qa-hairline) solid var(--qa-ink-faint); padding-top: var(--qa-s2); }

.qa2-tabs { display: flex; gap: var(--qa-s1); padding: 0 var(--qa-s4); border-bottom: var(--qa-hairline) solid var(--qa-glass-border); flex: none; }
.qa2-tab {
  padding: var(--qa-s3) var(--qa-s3);
  border: none;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--qa-ink-faint);
  cursor: pointer;
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  transition: color var(--qa-dur-fast) var(--qa-ease), border-color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-tab:hover { color: var(--qa-ink-dim); }
.qa2-tab.is-on { color: var(--qa-ink); border-bottom-color: var(--qa-accent); }
.qa2-tab[aria-disabled="true"] { opacity: 0.4; cursor: default; }

.qa2-menuitem {
  display: flex;
  flex-direction: column;
  gap: 1px;
  width: 100%;
  padding: var(--qa-s2) var(--qa-s3);
  border: var(--qa-hairline) solid transparent;
  border-radius: var(--qa-radius);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background var(--qa-dur-fast) var(--qa-ease), border-color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-menuitem:hover { background: var(--qa-chip); border-color: var(--qa-glass-border); }
.qa2-menuitem.is-on { background: var(--qa-accent-soft); border-color: var(--qa-accent-line); }

.qa2-seg { display: inline-flex; border: var(--qa-hairline) solid var(--qa-glass-border); border-radius: var(--qa-radius); overflow: hidden; }
.qa2-seg > button {
  padding: var(--qa-s2) var(--qa-s3);
  border: none;
  background: transparent;
  color: var(--qa-ink-dim);
  cursor: pointer;
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  transition: background var(--qa-dur-fast) var(--qa-ease), color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-seg > button + button { border-left: var(--qa-hairline) solid var(--qa-glass-border); }
.qa2-seg > button.is-on { background: var(--qa-accent-soft); color: var(--qa-accent); }
.qa2-step { display: inline-flex; align-items: center; border: var(--qa-hairline) solid var(--qa-glass-border); border-radius: var(--qa-radius); }
.qa2-step > button { width: 28px; height: 26px; border: none; background: transparent; color: var(--qa-ink-dim); cursor: pointer; font-family: var(--qa-font-mono); }
.qa2-step > button:hover { color: var(--qa-accent); }

/* ---- quality floor ---------------------------------------------------------
   Scoped by class-prefix rather than to one screen's root. The earlier version
   of these rules keyed off the play screen's own wrapper, which meant any
   surface using this layer OUTSIDE that screen silently lost its focus ring
   and its reduced-motion guarantee — the two things least likely to be noticed
   missing and most costly to omit. Matching on the prefix covers every surface
   built from this layer, wherever it is mounted. */
[class*="qa2-"]:focus-visible,
[class*="qa2-"] :focus-visible {
  outline: 2px solid var(--qa-accent);
  outline-offset: 2px;
  border-radius: var(--qa-radius-sm);
}
[class*="qa2-"] button { font: inherit; color: inherit; }
.qa2-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

@keyframes qa2-sweep { from { transform: scaleX(0); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes qa2-rise { from { transform: translateY(var(--qa-s3)); opacity: 0; } to { transform: none; opacity: 1; } }
@keyframes qa2-land { from { transform: scale(1.14); opacity: 0.4; } to { transform: none; opacity: 1; } }
@keyframes qa2-fade { from { opacity: 0; } to { opacity: 1; } }
@keyframes qa2-breathe { from { box-shadow: 0 0 0 3px var(--qa-accent-soft); } to { box-shadow: 0 0 0 7px var(--qa-accent-soft); } }

/*
 * The still equivalents. Because every rule above describes the FINISHED state
 * and the keyframes run from a hidden state to nothing, switching animation off
 * leaves each moving part correctly drawn — a swept accent stays swept, a
 * settled total stays settled, a ringed token keeps its ring. Nothing
 * disappears, which is what "design the reduced state" actually asks for.
 */
@media (prefers-reduced-motion: reduce) {
  [class*="qa2-"],
  [class*="qa2-"]::before,
  [class*="qa2-"]::after {
    animation: none !important;
    transition: none !important;
  }
  .qa2-tile:hover { transform: none; }
}
`;

/**
 * Injected by any surface built from this layer. Idempotent — duplicate
 * <style> tags are harmless, so a screen and a standalone primitive can both
 * render it without coordinating.
 */
export function DesignStyles(): ReactElement {
  return <style>{CSS}</style>;
}
