/**
 * ActionBar — the player's legal-action surface (Brief 10 §2). Each tile is
 * an attack-or-feature with its rider/resource tags. The greying is THE
 * shared legality function's output: an illegal tile is dimmed and its
 * reason is the exact server reject string (§1, §5 #3) — the ActionTileVM
 * carries `greyReason` straight from engine `greyingReason`.
 *
 * Presentational: it takes the tile view-models + callbacks. No local
 * legality, no local game state — greying is decided upstream by the same
 * function the server uses, so client and server can never disagree.
 *
 * Design reference: a hotbar-style icon tile per the user's Baldur's Gate 3
 * reference ("Referrence images/Action Bar.PNG"), kept to Questra's own
 * glass/mono visual language rather than BG3's ornate gem-frame chrome.
 *   - No real ability-icon art exists yet (no asset pipeline). Each tile
 *     shows a category glyph instead — attacks (anything with `damage`) get
 *     a crossed-blades mark, everything else gets a spark. Swap for real art
 *     per-ability later with no layout change.
 *   - Each row pads to a minimum slot count with empty, dashed placeholder
 *     sockets (tap ⇒ `onEquip`). These are intentional progression slots,
 *     not filler — a player reads them as "here's where a new ability goes"
 *     as they level up, so they stay full-width rather than shrinking away.
 *   - Two labelled rows, not three: Action on its own (usually the busiest
 *     economy), Bonus and Reaction sharing a second row split by a hairline,
 *     since both are sparse enough (1-2 real tiles) that neither needs a
 *     full-width row.
 *
 * THE DETAIL STRIP (2026-08). To-hit and damage are off the tile face — BG3
 * keeps its hotbar clean and reveals detail on demand — but "on demand" here
 * is a RESERVED strip under the rows, not an expanding tile. An expanding
 * tile reflows its whole row, so sweeping the mouse across six sockets makes
 * the bar jitter; a fixed-height strip never moves. It also gives greying
 * somewhere honest to live: the reason used to replace the tile's NAME and
 * wrap to three ragged lines, which is what made the greyed row look broken.
 * Now the tile always keeps its name and the strip carries the explanation.
 *
 * The strip is never empty — with nothing hovered it falls back to the first
 * legal tile, so a player who has not touched anything still sees what their
 * main attack does. CLAUDE.md law 5: teach by doing, not by explaining.
 */
