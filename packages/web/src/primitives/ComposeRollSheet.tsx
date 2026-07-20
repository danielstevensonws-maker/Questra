/**
 * ComposeRollSheet — the tap-to-roll surface (Brief 10 §2). Two phases:
 *
 *   compose  — the player states their position (advantage / straight /
 *              disadvantage), dials a situational modifier, and reads the live
 *              formula. Nothing has been rolled yet.
 *   reveal   — the server's `roll_made` arrives. THE DICE THEMSELVES ROLL ON THE
 *              MAP, not here: the 3D `DiceTray` is the one dice object (Design's
 *              Player View — "spend all boldness on this one object"). This panel
 *              waits, then reports the verdict + total + derivation rows once the
 *              tray has settled.
 *
 * ADR-0008, and the one place it is easiest to get wrong: THIS COMPONENT NEVER
 * ROLLS. It composes a request and reports the server's answer; the RNG is the
 * server's. The advantage picker is a REQUEST — the server re-derives the real
 * collapse (Brief 02 step 4) and `result.collapsed` is what this reports, so a
 * player who claims advantage they don't have sees the server's answer.
 *
 * This sheet holds NO die of its own (that duplicated the tray). `result`
 * arriving puts it in the reveal phase; `settled` (driven by the tray's
 * `dice-settled`, or a caller timer) reveals the verdict — until then it reads
 * "Rolling…" while the dice tumble on the map.
 *
 * Design: the "Questra - Player View" prototype (ADR-0014) — the "COMPOSE THE
 * ROLL" sheet, its three-way position control, situational stepper, formula box.
 * Themed via --qa-* tokens. Presentational + fixture-driven (M3.6 wires sync).
 */
import { useState, type CSSProperties, type ReactElement } from 'react';
import { Chip, Label, StatBlock } from '@questra/ui';
import {
  composeFormula, resultRows, verdictLine,
  type ComposeDraftVM, type ComposeSubjectVM, type RollResultVM,
} from './sheetToPlayerHub.js';

export interface ComposeRollSheetProps {
  subject: ComposeSubjectVM;
  draft: ComposeDraftVM;
  onDraftChange: (next: ComposeDraftVM) => void;
  /** commit the intent — the caller sends it; the server rolls. */
  onCommit: () => void;
  onCancel: () => void;
  /**
   * The server's answer. `undefined` while composing; once set the sheet enters
   * the reveal phase (the dice roll on the map, the panel reads "Rolling…").
   * Set this from the `roll_made` event for this roll.
   */
  result?: RollResultVM | undefined;
  /**
   * True once the dice have LANDED — reveals the verdict + rows. The caller ties
   * this to the DiceTray's `dice-settled` event (or its own timer). Kept
   * separate from `result` so the panel never reveals the total before the dice
   * finish tumbling on the map.
   */
  settled?: boolean;
  /** true while the intent is in flight — commit is disabled, dice not yet thrown. */
  pending?: boolean;
}

// The contract value is 'straight'; the prototype labels it NORMAL. Keep the
// The contract value is 'straight'; the design labels it "Straight" and shortens
// disadvantage to "Disadv." to fit the segmented control. Keep the contract.
const POSITIONS: { id: ComposeDraftVM['position']; label: string }[] = [
  { id: 'advantage', label: 'Advantage' },
  { id: 'straight', label: 'Straight' },
  { id: 'disadvantage', label: 'Disadv.' },
];

/** ± stepper button — the design's 24px square (radius-xs). */
const stepStyle: CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 'var(--qa-radius-xs)',
  border: '1px solid var(--qa-glass-border)',
  background: 'var(--qa-glass-chip)',
  color: 'var(--qa-glass-text)',
  fontFamily: 'var(--qa-font-mono)',
  cursor: 'pointer',
};

const KICKER: Record<string, string> = {
  attack_roll: 'Attack roll', ability_check: 'Ability check', saving_throw: 'Saving throw',
  initiative: 'Initiative', death_save: 'Death save', concentration_save: 'Concentration save',
};

