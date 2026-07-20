/**
 * ComposeRollSheet — the tap-to-roll surface (Brief 10 §2). Two phases:
 *
 *   compose  — the player states their position (advantage / straight /
 *              disadvantage), dials a situational modifier, and reads the live
 *              formula. Nothing has been rolled yet.
 *   settling — the server's `roll_made` arrives; the die tumbles, then lands on
 *              the number the server already chose, and the derivation rows +
 *              verdict resolve underneath it.
 *
 * ADR-0008, and the one place it is easiest to get wrong: THIS COMPONENT NEVER
 * ROLLS. The Design prototype tumbles a local `Math.random()` d20 — we take its
 * choreography (the ~840ms tumble, the settle, the tone flash) and drive it from
 * `result`. While tumbling we show *arbitrary faces*, never candidate values: the
 * faces are decoration over a decided outcome, so a player who screenshots
 * mid-animation learns nothing. `result` arriving is the only thing that settles
 * the die; if it never arrives the sheet tumbles until the caller unmounts it.
 *
 * The advantage picker is likewise a REQUEST. The server re-derives the real
 * collapse from effects (Brief 02 step 4) and `result.collapsed` is what the
 * settled sheet reports — so a player who claims advantage they don't have sees
 * the server's answer, not their own.
 *
 * Design: the "Questra - Player View" prototype (the ADR-0014 look authority) —
 * the "COMPOSE THE ROLL" sheet, its three-way position control, the situational
 * stepper, the formula box, and the diamond die. Themed via --qa-* tokens. Only
 * the RNG differs from the prototype, on purpose (ADR-0008).
 *
 * Presentational + fixture-driven: no sync-client import (that seam is M3.6).
 * Feed it a fixture `roll_made` body and it animates exactly as it will in play.
 */
import { useEffect, useRef, useState, type CSSProperties, type ReactElement } from 'react';
import { Chip, Label, StatBlock } from '@questra/ui';
import {
  composeFormula, resultRows, outcomeTone, verdictLine, keptAndDropped,
  type ComposeDraftVM, type ComposeSubjectVM, type RollResultVM,
} from './sheetToPlayerHub.js';

/** Tumble duration before the die settles — the prototype's feel, in a token-ish constant. */
const TUMBLE_MS = 840;
const FACE_SWAP_MS = 70;

export interface ComposeRollSheetProps {
  subject: ComposeSubjectVM;
  draft: ComposeDraftVM;
  onDraftChange: (next: ComposeDraftVM) => void;
  /** commit the intent — the caller sends it; the server rolls. */
  onCommit: () => void;
  onCancel: () => void;
  /**
   * The server's answer. `undefined` while composing; once set the sheet tumbles
   * then reveals it. Set this from the `roll_made` event for this roll.
   */
  result?: RollResultVM | undefined;
  /** fires once the reveal has finished (caller closes the sheet / logs it). */
  onSettled?: (rollId: string) => void;
  /** true while the intent is in flight — commit is disabled, no die yet. */
  pending?: boolean;
}

// The contract value is 'straight'; the prototype labels it NORMAL. Keep the
// contract, relabel the button.
const POSITIONS: { id: ComposeDraftVM['position']; label: string }[] = [
  { id: 'disadvantage', label: 'DISADVANTAGE' },
  { id: 'straight', label: 'NORMAL' },
  { id: 'advantage', label: 'ADVANTAGE' },
];

/** ± stepper button — the prototype's square control. */
const stepStyle: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 'var(--qa-radius-sm)',
  border: '1px solid var(--qa-glass-border)',
  background: 'var(--qa-glass-chip)',
  color: 'var(--qa-glass-text)',
  fontSize: 14,
  cursor: 'pointer',
};

/**
 * Decorative tumbling faces. Deliberately NOT the real d20 — the real value is
 * in `result` and only appears when settled.
 */
function useTumble(active: boolean): number {
  const [face, setFace] = useState(20);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setFace(1 + Math.floor(Math.random() * 20)), FACE_SWAP_MS);
    return () => clearInterval(id);
  }, [active]);
  return face;
}

