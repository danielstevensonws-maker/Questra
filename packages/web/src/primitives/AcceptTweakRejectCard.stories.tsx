/**
 * Primitives/AcceptTweakRejectCard — rebuilt to the Claude Design handoff.
 *
 * The card floats centered over the battle-map ground with no scrim — unlike
 * InfoPanel's slide-over, it sits IN the scene rather than seizing it.
 *
 * DraftText and DraftStructured parse/construct real @questra/contracts
 * shapes (Fireball's `plain` line; a schema-validated RulingSuggestion; the
 * real DIFFICULTY_LADDER) through aiOutputToCard.ts, proving the card renders
 * official AI-output shapes with no per-schema code in the card itself.
 */
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { DIFFICULTY_LADDER, RulingSuggestionSchema } from '@questra/contracts';
import { AcceptTweakRejectCard } from './AcceptTweakRejectCard.js';
import type { CardOutcome, CardState } from './AcceptTweakRejectCard.js';
import { difficultyLadderToFallbackOptions, rulingSuggestionToRows } from './aiOutputToCard.js';

import fireball from '@questra/contracts/src/fixtures/fireball.json';

/** The candlelit map ground the glass card floats over — same ground InfoPanel uses. */
function Ground({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: 620,
        display: 'grid',
        placeItems: 'center',
        padding: 48,
        overflow: 'hidden',
        background: 'radial-gradient(120% 90% at 56% 30%, var(--qa-map-hi) 0%, var(--qa-map-mid) 44%, var(--qa-map-lo) 100%)',
      }}
    >
      {children}
    </div>
  );
}

const meta: Meta = {
  title: 'Primitives/AcceptTweakRejectCard',
  component: AcceptTweakRejectCard,
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj;

// --- sample content ---------------------------------------------------------

/** A text draft, seeded from the REAL Fireball fixture's plain-language line. */
const NARRATION = fireball.plain;

/**
 * A structured ruling, validated through the real RulingSuggestionSchema
 * before being adapted to rows — proves the card renders official AI output,
 * not a hand-shaped lookalike.
 */
const RULING = rulingSuggestionToRows(
  RulingSuggestionSchema.parse({
    check: { kind: 'ability_check', ability: 'dex', skill: 'acrobatics' },
    dc: 14,
    failConsequence: "You slip; you're knocked prone at the bridge's edge.",
    rationale: 'A rope bridge giving way underfoot calls for balance, not brute strength.',
  }),
);

/** The real difficulty ladder (Orchestration §4's no-model fallback), Moderate recommended. */
const FALLBACK_OPTIONS = difficultyLadderToFallbackOptions(DIFFICULTY_LADDER, 'Moderate');

// --- one state each ----------------------------------------------------------

/** Text draft awaiting a decision — Accept · Tweak · Reject. */
export const DraftText: Story = {
  render: () => (
    <Ground>
      <AcceptTweakRejectCard state="draft" kind="text" text={NARRATION} />
    </Ground>
  ),
};

/** Structured draft — a ruling as label/value rows. No Tweak (not free-text editable). */
export const DraftStructured: Story = {
  render: () => (
    <Ground>
      <AcceptTweakRejectCard state="draft" kind="structured" rows={RULING} />
    </Ground>
  ),
};

/** The suggestion is still arriving — blinking caret, aria-busy, no footer. */
export const Streaming: Story = {
  render: () => (
    <Ground>
      <AcceptTweakRejectCard state="streaming" kind="text" text={NARRATION.slice(0, 40)} />
    </Ground>
  ),
};

/** The player edits the draft in place. Save changes · Cancel. */
export const TweakMode: Story = {
  render: () => (
    <Ground>
      <AcceptTweakRejectCard state="tweak" kind="text" text={NARRATION} onSaveTweak={() => {}} onCancelTweak={() => {}} />
    </Ground>
  ),
};

/** The model failed — degrade to the real difficulty ladder. Buttons relabelled. */
export const Fallback: Story = {
  render: () => (
    <Ground>
      <AcceptTweakRejectCard
        state="fallback"
        fallbackOptions={FALLBACK_OPTIONS}
        acceptLabel="Use Moderate (13)"
        rejectLabel="Dismiss"
      />
    </Ground>
  ),
};

/** Terminal states: a one-line outcome, a status dot, and Undo. */
export const ResolvedAccepted: Story = {
  render: () => (
    <Ground>
      <AcceptTweakRejectCard state="resolved" outcome="accepted" onUndo={() => {}} />
    </Ground>
  ),
};
export const ResolvedTweaked: Story = {
  render: () => (
    <Ground>
      <AcceptTweakRejectCard state="resolved" outcome="tweaked" onUndo={() => {}} />
    </Ground>
  ),
};
export const ResolvedRejected: Story = {
  render: () => (
    <Ground>
      <AcceptTweakRejectCard state="resolved" outcome="rejected" onUndo={() => {}} />
    </Ground>
  ),
};

// --- the full loop -----------------------------------------------------------

/**
 * The host drives the whole thing: one `state`, human-initiated transitions,
 * exactly as a real DM screen would wire it — a stream completing, a tweak
 * being saved, an Undo returning to Draft. This is the interaction to judge,
 * not any single frozen state above.
 */
export const InteractiveLoop: Story = {
  render: function InteractiveLoopStory() {
    const [state, setState] = useState<CardState>('streaming');
    const [outcome, setOutcome] = useState<CardOutcome>('accepted');
    const [committedText, setCommittedText] = useState(NARRATION);

    // Simulate the stream finishing, exactly as a real host flips
    // streaming -> draft once the model call resolves.
    useEffect(() => {
      if (state !== 'streaming') return;
      const timer = setTimeout(() => setState('draft'), 1400);
      return () => clearTimeout(timer);
    }, [state]);

    return (
      <Ground>
        <AcceptTweakRejectCard
          state={state}
          kind="text"
          text={state === 'streaming' ? NARRATION.slice(0, 40) : committedText}
          onAccept={() => {
            setOutcome('accepted');
            setState('resolved');
          }}
          onReject={() => {
            setOutcome('rejected');
            setState('resolved');
          }}
          onTweak={() => setState('tweak')}
          onSaveTweak={(edited) => {
            setCommittedText(edited);
            setOutcome('tweaked');
            setState('resolved');
          }}
          onCancelTweak={() => setState('draft')}
          onUndo={() => setState('draft')}
          outcome={outcome}
        />
      </Ground>
    );
  },
};
