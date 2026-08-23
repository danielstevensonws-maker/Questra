/**
 * v2/ScreenStyles — the Player View's own layout, and nothing else.
 *
 * WHAT IS AND IS NOT HERE. Chrome and behaviour live in the shared design
 * layer (src/design/styles.tsx): what a panel is made of, what its controls
 * look like, the focus ring, the reduced-motion guarantee, the keyframes. This
 * file owns only what is true of THIS screen — where each panel sits, the map
 * ground beneath them, and the internals of the four surfaces the play screen
 * invented (the round spine, the near edge, the action rows, the journal).
 *
 * The division is worth keeping honest, because it is what lets an authoring
 * surface reuse .qa2-panel without inheriting a play screen's absolute
 * positioning. Chrome is shared; placement is local. If a rule you are about
 * to add would be equally true of a wizard step or a compendium entry, it
 * belongs in the design layer, not here.
 *
 * THE MAP IS THE HERO (owner direction, 2026-08-16). An earlier pass ran these
 * surfaces flush to the window, which made the HUD a frame — a continuous C
 * down the left, along the bottom and up the right — and made the map what was
 * left over. Chrome is the wrong thing to look at for three hours. So the map
 * is full bleed and every surface is a DISCRETE PANEL floating over it, held
 * off the window by --qa-hud-inset and off each other by the spacing scale.
 *
 * ONE EDITING HAZARD, paid for repeatedly: the CSS below is a template
 * literal, so a BACKTICK anywhere inside it — including inside a CSS comment,
 * where quoting a class name is the natural thing to do — closes the string and
 * the whole file stops parsing. Write class names bare in those comments. The
 * type-hygiene suite asserts this file carries exactly the two backticks that
 * open and close the literal.
 */
import type { ReactElement } from 'react';
import { DesignStyles } from '../../design/index.js';

