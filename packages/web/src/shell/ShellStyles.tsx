/**
 * shell/ShellStyles — the account/campaign shell's own layout (Brief 14 §3-4,
 * M3 minimal: Landing, Home, Join, the nav). Chrome and behaviour live in the
 * shared design layer (src/design/styles.tsx) exactly as they do for the play
 * screen; this file owns only what is true of THESE screens — where things
 * sit, and the two atmospheric devices unique to the shell (the threshold seam,
 * the arrival choreography).
 *
 * THE GROUND IS THE SAME MATERIAL AS PLAY. Landing's backdrop is `.qa2-map
 * .is-fill` — the identical class the real Player View draws its table on —
 * not a fresh illustration. The signature idea this whole shell is built
 * around: the room doesn't change when you arrive, it's the same table,
 * empty, waiting for a token that hasn't been placed yet.
 *
 * ONE EDITING HAZARD, paid for repeatedly elsewhere: the CSS below is a
 * template literal, so a BACKTICK anywhere inside it — including inside a CSS
 * comment — closes the string and the whole file stops parsing. Write class
 * names bare in those comments.
 */
import type { ReactElement } from 'react';
import { DesignStyles } from '../design/index.js';

const CSS = `
/* ---- Landing: standing at the table ----------------------------------------
   WHAT THE FIRST PASS GOT WRONG, recorded because the mistake is instructive:
   it CLAIMED the map was the hero and then drew an empty radial gradient. The
   idea existed only in the comments. With nothing on the right-hand two thirds
   the left-anchored copy read as unbalanced rather than as deliberate
   asymmetry, and a soft vertical blur is not a door.

   So the room is actually drawn now, and in PERSPECTIVE: a 5-foot grid
   receding to a horizon, which is the one thing that makes this read as a
   table you are standing at rather than wallpaper behind some text. Depth is
   what "cinematic" actually costs — six stacked layers, back to front:

     1  .qa2-map.is-fill   the same material the play screen uses (unchanged —
                           the honest half of the original claim)
     2  .qa-room-floor  the battle grid in perspective, masked out at the
                           horizon so it dissolves into haze instead of ending
     3  .qa-landing-beam   the doorway. Screen-blended so it LIGHTS the grid it
                           crosses rather than sitting on top of it, with a
                           pool where the light lands on the floor
     4  .qa-room-haze   air. Warm, low, sitting on the horizon line
     5  .qa-room-grain  fine tooth so the gradients stop looking like CSS
     6  .qa-room-edge   vignette + a dark near edge: you are in the shadow
                           looking in, which is what puts the viewer IN the room

   The composition is now centred and monumental rather than off to one side.
   A title screen earns its drama from scale and atmosphere; the asymmetry was
   buying nothing once there was something real to look at. */
.qa-landing {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  display: grid;
  place-items: center;
  isolation: isolate;
}
.qa-landing .qa2-map.is-fill { z-index: 0; }

/*
 * THE GEOMETRY IS THE WHOLE TRICK, and getting it wrong is why two earlier
 * passes rendered nothing. With transform-origin at the element's bottom edge,
 * a plane under perspective(d) rotateX(θ) puts its HORIZON at
 * origin_y minus d/tan(θ) — so the rotation angle, not the height, is what
 * decides where the table meets the dark. At 70° that lands ~68% down the
 * screen (a strip along the bottom edge, which is exactly what the first
 * attempt drew); at 60° it lands ~44% down, which is a room you are standing
 * in. The height then only has to be big enough to REACH that horizon — a
 * plane approaches it asymptotically, so 200% is generous and the mask fades
 * the last of it into the haze.
 */
.qa-room-floor {
  position: absolute;
  left: -60%;
  right: -60%;
  bottom: -8%;
  height: 340%;
  z-index: 1;
  pointer-events: none;
  transform: perspective(1000px) rotateX(60deg);
  transform-origin: 50% 100%;
  /* Two weights, both from tokens that already exist: --qa-glass-border (14%)
     for the foot cells, --qa-ink-faint (34%) for the five-foot majors.
     --qa-map-grid (5%) is what the flat play-screen map uses, and it is simply
     not survivable once foreshortened AND vignetted — the earlier invisible
     pass was built on it. */
  background-image:
    repeating-linear-gradient(90deg, var(--qa-glass-border) 0 1px, transparent 1px 96px),
    repeating-linear-gradient(0deg, var(--qa-glass-border) 0 1px, transparent 1px 96px),
    repeating-linear-gradient(90deg, var(--qa-ink-faint) 0 2px, transparent 2px 480px),
    repeating-linear-gradient(0deg, var(--qa-ink-faint) 0 2px, transparent 2px 480px);
  /* black/transparent here are ALPHA, not colour — a mask reads only the alpha
     channel, which is why this is not a hardcoded palette value. */
  mask-image: linear-gradient(to top, black 0%, transparent 72%);
  -webkit-mask-image: linear-gradient(to top, black 0%, transparent 72%);
}

.qa-landing-beam {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  mix-blend-mode: screen;
  background:
    linear-gradient(93deg, transparent 44%, var(--qa-accent-soft) 52%, var(--qa-accent-glow) 57%, var(--qa-accent-soft) 62%, transparent 71%),
    radial-gradient(26% 30% at 58% 88%, var(--qa-accent-glow) 0%, transparent 74%);
  /* a torch does not hold still. Very slow, very shallow — the whole screen
     must still be quiet enough to sit in front of (law 4). */
  animation: qa-torch calc(var(--qa-dur-slow) * 16) var(--qa-ease) infinite alternate;
}

/* Air, sitting ON the horizon rather than floating above it. Without this the
   masked-out far edge of the grid ends as a visible straight seam across the
   full width — the one thing that gives the trick away. Positioned to the
   floor's actual vanishing line (~72% at this angle), so the grid dissolves
   into depth instead of stopping. */
.qa-room-haze {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
  background:
    radial-gradient(58% 16% at 50% 72%, var(--qa-map-hi) 0%, transparent 78%),
    radial-gradient(90% 24% at 50% 71%, var(--qa-map-mid) 0%, transparent 70%);
  opacity: 0.75;
}

.qa-room-grain {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  opacity: 0.55;
  background-image:
    repeating-linear-gradient(41deg, var(--qa-map-grid) 0 1px, transparent 1px 3px),
    repeating-linear-gradient(-53deg, var(--qa-map-grid) 0 1px, transparent 1px 4px);
}

/* Vignette + the near edge. Deliberately gentler at the BOTTOM than the sides:
   the first version crushed the lower third to solid map-lo, which is exactly
   where the floor grid is widest and most legible — it was erasing the layer
   the whole composition is built on. The dark near edge is still there (you are
   standing in shadow), it just stops short of eating the table. */
.qa-room-edge {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background:
    radial-gradient(94% 76% at 50% 40%, transparent 34%, var(--qa-map-lo) 98%),
    linear-gradient(to top, var(--qa-map-lo) 0%, transparent 16%);
}

.qa-landing-content {
  position: relative;
  z-index: 4;
  width: 100%;
  max-width: 760px;
  padding: var(--qa-s7) var(--qa-hud-inset);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: var(--qa-s4);
}
.qa-landing-eyebrow { animation: qa2-fade var(--qa-dur-slow) var(--qa-ease) both; }
.qa-landing-wordmark {
  transform-origin: center;
  transform: scale(4.4);
  /* the scaled box still lays out at its unscaled height, so the space either
     side is bought with margin rather than gap. */
  margin: var(--qa-s7) 0 var(--qa-s8);
  /* qa2-fade, not qa2-rise: qa2-rise's keyframes also animate transform (a
     translateY entrance), and with fill-mode:both its "to" state permanently
     overrides ANY static transform on the same element — including this
     scale — once the animation completes. qa2-fade only touches opacity, so
     the scale (composition, not chrome — see heroTitle's doc) survives it. */
  animation: qa2-fade var(--qa-dur-slow) var(--qa-ease) both;
  animation-delay: calc(var(--qa-dur-fast) * 1);
}
/* The one drawn mark on the screen: a hairline that fades out at both ends,
   sized to the tagline rather than the wordmark so it reads as an underline
   for the sentence and not as a divider bar. */
.qa-landing-rule {
  width: 120px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--qa-accent-line), transparent);
  animation: qa2-fade var(--qa-dur-slow) var(--qa-ease) both;
  animation-delay: calc(var(--qa-dur-fast) * 2);
}
.qa-landing-tagline {
  max-width: 46ch;
  animation: qa2-rise var(--qa-dur-slow) var(--qa-ease-out) both;
  animation-delay: calc(var(--qa-dur-fast) * 3);
}
.qa-landing-actions {
  display: flex;
  align-items: center;
  gap: var(--qa-s5);
  margin-top: var(--qa-s4);
  animation: qa2-rise var(--qa-dur-slow) var(--qa-ease-out) both;
  animation-delay: calc(var(--qa-dur-fast) * 4);
}
.qa-landing-attrib {
  position: absolute;
  z-index: 4;
  left: 0;
  right: 0;
  bottom: var(--qa-s4);
  text-align: center;
  color: var(--qa-ink-faint);
}

@keyframes qa-torch {
  from { opacity: 0.82; }
  to   { opacity: 1; }
}

@media (max-width: 720px) {
  .qa-landing-wordmark { transform: scale(2.3); margin: var(--qa-s5) 0 var(--qa-s6); }
  .qa-room-floor { transform: perspective(700px) rotateX(74deg); }
  .qa-landing-beam {
    background:
      linear-gradient(90deg, transparent 30%, var(--qa-accent-soft) 44%, var(--qa-accent-glow) 50%, var(--qa-accent-soft) 56%, transparent 70%),
      radial-gradient(42% 24% at 50% 90%, var(--qa-accent-glow) 0%, transparent 74%);
  }
}

/* ---- the auth sheet: the door opening further, not a page you leave to ---- */
.qa-auth-sheet { position: relative; z-index: 3; width: min(380px, 88vw); }
.qa-auth-tabs { display: flex; gap: var(--qa-s1); }
.qa-auth-form { display: flex; flex-direction: column; gap: var(--qa-s3); }
.qa-auth-error { color: var(--qa-danger); }

/* ---- Home: camp between sessions -------------------------------------------
   Quieter than Landing on purpose (spend the boldness once) — glass panels
   over the SAME ground at rest, no seam, no scale-up wordmark. */
.qa-home { position: relative; min-height: 100vh; }
.qa-home .qa2-map.is-fill { z-index: 0; }
/* Home stands FURTHER BACK in the same room than Landing does — a shallower
   angle pushes the horizon down and the grid reads as a table you are sitting
   at rather than one you are stepping up to. Same layers, less theatre. */
.qa-home .qa-room-floor { transform: perspective(1400px) rotateX(70deg); opacity: 0.7; }
.qa-home .qa-room-haze { opacity: 0.5; }
.qa-home-content {
  position: relative;
  z-index: 4;
  max-width: 980px;
  margin: 0 auto;
  padding: var(--qa-s7) var(--qa-hud-inset) var(--qa-s8);
  display: flex;
  flex-direction: column;
  gap: var(--qa-s6);
}
.qa-home-head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--qa-s3); flex-wrap: wrap; }
.qa-home-section { display: flex; flex-direction: column; gap: var(--qa-s3); }
/* auto-FIT with a CEILING, which is the pair of decisions this row needs:
   auto-fill left phantom tracks (two campaigns clung to the left of a 980px
   row with nothing beside them), but auto-fit with a 1fr max swings the other
   way — one campaign became a single 930px slab that reads as a banner, not a
   card. A max track of 340px keeps a card card-shaped however many there are. */
.qa-home-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 340px));
  justify-content: start;
  gap: var(--qa-s3);
}
.qa-camp-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--qa-s4);
  min-height: 116px;
  padding: var(--qa-s4);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--qa-dur-fast) var(--qa-ease), transform var(--qa-dur-fast) var(--qa-ease), background var(--qa-dur-fast) var(--qa-ease);
}
.qa-camp-card:hover { background: var(--qa-chip); }
.qa-camp-card:hover { border-color: var(--qa-accent-line); transform: translateY(-2px); }
.qa-home-empty {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--qa-s3);
  padding: var(--qa-s6);
  border: var(--qa-hairline) dashed var(--qa-glass-border);
  border-radius: var(--qa-radius-lg);
}

/* ---- Join: an invitation, read before you step in --------------------------
   Centred and narrow on purpose — an invitation is handed to ONE person, so it
   never spreads to Landing's full-bleed width. */
.qa-join { position: relative; min-height: 100vh; display: grid; place-items: center; }
.qa-join .qa2-map.is-fill { z-index: 0; }
.qa-join-card { position: relative; z-index: 2; width: min(420px, 92vw); animation: qa2-rise var(--qa-dur-slow) var(--qa-ease-out) both; }
.qa-join-name { animation: qa2-fade var(--qa-dur) var(--qa-ease) both; animation-delay: calc(var(--qa-dur-fast) * 2); }

/* ---- the persistent nav: a signpost, not an app bar -------------------------
   Deliberately the quiet part — Landing spent the boldness, this is wayfinding.
   Built entirely from qa2-pill/qa2-tabs' existing vocabulary. */
.qa-nav {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--qa-s4);
  padding: var(--qa-s3) var(--qa-hud-inset);
  border-bottom: var(--qa-hairline) solid var(--qa-glass-border);
  background: var(--qa-glass-solid);
  backdrop-filter: blur(var(--qa-glass-blur));
  -webkit-backdrop-filter: blur(var(--qa-glass-blur));
}
.qa-nav-brand { display: flex; align-items: baseline; gap: var(--qa-s2); cursor: pointer; border: none; background: none; padding: 0; }
.qa-nav-links { display: flex; align-items: center; gap: var(--qa-s1); }
.qa-nav-account { display: flex; align-items: center; gap: var(--qa-s3); }

/* ---- shell states: empty / loading / error (brief-14 §4) -------------------- */
.qa-shell-loading { display: flex; align-items: center; justify-content: center; min-height: 40vh; }
.qa-shell-loading-mark { animation: qa2-blink var(--qa-dice-settle) steps(1) infinite; }
.qa-shell-error {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--qa-s3);
  max-width: 480px;
  margin: var(--qa-s7) auto;
  padding: var(--qa-s5);
}

@media (prefers-reduced-motion: reduce) {
  .qa-landing-eyebrow, .qa-landing-wordmark, .qa-landing-rule, .qa-landing-tagline,
  .qa-landing-actions, .qa-landing-beam, .qa-join-card, .qa-join-name {
    animation: none !important;
  }
}
`;

/** The shell's styles on top of the app's shared design layer — self-sufficient,
 *  same pattern as v2/ScreenStyles: duplicate style tags across mounted screens
 *  are harmless. */
export function ShellStyles(): ReactElement {
  return (
    <>
      <DesignStyles />
      <style>{CSS}</style>
    </>
  );
}
