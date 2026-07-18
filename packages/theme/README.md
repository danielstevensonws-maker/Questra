# @questra/theme

The **repo theme** — Questra's design tokens and base type/ground, transcribed
from the Claude Design project *"Questra V1 Prototype"* per
[ADR-0014](../../docs/adr/0014-design-workflow.md). This is the single visual
dependency every Questra UI package composes from.

> Claude Design owns the look; this repo transcribes the token set. Design
> prototype code is never merged. The token files here (`src/styles.css` +
> `src/tokens/*.css`) are **byte-identical** to the design source — verified in
> CI by `test/byte-identity.test.ts` against the pinned copies in
> `test/design-source/`. If a value should change, change it in the design and
> re-sync BOTH; don't hand-edit `src/` to drift.

## The system, in one line

Near-silent at rest so the moments hit hard (`docs/specs/08` — design system):
warm parchment-and-ember, three type roles, hairlines not shadows, and **no
decorative color — every hue is semantic.**

## Use it

```css
/* one import: tokens + base ground/type. pulls webfonts from Google Fonts. */
@import "@questra/theme/index.css";
```

```html
<body class="qa-app">
  <div class="qa-panel">
    <div class="qa-label">Hit points</div>
    <div class="qa-stat" style="font-size: var(--qa-text-4xl); color: var(--qa-vellum)">27</div>
  </div>
</body>
```

```ts
// typed token handles — misspellings fail the compiler, not at runtime
import { cssVar, token, hudGlassTheme } from "@questra/theme";

cssVar("ember");          // "var(--qa-ember)"
token.danger;             // "--qa-danger"
hudGlassTheme.slate;      // "qa-hud-slate"  (opt-in glass scope)
```

## What's here

| File | What |
|---|---|
| `src/tokens/colors.css` | structure (warm inks), vellum text, ember accent, the **semantic** hues, HP, class identity, glass |
| `src/tokens/typography.css` | three families, the scale (8.5px→56px), weights, tracking |
| `src/tokens/spacing.css` | spacing scale, restrained radii, HUD inset |
| `src/tokens/effects.css` | glass blur, the rare shadow, damped motion, atmosphere, keyframes |
| `src/tokens/fonts.css` | webfont `@import` (skip it to self-host / run offline) |
| `src/styles.css` | **the design system's canonical entry** — the exact `@import` list from the source. Link this for the system verbatim. |
| `src/base.css` | repo addition — `.qa-app` ground + `.qa-display` / `.qa-body` / `.qa-flavor` / `.qa-label` / `.qa-eyebrow` / `.qa-stat` roles, `.qa-panel`, reduced-motion. Applies the tokens; invents none. |
| `src/index.css` | convenience barrel — `styles.css` + `base.css` |
| `src/index.ts` | typed token map, `cssVar()`, glass-theme names |

## Offline / self-hosting

`index.css` fetches fonts from Google Fonts at runtime. To self-host or run
offline, import the token files and `base.css` directly and **omit
`tokens/fonts.css`**, providing your own `@font-face` for *IM Fell English*,
*EB Garamond*, and *IBM Plex Mono*.

## Source of truth

These files are transcribed verbatim from the Claude Design project
**"Questra V1 Prototype"** (`styles.css` + `tokens/*.css`, extracted from the
shipped `*.dc.html` prototypes). They are the warm parchment-and-ember system —
warm near-blacks + vellum, one semantic ember accent, three type roles (IM Fell
English / EB Garamond / IBM Plex Mono), glass panels, hairlines not shadows.
`test/byte-identity.test.ts` proves `src/` equals the source; nothing here is
invented.

## Check

```bash
npm run check   # tsc --noEmit && vitest run
```

Runs two guards: **byte-identity** (`src/` == the design source) and the
**token map ↔ CSS lockstep + value** assertions. Either failing means the repo
drifted from the design system.
