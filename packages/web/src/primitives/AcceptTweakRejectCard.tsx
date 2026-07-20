/**
 * AcceptTweakRejectCard — THE universal AI-output grammar. Orchestration §4:
 * "Any AI output that populates UI renders into the single accept/tweak/reject
 * card." Reused by every AI touchpoint — rulings, NPC lines, premise drafts,
 * bond proposals, scene sequences, read-aloud, recaps, level-up nudges.
 *
 * The one rule it enforces (CLAUDE.md non-negotiable #5, ADR-0005's spirit):
 *   SUGGESTS, NEVER COMMITS. Nothing here auto-applies. The draft sits in the
 *   card until a human accepts it, tweaks it, or rejects it — three motions,
 *   always all three, so the human gate is structural, not optional.
 *
 * Content-agnostic by design: the draft body is a ReactNode (or plain text),
 * because the AI *schemas* it renders (RulingSuggestion, NpcLine, …) are their
 * own contract PRs. The card is the frame; the schema-specific view is passed in.
 *
 * Design: the Questra V1 Prototype sheet, §AcceptTweakRejectCard. An opaque
 * --qa-ink-raised card (NOT glass — it's an authoring/review surface). A 6px
 * ember dot is the provenance mark; the eyebrow reads "Suggestion · {kind}".
 * Reject is an italic, underlined text button set apart from Accept on purpose.
 * While streaming there is no footer at all. Fallback flips the dot + eyebrow to
 * gold. Themed entirely via --qa-* tokens.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/** What the human did with the draft — the acceptance telemetry Orchestration §4 wants. */
export type CardOutcome = 'accepted' | 'tweaked' | 'rejected';

export interface AcceptTweakRejectCardProps {
  /** Short label of what the AI produced ("Ruling", "NPC line", "Recap"). Plain language. */
  title: string;
  /**
   * The draft itself. A string renders as body text; a ReactNode renders as-is
   * (a schema-specific view — a ruling's check+DC, a bond's two portraits, …).
   */
  draft: ReactNode;
  /** True while the model is still streaming — the card shows a live/pending state. */
  streaming?: boolean;
  /**
   * The AI always has a non-AI fallback (ADR: "AI always has a non-AI fallback").
   * When the model failed or was skipped, pass a fallback node instead of a draft.
   */
  fallback?: ReactNode;
  /** Accept the draft as-is. */
  onAccept: () => void;
  /**
   * Tweak: reveals an editable copy of the draft text. Called with the edited
   * text on confirm. Omit to hide tweak (e.g. non-textual drafts).
   */
  onTweak?: (edited: string) => void;
  /** The raw editable text seed for tweak mode (usually the draft's source text). */
  tweakSeed?: string;
  /** Reject the draft; nothing is applied. */
  onReject: () => void;
  /** Fires on every terminal outcome for telemetry (Orchestration §4). */
  onOutcome?: (outcome: CardOutcome) => void;
  acceptLabel?: string;
  rejectLabel?: string;
}

const card: CSSProperties = {
  width: 330,
  padding: 16,
  borderRadius: 'var(--qa-radius-md)',
  background: 'var(--qa-ink-raised)',
  border: '1px solid var(--qa-hairline)',
  display: 'flex',
  flexDirection: 'column',
  gap: 12,
};

const eyebrow: CSSProperties = {
  fontFamily: 'var(--qa-font-mono)',
  fontSize: 8.5,
  letterSpacing: 'var(--qa-track-label)',
  textTransform: 'uppercase',
  color: 'var(--qa-vellum-dim)',
};

