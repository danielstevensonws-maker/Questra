# Primitives/InfoPanel

**Story file:** `packages/web/src/primitives/InfoPanel.stories.tsx`
**Component:** `packages/web/src/primitives/InfoPanel.tsx`
**Adapter:** `packages/web/src/primitives/entityToInfoPanel.ts`
**Spec:** Character Creation Wizard §4 · Brief 01 §1.3 (the schema IS the panel's data source)

---

## Screens

**Global — every screen.** This is *the* primitive, explicitly "one component,
used everywhere." Named consumers:

| Screen | Use |
|---|---|
| Character Creation Wizard | Read a class/species/background, then **Choose** it from inside the panel. |
| Compendium | Pure reference browsing (no `onChoose`). |
| Session Planner | Inspect a monster or spell while authoring a scene. |
| Level-up | Read a new feature before taking it. |
| Homebrew builder | Preview custom content in the real panel. |
| Community library | Browse shared content. |
| **Player View** | The target of every tap-`?` — `VitalsBar`'s AC and condition chips, `ActionBar`'s tile `?` buttons. |

## Reference status

`InfoPanel.tsx` is the reference implementation named in CLAUDE.md: *"the
reference for how a primitive is built — themed only via CSS variables, driven by
contracts shapes, storybook against fixtures."* Match its structure for every
new primitive.

---

## How it functions

### Three jobs

**1. It informs, in three layers.** These map 1:1 onto the contracts
`RulesEntity` shape, which is what lets one panel render any entity type —
official or homebrew — with zero per-type code:

| Layer | Source field | Behaviour |
|---|---|---|
| 1 — plain sentence | `entity.plain` → `summary` | Always visible, large type. |
| 2 — derivation | passed in by the caller → `derivation` | Collapsible: *"Where the numbers come from"*. Each line is label + mono value, optionally broken into `parts` rendered as `10 hit die (max) + 2 CON mod`. |
| 3 — full rules text | `entity.srd_text` → `rulesText` | Collapsible: *"Full rules text"*, `white-space: pre-wrap`. |

Beginners stay on Layer 1; veterans open Layer 3. `defaultExpanded` sets which
layers start open, and layer state resets whenever `data.name` changes.

**2. It selects.** The **Choose** button lives *inside* the panel, in a sticky
footer — so reading, understanding, and deciding are one motion rather than a
read-then-go-back-and-pick round trip. Omitting `onChoose` hides the footer
entirely, which is how pure-reference contexts (the compendium) use it.

**3. It renders homebrew identically.** A homebrew entity opens in this exact
panel. The only difference is a quiet tinted `Homebrew` badge next to the title
— a tint, never a warning. The design rule being enforced: *custom content never
looks second-class*.

### Why `InfoPanelData` is not `RulesEntity`

The panel takes a thin view-model, not a contracts entity directly. That is
deliberate: non-entity things need this panel too — a computed AC value from the
player's sheet, a homebrew draft mid-authoring. `entityToInfoPanel()` is the
adapter for the entity case, and being the *only* mapping means a new entity
type needs no `InfoPanel` change at all — just a new case in `kindLabel()`.

`kindLabel()` produces the plain-language `kind` string per type:
`Class — Average complexity`, `Spell — Level 3 Evocation`, `Creature — CR 1/4`,
`Condition`, `Subclass`, `Species`, `Background`, `Feature`, `Item`.

Note `derivation` is *not* mapped by the adapter — static entities usually have
none, and sheet values compute theirs at runtime, so the caller supplies it.

### Presentation and accessibility

- A right-side slide-over: fixed overlay, `max-w-md`, `role="dialog"` +
  `aria-modal="true"` + `aria-labelledby`.
- Escape closes; focus moves into the panel on open.
- Clicking the scrim closes; clicks inside stop propagation.
- `q-slide-in` animation, disabled under `prefers-reduced-motion`.
- Themed entirely via `theme/tokens.css` variables — the Claude Design token set
  drops into that one file and this re-themes with no edits here (ADR-0014).

---

## The stories

All four wrap the panel in a `Harness` that starts open and offers a re-open
button.

| Story | Source | Shows |
|---|---|---|
| `Condition` | `prone.json` fixture | An entity with no derivation — Layer 1 + Layer 3 only. No **Choose** (pure reference). |
| `Spell` | `fireball.json` fixture | The `kind` label pulling level + school from `meta`. With **Choose**. |
| `WithDerivation` | `fighter.json` fixture + synthetic derivation | Layer 2 in full, including `parts` breakdowns for HP and AC — as a computed sheet value would supply. |
| `Homebrew` | Hand-authored `Spellblade` | `source: 'homebrew'` → the identical panel plus the quiet badge. |

Three of the four parse **real contracts fixtures** through `RulesEntitySchema`
before rendering, which is the point: it proves the primitive renders official
data with no per-type code and no backend.

The `WithDerivation` derivation is explicitly synthetic — the fixture doesn't
carry one, because in production it would be computed at runtime from the
character's sheet.
