/**
 * AcceptTweakRejectCard — the universal AI-output card (Orchestration spec §4;
 * CLAUDE.md law #2 "the app must never say no" pairs with "AI suggests, the
 * DM decides"; component-list A3).
 *
 * Rebuilt to the Claude Design handoff (Design_handoff/design_handoff_accepttweakreject/).
 * Floats as a glass card over the battle-map ground — centered, no scrim
 * (unlike InfoPanel's slide-over). Any AI output that populates UI renders
 * through this ONE card; there is no second AI presentation anywhere in the
 * product.
 *
 * THE INVARIANT: nothing an AI writes is applied until a human presses
 * Accept (or edits it via Tweak and saves, or picks a Fallback option).
 * Reject always leaves the scene untouched.
 *
 * THE HOST OWNS THE STATE MACHINE. This component never transitions itself —
 * it only reports intent via callbacks (onAccept/onReject/…) and the host
 * flips `state`/`outcome` in response (see the InteractiveLoop story). That
 * keeps the state machine visible and testable in the caller, the same way
 * InfoPanel's open/close lives in its caller, not inside the panel.
 *
 * Content is agnostic via `kind`: "text" renders prose (and offers Tweak,
 * since prose is free-editable); "structured" renders label/value rows (a
 * ruling's check/DC/consequence) and never offers Tweak — see
 * aiOutputToCard.ts for the @questra/contracts → StructuredRow[] mapping.
 */
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

export type CardState = 'streaming' | 'draft' | 'tweak' | 'fallback' | 'resolved';
export type CardKind = 'text' | 'structured';
export type CardOutcome = 'accepted' | 'tweaked' | 'rejected';

export interface StructuredRow {
  label: string;
  value: string;
  /** "value" = serif prose · "number" = mono numeral · "note" = italic consequence line. Default "value". */
  variant?: 'value' | 'number' | 'note';
}

export interface FallbackOption {
  name: string;
  value: string;
  recommended?: boolean;
}

export interface AcceptTweakRejectCardProps {
  state: CardState;
  /** Body shape for draft/streaming/tweak. Only "text" drafts offer Tweak. Default "text". */
  kind?: CardKind;
  /** Header eyebrow. Default "Suggestion" (or "Fallback" in the fallback state). */
  eyebrow?: string;
  /** Header source tag, e.g. "DM Narration" / "DM Ruling". */
  source?: string;

  /** Prose body (draft/streaming/tweak seed). */
  text?: string;
  /** Structured ruling body. */
  rows?: StructuredRow[];

  /** Fallback prompt + options — the non-AI path (ADR: AI always has a non-AI fallback). */
  fallbackPrompt?: string;
  fallbackOptions?: FallbackOption[];

  /** Footer labels. */
  acceptLabel?: string;
  rejectLabel?: string;

  /** Outcome shown in the resolved state. Default "accepted". */
  outcome?: CardOutcome;

  onAccept?: (option?: FallbackOption) => void;
  onReject?: () => void;
  onTweak?: () => void;
  onSaveTweak?: (text: string) => void;
  onCancelTweak?: () => void;
  onUndo?: () => void;
  /**
   * Fires alongside onAccept/onSaveTweak/onReject. Orchestration §4: "the
   * card logs accept/tweak/reject outcomes — that acceptance-rate telemetry
   * is the quality metric for every prompt."
   */
  onOutcome?: (outcome: CardOutcome) => void;
}

const mono = 'var(--qa-font-mono)';
const body = 'var(--qa-font-body)';

