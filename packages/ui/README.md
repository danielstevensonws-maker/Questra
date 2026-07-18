# @questra/ui

Questra's **primitive component library** — the 11 pieces from the design
system's `components/core` + `components/hud`, implemented in TypeScript against
the `--qa-*` design tokens. Ported from the design-reference `.jsx`, with each
`.d.ts` as the authoritative prop contract and each `.prompt.md` as usage law.

| Group | Components |
|---|---|
| `core` | `Button` · `Chip` · `Label` · `Panel` |
| `hud`  | `HPBar` · `StatBlock` · `Avatar` · `MapToken` · `AbilityCard` · `MenuItem` · `ReactionButton` |

## Use it

Load the theme once in your app so the `--qa-*` custom properties exist, then
compose the components:

```tsx
import "@questra/theme/styles.css";        // the design tokens (see @questra/theme)
import { Button, Panel } from "@questra/ui";        // or "@questra/ui/core"
import { HPBar, AbilityCard } from "@questra/ui/hud";

<Panel label="WREN — ROGUE · LV 3">
  <HPBar value={22} max={27} />
  <AbilityCard tag="ACTION" name="Dagger Strike" note="1d4 +3 piercing" />
  <AbilityCard
    tag="BONUS"
    name="Hide"
    note="Stealth vs Perception"
    reason="They've already seen you"   /* illegal → dims + disables + italic */
  />
  <Button variant="primary" size="sm">Ask for the roll</Button>
</Panel>
```

`react` is a peer dependency (18 or 19). `@questra/theme` is an optional peer —
components only need its CSS custom properties at runtime, so any host that has
loaded the theme stylesheet satisfies them; there is no JS import of the theme.

## The rules these components hold (from the `.prompt.md` files)

- **One ember accent per view.** Only one `Button` `variant="primary"|"hex"` on a
  screen — every colored pixel means something.
- **Tone is meaning, not decoration.** `Chip`/`Label`/`MenuItem` tones map to the
  semantic hues (`danger` bloodied, `heal` rest, `arcane` spell, `steel` martial).
- **HP colour IS the information.** `HPBar` turns ember below 40% (bloodied);
  `foe` bars read ember throughout — glanceable danger, no numbers (Law 4).
- **Teach by dimming, never hiding (Law 5).** `AbilityCard` with a `reason` dims,
  disables, and shows the italic reason in place of the note — never grey out a
  move without saying why.
- **Emoji only at the table.** `ReactionButton` is the one sanctioned emoji
  surface; nowhere else.

## Design-value fidelity

Components consume **only `--qa-*` tokens** — enforced two ways in CI:

- `test/token-hygiene.test.ts` scans every `.tsx` for raw colour literals and
  fails on any not in a small **pinned** allowlist.
- `test/token-existence.test.ts` asserts every `var(--qa-*)` a component uses is
  actually declared in `@questra/theme` (catches typo'd / invented names).

The pinned literals are the exact inline values the design-reference `.jsx`
ships and that have **no standalone token**: the `Button` `primary`/`hex`
gradients (`#D97B5F`/`#8E4230`/`#221A0E`/`#161109`), and `MapToken`'s on-token
initial ink (`#F0E8D4`) + tag scrim + spotlight-ring `rgba()`s. They're kept
verbatim so the port matches the reference pixel-for-pixel. **Do not add new
literals** — if the design gains a colour, it becomes a `--qa-*` token in
`@questra/theme` first, then a `var()` here.

## Contract fidelity

Each component's exported `*Props` interface mirrors the design system's `.d.ts`
verbatim. The only adaptation for this repo's strict TypeScript: return type is
`React.ReactElement` (the `.d.ts` wrote `JSX.Element`, which needs a global JSX
namespace this package doesn't set up) — the **props are unchanged**.

## Check

```bash
npm run check   # tsc --noEmit && vitest run
```

52 tests: prop-contract behaviour for all 11 components (variants, legal/illegal
states, tone→hue, collapse, HP thresholds) + the two token guards above.