export function AcceptTweakRejectCard({
  title,
  draft,
  streaming = false,
  fallback,
  onAccept,
  onTweak,
  tweakSeed = '',
  onReject,
  onOutcome,
  acceptLabel = 'Accept',
  rejectLabel = 'Reject',
}: AcceptTweakRejectCardProps) {
  const [tweaking, setTweaking] = useState(false);
  const [text, setText] = useState(tweakSeed);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setText(tweakSeed); }, [tweakSeed]);
  useEffect(() => { if (tweaking) textareaRef.current?.focus(); }, [tweaking]);

  const showFallback = fallback !== undefined && !streaming;
  const canTweak = onTweak !== undefined && !showFallback;

  function fire(outcome: CardOutcome, action: () => void) {
    action();
    onOutcome?.(outcome);
  }

  const dotColor = showFallback ? 'var(--qa-gold)' : 'var(--qa-ember)';
  const eyebrowColor = showFallback ? 'var(--qa-gold)' : 'var(--qa-vellum-dim)';

  return (
    <article aria-busy={streaming} style={card}>
      {/* provenance eyebrow: [dot] SUGGESTION · {title} */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          // pulses while streaming; the qa- class lets base.css still it under reduced-motion
          className={streaming ? 'qa-atr-dot' : undefined}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: dotColor,
            ...(streaming ? { animation: 'qa-dot 1.2s infinite' } : {}),
          }}
        />
        <span style={{ ...eyebrow, color: eyebrowColor }}>
          {showFallback ? 'Fallback' : 'Suggestion'} · {title}
        </span>
      </div>

      {/* body */}
      {streaming ? (
        <StreamingBody>{draft}</StreamingBody>
      ) : showFallback ? (
        fallback
      ) : tweaking ? (
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            resize: 'vertical',
            fontFamily: 'var(--qa-font-body)',
            fontSize: 14,
            lineHeight: 1.55,
            color: 'var(--qa-vellum)',
            background: 'var(--qa-vellum-ghost)',
            border: '1px solid var(--qa-hairline)',
            borderRadius: 'var(--qa-radius-sm)',
            padding: '10px 12px',
            outline: 'none',
            boxShadow: 'var(--qa-focus-ring)',
          }}
        />
      ) : typeof draft === 'string' ? (
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--qa-vellum)', whiteSpace: 'pre-wrap' }}>
          {draft}
        </p>
      ) : (
        draft
      )}

      {/* footer — suppressed entirely while streaming */}
      {!streaming && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderTop: '1px solid var(--qa-hairline-soft)',
            paddingTop: 12,
          }}
        >
          {tweaking ? (
            <>
              <PrimaryButton onClick={() => { fire('tweaked', () => onTweak!(text)); setTweaking(false); }}>
                Save changes
              </PrimaryButton>
              <RejectButton onClick={() => setTweaking(false)}>Cancel</RejectButton>
            </>
          ) : (
            <>
              <PrimaryButton onClick={() => fire('accepted', onAccept)}>{acceptLabel}</PrimaryButton>
              {canTweak && <TweakButton onClick={() => setTweaking(true)}>Tweak</TweakButton>}
              <span style={{ flex: 1 }} />
              <RejectButton onClick={() => fire('rejected', onReject)}>{rejectLabel}</RejectButton>
            </>
          )}
        </div>
      )}

      <style>{`
        /* qa-caret is not (yet) a theme keyframe; qa-dot is. Define the caret
           locally, the way ComposeRollSheet owns qa-die-spin. */
        @keyframes qa-caret { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
        @media (prefers-reduced-motion: reduce) {
          .qa-atr-dot, .qa-atr-caret { animation: none !important }
        }
      `}</style>
    </article>
  );
}

function StreamingBody({ children }: { children: ReactNode }) {
  return (
    <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: 'var(--qa-vellum)' }}>
      {typeof children === 'string' ? children : children}
      <span
        aria-label="Still writing…"
        className="qa-atr-caret"
        style={{
          display: 'inline-block',
          width: 7,
          height: 14,
          background: 'var(--qa-vellum)',
          verticalAlign: 'text-bottom',
          marginLeft: 2,
          animation: 'qa-caret 1s steps(1) infinite',
        }}
      />
    </p>
  );
}

/** The ember primary — Accept / Save changes / Use Medium. Display serif. */
function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--qa-font-display)',
        fontSize: 13,
        border: 'none',
        borderRadius: 'var(--qa-radius-sm)',
        padding: '8px 16px',
        background: 'linear-gradient(180deg,var(--qa-ember),var(--qa-ember-deep))',
        color: 'var(--qa-vellum-bright)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

/** Tweak — a quiet ghost-filled secondary. */
function TweakButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--qa-font-body)',
        fontSize: 13,
        border: '1px solid var(--qa-hairline)',
        borderRadius: 'var(--qa-radius-sm)',
        padding: '8px 16px',
        background: 'var(--qa-vellum-ghost)',
        color: 'var(--qa-vellum)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

/** Reject / Cancel / Dismiss — an italic underlined text button, set apart. */
function RejectButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--qa-font-body)',
        fontStyle: 'italic',
        fontSize: 12.5,
        border: 'none',
        borderBottom: '1px solid var(--qa-hairline)',
        background: 'none',
        padding: '2px 4px',
        color: 'var(--qa-vellum-dim)',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}