export function AcceptTweakRejectCard({
  state,
  kind = 'text',
  eyebrow,
  source,
  text = '',
  rows = [],
  fallbackPrompt = "The assistant couldn't reach a ruling. Set the difficulty yourself:",
  fallbackOptions = [],
  acceptLabel = 'Accept',
  rejectLabel = 'Reject',
  outcome = 'accepted',
  onAccept,
  onReject,
  onTweak,
  onSaveTweak,
  onCancelTweak,
  onUndo,
  onOutcome,
}: AcceptTweakRejectCardProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [tweakText, setTweakText] = useState(text);

  // Seed + focus (caret at end) only on ENTERING tweak mode — `text` is
  // deliberately not a dependency, or every keystroke upstream would stomp
  // the in-progress edit.
  useEffect(() => {
    if (state !== 'tweak') return;
    setTweakText(text);
    const el = taRef.current;
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const structured = kind === 'structured';
  const isFallback = state === 'fallback';
  const isDecision = state === 'draft' || state === 'fallback';
  const showTweakBtn = state === 'draft' && !structured && onTweak !== undefined;
  const showFooter = state === 'draft' || state === 'fallback' || state === 'tweak';

  const resolvedEyebrow = eyebrow ?? (isFallback ? 'Fallback' : 'Suggestion');
  const resolvedSource = source ?? (structured ? 'DM Ruling' : 'DM Narration');

  const outcomeCopy: Record<CardOutcome, { text: string; color: string }> = {
    accepted: { text: 'Accepted — applied to the scene.', color: 'var(--qa-success)' },
    tweaked: { text: 'Saved your changes — applied to the scene.', color: 'var(--qa-success)' },
    rejected: { text: 'Rejected — nothing was applied.', color: 'var(--qa-ink-faint)' },
  };
  const oc = outcomeCopy[outcome];

  const handleAccept = () => {
    const option = isFallback ? fallbackOptions.find((o) => o.recommended) : undefined;
    onAccept?.(option);
    onOutcome?.('accepted');
  };
  const handleReject = () => {
    onReject?.();
    onOutcome?.('rejected');
  };
  const handleSaveTweak = () => {
    onSaveTweak?.(tweakText);
    onOutcome?.('tweaked');
  };

  return (
    <section
      className="qa-atr-card"
      role="region"
      aria-label={`${resolvedEyebrow} — ${structured ? 'DM ruling' : 'narration'}`}
      aria-busy={state === 'streaming'}
      style={{
        width: 560,
        maxWidth: '100%',
        background: 'var(--qa-glass)',
        border: 'var(--qa-hairline) solid var(--qa-glass-border)',
        borderRadius: 'var(--qa-radius-lg)',
        backdropFilter: 'blur(var(--qa-glass-blur))',
        WebkitBackdropFilter: 'blur(var(--qa-glass-blur))',
        boxShadow: 'var(--qa-shadow-pop)',
        overflow: 'hidden',
        color: 'var(--qa-ink)',
        fontFamily: body,
        animation: 'qa-card-in var(--qa-dur) var(--qa-ease-out)',
      }}
    >
      {/* ---- header ----------------------------------------------------- */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--qa-s3)',
          padding: 'var(--qa-s5) var(--qa-s5) var(--qa-s3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s2)' }}>
          <span
            title="An assistant wrote this"
            style={{
              width: 6,
              height: 6,
              borderRadius: 'var(--qa-radius-round)',
              background: 'var(--qa-accent)',
              boxShadow: '0 0 8px var(--qa-accent-glow)',
              flex: 'none',
            }}
          />
          <span
            style={{
              fontFamily: mono,
              fontSize: 'var(--qa-text-whisper)',
              letterSpacing: 'var(--qa-tracking-caps)',
              textTransform: 'uppercase',
              color: 'var(--qa-ink-dim)',
            }}
          >
            {resolvedEyebrow}
          </span>
        </div>
        <span
          style={{
            fontFamily: mono,
            fontSize: 'var(--qa-text-whisper)',
            letterSpacing: 'var(--qa-tracking-caps)',
            textTransform: 'uppercase',
            color: 'var(--qa-ink-faint)',
          }}
        >
          {resolvedSource}
        </span>
      </header>

      {/* ---- body --------------------------------------------------------- */}
      <div style={{ padding: '0 var(--qa-s5) var(--qa-s5)' }}>
        {state === 'draft' && !structured && (
          <p
            style={{
              fontFamily: body,
              fontSize: 'var(--qa-text-body)',
              lineHeight: 1.6,
              color: 'var(--qa-ink)',
              margin: 0,
              whiteSpace: 'pre-line',
              textWrap: 'pretty',
            }}
          >
            {text}
          </p>
        )}

        {state === 'draft' && structured && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {rows.map((row, i) => (
              <StructuredRowLine key={row.label} row={row} first={i === 0} />
            ))}
          </div>
        )}

        {state === 'streaming' && (
          <p
            style={{
              fontFamily: body,
              fontSize: 'var(--qa-text-body)',
              lineHeight: 1.6,
              color: 'var(--qa-ink)',
              margin: 0,
              whiteSpace: 'pre-line',
            }}
          >
            {text}
            <span
              style={{
                display: 'inline-block',
                width: 2,
                height: '1.05em',
                verticalAlign: -2,
                marginLeft: 2,
                background: 'var(--qa-accent)',
                animation: 'qa-blink 1s steps(1) infinite',
              }}
            />
          </p>
        )}

        {state === 'tweak' && (
          <textarea
            ref={taRef}
            value={tweakText}
            onChange={(e) => setTweakText(e.target.value)}
            aria-label="Edit the suggestion"
            style={{
              width: '100%',
              minHeight: 148,
              resize: 'vertical',
              background: 'var(--qa-glass-solid)',
              border: 'var(--qa-hairline) solid var(--qa-accent-line)',
              borderRadius: 'var(--qa-radius)',
              padding: 'var(--qa-s3)',
              fontFamily: body,
              fontSize: 'var(--qa-text-body)',
              lineHeight: 1.55,
              color: 'var(--qa-ink)',
              outline: 'none',
              boxShadow: '0 0 0 3px var(--qa-accent-soft)',
            }}
          />
        )}

        {state === 'fallback' && (
          <>
            <p
              style={{
                fontFamily: body,
                fontSize: 'var(--qa-text-body)',
                lineHeight: 1.55,
                color: 'var(--qa-ink-dim)',
                margin: '0 0 var(--qa-s4)',
                textWrap: 'pretty',
              }}
            >
              {fallbackPrompt}
            </p>
            <div style={{ display: 'flex', gap: 'var(--qa-s2)' }}>
              {fallbackOptions.map((option) => (
                <div
                  key={option.name}
                  style={{
                    flex: 1,
                    textAlign: 'center',
                    padding: 'var(--qa-s3)',
                    borderRadius: 'var(--qa-radius)',
                    background: option.recommended === true ? 'var(--qa-accent-soft)' : 'var(--qa-chip)',
                    border: `var(--qa-hairline) solid ${option.recommended === true ? 'var(--qa-accent-line)' : 'var(--qa-glass-border)'}`,
                  }}
                >
                  <div style={{ fontFamily: body, fontSize: 'var(--qa-text-label)', color: 'var(--qa-ink-dim)' }}>{option.name}</div>
                  <div style={{ fontFamily: mono, fontSize: 'var(--qa-text-lg)', color: 'var(--qa-ink)', lineHeight: 1.1, marginTop: 2 }}>
                    {option.value}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {state === 'resolved' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s3)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 'var(--qa-radius-round)', background: oc.color, flex: 'none' }} />
            <span style={{ fontFamily: body, fontSize: 'var(--qa-text-body)', color: 'var(--qa-ink-dim)' }}>{oc.text}</span>
            <button
              type="button"
              onClick={() => onUndo?.()}
              style={{
                marginLeft: 'auto',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontFamily: mono,
                fontSize: 'var(--qa-text-whisper)',
                letterSpacing: 'var(--qa-tracking-caps)',
                textTransform: 'uppercase',
                color: 'var(--qa-ink-faint)',
                transition: 'color var(--qa-dur) var(--qa-ease)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--qa-ink)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--qa-ink-faint)')}
            >
              Undo
            </button>
          </div>
        )}
      </div>

      {/* ---- footer: deciding happens HERE ------------------------------ */}
      {showFooter && (
        <footer
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--qa-s2)',
            padding: 'var(--qa-s4) var(--qa-s5)',
            background: 'var(--qa-glass-solid)',
            borderTop: 'var(--qa-hairline) solid var(--qa-glass-border)',
          }}
        >
          {isDecision && (
            <>
              <PrimaryButton label={acceptLabel} onClick={handleAccept} />
              {showTweakBtn && <GhostButton label="Tweak" onClick={() => onTweak?.()} />}
              <div style={{ flex: 1, minWidth: 'var(--qa-s6)' }} />
              <RejectButton label={rejectLabel} onClick={handleReject} />
            </>
          )}

          {state === 'tweak' && (
            <>
              <PrimaryButton label="Save changes" onClick={handleSaveTweak} />
              <GhostButton label="Cancel" onClick={() => onCancelTweak?.()} />
            </>
          )}
        </footer>
      )}
    </section>
  );
}

