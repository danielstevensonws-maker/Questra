# Primitives/MapCanvas

**Story file:** `packages/web/src/primitives/MapCanvas.stories.tsx`
**Component:** `packages/web/src/primitives/MapCanvas.tsx`
**Brief:** 06 §5 (Map Canvas) · §4.5 (one geometry) · CLAUDE.md non-negotiable #3 (server-side secrets)

---

## Screens

**One renderer, three screens.** This is the component with the widest screen
reach in the repo — the `mode` prop is what selects which screen it is serving.

| `mode` | Screen | Who is looking |
|---|---|---|
| `edit` | **Map Editor** (Session Planner) | The DM authoring a room. Sees everything: fog ignored, hidden tokens shown, prep notes available. |
| `play` | **Play View** (DM) | The DM running the session. Fog respected in the render, range rings and AoE previews available. |
| `table` | **Table View** (shared/spectator screen) | The whole table. Receives an already-filtered room and adds a `Table view` badge. |

`TableBackdrop` also composes it in `table` mode as the ground under the Player
View's HUD glass.

## What it is for

Drawing a contracts `Room` — grid, cell tags, fog, assets, tokens — for any of
the three audiences without a second implementation.

---

## How it functions

### It calls the ONE contracts geometry

Brief 06 §4.5. The component imports `distFt`, `affectedCells`, and `cellKey`
directly from `@questra/contracts` and never reimplements them. The consequence:
the range ring the DM sees and the AoE highlight the player sees are the *same
math* the engine batch-saves. There is no client-side approximation to drift.

- `measureFrom` → each cell within 15 ft renders its `distFt` number.
- `aoe: {shape, anchor}` → `affectedCells()` produces the highlight set, memoised.

### Fog is a server-side guarantee, not a render trick

CLAUDE.md non-negotiable #3. This component **never** performs the security
filtering. The caller passes a room that has already been run through
`filterRoomForViewer` for player/table viewers, so unrevealed cells and
hidden/staged tokens never reach the client in the first place.

The `isFogged` logic here is presentation only:

```
isFogged = mode !== 'edit' && !revealed.has(key)
```

`edit` mode sees all cells because the DM legitimately receives the full room.
`play` and `table` dim unrevealed cells — but if a hidden token *had* reached the
client, this component would happily draw it. That is why the filtering happens
upstream.

`TableModeFiltered` is the story that makes the boundary visible: it calls
`filterRoomForViewer(room, {role: 'player', accountId: 'acct-torvald'})` and the
hidden ambush token is simply *absent from the data*, not hidden by CSS.

### Layer order

1. **Terrain** — a placeholder tint (`--q-bg`); the real terrain image lands in
   a later slice.
2. **Grid + cell states** — one absolutely-positioned `<button>` per cell.
   Background precedence: fogged → in-AoE → difficult terrain → transparent.
3. **Assets** — dashed rectangles sized by `footprint`, `▪` when blocking and
   `▫` otherwise. `pointerEvents: none`.
4. **Tokens** — circles with two-letter initials derived from `creatureRef`.
   Staged tokens render at 55% opacity with a faint border instead of the accent.
5. **Table badge** — `mode === 'table'` only.

### Chrome

`chrome = mode !== 'table'` gates the range-ring numbers. The table view is a
spectator surface, so it carries no measurement chrome.

### Theming

Entirely CSS variables from `theme/tokens.css`. No hardcoded colours.

---

## The stories

All four use one 8×6 `vault` room with a partial `revealed` list, two difficult-
terrain cells, a blocking tomb asset with a prep note, and three tokens — one of
which (`npc-goblin-boss`) is `hidden: true`.

| Story | Mode | Shows |
|---|---|---|
| `EditMode` | `edit` | The planner's view: the whole room including the fogged area, the hidden ambush token, and the asset. |
| `PlayModeWithRange` | `play` | Fog respected; range rings measured from Torvald at `1,1`. |
| `AoePreview` | `play` | A 15-ft-radius sphere anchored on the goblin — the `affectedCells` highlight. |
| `TableModeFiltered` | `table` | The player-filtered room: no fogged cells, **no hidden ambush token**, no prep notes. |

The `EditMode` → `TableModeFiltered` pair is the story to read together: same
room, and the difference between them is exactly what `filterRoomForViewer`
removed.

## Props

| Prop | Purpose |
|---|---|
| `room` | The contracts `Room` — already filtered for the viewer's role. |
| `mode` | `edit` \| `play` \| `table`. |
| `cellPx` | Cell size in px (default 40; `TableBackdrop` uses 96). |
| `aoe` | `{shape, anchor}` to preview. |
| `measureFrom` | Cell to measure range rings from. |
| `onTokenClick` | Select or begin a move. |
| `onCellClick` | Paint (edit) or move target (play). |
