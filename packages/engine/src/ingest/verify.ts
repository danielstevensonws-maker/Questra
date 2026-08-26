/**
 * Promotion — turning `qa: 'draft'` into `qa: 'verified'`, with evidence.
 *
 * WHY THE CORPUS WAS STUCK. Brief 01 §7 makes the loader refuse drafts outside
 * dev, which is the right rule and left 861 of 890 ingested entities unusable
 * in a real session: one monster, one spell, and no items at all. The compendium
 * browser served twenty-nine entries, and a DM pressing "Bring something in" was
 * offered a single goblin — the whole SRD sitting in the repo, unreachable.
 *
 * WHAT VERIFIED MEANS HERE, EXACTLY. `qa` is a claim, and flipping 861 of them
 * would have been a lie told at scale — the fifteen conditions earned theirs by
 * a rules-lawyer reading each one against the SRD and signing it off
 * (CONDITION-SIGNOFFS.md). So this does the one honest thing a machine can: it
 * re-reads each entity's structured numbers OUT OF ITS OWN `srd_text` and
 * promotes only where the two agree. An entity whose meta cannot be recovered
 * from the printed rule stays draft.
 *
 * That is a real check, not a rubber stamp. A monster is promoted because the
 * armour class, hit points and XP in its meta are the ones printed in its stat
 * block; an item because the price in copper is the price on the equipment
 * table. Transcription error is the failure mode this catches, and transcription
 * is the only step between the PDF and the meta.
 *
 * WHAT IT DOES NOT CERTIFY, and where the line is drawn:
 *
 *   SPELLS STAY DRAFT. Every one of the 338 carries `effects: []` with
 *   `resolution: 'routine'` — a claim that the engine resolves mechanics that
 *   have not been encoded. There is nothing here to check the meta against
 *   (a spell's rule is prose about saves, durations and damage, not a number
 *   printed twice), and promoting them would put unreviewed mechanics in front
 *   of players who cannot tell the app is wrong. They need the sign-off the
 *   conditions got.
 *
 *   ACTIONS AND PROSE ARE NOT CHECKED. A monster's Multiattack, its breath
 *   weapon, a feat's benefit — all of it is `srd_text` the DM reads and rules
 *   on. Promotion says the STAT BLOCK's numbers are right, not that the
 *   creature's behaviour has been encoded, because none of it is.
 */
import type { RulesEntity } from '@questra/contracts';

/** Copper value of each denomination the SRD prices in (1 gp = 100 cp). */
const DENOMINATION: Record<string, number> = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };

/** What was checked, and whether it held. One row per claim, so a failure names itself. */
export interface Evidence {
  claim: string;
  printed: number | null;
  recorded: number | null;
  holds: boolean;
}

export interface Verdict {
  id: string;
  /** Every claim that could be checked. Empty ⇒ nothing was checkable ⇒ not promoted. */
  evidence: Evidence[];
  verified: boolean;
  /** Why not, in a sentence, when it was not. */
  reason?: string;
}

/** Pull the first integer following a label out of the printed rule ("AC 19" → 19). */
function printedNumber(text: string, pattern: RegExp): number | null {
  const m = pattern.exec(text);
  if (!m?.[1]) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** The first price printed on an equipment row, in copper ("1 SP" → 10). */
function printedPriceCp(text: string): number | null {
  const m = /([\d,]+)\s*(CP|SP|EP|GP|PP)\b/i.exec(text);
  if (!m?.[1] || !m[2]) return null;
  const unit = DENOMINATION[m[2].toLowerCase()];
  if (unit === undefined) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n * unit : null;
}

const check = (claim: string, printed: number | null, recorded: number | null): Evidence =>
  ({ claim, printed, recorded, holds: printed !== null && printed === recorded });

/**
 * The claims a monster's stat block prints twice — once as prose, once as meta.
 *
 * These three because they are the numbers a fight actually consults: how hard
 * it is to hit, how much it can take, and what killing it is worth. A creature
 * whose armour class was mistyped is a creature every attack in the room is
 * measured wrongly against, and nobody at the table can tell.
 */
function monsterEvidence(e: RulesEntity): Evidence[] {
  const meta = e.meta as { ac?: number; hp?: { average?: number }; xp?: number };
  return [
    check('armour class', printedNumber(e.srd_text, /\bAC (\d+)/), meta.ac ?? null),
    check('hit points', printedNumber(e.srd_text, /\bHP ([\d,]+)/), meta.hp?.average ?? null),
    check('experience', printedNumber(e.srd_text, /XP ([\d,]+)/), meta.xp ?? null),
  ];
}

/** An item prints one number that matters: what it costs. */
function itemEvidence(e: RulesEntity): Evidence[] {
  const meta = e.meta as { costCp?: number };
  return [check('price', printedPriceCp(e.srd_text), meta.costCp ?? null)];
}

/**
 * Read one entity's numbers back out of its own printed rule.
 *
 * A type with no checkable claim returns no evidence and is not promoted —
 * silence is never taken for agreement.
 */
export function verdictFor(e: RulesEntity): Verdict {
  if (e.qa === 'verified') return { id: e.id, evidence: [], verified: true };

  const evidence =
    e.entityType === 'monster' ? monsterEvidence(e)
    : e.entityType === 'item' ? itemEvidence(e)
    : [];

  if (evidence.length === 0) {
    return {
      id: e.id, evidence, verified: false,
      reason: `Nothing in a ${e.entityType}'s meta is printed twice, so there is nothing to check it against. It needs a person.`,
    };
  }
  const failed = evidence.filter((x) => !x.holds);
  if (failed.length > 0) {
    return {
      id: e.id, evidence, verified: false,
      reason: `The printed rule and the recorded data disagree on ${failed.map((f) => f.claim).join(', ')}.`,
    };
  }
  return { id: e.id, evidence, verified: true };
}

/**
 * Promote what can be proven, leave the rest alone. Returns a NEW array — the
 * draft data is the ingestion's output and is never edited in place, so a
 * re-ingest still produces byte-identical drafts (Brief 01 acceptance #6).
 */
export function promoteVerifiable(entities: readonly RulesEntity[]): RulesEntity[] {
  return entities.map((e) => (verdictFor(e).verified ? { ...e, qa: 'verified' as const } : e));
}

/** Every entity that could not be proven, with the reason — for the report and the tests. */
export function unpromoted(entities: readonly RulesEntity[]): Verdict[] {
  return entities.map(verdictFor).filter((v) => !v.verified);
}
