/**
 * ActionBar — the player's legal-action surface (Brief 10 §2). Three economy
 * rows (Action / Bonus / Reaction), each with a spent-dot; tiles are the
 * attacks-or-features with their rider/resource chips. Greying is THE shared
 * legality function's output: an illegal tile is dimmed and carries the exact
 * server reject string (§1, §5 #3) — the ActionTileVM carries `greyReason`
 * straight from engine `greyingReason`.
 *
 * Presentational: it takes the tile view-models + callbacks. No local legality,
 * no local game state — greying is decided upstream by the same function the
 * server uses, so client and server can never disagree.
 *
 * Design: the "Questra - Player View" prototype (the ADR-0014 look authority),
 * which wins over the component spec sheet where they differ. From it:
 *   - EVERY economy row renders, always — including Reaction, whose tiles are
 *     typically gated (Uncanny Dodge: "the table will prompt you"). An empty
 *     row is information: it tells the player that economy still exists.
 *   - each row label is `[dot] LABEL` at a fixed width; the dot is filled and
 *     glowing while the economy is available, hollow once it's spent.
 *   - tiles are flex-1, lift on hover, and print the reject sentence in place
 *     of their chips when greyed.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';
import type { ActionTileVM } from './sheetToPlayerHub.js';

export type Economy = 'action' | 'bonus' | 'reaction';

export interface ActionBarProps {
  tiles: ActionTileVM[];
  /** invoke a legal tile (declare the intent). Greyed tiles don't fire. */
  onUse: (tileId: string) => void;
  /** tap-"?" on a tile ⇒ open its InfoPanel (attack derivation, feature text). */
  onExplain?: (tileId: string) => void;
  /**
   * Which economies are already spent this turn — drives the row dot (hollow
   * when spent). Server truth, folded upstream; omitted ⇒ all available.
   */
  spent?: Partial<Record<Economy, boolean>>;
}

const ROWS: { economy: Economy; label: string }[] = [
  { economy: 'action', label: 'ACTION' },
  { economy: 'bonus', label: 'BONUS' },
  { economy: 'reaction', label: 'REACTION' },
];

const rowLabelStyle: CSSProperties = {
  width: 90,
  flex: 'none',
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
};

function RowDot({ spent }: { spent: boolean }): ReactElement {
  return (
    <span
      aria-hidden
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        flex: 'none',
        background: spent ? 'transparent' : 'var(--qa-vellum)',
        border: spent
          ? '1.5px solid var(--qa-vellum-dim)'
          : '1.5px solid var(--qa-vellum)',
        boxShadow: spent ? 'none' : '0 0 8px color-mix(in srgb, var(--qa-vellum) 60%, transparent)',
      }}
    />
  );
}

function Tile({
  tile,
  onUse,
  onExplain,
}: {
  tile: ActionTileVM;
  onUse: (id: string) => void;
  onExplain?: (id: string) => void;
}): ReactElement {
  const [hover, setHover] = useState(false);
  const [focused, setFocused] = useState(false);
  const greyed = tile.greyReason !== null;
  const chips: string[] = [];
  if (tile.toHit !== undefined) chips.push(tile.toHit >= 0 ? `+${tile.toHit}` : `${tile.toHit}`);
  if (tile.damage) chips.push(`${tile.damage} ${tile.damageType ?? ''}`.trim());
  if (tile.resourceTag) chips.push(tile.resourceTag);

  return (
    <button
      type="button"
      disabled={greyed}
      onClick={() => onUse(tile.id)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      // the greying tooltip IS the server reject string (§1)
      title={tile.greyReason ?? `Declare: ${tile.name}`}
      aria-disabled={greyed}
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 56,
        boxSizing: 'border-box',
        borderRadius: 'var(--qa-radius)',
        padding: '8px 9px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 5,
        textAlign: 'left',
        background: hover && !greyed ? 'var(--qa-glass-hover)' : 'var(--qa-glass-chip)',
        border: `1px solid ${hover && !greyed ? 'color-mix(in srgb, var(--qa-ember) 60%, transparent)' : 'var(--qa-glass-border)'}`,
        color: greyed ? 'var(--qa-glass-dim)' : 'var(--qa-glass-text)',
        fontFamily: 'var(--qa-font-body)',
        opacity: greyed ? 0.5 : 1,
        cursor: greyed ? 'not-allowed' : 'pointer',
        transform: hover && !greyed ? 'translateY(-2px)' : 'none',
        ...(focused ? { boxShadow: 'var(--qa-focus-ring)' } : {}),
        transition: 'all var(--qa-dur-fast) var(--qa-ease)',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4, width: '100%' }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.1 }}>{tile.name}</span>
        {onExplain && (
          <span
            role="button"
            tabIndex={-1}
            aria-label={`${tile.name} — explain`}
            title="What is this?"
            onClick={(e) => {
              e.stopPropagation();
              onExplain(tile.id);
            }}
            style={{
              width: 15,
              height: 15,
              flex: 'none',
              borderRadius: '50%',
              border: '1px solid var(--qa-hairline)',
              color: 'var(--qa-glass-dim)',
              fontSize: 9,
              fontFamily: 'var(--qa-font-mono)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            ?
          </span>
        )}
      </span>

      {greyed ? (
        // the reject sentence reads in place — a tooltip alone is not an answer
        <span style={{ fontSize: 10, fontStyle: 'italic' }}>{tile.greyReason}</span>
      ) : (
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center', width: '100%' }}>
          {chips.map((c, i) => (
            <span
              key={i}
              style={{
                fontFamily: 'var(--qa-font-mono)',
                fontSize: 8.5,
                letterSpacing: 0.4,
                padding: '2px 6px',
                borderRadius: 'var(--qa-radius-xs)',
                background: 'var(--qa-vellum-ghost)',
                color: tile.resourceTag && i === chips.length - 1 ? 'var(--qa-gold)' : 'var(--qa-vellum-dim)',
                whiteSpace: 'nowrap',
              }}
            >
              {c}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

export function ActionBar({ tiles, onUse, onExplain, spent = {} }: ActionBarProps): ReactElement {
  return (
    <div aria-label="Actions" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {ROWS.map((row) => {
        const rowTiles = tiles.filter((t) => t.economy === row.economy);
        const used = spent[row.economy] ?? false;
        return (
          <div key={row.economy} style={{ display: 'flex', alignItems: 'stretch', gap: 8 }}>
            <span
              style={{
                ...rowLabelStyle,
                color: used ? 'var(--qa-vellum-faint)' : 'var(--qa-vellum-dim)',
              }}
            >
              <RowDot spent={used} />
              <span style={{ fontFamily: 'var(--qa-font-mono)', fontSize: 9, letterSpacing: 1.2 }}>
                {row.label}
              </span>
            </span>
            <div style={{ display: 'flex', gap: 6, flex: 1 }}>
              {rowTiles.length > 0 ? (
                rowTiles.map((t) => (
                  <Tile key={t.id} tile={t} onUse={onUse} {...(onExplain ? { onExplain } : {})} />
                ))
              ) : (
                // an empty economy still shows — it tells the player it exists
                <span
                  style={{
                    flex: 1,
                    minHeight: 56,
                    borderRadius: 'var(--qa-radius)',
                    border: '1px dashed var(--qa-hairline)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 12px',
                    fontSize: 10,
                    fontStyle: 'italic',
                    color: 'var(--qa-vellum-faint)',
                  }}
                >
                  Nothing here this turn.
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
