/**
 * @questra/ui — the primitive component library.
 *
 * The `core` (Button, Chip, Label, Panel) and `hud` (HPBar, StatBlock, Avatar,
 * MapToken, AbilityCard, MenuItem, ReactionButton) pieces from the Questra
 * design system, implemented in TypeScript against the --qa-* tokens shipped by
 * @questra/theme. Each component's prop interface is the authoritative contract
 * from the design system's .d.ts; behaviour matches the reference .jsx.
 *
 * These read design tokens via CSS custom properties, so a consuming app must
 * load the theme once (e.g. `@import "@questra/theme/styles.css"`) for them to
 * render on the palette.
 */
export * from './core/index.js';
export * from './hud/index.js';
