/**
 * Adapters from the real @questra/contracts `PromptContext` union (the six
 * kinds Brief 08 §1 has actually shipped a shape for) to PromptHolderCard's
 * generic props — the same seam entityToInfoPanel.ts is for InfoPanel.
 *
 * Two DM-facing kinds named in the Playbook §3 table ("ruling", "rest") have
 * no contracts shape yet, so they aren't handled here — a caller for those
 * builds `context: string[]` by hand until a contract PR adds them. That's
 * the whole point of the card taking plain lines instead of `PromptContext`
 * directly: this file can go from covering six kinds to eight without the
 * card itself ever changing.
 */
import type { Ability, PromptContext, PromptOption } from '@questra/contracts';
import type { PromptOptionVM } from './PromptHolderCard.js';

const ABILITY_NAMES: Record<Ability, string> = {
  str: 'Strength',
  dex: 'Dexterity',
  con: 'Constitution',
  int: 'Intelligence',
  wis: 'Wisdom',
  cha: 'Charisma',
};

const TRIGGER_LABELS: Record<'take_damage' | 'targeted_by_attack' | 'custom', string> = {
  take_damage: 'Took damage',
  targeted_by_attack: 'Targeted by an attack',
  custom: 'Custom trigger',
};

const KIND_LABELS: Record<PromptContext['kind'], string> = {
  opportunity_attack: 'Opportunity Attack',
  feature: 'Reaction',
  readied: 'Readied Action',
  legendary_action: 'Legendary Action',
  legendary_resistance: 'Legendary Resistance',
  lair: 'Lair Action',
};

/** The plain-language kind label for the card's `kind` prop. */
export function promptKindLabel(context: PromptContext): string {
  return KIND_LABELS[context.kind];
}

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

/** The context body as pre-summarised plain lines — never the options list (see promptOptionsToVM). */
export function promptContextToLines(context: PromptContext): string[] {
  switch (context.kind) {
    case 'opportunity_attack':
      return [
        `Moving from (${context.pathStep.from.x}, ${context.pathStep.from.y}) to (${context.pathStep.to.x}, ${context.pathStep.to.y}) left a threatened square.`,
        `Available: ${context.attackOptions.join(', ')}.`,
      ];
    case 'feature': {
      const lines = [`Trigger: ${TRIGGER_LABELS[context.trigger]}.`];
      if (context.triggerText !== undefined) lines.push(context.triggerText);
      return lines;
    }
    case 'readied':
      return [`Trigger: ${context.triggerText}`, `Prepared response: ${context.response}`];
    case 'legendary_action':
      return [`${plural(context.poolRemaining, 'legendary action point')} remaining.`];
    case 'legendary_resistance':
      return [
        `Failed save: ${ABILITY_NAMES[context.save.ability]} DC ${context.save.dc}.`,
        `${plural(context.usesLeft, 'use')} of legendary resistance left.`,
      ];
    case 'lair':
      return context.options.length === 0 ? ['No affordable lair action this round.'] : ['The lair acts at initiative 20.'];
    default: {
      const unreachable: never = context;
      void unreachable;
      return [];
    }
  }
}

/** A legendary/lair PromptOption menu, as the card's take-with-detail buttons. */
export function promptOptionsToVM(options: PromptOption[]): PromptOptionVM[] {
  return options.map((option) => ({
    id: option.name,
    label: option.name,
    ...(option.cost !== undefined ? { detail: plural(option.cost, 'point') } : {}),
  }));
}
