/**
 * shell/Room — the shell's ground, as one component instead of six divs copied
 * onto every screen.
 *
 * The base is `.qa2-map.is-fill` — the same class the real Player View draws
 * combatants on, which is the honest half of this shell's whole premise: the
 * room does not change when you arrive. Stacked on it are the layers that make
 * it read as a table you are STANDING at rather than wallpaper: a foot-grid in
 * perspective, air on the horizon, a fine grain, and a vignette that puts you
 * in the shadow at the near edge. See ShellStyles for what each one does and
 * the geometry note on why the rotation angle (not the height) is what decides
 * where the horizon lands.
 *
 * `beam` is Landing's alone — the doorway light, screen-blended so it lights
 * the grid it crosses. Home and Join get the room at rest: same place, nobody
 * holding a torch up.
 */
import type { ReactElement } from 'react';

export function Room({ beam = false }: { beam?: boolean }): ReactElement {
  return (
    <>
      <div className="qa2-map is-fill">
        <div className="qa2-map-ground" />
      </div>
      <div className="qa-room-floor" />
      {beam && <div className="qa-landing-beam" />}
      <div className="qa-room-haze" />
      <div className="qa-room-grain" />
      <div className="qa-room-edge" />
    </>
  );
}
