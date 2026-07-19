/**
 * The real Anthropic-backed RulingModel (Brief 09c, ADR-0015 vendor wiring).
 *
 * This is the ONLY file in @questra/ai that imports a vendor SDK — the import
 * graph keeps `@anthropic-ai/sdk` out of every other module (09c/09a §5.4), so
 * swapping vendors is a config change, not a code change. The rest of the app
 * talks to the RulingModel interface; getRuling() still owns the timeout →
 * difficulty-ladder fallback, so the app runs with no key at all.
 *
 * The key is read from the environment (QUESTRA_RULING_API_KEY) — never hard-coded,
 * never committed. Absent key ⇒ this model is not constructed and the stub +
 * ladder fallback are used instead (see makeRulingModelFromEnv).
 */
import Anthropic from '@anthropic-ai/sdk';
import type { RulingModel, RulingRecipe, StreamChunk } from '../ruling.js';

export interface AnthropicRulingConfig {
  apiKey: string;
  /** default claude-opus-4-8 (latest, most capable); override via QUESTRA_RULING_MODEL. */
  model?: string;
}

/** The JSON shape the model is asked to produce — matches contracts RulingSuggestionSchema. */
const RULING_SYSTEM =
  'You are a Dungeons & Dragons 5e rules assistant helping a Dungeon Master adjudicate a player’s novel action. ' +
  'Propose ONE ability check with a fair DC and a plain-language consequence for failure. ' +
  'Respond with ONLY a JSON object of the form ' +
  '{"check":{"kind":"ability_check","ability":"<str|dex|con|int|wis|cha>","skill":"<optional skill slug>"},' +
  '"dc":<10-20>,"failConsequence":"<one sentence>","rationale":"<one sentence>"}. No prose outside the JSON.';

function userPrompt(recipe: RulingRecipe): string {
  return [
    `Declared action: ${recipe.declaredAction}`,
    `Actor: ${recipe.actorSummary}`,
    `Scene: ${recipe.sceneSummary}`,
    `Party levels: ${recipe.partyLevels.join(', ')}`,
  ].join('\n');
}

export function makeAnthropicRulingModel(config: AnthropicRulingConfig): RulingModel {
  const client = new Anthropic({ apiKey: config.apiKey });
  const model = config.model ?? 'claude-opus-4-8';

  return {
    async *streamRuling(recipe: RulingRecipe, signal: AbortSignal): AsyncIterable<StreamChunk> {
      // Stream so first-token latency is observable (Brief 09c <2s target) and long
      // outputs don't hit request timeouts. The JSON payload is short, so a small
      // max_tokens keeps the table-time ruling fast. (Adaptive thinking / effort
      // tuning is applied in the slice environment against a pinned current SDK;
      // omitted here so the wiring type-checks across SDK versions.)
      const stream = client.messages.stream(
        {
          model,
          max_tokens: 1024,
          system: RULING_SYSTEM,
          messages: [{ role: 'user', content: userPrompt(recipe) }],
        },
        { signal },
      );

      let firstTextSeen = false;
      for await (const event of stream) {
        if (signal.aborted) return;
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          const text = event.delta.text;
          if (text.length === 0) continue;
          yield { text, firstToken: !firstTextSeen };
          firstTextSeen = true;
        }
      }
    },
  };
}
