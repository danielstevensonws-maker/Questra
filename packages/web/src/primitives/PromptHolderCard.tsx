/**
 * PromptHolderCard — the one interrupt card, used six ways (Brief 08 §1):
 * opportunity attacks, reaction features, readied actions, legendary actions,
 * legendary resistance, and lair actions. Rendered wherever the holder lives —
 * the player screen for a PC reaction, the DM panel for a monster/boss/lair.
 *
 * This is the PRESENTATIONAL shell. It takes a HolderPrompt view-model whose
 * `kind` mirrors the contracts `reaction_prompted` event and whose `context` is
 * a list of plain lines. Brief 08 §1 calls for a typed `PromptContext`
 * discriminated union — that is an explicit FUTURE contract PR; until it lands,
 * this card renders pre-summarized context lines, so no contracts shape is
 * invented here. When PromptContext ships, the caller formats it into lines; the
 * card is unchanged.
 *
 * Lifecycle (Brief 08 §1, Brief 05 rule 7): the SERVER owns it. Timeout default
 * 60s ⇒ declined. This card only surfaces the prompt and reports take/decline;
 * it never decides the outcome. One modal-priority prompt at a time per viewer.
 *
 * Themed entirely via theme/tokens.css variables. No hardcoded look.
 */
import { useEffect, useRef, useState } from 'react';

/** Mirrors the contracts reaction_prompted.kind, plus the DM-facing decision kinds
 *  the Playbook §3 table lists for this same card (ruling, rest confirmations). */
export type HolderPromptKind =
  | 'opportunity_attack'
  | 'feature'
  | 'legendary'
  | 'lair'
  | 'ruling'
  | 'rest';

export interface HolderPromptOption {
  id: string;
  label: string;
  /** Optional cost/detail ("Reaction", "2 of 3 legendary actions", "1 spell slot"). */
  detail?: string;
}

export interface HolderPrompt {
  promptId: string;
  kind: HolderPromptKind;
  /** Who must answer, in plain language ("Torvald", "The dragon", "The lair"). */
  holder: string;
  /** One-line summary of what triggered the prompt. Plain language. */
  trigger: string;
  /** Pre-summarized context lines (see doc-comment: awaiting the PromptContext PR). */
  context?: string[];
  /** The choices. If empty, the card shows a single Take/Decline pair. */
  options?: HolderPromptOption[];
  /** Seconds until auto-decline. Server truth; the card mirrors the countdown. */
  timeoutSec?: number;
}

export interface PromptHolderCardProps {
  prompt: HolderPrompt;
  /** Take an option (or the default reaction when there are no options). */
  onTake: (optionId?: string) => void;
  /** Decline; also fired on timeout. */
  onDecline: () => void;
  /**
   * The DM can always answer for anyone (Brief 08 §1). When true, the card notes
   * it's being answered on the holder's behalf.
   */
  asDm?: boolean;
}

const KIND_LABEL: Record<HolderPromptKind, string> = {
  opportunity_attack: 'Opportunity attack',
  feature: 'Reaction',
  legendary: 'Legendary action',
  lair: 'Lair action',
  ruling: 'Ruling',
  rest: 'Rest',
};