export function ComposeRollSheet({
  subject, draft, onDraftChange, onCommit, onCancel, result, onSettled, pending = false,
}: ComposeRollSheetProps): ReactElement {
  const [settled, setSettled] = useState(false);
  const settledFor = useRef<string | null>(null);

  // The reveal: a result arrives ⇒ tumble for TUMBLE_MS ⇒ settle on the server's die.
  useEffect(() => {
    if (!result) { setSettled(false); settledFor.current = null; return; }
    if (settledFor.current === result.rollId) return;
    settledFor.current = result.rollId;
    setSettled(false);
    const id = setTimeout(() => { setSettled(true); onSettled?.(result.rollId); }, TUMBLE_MS);
    return () => clearTimeout(id);
  }, [result, onSettled]);

  const tumbling = result !== undefined && !settled;
  const face = useTumble(tumbling);
  const tone = result && settled ? outcomeTone(result.outcome) : 'neutral';
  const toneVar =
    tone === 'good' ? 'var(--qa-ember-bright)' : tone === 'bad' ? 'var(--qa-danger)' : 'var(--qa-glass-dim)';

  const kept = result ? keptAndDropped(result).kept : undefined;
  const shownFace = settled && kept !== undefined ? kept : face;

  return (
    <div
      role="group"
      aria-label={`Roll ${subject.name}`}
      style={{
        width: 420,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '16px 18px',
        borderRadius: 'var(--qa-radius-md)',
        background: 'var(--qa-glass-raised)',
        border: '1px solid var(--qa-glass-border)',
        backdropFilter: 'blur(var(--qa-blur-heavy))',
        WebkitBackdropFilter: 'blur(var(--qa-blur-heavy))',
        boxShadow: 'var(--qa-shadow-menu)',
        color: 'var(--qa-glass-text)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontFamily: 'var(--qa-font-mono)',
            fontSize: 8.5,
            letterSpacing: 2,
            color: 'var(--qa-glass-dim)',
          }}
        >
          COMPOSE THE ROLL
        </span>
        <span
          style={{
            fontFamily: 'var(--qa-font-display)',
            fontSize: 20,
            fontWeight: 600,
            color: 'var(--qa-glass-text)',
          }}
        >
          {subject.name}
        </span>
        {subject.targetName && (
          <span style={{ fontSize: 12, color: 'var(--qa-glass-dim)' }}>against {subject.targetName}</span>
        )}
      </div>

      {result === undefined ? (
        <>
          {/* ---- compose: position, situational, live formula ---- */}
          {/* A radiogroup, not three Buttons: @questra/ui Button takes a closed
              prop set and forwards no ARIA, so composing it here would drop
              role/aria-checked. Native controls, design tokens. */}
          <div style={{ display: 'flex', gap: 5 }} role="radiogroup" aria-label="Roll position">
            {POSITIONS.map((p) => {
              const on = draft.position === p.id;
              return (
                <PositionButton
                  key={p.id}
                  label={p.label}
                  on={on}
                  onClick={() => onDraftChange({ ...draft, position: p.id })}
                />
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span
              style={{
                fontFamily: 'var(--qa-font-mono)',
                fontSize: 9.5,
                letterSpacing: 1.2,
                color: 'var(--qa-glass-dim)',
              }}
            >
              SITUATIONAL
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                aria-label="Lower the situational modifier"
                onClick={() => onDraftChange({ ...draft, situational: draft.situational - 1 })}
                style={stepStyle}
              >
                −
              </button>
              <span
                aria-live="polite"
                style={{
                  fontFamily: 'var(--qa-font-mono)',
                  fontSize: 14,
                  fontWeight: 600,
                  width: 36,
                  textAlign: 'center',
                }}
              >
                {draft.situational >= 0 ? `+${draft.situational}` : draft.situational}
              </span>
              <button
                type="button"
                aria-label="Raise the situational modifier"
                onClick={() => onDraftChange({ ...draft, situational: draft.situational + 1 })}
                style={stepStyle}
              >
                ＋
              </button>
            </div>
          </div>

          {/* the live formula — a preview of the request, never a total */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: 'var(--qa-radius)',
              background: 'var(--qa-glass-chip)',
            }}
          >
            <span
              aria-label="Roll formula"
              style={{ fontFamily: 'var(--qa-font-mono)', fontSize: 11, color: 'var(--qa-glass-dim)' }}
            >
              {composeFormula(subject, draft)}
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '9px 16px',
                borderRadius: 'var(--qa-radius-sm)',
                border: '1px solid var(--qa-glass-border)',
                background: 'transparent',
                color: 'var(--qa-glass-dim)',
                fontSize: 13,
                fontFamily: 'var(--qa-font-body)',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onCommit}
              disabled={pending}
              style={{
                padding: '9px 20px',
                borderRadius: 'var(--qa-radius-sm)',
                border: 'none',
                background: 'linear-gradient(180deg,var(--qa-ember),var(--qa-ember-deep))',
                color: 'var(--qa-vellum-bright)',
                fontSize: 13,
                fontWeight: 600,
                fontFamily: 'var(--qa-font-body)',
                cursor: pending ? 'default' : 'pointer',
                opacity: pending ? 0.6 : 1,
                boxShadow: pending ? 'none' : 'var(--qa-glow-ember)',
              }}
            >
              {pending ? 'Rolling…' : 'Roll'}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* ---- the reveal: the server's die ---- */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-space-7)' }}>
            <div
              data-testid="die"
              data-settled={settled}
              aria-live="polite"
              aria-label={settled ? `Rolled ${kept}` : 'Rolling'}
              style={{
                width: 74,
                height: 74,
                flex: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--qa-radius-lg)',
                border: `2px solid ${toneVar}`,
                background: 'var(--qa-glass-raised)',
                transform: 'rotate(45deg)',
                boxShadow: settled ? `0 0 26px color-mix(in srgb, ${toneVar} 40%, transparent)` : 'none',
                animation: tumbling ? 'qa-die-spin 500ms linear infinite' : 'none',
                transition: 'border-color var(--qa-dur) var(--qa-ease), box-shadow var(--qa-dur) var(--qa-ease)',
              }}
            >
              <span
                style={{
                  transform: 'rotate(-45deg)',
                  fontFamily: 'var(--qa-font-mono)',
                  fontSize: 26,
                  fontWeight: 'var(--qa-weight-bold)',
                  color: toneVar,
                }}
              >
                {shownFace}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-space-2)', minWidth: 0 }}>
              {settled ? (
                <>
                  <span
                    style={{
                      fontFamily: 'var(--qa-font-display)',
                      fontSize: 'var(--qa-text-lg)',
                      color: 'var(--qa-glass-text)',
                      letterSpacing: 'var(--qa-track-name)',
                    }}
                  >
                    {verdictLine(result)}
                  </span>
                  {/* the design's signature scale contrast: whisper label over a big number */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-space-3)' }}>
                    <StatBlock label="TOTAL" mod={result.total} size="sm" />
                    {/* the server's collapse, which may differ from what was asked for */}
                    {result.collapsed !== 'straight' && (
                      <Chip tone="steel">
                        {result.collapsed === 'advantage' ? 'Advantage' : 'Disadvantage'}
                      </Chip>
                    )}
                    {result.entry === 'manual' && <Chip tone="gold">Entered by hand</Chip>}
                  </div>
                </>
              ) : (
                <Label>Rolling…</Label>
              )}
            </div>
          </div>

          {/* derivation rows — every number traceable (§1, no orphan math) */}
          {settled && (
            <dl
              aria-label="How this was worked out"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--qa-space-1)',
                margin: 0,
                borderTop: '1px solid var(--qa-hairline-soft)',
                paddingTop: 'var(--qa-space-4)',
              }}
            >
              {resultRows(result).map((row) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 'var(--qa-space-5)',
                  }}
                >
                  <dt><Label>{row.label}</Label></dt>
                  <dd
                    style={{
                      fontFamily: 'var(--qa-font-mono)',
                      fontSize: 'var(--qa-text-xs)',
                      color: 'var(--qa-glass-text)',
                      margin: 0,
                    }}
                  >
                    {row.value >= 0 ? `+${row.value}` : row.value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}

      <style>{`
        @keyframes qa-die-spin { from { transform: rotate(45deg) } to { transform: rotate(405deg) } }
        @media (prefers-reduced-motion: reduce) {
          [data-testid="die"] { animation: none !important }
        }
      `}</style>
    </div>
  );
}

/** One position in the three-way control — a radio wearing the prototype's chip look. */
function PositionButton({
  label,
  on,
  onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}): ReactElement {
  const [focused, setFocused] = useState(false);
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        flex: 1,
        padding: '7px 4px',
        borderRadius: 'var(--qa-radius-sm)',
        fontFamily: 'var(--qa-font-mono)',
        fontSize: 8.5,
        letterSpacing: 1,
        cursor: 'pointer',
        background: on ? 'color-mix(in srgb, var(--qa-ember) 17%, transparent)' : 'var(--qa-glass-chip)',
        border: on
          ? '1px solid color-mix(in srgb, var(--qa-ember) 67%, transparent)'
          : '1px solid var(--qa-glass-border)',
        color: on ? 'var(--qa-ember-bright)' : 'var(--qa-glass-dim)',
        ...(focused ? { boxShadow: 'var(--qa-focus-ring)' } : {}),
        transition: 'background var(--qa-dur-fast) var(--qa-ease), border-color var(--qa-dur-fast) var(--qa-ease)',
      }}
    >
      {label}
    </button>
  );
}