/** One structured row: mono uppercase label (left, fixed width), value styled by variant (right). */
function StructuredRowLine({ row, first }: { row: StructuredRow; first: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--qa-s4)',
        padding: 'var(--qa-s3) 0',
        ...(first ? {} : { borderTop: 'var(--qa-hairline) solid var(--qa-glass-border)' }),
      }}
    >
      <div
        style={{
          fontFamily: mono,
          fontSize: 'var(--qa-text-whisper)',
          letterSpacing: 'var(--qa-tracking-caps)',
          textTransform: 'uppercase',
          color: 'var(--qa-ink-dim)',
          width: 96,
          flex: 'none',
          paddingTop: 3,
        }}
      >
        {row.label}
      </div>
      <div style={rowValueStyle(row.variant)}>{row.value}</div>
    </div>
  );
}

function rowValueStyle(variant: StructuredRow['variant']): CSSProperties {
  if (variant === 'number') {
    return { fontFamily: mono, fontSize: 'var(--qa-text-lg)', color: 'var(--qa-ink)', lineHeight: 1.2 };
  }
  if (variant === 'note') {
    return { fontFamily: body, fontStyle: 'italic', fontSize: 'var(--qa-text-body)', color: 'var(--qa-ink-dim)', lineHeight: 1.45 };
  }
  return { fontFamily: body, fontSize: 'var(--qa-text-body)', color: 'var(--qa-ink)', lineHeight: 1.4 };
}