import { useState, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { itemName, prose, sectionLabel, statMeta } from './hudType.js';
import type { ActionTileVM } from './sheetToPlayerHub.js';

export interface ActionBarProps {
  tiles: ActionTileVM[];
  /** invoke a legal tile (declare the intent). Greyed tiles don't fire. */
  onUse: (tileId: string) => void;
  /** tap-"?" on a tile ⇒ open its InfoPanel (attack derivation, feature text, to-hit/damage). */
  onExplain?: (tileId: string) => void;
  /** tap an empty placeholder socket ⇒ open equip/pick-an-ability for that row. */
  onEquip?: (economy: ActionTileVM['economy']) => void;
}

const ACTION_ROW = { economy: 'action' as const, label: 'Action', minSlots: 6 };
/** Bonus and Reaction share one row — both are sparse enough that neither needs Action's full width. */
const BONUS_ROW = { economy: 'bonus' as const, label: 'Bonus', minSlots: 3 };
const REACTION_ROW = { economy: 'reaction' as const, label: 'Reaction', minSlots: 2 };

/** Two categories, both backed by real ActionTileVM data — no melee/ranged/spell split the sheet can't back up. */
function glyphFor(tile: ActionTileVM): string {
  return tile.damage !== undefined ? '⚔' : '✦';
}

const TILE_SIZE = 56;
const TILE_GAP = 12;
/** The slot column is wider than the tile itself so a name like "Longsword" fits
 *  under a 56px icon without truncating — the icon stays 56, the label gets 68. */
const SLOT_WIDTH = 68;
/** Two lines at label size, reserved so every row's tiles stay on one baseline. */
const LABEL_HEIGHT = 28;

function Tile({
  tile,
  onUse,
  onExplain,
  onPeek,
}: {
  tile: ActionTileVM;
  onUse: (id: string) => void;
  onExplain?: (id: string) => void;
  /** report hover/focus so the detail strip can describe this tile. */
  onPeek: (id: string | null) => void;
}): ReactElement {
  const [hover, setHover] = useState(false);
  const greyed = tile.greyReason !== null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--qa-s1)', width: SLOT_WIDTH }}>
      <div
        onMouseEnter={() => {
          setHover(true);
          onPeek(tile.id);
        }}
        onMouseLeave={() => {
          setHover(false);
          onPeek(null);
        }}
        style={{ position: 'relative', width: TILE_SIZE, height: TILE_SIZE, flex: 'none' }}
        title={tile.greyReason ?? undefined}
      >
        <button
          type="button"
          disabled={greyed}
          onClick={() => onUse(tile.id)}
          onFocus={() => onPeek(tile.id)}
          onBlur={() => onPeek(null)}
          aria-label={tile.name}
          aria-disabled={greyed}
          style={{
            width: '100%',
            height: '100%',
            display: 'grid',
            placeItems: 'center',
            borderRadius: 'var(--qa-radius)',
            background: hover && !greyed ? 'var(--qa-glass-solid)' : 'var(--qa-chip)',
            border: `var(--qa-hairline) solid ${hover && !greyed ? 'var(--qa-accent-line)' : 'var(--qa-glass-border)'}`,
            color: greyed ? 'var(--qa-ink-faint)' : 'var(--qa-ink)',
            fontSize: 'var(--qa-text-lg)',
            opacity: greyed ? 0.5 : 1,
            cursor: greyed ? 'not-allowed' : 'pointer',
            transition: 'all var(--qa-dur-fast) var(--qa-ease)',
          }}
        >
          {glyphFor(tile)}
        </button>

        {tile.resourceTag !== undefined && (
          <span
            aria-hidden="true"
            style={{
              ...statMeta,
              position: 'absolute',
              bottom: -6,
              right: -6,
              padding: '0 4px',
              borderRadius: 'var(--qa-radius-round)',
              background: 'var(--qa-glass-solid)',
              border: 'var(--qa-hairline) solid var(--qa-glass-border)',
              color: 'var(--qa-gold)',
              whiteSpace: 'nowrap',
            }}
          >
            {tile.resourceTag}
          </span>
        )}

        {onExplain !== undefined && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExplain(tile.id);
            }}
            aria-label={`${tile.name} — explain`}
            style={{
              ...statMeta,
              position: 'absolute',
              top: -6,
              left: -6,
              width: 16,
              height: 16,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 'var(--qa-radius-round)',
              border: 'var(--qa-hairline) solid var(--qa-glass-border)',
              background: 'var(--qa-glass-solid)',
              color: 'var(--qa-ink-faint)',
              cursor: 'pointer',
            }}
          >
            ?
          </button>
        )}
      </div>

      {/* the name stays put whether or not the tile is legal — the reason for
          greying belongs in the detail strip, not wrapped under the icon. */}
      <span
        style={{
          ...itemName,
          color: greyed ? 'var(--qa-ink-faint)' : 'var(--qa-ink-dim)',
          textAlign: 'center',
          width: '100%',
          height: LABEL_HEIGHT,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {tile.name}
      </span>
    </div>
  );
}

/** An empty equip socket — dashed, quiet, and clickable so the row never reads as broken. */
function PlaceholderTile({ economy, onEquip }: { economy: ActionTileVM['economy']; onEquip?: (() => void) | undefined }): ReactElement {
  const [hover, setHover] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--qa-s1)', width: SLOT_WIDTH }}>
      <button
        type="button"
        onClick={onEquip}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        aria-label={`Empty ${economy} slot — equip an ability`}
        style={{
          width: TILE_SIZE,
          height: TILE_SIZE,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 'var(--qa-radius)',
          background: hover ? 'var(--qa-chip)' : 'transparent',
          border: `var(--qa-hairline) dashed ${hover ? 'var(--qa-accent-line)' : 'var(--qa-glass-border)'}`,
          color: hover ? 'var(--qa-ink-dim)' : 'var(--qa-ink-faint)',
          fontSize: 'var(--qa-text-body)',
          cursor: onEquip ? 'pointer' : 'default',
          transition: 'all var(--qa-dur-fast) var(--qa-ease)',
        }}
      >
        +
      </button>
      <span style={{ ...itemName, color: 'var(--qa-ink-faint)', textAlign: 'center', height: LABEL_HEIGHT }}>Empty</span>
    </div>
  );
}

const rowLabelStyle: CSSProperties = {
  width: 60,
  flex: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--qa-s2)',
  paddingTop: 6,
  alignSelf: 'flex-start',
};

function RowLabel({ children }: { children: ReactNode }): ReactElement {
  return (
    <span style={rowLabelStyle}>
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: 'var(--qa-radius-round)',
          background: 'var(--qa-accent)',
          boxShadow: '0 0 6px var(--qa-accent-glow)',
          flex: 'none',
        }}
      />
      <span style={sectionLabel}>{children}</span>
    </span>
  );
}

