# Questra — Claude Code Build Prompts

*Copy-paste prompts, one per session. Each is scoped to a single vertical concern (Playbook rule). Paste the prompt, let the session finish, review, commit, move on. Every prompt assumes the session reads CLAUDE.md first — that's where the standing orders live, so these prompts stay short.*

**Universal preamble (Claude Code reads CLAUDE.md automatically, but for clarity every session inherits these):**
> Read CLAUDE.md, the ADR index, and ONLY the brief(s) named in this task. Conform to `@questra/contracts`; if you need a new shape, propose it as a contracts change first (types + fixtures + tests), then build. Do not read all ten specs. Do not copy prototype code — match its look/behavior, rebuild against contracts. Run the relevant `npm run check` before and after.

---

## Handing over the prototype (do this once, first)
> I have an earlier visual prototype of Questra at `<path or screenshots>`. Treat it as VISUAL AND INTERACTION REFERENCE ONLY (ADR-0014). Do not import, copy, or extend its code — it predates the contracts and holds state incorrectly. When you build a screen the prototype covers, reproduce its look and interaction feel against `@questra/contracts` and the primitives library. The design tokens in `packages/web/src/theme/tokens.css` are the source of truth for the look; if the prototype and tokens disagree, tokens win.

## Installing the Claude Design token set (do this once, when ready)
> Replace the placeholder values in `packages/web/src/theme/tokens.css` with this Claude Design token set: `<paste tokens>`. Keep the CSS variable NAMES stable. Do not touch any component. After the swap, run Storybook and confirm every primitive re-themes with no component edits — that's the ADR-0014 contract.

---

## MILESTONE 0 — scaffold *(mostly done; finishing tasks)*
**0.1 — Install deps & confirm the scaffold runs**
> The monorepo scaffold exists (`packages/contracts` built + tested; `packages/web` with Vite/React/Tailwind/Storybook, the theme tokens, and the InfoPanel primitive). Run `npm install` at root, then `npm run check` and `npm run storybook -w @questra/web`. Fix any install/config issues. Confirm the InfoPanel stories render against the real fixtures. Report what's green.

**0.2 — Build the remaining primitives (the Playbook §3 library)**
> Build these primitives in `packages/web/src/primitives/`, each with Storybook stories against contracts fixtures, each themed only via `theme/tokens.css` variables (no hardcoded look), matching the InfoPanel's structure as the reference: (a) AcceptTweakRejectCard — the universal AI-output card; (b) PublicSecretField — the public/secret split input; (c) PullFromCampaignPicker — reference picker; (d) CardSequencer — reorderable card list (scenes/sessions); (e) PromptHolderCard — the interrupt card (brief-08); (f) PresetsAboveFreeForm — the chips+freeform input (wizard/premise/onboarding). One PR per primitive. Do NOT build screens yet.

---

