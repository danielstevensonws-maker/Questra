/**
 * useCharacterDraft — the wizard's state, and the one place that knows how a
 * partial character becomes a real one.
 *
 * WHY A DRAFT TYPE RATHER THAN A PARTIAL CharacterChoices. `CharacterChoices`
 * is the finished article: every field required, because the engine cannot
 * compute a sheet from half a character. A wizard is by definition incomplete
 * until its last step, so modelling it as `Partial<CharacterChoices>` would put
 * an `undefined` check at every use site and lose the one thing worth tracking
 * — WHICH step is unfinished, and why.
 *
 * So the draft holds nullable choices plus a single `complete()` that either
 * returns real `CharacterChoices` or tells you what is missing. The wizard
 * renders that answer; the engine never sees a half-built character.
 *
 * THE STANDARD ARRAY IS THE DEFAULT AND THAT IS A DESIGN DECISION, not a
 * shortcut: the spec names it the beginner default, and a first-time player
 * assigning six numbers to six abilities they have not learned yet is the exact
 * moment character creation loses people. Point buy and rolling are the spec's
 * "customize" and "roll" paths and are not built here.
 */
import { useCallback, useMemo, useState } from 'react';
import type { Ability, CharacterChoices } from '@questra/contracts';

/** The SRD's standard array, highest first — the order the wizard assigns in. */
export const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8] as const;

export const ABILITY_ORDER: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

export const ABILITY_LABEL: Record<Ability, string> = {
  str: 'Strength', dex: 'Dexterity', con: 'Constitution',
  int: 'Intelligence', wis: 'Wisdom', cha: 'Charisma',
};

/** What each ability actually does, for the info layer. Plain, not SRD text. */
export const ABILITY_PLAIN: Record<Ability, string> = {
  str: 'Hitting things hard, and shoving them.',
  dex: 'Dodging, aiming, and moving quietly.',
  con: 'Staying up. This is where hit points come from.',
  int: 'Knowing things, and remembering them.',
  wis: 'Noticing things, and reading people.',
  cha: 'Talking your way into — and out of — trouble.',
};

export interface CharacterDraft {
  name: string;
  classId: string | null;
  backgroundId: string | null;
  speciesId: string | null;
  /** ability → the standard-array value assigned to it. */
  assignment: Partial<Record<Ability, number>>;
  /** ability → the background bonus spent on it (+2/+1 or +1/+1/+1). */
  backgroundBonuses: Partial<Record<Ability, number>>;
}

const EMPTY: CharacterDraft = {
  name: '',
  classId: null,
  backgroundId: null,
  speciesId: null,
  assignment: {},
  backgroundBonuses: {},
};

/** A step is only reachable once the ones it depends on are answered. */
export type StepId = 'class' | 'origin' | 'abilities' | 'name';

export interface StepState {
  id: StepId;
  label: string;
  /** Done means "this step has everything it needs", not "it was visited". */
  done: boolean;
  /** Why this step is not yet finished, in the player's words. */
  blocker: string | null;
}

export interface DraftApi {
  draft: CharacterDraft;
  steps: StepState[];
  /** Real choices, or null while anything is missing. */
  choices: CharacterChoices | null;
  setName: (v: string) => void;
  chooseClass: (id: string) => void;
  chooseBackground: (id: string, abilityOptions: Ability[]) => void;
  chooseSpecies: (id: string) => void;
  assign: (ability: Ability, value: number) => void;
  spendBonus: (ability: Ability, amount: number) => void;
  reset: () => void;
}

/** How many array values are still unassigned. */
function unassigned(draft: CharacterDraft): number {
  return STANDARD_ARRAY.length - Object.keys(draft.assignment).length;
}

/** The background spend must total 3: either +2/+1 or +1/+1/+1 (2024 rules). */
export function bonusTotal(bonuses: Partial<Record<Ability, number>>): number {
  return Object.values(bonuses).reduce<number>((n, v) => n + (v ?? 0), 0);
}

