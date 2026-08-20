/**
 * The wizard's draft logic — the rules a player feels but never reads.
 *
 * Two behaviours here are easy to get wrong and impossible to notice from a
 * screenshot: assigning an ability score that is already somewhere else, and
 * the background spend budget. Both silently produce a character the engine
 * would reject or, worse, accept as wrong.
 */
import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { bonusTotal, useCharacterDraft } from '../src/wizard/useCharacterDraft.js';

/** Walk a draft to complete, so the completion gate can be exercised. */
function completeDraft(api: { current: ReturnType<typeof useCharacterDraft> }): void {
  act(() => api.current.chooseClass('class.fighter'));
  act(() => api.current.chooseSpecies('species.human'));
  act(() => api.current.chooseBackground('background.soldier', ['str', 'dex', 'con']));
  act(() => { api.current.spendBonus('str', 2); });
  act(() => { api.current.spendBonus('con', 1); });
  const vals = [15, 14, 13, 12, 10, 8] as const;
  const abils = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
  abils.forEach((a, i) => act(() => { api.current.assign(a, vals[i]!); }));
  act(() => api.current.setName('Torvald'));
}

describe('the wizard draft', () => {
  it('produces nothing until every step is answered', () => {
    const { result } = renderHook(() => useCharacterDraft());
    expect(result.current.choices).toBeNull();
    act(() => result.current.chooseClass('class.fighter'));
    expect(result.current.choices, 'a class alone is not a character').toBeNull();
    completeDraft(result);
    expect(result.current.choices).not.toBeNull();
  });

  /**
   * Every standard-array value is used exactly once, so placing a number that
   * already lives elsewhere can only mean "swap these two" — refusing would
   * strand the player and duplicating would break the array.
   */
  it('swaps two abilities when a value is reassigned', () => {
    const { result } = renderHook(() => useCharacterDraft());
    act(() => { result.current.assign('str', 15); });
    act(() => { result.current.assign('dex', 14); });
    act(() => { result.current.assign('dex', 15); });

    expect(result.current.draft.assignment.dex).toBe(15);
    expect(result.current.draft.assignment.str, 'the displaced value moved, it did not vanish').toBe(14);
  });

  /** Moving a value onto an empty ability leaves the source empty, not stale. */
  it('moves a value onto an unassigned ability without duplicating it', () => {
    const { result } = renderHook(() => useCharacterDraft());
    act(() => { result.current.assign('str', 15); });
    act(() => { result.current.assign('con', 15); });

    expect(result.current.draft.assignment.con).toBe(15);
    expect(result.current.draft.assignment.str).toBeUndefined();
    const used = Object.values(result.current.draft.assignment);
    expect(new Set(used).size, 'no value appears twice').toBe(used.length);
  });

  /** 2024 rules: +2/+1 across two abilities, or +1/+1/+1 across three. */
  it('holds the background spend to three points', () => {
    const { result } = renderHook(() => useCharacterDraft());
    act(() => result.current.chooseBackground('background.soldier', ['str', 'dex', 'con']));
    act(() => { result.current.spendBonus('str', 2); });
    act(() => { result.current.spendBonus('con', 1); });
    expect(bonusTotal(result.current.draft.backgroundBonuses)).toBe(3);

    const origin = result.current.steps.find((s) => s.id === 'origin')!;
    expect(origin.blocker, 'a fully spent budget is not a blocker').not.toMatch(/Spend/);
  });

  it('says how much of the background budget is left', () => {
    const { result } = renderHook(() => useCharacterDraft());
    act(() => result.current.chooseSpecies('species.human'));
    act(() => result.current.chooseBackground('background.soldier', ['str', 'dex', 'con']));
    act(() => { result.current.spendBonus('str', 2); });

    const origin = result.current.steps.find((s) => s.id === 'origin')!;
    expect(origin.done).toBe(false);
    expect(origin.blocker).toBe('Spend 1 more from your background.');
  });

  /**
   * Backgrounds offer different ability trios, so a spend made against the old
   * one would apply bonuses to abilities the new background never granted —
   * a character that looks fine and is quietly illegal.
   */
  it('clears the spend when the background changes', () => {
    const { result } = renderHook(() => useCharacterDraft());
    act(() => result.current.chooseBackground('background.soldier', ['str', 'dex', 'con']));
    act(() => { result.current.spendBonus('str', 2); });
    expect(bonusTotal(result.current.draft.backgroundBonuses)).toBe(2);

    act(() => result.current.chooseBackground('background.sage', ['con', 'int', 'wis']));
    expect(bonusTotal(result.current.draft.backgroundBonuses), 'STR is not on offer from Sage').toBe(0);
  });

  it('keeps the spend when the same background is re-picked', () => {
    const { result } = renderHook(() => useCharacterDraft());
    act(() => result.current.chooseBackground('background.soldier', ['str', 'dex', 'con']));
    act(() => { result.current.spendBonus('str', 2); });
    act(() => result.current.chooseBackground('background.soldier', ['str', 'dex', 'con']));
    expect(bonusTotal(result.current.draft.backgroundBonuses)).toBe(2);
  });

  it('carries the name into identity rather than leaving it beside the choices', () => {
    const { result } = renderHook(() => useCharacterDraft());
    completeDraft(result);
    expect(result.current.choices?.identity.name).toBe('Torvald');
    /* The rest of identity is the spec's step 4 and out of scope — empty, not
       invented. */
    expect(result.current.choices?.identity.personality).toEqual([]);
  });

  it('refuses a name that is only whitespace', () => {
    const { result } = renderHook(() => useCharacterDraft());
    completeDraft(result);
    act(() => result.current.setName('   '));
    expect(result.current.choices).toBeNull();
  });
});
