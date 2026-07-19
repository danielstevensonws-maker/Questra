/**
 * ActionBar — the player's legal-action surface (Brief 10 §2). Rows for Action /
 * Bonus / Reaction; each tile is an AttackCard-or-feature with its rider/resource
 * tags. The greying is THE shared legality function's output: an illegal tile is
 * dimmed and its tooltip is the exact server reject string (§1, §5 #3) — the
 * ActionTileVM carries `greyReason` straight from engine `greyingReason`.
 *
 * Presentational: it takes the tile view-models + callbacks. No local legality,
 * no local game state — greying is decided upstream by the same function the
 * server uses, so client and server can never disagree.
 */
import type { ReactElement } from 'react';
import { Chip } from '@questra/ui';
import type { ActionTileVM } from './sheetToPlayerHub.js';

export interface ActionBarProps {
  tiles: ActionTileVM[];
  /** invoke a legal tile (declare the intent). Greyed tiles don't fire. */
  onUse: (tileId: string) => void;
  /** tap-"?" on a tile ⇒ open its InfoPanel (attack derivation, feature text). */
  onExplain?: (tileId: string) => void;
}

const ROWS: { economy: ActionTileVM['economy']; label: string }[] = [
  { economy: 'action', label: 'Action' },
  { economy: 'bonus', label: 'Bonus Action' },
  { economy: 'reaction', label: 'Reaction' },
];

function Tile({ tile, onUse, onExplain }: { tile: ActionTileVM; onUse: (id: string) => void; onExplain?: (id: string) => void }): ReactElement {
  const greyed = tile.greyReason !== null;
  return (
    <div
      className="flex min-w-[132px] flex-col gap-1 rounded-md px-3 py-2"
      style={{
        background: 'var(--q-surface-raised)',
        border: '1px solid var(--q-line)',
        opacity: greyed ? 0.5 : 1,
        transition: 'opacity var(--q-dur-fast) var(--q-ease)',
      }}
      // the greying tooltip IS the server reject string (§1)
      title={tile.greyReason ?? undefined}
      aria-disabled={greyed}
    >
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          disabled={greyed}
          onClick={() => onUse(tile.id)}
          className="text-left text-sm font-medium text-ink"
        >
          {tile.name}
        </button>
        {onExplain && (
          <button type="button" onClick={() => onExplain(tile.id)} className="text-xs text-ink-faint" aria-label={`${tile.name} — explain`}>
            ?
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1">
        {tile.toHit !== undefined && <span className="font-mono text-xs text-ink-soft">{tile.toHit >= 0 ? `+${tile.toHit}` : tile.toHit} to hit</span>}
        {tile.damage && <Chip tone="steel">{tile.damage} {tile.damageType}</Chip>}
        {tile.resourceTag && <Chip tone="gold">{tile.resourceTag}</Chip>}
      </div>
    </div>
  );
}

export function ActionBar({ tiles, onUse, onExplain }: ActionBarProps): ReactElement {
  return (
    <div className="flex flex-col gap-3 px-4 py-3" aria-label="Actions">
      {ROWS.map((row) => {
        const rowTiles = tiles.filter((t) => t.economy === row.economy);
        if (rowTiles.length === 0) return null;
        return (
          <div key={row.economy} className="flex flex-col gap-1.5">
            <span className="text-xs tracking-wide text-ink-faint uppercase">{row.label}</span>
            <div className="flex flex-wrap gap-2">
              {rowTiles.map((t) => (
                <Tile key={t.id} tile={t} onUse={onUse} {...(onExplain ? { onExplain } : {})} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
