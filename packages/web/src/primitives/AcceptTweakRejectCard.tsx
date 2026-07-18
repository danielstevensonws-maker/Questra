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
 * That mirrors InfoPanel taking an InfoPanelData view-model rather than a
 * contracts entity directly.
 *
 * Themed entirely via theme/tokens.css variables. No hardcoded look.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';

/** What the human did with the draft — the acceptance telemetry Orchestration §4 wants. */
export type CardOutcome = 'accepted' | 'tweaked' | 'rejected';

export interface AcceptTweakRejectCardProps {
  /** Short label of what the AI produced ("Ruling suggestion", "NPC line"). Plain language. */
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
   * text on confirm. Omit to hide tweak (e.g. non-textual drafts that can't be
   * edited inline — those offer accept/reject only).
   */
  onTweak?: (edited: string) => void;
  /** The raw editable text seed for tweak mode (usually the draft's source text). */
  tweakSeed?: string;
  /** Reject the draft; nothing is applied. */
  onReject: () => void;
  /**
   * Fires on every terminal outcome for telemetry (Orchestration §4: the card
   * logs accept/tweak/reject — the quality metric for every prompt).
   */
  onOutcome?: (outcome: CardOutcome) => void;
  acceptLabel?: string;
  rejectLabel?: string;
}

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

  useEffect(() => {
    setText(tweakSeed);
  }, [tweakSeed]);

  useEffect(() => {
    if (tweaking) textareaRef.current?.focus();
  }, [tweaking]);

  const showFallback = fallback !== undefined && !streaming;
  const canTweak = onTweak !== undefined && !showFallback;

  function fire(outcome: CardOutcome, action: () => void) {
    action();
    onOutcome?.(outcome);
  }

  return (
    <article
      aria-busy={streaming}
      style={{
        background: 'var(--q-surface)',
        border: '1px solid var(--q-line)',
        borderRadius: 'var(--q-radius-lg)',
        boxShadow: 'var(--q-shadow-panel)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        className="flex items-center justify-between gap-3 px-5 py-3"
        style={{ borderBottom: '1px solid var(--q-line)' }}
      >
        <div className="flex items-center gap-2">
          <SuggestionMark />
          <span
            style={{
              fontFamily: 'var(--q-font-mono)',
              fontSize: 'var(--q-text-xs)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--q-ink-faint)',
            }}
          >
            {showFallback ? 'Fallback' : 'Suggestion'}
          </span>
        </div>
        <h3
          style={{
            fontFamily: 'var(--q-font-display)',
            fontSize: 'var(--q-text-base)',
            color: 'var(--q-ink)',
            margin: 0,
          }}
        >
          {title}
        </h3>
      </header>

      <div className="px-5 py-4" style={{ color: 'var(--q-ink)', fontSize: 'var(--q-text-base)', lineHeight: 'var(--q-leading-normal)' }}>
        {streaming ? (
          <StreamingBody>{draft}</StreamingBody>
        ) : showFallback ? (
          fallback
        ) : tweaking ? (
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className="w-full"
            style={{
              width: '100%',
              background: 'var(--q-surface-raised)',
              border: '1px solid var(--q-line)',
              borderRadius: 'var(--q-radius)',
              color: 'var(--q-ink)',
              fontFamily: 'var(--q-font-body)',
              fontSize: 'var(--q-text-base)',
              lineHeight: 'var(--q-leading-normal)',
              padding: 'var(--q-space-3)',
              resize: 'vertical',
            }}
          />
        ) : typeof draft === 'string' ? (
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{draft}</p>
        ) : (
          draft
        )}
      </div>

      {!streaming && (
        <footer
          className="flex items-center gap-2 px-5 py-3"
          style={{ borderTop: '1px solid var(--q-line)', background: 'var(--q-surface-raised)' }}
        >
          {tweaking ? (
            <>
              <PrimaryButton
                onClick={() => {
                  fire('tweaked', () => onTweak!(text));
                  setTweaking(false);
                }}
              >
                Save changes
              </PrimaryButton>
              <GhostButton onClick={() => setTweaking(false)}>Cancel</GhostButton>
            </>
          ) : (
            <>
              <PrimaryButton onClick={() => fire('accepted', onAccept)}>{acceptLabel}</PrimaryButton>
              {canTweak && <GhostButton onClick={() => setTweaking(true)}>Tweak</GhostButton>}
              <div style={{ flex: 1 }} />
              <GhostButton tone="danger" onClick={() => fire('rejected', onReject)}>
                {rejectLabel}
              </GhostButton>
            </>
          )}
        </footer>
      )}
    </article>
  );
}

/** The quiet mark that says "an assistant made this" — never a warning, just provenance. */
function SuggestionMark() {
  return (
    <span
      aria-hidden
      style={{
        width: 6,
        height: 6,
        borderRadius: '999px',
        background: 'var(--q-accent)',
        display: 'inline-block',
      }}
    />
  );
}

function StreamingBody({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'relative' }}>
      {typeof children === 'string' ? <span style={{ whiteSpace: 'pre-wrap' }}>{children}</span> : children}
      <span
        aria-label="Still writing…"
        style={{
          display: 'inline-block',
          width: '0.5em',
          height: '1em',
          marginLeft: 2,
          background: 'var(--q-accent-soft)',
          verticalAlign: 'text-bottom',
          animation: 'q-caret 1s steps(1) infinite',
        }}
      />
      <style>{`
        @keyframes q-caret { 50% { opacity: 0 } }
        @media (prefers-reduced-motion: reduce) { [aria-label="Still writing…"] { animation: none } }
      `}</style>
    </div>
  );
}

function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--q-accent)',
        color: '#fff',
        border: 'none',
        borderRadius: 'var(--q-radius)',
        padding: 'var(--q-space-2) var(--q-space-4)',
        fontSize: 'var(--q-text-sm)',
        fontWeight: 600,
        cursor: 'pointer',
        transition: 'background var(--q-dur-fast) var(--q-ease)',
      }}
    >
      {children}
    </button>
  );
}

function GhostButton({
  children,
  onClick,
  tone,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: 'danger';
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'transparent',
        color: tone === 'danger' ? 'var(--q-danger)' : 'var(--q-ink-soft)',
        border: '1px solid var(--q-line)',
        borderRadius: 'var(--q-radius)',
        padding: 'var(--q-space-2) var(--q-space-4)',
        fontSize: 'var(--q-text-sm)',
        cursor: 'pointer',
        transition: 'color var(--q-dur-fast) var(--q-ease), border-color var(--q-dur-fast) var(--q-ease)',
      }}
    >
      {children}
    </button>
  );
}
