/**
 * Types for the vendored <qa-dice-tray> custom element (qa-dice-tray.js).
 * Hand-authored to match its public surface; the .js is the source of truth.
 */

/** One roll to reveal. Results IN — the element never decides a value (ADR-0008). */
export interface DiceSpec {
  /** die kinds to show, in order. */
  dice: Array<'d4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20' | 'd100'>;
  /** the decided face for each die, index-aligned with `dice`. */
  results: number[];
  /** index of the kept die (advantage/disadvantage); others slide aside, darkened. */
  keep?: number;
  /** a hidden DM roll — numerals are never rendered (value not in the DOM). */
  secret?: boolean;
}

/** The custom element instance. Register by importing the module for side effects. */
export interface QaDiceTrayElement extends HTMLElement {
  /** 'bone' | 'smoke' | 'iron' — the die material. */
  material: string;
  soundOn: boolean;
  /** reduced-motion: dice appear already settled on the right face. */
  still: boolean;
  /** base settle time in ms (default 1100; +70 per extra die). */
  settleMs: number;
  /** tumble to the decided faces, then land. */
  show(spec: DiceSpec): void;
  /** fade the dice away. */
  clear(): void;
}

declare global {
  interface HTMLElementTagNameMap {
    'qa-dice-tray': QaDiceTrayElement;
  }

  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        'qa-dice-tray': React.DetailedHTMLProps<
          React.HTMLAttributes<QaDiceTrayElement>,
          QaDiceTrayElement
        >;
      }
    }
  }
}
