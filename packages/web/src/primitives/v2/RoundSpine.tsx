/**
 * v2/RoundSpine — THE SIGNATURE. The left edge of the frame is the round,
 * drawn as a timeline.
 *
 * WHAT IT REPLACES AND WHY. The design request asks for a "party rail":
 * one card per party member, portrait and HP. That answers "how is everyone
 * doing" — a real question, but not the one a player actually has. During
 * somebody else's turn the question in the room is *when am I up*, and v1 could
 * not answer it at all: whose turn it is was a single badge with no sense of
 * what came before or after. Turn order is the one genuine sequence on this
 * screen, which is why this is the one place numbering earns its keep.
 *
 * So the panel is initiative order, top to bottom, with a hairline running down
 * it. Segments already spent carry the accent; segments still ahead carry the
 * frame's own border. The acting notch holds the filled dot. When the line
 * reaches YOUR notch, the same accent continues along the top edge of the near
 * edge (see `.qa2-act.is-yours::before` in ScreenStyles) — one accent, one
 * journey per round, arriving at the surface you act from.
 *
 * WHAT ENEMIES GET. Their name, their place in the order, and one word for how
 * hurt they are — Unhurt, Hurt, Bloodied, Down. Never a number and never a bar.
 * An enemy's exact hit points are the DM's to reveal when the DM chooses; a
 * player is owed enough to make a decision and no more. The word is also what
 * the table already says out loud, which is the point.
 *
 * The cast is set in the display serif and the numbers in mono, so the rail
 * reads as a cast list with a running order rather than a table of rows.
 */
import type { ReactElement } from 'react';
import { castName, Eyebrow, Glyph, HP, Micro, prose, statMeta, Tag } from '../../design/index.js';
import type { SpineEntryVM } from './viewModel.js';

export interface RoundSpineProps {
  round: number;
  cast: SpineEntryVM[];
  open: boolean;
  onToggle: () => void;
  /** click a name — the host targets a foe or looks at an ally. */
  onSelect?: (id: string) => void;
  /** the id currently aimed at, so the spine and the map agree. */
  targetId?: string;
}

/** "You're next" beats "you're 4th" — the countdown a player can act on. */
function cueFor(cast: SpineEntryVM[], inCombat: boolean): { line: string; urgent: boolean } {
  if (!inCombat) return { line: 'Nobody is counting turns. Say what you do.', urgent: false };

  const you = cast.find((c) => c.kind === 'you');
  if (you === undefined) return { line: 'Watching this one.', urgent: false };
  if (you.acting) return { line: 'Your turn. Take your time.', urgent: true };

  const actingAt = cast.findIndex((c) => c.acting);
  const youAt = cast.indexOf(you);

  const away = youAt > actingAt ? youAt - actingAt : cast.length - actingAt + youAt;
  if (away === 1) return { line: "You're next.", urgent: true };
  return { line: `${away} turns until yours.`, urgent: false };
}

