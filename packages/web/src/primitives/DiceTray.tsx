/**
 * DiceTray — the React seam over the vendored <qa-dice-tray> 3D renderer
 * (vendor/qa-dice-tray.js, from the Claude Design artifact, ADR-0014).
 *
 * The reveal half of a roll (ComposeRollSheet is the compose half). It is driven
 * by `result` — a `roll_made` body — never by anything it decides itself: the
 * die tumbles and lands on the SERVER's face (ADR-0008). Feeding it a fixture
 * result animates exactly as it will off a real event in M3.6.
 *
 * three.js is lazy: the custom element imports it on first `show()`, so this
 * component (and any screen hosting it) pays nothing until the first roll. If
 * WebGL is unavailable the element falls back to flat CSS dice on its own.
 *
 * d20-only for now (attacks/checks/saves/death saves). Damage is multi-die but
 * `roll_made` reports only the total today; per-die damage animation waits on a
 * contract change (see the dice-tray memory).
 */
import { useEffect, useRef, type ReactElement } from 'react';
import { toDiceSpec, type RollResultVM } from './sheetToPlayerHub.js';
import type { QaDiceTrayElement } from './vendor/qa-dice-tray.js';
import './vendor/qa-dice-tray.js'; // registers the custom element (side effect)

export interface DiceTrayProps {
  /**
   * The server's answer to reveal. `undefined` clears the tray. Two d20s when
   * the roll was made with advantage/disadvantage; the kept die is `keep`.
   * Set from the `roll_made` event.
   */
  result?: RollResultVM | undefined;
  /** die material — 'bone' (default) · 'smoke' · 'iron'. */
  material?: 'bone' | 'smoke' | 'iron';
  /** reduced motion: land pre-settled, no tumble. Defaults from the media query. */
  still?: boolean;
  soundOn?: boolean;
  /** fires when the reveal has finished settling. */
  onSettled?: (rollId: string) => void;
  style?: React.CSSProperties;
}

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

export function DiceTray({
  result, material = 'bone', still, soundOn = true, onSettled, style,
}: DiceTrayProps): ReactElement {
  const ref = useRef<QaDiceTrayElement>(null);
  // keep the latest onSettled without re-subscribing the listener every render.
  const onSettledRef = useRef(onSettled);
  onSettledRef.current = onSettled;

  // configure the element (these are plain properties, not attributes).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.material = material;
    el.soundOn = soundOn;
    el.still = still ?? prefersReducedMotion();
  }, [material, soundOn, still]);

  // drive the reveal from `result`; the element emits 'dice-settled' when done.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!result) { el.clear(); return; }

    const rollId = result.rollId;
    const handleSettled = (): void => onSettledRef.current?.(rollId);
    el.addEventListener('dice-settled', handleSettled, { once: true });
    el.show(toDiceSpec(result));

    return () => el.removeEventListener('dice-settled', handleSettled);
  }, [result]);

  return (
    <qa-dice-tray
      ref={ref}
      style={{ display: 'block', width: '100%', height: '100%', minHeight: 220, ...style }}
    />
  );
}
