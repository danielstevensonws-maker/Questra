/**
 * The table-time Ruling tier (Brief 09c §1–§2). On an `escalated_to_ruling`, a
 * RulingSuggestion is streamed to the DM's accept/tweak/reject card. Everything
 * here is designed around the <2s first-token target and the non-negotiable
 * fallback: if the model is slow/down, the difficulty-ladder card takes over —
 * fully functional, no model (ADR: AI always has a non-AI fallback).
 *
 * The Engine never imports this (ADR-0005). The flow: engine emits
 * escalated_to_ruling → this tier proposes → the DM's choice becomes
 * ruling_decided → the pipeline resolves. The AI only ever *suggests*.
 */
import {
  RulingSuggestionSchema,
  DIFFICULTY_LADDER,
  ladderFallback,
  type RulingSuggestion,
  type Ability,
} from '@questra/contracts';

/** The precomputed recipe (Brief 09c §1) — small, cache-friendly, pre-warmed on state change. */
export interface RulingRecipe {
  /** the declared action, verbatim. */
  declaredAction: string;
  /** a one-line actor sheet summary (level, key mods). */
  actorSummary: string;
  /** target / scene combat state summary. */
  sceneSummary: string;
  partyLevels: number[];
}

/** A streamed model token. */
export interface StreamChunk { text: string; firstToken: boolean }

/** The model seam: streams tokens for a ruling prompt. One implementation per vendor. */
export interface RulingModel {
  /** Stream a JSON RulingSuggestion for the recipe. Throws/aborts on error → fallback. */
  streamRuling(recipe: RulingRecipe, signal: AbortSignal): AsyncIterable<StreamChunk>;
}

/** Telemetry emitted per call (Brief 09c §5). The slice report publishes p50/p95 from these. */
export interface AiOutcome {
  touchpoint: 'ruling_suggestion';
  firstTokenMs: number | null;  // null when it fell to fallback before any token
  totalMs: number;
  cacheHit: boolean;
  outcome: 'streamed' | 'fallback_timeout' | 'fallback_error';
}

export interface RulingResult {
  suggestion: RulingSuggestion;
  outcome: AiOutcome;
  /** true when this came from the no-model ladder fallback. */
  usedFallback: boolean;
}

export interface RulingOptions {
  model: RulingModel;
  /** hard timeout → fallback (Brief 09c §1: 6s). */
  timeoutMs?: number;
  /** injected clock for deterministic tests (ms). Defaults to a monotonic clock. */
  now?: () => number;
  /** ability to default the fallback ladder to when the model is unavailable. */
  fallbackAbility?: Ability;
  /** ladder rung label for the fallback default. */
  fallbackRung?: string;
}

/**
 * Get a ruling: race the streaming model against the timeout; on timeout or
 * error, fall back to the difficulty ladder (fully functional, no model).
 * Returns the parsed suggestion + telemetry.
 */
export async function getRuling(recipe: RulingRecipe, opts: RulingOptions): Promise<RulingResult> {
  const now = opts.now ?? (() => Date.now());
  const timeoutMs = opts.timeoutMs ?? 6000;
  const start = now();
  const controller = new AbortController();

  const fallback = (outcome: AiOutcome['outcome']): RulingResult => {
    const rung = DIFFICULTY_LADDER.find((r) => r.label === (opts.fallbackRung ?? 'Moderate')) ?? DIFFICULTY_LADDER[1]!;
    return {
      suggestion: ladderFallback(opts.fallbackAbility ?? 'dex', rung),
      outcome: { touchpoint: 'ruling_suggestion', firstTokenMs: null, totalMs: now() - start, cacheHit: false, outcome },
      usedFallback: true,
    };
  };

  try {
    let firstTokenMs: number | null = null;
    let buffer = '';
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      for await (const chunk of opts.model.streamRuling(recipe, controller.signal)) {
        if (chunk.firstToken && firstTokenMs === null) firstTokenMs = now() - start;
        buffer += chunk.text;
      }
    } finally {
      clearTimeout(timer);
    }
    if (controller.signal.aborted) return fallback('fallback_timeout');

    // parse + validate the streamed JSON against the contracts schema; malformed → fallback (§ retry-then-fallback)
    const parsed = RulingSuggestionSchema.safeParse(JSON.parse(buffer));
    if (!parsed.success) return fallback('fallback_error');
    return {
      suggestion: parsed.data,
      outcome: { touchpoint: 'ruling_suggestion', firstTokenMs, totalMs: now() - start, cacheHit: false, outcome: 'streamed' },
      usedFallback: false,
    };
  } catch {
    return fallback('fallback_error');
  }
}

/** The three DM choices on the ruling card (Brief 09c §1). */
export type RulingDecision =
  | { decision: 'ask_roll'; suggestion: RulingSuggestion }
  | { decision: 'changed'; suggestion: RulingSuggestion }   // edited dc/check
  | { decision: 'no_roll' };

/** Turn a DM's card choice into the `ruling_decided` event body the pipeline consumes. */
export function toRulingDecidedBody(choice: RulingDecision): {
  t: 'ruling_decided';
  decision: 'ask_roll' | 'changed' | 'no_roll';
  applied?: { kind: RulingSuggestion['check']['kind']; dc: number };
} {
  if (choice.decision === 'no_roll') return { t: 'ruling_decided', decision: 'no_roll' };
  return { t: 'ruling_decided', decision: choice.decision, applied: { kind: choice.suggestion.check.kind, dc: choice.suggestion.dc } };
}
