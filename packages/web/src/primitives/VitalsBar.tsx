/**
 * VitalsBar — the player hub's at-a-glance state (Brief 10 §2): HP (watched), AC,
 * and conditions, each condition and AC carrying a tap-"?" to its InfoPanel
 * derivation (§1: no orphan math). Composes the design-system HPBar rather than
 * reinventing the bar (Playbook §3).
 *
 * Presentational: it takes the VitalsVM view-model (built by sheetToPlayerHub)
 * and an onExplain callback the "?" fires — it holds no game state.
 *
 * Design: the Questra V1 Prototype sheet, §VitalsBar. A glass row that floats
 * over the map — HP label, bar, readout and the AC chip on one line, condition
 * buttons beneath. Bloodied reads danger-outlined; other conditions whisper.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';
import { HPBar } from '@questra/ui';
import type { VitalsVM } from './sheetToPlayerHub.js';

export interface VitalsBarProps {
  vitals: VitalsVM;
  /** tap-"?" on AC or a condition ⇒ open its InfoPanel. `ref` is 'ac' or a condition id. */
  onExplain?: (ref: string) => void;
  /** dimmed while dying (Brief 10 §2: vitals dimmed in the death-save state). */
  dimmed?: boolean;
}

/** The micro-label used inside the glass row — glass-dim, not vellum. */
const microLabel: CSSProperties = {
  fontFamily: 'var(--qa-font-mono)',
  fontSize: 8.5,
  letterSpacing: 'var(--qa-track-label)',
  color: 'var(--qa-glass-dim)',
};

export function VitalsBar({ vitals, onExplain, dimmed = false }: VitalsBarProps): ReactElement {
  const { hp, ac, conditions, bloodied } = vitals;
  return (
    <div
      aria-label="Vitals"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        opacity: dimmed ? 0.45 : 1,
        transition: 'opacity var(--qa-dur) var(--qa-ease)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={microLabel}>HP</span>
        {/* the bar turns ember when low — the colour IS the information */}
        <HPBar value={hp.current} max={hp.max} showText={false} height={5} style={{ flex: 1 }} />
        <span style={{ fontFamily: 'var(--qa-font-mono)', fontSize: 10, color: 'var(--qa-glass-dim)' }}>
          {hp.current}/{hp.max}
        </span>
        <ExplainButton
          label={`Armor Class ${ac.value} — explain`}
          onClick={onExplain ? () => onExplain('ac') : undefined}
        >
          AC {ac.value} <span style={{ color: 'var(--qa-glass-dim)' }}>?</span>
        </ExplainButton>
      </div>

      {hp.temp > 0 && (
        <span style={{ fontFamily: 'var(--qa-font-mono)', fontSize: 10, color: 'var(--qa-heal)' }}>
          +{hp.temp} temporary
        </span>
      )}

      {(bloodied || conditions.length > 0) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {/* Bloodied is a derived state, not a condition — it reads danger. */}
          {bloodied && (
            <ConditionButton tone="danger" onClick={onExplain ? () => onExplain('bloodied') : undefined}>
              Bloodied
            </ConditionButton>
          )}
          {conditions.map((c) => (
            <ConditionButton key={c.id} onClick={onExplain ? () => onExplain(c.id) : undefined}>
              {c.name}
            </ConditionButton>
          ))}
        </div>
      )}
    </div>
  );
}

/** The AC readout — a chip-shaped button carrying the quiet "?". */
function ExplainButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: (() => void) | undefined;
}): ReactElement {
  const [focused, setFocused] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        fontFamily: 'var(--qa-font-mono)',
        fontSize: 10,
        letterSpacing: 1,
        color: 'var(--qa-glass-text)',
        background: 'var(--qa-glass-chip)',
        border: '1px solid var(--qa-glass-border)',
        borderRadius: 'var(--qa-radius-xs)',
        padding: '3px 8px',
        cursor: onClick ? 'pointer' : 'default',
        ...(focused ? { boxShadow: 'var(--qa-focus-ring)' } : {}),
        transition: 'box-shadow var(--qa-dur-fast) var(--qa-ease)',
      }}
    >
      {children}
    </button>
  );
}

/** A condition chip that is also a button — every one opens its InfoPanel. */
function ConditionButton({
  children,
  tone,
  onClick,
}: {
  children: React.ReactNode;
  tone?: 'danger';
  onClick?: (() => void) | undefined;
}): ReactElement {
  const [focused, setFocused] = useState(false);
  const danger = tone === 'danger';
  return (
    <button
      type="button"
      aria-label={`${String(children)} — explain`}
      onClick={onClick}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        fontFamily: 'var(--qa-font-mono)',
        fontSize: 8.5,
        letterSpacing: 'var(--qa-track-label)',
        textTransform: 'uppercase',
        padding: '2px 7px',
        borderRadius: 'var(--qa-radius-xs)',
        color: danger ? 'var(--qa-danger)' : 'var(--qa-vellum-dim)',
        background: danger ? 'transparent' : 'var(--qa-vellum-ghost)',
        border: danger ? '1px solid color-mix(in srgb, var(--qa-danger) 50%, transparent)' : 'none',
        cursor: onClick ? 'pointer' : 'default',
        ...(focused ? { boxShadow: 'var(--qa-focus-ring)' } : {}),
        transition: 'box-shadow var(--qa-dur-fast) var(--qa-ease)',
      }}
    >
      {children} ?
    </button>
  );
}