export function ComposeRollSheet({
  subject, draft, onDraftChange, onCommit, onCancel, result, settled = false, pending = false,
}: ComposeRollSheetProps): ReactElement {
  return (
    <div
      role="group"
      aria-label={`Roll ${subject.name}`}
      style={{
        // the design's self-contained card: 280px, not docked to an edge
        width: 280,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 16,
        borderRadius: 'var(--qa-radius-md)',
        background: 'var(--qa-glass-raised)',
        border: '1px solid var(--qa-glass-border)',
        backdropFilter: 'blur(var(--qa-blur-raised))',
        WebkitBackdropFilter: 'blur(var(--qa-blur-raised))',
        boxShadow: 'var(--qa-shadow-menu)',
        color: 'var(--qa-glass-text)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontFamily: 'var(--qa-font-mono)',
            fontSize: 8.5,
            letterSpacing: 'var(--qa-track-label)',
            textTransform: 'uppercase',
            color: 'var(--qa-glass-dim)',
          }}
        >
          {KICKER[subject.kind] ?? 'Roll'}
        </span>
        <span
          style={{
            fontFamily: 'var(--qa-font-display)',
            fontSize: 19,
            color: 'var(--qa-glass-text)',
          }}
        >
          {subject.name}
        </span>
        {subject.targetName && (
          <span style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--qa-glass-dim)' }}>
            against {subject.targetName}
          </span>
        )}
      </div>

      {result === undefined ? (
        <>
          {/* ---- compose: position, situational, live formula ---- */}
          {/* A segmented radiogroup (design's one bordered box, active segment
              underlined in ember). Native controls carry role/aria-checked —
              @questra/ui Button forwards no ARIA, so we can't compose it here. */}
          <div
            role="radiogroup"
            aria-label="Roll position"
            style={{
              display: 'flex',
              border: '1px solid var(--qa-glass-border)',
              borderRadius: 'var(--qa-radius-sm)',
              overflow: 'hidden',
            }}
          >
            {POSITIONS.map((p, i) => (
              <PositionSegment
                key={p.id}
                label={p.label}
                on={draft.position === p.id}
                last={i === POSITIONS.length - 1}
                onClick={() => onDraftChange({ ...draft, position: p.id })}
              />
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontFamily: 'var(--qa-font-mono)',
                fontSize: 8.5,
                letterSpacing: 'var(--qa-track-label)',
                textTransform: 'uppercase',
                color: 'var(--qa-glass-dim)',
              }}
            >
              Situational
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
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
                style={{ fontFamily: 'var(--qa-font-mono)', fontSize: 13, color: 'var(--qa-glass-text)' }}
              >
                {draft.situational >= 0 ? `+${draft.situational}` : draft.situational}
              </span>
              <button
                type="button"
                aria-label="Raise the situational modifier"
                onClick={() => onDraftChange({ ...draft, situational: draft.situational + 1 })}
                style={stepStyle}
              >
                +
              </button>
            </div>
          </div>

          {/* the live formula — a preview of the request, never a total */}
          <div
            aria-label="Roll formula"
            style={{
              padding: '8px 10px',
              borderRadius: 'var(--qa-radius-sm)',
              background: 'var(--qa-vellum-ghost)',
              fontFamily: 'var(--qa-font-mono)',
              fontSize: 10.5,
              lineHeight: 1.5,
              color: 'var(--qa-glass-dim)',
            }}
          >
            {composeFormula(subject, draft)}
          </div>

          <button
            type="button"
            onClick={onCommit}
            disabled={pending}
            style={{
              width: '100%',
              padding: 12,
              border: 'none',
              borderRadius: 'var(--qa-radius-sm)',
              background: 'linear-gradient(180deg,var(--qa-ember),var(--qa-ember-deep))',
              color: 'var(--qa-vellum-bright)',
              fontFamily: 'var(--qa-font-display)',
              fontSize: 15,
              letterSpacing: '.5px',
              cursor: pending ? 'default' : 'pointer',
              opacity: pending ? 0.6 : 1,
              boxShadow: pending ? 'none' : 'var(--qa-glow-ember)',
            }}
          >
            {pending ? 'Rolling…' : 'Roll'}
          </button>

          {/* physical dice — first-class (ADR-0008), a quiet centered link */}
          <button
            type="button"
            onClick={onCancel}
            style={{
              alignSelf: 'center',
              background: 'none',
              border: 'none',
              borderBottom: '1px solid var(--qa-hairline)',
              padding: '2px 4px',
              fontFamily: 'var(--qa-font-body)',
              fontStyle: 'italic',
              fontSize: 12.5,
              color: 'var(--qa-glass-dim)',
              cursor: 'pointer',
            }}
          >
            Rolled real dice? Enter them by hand
          </button>
        </>
      ) : (
        <>
          {/* ---- the reveal ----
              No die here: the dice tumble on the map (DiceTray). This panel waits
              for them to land (`settled`), then reports the verdict + total. */}
          <div
            data-testid="reveal"
            data-settled={settled}
            aria-live="polite"
            aria-label={settled ? `Rolled a total of ${result.total}` : 'Rolling on the table'}
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-space-2)', minWidth: 0 }}
          >
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
              // the dice are still tumbling on the map
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-space-3)' }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 8, height: 8, borderRadius: '50%', flex: 'none',
                    background: 'var(--qa-ember)', animation: 'qa-roll-pulse 900ms var(--qa-ease) infinite',
                  }}
                />
                <Label>Rolling on the table…</Label>
              </div>
            )}
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
        @keyframes qa-roll-pulse { 0%,100% { opacity: 1 } 50% { opacity: .3 } }
        @media (prefers-reduced-motion: reduce) {
          [data-testid="reveal"] [aria-hidden="true"] { animation: none !important }
        }
      `}</style>
    </div>
  );
}

/**
 * One segment of the position control — the design's segmented box: three flex
 * cells in one border, hairline dividers between, the active one underlined in
 * ember (inset box-shadow) with bright ink and a chip fill. A radio for a11y.
 */
function PositionSegment({
  label,
  on,
  last,
  onClick,
}: {
  label: string;
  on: boolean;
  last: boolean;
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
        textAlign: 'center',
        padding: '7px 0',
        border: 'none',
        borderRight: last ? 'none' : '1px solid var(--qa-glass-border)',
        cursor: 'pointer',
        fontFamily: 'var(--qa-font-mono)',
        fontSize: 9,
        letterSpacing: 1,
        textTransform: 'uppercase',
        background: on ? 'var(--qa-glass-chip)' : 'transparent',
        color: on ? 'var(--qa-vellum-bright)' : 'var(--qa-glass-dim)',
        boxShadow: on
          ? 'inset 0 -2px 0 var(--qa-ember)'
          : focused ? 'var(--qa-focus-ring)' : 'none',
        transition: 'background var(--qa-dur-fast) var(--qa-ease), color var(--qa-dur-fast) var(--qa-ease)',
      }}
    >
      {label}
    </button>
  );
}