export function PromptHolderCard({ prompt, onTake, onDecline, asDm = false }: PromptHolderCardProps) {
  const total = prompt.timeoutSec ?? 60;
  const [remaining, setRemaining] = useState(total);
  const declinedRef = useRef(false);

  // Mirror the countdown; on reaching zero, decline once (server does the same).
  useEffect(() => {
    declinedRef.current = false;
    setRemaining(total);
    const started = Date.now();
    const tick = setInterval(() => {
      const left = Math.max(0, total - Math.floor((Date.now() - started) / 1000));
      setRemaining(left);
      if (left === 0 && !declinedRef.current) {
        declinedRef.current = true;
        clearInterval(tick);
        onDecline();
      }
    }, 250);
    return () => clearInterval(tick);
  }, [prompt.promptId, total, onDecline]);

  const urgent = remaining <= 10;
  const pct = total > 0 ? (remaining / total) * 100 : 0;

  return (
    <article
      role="alertdialog"
      aria-label={`${KIND_LABEL[prompt.kind]} — ${prompt.holder}`}
      style={{
        background: 'var(--q-surface)',
        border: `1px solid ${urgent ? 'var(--q-danger)' : 'var(--q-line)'}`,
        borderRadius: 'var(--q-radius-lg)',
        boxShadow: 'var(--q-shadow-pop)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transition: 'border-color var(--q-dur-fast) var(--q-ease)',
      }}
    >
      {/* countdown bar */}
      <div aria-hidden style={{ height: 3, background: 'var(--q-line)' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: urgent ? 'var(--q-danger)' : 'var(--q-accent)',
            transition: 'width 250ms linear, background var(--q-dur-fast) var(--q-ease)',
          }}
        />
      </div>

      <header className="flex items-center justify-between gap-3 px-5 py-3" style={{ borderBottom: '1px solid var(--q-line)' }}>
        <div>
          <span
            style={{
              fontFamily: 'var(--q-font-mono)',
              fontSize: 'var(--q-text-xs)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--q-accent)',
            }}
          >
            {KIND_LABEL[prompt.kind]}
          </span>
          <h3 style={{ margin: 0, fontFamily: 'var(--q-font-display)', fontSize: 'var(--q-text-lg)', color: 'var(--q-ink)' }}>{prompt.holder}</h3>
        </div>
        <time
          aria-label={`${remaining} seconds left`}
          style={{
            fontFamily: 'var(--q-font-mono)',
            fontSize: 'var(--q-text-lg)',
            color: urgent ? 'var(--q-danger)' : 'var(--q-ink-soft)',
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {remaining}s
        </time>
      </header>

      <div className="px-5 py-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--q-space-3)' }}>
        <p style={{ margin: 0, color: 'var(--q-ink)', fontSize: 'var(--q-text-base)', lineHeight: 'var(--q-leading-normal)' }}>{prompt.trigger}</p>

        {prompt.context && prompt.context.length > 0 && (
          <ul style={{ margin: 0, paddingLeft: 'var(--q-space-4)', color: 'var(--q-ink-soft)', fontSize: 'var(--q-text-sm)' }}>
            {prompt.context.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        )}

        {asDm && (
          <p style={{ margin: 0, fontSize: 'var(--q-text-xs)', color: 'var(--q-ink-faint)', fontStyle: 'italic' }}>
            Answering for {prompt.holder}.
          </p>
        )}
      </div>

      <footer className="px-5 py-3" style={{ borderTop: '1px solid var(--q-line)', background: 'var(--q-surface-raised)', display: 'flex', flexWrap: 'wrap', gap: 'var(--q-space-2)' }}>
        {prompt.options && prompt.options.length > 0 ? (
          <>
            {prompt.options.map((opt) => (
              <button key={opt.id} onClick={() => onTake(opt.id)} style={takeStyle}>
                {opt.label}
                {opt.detail && <span style={{ marginLeft: 6, opacity: 0.8, fontSize: 'var(--q-text-xs)' }}>{opt.detail}</span>}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={onDecline} style={declineStyle}>
              Decline
            </button>
          </>
        ) : (
          <>
            <button onClick={() => onTake()} style={takeStyle}>
              Take
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={onDecline} style={declineStyle}>
              Decline
            </button>
          </>
        )}
      </footer>
    </article>
  );
}

const takeStyle: React.CSSProperties = {
  background: 'var(--q-accent)',
  color: '#fff',
  border: 'none',
  borderRadius: 'var(--q-radius)',
  padding: 'var(--q-space-2) var(--q-space-4)',
  fontSize: 'var(--q-text-sm)',
  fontWeight: 600,
  cursor: 'pointer',
};

const declineStyle: React.CSSProperties = {
  background: 'transparent',
  color: 'var(--q-ink-soft)',
  border: '1px solid var(--q-line)',
  borderRadius: 'var(--q-radius)',
  padding: 'var(--q-space-2) var(--q-space-4)',
  fontSize: 'var(--q-text-sm)',
  cursor: 'pointer',
};
