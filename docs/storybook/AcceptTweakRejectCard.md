# Primitives/AcceptTweakRejectCard

**Story file:** `packages/web/src/primitives/AcceptTweakRejectCard.stories.tsx`
**Component:** `packages/web/src/primitives/AcceptTweakRejectCard.tsx`
**Spec:** AI Orchestration §4 · CLAUDE.md non-negotiable #5 · ADR "AI always has a non-AI fallback"

---

## Screens

**Global — every AI touchpoint on every screen.** Orchestration §4 states it
flatly: *"Any AI output that populates UI renders into the single
accept/tweak/reject card."* There is no second AI presentation anywhere in the
product.

Named consumers:

| Screen | AI output it frames |
|---|---|
| DM Play View | Rulings, NPC lines, read-aloud text |
| Campaign Wrapper | Premise drafts, bond proposals |
| Session Planner | Scene sequences, recaps |
| Character Wizard | Backstory drafts, portrait prompts |
| Level-up | Level-up nudges |

Briefs 09a (AI image), 09b (AI creative text), 09c (AI table-time) all render
through this card.

## What it is for

Being the universal AI-output *grammar* — and enforcing exactly one rule.

---

## How it functions

### Suggests, never commits

CLAUDE.md non-negotiable #5. Nothing here auto-applies. The draft sits in the
card until a human accepts it, tweaks it, or rejects it — **three motions,
always all three**, so the human gate is structural rather than a policy someone
could forget to implement.

The footer is the enforcement point:

```
[ Accept ]  [ Tweak ]  ······················  [ Reject ]
```

Reject is pushed to the far right by a flex spacer — a deliberate separation so
the destructive action is never adjacent to the primary one.

### Content-agnostic by design

`draft` is a `ReactNode`, not a typed AI schema. That is intentional: the AI
schemas it renders (`RulingSuggestion`, `NpcLine`, …) are their own contract PRs,
so the card is the *frame* and the schema-specific view is passed in. This
mirrors how `InfoPanel` takes an `InfoPanelData` view-model rather than a
contracts entity directly.

- A `string` draft renders as body text with `white-space: pre-wrap`.
- Any other node renders as-is — a ruling's check+DC grid, a bond's two
  portraits, whatever the schema's view component produces.

### Tweak mode

`onTweak` is optional, and its presence is what decides whether the Tweak button
exists. Non-textual drafts that can't be edited inline simply omit it and offer
accept/reject only (see the `RichDraft` story).

When present, Tweak swaps the body for a focused `<textarea>` seeded from
`tweakSeed`, and the footer becomes `Save changes` / `Cancel`. Confirming calls
`onTweak(editedText)`.

### Streaming state

`streaming` renders the draft with a blinking caret (`q-caret`, 1 s steps) and
`aria-busy`, and **suppresses the footer entirely** — you cannot accept a draft
that is still arriving. The header eyebrow reads `Suggestion`.

### The non-AI fallback

An ADR-level requirement: AI always has a non-AI fallback. When the model failed
or was skipped, the caller passes a `fallback` node instead of a draft. The card
then:

- swaps the header eyebrow to `Fallback`,
- renders the fallback body,
- hides Tweak (`canTweak` is false when falling back),
- keeps Accept/Reject, usually relabelled — the `Fallback` story uses
  `Use Medium (14)` / `Dismiss`.

So the human still has a complete path forward with the model entirely absent.

### Telemetry

`onOutcome(outcome)` fires on every terminal action with `'accepted' |
'tweaked' | 'rejected'`. Orchestration §4 treats this as the quality metric for
every prompt — the accept rate *is* how a prompt is judged.

### Presentation

- The `SuggestionMark` is a 6 px accent dot: quiet provenance ("an assistant made
  this"), never a warning icon.
- Themed entirely via `theme/tokens.css` variables.
- Reduced-motion disables the caret.

---

## The stories

| Story | Shows |
|---|---|
| `TextDraft` | A tweakable creative-text draft, seeded from the **real Fireball fixture's** `plain` line. All three motions live. |
| `RichDraft` | A schema-shaped ruling (Check / DC / On a fail as a `<dl>`). No `onTweak` → accept or reject only. |
| `Streaming` | A recap mid-arrival — blinking caret, no footer. |
| `Fallback` | The model failed. Body offers the difficulty ladder (Easy 10 · Medium 14 · Hard 18); buttons relabelled to `Use Medium (14)` / `Dismiss`. |

### The `Resolvable` harness

`TextDraft` and `RichDraft` wrap the card in a small harness that replaces it
with `Outcome logged: accepted` (plus the edited text, when tweaked) once a
motion is taken. This makes the telemetry the card emits visible in the story
rather than buried in a console log.

### Why the fixture seed matters

`TextDraft` builds its draft from `RulesEntitySchema.parse(fireball).plain`. In
production that text arrives from an AI schema derived from the same rules data
— so the story proves the card renders realistic content with no backend.
