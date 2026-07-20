/**
 * toDiceSpec tests — the `roll_made` → dice-tray-spec mapping (the seam the
 * DiceTray reveal drives the 3D element with). The load-bearing bit is which die
 * the tray keeps: it MUST match the die the server's `collapsed` actually used
 * (the same die `keptAndDropped` names in the log), or the reveal would
 * highlight a different d20 than the derivation says was kept.
 *
 * Pure function on the view-model seam — no DOM, no three.js element imported.
 */
import { describe, it, expect } from 'vitest';
import { toDiceSpec, keptAndDropped, type RollResultVM } from './sheetToPlayerHub.js';

const base: RollResultVM = {
  rollId: 'r', kind: 'attack_roll', d20: 14, collapsed: 'straight',
  modifiers: [], total: 14, outcome: 'hit', entry: 'server',
};

describe('toDiceSpec', () => {
  it('a straight roll is a single d20 on its face', () => {
    expect(toDiceSpec(base)).toEqual({ dice: ['d20'], results: [14] });
  });

  it('advantage shows both dice and keeps the higher (index-correct)', () => {
    expect(toDiceSpec({ ...base, secondD20: 6, collapsed: 'advantage' }))
      .toEqual({ dice: ['d20', 'd20'], results: [14, 6], keep: 0 });
  });

  it('advantage keeps index 1 when the second die is higher', () => {
    expect(toDiceSpec({ ...base, d20: 6, secondD20: 14, collapsed: 'advantage', total: 14 }).keep).toBe(1);
  });

  it('disadvantage keeps the lower die', () => {
    // lower is the 6 at index 1
    expect(toDiceSpec({ ...base, d20: 14, secondD20: 6, collapsed: 'disadvantage', total: 6 }).keep).toBe(1);
  });

  it('the kept die matches keptAndDropped — reveal and log agree', () => {
    const pairs: [number, number][] = [[14, 6], [6, 14], [9, 9]];
    for (const collapsed of ['advantage', 'disadvantage'] as const) {
      for (const [a, b] of pairs) {
        const r: RollResultVM = { ...base, d20: a, secondD20: b, collapsed, total: Math.max(a, b) };
        const spec = toDiceSpec(r);
        expect(spec.results[spec.keep!], `${collapsed} ${a}/${b}`).toBe(keptAndDropped(r).kept);
      }
    }
  });
});