export function useCharacterDraft(): DraftApi {
  const [draft, setDraft] = useState<CharacterDraft>(EMPTY);

  const setName = useCallback((name: string) => setDraft((d) => ({ ...d, name })), []);
  const chooseClass = useCallback((classId: string) => setDraft((d) => ({ ...d, classId })), []);
  const chooseSpecies = useCallback((speciesId: string) => setDraft((d) => ({ ...d, speciesId })), []);

  /* Changing background clears the spend: the three abilities on offer differ
     per background, so keeping a spend made against the old one would silently
     apply bonuses to abilities the new background does not grant. */
  const chooseBackground = useCallback((backgroundId: string, _abilityOptions: Ability[]) => {
    setDraft((d) => (d.backgroundId === backgroundId ? d : { ...d, backgroundId, backgroundBonuses: {} }));
  }, []);

  /* Assigning a value that is already somewhere else SWAPS the two, rather than
     refusing or silently duplicating. Every array value is used exactly once,
     so a swap is what the player means every time. */
  const assign = useCallback((ability: Ability, value: number) => {
    setDraft((d) => {
      const next = { ...d.assignment };
      const holder = ABILITY_ORDER.find((a) => next[a] === value && a !== ability);
      const displaced = next[ability];
      next[ability] = value;
      if (holder) {
        if (displaced === undefined) delete next[holder];
        else next[holder] = displaced;
      }
      return { ...d, assignment: next };
    });
  }, []);

  const spendBonus = useCallback((ability: Ability, amount: number) => {
    setDraft((d) => {
      const next = { ...d.backgroundBonuses };
      if (amount <= 0) delete next[ability];
      else next[ability] = amount;
      return { ...d, backgroundBonuses: next };
    });
  }, []);

  const reset = useCallback(() => setDraft(EMPTY), []);

  const steps = useMemo<StepState[]>(() => {
    const left = unassigned(draft);
    const spent = bonusTotal(draft.backgroundBonuses);
    return [
      {
        id: 'class', label: 'Class', done: draft.classId !== null,
        blocker: draft.classId ? null : 'Pick what you do in a fight.',
      },
      {
        id: 'origin', label: 'Origin',
        done: draft.backgroundId !== null && draft.speciesId !== null && spent === 3,
        blocker: !draft.speciesId ? 'Pick a species.'
          : !draft.backgroundId ? 'Pick a background.'
          : spent !== 3 ? `Spend ${String(3 - spent)} more from your background.`
          : null,
      },
      {
        id: 'abilities', label: 'Abilities', done: left === 0,
        blocker: left === 0 ? null : `${String(left)} score${left === 1 ? '' : 's'} left to place.`,
      },
      {
        id: 'name', label: 'Name', done: draft.name.trim().length > 0,
        blocker: draft.name.trim() ? null : 'Give them a name.',
      },
    ];
  }, [draft]);

  const choices = useMemo<CharacterChoices | null>(() => {
    if (!steps.every((s) => s.done)) return null;
    const baseScores = {} as Record<Ability, number>;
    for (const a of ABILITY_ORDER) baseScores[a] = draft.assignment[a] ?? 10;
    return {
      classId: draft.classId!,
      level: 1,
      backgroundId: draft.backgroundId!,
      speciesId: draft.speciesId!,
      abilityMethod: 'standard_array',
      baseScores,
      backgroundBonuses: draft.backgroundBonuses,
      skillChoices: [],
      languageChoices: ['Common'],
      equipment: [],
      /* Empty rather than absent, and both deliberately so.
         featChoices: a background grants a feat, but the SLOT vocabulary that
         keys this record does not exist yet — inventing slot ids here would put
         a rules shape in the view layer that the engine has never agreed to.
         identity: this is the spec's Step 4 (personality, bonds, appearance,
         portrait, voice), which is out of scope for the playable cut. The name
         is the one part of it a character cannot do without, so it is filled
         and the rest stay empty rather than fabricated. */
      featChoices: {},
      identity: {
        name: draft.name.trim(),
        personality: [],
        bonds: [],
        appearanceTokens: [],
      },
    };
  }, [draft, steps]);

  return { draft, steps, choices, setName, chooseClass, chooseBackground, chooseSpecies, assign, spendBonus, reset };
}
