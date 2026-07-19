/**
 * Env-config wiring (ADR-0015). The app calls makeRulingModelFromEnv() and gets
 * a real vendor model the moment a key is supplied — with no key, it gets a stub
 * so the app runs keyless (getRuling still owns the difficulty-ladder fallback,
 * so a missing key degrades gracefully, never crashes).
 *
 * Keys come from the environment (.env.local, gitignored). This module reads
 * process.env lazily so importing @questra/ai never requires a key.
 */
import type { RulingModel } from './ruling.js';
import { makeStubModel } from './stub-model.js';
import { makeAnthropicRulingModel } from './vendors/anthropic-ruling-model.js';
import { makeStubImageGen, type ImageGen } from './imagegen/service.js';

function env(name: string): string | undefined {
  const v = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.[name];
  return v && v.trim() !== '' ? v.trim() : undefined;
}

export interface RulingModelSelection {
  model: RulingModel;
  /** true when a real vendor model was constructed (a key was present). */
  live: boolean;
}

/**
 * Build the ruling model from the environment. If QUESTRA_RULING_API_KEY is set,
 * returns the real Anthropic model; otherwise a stub that always "fails", so
 * getRuling() falls back to the difficulty ladder — the app is fully functional
 * with no key, and activates the moment a key is supplied.
 */
export function makeRulingModelFromEnv(): RulingModelSelection {
  const apiKey = env('QUESTRA_RULING_API_KEY');
  if (apiKey) {
    const model = env('QUESTRA_RULING_MODEL');
    return { model: makeAnthropicRulingModel(model ? { apiKey, model } : { apiKey }), live: true };
  }
  // keyless: a stub that fails ⇒ getRuling uses the ladder fallback.
  return {
    model: makeStubModel({
      suggestion: { check: { kind: 'ability_check', ability: 'dex' }, dc: 13, failConsequence: '', rationale: '' },
      fail: true,
    }),
    live: false,
  };
}

export interface ImageGenSelection {
  gen: ImageGen;
  live: boolean;
}

/**
 * Build the ImageGen from the environment. With QUESTRA_IMAGE_API_KEY set, a real
 * vendor implementation would slot in here (behind the same ImageGen seam, no
 * caller change); until one is wired, we return the deterministic stub so the
 * app runs keyless. The seam is what ADR-0015 requires; the concrete vendor call
 * is the slice-environment step.
 */
export function makeImageGenFromEnv(): ImageGenSelection {
  const apiKey = env('QUESTRA_IMAGE_API_KEY');
  // A real vendor ImageGen constructs here when apiKey is present. It lives in
  // its own vendors/ module (import-graph rule) exactly like the ruling model.
  // Not yet wired to a concrete image vendor; the stub keeps the app running.
  return { gen: makeStubImageGen(), live: apiKey !== undefined };
}
