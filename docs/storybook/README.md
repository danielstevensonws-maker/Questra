# Storybook Catalogue

One document per story file: what the component is for, how it works, and which
screen it belongs to. Written from the source as of the M3.4 (Brief 10) commit;
reconciled 2026-07-20 to current source (DiceTray added; counts + test list updated).

## The two Storybook trees

| Title prefix | What lives there |
|---|---|
| `Primitives/*` | The reusable Playbook §3 primitives, each judged in isolation on a flat canvas. |
| `Play/*` | The in-play hub, staged over a real `MapCanvas` via `TableBackdrop` — glass is judged in context, never flat. |

There are **no screen-level stories**. Every story is a primitive or a
composition of primitives; the screens themselves are not built yet. "Screen" in
these docs means *the screen this primitive is destined for*, per its brief.

## Index

| Doc | Component(s) | Storybook title | Screen |
|---|---|---|---|
| [PlayerHub](PlayerHub.md) | `PlayerHub` + `VitalsBar` + `ActionBar` + `DeathSaveCard` + `DiceLog` | `Play/PlayerHub` | Player View |
| [ComposeRollSheet](ComposeRollSheet.md) | `ComposeRollSheet` | `Primitives/ComposeRollSheet` | Player View |
| [MapCanvas](MapCanvas.md) | `MapCanvas` | `Primitives/MapCanvas` | Map Editor · Play View · Table View |
| [PromptHolderCard](PromptHolderCard.md) | `PromptHolderCard` | `Primitives/PromptHolderCard` | Player View + DM View (overlay) |
| [InfoPanel](InfoPanel.md) | `InfoPanel` | `Primitives/InfoPanel` | Global (every screen) |
| [AcceptTweakRejectCard](AcceptTweakRejectCard.md) | `AcceptTweakRejectCard` | `Primitives/AcceptTweakRejectCard` | Global (every AI touchpoint) |
| [CardSequencer](CardSequencer.md) | `CardSequencer` | `Primitives/CardSequencer` | Session Planner · Campaign Wrapper |
| [PublicSecretField](PublicSecretField.md) | `PublicSecretField` | `Primitives/PublicSecretField` | Session Planner · Campaign Wrapper |
| [PullFromCampaignPicker](PullFromCampaignPicker.md) | `PullFromCampaignPicker` | `Primitives/PullFromCampaignPicker` | Session Planner |
| [PresetsAboveFreeForm](PresetsAboveFreeForm.md) | `PresetsAboveFreeForm` | `Primitives/PresetsAboveFreeForm` | Character Wizard · Campaign Wrapper · Onboarding |
| DiceTray *(per-component doc pending)* | `DiceTray` | `Primitives/DiceTray` | Player View (roll surface) |
| [TableBackdrop](TableBackdrop.md) | `TableBackdrop` | *(no story — decorator only)* | None (story infrastructure) |

## Story count

54 exported stories across 11 story files, covering 16 components (15 product +
1 story-only). `TableBackdrop` is the only component with no story of its own,
correctly — it is a Storybook stage, not product UI. (`DiceTray` has a story but its
per-component catalogue doc is not yet written — the one gap in this index.)

## Coverage gaps

- **Screens**: none exist. Player View is the closest — 10 of 16 components serve it.
- **Briefs with no primitive yet**: 07 (rests/leveling), 11 (campaign data ops),
  12 (library/moderation), 13 (onboarding), 14 (accounts/app shell), 15 (voice/audio).
- **Unit-tested primitives**: `ComposeRollSheet` (`ComposeRollSheet.test.tsx`) and
  `DiceTray` (`DiceTray.test.ts`), alongside `sheetToPlayerHub.test.ts` for the seam.
