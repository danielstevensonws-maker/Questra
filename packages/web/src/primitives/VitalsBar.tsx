/**
 * VitalsBar — the player hub's at-a-glance state (Brief 10 §2): HP (watched),
 * AC, and conditions, each condition and AC carrying a tap-"?" to its
 * InfoPanel derivation (§1: no orphan math). Composes the design-system
 * HPBar rather than reinventing the bar (Playbook §3).
 *
 * Presentational: it takes the VitalsVM view-model (built by sheetToPlayerHub)
 * and an onExplain callback the "?" fires — it holds no game state.
 *
 * HP carries the hub's largest type (`statValue`, see hudType). It is the one
 * number a player checks constantly and from across a room, and it was
 * previously set at body size — the same weight as ordinary prose, which is
 * why the card read flat. AC sits beside it as a chip because it lives with
 * the defensive vitals rather than with the ability scores (StatBar used to
 * show it too; that duplication is gone).
 */
import { useState, type ReactElement, type ReactNode } from 'react';
import { HPBar } from '@questra/ui';
import { sectionLabel, statMeta, statValue } from './hudType.js';
import type { VitalsVM } from './sheetToPlayerHub.js';

export interface VitalsBarProps {
  vitals: VitalsVM;
  /** tap-"?" on AC or a condition ⇒ open its InfoPanel. `ref` is 'ac' or a condition id. */
  onExplain?: (ref: string) => void;
  /** dimmed while dying (Brief 10 §2: vitals dimmed in the death-save state). */
  dimmed?: boolean;
}

export function VitalsBar({ vitals, onExplain, dimmed = false }: VitalsBarProps): ReactElement {
  const { hp, ac, conditions, bloodied } = vitals;
  return (
    <div
      aria-label="Vitals"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--qa-s2)',
        opacity: dimmed ? 0.45 : 1,
        transition: 'opacity var(--qa-dur) var(--qa-ease)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--qa-s2)' }}>
        <span style={sectionLabel}>Vitals</span>
        <ExplainChip label={`Armor Class ${ac.value} — explain`} onClick={onExplain ? () => onExplain('ac') : undefined}>
          AC {ac.value}
        </ExplainChip>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s3)' }}>
        <span style={{ ...statValue, color: bloodied ? 'var(--qa-danger)' : 'var(--qa-ink)', flex: 'none' }}>
          {hp.current}/{hp.max}
        </span>
        <HPBar value={hp.current} max={hp.max} showText={false} height={6} style={{ flex: 1 }} />
      </div>

      {hp.temp > 0 && <span style={{ ...statMeta, color: 'var(--qa-success)' }}>+{hp.temp} temporary</span>}

      {(bloodied || conditions.length > 0) && (
        <div style={{ display: 'flex', gap: 'var(--qa-s1)', flexWrap: 'wrap' }}>
          {bloodied && (
            <ConditionChip tone="danger" onClick={onExplain ? () => onExplain('bloodied') : undefined}>
              Bloodied
            </ConditionChip>
          )}
          {conditions.map((c) => (
            <ConditionChip key={c.id} onClick={onExplain ? () => onExplain(c.id) : undefined}>
              {c.name}
            </ConditionChip>
          ))}
        </div>
      )}
    </div>
  );
}

/** The AC readout — a chip-shaped button carrying the quiet "?". */
function ExplainChip({ children, label, onClick }: { children: ReactNode; label: string; onClick?: (() => void) | undefined }): ReactElement {
  const [focused, setFocused] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        ...statMeta,
        flex: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: 'var(--qa-chip)',
        border: 'var(--qa-hairline) solid var(--qa-glass-border)',
        borderRadius: 'var(--qa-radius)',
        padding: '3px var(--qa-s2)',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: focused ? '0 0 0 2px var(--qa-accent-soft)' : 'none',
        transition: 'box-shadow var(--qa-dur-fast) var(--qa-ease)',
      }}
    >
      {children}
      <span aria-hidden="true" style={{ color: 'var(--qa-ink-faint)' }}>
        ?
      </span>
    </button>
  );
}

/** A condition chip that is also a button — every one opens its InfoPanel. */
function ConditionChip({ children, tone, onClick }: { children: ReactNode; tone?: 'danger'; onClick?: (() => void) | undefined }): ReactElement {
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
        ...sectionLabel,
        padding: '2px var(--qa-s2)',
        borderRadius: 'var(--qa-radius-round)',
        color: danger ? 'var(--qa-danger)' : 'var(--qa-ink-dim)',
        background: danger ? 'var(--qa-danger-soft)' : 'var(--qa-chip)',
        border: `var(--qa-hairline) solid ${danger ? 'transparent' : 'var(--qa-glass-border)'}`,
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: focused ? '0 0 0 2px var(--qa-accent-soft)' : 'none',
        transition: 'box-shadow var(--qa-dur-fast) var(--qa-ease)',
      }}
    >
      {children}
    </button>
  );
}