const CSS = `
/* Every floating panel on this screen is the shared .qa2-panel chrome plus a
   placement. Positioning is applied here rather than in the design layer so
   the same chrome can sit in an ordinary document flow elsewhere. */
.qa2-scene, .qa2-spine, .qa2-journal, .qa2-you, .qa2-act { position: absolute; z-index: 2; }
.qa2-pill.is-spine, .qa2-pill.is-journal, .qa2-pill.is-act { position: absolute; z-index: 2; }

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
.qa2-pill.is-spine { top: var(--qa-hud-inset); left: var(--qa-hud-inset); }
.qa2-pill.is-journal { right: var(--qa-hud-inset); bottom: var(--qa-hud-inset); }

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

/* Fixed-height, so nothing above it ever reflows as the mouse sweeps the row. */
.qa2-detail {
  min-height: 32px;
  display: flex;
  align-items: center;
  gap: var(--qa-s2);
  padding: var(--qa-s1) 0;
  border-top: var(--qa-hairline) solid var(--qa-glass-border);
}

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

/* ---- The DM screen ----------------------------------------------------------
   Same map, same glass, same anchors as the player screen — a DM glancing
   between two devices should find the same things in the same places. What
   differs is what the panels HOLD.

   Two panels, not five. The obvious build gives the DM a box per concern
   (combatants, secrets, prompts, effects) and produces a wall nobody can read
   under time pressure. Everything about the creatures lives on the creatures;
   everything about the story lives in the journal. */
.qa-dm { position: relative; height: 100vh; overflow: hidden; }

.qa-dm-scene-name {
  font-family: var(--qa-font-display);
  font-size: var(--qa-text-lg);
  color: var(--qa-ink);
  line-height: 1.1;
}
.qa-dm-scene-state {
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--qa-ink-faint);
}

/* The table sits where the round spine sits on a player's screen: same corner,
   same width, because it answers the same question — who is here and in what
   order — for somebody who needs more of the answer. */
.qa-dm-table {
  position: absolute;
  z-index: 2;
  top: var(--qa-hud-inset);
  left: var(--qa-hud-inset);
  width: 300px;
  max-height: calc(100% - var(--qa-hud-inset) * 2);
  padding: var(--qa-s3) 0;
  gap: 0;
  overflow-y: auto;
  scrollbar-width: thin;
}

.qa-dm-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--qa-s3);
  padding: 0 var(--qa-s4) var(--qa-s3);
  border-bottom: var(--qa-hairline) solid var(--qa-glass-border);
}
.qa-dm-kicker {
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--qa-ink-faint);
}
.qa-dm-away {
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  color: var(--qa-ink-faint);
}

.qa-dm-list { list-style: none; margin: 0; padding: var(--qa-s2) var(--qa-s2) 0; display: flex; flex-direction: column; gap: 2px; }

/* A row is a button because it spotlights — tap somebody to bring them forward
   on the map. Two lines: who they are and how they are, then whose they are. */
.qa-dm-row {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--qa-s2) var(--qa-s3);
  text-align: left;
  background: none;
  border: var(--qa-hairline) solid transparent;
  border-left: 2px solid transparent;
  border-radius: var(--qa-radius);
  cursor: pointer;
  transition: background var(--qa-dur) var(--qa-ease), border-color var(--qa-dur) var(--qa-ease);
}
.qa-dm-row:hover { background: var(--qa-chip); }
.qa-dm-row.is-spotlit { background: var(--qa-chip); border-color: var(--qa-glass-border); }
/* THE ACCENT MEANS "NEEDS YOU" ON THIS SCREEN. A player's screen spends it on
   YOU; a DM has no token, so it marks the thing waiting on a decision. */
.qa-dm-row.is-acting { border-left-color: var(--qa-accent); background: var(--qa-accent-soft); }

.qa-dm-row-top { display: flex; align-items: baseline; justify-content: space-between; gap: var(--qa-s3); }
.qa-dm-name { font-family: var(--qa-font-display); font-size: var(--qa-text-body); color: var(--qa-ink); }
/* Exact numbers for everyone — the difference between this screen and a
   player's, where an enemy is only ever a word. */
.qa-dm-hp {
  flex: none;
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-label);
  color: var(--qa-ink-dim);
  font-variant-numeric: tabular-nums;
}
.qa-dm-row.is-acting .qa-dm-hp { color: var(--qa-accent); }

.qa-dm-row-bottom { display: flex; align-items: baseline; gap: var(--qa-s2); flex-wrap: wrap; }
.qa-dm-who, .qa-dm-status, .qa-dm-away-tag {
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
}
.qa-dm-who { color: var(--qa-ink-faint); }
.qa-dm-status { color: var(--qa-danger); }
.qa-dm-away-tag { color: var(--qa-ink-faint); opacity: 0.7; }

.qa-dm-empty {
  margin: 0;
  padding: var(--qa-s4);
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-label);
  line-height: 1.5;
  color: var(--qa-ink-faint);
}

/* The journal takes the same corner and width as a player's, for the same
   reason the table does — muscle memory across two screens is worth more than
   a novel layout. */
.qa-dm-journal {
  position: absolute;
  z-index: 2;
  right: var(--qa-hud-inset);
  bottom: var(--qa-hud-inset);
  width: 380px;
  height: min(620px, calc(100% - var(--qa-hud-inset) * 2));
  padding: var(--qa-s3) 0 0;
  gap: 0;
  display: flex;
  flex-direction: column;
}
.qa-dm-log {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  padding: var(--qa-s3) var(--qa-s4);
  display: flex;
  flex-direction: column;
  gap: var(--qa-s3);
}
.qa-dm-line {
  margin: 0;
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-label);
  line-height: 1.55;
  color: var(--qa-ink);
}
.qa-dm-line-who {
  display: block;
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--qa-ink-faint);
}

/* One composer, three jobs: narrate, speak in character, ask the assistant.
   There is no separate chat box, so a DM never has to decide which field a
   sentence belongs in. */
.qa-dm-compose {
  flex: none;
  display: flex;
  gap: var(--qa-s2);
  padding: var(--qa-s3) var(--qa-s4);
  border-top: var(--qa-hairline) solid var(--qa-glass-border);
}
.qa-dm-input {
  flex: 1;
  min-width: 0;
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-label);
  padding: var(--qa-s2) var(--qa-s3);
  color: var(--qa-ink);
  background: var(--qa-chip);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius);
}
.qa-dm-input::placeholder { color: var(--qa-ink-faint); }
.qa-dm-input:focus { outline: none; border-color: var(--qa-accent-line); }
.qa-dm-send { flex: none; }
.qa-dm-send:disabled { opacity: 0.4; cursor: not-allowed; }

@media (max-width: 900px) {
  /* Stacked rather than floating: two overlapping panels on a phone is two
     panels you cannot read. */
  .qa-dm { height: auto; overflow: visible; }
  .qa-dm-table, .qa-dm-journal {
    position: static;
    width: auto;
    max-height: none;
    height: auto;
    margin: var(--qa-s3);
  }
  .qa-dm-log { max-height: 320px; }
}



/* ---- running the fight -----------------------------------------------------
   The controls that move the whole table sit together, top-right, because they
   are one question: is this a fight, and whose turn is it? */
.qa-dm-controls { display: flex; align-items: center; gap: var(--qa-s2); }
.qa-dm-run { flex: none; }

/* ---- the prompt dock -------------------------------------------------------
   Centre-bottom, over the map, because a prompt is the one thing on this screen
   that must be answered before anything else happens. Everything else on the
   DM's screen can wait; this cannot, so it takes the position the eye returns
   to and nothing else is allowed to sit there. */
.qa-prompt {
  position: absolute;
  z-index: 4;
  left: 50%;
  bottom: var(--qa-hud-inset);
  transform: translateX(-50%);
  width: min(440px, calc(100% - var(--qa-hud-inset) * 2));
  padding: var(--qa-s4);
  display: flex;
  flex-direction: column;
  gap: var(--qa-s3);
  border-color: var(--qa-accent-line);
}
.qa-prompt-head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--qa-s3); }
.qa-prompt-kind {
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--qa-accent);
}
.qa-prompt-clock {
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-label);
  color: var(--qa-ink-faint);
  font-variant-numeric: tabular-nums;
}
/* Ten seconds left is the moment it stops being information and starts being
   pressure, so that is where the colour changes. */
.qa-prompt-clock.is-urgent { color: var(--qa-danger); }
.qa-prompt-context {
  margin: 0;
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-body);
  line-height: 1.5;
  color: var(--qa-ink);
}
.qa-prompt-options { display: flex; flex-wrap: wrap; align-items: center; gap: var(--qa-s2); }
.qa-prompt-take { display: inline-flex; align-items: baseline; gap: var(--qa-s2); }
.qa-prompt-cost {
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  opacity: 0.75;
}
.qa-prompt-queued {
  margin: 0;
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--qa-ink-faint);
}

/* ---- what only you know ----------------------------------------------------
   A drawer inside the journal rather than a panel of its own: it holds only the
   things with no creature to sit on, and it opens where a DM is already typing. */
.qa-dm-drawer-toggle {
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--qa-ink-faint);
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}
.qa-dm-drawer-toggle:hover { color: var(--qa-accent); }
.qa-dm-drawer {
  flex: none;
  padding: var(--qa-s3) var(--qa-s4);
  border-bottom: var(--qa-hairline) solid var(--qa-glass-border);
  background: var(--qa-chip);
}
.qa-dm-drawer-note {
  margin: 0 0 var(--qa-s2);
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--qa-ink-faint);
}
.qa-dm-whisper { display: flex; flex-direction: column; gap: var(--qa-s2); }
.qa-dm-select {
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-label);
  padding: var(--qa-s2) var(--qa-s3);
  color: var(--qa-ink);
  background: var(--qa-glass);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius);
}

/* Tones in the journal. A whisper is set apart because reading one aloud by
   mistake is a real way to spoil a secret. */
.qa-dm-line.is-chat { color: var(--qa-accent); }
.qa-dm-line.is-roll .qa-dm-line-who { color: var(--qa-ink-dim); }
.qa-dm-line.is-system { color: var(--qa-ink-faint); }

/* ---- the atmosphere console ------------------------------------------------
   Bottom-left, opposite the journal, collapsed to a single pill. A DM's
   attention is the scarcest thing at the table; an open panel of effects is a
   tab open on a decision nobody is making. */
.qa-console {
  position: absolute;
  z-index: 3;
  left: var(--qa-hud-inset);
  bottom: var(--qa-hud-inset);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--qa-s2);
}
.qa-console-toggle { flex: none; }
.qa-console-panel { width: 280px; padding: var(--qa-s3); display: flex; flex-direction: column; gap: var(--qa-s3); }
.qa-console-note {
  margin: 0;
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--qa-ink-faint);
  line-height: 1.4;
}
.qa-console-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--qa-s2); }
.qa-console-effect {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--qa-s2) var(--qa-s3);
  text-align: left;
  background: var(--qa-chip);
  border: var(--qa-hairline) solid var(--qa-glass-border);
  border-radius: var(--qa-radius);
  cursor: pointer;
  transition: border-color var(--qa-dur) var(--qa-ease), background var(--qa-dur) var(--qa-ease);
}
.qa-console-effect:hover { border-color: var(--qa-accent-line); background: var(--qa-accent-soft); }
.qa-console-label { font-family: var(--qa-font-body); font-size: var(--qa-text-label); color: var(--qa-ink); }
.qa-console-hint {
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  color: var(--qa-ink-faint);
}

@media (max-width: 900px) {
  .qa-prompt, .qa-console { position: static; transform: none; width: auto; margin: var(--qa-s3); }
  .qa-console-panel { width: auto; }
}


/* ---- the compendium --------------------------------------------------------
   Opens OVER the table, never instead of it: looking a rule up must not cost
   you the game. The map, the log and whose turn it is all stay where they were. */
.qa-comp {
  position: absolute;
  inset: 0;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--qa-s4);
  background: var(--qa-scrim);
}
.qa-comp-panel {
  width: min(560px, 100%);
  max-height: 100%;
  padding: var(--qa-s4);
  display: flex;
  flex-direction: column;
  gap: var(--qa-s3);
  overflow: hidden;
}
.qa-comp-head { display: flex; align-items: baseline; justify-content: space-between; }
.qa-comp-search { flex: none; }
.qa-comp-types { display: flex; flex-wrap: wrap; gap: var(--qa-s2); flex: none; }
.qa-comp-types .is-on { border-color: var(--qa-accent-line); color: var(--qa-accent); }

.qa-comp-list {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  scrollbar-width: thin;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.qa-comp-row {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--qa-s2) var(--qa-s3);
  text-align: left;
  background: none;
  border: var(--qa-hairline) solid transparent;
  border-radius: var(--qa-radius);
  cursor: pointer;
  transition: background var(--qa-dur) var(--qa-ease), border-color var(--qa-dur) var(--qa-ease);
}
.qa-comp-row:hover { background: var(--qa-chip); border-color: var(--qa-glass-border); }
.qa-comp-row-name { font-family: var(--qa-font-display); font-size: var(--qa-text-body); color: var(--qa-ink); }
/* The plain line is the one that teaches, so it is the one the list shows. */
.qa-comp-row-plain {
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-label);
  line-height: 1.45;
  color: var(--qa-ink-dim);
}

.qa-comp-entry { overflow-y: auto; scrollbar-width: thin; display: flex; flex-direction: column; gap: var(--qa-s3); }
.qa-comp-back { align-self: flex-start; }
.qa-comp-name { margin: 0; font-family: var(--qa-font-display); font-size: var(--qa-text-lg); color: var(--qa-ink); }
.qa-comp-plain {
  margin: 0;
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-body);
  line-height: 1.55;
  color: var(--qa-ink);
}
/* The printed rule sits quieter than the sentence that explains it — correct,
   available, and deliberately not the first thing the eye lands on. */
.qa-comp-srd {
  margin: 0;
  padding-top: var(--qa-s3);
  border-top: var(--qa-hairline) solid var(--qa-glass-border);
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-label);
  line-height: 1.6;
  color: var(--qa-ink-dim);
  white-space: pre-wrap;
}

/* ---- the shared screen -----------------------------------------------------
   A television at the end of the table has no hands and no pointer, so there
   are no hover states and no controls here at all. Its one job is being
   readable from four feet away, which is why everything is scaled up and
   thinned out relative to a personal screen. */
.qa-td { position: relative; height: 100vh; overflow: hidden; }

.qa-td-scene {
  position: absolute;
  z-index: 2;
  top: var(--qa-hud-inset);
  left: 50%;
  transform: translateX(-50%);
  padding: var(--qa-s3) var(--qa-s5);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--qa-s2);
  text-align: center;
}
.qa-td-name {
  font-family: var(--qa-font-display);
  /* The display size, because this is read across a room rather than at
     arm's length — the one place the top of the ramp is the right answer. */
  font-size: var(--qa-text-display);
  color: var(--qa-ink);
  line-height: 1.05;
}
/* Whose turn it is, in the accent, because it is the one thing anybody looks
   up to check. */
.qa-td-state {
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-body);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--qa-accent);
}

.qa-td-order {
  position: absolute;
  z-index: 2;
  top: 50%;
  left: var(--qa-hud-inset);
  transform: translateY(-50%);
  padding: var(--qa-s4);
  max-height: 80%;
  overflow: hidden;
}
.qa-td-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: var(--qa-s3); }
.qa-td-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--qa-s5);
  padding-left: var(--qa-s3);
  border-left: 2px solid transparent;
}
.qa-td-row.is-acting { border-left-color: var(--qa-accent); }
.qa-td-who { font-family: var(--qa-font-display); font-size: var(--qa-text-lg); color: var(--qa-ink); }
.qa-td-row.is-acting .qa-td-who { color: var(--qa-accent); }
.qa-td-state-word {
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-label);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--qa-ink-faint);
  font-variant-numeric: tabular-nums;
}

.qa-td-log {
  position: absolute;
  z-index: 2;
  right: var(--qa-hud-inset);
  bottom: var(--qa-hud-inset);
  width: min(520px, 40%);
  padding: var(--qa-s4);
  display: flex;
  flex-direction: column;
  gap: var(--qa-s3);
}
.qa-td-line {
  margin: 0;
  font-family: var(--qa-font-body);
  font-size: var(--qa-text-body);
  line-height: 1.5;
  color: var(--qa-ink);
}
.qa-td-line-who {
  display: block;
  font-family: var(--qa-font-mono);
  font-size: var(--qa-text-whisper);
  letter-spacing: var(--qa-tracking-caps);
  text-transform: uppercase;
  color: var(--qa-ink-faint);
}
`;

/**
 * The play screen's styles, on top of the app's shared design layer. Rendering
 * DesignStyles here rather than expecting the host to remember it means a
 * screen is always self-sufficient; duplicate style tags are harmless.
 */
export function ScreenStyles(): ReactElement {
  return (
    <>
      <DesignStyles />
      <style>{CSS}</style>
    </>
  );
}
