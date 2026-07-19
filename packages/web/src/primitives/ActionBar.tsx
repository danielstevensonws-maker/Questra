/**
 * ActionBar — the player's legal-action surface (Brief 10 §2). Rows for Action /
 * Bonus / Reaction; each tile is an attack-or-feature with its rider/resource
 * tags. The greying is THE shared legality function's output: an illegal tile is
 * dimmed and carries the exact server reject string (§1, §5 #3) — the
 * ActionTileVM carries `greyReason` straight from engine `greyingReason`.
 *
 * Presentational: it takes the tile view-models + callbacks. No local legality,
 * no local game state — greying is decided upstream by the same function the
 * server uses, so client and server can never disagree.
 *
 * Design: the Questra V1 Prototype sheet, §ActionBar. Tiles are flex-1 glass
 * chips, two to a row; a greyed tile prints the reject sentence in place of its
 * rider so the reason is readable, not just hoverable. Hover warms the fill,
 * focus wears the one ring.
 */
import { useState, type CSSProperties, type ReactElement } from 'react';
import type { ActionTileVM } from './sheetToPlayerHub.js';

export interface ActionBarProps {
  tiles: ActionTileVM[];
  /** invoke a legal tile (declare the intent). Greyed tiles don't fire. */
  onUse: (tileId: string) => void;
  /** tap-"?" on a tile ⇒ open its InfoPanel (attack derivation, feature text). */
  onExplain?: (tileId: string) => void;
}

const ROWS: { economy: ActionTileVM['economy']; label: string }[] = [
  { economy: 'action', label: 'ACTION' },
  { economy: 'bonus', label: 'BONUS ACTION' },
  { economy: 'reaction', label: 'REACTION' },
];

const rowLabel: CSSProperties = {
  fontFamily: 'var(--qa-font-mono)',
  fontSize: 8.5,
  letterSpacing: 'var(--qa-track-label)',
  color: 'var(--qa-glass-dim)',
};

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
  // A reaction that stays live off-turn is the one tile that reads ember.
  const live = !greyed && tile.economy === 'reaction';

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
      title={tile.greyReason ?? undefined}
      aria-disabled={greyed}
      style={{
        flex: 1,
        minWidth: 0,
        padding: '9px 10px',
        borderRadius: 'var(--qa-radius)',
        background: hover && !greyed ? 'var(--qa-glass-hover)' : 'var(--qa-glass-chip)',
        border: live
          ? '1px solid color-mix(in srgb, var(--qa-ember) 45%, transparent)'
          : hover && !greyed
            ? '1px solid var(--qa-hairline)'
            : '1px solid var(--qa-glass-border)',
        color: greyed ? 'var(--qa-glass-dim)' : 'var(--qa-glass-text)',
        fontFamily: 'var(--qa-font-body)',
        textAlign: 'left',
        cursor: greyed ? 'not-allowed' : 'pointer',
        opacity: greyed ? 0.5 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        ...(focused ? { boxShadow: 'var(--qa-focus-ring)' } : {}),
        transition:
          'background var(--qa-dur-fast) var(--qa-ease), border-color var(--qa-dur-fast) var(--qa-ease), opacity var(--qa-dur-fast) var(--qa-ease)',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600 }}>{tile.name}</span>
        {onExplain && !greyed && (
          <span
            role="button"
            tabIndex={-1}
            aria-label={`${tile.name} — explain`}
            onClick={(e) => {
              e.stopPropagation();
              onExplain(tile.id);
            }}
            style={{
              fontFamily: 'var(--qa-font-mono)',
              fontSize: 10,
              color: 'var(--qa-glass-dim)',
              cursor: 'pointer',
            }}
          >
            ?
          </span>
        )}
      </span>

      {greyed ? (
        // The reject sentence reads in place — a tooltip alone is not an answer.
        <span style={{ fontSize: 10, fontStyle: 'italic' }}>{tile.greyReason}</span>
      ) : (
        <>
          {tile.toHit !== undefined && (
            <span style={{ fontFamily: 'var(--qa-font-mono)', fontSize: 9, color: 'var(--qa-glass-dim)' }}>
              {tile.toHit >= 0 ? `+${tile.toHit}` : tile.toHit} to hit
            </span>
          )}
          {(tile.damage || tile.resourceTag) && (
            <span
              style={{
                fontFamily: 'var(--qa-font-mono)',
                fontSize: 8.5,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: tile.resourceTag ? 'var(--qa-gold)' : 'var(--qa-vellum-dim)',
                background: 'var(--qa-vellum-ghost)',
                borderRadius: 'var(--qa-radius-xs)',
                padding: '2px 6px',
                alignSelf: 'flex-start',
              }}
            >
              {tile.resourceTag ?? `${tile.damage} ${tile.damageType ?? ''}`.trim()}
            </span>
          )}
        </>
      )}
    </button>
  );
}

export function ActionBar({ tiles, onUse, onExplain }: ActionBarProps): ReactElement {
  return (
    <div aria-label="Actions" style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {ROWS.map((row) => {
        const rowTiles = tiles.filter((t) => t.economy === row.economy);
        if (rowTiles.length === 0) return null;
        return (
          <div key={row.economy} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <span style={rowLabel}>{row.label}</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {rowTiles.map((t) => (
                <Tile key={t.id} tile={t} onUse={onUse} {...(onExplain ? { onExplain } : {})} />
              ))}
              {/* a lone tile takes half the row, not the whole width */}
              {rowTiles.length === 1 && <div style={{ flex: 1 }} aria-hidden />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