export function RoundSpine({ round, cast, open, onToggle, onSelect, targetId }: RoundSpineProps): ReactElement {
  // Out of combat there IS no running order, so the rail stops pretending there
  // is one: it becomes a party roster, the initiative column disappears, and
  // the timeline goes quiet. The same surface, told the truth about the moment.
  const inCombat = cast.some((c) => c.acting);
  const cue = cueFor(cast, inCombat);
  // The round NUMBER lives in the top rail; repeating it here at equal weight
  // would leave a player checking two places for one fact. The rail says which
  // round it is, the spine says what the order within it is.
  const heading = inCombat ? 'Turn order' : 'At the table';

  // Collapsed, it becomes a small pill rather than a strip welded to the window
  // edge: a HUD that floats should not grow an edge when it shrinks.
  if (!open) {
    return (
      <button type="button" className="qa2-pill is-spine" onClick={onToggle} aria-expanded={false} aria-label={inCombat ? 'Show the turn order' : 'Show the party'}>
        {cue.urgent && <span className="qa2-pill-dot" />}
        {inCombat ? `Round ${round} · ${cue.line}` : `At the table · ${cue.line}`}
      </button>
    );
  }

  return (
    <aside className="qa2-panel qa2-spine" aria-label={inCombat ? 'Turn order' : 'The party'}>
      <div className="qa2-spine-head">
        <Eyebrow>{heading}</Eyebrow>
        <button type="button" className="qa2-ctl" style={{ width: 24, height: 24 }} onClick={onToggle} aria-label="Hide this" aria-expanded>
          <Glyph name="chevronLeft" size={13} />
        </button>
      </div>

      <ol className="qa2-cast">
        {cast.map((c) => (
          <li key={c.id}>
            <Notch entry={c} onSelect={onSelect} aimed={targetId === c.id} showInitiative={inCombat} />
          </li>
        ))}
      </ol>

      <div className="qa2-cue">
        <Eyebrow>{inCombat ? 'Up next' : 'Right now'}</Eyebrow>
        <p style={{ ...prose, color: cue.urgent ? 'var(--qa-accent)' : 'var(--qa-ink-dim)', margin: 0 }}>{cue.line}</p>
      </div>
    </aside>
  );
}

function Notch({
  entry,
  onSelect,
  aimed,
  showInitiative,
}: {
  entry: SpineEntryVM;
  onSelect?: ((id: string) => void) | undefined;
  aimed: boolean;
  showInitiative: boolean;
}): ReactElement {
  const cls = [
    'qa2-notch',
    entry.acting ? 'is-acting' : '',
    entry.acted && !entry.acting ? 'is-acted' : '',
    entry.kind === 'you' ? 'is-you' : '',
    entry.hurt === 'Down' || entry.status === 'Dying' ? 'is-down' : '',
  ].filter(Boolean).join(' ');

  const label =
    entry.kind === 'foe'
      ? `${entry.name}, initiative ${entry.initiative}, ${entry.hurt ?? 'unhurt'}`
      : `${entry.name}, initiative ${entry.initiative}${entry.hp ? `, ${entry.hp.current} of ${entry.hp.max} hit points` : ''}`;

  return (
    <button
      type="button"
      className={cls}
      onClick={onSelect ? () => onSelect(entry.id) : undefined}
      aria-label={label}
      aria-current={entry.acting ? 'step' : undefined}
      style={onSelect !== undefined ? { cursor: 'pointer' } : undefined}
    >
      <span className="qa2-dot" aria-hidden="true" />

      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--qa-s2)', minWidth: 0 }}>
          {showInitiative && <Micro style={{ flex: 'none', width: 18 }}>{String(entry.initiative).padStart(2, '0')}</Micro>}
          <span style={{ ...castName, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>
          {entry.kind === 'you' && <Micro style={{ flex: 'none', color: 'var(--qa-accent)' }}>YOU</Micro>}
          {aimed && entry.kind === 'foe' && <Micro style={{ flex: 'none', color: 'var(--qa-accent)' }}>AIMED</Micro>}
        </span>

        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s2)', paddingLeft: showInitiative ? 26 : 0, minWidth: 0 }}>
          {entry.role !== undefined && (
            <span style={{ ...statMeta, flex: 'none', fontSize: 'var(--qa-text-whisper)' }}>{entry.role}</span>
          )}

          {/* Allies show the number. Enemies show the word — see the header. */}
          {entry.hp !== undefined ? (
            <span style={{ flex: 1, minWidth: 40 }}>
              <HP
                current={entry.hp.current}
                max={entry.hp.max}
                bloodied={entry.hp.current > 0 && entry.hp.current <= Math.floor(entry.hp.max / 2)}
              />
            </span>
          ) : entry.hurt !== undefined ? (
            <Tag tone={entry.hurt === 'Bloodied' || entry.hurt === 'Down' ? 'danger' : 'neutral'}>{entry.hurt}</Tag>
          ) : null}

          {entry.status !== undefined && <Tag tone="danger">{entry.status}</Tag>}
        </span>
      </span>
    </button>
  );
}
