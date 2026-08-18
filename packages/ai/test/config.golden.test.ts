/**
 * Env-config wiring tests (ADR-0015). The app runs keyless: with no
 * QUESTRA_RULING_API_KEY, the factory returns a non-live stub and getRuling
 * falls back to the difficulty ladder. (Live vendor calls are the slice-env step,
 * not CI — no key is present here.)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { makeRulingModelFromEnv, makeImageGenFromEnv, getRuling, type RulingRecipe } from '../src/index.js';

const recipe: RulingRecipe = { declaredAction: 'x', actorSummary: 'y', sceneSummary: 'z', partyLevels: [1] };

describe('makeRulingModelFromEnv — keyless degrades to the ladder fallback', () => {
  const saved = process.env.QUESTRA_RULING_API_KEY;
  beforeEach(() => { delete process.env.QUESTRA_RULING_API_KEY; });
  afterEach(() => { if (saved !== undefined) process.env.QUESTRA_RULING_API_KEY = saved; });

  it('reports not-live and its model drives getRuling to the fallback', async () => {
    const { model, live } = makeRulingModelFromEnv();
    expect(live).toBe(false);
    const res = await getRuling(recipe, { model, timeoutMs: 50, fallbackRung: 'Hard' });
    expect(res.usedFallback).toBe(true);
    expect(res.suggestion.dc).toBe(15);
  });

  it('reports live when a key is present (constructs the real model, no call made)', () => {
    process.env.QUESTRA_RULING_API_KEY = 'sk-test-not-a-real-key';
    const { live } = makeRulingModelFromEnv();
    expect(live).toBe(true);
  });
});

describe('makeImageGenFromEnv — keyless returns the deterministic stub', () => {
  const saved = process.env.QUESTRA_IMAGE_API_KEY;
  beforeEach(() => { delete process.env.QUESTRA_IMAGE_API_KEY; });
  afterEach(() => { if (saved !== undefined) process.env.QUESTRA_IMAGE_API_KEY = saved; });

  it('is not live without a key and generates deterministically', async () => {
    const { gen, live } = makeImageGenFromEnv();
    expect(live).toBe(false);
    const a = await gen.generate('prompt', [], 'terrain');
    const b = await gen.generate('prompt', [], 'terrain');
    expect(a.imageRef).toBe(b.imageRef);
  });
});
