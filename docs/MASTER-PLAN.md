# Questra — Master Build Plan (Start to End)

*The one document that sequences everything. Each milestone lists: its briefs, its exit criteria, and what runs in parallel. Rule from ADR-0013: the first task of every milestone is revalidating its brief(s) against current contracts.*

## M0 — Foundation *(done)*
Contracts package (typed, tested, 19 green), fixtures, CLAUDE.md, ADRs 0001–0014, specs + all 13 briefs in-repo.
**Exit:** `npm run check` green. ✅

## M1 — Rules Data
Briefs: 01 (+ 04's fourteen condition fixtures fold in here). Build the ingestion pipeline, ingest SRD 5.2.1 to `verified` (classes, species, backgrounds, feats, spells, monsters, items+prices, conditions, XP + difficulty-ladder tables), grow the golden suite alongside.
**Parallel:** Claude Design produces the visual direction + mockups for player hub, DM screen, wizard, map (ADR-0014); token set lands in the repo theme.
**Exit:** counts complete; 15 condition sign-offs; fixtures byte-stable; attribution screen content ready (ADR-0010).

## M2 — The Vertical Slice *(the measured gate)*
Briefs: 02 (engine), 03 (sheet), 05 (sync), 06 (map), 09c minimal (one Ruling path + fallback ladder), 09a minimal (one terrain + one asset generation).
Build exactly the Playbook §7 slice: room → asset → two tokens → player attack (server dice) → auto-narration → OA prompt → novel action → streamed Ruling <2s → Undo, on two devices.
**Exit:** every Playbook metric measured and published to an ADR (first-token p95, roll→narration round trip, replay determinism, fog payload cleanliness). *Go/no-go on the AI bets happens here, by numbers.*

## M3 — Full Combat & the Play Screens
Briefs: 04 (complete), 07, 08, 10. Everything Part-1/Part-2 of the In-Play spec, dying, rests, leveling, bosses, both screens to Design-matched polish, table_display mode.
**Exit:** a real table can run a full multi-session fight arc with zero spreadsheet fallback; all golden suites green; greying-parity and payload-cleanliness tests green.

## M4 — Prep: Wizard, Planner, Campaign
Briefs: 11, 09b, plus the wizard/planner UI work (Design-matched, built from the primitives). Character Wizard steps 0–5 + reveal (09a full), Session Planner (sequencer, room editor reusing M2's canvas edit mode, session kit, Your Players), Campaign Wrapper (premise chips, pools, bonds web, promotions, secrets, story-so-far jobs).
**Exit:** the experienced-DM loop (Campaign spec §12 build order) works end to end: create → invite → wizard → plan → play → recap.

## M5 — Homebrew & Community
Briefs: 12 + the homebrew builder flow (wizard spec §6 over the Brief 01 schema). Builder, balance check, library, moderation queue, approval gate.
**Exit:** publish→import→approve→build→play a homebrew class end to end; gate lint green; moderation single-entry-point lint green.

## M6 — Voice & Immersion
TTS voice library (curated, no cloning), NPC Become, narrator read-aloud, STT dictation, voice-transform behind a flag; immersion console effects complete; reduce-motion + accessibility pass.
**Exit:** a social scene runs with per-NPC voices; accessibility checklist signed.

## M7 — Onboarding *(last, by design)*
Brief: 13. The ramp, gating flags wired through every surface, silent scaffolding, the authored demo party + tuned fight, veteran skip, the pyramid motif.
**Exit:** a brand-new account reaches the Floor 1 payoff in ≤5 minutes and Floor 4 reveal in one sitting (scripted usability runs, n≥5); a veteran lands on the wrapper in two clicks.

## M8 — Hardening & Launch
Load/soak on sync (target: 8-player table, 4-hour session, zero desyncs), backup/export GA, quotas + billing seams live, legal review (ADR-0010: SRD attribution, AI-art policy, UGC terms, privacy), moderation staffing plan, telemetry dashboards (ai_outcome, cost per touchpoint), incident runbook.
**Exit:** launch checklist signed.

## Standing risks & their tripwires
- **Table-time AI latency** — tripwire: M2 p95 >2s ⇒ walk the 09c ladder before M3.
- **Asset generation quality** — tripwire: M2 asset acceptability fails ⇒ library-first strategy leads (curated packs), generation demoted to supplement.
- **Multiplayer feel** — tripwire: M2 round-trip feels laggy on real networks ⇒ prediction work before M3, not after launch.
- **Ingestion underestimation** — M1 is the schedule's long pole; parallelize QA sign-offs, never skip them.

*Definition of "app built start to end": M8 exit. Everything needed to get there now exists in this repo: 10 specs, 13 briefs, 14 ADRs, tested contracts, canonical fixtures, this plan.*
