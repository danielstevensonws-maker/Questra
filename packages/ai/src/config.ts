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
  /** true only when a REAL vendor is behind the seam — never merely because a key is set. */
  live: boolean;
  /** true when a key is configured. With `live: false` that pair means "configured, and inert". */
  keyPresent: boolean;
}

/**
 * Build the ImageGen from the environment.
 *
 * `live` MEANS A REAL VENDOR ANSWERED, and it used to lie: with a key present it
 * reported `live: true` while handing back the deterministic stub. Nothing yet
 * reads it, which is the only reason that had not caused an incident — but
 * ADR-0017's asset-acceptability row is meant to be measured against a live
 * vendor, and a gate that reads `live` would have recorded a verdict on
 * `stub://` refs and called the AI bet settled.
 *
 * There is no image vendor wired, and that is an owner decision rather than a
 * missing line of code: it carries a bill and an AI-art policy (ADR-0010, and
 * ADR-0016's DP-1 on tiers and quotas). When one is chosen it constructs here,
 * behind this same seam, in its own vendors/ module exactly like the ruling
 * model — the import-graph rule (09a §5.4) means no caller changes.
 *
 * The key is still read, so `keyPresent` can say "somebody has configured this
 * and it is not doing anything", which is a thing worth being able to see.
 */
export function makeImageGenFromEnv(): ImageGenSelection {
  return { gen: makeStubImageGen(), live: false, keyPresent: env('QUESTRA_IMAGE_API_KEY') !== undefined };
}
