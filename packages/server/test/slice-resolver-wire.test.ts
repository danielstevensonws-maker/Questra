/**
 * Regression for the "no dice" bug. The dev-env slice resolver (app.ts) must emit
 * events the CLIENT can parse: the client wraps each event in ServerMsgSchema,
 * which requires `event.at` to be an ISO datetime. A non-ISO placeholder (the
 * original "t-0-a") made ServerMsgSchema.safeParse silently DROP every event
 * browser-side — intents were accepted but no roll/damage/narration reached the UI.
 *
 * This drives the real resolver and asserts every event it produces is a wire-valid
 * `{ m: 'event', event }` frame.
 */
import { describe, it, expect } from 'vitest';
import { ServerMsgSchema, PlayEventSchema } from '@questra/contracts';
import { initialState } from '@questra/engine';
import { makeSliceResolver, sliceCombatants } from '../src/app.js';

describe('slice resolver emits wire-valid events (no-dice regression)', () => {
  it('every event from a fresh attack has an ISO `at` and passes ServerMsgSchema', () => {
    const resolve = makeSliceResolver();
    const state = initialState(sliceCombatants());
    const result = resolve(
      { idempotencyKey: 'wire-test-1', intent: { kind: 'attack', attackerId: 'pc-torvald', targetId: 'npc-goblin-1', actionName: 'Longsword' } },
      state,
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events.length).toBeGreaterThan(0);

    for (const event of result.events) {
      // 1. the event itself is a valid PlayEvent (this is what caught the bug: `at`)
      expect(PlayEventSchema.safeParse(event).success).toBe(true);
      // 2. `at` is an ISO datetime, not a placeholder
      expect(() => new Date(event.at).toISOString()).not.toThrow();
      expect(event.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      // 3. the exact wire frame the client receives parses (the real gate)
      expect(ServerMsgSchema.safeParse({ m: 'event', event }).success).toBe(true);
    }
  });

  it('rejects a non-attack intent with a plain-language reason', () => {
    const resolve = makeSliceResolver();
    const state = initialState(sliceCombatants());
    const result = resolve({ idempotencyKey: 'wire-test-2', intent: { kind: 'look' } }, state);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.length).toBeGreaterThan(0);
  });
});
