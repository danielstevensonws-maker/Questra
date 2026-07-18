# Questra — Standing Orders for Every Session

You are building Questra, a D&D 5e (SRD 5.2.1) companion/VTT app. Read this file's rules before doing anything.

## Context routing (read ONLY what your task needs)
- Your task will name **one implementation brief** in `docs/briefs/`. Read it, plus `packages/contracts/src/`, plus `docs/adr/INDEX.md`. **Do not** read all ten design specs; briefs are self-contained.
- Design specs live in `docs/specs/` for reference when a brief explicitly points at one.
- If no brief covers your task, STOP and say so — do not improvise shapes.

## The non-negotiables
1. **Conform to `@questra/contracts`.** Types change only via a dedicated contract PR that also updates fixtures and tests. Never define a parallel/duplicate shape inline in a feature.
2. **The Engine never calls an AI model.** Determinism stays deterministic.
3. **Secret data is filtered server-side** (`packages/contracts/src/play/visibility.ts` is the choke point). Never rely on client-side hiding.
4. **Engine changes require golden tests** in the same PR. A rules bug fix ships with the test that would have caught it.
5. **Suggests, never commits:** every AI output renders in the accept/tweak/reject card; nothing auto-applies.
6. **Check the primitives table** (Build Playbook §3) before writing new UI — the component you need probably exists.
7. **Plain language in all user-facing strings:** never "beat" (say scene), never "node" (say member/portrait). `violatesPlainLanguage()` in contracts checks this; UI string tests must use it.
8. **Fixtures are canonical.** `packages/contracts/src/fixtures/` (Prone, Fireball, Goblin Warrior, Fighter, the Torvald trace) are byte-compared in tests — regenerate mocks from them, never hand-roll sample data.

## Session hygiene
- One vertical concern per session/PR. Start by reading (not recalling) the brief + contracts.
- `npm run check` in `packages/contracts` must pass before and after your change.
- New events/hooks/AI schemas → propose in a contract PR first, feature second.

## Locked decisions you must not re-litigate (full list: docs/adr/)
Server-authoritative event-sourced Engine · contract-first · effects-as-data (no rules if-statements outside the dataset) · milestone leveling default, multiclass v2 · assisted-manual cover + DM-revealed fog v1 · server dice + physical-dice manual entry · AI always has a non-AI fallback · CC-BY SRD attribution screen ships in v1.
