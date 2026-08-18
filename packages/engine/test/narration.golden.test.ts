/**
 * Narration template pack tests (GAP-AUDIT A5). Every outcome type has a
 * plain-English template; every produced line passes the ban list; and the
 * Torvald trace's narration stays byte-stable after extracting the templates.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { narration, narrationBanned, type NarrationActor } from '../src/sim/narration.js';

const torvald: NarrationActor = { name: 'Torvald', maxHp: 12, prone: true };
const goblin: NarrationActor = { name: 'the goblin', maxHp: 10 };

describe('the narration pack reproduces the Torvald trace line byte-for-byte', () => {
  const trace = JSON.parse(readFileSync(fileURLToPath(new URL('../../contracts/src/fixtures/torvald-trace.json', import.meta.url)), 'utf8')) as {
    events: { body: { t: string; text?: string } }[];
  };
  it('hit(prone Torvald, goblin at 1/10) === the fixture narration', () => {
    const fixtureLine = trace.events.find((e) => e.body.t === 'narration')!.body.text;
    expect(narration.hit(torvald, goblin, 9, 'slashing', 1)).toBe(fixtureLine);
  });
});

describe('every outcome type has a template, and every line passes the ban list', () => {
  const lines = [
    narration.hit(torvald, goblin, 9, 'slashing', 1),
    narration.hit({ name: 'Mira', maxHp: 20 }, goblin, 6, 'piercing', 8),
    narration.crit({ name: 'Mira', maxHp: 20 }, goblin, 14, 'piercing', 0),
    narration.miss(torvald, goblin),
    narration.fumble(torvald, goblin),
    narration.heal(torvald, 5, 12),
    narration.heal(torvald, 3, 9),
    narration.conditionApplied(goblin, 'prone'),
    narration.conditionRemoved(goblin, 'prone'),
    narration.died(goblin),
    narration.died({ name: 'Torvald', maxHp: 6 }, 'massive_damage'),
    narration.unconscious(torvald),
    narration.stabilized(torvald),
  ];
  it('produces a non-empty line for each', () => {
    for (const line of lines) expect(line.length).toBeGreaterThan(0);
  });
  it('no line trips violatesPlainLanguage', () => {
    for (const line of lines) expect(narrationBanned(line), line).toBeNull();
  });
});

describe('health phrasing tracks the resulting HP', () => {
  it('0 HP ⇒ "drops"; ≤ half ⇒ "barely standing"; above half ⇒ "takes it"', () => {
    expect(narration.hit(torvald, goblin, 10, 'slashing', 0)).toMatch(/drops\.$/);
    expect(narration.hit(torvald, goblin, 9, 'slashing', 1)).toMatch(/barely standing\.$/);
    expect(narration.hit(torvald, goblin, 2, 'slashing', 8)).toMatch(/takes it\.$/);
  });
});
