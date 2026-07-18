/**
 * @questra/theme — the repo theme (TypeScript surface).
 *
 * The CSS custom properties in ./tokens/*.css are the runtime tokens.
 * This module gives feature code a *typed* handle on them so a token
 * reference is autocompleted and misspellings fail the compiler —
 * you never hand-type "var(--qa-emberr)" and find out at runtime.
 *
 * SOURCE OF TRUTH is the CSS. If a value changes, it changes in the
 * design ("Questra V1 Prototype") -> re-sync tokens/*.css. The names
 * here mirror those files; theme.test.ts guards them against drift.
 *
 * Per ADR-0014, Claude Design owns the look; this repo transcribes it.
 * Per docs/specs 08, every color token is semantic — there is no
 * decorative color, so there is no "brand purple" to reach for here.
 */

/** Every Questra design token, as its CSS custom-property name. */
export const token = {
  // ---- Structure: warm near-blacks ----
  inkDeep: '--qa-ink-deep',
  ink: '--qa-ink',
  inkChar: '--qa-ink-char',
  inkRaised: '--qa-ink-raised',
  inkRaised2: '--qa-ink-raised2',

  // ---- Vellum: text & light ink ----
  vellum: '--qa-vellum',
  vellumBright: '--qa-vellum-bright',
  vellumDim: '--qa-vellum-dim',
  vellumFaint: '--qa-vellum-faint',
  vellumGhost: '--qa-vellum-ghost',

  // ---- Ember: signature accent ----
  ember: '--qa-ember',
  emberBright: '--qa-ember-bright',
  emberDeep: '--qa-ember-deep',
  candle: '--qa-candle',

  // ---- Lines ----
  hairline: '--qa-hairline',
  hairlineSoft: '--qa-hairline-soft',

  // ---- Semantic (the only meaningful hues) ----
  active: '--qa-active',
  danger: '--qa-danger',
  heal: '--qa-heal',
  arcane: '--qa-arcane',
  steel: '--qa-steel',
  gold: '--qa-gold',

  // ---- HP ----
  hpFull: '--qa-hp-full',
  hpLow: '--qa-hp-low',
  hpTrack: '--qa-hp-track',

  // ---- Class identity ----
  classFighter: '--qa-class-fighter',
  classRogue: '--qa-class-rogue',
  classCleric: '--qa-class-cleric',
  classWizard: '--qa-class-wizard',
  classNeutral: '--qa-class-neutral',

  // ---- Glass ----
  glass: '--qa-glass',
  glassRaised: '--qa-glass-raised',
  glassHover: '--qa-glass-hover',
  glassBorder: '--qa-glass-border',
  glassChip: '--qa-glass-chip',
  glassText: '--qa-glass-text',
  glassDim: '--qa-glass-dim',

  // ---- Typography ----
  fontDisplay: '--qa-font-display',
  fontBody: '--qa-font-body',
  fontMono: '--qa-font-mono',
  textMicro: '--qa-text-micro',
  textLabel: '--qa-text-label',
  textXs: '--qa-text-xs',
  textSm: '--qa-text-sm',
  textBase: '--qa-text-base',
  textMd: '--qa-text-md',
  textLg: '--qa-text-lg',
  textXl: '--qa-text-xl',
  text2xl: '--qa-text-2xl',
  text3xl: '--qa-text-3xl',
  text4xl: '--qa-text-4xl',
  weightReg: '--qa-weight-reg',
  weightMed: '--qa-weight-med',
  weightBold: '--qa-weight-bold',
  trackLabel: '--qa-track-label',
  trackWide: '--qa-track-wide',
  trackName: '--qa-track-name',
  leadingBody: '--qa-leading-body',

  // ---- Spacing & radii ----
  space1: '--qa-space-1',
  space2: '--qa-space-2',
  space3: '--qa-space-3',
  space4: '--qa-space-4',
  space5: '--qa-space-5',
  space6: '--qa-space-6',
  space7: '--qa-space-7',
  space8: '--qa-space-8',
  radiusXs: '--qa-radius-xs',
  radiusSm: '--qa-radius-sm',
  radius: '--qa-radius',
  radiusMd: '--qa-radius-md',
  radiusLg: '--qa-radius-lg',
  hudInset: '--qa-hud-inset',

  // ---- Effects ----
  blur: '--qa-blur',
  blurRaised: '--qa-blur-raised',
  blurHeavy: '--qa-blur-heavy',
  shadowMenu: '--qa-shadow-menu',
  shadowContinue: '--qa-shadow-continue',
  glowEmber: '--qa-glow-ember',
  ease: '--qa-ease',
  durFast: '--qa-dur-fast',
  dur: '--qa-dur',
  durSlow: '--qa-dur-slow',
} as const;

export type TokenName = keyof typeof token;
export type TokenVar = (typeof token)[TokenName];

/** `cssVar('ember')` -> `"var(--qa-ember)"`. Typed; misspellings won't compile. */
export function cssVar(name: TokenName): string {
  return `var(${token[name]})`;
}

/**
 * The optional HUD glass themes the prototypes ship. Default (ghost) needs
 * no class; slate/ivory are opt-in scopes over a subtree.
 */
export const hudGlassTheme = {
  ghost: '',
  slate: 'qa-hud-slate',
  ivory: 'qa-hud-ivory',
} as const;
export type HudGlassTheme = keyof typeof hudGlassTheme;
