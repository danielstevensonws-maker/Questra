/**
 * v2/ScreenStyles — the one stylesheet for Player View v2.
 *
 * WHY A STYLESHEET AND NOT INLINE STYLES. v1's HUD is styled entirely inline,
 * which cost it three things v2 needs: real `:hover`/`:focus-visible` states
 * without a `useState` per tile, `@media (prefers-reduced-motion)` (design
 * request §8, non-negotiable), and pseudo-elements for the frame's hairlines
 * and the spine's timeline. Every value below is still a `--qa-*` token — the
 * HUD type-hygiene suite scans this file for hex, rgb(), literal durations and
 * numeric font sizes exactly as it scans the components.
 *
 * THE STILL-EQUIVALENT DISCIPLINE. Nothing here animates INTO its resting
 * state from a hidden one via a persistent transform. An element's plain CSS
 * IS the finished state, and the keyframes run FROM a hidden state TO nothing.
 * So the reduced-motion block can simply say `animation: none` and every
 * moving part is left correctly drawn rather than stuck at zero. That is what
 * "design the reduced state" means in practice.
 *
 * THE MAP IS THE HERO (owner direction, 2026-08-16). An earlier pass ran the
 * surfaces flush to the viewport edges, which turned the HUD into a frame and
 * the map into what was left over — a continuous C down the left, along the
 * bottom and up the right. That reads as chrome, and chrome is the wrong thing
 * to be looking at for three hours.
 *
 * So every surface is now a DISCRETE PANEL floating over a full-bleed map, held
 * off the edges by `--qa-hud-inset` and off each other by the spacing scale.
 * The map runs edge to edge underneath and shows between them. Nothing touches
 * anything else, and nothing touches the window.
 *
 * WHAT KEEPS SEPARATE PANELS FROM DISAGREEING is the one thing the v1 hub
 * learned the hard way: it was never the merging, it was the SHARED CHROME
 * CONTRACT. Every panel below is built from `.qa2-panel` and nowhere else —
 * one radius, one padding, one internal rhythm, one fill, one border, one
 * shadow. Add a surface through that class and it cannot drift.
 *
 * ONE EDITING HAZARD, paid for twice now: the CSS below is a template literal,
 * so a BACKTICK anywhere inside it — including inside a CSS comment, where
 * quoting a class name is the natural thing to do — closes the string and the
 * whole file stops parsing. Write class names bare in those comments. The
 * type-hygiene suite asserts this file carries exactly the two backticks that
 * open and close the literal, so the mistake now fails a test instead of a
 * build.
 */
import type { ReactElement } from 'react';

