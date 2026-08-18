# Storybook Catalogue

One document per story file: what the component is for, how it works, and which
screen it belongs to. Written from the source as of the M3.4 (Brief 10) commit;
reconciled 2026-07-20 to current source (DiceTray added; counts + test list updated).

## The two Storybook trees

| Title prefix | What lives there |
|---|---|
| `Primitives/*` | The reusable Playbook §3 primitives, each judged in isolation on a flat canvas. |
| `Play/*` | The in-play surfaces, staged over a map — glass is judged in context, never flat. |

Almost every story is a primitive or a composition of primitives. The one
exception is **`Play/Player View v2`**, which is a whole screen: the frame, the
ground and every overlay, composed and interactive. "Screen" elsewhere in these
docs means *the screen this primitive is destined for*, per its brief.

## Two live concepts for the Player View

`Play/PlayerHub` and `Play/Player View v2` are **both current** and neither
supersedes the other — they are two authored directions for the same surface,
kept side by side until the owner picks one. v1 is a bar of panels docked to the
bottom of a map; v2 floats discrete panels over a full-bleed map, with turn order
down the left as its organising idea and the action bar centred. They share
`@questra/ui` and the `--qa-*` tokens and nothing else.

## Index

| Doc | Component(s) | Storybook title | Screen |
|---|---|---|---|
| [PlayerHub](PlayerHub.md) | `PlayerHub` + `VitalsBar` + `ActionBar` + `DeathSaveCard` + `DiceLog` | `Play/PlayerHub` | Player View (concept 1) |
| [PlayerViewV2](PlayerViewV2.md) | `PlayerViewV2` + `RoundSpine` + `SceneRail` + `NearEdge` + `ActionRows` + `JournalRail` + `TableGround` + overlays | `Play/Player View v2` **and** `Play/Player View v2/*` | Player View (concept 2) |
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

94 exported stories across 17 story files. `TableBackdrop` and v2's `stage.tsx`
are the only components with no story of their own, correctly — they are
Storybook stages, not product UI. (`DiceTray` has a story but its per-component
catalogue doc is not yet written — the one gap in this index.)

Player View v2 is the only surface with **both** a composed screen story and a
story file per panel. That is deliberate: it is the only whole screen in the
tree, and a screen has to be judged assembled *and* part by part.

## Coverage gaps

- **Screens**: one exists — `Play/Player View v2`, the whole player screen
  composed and interactive. Every other title is a primitive or a composition of
  them.
- **Casters**: the *design* is now exercised — `Play/Player View v2 →
  MiraTheCleric` and `MirasSpellbook` show a Cleric 3 with prepared spells in
  the action row, slot counts, a concentration badge and a filled Spells tab.
  The *engine* is not: `sim/sheet.ts` attaches `spellcasting` only for
  `casterType === 'full'` (so **Paladin and Ranger get nothing at any level**)
  and hardcodes `prepared: []`, so there are no spell cards on any sheet for any
  class. Mira's numbers are hand-authored and pinned by
  `test/v2-caster-fixture.test.ts`. See PlayerViewV2.md's Known gaps.
- **Briefs with no primitive yet**: 07 (rests/leveling), 11 (campaign data ops),
  12 (library/moderation), 13 (onboarding), 14 (accounts/app shell), 15 (voice/audio).
- **Unit-tested primitives**: `ComposeRollSheet` (`ComposeRollSheet.test.tsx`) and
  `DiceTray` (`DiceTray.test.ts`), alongside `sheetToPlayerHub.test.ts` for the seam.
