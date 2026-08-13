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

const KIND_LABELS: Record<PromptContext['kind'], string> = {
  opportunity_attack: 'Opportunity Attack',
  feature: 'Reaction',
  readied: 'Readied Action',
  legendary_action: 'Legendary Action',
  legendary_resistance: 'Legendary Resistance',
  lair: 'Lair Action',
};

/**
 * The card's `kind` eyebrow label. Kept as the real SRD term (matches
 * brief-08's own vocabulary and its worked example — "Goblin is fleeing —
 * take your Opportunity Attack?"), not replaced with an invented synonym:
 * a beginner learns the real name by seeing it attached to an obvious
 * situation (CLAUDE.md law 5, "teach by doing"), and Reaction/Legendary
 * Action/etc. already surface elsewhere in the product (the ActionBar's
 * rows). The plain-language work happens in the CONTEXT LINES below, which
 * narrate the situation in ordinary sentences instead of dumping raw fields.
 */
export function promptKindLabel(context: PromptContext): string {
  return KIND_LABELS[context.kind];
}

function plural(n: number, noun: string): string {
  return `${n} ${noun}${n === 1 ? '' : 's'}`;
}

/** The context body as ordinary narrated sentences — never a field dump, never the options list (see promptOptionsToVM). */
export function promptContextToLines(context: PromptContext): string[] {
  switch (context.kind) {
    case 'opportunity_attack':
      return ['An enemy is moving away from you — you can swing at them before they go.'];
    case 'feature': {
      if (context.triggerText !== undefined) return [context.triggerText];
      return context.trigger === 'take_damage' ? ['You took damage.'] : ['You were targeted by an attack.'];
    }
    case 'readied':
      return [context.triggerText, `Your plan: ${context.response}.`];
    case 'legendary_action':
      return [`${plural(context.poolRemaining, 'legendary action')} left this round.`];
    case 'legendary_resistance':
      return [
        `They failed a ${ABILITY_NAMES[context.save.ability]} save (DC ${context.save.dc}).`,
        `${plural(context.usesLeft, 'use')} left.`,
      ];
    case 'lair':
      return context.options.length === 0 ? ['Nothing for the lair to do this round.'] : ['The lair itself acts now.'];
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
