/**
 * design/parts — the repeats every surface is assembled from.
 *
 * These exist so that "every number is tappable" (design request §5) is a thing
 * the app DOES rather than a thing each surface remembers to do. A readout
 * built with `ExplainValue` cannot ship without its derivation, because the
 * derivation is the prop that makes it render — the promise is enforced by the
 * type, not by reviewer diligence.
 *
 * They are in the shared layer because the authoring surfaces need them just as
 * much as the play screen does: a wizard step showing a computed ability
 * modifier, a planner row showing a session count, and a combatant's Armor
 * Class are the same readout wearing different data.
 */
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { Glyph, type GlyphName } from './glyphs.js';
import { eyebrow, micro, statMeta, statValue } from './type.js';
import type { ExplainVM } from './explain.js';

/** A small caps heading. Faint by contract — it never competes with what it names. */
export function Eyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }): ReactElement {
  return <span style={{ ...eyebrow, ...style }}>{children}</span>;
}

/**
 * A label-over-value readout whose LABEL carries the dotted underline — the
 * affordance that says "there is more behind this word". The whole thing is one
 * button, so the tap target is the readout rather than a 12px glyph beside it.
 */
export function ExplainValue({
  label,
  explain,
  onExplain,
  value,
  tone,
  row = false,
}: {
  label: string;
  explain: ExplainVM;
  onExplain?: (e: ExplainVM) => void;
  /** override the displayed value; defaults to the explain's own. */
  value?: string;
  tone?: 'gold' | 'danger' | 'accent';
  /** lay the label and value side by side instead of stacked. */
  row?: boolean;
}): ReactElement {
  const colour =
    tone === 'gold' ? 'var(--qa-gold)'
    : tone === 'danger' ? 'var(--qa-danger)'
    : tone === 'accent' ? 'var(--qa-accent)'
    : 'var(--qa-ink)';
  return (
    <button
      type="button"
      className={row ? 'qa2-explain is-row' : 'qa2-explain'}
      onClick={onExplain ? () => onExplain(explain) : undefined}
      aria-label={`${label} ${value ?? explain.value} — show how this number is worked out`}
    >
      <span className="qa2-explain-label" style={eyebrow}>{label}</span>
      <span style={{ ...statValue, color: colour }}>{value ?? explain.value}</span>
    </button>
  );
}

/** The same affordance at rail scale — a mono line, not a stacked readout. */
export function ExplainLine({
  label,
  explain,
  onExplain,
}: {
  label: string;
  explain: ExplainVM;
  onExplain?: (e: ExplainVM) => void;
}): ReactElement {
  return (
    <button
      type="button"
      className="qa2-explain is-row"
      style={{ width: '100%', justifyContent: 'space-between' }}
      onClick={onExplain ? () => onExplain(explain) : undefined}
      aria-label={`${label} ${explain.value} — show how this number is worked out`}
    >
      <span className="qa2-explain-label" style={statMeta}>{label}</span>
      <span style={{ ...statMeta, color: 'var(--qa-ink)' }}>{explain.value}</span>
    </button>
  );
}

export type ChipTone = 'neutral' | 'danger' | 'accent';

/** A tappable tag — a condition, a target, a state worth naming. */
export function Tag({
  children,
  tone = 'neutral',
  selected,
  onClick,
  title,
}: {
  children: ReactNode;
  tone?: ChipTone;
  /**
   * Present ⇒ this tag is one of a set you choose between, and it renders
   * `aria-pressed` either way so the unchosen ones can sit back visually.
   * Absent ⇒ it is a label (a condition, a hurt word), not a choice.
   */
  selected?: boolean | undefined;
  /** absent ⇒ the tag renders as a <span>, so it can live inside other buttons. */
  onClick?: (() => void) | undefined;
  title?: string;
}): ReactElement {
  const cls = [
    'qa2-chip',
    tone === 'danger' ? 'is-danger' : tone === 'accent' ? 'is-accent' : '',
    selected === true ? 'is-selected' : '',
    onClick === undefined ? 'is-static' : '',
  ].filter(Boolean).join(' ');
  // A tag with nothing to do is a <span>: these render inside other buttons
  // (the spine's notches), and a button inside a button is invalid markup that
  // swallows the outer control's clicks.
  if (onClick === undefined) {
    return <span className={cls} title={title}>{children}</span>;
  }
  return (
    <button type="button" className={cls} onClick={onClick} title={title} aria-pressed={selected}>
      {children}
    </button>
  );
}

/** A 36px glass square in the top rail. */
export function Ctl({
  glyph,
  label,
  on = false,
  onClick,
}: {
  glyph: GlyphName;
  label: string;
  on?: boolean;
  onClick?: () => void;
}): ReactElement {
  return (
    <button type="button" className={on ? 'qa2-ctl is-on' : 'qa2-ctl'} onClick={onClick} aria-label={label} title={label} aria-pressed={on}>
      <Glyph name={glyph} />
    </button>
  );
}

/**
 * The hit-point bar. Temporary hit points render as a hatched overlay ON the
 * bar rather than as a separate "+N temporary" line, because they ARE hit
 * points — a player reading their health should not have to add two numbers.
 */
export function HP({
  current,
  max,
  temp = 0,
  bloodied = false,
  showText = true,
}: {
  current: number;
  max: number;
  temp?: number;
  bloodied?: boolean;
  showText?: boolean;
}): ReactElement {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const tempPct = max > 0 ? Math.max(0, Math.min(1 - pct, temp / max)) : 0;
  // Spans throughout: this renders inside the spine's notch buttons, which may
  // only contain phrasing content.
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s2)' }}>
      <span
        className="qa2-hpwrap"
        style={{ flex: 1, display: 'block' }}
        role="img"
        aria-label={`${current} of ${max} hit points${temp > 0 ? `, plus ${temp} temporary` : ''}`}
      >
        <span className={bloodied ? 'qa2-hpfill is-bloodied' : 'qa2-hpfill'} style={{ width: `${pct * 100}%` }} />
        {tempPct > 0 && <span className="qa2-hptemp" style={{ left: `${pct * 100}%`, width: `${tempPct * 100}%` }} />}
      </span>
      {showText && (
        <span style={{ ...statMeta, color: bloodied ? 'var(--qa-danger)' : 'var(--qa-ink-dim)' }}>
          {current}/{max}{temp > 0 ? ` +${temp}` : ''}
        </span>
      )}
    </span>
  );
}

/** A thin bar for a quantity that is not health — movement left, most often. */
export function Meter({ value, max, label }: { value: number; max: number; label: string }): ReactElement {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <span className="qa2-meter" style={{ display: 'block' }} role="img" aria-label={label}>
      <span style={{ width: `${pct * 100}%` }} />
    </span>
  );
}

/** The smallest data on the screen — an initiative number, an HP fraction. */
export function Micro({ children, style }: { children: ReactNode; style?: CSSProperties }): ReactElement {
  return <span style={{ ...micro, ...style }}>{children}</span>;
}
