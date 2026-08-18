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
/* ---- Landing: the threshold ------------------------------------------------
   An asymmetric composition rather than a centred stack — the wordmark and the
   door sit together, off to one side, because a centred hero reads as "an ad
   for a room" and this is meant to read as "standing at the edge of one." The
   seam is the door: a column of the accent's glow laid into the map ground,
   off-centre, at the width a doorway actually is relative to a room. */
.qa-landing {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
}
.qa-landing .qa2-map.is-fill { z-index: 0; }
/* The door. Three layers, blended as LIGHT (screen) rather than a flat wash: a
   scrim that darkens the text's side of the room for contrast, a vertical
   shaft with a bright core (the gap itself), and a pool where that light
   would actually land on the floor. This is what "a door cracked open" needs
   to mean something rather than reading as an off-centre glow. */
.qa-landing-seam {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  mix-blend-mode: screen;
  background:
    linear-gradient(90deg, transparent 52%, var(--qa-accent-soft) 63%, var(--qa-accent-glow) 70%, var(--qa-accent-soft) 77%, transparent 88%),
    radial-gradient(46% 38% at 71% 86%, var(--qa-accent-glow) 0%, transparent 70%);
}
.qa-landing-scrim {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(90deg, var(--qa-scrim) 0%, transparent 46%);
}
.qa-landing-content {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 620px;
  margin-left: 10vw;
  padding: var(--qa-s7) var(--qa-hud-inset);
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--qa-s5);
}
.qa-landing-eyebrow { animation: qa2-fade var(--qa-dur-slow) var(--qa-ease) both; }
.qa-landing-wordmark {
  transform-origin: left center;
  transform: scale(3.4);
  margin: var(--qa-s5) 0 var(--qa-s6);
  /* qa2-fade, not qa2-rise: qa2-rise's keyframes also animate transform (a
     translateY entrance), and with fill-mode:both its "to" state permanently
     overrides ANY static transform on the same element — including this
     scale — once the animation completes. qa2-fade only touches opacity, so
     the scale (composition, not chrome — see heroTitle's doc) survives it. */
  animation: qa2-fade var(--qa-dur-slow) var(--qa-ease) both;
  animation-delay: calc(var(--qa-dur-fast) * 1);
}
.qa-landing-tagline {
  max-width: 32ch;
  animation: qa2-rise var(--qa-dur-slow) var(--qa-ease-out) both;
  animation-delay: calc(var(--qa-dur-fast) * 2);
}
.qa-landing-actions {
  display: flex;
  align-items: center;
  gap: var(--qa-s4);
  margin-top: var(--qa-s2);
  animation: qa2-rise var(--qa-dur-slow) var(--qa-ease-out) both;
  animation-delay: calc(var(--qa-dur-fast) * 3);
}
.qa-landing-attrib {
  position: absolute;
  z-index: 2;
  left: var(--qa-hud-inset);
  bottom: var(--qa-s4);
  color: var(--qa-ink-faint);
}
@media (max-width: 720px) {
  .qa-landing { align-items: flex-end; }
  .qa-landing-content { margin-left: 0; max-width: 100%; align-items: center; text-align: center; padding-bottom: var(--qa-s7); }
  .qa-landing-wordmark { transform: scale(2.1); transform-origin: center; margin-top: var(--qa-s3); }
  .qa-landing-scrim { background: linear-gradient(0deg, var(--qa-scrim) 0%, transparent 55%); }
  .qa-landing-seam {
    background:
      linear-gradient(0deg, transparent 40%, var(--qa-accent-soft) 55%, var(--qa-accent-glow) 66%, transparent 82%),
      radial-gradient(70% 30% at 50% 78%, var(--qa-accent-glow) 0%, transparent 70%);
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
.qa-home .qa2-map-ground::after { opacity: 0.75; } /* Home reads calmer: a deeper vignette than the hero */
.qa-home-content {
  position: relative;
  z-index: 2;
  max-width: 880px;
  margin: 0 auto;
  padding: calc(var(--qa-hud-inset) + 56px) var(--qa-hud-inset) var(--qa-s8);
  display: flex;
  flex-direction: column;
  gap: var(--qa-s6);
}
.qa-home-head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--qa-s3); flex-wrap: wrap; }
.qa-home-section { display: flex; flex-direction: column; gap: var(--qa-s3); }
.qa-home-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: var(--qa-s3); }
.qa-camp-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--qa-s2);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--qa-dur-fast) var(--qa-ease), transform var(--qa-dur-fast) var(--qa-ease);
}
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
  .qa-landing-eyebrow, .qa-landing-wordmark, .qa-landing-tagline, .qa-landing-actions,
  .qa-join-card, .qa-join-name {
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
