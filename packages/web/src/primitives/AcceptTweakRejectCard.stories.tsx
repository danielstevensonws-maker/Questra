/**
 * AcceptTweakRejectCard stories — the universal AI card in each of its states:
 * streaming, a tweakable text draft, a rich (schema-shaped) draft, and the
 * non-AI fallback (ADR: AI always has a non-AI fallback).
 *
 * The creative-text story seeds its draft from a REAL contracts fixture
 * (Fireball's plain sentence), proving the card renders content that will, in
 * production, arrive from an AI schema derived from the same rules data — with
 * no backend.
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RulesEntitySchema } from '@questra/contracts';
import { AcceptTweakRejectCard, type CardOutcome } from './AcceptTweakRejectCard.js';

import fireball from '@questra/contracts/src/fixtures/fireball.json';

import '../theme/index.css';

const meta: Meta<typeof AcceptTweakRejectCard> = {
  title: 'Primitives/AcceptTweakRejectCard',
  component: AcceptTweakRejectCard,
};
export default meta;
type Story = StoryObj<typeof AcceptTweakRejectCard>;

function Frame({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 520, padding: 24, background: 'var(--q-bg)' }}>{children}</div>;
}

/** A creative-text draft seeded from the Fireball fixture's plain line — tweakable and rejectable. */
export const TextDraft: Story = {
  render: () => {
    const spell = RulesEntitySchema.parse(fireball);
    const seed = `The air ignites — ${spell.plain.toLowerCase()} A ribbon of flame unspools from your fingertips.`;
    return (
      <Frame>
        <Resolvable>
          {(resolve, outcome) => (
            <AcceptTweakRejectCard
              title="Read-aloud for Fireball"
              draft={seed}
              tweakSeed={seed}
              onAccept={() => resolve('accepted')}
              onTweak={(edited) => resolve('tweaked', edited)}
              onReject={() => resolve('rejected')}
              onOutcome={outcome}
            />
          )}
        </Resolvable>
      </Frame>
    );
  },
};

/** A rich, schema-shaped draft (a ruling: check + DC + consequence). No inline tweak — accept or reject. */
export const RichDraft: Story = {
  render: () => (
    <Frame>
      <Resolvable>
        {(resolve, outcome) => (
          <AcceptTweakRejectCard
            title="Ruling suggestion"
            draft={
              <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', margin: 0 }}>
                <dt style={{ color: 'var(--q-ink-faint)' }}>Check</dt>
                <dd style={{ margin: 0, color: 'var(--q-ink)' }}>Dexterity (Acrobatics)</dd>
                <dt style={{ color: 'var(--q-ink-faint)' }}>DC</dt>
                <dd style={{ margin: 0, color: 'var(--q-ink)', fontFamily: 'var(--q-font-mono)' }}>14</dd>
                <dt style={{ color: 'var(--q-ink-faint)' }}>On a fail</dt>
                <dd style={{ margin: 0, color: 'var(--q-ink)' }}>The rope slips; you fall prone at the chasm's edge.</dd>
              </dl>
            }
            onAccept={() => resolve('accepted')}
            onReject={() => resolve('rejected')}
            onOutcome={outcome}
          />
        )}
      </Resolvable>
    </Frame>
  ),
};

/** Streaming — the draft is still arriving; no action buttons until it settles. */
export const Streaming: Story = {
  render: () => (
    <Frame>
      <AcceptTweakRejectCard
        title="Recap draft"
        streaming
        draft="Last session, the party descended into the sunless vault and"
        onAccept={() => {}}
        onReject={() => {}}
      />
    </Frame>
  ),
};

/** Fallback — the model failed or was skipped; the human still has a non-AI path. */
export const Fallback: Story = {
  render: () => (
    <Frame>
      <AcceptTweakRejectCard
        title="Ruling suggestion"
        draft=""
        fallback={
          <p style={{ margin: 0, color: 'var(--q-ink-soft)' }}>
            Couldn't reach the assistant. Pick a difficulty from the ladder: <strong>Easy 10 · Medium 14 · Hard 18</strong>.
          </p>
        }
        onAccept={() => {}}
        onReject={() => {}}
        acceptLabel="Use Medium (14)"
        rejectLabel="Dismiss"
      />
    </Frame>
  ),
};

/** Small harness that records the outcome so the story shows the telemetry the card emits. */
function Resolvable({
  children,
}: {
  children: (resolve: (o: CardOutcome, edited?: string) => void, outcome: (o: CardOutcome) => void) => React.ReactNode;
}) {
  const [done, setDone] = useState<{ outcome: CardOutcome; edited?: string } | null>(null);
  if (done) {
    return (
      <p style={{ color: 'var(--q-ink-soft)', fontSize: 'var(--q-text-sm)' }}>
        Outcome logged: <strong>{done.outcome}</strong>
        {done.edited !== undefined && done.edited !== '' ? ` — "${done.edited}"` : ''}
      </p>
    );
  }
  return <>{children((o, edited) => setDone({ outcome: o, ...(edited !== undefined ? { edited } : {}) }), () => {})}</>;
}
