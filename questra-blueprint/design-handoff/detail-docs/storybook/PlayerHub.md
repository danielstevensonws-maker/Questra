# Play/PlayerHub

**Story file:** `packages/web/src/primitives/PlayerHub.stories.tsx`
**Storybook title:** `Play/PlayerHub` — the only story file outside the `Primitives/` tree.
**Brief:** 10 §2 (Play UI) · dying ladder from Brief 04 · legality from Brief 02/05

---

## Screen

**The Player View** — the whole in-play surface a player looks at during a
session. This story file is the closest thing in the repo to a screen: `Hub` and
`HubComposedReview` are the §2 component tree fully composed.

## Components covered

Five product components ship from this one file. The four leaf components have
**no story file of their own** — their isolated stories live here.

| Component | File | Story that isolates it |
|---|---|---|
| `PlayerHub` | `PlayerHub.tsx` | `Hub`, `HubDyingFlip`, `HubComposedReview` |
| `VitalsBar` | `VitalsBar.tsx` | `Vitals`, `VitalsBloodied` |
| `ActionBar` | `ActionBar.tsx` | `Actions`, `ActionsGreyed` |
| `DeathSaveCard` | `DeathSaveCard.tsx` | `DeathSaves` |
| `DiceLog` | `DiceLog.tsx` | `Log` |

`ComposeRollSheet` also appears in `HubComposedReview`, but has its own story
file — see [ComposeRollSheet.md](ComposeRollSheet.md).

---

## How it functions

### The composition tree

```
PlayerHub
├── IdentityHeader   (inline — Avatar from @questra/ui + name + level)
├── VitalsBar        (dimmed when dying)
├── ActionBar   ⇄  DeathSaveCard      ← THE FLIP
└── DiceLog + sideSheets              (dimmed during first-contact)
```

### The flip

The single most important behaviour. `PlayerHub` takes an optional `dying`
prop. When it is present **and** `dying.phase !== 'up'`:

- `ActionBar` is replaced by `DeathSaveCard`
- `VitalsBar` receives `dimmed` and fades to 45% opacity

Revive flips it back. There is no local state involved — the flip is a pure
function of the `dying` view-model, so the server's dying ladder (Brief 04)
drives it entirely.

### Zero component-local game state

Every number on screen arrives as a view-model built by
`sheetToPlayerHub.ts` from two inputs: a contracts `ComputedSheet` and an engine
projection `Combatant`/`ProjectionState`. The components hold UI state only
(open tabs, expanded rows) — never game state.

### Greying is the server's answer, not the client's

`toActionTiles()` runs every tile through `greyingReason()` — the **shared**
legality function imported from `@questra/engine`, the same one the server calls
to reject an illegal intent. The returned `greyReason` is either `null` (legal)
or the exact server reject string, which becomes:

- the tile's `title` (tooltip), and
- `aria-disabled` + 50% opacity.

Client and server therefore cannot disagree about what is legal. `ActionsGreyed`
demonstrates this by handing the same tiles a projection where it is *not*
Torvald's turn — every tile greys, each carrying the real reject text.

### No orphan math

`VitalsBar` renders AC and each condition as a **button** carrying a `?`. Tapping
fires `onExplain(ref)` where `ref` is `'ac'` or a condition id — the caller opens
an `InfoPanel` on that derivation. `toVitals()` packs the AC derivation
(`sheet.acOptions[sheet.acDefault].derivation`) into the view-model precisely so
that panel has something to show. Brief 10 §1: every number renders from a
Derived value.

### Component detail

**`VitalsBar`** — composes `HPBar` + `Chip` from `@questra/ui` rather than
reinventing bars and pills. Computes nothing except display: `bloodied` is
already decided in `toVitals()` as `hp > 0 && hp <= floor(maxHp/2)` and surfaces
as a danger `Chip`. Temporary HP renders as a separate `+N temporary` line.

**`ActionBar`** — three fixed rows (Action / Bonus Action / Reaction), each
rendered only if it has tiles. Each tile shows name, `+N to hit`, a damage
`Chip`, and a resource `Chip` (`"2 of 2"`). Attacks are hard-coded to the
`action` row and resource-bearing features to `bonus` in `toActionTiles`.

**`DeathSaveCard`** — three success pips, three failure pips, one big button.
Disabled unless `phase === 'dying'`. Headlines per phase: *Making death saves /
Stable / Dead / Back on your feet*. Never mutates counters locally — it reports
the roll and the server decides.

**`DiceLog`** — an `<ol>` of already-formatted entries, newest last. Entries have
a `tone` (`roll` | `narration` | `system`); narration renders in full-strength
ink, rolls in soft ink. A roll entry may carry a `breakdown` (rendered as a mono
`"STR +3  Proficiency +2"` line) and a `total` (right-aligned mono). The text is
the engine's plain-English narration, so the log reads like table talk.

---

## The stories

| Story | Shows |
|---|---|
| `Vitals` | Healthy Torvald — HP 12/12, AC 18, no conditions. `onExplain` logs. |
| `VitalsBloodied` | HP 5/12 → the `Bloodied` chip appears, plus a Prone condition chip. |
| `Actions` | Torvald's turn — all tiles legal and live. |
| `ActionsGreyed` | The goblin's turn — every tile greyed, tooltip = server reject string. |
| `DeathSaves` | 1 success / 2 failures, live: clicking adds a success (harness state only). |
| `Log` | A roll entry with breakdown + total, followed by a narration entry. |
| `Hub` | The full tree, healthy state. |
| `HubDyingFlip` | HP 0 → ActionBar replaced by DeathSaveCard, vitals dimmed. |
| `HubComposedReview` | **The review story.** Hub + ComposeRollSheet side by side over the map. |

### `HubComposedReview` is the one to judge from

It puts every hub primitive on screen at once, in the design's real context:
identity header, bloodied+prone vitals, action tiles including a greyed one, a
three-entry dice log, and the compose sheet mid-roll. It exists so composition
can be judged directly rather than inferred from isolated parts — which
components hold up wearing the right tokens, and which are structurally wrong.

---

## Fixtures and staging

- **`torvald-sheet.json`** — the real contracts fixture, cast to `ComputedSheet`.
- **Torvald / goblin `Combatant`s** — hand-built to the trace's stated stats
  (Torvald: STR 16, AC 18, 12 HP; goblin: AC 15, 10 HP).
- **A 10×7 fully-revealed room** with both tokens placed.

Every story in this file is wrapped in a `TableBackdrop` decorator carrying that
room. This is deliberate: the design's panels are translucent glass meant to
float over the map, and on Storybook's flat canvas they read as washed out. The
backdrop reproduces the Player View's actual ground so what you see is what the
player sees. See [TableBackdrop.md](TableBackdrop.md).

## Related files

- `sheetToPlayerHub.ts` — the view-model seam (`toVitals`, `toActionTiles`).
- `sheetToPlayerHub.test.ts` — tests for that seam.
