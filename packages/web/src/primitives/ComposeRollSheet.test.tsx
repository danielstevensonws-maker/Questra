/**
 * @vitest-environment jsdom
 *
 * ComposeRollSheet tests — Brief 10 §2 (the tap-to-roll surface) and ADR-0008
 * (server dice). The load-bearing assertions here catch a regression back into
 * client-side rolling, and guard the split from the DiceTray:
 *
 *   - the panel produces NO number of its own: it reports the SERVER's total,
 *     never recomputed from the rows;
 *   - it holds no die — the dice roll on the map (DiceTray). It shows "Rolling…"
 *     until `settled`, then the verdict;
 *   - the server's `collapsed` is what's reported, even when the player asked
 *     for something else.
 *
 * Driven by a fixture `roll_made` body + a `settled` flag — the same shapes the
 * sync client + the tray's `dice-settled` will hand it in M3.6.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { violatesPlainLanguage } from '@questra/contracts';
import { ComposeRollSheet } from './ComposeRollSheet.js';
import {
  composeFormula, keptAndDropped, resultRows, verdictLine, outcomeTone,
  type ComposeDraftVM, type ComposeSubjectVM, type RollResultVM,
} from './sheetToPlayerHub.js';

const subject: ComposeSubjectVM = {
  tileId: 'attack.Longsword',
  name: 'Longsword',
  kind: 'attack_roll',
  modifiers: [{ label: 'STR', value: 3 }, { label: 'Proficiency', value: 2 }],
  vs: { type: 'ac', value: 15 },
  targetName: 'the goblin',
};
const draft: ComposeDraftVM = { tileId: 'attack.Longsword', position: 'straight', situational: 0 };

/** A fixture `roll_made` body: server rolled 2d20 (14, 6), kept the 14. */
const advResult: RollResultVM = {
  rollId: 'roll-1',
  kind: 'attack_roll',
  d20: 14,
  secondD20: 6,
  collapsed: 'advantage',
  modifiers: [{ label: 'STR', value: 3 }, { label: 'Proficiency', value: 2 }],
  total: 19,
  vs: { type: 'ac', value: 15 },
  outcome: 'hit',
  entry: 'server',
};

const noop = (): void => {};
const baseProps = { subject, draft, onDraftChange: noop, onCommit: noop, onCancel: noop };

afterEach(() => { cleanup(); });

describe('compose phase', () => {
  it('shows the live formula and no total — nothing has been rolled yet', () => {
    render(<ComposeRollSheet {...baseProps} />);
    expect(screen.getByLabelText('Roll formula').textContent).toBe('d20 + 3 STR + 2 Proficiency');
    expect(screen.queryByTestId('reveal')).toBeNull();
    expect(screen.queryByText(/Total/)).toBeNull();
  });

  it('the formula reflects the asked-for position and situational modifier', () => {
    expect(composeFormula(subject, { ...draft, position: 'advantage' }))
      .toBe('2d20 keep highest + 3 STR + 2 Proficiency');
    expect(composeFormula(subject, { ...draft, position: 'disadvantage', situational: -2 }))
      .toBe('2d20 keep lowest + 3 STR + 2 Proficiency − 2 situational');
  });
});

describe('the reveal is the server’s answer (ADR-0008)', () => {
  it('holds no die of its own — the dice roll on the map, not here', () => {
    render(<ComposeRollSheet {...baseProps} result={advResult} settled />);
    // the old 2D diamond die is gone; the tray owns the dice now
    expect(screen.queryByTestId('die')).toBeNull();
  });

  it('shows "Rolling…" while the dice tumble, and no total leaks early', () => {
    render(<ComposeRollSheet {...baseProps} result={advResult} settled={false} />);
    const reveal = screen.getByTestId('reveal');
    expect(reveal.dataset['settled']).toBe('false');
    expect(reveal).toHaveAccessibleName('Rolling on the table');
    // the verdict + total appear only once the dice have landed
    expect(screen.queryByText(/Total/i)).toBeNull();
    expect(screen.queryByText('Hit — against Armor Class 15')).toBeNull();
  });

  it('reveals the verdict and the SERVER’s total once the dice land', () => {
    render(<ComposeRollSheet {...baseProps} result={advResult} settled />);
    const group = screen.getByRole('group', { name: 'Roll Longsword' });
    expect(within(group).getByText('Hit — against Armor Class 15')).toBeInTheDocument();
    // the total renders in a StatBlock (label + value as separate nodes)
    expect(within(group).getByText('TOTAL')).toBeInTheDocument();
    expect(within(group).getByText('19')).toBeInTheDocument();
  });

  it('reports the server’s collapse even when the player asked for something else', () => {
    // player asked for straight; the server says advantage — the server wins.
    // Scoped to the roll group so this can't be satisfied by the picker's own
    // "Advantage" button: the reported collapse must be the server's.
    render(<ComposeRollSheet {...baseProps} draft={{ ...draft, position: 'straight' }} result={advResult} settled />);
    const group = screen.getByRole('group', { name: 'Roll Longsword' });
    expect(within(group).getByText('Advantage')).toBeInTheDocument();
    // and the picker is gone once a result exists — nothing to re-ask
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });

  it('marks a hand-entered roll (physical dice, ADR-0008)', () => {
    render(<ComposeRollSheet {...baseProps} result={{ ...advResult, entry: 'manual' }} settled />);
    expect(screen.getByText('Entered by hand')).toBeInTheDocument();
  });
});

describe('derivation rows — no orphan math (§1)', () => {
  it('lists the kept die with the dropped one named, then each modifier', () => {
    expect(resultRows(advResult)).toEqual([
      { label: 'd20 (dropped 6)', value: 14 },
      { label: 'STR', value: 3 },
      { label: 'Proficiency', value: 2 },
    ]);
  });

  it('rows sum to the server total — the breakdown explains the number shown', () => {
    const sum = resultRows(advResult).reduce((n, r) => n + r.value, 0);
    expect(sum).toBe(advResult.total);
  });

  it('a straight roll names no dropped die', () => {
    const straight: RollResultVM = { ...advResult, collapsed: 'straight', secondD20: undefined, d20: 11, total: 16 };
    expect(resultRows(straight)[0]).toEqual({ label: 'd20', value: 11 });
  });

  it('disadvantage keeps the lower die', () => {
    expect(keptAndDropped({ ...advResult, collapsed: 'disadvantage' })).toEqual({ kept: 6, dropped: 14 });
  });
});

describe('verdicts', () => {
  it('map outcome to tone', () => {
    expect(outcomeTone('crit')).toBe('good');
    expect(outcomeTone('fumble')).toBe('bad');
    expect(outcomeTone('miss')).toBe('bad');
    expect(outcomeTone('success')).toBe('good');
  });

  it('read as plain English and pass the ban-list (§7)', () => {
    const lines = (['hit', 'miss', 'crit', 'fumble', 'success', 'failure'] as const)
      .map((outcome) => verdictLine({ ...advResult, outcome }));
    // returns the offending word, or null when the line is clean
    for (const line of lines) {
      expect(violatesPlainLanguage(line), line).toBeNull();
    }
    expect(verdictLine(advResult)).toBe('Hit — against Armor Class 15');
    expect(verdictLine({ ...advResult, outcome: 'crit' })).toBe('Critical hit');
  });
});
