/**
 * Character-sheet computation golden tests — Brief 03 §4. Torvald and Wizard-3
 * choices compute to sheets whose key values match the canonical fixtures, every
 * Derived's derivation sums to its value, computation is pure/deterministic, and
 * illegal choices are rejected with plain-language reasons.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import {
  ComputedSheetSchema, derivationSumsToValue,
  type CharacterChoices, type ComputedSheet,
} from '@questra/contracts';
import { computeSheet, buildSheetRulesData, IllegalChoiceError } from '../src/sim/sheet.js';
import { CLASSES } from '../src/data/classes.js';
import { ITEMS } from '../src/data/items.js';

const here = fileURLToPath(new URL('.', import.meta.url));
const fx = (name: string) => JSON.parse(readFileSync(here + '../../contracts/src/fixtures/' + name, 'utf8')) as ComputedSheet;

const rules = buildSheetRulesData([...CLASSES, ...ITEMS], 30);

const torvaldChoices: CharacterChoices = {
  classId: 'class.fighter', level: 1,
  backgroundId: 'background.soldier', speciesId: 'species.human',
  abilityMethod: 'standard_array',
  baseScores: { str: 14, dex: 13, con: 13, int: 8, wis: 12, cha: 10 },
  backgroundBonuses: { str: 2, con: 1 },
  skillChoices: ['athletics', 'intimidation'],
  languageChoices: ['Common'],
  equipment: ['item.chain-mail', 'item.shield', 'item.longsword'],
  featChoices: {},
  identity: { name: 'Torvald', personality: [], bonds: [], appearanceTokens: [] },
};

const wizardChoices: CharacterChoices = {
  classId: 'class.wizard', level: 3,
  backgroundId: 'background.sage', speciesId: 'species.human',
  abilityMethod: 'standard_array',
  baseScores: { str: 8, dex: 14, con: 13, int: 14, wis: 12, cha: 10 },
  backgroundBonuses: { int: 2, wis: 0, cha: 1 } as CharacterChoices['backgroundBonuses'],
  skillChoices: ['arcana', 'investigation'],
  languageChoices: ['Common'],
  equipment: ['item.dagger'],
  featChoices: {},
  identity: { name: 'Mennalar', personality: [], bonds: [], appearanceTokens: [] },
};

describe('Brief 03 §4 #1 — the computed sheet matches the fixture on the values that carry meaning', () => {
  const torvald = computeSheet(torvaldChoices, rules);
  const t = fx('torvald-sheet.json');

  it('validates against the schema', () => {
    expect(() => ComputedSheetSchema.parse(torvald)).not.toThrow();
  });
  it('abilities, prof, HP, AC default, initiative match the fixture', () => {
    expect(torvald.abilities.str.value).toBe(t.abilities.str.value);
    expect(torvald.profBonus.value).toBe(t.profBonus.value);
    expect(torvald.hp.value.max).toBe(t.hp.value.max);
    expect(torvald.acOptions[torvald.acDefault]!.value).toBe(18);
    expect(torvald.initiative.value).toBe(t.initiative.value);
  });
  it('reconciles with the trace: Longsword +5, 1d8 + 3 slashing', () => {
    const ls = torvald.attacks.find((a) => a.name === 'Longsword')!;
    expect(ls.toHit).toBe(5);
    expect(ls.damage).toBe('1d8 + 3');
    expect(ls.damageType).toBe('slashing');
  });
  it('Second Wind pool is 2/2 at level 1', () => {
    const sw = torvald.features.find((f) => f.id === 'feature.fighter.second-wind')!;
    expect(sw.resource).toEqual({ pool: 'feature.second_wind', max: 2, remaining: 2 });
  });
  it('STR & CON saves are proficient (+prof); others are bare mods', () => {
    expect(torvald.saves.str.value).toBe(5);
    expect(torvald.saves.con.value).toBe(4);
    expect(torvald.saves.dex.value).toBe(1);
  });
});

describe('Brief 03 §4 #1 — Wizard 3 spellcasting matches the fixture', () => {
  const wizard = computeSheet(wizardChoices, rules);
  const w = fx('wizard-3-sheet.json');
  it('validates and exposes DC 13, attack +5, slots {1:4, 2:2}', () => {
    expect(() => ComputedSheetSchema.parse(wizard)).not.toThrow();
    expect(wizard.spellcasting!.saveDc.value).toBe(w.spellcasting!.saveDc.value);
    expect(wizard.spellcasting!.attackBonus.value).toBe(w.spellcasting!.attackBonus.value);
    expect(wizard.spellcasting!.slots).toEqual({ '1': 4, '2': 2 });
  });
});

describe('Brief 03 §4 #1 — every Derived sums to its value (property, both computed sheets)', () => {
  it('holds across all numeric Deriveds', () => {
    for (const sheet of [computeSheet(torvaldChoices, rules), computeSheet(wizardChoices, rules)]) {
      const numeric = [
        sheet.profBonus, sheet.initiative, sheet.speedFt,
        ...Object.values(sheet.abilities), ...Object.values(sheet.saves),
        ...Object.values(sheet.skills), sheet.passives.perception,
        sheet.passives.investigation, sheet.passives.insight, ...sheet.acOptions,
      ];
      for (const dd of numeric) {
        expect(derivationSumsToValue(dd as { value: number; derivation: { value: number }[] }), JSON.stringify(dd)).toBe(true);
      }
    }
  });
});

describe('Brief 03 §4 #2 — computation is pure & deterministic', () => {
  it('same choices ⇒ deeply-equal sheet', () => {
    expect(computeSheet(torvaldChoices, rules)).toEqual(computeSheet(torvaldChoices, rules));
  });
});

describe('Brief 03 §4 #3 — illegal choices rejected with plain-language reasons', () => {
  it('over-budget point buy is rejected', () => {
    const bad: CharacterChoices = {
      ...torvaldChoices, abilityMethod: 'point_buy',
      baseScores: { str: 15, dex: 15, con: 15, int: 15, wis: 15, cha: 8 }, // way over 27
    };
    expect(() => computeSheet(bad, rules)).toThrow(IllegalChoiceError);
    expect(() => computeSheet(bad, rules)).toThrow(/27/);
  });
  it('background bonuses that do not sum to 3 are rejected', () => {
    const bad: CharacterChoices = { ...torvaldChoices, backgroundBonuses: { str: 2 } };
    expect(() => computeSheet(bad, rules)).toThrow(/add up to 3/);
  });
  it('an unknown class is rejected with a plain reason', () => {
    const bad: CharacterChoices = { ...torvaldChoices, classId: 'class.bogus' };
    expect(() => computeSheet(bad, rules)).toThrow(/Unknown class/);
  });
});