const btnBase: CSSProperties = {
  height: 40,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 'var(--qa-radius)',
  fontFamily: body,
  fontSize: 'var(--qa-text-body)',
  fontWeight: 500,
  cursor: 'pointer',
};

function PrimaryButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...btnBase,
        padding: '0 var(--qa-s5)',
        background: 'var(--qa-accent)',
        color: 'var(--qa-accent-ink)',
        border: 'none',
        transition: 'box-shadow var(--qa-dur) var(--qa-ease), transform var(--qa-dur-fast) var(--qa-ease)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 8px 24px -8px var(--qa-accent-glow)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(1px)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      {label}
    </button>
  );
}

function GhostButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...btnBase,
        padding: '0 var(--qa-s4)',
        background: 'transparent',
        color: 'var(--qa-ink)',
        border: 'var(--qa-hairline) solid var(--qa-glass-border)',
        transition: 'border-color var(--qa-dur) var(--qa-ease)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--qa-ink-faint)')}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--qa-glass-border)')}
    >
      {label}
    </button>
  );
}

function RejectButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...btnBase,
        padding: '0 var(--qa-s4)',
        background: 'transparent',
        color: 'var(--qa-ink-dim)',
        border: 'var(--qa-hairline) solid transparent',
        transition: 'all var(--qa-dur) var(--qa-ease)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--qa-danger)';
        e.currentTarget.style.background = 'var(--qa-danger-soft)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--qa-ink-dim)';
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {label}
    </button>
  );
}
