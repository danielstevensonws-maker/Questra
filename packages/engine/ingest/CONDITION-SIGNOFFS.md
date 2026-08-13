# Condition rules-lawyer sign-offs — M1.1 (Brief 01 acceptance #3)

All 15 SRD 5.2.1 conditions ingested to `verified`. Each was read against its SRD
text and encoded into the contracts effect-hook vocabulary. Where a clause can't
be expressed as a hook, the entity is tagged `resolution: 'novel'` so the Engine
escalates it (the routine/novel boundary IS the hook union — Brief 01 §1 rule 1).

`srd_text` for every entry is verbatim from `pdftotext -raw` (the golden test
asserts the pipeline reproduces `prone.json`'s text byte-for-byte). The mechanical
claims below are asserted in `test/conditions.golden.test.ts`.

| # | Condition | Resolution | Encoded as hooks | Prose-only (→ escalated) | ✓ |
|---|-----------|------------|------------------|--------------------------|---|
| 1 | Blinded | novel | attack disadv (self), advantage (against self) | auto-fail any sight-based ability check | ✅ |
| 2 | Charmed | novel | — | can't attack/target the charmer; charmer's social advantage (per-target) | ✅ |
| 3 | Deafened | novel | — | auto-fail any hearing-based ability check | ✅ |
| 4 | Exhaustion | novel | −2×level on any D20 test; Speed −5×level; `meta.cumulative` | death at level 6; long-rest removal (lifecycle) | ✅ |
| 5 | Frightened | novel | disadv on checks + attacks while `source_visible` | can't willingly move toward the source (geometry) | ✅ |
| 6 | Grappled | novel | Speed 0; attack disadv vs non-grappler (`target_is_grappler`) | drag/carry extra-foot movement economy | ✅ |
| 7 | Incapacitated | novel | no action/BA/reaction/speech; Initiative disadv | Concentration broken (engine state transition) | ✅ |
| 8 | Invisible | novel | Initiative advantage; attack adv/disadv w/ `attacker_can_see_you` carve-out | concealment ("effects requiring you be seen") | ✅ |
| 9 | Paralyzed | **routine** | ⊃ Incapacitated; Speed 0; auto-fail STR/DEX saves; attacks-vs adv; melee-5ft auto-crit | — | ✅ |
| 10 | Petrified | novel | ⊃ Incapacitated; Speed 0; attacks-vs adv; auto-fail STR/DEX; resist all damage; immune Poisoned | transformation, ×10 weight, ceased aging | ✅ |
| 11 | Poisoned | **routine** | attack disadv (self); ability-check disadv | — | ✅ |
| 12 | Prone | **routine** | attack disadv (self); adv (against, melee-5ft); disadv (against, ranged); crawl-only; stand cost in `meta` | — (byte-matches `fixtures/prone.json`) | ✅ |
| 13 | Restrained | **routine** | Speed 0; attacks-vs adv; your attacks disadv; DEX-save disadv | — | ✅ |
| 14 | Stunned | **routine** | ⊃ Incapacitated; auto-fail STR/DEX saves; attacks-vs adv | — | ✅ |
| 15 | Unconscious | novel | ⊃ Incapacitated; ⊃ Prone; Speed 0; attacks-vs adv; auto-fail STR/DEX; melee-5ft auto-crit | drop held items; unaware; remain Prone when it ends | ✅ |

**Routine (fully hook-expressible): 6** — Paralyzed, Poisoned, Prone, Restrained, Stunned, and (mechanically) the composed parents.
**Novel (has a prose clause the Engine must rule on): 9.**

Notes for the reviewer:
- Composition (`includes_condition`) is used rather than restating a parent's effects, so Paralyzed/Petrified/Stunned/Unconscious inherit Incapacitated, and Unconscious also inherits Prone. A change to Incapacitated propagates automatically.
- The `auto_state: 'auto_fail_save'` qualifier carries `{ abilities: ['str','dex'] }` — the SRD's auto-fail is specifically Strength and Dexterity saves.
- Blinded/Deafened's auto-fail is on ability **checks** requiring sight/hearing; the hook vocabulary has an auto-fail-**save** state but no auto-fail-**check** state, so those clauses are novel. If a future contract PR adds an `auto_fail_check` state, these two can graduate to routine.
