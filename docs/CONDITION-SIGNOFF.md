# 15-Condition Rules-Lawyer Sign-Off — SRD 5.2.1

*Brief 04 §4 acceptance #1. This is the human QA pass over the condition dataset
(`packages/engine/src/data/conditions.ts`): each SRD block read by a rules lawyer
and encoded into the contracts effect-hook vocabulary. Where a clause has no hook,
the entity is `resolution: 'novel'` so the Engine escalates that clause to a Ruling
— that boundary IS the effect-hook union (Brief 01 §1 rule 1). The inline
`SIGN-OFF:` comment in the dataset is the source of truth; this table is its index.*

**Resolution key** — `routine`: every clause is a hook, the Engine applies it
deterministically with no AI. `novel`: at least one clause is prose the hook
vocabulary can't express, so the Engine escalates *that clause* to a Ruling (the
hook clauses still apply deterministically).

| # | Condition | Hooked clauses (deterministic) | Escalated clause (→ Ruling) | Resolution |
|---|-----------|-------------------------------|-----------------------------|------------|
| 1 | Blinded | attack disadvantage (self); advantage (against self) | auto-fail any sight-based ability check | novel |
| 2 | Charmed | can't target the charmer — `action_restriction{restrict_target:'source'}` | charmer's social-check advantage vs you (DM-adjudicated) | novel |
| 3 | Deafened | — | auto-fail any hearing-based ability check | novel |
| 4 | Exhaustion | −2×level on every D20 Test; Speed −5×level; `meta.cumulative` | death at level 6; long-rest removal (lifecycle) | novel |
| 5 | Frightened | disadvantage on checks + attacks while source visible (`source_visible`) | can't willingly move closer to the source (movement geometry) | novel |
| 6 | Grappled | Speed set 0; disadvantage vs non-grappler targets | drag/carry extra-foot movement economy | novel |
| 7 | Incapacitated | no action / bonus action / reaction; Initiative disadvantage if applied when rolling | concentration breaks; can't speak (state transition) | novel |
| 8 | Invisible | Initiative advantage; attack advantage (self) + disadvantage (against self), both carved by `attacker_can_see_you` | "unaffected by effects requiring you be seen" (concealment) | novel |
| 9 | Paralyzed | ⊃ Incapacitated; Speed 0; auto-fail STR/DEX saves; attacks vs you advantage; melee-5ft auto-crit | — | **routine** |
| 10 | Petrified | ⊃ Incapacitated; Speed 0; attacks vs you advantage; auto-fail STR/DEX saves; resistance **all** damage; immunity Poisoned | transformation, ×10 weight, ceased aging | novel |
| 11 | Poisoned | disadvantage on attack rolls + ability checks | — | **routine** |
| 12 | Prone | attack disadvantage (self); advantage (against, melee-5ft); disadvantage (against, ranged); crawl-only; stand-up cost in `meta.endedBy` — **byte-matches `fixtures/prone.json`** | — | **routine** |
| 13 | Restrained | Speed 0; attacks vs you advantage + your attacks disadvantage; DEX saves disadvantage | — | **routine** |
| 14 | Stunned | ⊃ Incapacitated; auto-fail STR/DEX saves; attacks vs you advantage | — | **routine** |
| 15 | Unconscious | ⊃ Incapacitated ∧ ⊃ Prone; Speed 0; attacks vs you advantage; auto-fail STR/DEX; melee-5ft auto-crit | drop held items; unaware; remain Prone when it ends | novel |

**Composition** (`includes_condition` hook, never restated): Paralyzed / Petrified /
Stunned ⊃ Incapacitated; Unconscious ⊃ Incapacitated ∧ Prone.

**Contract PRs that fell out of this pass** (Brief 04 §1, landed first as their own PR):
- `action_restriction` gained `restrict_target: 'source'` — Charmed's can't-target-the-charmer.
- `resistance.to` widened to `'all' | DamageType[]` — Petrified's resistance to all damage.

**Sign-off:** all 15 SRD condition blocks read and encoded; 6 fully routine, 9 carry
a genuinely prose clause the Engine escalates. Validated against `RulesEntitySchema`
on dataset export; Prone byte-matches its canonical fixture (golden test). The
duration/expiry and dying state machines that consume these are covered by
`packages/engine/test/dying-duration.golden.test.ts`.
