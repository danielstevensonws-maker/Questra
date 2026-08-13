/**
 * A stubbed RulingModel for tests and the slice (the real vendor model is the
 * slice-environment integration; CI runs stub-timing logic only — Brief 09c §5).
 * Deterministic: it streams a scripted RulingSuggestion in chunks, with an
 * optional delay/failure to exercise the timeout → fallback path.
 */
import type { RulingSuggestion } from '@questra/contracts';
import type { RulingModel, RulingRecipe, StreamChunk } from './ruling.js';

export interface StubModelConfig {
  /** the suggestion the stub "produces". */
  suggestion: RulingSuggestion;
  /** ms before the first token (to test the <2s target / timeout). */
  firstTokenDelayMs?: number;
  /** if true, the stream throws (to test the error → fallback path). */
  fail?: boolean;
  /** injected sleep for deterministic timing (defaults to real setTimeout). */
  sleep?: (ms: number) => Promise<void>;
}

export function makeStubModel(config: StubModelConfig): RulingModel {
  const sleep = config.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  return {
    async *streamRuling(_recipe: RulingRecipe, signal: AbortSignal): AsyncIterable<StreamChunk> {
      if (config.fail) throw new Error('stub model failure');
      if (config.firstTokenDelayMs) await sleep(config.firstTokenDelayMs);
      if (signal.aborted) return;
      // stream the JSON in a few chunks; first chunk marks firstToken
      const json = JSON.stringify(config.suggestion);
      const mid = Math.floor(json.length / 2);
      yield { text: json.slice(0, mid), firstToken: true };
      if (signal.aborted) return;
      yield { text: json.slice(mid), firstToken: false };
    },
  };
}