## MILESTONE 1 — rules data
**1.1 — Revalidate + ingestion pipeline (ADR-0013 first)**
> First revalidate brief-01 against current `@questra/contracts` — note any drift in a comment at the top of the brief. Then build the SRD 5.2.1 ingestion pipeline per brief-01 §7: `pdftotext -layout` → per-type section splitters → structured drafts → a `verified` flag workflow. Target the four fixtures byte-for-byte (they're the acceptance test). Start with conditions (all 15) and the SRD monster + spell + class you need for the slice. Grow the golden suite alongside. Engine refuses `draft` entities outside dev.

**1.2 — Complete the rules dataset**
> Continue brief-01 ingestion to completeness: 12 classes with full 1–20 level tables, 9 species, all backgrounds/feats, the full SRD spell + monster + item lists with prices, XP + difficulty-ladder tables. Every entity validates; every class level grants ≥1 feature (acceptance #4); the 15 condition rules-lawyer sign-offs ship as a checklist in the PR.

---

## MILESTONE 2 — the vertical slice *(the measured gate)*
**2.1 — Engine core + d20 pipeline**
> Build `packages/engine` implementing brief-02: the event-sourced projection (fold over the event log), the d20 pipeline (all 8 steps), advantage collapse, damage/condition/concentration cascades, undo-by-causal-group. The Torvald trace fixture is your golden test — it must reproduce byte-for-byte. All acceptance criteria in brief-02 §6 become passing golden tests. The engine is pure and never imports anything AI.

**2.2 — Character sheet computation**
> Build brief-03 in `packages/engine`: the pure function from CharacterChoices + rules data → ComputedSheet, every value carrying its derivation. The Torvald and Wizard-3 fixtures byte-match; derivations sum (property test). Illegal choices rejected with plain-language reasons.

**2.3 — Sync server + visibility**
> Build `packages/server` (Fastify + ws per ADR-0011) implementing brief-05: the wire protocol, join/snapshot/replay/reconnect, idempotent intents, presence, prompt timeouts. Reuse the contracts `eventVisibleTo` filter — NO second implementation. Wire golden test: a scripted Torvald session's player capture equals `filterStream` output byte-for-byte.

**2.4 — Map canvas + one AI ruling + slice assembly**
> Build the brief-06 map canvas (edit/play modes minimum) and the minimal brief-09c ruling path (one Ruling Suggestion streaming to the DM with the difficulty-ladder fallback) and brief-09a minimal (one terrain + one asset generation). Assemble the Playbook §7 vertical slice end-to-end on two browser windows. MEASURE: ruling first-token p50/p95, roll→narration round-trip, replay determinism, fog payload cleanliness. Write the numbers into a new ADR. This is the go/no-go gate.

---

## MILESTONE 3 — full combat & play screens
**3.1 conditions/dying (brief-04)** · **3.2 rests/leveling (brief-07)** · **3.3 boss prompts (brief-08)** · **3.4 player hub + DM screen (brief-10, matching the prototype look + Design tokens)** · **3.5 table-display mode**.
> (Run each as its own session, naming the one brief. brief-10 explicitly: reproduce the prototype's Player View v2 and DM View v2 look and interaction against the contracts + primitives; build from primitives, not standalone.)

## MILESTONE 4 — prep surfaces
**4.1 campaign data ops (brief-11)** · **4.2 creative-text AI (brief-09b)** · **4.3 Character Wizard full (wizard spec — the full spine: Step 0 fork, 12 class cards w/ complexity badges, 2024 origin order, 3 ability methods, InfoPanel everywhere, homebrew as an in-wizard option)** · **4.4 Session Planner full (sequencer + room editor reusing the canvas + session kit + Your Players)** · **4.5 Campaign Wrapper full (premise, pools, bonds web, promotions, secrets, story-so-far)**.

## MILESTONE 5 — homebrew & community
**5.1 homebrew builder (wizard spec §6, over the brief-01 schema — the differentiator)** · **5.2 balance check (brief-12 §4 math)** · **5.3 community library + moderation (brief-12)**.

## MILESTONE 6 — voice & immersion
**6.1 TTS voice library + NPC Become + narrator** · **6.2 STT + voice-transform (flagged)** · **6.3 immersion console effects + reduce-motion/accessibility pass**.

## MILESTONE 7 — onboarding *(last)*
**7.1 the ramp (brief-13): floor state machine, existence-gating wired through every surface, silent scaffolding, authored demo party + tuned fight, veteran skip, pyramid motif.**

## MILESTONE 8 — hardening & launch
**8.1 sync load/soak** · **8.2 export GA + backups** · **8.3 quotas/billing seams** · **8.4 legal review (ADR-0010) + moderation staffing** · **8.5 telemetry dashboards + incident runbook**.

---

### How to run a session (the loop)
1. Pick the next prompt. Paste it into Claude Code (in the repo).
2. Let it read CLAUDE.md + the brief, propose contract changes if needed, build, test.
3. Review the diff. Run `npm run check`. Commit.
4. If it drifted (invented a shape, skipped a test, copied prototype code) — reject, point at the ADR it violated, re-run.
5. Next prompt. One concern per session is the whole discipline.
