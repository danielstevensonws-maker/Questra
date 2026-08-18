/**
 * StatBar — the six ability scores plus the two derived numbers that belong
 * with them. Every number carries a tap-"?" to its InfoPanel derivation
 * (§1: no orphan math).
 *
 * CHROME. It renders either as its own Panel (`chrome="panel"`, the default —
 * how it ships standalone) or bare (`chrome="bare"`), letting PlayerHub place
 * it as one bay inside a single continuous frame. The bottom bar used to be
 * three separately-floating cards of three different widths (240 / 216 / 340)
 * and three different radii, which is most of why it read as inconsistent —
 * there is no way to make three boxes agree as well as one box with dividers.
 *
 * AC IS NOT HERE, deliberately. It used to sit in this component's header AND
 * in VitalsBar, so the player's screen showed the same number twice. Armour
 * class is a defensive vital, so it lives with HP; speed and passive
 * perception are the derived numbers that belong with the abilities.
 *
 * Presentational: takes the StatBarVM (built by sheetToPlayerHub.toStats) and
 * an onExplain callback. No local game state.
 */
import { useState, type ReactElement, type ReactNode } from 'react';
import { Panel } from '@questra/ui';
import { sectionLabel, statMeta, statValue } from './hudType.js';
import { fmtMod, ABILITY_LABEL, type StatBarVM, type AbilityKey } from './sheetToPlayerHub.js';

export interface StatBarProps {
  stats: StatBarVM;
  /** tap-"?" ⇒ open the InfoPanel derivation. `ref` is 'speed', 'perception', or an ability key. */
  onExplain?: (ref: string) => void;
  /** `bare` drops the Panel wrapper so a parent frame can own the chrome. */
  chrome?: 'panel' | 'bare';
}

export function StatBar({ stats, onExplain, chrome = 'panel' }: StatBarProps): ReactElement {
  const body = (
    <>
      <span style={sectionLabel}>Stats</span>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--qa-s2)' }}>
        {stats.abilities.map((a) => (
          <AbilityCell key={a.ability} ability={a.ability} score={a.score} mod={a.mod} onClick={onExplain ? () => onExplain(a.ability) : undefined} />
        ))}
      </div>

      {/* the two derived numbers that belong with abilities — AC lives with vitals. */}
      <div style={{ display: 'flex', gap: 'var(--qa-s2)' }}>
        <ReadoutChip label={`Speed ${stats.speed.value} feet — explain`} onClick={onExplain ? () => onExplain('speed') : undefined}>
          {stats.speed.value} ft
        </ReadoutChip>
        <ReadoutChip
          label={`Passive Perception ${stats.passivePerception.value} — explain`}
          onClick={onExplain ? () => onExplain('perception') : undefined}
        >
          Passive {stats.passivePerception.value}
        </ReadoutChip>
      </div>
    </>
  );

  if (chrome === 'bare') {
    return <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s3)', width: '100%' }}>{body}</div>;
  }

  // `large` radius + s4 padding + s3 rhythm — the same chrome contract
  // PlayerHub's HubPanel applies. The hub's panels are separate surfaces, so
  // the ONLY thing keeping them from disagreeing again is that they all use
  // these exact values. Change them here and in HubPanel together.
  return (
    <Panel
      large
      aria-label="Stats"
      style={{ padding: 'var(--qa-s4)', width: 232, flex: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--qa-s3)' }}
    >
      {body}
    </Panel>
  );
}

function AbilityCell({
  ability,
  score,
  mod,
  onClick,
}: {
  ability: AbilityKey;
  score: number;
  mod: number;
  onClick?: (() => void) | undefined;
}): ReactElement {
  const [focused, setFocused] = useState(false);
  return (
    <button
      type="button"
      aria-label={`${ABILITY_LABEL[ability]} ${fmtMod(mod)}, score ${score} — explain`}
      onClick={onClick}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1,
        padding: 'var(--qa-s2) 0',
        borderRadius: 'var(--qa-radius)',
        background: 'var(--qa-chip)',
        border: 'var(--qa-hairline) solid var(--qa-glass-border)',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: focused ? '0 0 0 2px var(--qa-accent-soft)' : 'none',
        transition: 'box-shadow var(--qa-dur-fast) var(--qa-ease)',
      }}
    >
      <span style={sectionLabel}>{ability}</span>
      <span style={statValue}>{fmtMod(mod)}</span>
      <span style={{ ...statMeta, color: 'var(--qa-ink-faint)' }}>{score}</span>
    </button>
  );
}

/** A small derived-number button — same contract as VitalsBar's ExplainChip. */
function ReadoutChip({ children, label, onClick }: { children: ReactNode; label: string; onClick?: (() => void) | undefined }): ReactElement {
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
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        background: 'var(--qa-chip)',
        border: 'var(--qa-hairline) solid var(--qa-glass-border)',
        borderRadius: 'var(--qa-radius)',
        padding: 'var(--qa-s2) 0',
        cursor: onClick ? 'pointer' : 'default',
        boxShadow: focused ? '0 0 0 2px var(--qa-accent-soft)' : 'none',
        transition: 'box-shadow var(--qa-dur-fast) var(--qa-ease)',
      }}
    >
      {children}
    </button>
  );
}