const CSS = `
.qa2-screen {
  --qa2-journal: 336px;
  --qa2-spine: 244px;
  --qa2-you: 244px;
  /* The collapsed journal is a pill sized to its own text, not a fixed box —
     this is an approximation used only to keep the action panel centred
     correctly while the journal is collapsed. Same imprecision the width
     override already carried before today; not new. */
  --qa2-journal-closed: 244px;
  position: relative;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  color: var(--qa-ink);
}

/* THE SHARED CHROME CONTRACT. One radius, one padding, one rhythm, one fill.
   Every floating surface on this screen is this class plus a position. */
.qa2-panel {
  position: absolute;
  z-index: 2;
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

/* ---- the ground: the map is the table surface, full bleed under everything --
   Now that the HUD floats, the map has to CARRY the screen rather than fill the
   hole in a frame. So the placeholder terrain is layered rather than flat: soft
   patches of the warm map tone break up the field, a major grid every five
   cells reads as a battle mat rather than as graph paper, and the vignette is
   pulled back to where it is doing legibility work and no further. All of it is
   still --qa-map-* tokens, so dropping a real terrain image in as the bottom
   layer changes nothing above it. */
.qa2-ground {
  position: absolute;
  inset: 0;
  z-index: 0;
  background-image:
    linear-gradient(to right, transparent calc(100% - var(--qa-hairline)), var(--qa-map-grid) calc(100% - var(--qa-hairline))),
    linear-gradient(to bottom, transparent calc(100% - var(--qa-hairline)), var(--qa-map-grid) calc(100% - var(--qa-hairline))),
    linear-gradient(to right, transparent calc(100% - var(--qa-hairline)), var(--qa-map-grid) calc(100% - var(--qa-hairline))),
    linear-gradient(to bottom, transparent calc(100% - var(--qa-hairline)), var(--qa-map-grid) calc(100% - var(--qa-hairline))),
    radial-gradient(34% 42% at 24% 30%, var(--qa-map-hi) 0%, transparent 68%),
    radial-gradient(28% 34% at 74% 60%, var(--qa-map-hi) 0%, transparent 70%),
    radial-gradient(42% 38% at 56% 88%, var(--qa-map-mid) 0%, transparent 72%),
    radial-gradient(30% 30% at 88% 18%, var(--qa-map-mid) 0%, transparent 74%),
    radial-gradient(130% 105% at 52% 36%, var(--qa-map-hi) 0%, var(--qa-map-mid) 42%, var(--qa-map-lo) 100%);
  background-size:
    290px 290px, 290px 290px,
    58px 58px, 58px 58px,
    100% 100%, 100% 100%, 100% 100%, 100% 100%, 100% 100%;
}
/* Legibility, not mood: §8 asks that glass survive a bright map, and the
   corners are where the panels sit. Enough to hold a panel's contrast, not so
   much that the room disappears. */
.qa2-ground::after {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(126% 108% at 50% 42%, transparent 62%, var(--qa-map-lo) 100%);
  opacity: 0.55;
}

.qa2-token {
  position: absolute;
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  margin: -23px 0 0 -23px;
  border-radius: var(--qa-radius-round);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  background: var(--qa-glass-solid);
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-label);
  color: var(--qa-ink-dim);
  cursor: pointer;
}
.qa2-token.is-ally { border-color: var(--qa-success); color: var(--qa-ink); }
.qa2-token.is-foe { border-color: var(--qa-danger); color: var(--qa-ink); }
.qa2-token.is-you { border-color: var(--qa-accent); box-shadow: 0 0 0 3px var(--qa-accent-soft); color: var(--qa-ink); }
.qa2-token.is-you.is-acting { animation: qa2-breathe var(--qa-dice-settle) var(--qa-ease) infinite alternate; }
.qa2-token.is-down { opacity: 0.55; }
.qa2-token-tag {
  position: absolute;
  top: 100%;
  margin-top: var(--qa-s1);
  padding: 0 var(--qa-s1);
  border-radius: var(--qa-radius-sm);
  background: var(--qa-glass-solid);
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  white-space: nowrap;
}
.qa2-token-tag.is-hurt { color: var(--qa-danger); }
.qa2-token-tag.is-down { color: var(--qa-ink-faint); }

/* ---- where each panel sits ------------------------------------------------ */

/* The scene's name floats free at the top, centred over the map — the only
   surface that is not a rectangle of controls. */
.qa2-scene {
  top: var(--qa-hud-inset);
  left: 50%;
  transform: translateX(-50%);
  align-items: center;
  gap: var(--qa-s1);
  padding: var(--qa-s2) var(--qa-s5);
  text-align: center;
}
/* The frame controls are their own cluster, not a bar. */
.qa2-controls {
  position: absolute;
  z-index: 2;
  top: var(--qa-hud-inset);
  right: var(--qa-hud-inset);
  display: flex;
  gap: var(--qa-s2);
}
.qa2-spine {
  top: var(--qa-hud-inset);
  left: var(--qa-hud-inset);
  width: var(--qa2-spine);
  max-height: calc(100% - var(--qa-hud-inset) * 2 - 240px);
  padding: var(--qa-s3) 0;
  gap: 0;
}
.qa2-journal {
  right: var(--qa-hud-inset);
  bottom: var(--qa-hud-inset);
  width: var(--qa2-journal);
  height: min(544px, calc(100% - var(--qa-hud-inset) * 2 - 64px));
  padding: var(--qa-s3) 0 0;
  gap: 0;
}
/* The near edge is TWO independently anchored panels, not a row: who you are
   sits in the bottom-left corner, and the bar you ACT from is centred on the
   screen. Centring it is what every game with an action bar does, and for the
   same reason — it is the one surface your hand returns to, so it belongs under
   the middle of your attention rather than off to one side. Both sit on the
   same baseline. */
.qa2-you {
  left: var(--qa-hud-inset);
  bottom: var(--qa-hud-inset);
  width: var(--qa2-you);
}
/*
 * CENTRED BETWEEN ITS NEIGHBOURS, NOT ON THE VIEWPORT (owner direction,
 * 2026-08-19). left:50% plus a translateX(-50%) centres on the whole screen —
 * but the You panel (244px) and the journal (336px) are different widths, so
 * centring on the screen left MORE gap on one side than the other by exactly
 * that 92px difference. It read as leaning toward the journal.
 *
 * The fix is the standard CSS trick for centring a fixed-width box in an
 * ASYMMETRIC track: set left and right to the real edges of the two neighbour
 * panels (not the viewport edges), give the box an explicit width, and set
 * its side margins to auto. The browser splits whatever space is left over
 * EQUALLY between the two auto margins — that is specified behaviour
 * (CSS2.1 section 10.3.7), not an approximation, so the gap to the You panel
 * and the gap to the journal end up identical regardless of how unequal the
 * two neighbours are.
 */
.qa2-act {
  left: calc(var(--qa-hud-inset) + var(--qa2-you));
  right: calc(var(--qa-hud-inset) + var(--qa2-journal));
  bottom: var(--qa-hud-inset);
  /* 820px, up from the first pass's 600px (owner direction, 2026-08-18): wide
     enough that Action's solo row and Bonus+Reaction's shared one both show
     real breathing room, while still leaving clear map either side — the
     modest-widen choice, not the full-bleed-bar one. Below 820px of actual
     track space the width shrinks to fit it exactly, so the margins never go
     negative. */
  width: min(820px, calc(100% - (var(--qa-hud-inset) + var(--qa2-you)) - (var(--qa-hud-inset) + var(--qa2-journal))));
  margin: 0 auto;
  min-width: 0;
}
.qa2-screen.is-journal-closed .qa2-act {
  right: calc(var(--qa-hud-inset) + var(--qa2-journal-closed));
  width: min(820px, calc(100% - (var(--qa-hud-inset) + var(--qa2-you)) - (var(--qa-hud-inset) + var(--qa2-journal-closed))));
}
/* The collapsed pill sits in exactly the same track, for the same reason —
   collapsing the action panel should not make it jump sideways. */
.qa2-pill.is-act {
  left: calc(var(--qa-hud-inset) + var(--qa2-you));
  right: calc(var(--qa-hud-inset) + var(--qa2-journal));
  bottom: var(--qa-hud-inset);
  width: fit-content;
  margin: 0 auto;
}
.qa2-screen.is-journal-closed .qa2-pill.is-act { right: calc(var(--qa-hud-inset) + var(--qa2-journal-closed)); }

/* Overlays float over everything; the panels stay visible around them, so you
   never lose sight of the table while you read an answer. */
.qa2-over { position: absolute; inset: 0; z-index: 6; pointer-events: none; }
.qa2-over > * { pointer-events: auto; }

/* THE SIGNATURE, part two: when the round arrives at you, the spine's accent
   continues along the top edge of the panel you act from. One accent, one
   journey — and it lands on a panel edge just as happily as on a frame edge. */
.qa2-act::before {
  content: "";
  position: absolute;
  inset: 0 var(--qa-s5) auto var(--qa-s5);
  height: 2px;
  border-radius: var(--qa-radius-round);
  background: linear-gradient(to right, var(--qa-accent), var(--qa-accent-line) 40%, transparent 82%);
  transform-origin: left center;
  opacity: 0;
}
.qa2-act.is-yours::before { opacity: 1; animation: qa2-sweep var(--qa-dur-slow) var(--qa-ease-out); }

/* ---- the round spine ------------------------------------------------------ */
.qa2-spine-head, .qa2-journal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--qa-s2);
  padding: 0 var(--qa-s3) var(--qa-s3) var(--qa-s4);
  border-bottom: var(--qa-hairline) solid var(--qa-glass-border);
  flex: none;
}
/* Hugs its contents rather than stretching: a floating panel with a hole in the
   middle of it looks like a bug, not like breathing room. The max-height on the
   panel still caps a long initiative order, and then this scrolls. */
.qa2-cast { flex: 0 1 auto; min-height: 0; overflow-y: auto; list-style: none; margin: 0; padding: 0; scrollbar-width: thin; }

/* Collapsed, a rail becomes a small pill rather than a strip welded to the
   window edge — a floating HUD should not grow an edge when it shrinks.
   NAMED qa2-pill, NOT qa2-tab: the folio's tab buttons already own that name,
   and when these two collided the pill's position:absolute stacked every folio
   tab on top of the next. */
.qa2-pill {
  position: absolute;
  z-index: 2;
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
.qa2-pill.is-spine { top: var(--qa-hud-inset); left: var(--qa-hud-inset); }
.qa2-pill.is-journal { right: var(--qa-hud-inset); bottom: var(--qa-hud-inset); }
.qa2-pill-dot { width: 6px; height: 6px; flex: none; border-radius: var(--qa-radius-round); background: var(--qa-accent); }

.qa2-notch {
  position: relative;
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr);
  align-items: center;
  gap: var(--qa-s3);
  width: 100%;
  padding: var(--qa-s2) var(--qa-s3) var(--qa-s2) var(--qa-s4);
  border: none;
  background: transparent;
  text-align: left;
  cursor: default;
  transition: background var(--qa-dur) var(--qa-ease), opacity var(--qa-dur) var(--qa-ease);
}
/* The timeline itself: one hairline per notch, stacked into a continuous line.
   Burned segments carry the accent, upcoming ones the frame's own border. */
.qa2-notch::before {
  content: "";
  position: absolute;
  left: calc(var(--qa-s4) + 13px);
  top: 0;
  bottom: 0;
  width: var(--qa-hairline);
  background: var(--qa-ink-faint);
}
.qa2-notch.is-acted::before, .qa2-notch.is-acting::before { background: var(--qa-accent); }
/* The line stops AT the first and last dots rather than running off the ends.
   Scoped through the list item, not the notch: each notch is the only child of
   its own list item, so a :first-child on the notch matches every one of them,
   which collapsed the whole timeline to nothing. */
.qa2-cast > li:first-child .qa2-notch::before { top: 50%; }
.qa2-cast > li:last-child .qa2-notch::before { bottom: 50%; }

.qa2-dot {
  position: relative;
  justify-self: center;
  width: 7px;
  height: 7px;
  border-radius: var(--qa-radius-round);
  border: var(--qa-hairline) solid var(--qa-ink-faint);
  background: var(--qa-glass-solid);
}
.qa2-notch.is-acted .qa2-dot { border-color: var(--qa-accent-line); background: var(--qa-accent-line); }
.qa2-notch.is-acting .qa2-dot {
  width: 11px;
  height: 11px;
  border-color: var(--qa-accent);
  background: var(--qa-accent);
  box-shadow: 0 0 0 4px var(--qa-accent-soft);
}
.qa2-notch.is-acted { opacity: 0.42; filter: saturate(0.35); }
.qa2-notch.is-acting { background: linear-gradient(to right, var(--qa-accent-soft), transparent 78%); }
.qa2-notch.is-down { opacity: 0.5; }
.qa2-notch.is-you { }
.qa2-notch.is-you::after {
  content: "";
  position: absolute;
  left: 0;
  top: var(--qa-s1);
  bottom: var(--qa-s1);
  width: 2px;
  background: var(--qa-ink-faint);
}
.qa2-notch.is-you.is-acting::after { background: var(--qa-accent); }

.qa2-cue {
  display: block;
  padding: var(--qa-s2) var(--qa-s4) var(--qa-s3);
  border-top: var(--qa-hairline) solid var(--qa-glass-border);
  flex: none;
}

/* ---- the near edge: two panels, never one bar ------------------------------ */
.qa2-bay { display: flex; flex-direction: column; gap: var(--qa-s2); min-width: 0; }

.qa2-portrait {
  display: flex;
  align-items: center;
  gap: var(--qa-s3);
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  border-radius: var(--qa-radius);
}
.qa2-portrait:hover .qa2-portrait-name { color: var(--qa-accent); }
.qa2-portrait-name { transition: color var(--qa-dur-fast) var(--qa-ease); }

.qa2-hpwrap { position: relative; height: 10px; border-radius: var(--qa-radius-round); background: var(--qa-chip); overflow: hidden; }
.qa2-hpfill { position: absolute; inset: 0 auto 0 0; border-radius: var(--qa-radius-round); background: var(--qa-success); transition: width var(--qa-dur-slow) var(--qa-ease); }
.qa2-hpfill.is-bloodied { background: var(--qa-danger); }
/* Temporary HP sits ON the bar as a hatched overlay rather than as a second
   number: it is hit points, so it belongs on the hit-point bar. */
.qa2-hptemp {
  position: absolute;
  top: 0;
  bottom: 0;
  background-image: repeating-linear-gradient(115deg, var(--qa-gold) 0 2px, transparent 2px 6px);
  background-color: var(--qa-gold-soft);
}

.qa2-abils { display: flex; gap: var(--qa-s1); }
.qa2-abil {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  padding: var(--qa-s1) 0;
  border: var(--qa-hairline) solid transparent;
  border-radius: var(--qa-radius-sm);
  background: transparent;
  cursor: pointer;
  transition: background var(--qa-dur-fast) var(--qa-ease), border-color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-abil:hover { background: var(--qa-chip); border-color: var(--qa-glass-border); }

/* ---- the action rows -------------------------------------------------------
   ICON TILES on TWO rows (owner direction, 2026-08-18): Bonus and Reaction
   share the top, Action sits alone on the bottom — nearest you, because it is
   the row your hand returns to on nearly every turn, and the two you only
   consult sometimes stack above it. v1's ActionBar split the same way for the
   same stated reason ("Action on its own — usually the busiest economy"); this
   keeps that reasoning and flips which end Action sits on. Icons rather than
   named tiles for the reason v1 never had to weigh: a named tile costs roughly
   three times the width, and the map is supposed to be what you are looking
   at. The tile's name and numbers live in the detail strip below instead,
   fixed height and never empty, so the icon is a shortcut for a player who
   already knows it, never the only way to find out what it is. */
.qa2-econ-stack { display: flex; flex-direction: column; gap: var(--qa-s3); min-width: 0; }
.qa2-econ-row { display: flex; align-items: flex-start; gap: var(--qa-s4); min-width: 0; flex-wrap: wrap; }
/* A hairline between the two groups, not between every row — it marks "these
   are read, that one is operated," the same distinction the divider inside
   the top row marks between Bonus and Reaction individually. */
.qa2-econ-row.is-primary { padding-top: var(--qa-s3); border-top: var(--qa-hairline) solid var(--qa-glass-border); }
.qa2-econ { display: flex; flex-direction: column; gap: var(--qa-s2); }
.qa2-econ + .qa2-econ { padding-left: var(--qa-s4); border-left: var(--qa-hairline) solid var(--qa-glass-border); }
.qa2-econ-label { display: flex; align-items: center; gap: var(--qa-s2); }
.qa2-pip {
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: var(--qa-radius-round);
  border: var(--qa-hairline) solid var(--qa-ink-faint);
  background: var(--qa-ink-faint);
}
.qa2-pip.is-spent { background: transparent; }
/* Wrap is a safety net, not the intent: the socket COUNT below is tuned to
   fill each row's real width at the reference size without wrapping, so a
   fresh character's row reads as genuinely full of room to grow. If the
   window narrows past that, wrapping to a second line keeps every socket a
   real, focusable, screen-reader-visible button — the alternative (rendering
   a big fixed number and clipping the overflow with an overflow:hidden rule)
   leaves invisible buttons still sitting in the tab order, which is a real
   accessibility bug, not a visual nicety being skipped. */
.qa2-slots { display: flex; flex-wrap: wrap; gap: var(--qa-s2); row-gap: var(--qa-s2); }

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
/* Uses left, in the corner. The only number that survives onto a tile face —
   because "have I still got one of these" has to be answerable without hovering. */
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

/* The overflow tile: a solid square like any other, never dashed — dashed
   already means "not yours yet" (the socket, below), and these abilities very
   much ARE yours, just not on the bar. Text-only, tinted with the accent so it
   reads as a door rather than a seventh icon competing with the real six. */
.qa2-tile.is-overflow { color: var(--qa-accent); border-style: solid; }
.qa2-tile.is-overflow:hover { background: var(--qa-accent-soft); border-color: var(--qa-accent); }

/* A dashed socket is a progression slot, not filler — "room to grow", §4.11. */
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

/* Fixed-height, so nothing above it ever reflows as the mouse sweeps the row. */
.qa2-detail {
  min-height: 32px;
  display: flex;
  align-items: center;
  gap: var(--qa-s2);
  padding: var(--qa-s1) 0;
  border-top: var(--qa-hairline) solid var(--qa-glass-border);
}

/* THE OPEN LINE — the app's escape hatch, drawn as the last option in the list. */
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

/* ---- where a roll lands ----------------------------------------------------
   A card that rises directly above the panel you rolled from, left-aligned with
   it: the same place every time, but only occupying the map while there is
   something to say. It used to be a permanent third bay, which meant a column
   of the HUD stood empty between rolls. */
.qa2-roll {
  position: absolute;
  bottom: calc(100% + var(--qa-s3));
  left: 0;
  width: 268px;
  animation: qa2-rise var(--qa-dur) var(--qa-ease-out);
}
.qa2-result { display: flex; align-items: baseline; gap: var(--qa-s3); }
.qa2-verdict {
  display: inline-flex;
  align-self: flex-start;
  padding: 1px var(--qa-s2);
  border-radius: var(--qa-radius-sm);
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
}
.qa2-verdict.is-hit { background: var(--qa-success-soft); color: var(--qa-success); }
.qa2-verdict.is-miss { background: var(--qa-danger-soft); color: var(--qa-danger); }
.qa2-verdict.is-neutral { background: var(--qa-chip); color: var(--qa-ink-dim); }
.qa2-total { animation: qa2-land var(--qa-dur) var(--qa-ease-out); }

/* ---- death saves ---------------------------------------------------------- */
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

/* ---- journal -------------------------------------------------------------- */
.qa2-feed { flex: 1; min-height: 0; overflow-y: auto; padding: var(--qa-s3) var(--qa-s4); display: flex; flex-direction: column; gap: var(--qa-s4); scrollbar-width: thin; }
.qa2-notes { padding: var(--qa-s3); border: var(--qa-hairline) solid var(--qa-glass-border); border-radius: var(--qa-radius); background: var(--qa-chip); display: flex; flex-direction: column; gap: var(--qa-s2); }
.qa2-entry { display: flex; flex-direction: column; gap: var(--qa-s1); }
.qa2-rollrow {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--qa-s3);
  width: 100%;
  padding: var(--qa-s2) var(--qa-s3);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius);
  background: var(--qa-chip);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--qa-dur-fast) var(--qa-ease);
}
.qa2-rollrow:hover { border-color: var(--qa-accent-line); }
.qa2-breakdown { list-style: none; margin: 0; padding: var(--qa-s2) var(--qa-s3) 0; display: flex; flex-direction: column; gap: 2px; }
.qa2-breakdown li { display: flex; justify-content: space-between; gap: var(--qa-s3); }
.qa2-suggestion {
  padding: var(--qa-s3);
  border: var(--qa-hairline) solid var(--qa-accent-line);
  border-radius: var(--qa-radius);
  background: var(--qa-accent-soft);
  display: flex;
  flex-direction: column;
  gap: var(--qa-s2);
}
.qa2-react { display: flex; gap: var(--qa-s1); padding: 0 var(--qa-s4) var(--qa-s2); flex: none; }
.qa2-reactbtn {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border: var(--qa-hairline) solid transparent;
  border-radius: var(--qa-radius);
  background: transparent;
  cursor: pointer;
  transition: transform var(--qa-dur-fast) var(--qa-ease), background var(--qa-dur-fast) var(--qa-ease);
}
.qa2-reactbtn:hover { background: var(--qa-chip); transform: translateY(-2px); }
.qa2-compose { display: flex; gap: var(--qa-s2); padding: var(--qa-s3) var(--qa-s4); border-top: var(--qa-hairline) solid var(--qa-glass-border); flex: none; }

/* ---- controls, chips, the explain affordance ------------------------------ */
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
 * EVERY NUMBER IS TAPPABLE (§5). v1 hung a "?" circle beside each value; at v2's
 * density that is a field of punctuation. Instead the readout's own LABEL carries
 * a dotted underline — the long-standing "there is more behind this word" mark —
 * and the whole readout is the button. It costs no space, scales to the log's
 * breakdown rows, and reads as annotation rather than chrome.
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
/* What you are aimed at is the one target chip that is lit. The others sit back
   as plain text so the choice reads at a glance instead of as two equal boxes. */
.qa2-chip[aria-pressed] { background: transparent; }
.qa2-chip.is-selected { background: var(--qa-accent-soft); border-color: var(--qa-accent-line); color: var(--qa-accent); }

/* The turn badge is the only accent-FILLED element in the frame. */
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
.qa2-meter > span { display: block; height: 100%; border-radius: var(--qa-radius-round); background: var(--qa-ink-dim); transition: width var(--qa-dur) var(--qa-ease); }

/* ---- overlays ------------------------------------------------------------- */
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

/* ---- quality floor -------------------------------------------------------- */
.qa2-screen :focus-visible { outline: 2px solid var(--qa-accent); outline-offset: 2px; border-radius: var(--qa-radius-sm); }
.qa2-screen button { font: inherit; color: inherit; }
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
 * leaves each moving part correctly drawn — the accent lead is fully swept, the
 * total is at rest, your token keeps its ring. Nothing disappears.
 */
@media (prefers-reduced-motion: reduce) {
  .qa2-screen *,
  .qa2-screen *::before,
  .qa2-screen *::after {
    animation: none !important;
    transition: none !important;
  }
  .qa2-tile:hover { transform: none; }
  .qa2-reactbtn:hover { transform: none; }
}

/*
 * Below 1280px the frame gives up the spine first (it is the most compressible —
 * the near edge still carries the turn badge), then the journal. Desktop-first
 * is the product's stated platform, so these are graceful floors, not a phone
 * layout.
 */
@media (max-width: 1439px) {
  .qa2-screen { --qa2-journal: 300px; --qa2-spine: 228px; }
}
@media (max-width: 1179px) {
  /* The panels start to crowd the map they are meant to be floating over, so
     the two REFERENCE surfaces give ground first. The panel you act from keeps
     its size at every width — it is the only one anybody operates. */
  .qa2-screen { --qa2-journal: 268px; --qa2-spine: 208px; }
  .qa2-you { width: 212px; }
  .qa2-spine { max-height: calc(100% - var(--qa-hud-inset) * 2 - 268px); }
}
`;

/** Injected once per screen. Idempotent — duplicate <style> tags are harmless. */
export function ScreenStyles(): ReactElement {
  return <style>{CSS}</style>;
}