/** One economy's label + tiles + pad-out placeholders. */
function EconomySlots({
  row,
  tiles,
  onUse,
  onExplain,
  onEquip,
  onPeek,
  grow = true,
}: {
  row: { economy: ActionTileVM['economy']; label: string; minSlots: number };
  tiles: ActionTileVM[];
  onUse: (id: string) => void;
  onExplain?: (id: string) => void;
  onEquip?: (economy: ActionTileVM['economy']) => void;
  onPeek: (id: string | null) => void;
  /** false ⇒ never grows past its own slots (Reaction, a small fixed block beside Bonus). */
  grow?: boolean;
}): ReactElement {
  const rowTiles = tiles.filter((t) => t.economy === row.economy);
  const padCount = Math.max(0, row.minSlots - rowTiles.length);
  const slotCount = rowTiles.length + padCount;
  // reserve width for this economy's own slots before wrapping — otherwise a
  // narrower sibling steals space and these tiles wrap to an orphaned line.
  const tilesMinWidth = slotCount * SLOT_WIDTH + Math.max(0, slotCount - 1) * TILE_GAP;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--qa-s3)', flex: grow ? 1 : 'none', minWidth: 0 }}>
      <RowLabel>{row.label}</RowLabel>
      <div style={{ display: 'flex', gap: 'var(--qa-s3)', flexWrap: 'wrap', minWidth: tilesMinWidth }}>
        {rowTiles.map((t) => (
          <Tile key={t.id} tile={t} onUse={onUse} onPeek={onPeek} {...(onExplain !== undefined ? { onExplain } : {})} />
        ))}
        {Array.from({ length: padCount }, (_, i) => (
          <PlaceholderTile key={`empty-${row.economy}-${i}`} economy={row.economy} onEquip={onEquip ? () => onEquip(row.economy) : undefined} />
        ))}
      </div>
    </div>
  );
}

/**
 * The reserved readout. Fixed height so nothing above it ever moves, and it
 * shows the greying reason in plain English rather than hiding it in a
 * tooltip — the interface teaches the rules by explaining every refusal.
 */
function DetailStrip({ tile }: { tile: ActionTileVM | undefined }): ReactElement {
  return (
    <div
      aria-live="polite"
      style={{
        height: 22,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--qa-s3)',
        paddingTop: 'var(--qa-s2)',
        borderTop: 'var(--qa-hairline) solid var(--qa-glass-border)',
        overflow: 'hidden',
      }}
    >
      {tile === undefined ? (
        <span style={{ ...prose, fontStyle: 'italic', color: 'var(--qa-ink-faint)' }}>Point at an ability to see what it does.</span>
      ) : tile.greyReason !== null ? (
        <>
          <span style={{ ...itemName, color: 'var(--qa-ink-faint)' }}>{tile.name}</span>
          <span style={{ ...prose, fontStyle: 'italic', color: 'var(--qa-ink-faint)' }}>{tile.greyReason}</span>
        </>
      ) : (
        <>
          <span style={{ ...itemName, color: 'var(--qa-ink)' }}>{tile.name}</span>
          {tile.toHit !== undefined && (
            <span style={statMeta}>
              {tile.toHit >= 0 ? '+' : ''}
              {tile.toHit} to hit
            </span>
          )}
          {tile.damage !== undefined && (
            <span style={statMeta}>
              {tile.damage}
              {tile.damageType !== undefined ? ` ${tile.damageType}` : ''}
            </span>
          )}
          {tile.resourceTag !== undefined && <span style={{ ...statMeta, color: 'var(--qa-gold)' }}>{tile.resourceTag}</span>}
        </>
      )}
    </div>
  );
}

export function ActionBar({ tiles, onUse, onExplain, onEquip }: ActionBarProps): ReactElement {
  const [peekedId, setPeekedId] = useState<string | null>(null);
  // never empty: fall back to the first legal tile so the strip always teaches.
  const peeked = tiles.find((t) => t.id === peekedId) ?? tiles.find((t) => t.greyReason === null) ?? tiles[0];

  return (
    <div aria-label="Actions" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s3)' }}>
      <EconomySlots
        row={ACTION_ROW}
        tiles={tiles}
        onUse={onUse}
        onPeek={setPeekedId}
        {...(onExplain !== undefined ? { onExplain } : {})}
        {...(onEquip !== undefined ? { onEquip } : {})}
      />

      <div style={{ display: 'flex', alignItems: 'stretch', gap: 'var(--qa-s4)' }}>
        <EconomySlots
          row={BONUS_ROW}
          tiles={tiles}
          onUse={onUse}
          onPeek={setPeekedId}
          {...(onExplain !== undefined ? { onExplain } : {})}
          {...(onEquip !== undefined ? { onEquip } : {})}
        />
        <span aria-hidden="true" style={{ width: 'var(--qa-hairline)', background: 'var(--qa-glass-border)', flex: 'none' }} />
        <EconomySlots
          row={REACTION_ROW}
          tiles={tiles}
          onUse={onUse}
          onPeek={setPeekedId}
          {...(onExplain !== undefined ? { onExplain } : {})}
          {...(onEquip !== undefined ? { onEquip } : {})}
          grow={false}
        />
      </div>

      <DetailStrip tile={peeked} />
    </div>
  );
}
