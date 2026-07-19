/**
 * Rest transactions — Brief 07 §1. Pure and AI-free (ADR-0005). A rest is a
 * DM-confirmed intent → a review card ("will regain: …", computed per creature)
 * → a commit that emits ONE `rest_completed` plus an itemized cascade of
 * `healing_applied` / `resource_changed` / `exhaustion_changed`, all under one
 * causeId so the group is undoable together (the caller stamps the causeId).
 *
 * These functions take an explicit per-creature rest-resource snapshot (folded
 * by the caller from the log) and return the review + the event bodies — they
 * never mutate. Short rests are interactive (Hit-Dice spending is player-driven,
 * one die at a time); long rests are a single computed transaction.
 */
import type { PlayEvent } from '@questra/contracts';

type Body = PlayEvent['body'];

/** The per-creature resource snapshot a rest reads (folded from the log by the caller). */
export interface RestResources {
  creatureId: string;
  hp: number;
  maxHp: number;
  hitDie: number;              // faces: 6/8/10/12
  hitDiceRemaining: number;
  hitDiceMax: number;
  conMod: number;
  exhaustion: number;         // 0..6
  /** resource pools keyed by pool id (e.g. 'second_wind'), with recharge policy. */
  pools: RestPool[];
  /** spell-slot counts by level ('1'..'9'); long rest restores all. */
  slots?: Record<string, { max: number; remaining: number }>;
  lastLongRestAt?: number;    // ms epoch; the 16h lockout reads this
}

export interface RestPool {
  id: string;
  max: number;
  remaining: number;
  /** when the pool refills. `partial` recharges a fixed amount on a short rest. */
  recharge: 'per_short_rest' | 'per_long_rest';
  partialRecharge?: number;   // e.g. Second Wind: +1 per short rest (not a full refill)
}

// ---- long rest (§1) -------------------------------------------------------

const LONG_REST_LOCKOUT_MS = 16 * 60 * 60 * 1000;

/** Why a long rest can't be taken right now (plain-language reject, §1). */
export type RestRejection = { ok: false; reason: string };
export type RestOk = { ok: true };

/** Long rest requires ≥1 HP and respects the 16h lockout. `now` is passed in
 *  (the engine takes no clock — determinism). */
export function canLongRest(r: RestResources, now: number): RestOk | RestRejection {
  if (r.hp < 1) return { ok: false, reason: `${r.creatureId} is at 0 HP — a long rest needs at least 1 hit point first.` };
  if (r.lastLongRestAt !== undefined && now - r.lastLongRestAt < LONG_REST_LOCKOUT_MS) {
    return { ok: false, reason: `You can only benefit from one long rest every 16 hours — it's too soon since the last one.` };
  }
  return { ok: true };
}

export interface RestReview {
  kind: 'short' | 'long' | 'interrupted_partial';
  creatureId: string;
  lines: string[];          // plain-English "will regain" review lines
  events: Body[];           // the cascade the commit will emit (order-stable)
}

/** Compute the full long-rest transaction: all HP, all Hit Dice, exhaustion −1,
 *  all slots, per-long-rest recharges. Returns the review + itemized events. */
export function longRest(r: RestResources): RestReview {
  const lines: string[] = [];
  const events: Body[] = [];

  const hpGain = r.maxHp - r.hp;
  if (hpGain > 0) {
    lines.push(`Recover all ${hpGain} missing hit points (to ${r.maxHp}).`);
    events.push({ t: 'healing_applied', creatureId: r.creatureId, amount: hpGain, resultingHp: r.maxHp });
  }

  const hdGain = r.hitDiceMax - r.hitDiceRemaining;
  if (hdGain > 0) {
    lines.push(`Regain all ${hdGain} spent Hit Dice.`);
    events.push({ t: 'resource_changed', creatureId: r.creatureId, pool: 'hit_dice', delta: hdGain, remaining: r.hitDiceMax });
  }

  if (r.exhaustion > 0) {
    lines.push(`Reduce Exhaustion from ${r.exhaustion} to ${r.exhaustion - 1}.`);
    events.push({ t: 'exhaustion_changed', creatureId: r.creatureId, level: r.exhaustion - 1 });
  }

  for (const p of r.pools) {
    if (p.remaining < p.max) {
      lines.push(`Refill ${p.id} to ${p.max}.`);
      events.push({ t: 'resource_changed', creatureId: r.creatureId, pool: p.id, delta: p.max - p.remaining, remaining: p.max });
    }
  }

  for (const [lvl, s] of Object.entries(r.slots ?? {})) {
    if (s.remaining < s.max) {
      lines.push(`Restore all level-${lvl} spell slots.`);
      events.push({ t: 'resource_changed', creatureId: r.creatureId, pool: `slot_${lvl}`, delta: s.max - s.remaining, remaining: s.max });
    }
  }

  events.push({ t: 'rest_completed', creatureIds: [r.creatureId], kind: 'long', applied: summarize(events) });
  return { kind: 'long', creatureId: r.creatureId, lines, events };
}

