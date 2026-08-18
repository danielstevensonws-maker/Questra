/**
 * TurnStrip — the line that tells a player the three things a turn is made of:
 * whether it's theirs, what they're aiming at, and how far they can still move.
 *
 * WHY IT EXISTS. The hub had every number a character sheet holds and none of
 * the state a *turn* holds. That's most of why it read as a stack of panels
 * rather than a game: a sheet is static, a turn is live. Action economy is the
 * loop a player actually sits inside for three hours, and none of it was on
 * screen — you could not tell from the HUD whether it was your turn.
 *
 * Design reference: the turn/target/movement line is standard RPG HUD grammar
 * (Baldur's Gate 3, Divinity, XCOM all carry it), and the Player View v3
 * mockup places the same three readouts above the action rows. Kept to
 * Questra's glass/mono language rather than those games' ornate chrome.
 *
 * Presentational: takes the turn view-model + callbacks, holds no game state.
 * Whose turn it is and how much movement remains are the server's answer,
 * folded from the projection — this only renders them.
 *
 * NO PULSE, deliberately. The obvious move is an animated throb on the "your
 * turn" badge; CLAUDE.md law 4 says screen time is a cost and to prefer
 * glanceable state over motion that demands attention while someone else is
 * talking. A static accent fill plus `--qa-accent-glow` is already unmistakable
 * at a glance, and it needs no reduced-motion variant because it never moves.
 */
import type { ReactElement } from 'react';
import { sectionLabel, statMeta } from './hudType.js';

export interface TurnTargetVM {
  id: string;
  name: string;
  /** the one currently being aimed at — exactly one should be selected. */
  selected: boolean;
}

export interface TurnStripProps {
  /** false ⇒ someone else's turn: the badge reads WAITING and the strip quiets. */
  active: boolean;
  /** whose turn it is when it isn't yours — shown so the table stays legible. */
  activeName?: string;
  targets?: TurnTargetVM[];
  onTarget?: (id: string) => void;
  /** feet of movement left this turn, against the character's full speed. */
  movement?: { left: number; max: number };
}

export function TurnStrip({ active, activeName, targets, onTarget, movement }: TurnStripProps): ReactElement {
  return (
    <div
      aria-label="Turn"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--qa-s4)',
        opacity: active ? 1 : 0.72,
        transition: 'opacity var(--qa-dur) var(--qa-ease)',
      }}
    >
      <TurnBadge active={active} {...(activeName !== undefined ? { activeName } : {})} />

      {targets !== undefined && targets.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s2)', minWidth: 0 }}>
          <span style={sectionLabel}>Target</span>
          {targets.map((t) => (
            <TargetChip key={t.id} target={t} onSelect={onTarget ? () => onTarget(t.id) : undefined} />
          ))}
        </div>
      )}

      {movement !== undefined && <MovementMeter left={movement.left} max={movement.max} />}
    </div>
  );
}

/** The one loud thing in the hub — accent-filled only while the turn is actually yours. */
function TurnBadge({ active, activeName }: { active: boolean; activeName?: string }): ReactElement {
  const label = active ? 'Your turn' : activeName !== undefined ? `${activeName}'s turn` : 'Waiting';
  return (
    <span
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--qa-s2)',
        flex: 'none',
        padding: 'var(--qa-s2) var(--qa-s3)',
        borderRadius: 'var(--qa-radius-sm)',
        background: active ? 'var(--qa-accent)' : 'var(--qa-chip)',
        border: `var(--qa-hairline) solid ${active ? 'transparent' : 'var(--qa-glass-border)'}`,
        boxShadow: active ? '0 0 16px var(--qa-accent-glow)' : 'none',
        transition: 'background var(--qa-dur) var(--qa-ease), box-shadow var(--qa-dur) var(--qa-ease)',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          flex: 'none',
          borderRadius: 'var(--qa-radius-round)',
          background: active ? 'var(--qa-accent-ink)' : 'var(--qa-ink-faint)',
        }}
      />
      <span
        style={{
          ...sectionLabel,
          color: active ? 'var(--qa-accent-ink)' : 'var(--qa-ink-faint)',
        }}
      >
        {label}
      </span>
    </span>
  );
}

/** Aim. The selected target carries the accent line — never fill, so the badge stays the only loud thing. */
function TargetChip({ target, onSelect }: { target: TurnTargetVM; onSelect?: (() => void) | undefined }): ReactElement {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={target.selected}
      aria-label={`Target ${target.name}`}
      style={{
        ...statMeta,
        flex: 'none',
        padding: '3px var(--qa-s2)',
        borderRadius: 'var(--qa-radius-sm)',
        background: target.selected ? 'var(--qa-accent-soft)' : 'var(--qa-chip)',
        border: `var(--qa-hairline) solid ${target.selected ? 'var(--qa-accent-line)' : 'var(--qa-glass-border)'}`,
        color: target.selected ? 'var(--qa-ink)' : 'var(--qa-ink-dim)',
        cursor: onSelect ? 'pointer' : 'default',
        transition: 'all var(--qa-dur-fast) var(--qa-ease)',
      }}
    >
      {target.name}
    </button>
  );
}

/** Movement left, as a meter rather than a number alone — distance is spatial, so read it spatially. */
function MovementMeter({ left, max }: { left: number; max: number }): ReactElement {
  const pct = max > 0 ? Math.max(0, Math.min(1, left / max)) : 0;
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s2)', marginLeft: 'auto', flex: 'none' }}
      aria-label={`Movement: ${left} of ${max} feet left`}
    >
      <span style={sectionLabel}>Move</span>
      <span
        aria-hidden="true"
        style={{
          width: 72,
          height: 4,
          borderRadius: 'var(--qa-radius-round)',
          background: 'var(--qa-chip)',
          border: 'var(--qa-hairline) solid var(--qa-glass-border)',
          overflow: 'hidden',
          flex: 'none',
        }}
      >
        <span
          style={{
            display: 'block',
            width: `${pct * 100}%`,
            height: '100%',
            background: 'var(--qa-accent)',
            transition: 'width var(--qa-dur) var(--qa-ease)',
          }}
        />
      </span>
      <span style={{ ...statMeta, color: 'var(--qa-ink)', whiteSpace: 'nowrap' }}>{left} ft</span>
    </div>
  );
}
