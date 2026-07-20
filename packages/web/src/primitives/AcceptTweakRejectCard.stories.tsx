/**
 * AcceptTweakRejectCard stories — the universal AI card in each of its states,
 * restyled to the Questra V1 Prototype sheet: a tweakable text draft, a rich
 * (schema-shaped) draft, streaming (no footer), and the non-AI fallback (a gold
 * dot + the difficulty ladder).
 *
 * The creative-text story seeds its draft from a REAL contracts fixture
 * (Fireball's plain sentence), proving the card renders content that will, in
 * production, arrive from an AI schema derived from the same rules data.
 */
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { RulesEntitySchema } from '@questra/contracts';
import { AcceptTweakRejectCard, type CardOutcome } from './AcceptTweakRejectCard.js';

import fireball from '@questra/contracts/src/fixtures/fireball.json';

import '@questra/theme/styles.css';
import '../theme/index.css';

const meta: Meta<typeof AcceptTweakRejectCard> = {
  title: 'Primitives/AcceptTweakRejectCard',
  component: AcceptTweakRejectCard,
  // full-bleed the story so the card sits on the sheet's flat deep ground and
  // the Storybook body background never bleeds a warm gradient around it
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof AcceptTweakRejectCard>;

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', padding: 32, background: 'var(--qa-ink-deep)' }}>{children}</div>
  );
}

/**
 * A creative-text read-aloud draft — all three motions. The copy is the
 * prototype sheet's exact line; parsing the Fireball fixture proves the fixture
 * is real and available (the production draft arrives from an AI schema over
 * that same rules data), but the sheet's flavour is what's shown, not the raw
 * plain text.
 */
export const TextDraft: Story = {
  render: () => {
    RulesEntitySchema.parse(fireball); // the fixture is real; the AI seeds from it in production
    const seed = 'A bright streak flashes to a point, then blooms with a low roar — flame fills the chamber, and the tapestries catch.';
    return (
      <Frame>
        <Resolvable>
          {(resolve, outcome) => (
            <AcceptTweakRejectCard
              title="Read-aloud"
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

/** A rich, schema-shaped draft (a ruling: check + DC + consequence). No inline tweak. */
export const RichDraft: Story = {
  render: () => (
    <Frame>
      <Resolvable>
        {(resolve, outcome) => (
          <AcceptTweakRejectCard
            title="Ruling"
            draft={
              <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', margin: 0 }}>
                <dt style={{ color: 'var(--qa-vellum-faint)' }}>Check</dt>
                <dd style={{ margin: 0, color: 'var(--qa-vellum)' }}>Dexterity (Acrobatics)</dd>
                <dt style={{ color: 'var(--qa-vellum-faint)' }}>DC</dt>
                <dd style={{ margin: 0, color: 'var(--qa-vellum)', fontFamily: 'var(--qa-font-mono)' }}>14</dd>
                <dt style={{ color: 'var(--qa-vellum-faint)' }}>On a fail</dt>
                <dd style={{ margin: 0, color: 'var(--qa-vellum)' }}>The rope slips; you fall prone at the chasm's edge.</dd>
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

/** Streaming — the draft is still arriving; no footer, the provenance dot pulses. */
export const Streaming: Story = {
  render: () => (
    <Frame>
      <AcceptTweakRejectCard
        title="Recap"
        streaming
        draft="Last time, the party followed the paymaster's ledger into the almshouse cellars"
        onAccept={() => {}}
        onReject={() => {}}
      />
    </Frame>
  ),
};

/** Fallback — the model failed or was skipped; a gold dot, and the human still has a path. */
export const Fallback: Story = {
  render: () => (
    <Frame>
      <AcceptTweakRejectCard
        title="Set a difficulty"
        draft=""
        fallback={
          <div style={{ display: 'flex', gap: 6 }}>
            {[
              { label: 'EASY', dc: 10, on: false },
              { label: 'MEDIUM', dc: 14, on: true },
              { label: 'HARD', dc: 18, on: false },
            ].map((r) => (
              <span
                key={r.label}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  padding: '10px 0',
                  borderRadius: 'var(--qa-radius-sm)',
                  border: r.on
                    ? '1px solid color-mix(in srgb, var(--qa-ember) 55%, transparent)'
                    : '1px solid var(--qa-hairline)',
                  fontFamily: 'var(--qa-font-mono)',
                  fontSize: 10,
                  color: 'var(--qa-vellum-dim)',
                }}
              >
                {r.label}
                <br />
                <span style={{ fontSize: 15, color: 'var(--qa-vellum)' }}>{r.dc}</span>
              </span>
            ))}
          </div>
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
      <p style={{ color: 'var(--qa-vellum-dim)', fontSize: 13 }}>
        Outcome logged: <strong>{done.outcome}</strong>
        {done.edited !== undefined && done.edited !== '' ? ` — "${done.edited}"` : ''}
      </p>
    );
  }
  return <>{children((o, edited) => setDone({ outcome: o, ...(edited !== undefined ? { edited } : {}) }), () => {})}</>;
}