// ---- short rest (§1, interactive Hit Dice) --------------------------------

/** One Hit-Die spend on a short rest: `1d{hitDie} + conMod`, minimum 1 healing.
 *  `roll` is the die result the caller obtained from the d20 pipeline (injected
 *  for determinism). Returns the healing_applied body + the HD resource decrement. */
export function spendHitDie(r: RestResources, roll: number, resultingHitDice: number): { events: Body[]; hpAfter: number } {
  const heal = Math.max(1, roll + r.conMod);
  const hpAfter = Math.min(r.maxHp, r.hp + heal);
  return {
    hpAfter,
    events: [
      { t: 'healing_applied', creatureId: r.creatureId, amount: hpAfter - r.hp, resultingHp: hpAfter },
      { t: 'resource_changed', creatureId: r.creatureId, pool: 'hit_dice', delta: -1, remaining: resultingHitDice },
    ],
  };
}

/** Finalize a short rest after the player stops spending Hit Dice: recharge
 *  `per_short_rest` pools fully and apply `partialRecharge` bumps (Second Wind +1).
 *  The interactive HD healing events were emitted per-die by `spendHitDie`; this
 *  adds the pool recharges and the terminal `rest_completed`. */
export function completeShortRest(r: RestResources, hdHealingEvents: Body[]): RestReview {
  const lines: string[] = [];
  const events: Body[] = [...hdHealingEvents];

  for (const p of r.pools) {
    if (p.remaining >= p.max) continue;
    if (p.partialRecharge) {
      // a partial-recharge pool (Second Wind: +1 per short rest) tops up by a
      // fixed amount, NOT to full — even though its cadence is per-short-rest.
      const next = Math.min(p.max, p.remaining + p.partialRecharge);
      lines.push(`${p.id}: ${p.remaining} → ${next}.`);
      events.push({ t: 'resource_changed', creatureId: r.creatureId, pool: p.id, delta: next - p.remaining, remaining: next });
    } else if (p.recharge === 'per_short_rest') {
      lines.push(`Refill ${p.id} to ${p.max}.`);
      events.push({ t: 'resource_changed', creatureId: r.creatureId, pool: p.id, delta: p.max - p.remaining, remaining: p.max });
    }
  }

  events.push({ t: 'rest_completed', creatureIds: [r.creatureId], kind: 'short', applied: summarize(events) });
  return { kind: 'short', creatureId: r.creatureId, lines, events };
}

// ---- interruption (§1) ----------------------------------------------------

/** A rest was interrupted after `elapsedMinutes`. ≥60 min ⇒ commit short-rest
 *  benefits as `interrupted_partial`; otherwise nothing is applied. */
export function onInterruption(r: RestResources, elapsedMinutes: number): RestReview | null {
  if (elapsedMinutes < 60) return null;
  const partial = completeShortRest(r, []);
  const events = partial.events.map((e) =>
    e.t === 'rest_completed' ? { ...e, kind: 'interrupted_partial' as const } : e,
  );
  return { kind: 'interrupted_partial', creatureId: r.creatureId, lines: partial.lines, events };
}

/** Roll up the cascade into the `rest_completed.applied` summary (itemized totals). */
function summarize(events: Body[]): Record<string, unknown> {
  const applied: Record<string, unknown> = {};
  for (const e of events) {
    if (e.t === 'healing_applied') applied['hpHealed'] = (Number(applied['hpHealed'] ?? 0)) + e.amount;
    if (e.t === 'exhaustion_changed') applied['exhaustion'] = e.level;
    if (e.t === 'resource_changed') {
      const pools = (applied['pools'] as Record<string, number>) ?? {};
      pools[e.pool] = e.remaining;
      applied['pools'] = pools;
    }
  }
  return applied;
}
