/**
 * Ruling tier tests — Brief 09c §6 (the CI-runnable subset; live p95 is the
 * slice-environment step). A stubbed model streams a suggestion; the ladder
 * fallback fires on timeout and on malformed/failed output; the DM's Ask/Change/
 * No-roll choices become the right ruling_decided handoff.
 */
import { describe, it, expect } from 'vitest';
import { RulingSuggestionSchema, type RulingSuggestion } from '@questra/contracts';
import { getRuling, toRulingDecidedBody, type RulingRecipe, type RulingModel } from '../src/ruling.js';
import { makeStubModel } from '../src/stub-model.js';

const recipe: RulingRecipe = {
  declaredAction: 'I swing across the chasm on the chandelier.',
  actorSummary: 'Torvald, Fighter 1, DEX +1',
  sceneSummary: 'A wide gap over a pit; a chandelier hangs mid-span.',
  partyLevels: [1],
};

const suggestion: RulingSuggestion = {
  check: { kind: 'ability_check', ability: 'dex', skill: 'acrobatics' },
  dc: 14,
  failConsequence: 'The rope slips; you fall prone at the chasm’s edge.',
  rationale: 'Swinging on a rope is a Dexterity (Acrobatics) check.',
};

/** a fake monotonic clock so timing is deterministic. */
function fakeClock(): { now: () => number; advance: (ms: number) => void } {
  let t = 0;
  return { now: () => t, advance: (ms) => { t += ms; } };
}

describe('§6 #1 — a streamed suggestion parses and validates', () => {
  it('the stub model produces a schema-valid RulingSuggestion', async () => {
    const model = makeStubModel({ suggestion, sleep: async () => {} });
    const res = await getRuling(recipe, { model, timeoutMs: 6000 });
    expect(res.usedFallback).toBe(false);
    expect(() => RulingSuggestionSchema.parse(res.suggestion)).not.toThrow();
    expect(res.suggestion).toEqual(suggestion);
    expect(res.outcome.outcome).toBe('streamed');
    expect(res.outcome.firstTokenMs).not.toBeNull();
  });

  it('Ask ⇒ ruling_decided{ask_roll, applied:{kind,dc}}; the pipeline gets the exact check', () => {
    const body = toRulingDecidedBody({ decision: 'ask_roll', suggestion });
    expect(body).toEqual({ t: 'ruling_decided', decision: 'ask_roll', applied: { kind: 'ability_check', dc: 14 } });
  });

  it('Change ⇒ the edited dc/check flows through the same handoff', () => {
    const edited: RulingSuggestion = { ...suggestion, dc: 18 };
    const body = toRulingDecidedBody({ decision: 'changed', suggestion: edited });
    expect(body).toEqual({ t: 'ruling_decided', decision: 'changed', applied: { kind: 'ability_check', dc: 18 } });
  });

  it('No roll ⇒ clean close, no applied check', () => {
    expect(toRulingDecidedBody({ decision: 'no_roll' })).toEqual({ t: 'ruling_decided', decision: 'no_roll' });
  });
});

describe('§6 #2 — timeout ⇒ the fallback ladder card renders and functions with the model dead', () => {
  it('a slow model past the timeout falls back to a valid ladder suggestion', async () => {
    const clock = fakeClock();
    // model that never yields before abort: sleep resolves only after the timer aborts
    const model: RulingModel = {
      async *streamRuling(_r, signal) {
        // simulate a hang: wait for abort, yield nothing
        await new Promise<void>((resolve) => {
          if (signal.aborted) return resolve();
          signal.addEventListener('abort', () => resolve(), { once: true });
        });
      },
    };
    const res = await getRuling(recipe, { model, timeoutMs: 10, now: clock.now, fallbackAbility: 'dex', fallbackRung: 'Hard' });
    expect(res.usedFallback).toBe(true);
    expect(res.outcome.outcome).toBe('fallback_timeout');
    expect(() => RulingSuggestionSchema.parse(res.suggestion)).not.toThrow();
    expect(res.suggestion.dc).toBe(15); // Hard
  });

  it('a failing model falls back too (fallback_error)', async () => {
    const model = makeStubModel({ suggestion, fail: true });
    const res = await getRuling(recipe, { model, timeoutMs: 100, fallbackRung: 'Moderate' });
    expect(res.usedFallback).toBe(true);
    expect(res.outcome.outcome).toBe('fallback_error');
    expect(res.suggestion.dc).toBe(13);
  });

  it('malformed model output (not a valid suggestion) falls back', async () => {
    const badModel: RulingModel = {
      async *streamRuling() { yield { text: '{"not":"a ruling"}', firstToken: true }; },
    };
    const res = await getRuling(recipe, { model: badModel, timeoutMs: 100 });
    expect(res.usedFallback).toBe(true);
    expect(res.outcome.outcome).toBe('fallback_error');
  });
});

describe('§5 — ai_outcome telemetry is emitted per call', () => {
  it('carries firstTokenMs/totalMs/cacheHit/outcome', async () => {
    const model = makeStubModel({ suggestion, sleep: async () => {} });
    const res = await getRuling(recipe, { model });
    expect(res.outcome).toMatchObject({ touchpoint: 'ruling_suggestion', cacheHit: false, outcome: 'streamed' });
    expect(typeof res.outcome.totalMs).toBe('number');
  });
});
