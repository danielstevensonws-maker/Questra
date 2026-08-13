/**
 * MapCanvas — the one renderer, three modes (Brief 06 §5). A single component
 * draws a Room in `edit` (planner), `play` (DM), or `table` (spectator) mode.
 * It calls the ONE contracts geometry — distFt / affectedCells / cellKey —
 * never a second implementation (§4.5), so the highlight a player sees is the
 * same math the engine batch-saves.
 *
 * Fog is server-side (CLAUDE.md non-negotiable #3): the caller passes a room
 * already run through filterRoomForViewer for player/table viewers, so this
 * component never receives unrevealed cells or hidden/staged tokens to leak.
 * `isFogged` below is presentation only — if a hidden token DID reach the
 * client, this would happily draw it, which is why the filtering happens
 * upstream, not here.
 *
 * The ground uses the same radial gradient (--qa-map-hi/mid/lo) every other
 * primitive's Storybook "Ground" wrapper renders behind its floating glass —
 * this is that ground, made real and interactive rather than implied scenery.
 * Fog reuses the app's existing "something is hidden from you" language
 * (--qa-scrim + a glass blur) instead of a flat VTT-standard grey box, so the
 * map reads as one visual system with InfoPanel/AcceptTweakRejectCard/etc.,
 * not a bolted-on canvas widget.
 *
 * RESPONSIVE: the canvas fills its container's width and locks its height via
 * `aspect-ratio: w / h`, so cells stay perfectly square at any size — every
 * offset/size below is a percentage of the grid, never a `cellPx`-multiplied
 * absolute pixel. `cellPx` is now a ceiling (`max-width`), not a literal
 * dimension, so a host can cap how large cells get on a big screen without
 * pinning the map to a fixed size on a small one. Grid hairlines stay a crisp
 * 1px regardless of scale via a per-cell background tile (not a naive
 * percentage-width line, which would blur/thicken as the map resizes).
 *
 * Themed entirely via theme/tokens.css variables. No hardcoded colour.
 */
import { useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { distFt, affectedCells, cellKey, type Room, type Cell, type AoeShape } from '@questra/contracts';

export type MapMode = 'edit' | 'play' | 'table';

export interface MapCanvasProps {
  room: Room;
  mode: MapMode;
  /** Max cell size in px, as a ceiling on the map's rendered width (gridWidth * cellPx). Default 40. */
  cellPx?: number;
  /** an AoE template to preview (anchor + shape) — highlights affected cells. */
  aoe?: { shape: AoeShape; anchor: Cell };
  /** measure-from cell: highlights range rings (distFt) from here, e.g. an attacker. */
  measureFrom?: Cell;
  /** token click (play/edit): select or begin a move. */
  onTokenClick?: (tokenId: string) => void;
  /** cell click (edit: paint / play: move target). */
  onCellClick?: (cell: Cell) => void;
}

const mono = 'var(--qa-font-mono)';

export function MapCanvas({ room, mode, cellPx = 40, aoe, measureFrom, onTokenClick, onCellClick }: MapCanvasProps) {
  const { w, h } = room.gridSize;
  const cellPctX = 100 / w;
  const cellPctY = 100 / h;
  const revealed = useMemo(() => new Set(room.revealed), [room.revealed]);
  const affected = useMemo(() => {
    if (aoe === undefined) return new Set<string>();
    return new Set(affectedCells(aoe.shape, aoe.anchor).map(cellKey));
  }, [aoe]);

  const chrome = mode !== 'table';

  return (
    <div
      role="img"
      aria-label={`Map ${room.id} (${mode} view)`}
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: w * cellPx,
        aspectRatio: `${w} / ${h}`,
        borderRadius: 'var(--qa-radius)',
        overflow: 'hidden',
        userSelect: 'none',
        // The terrain placeholder IS the ground every other primitive floats
        // over — the real terrain image replaces the bottom layer in a later
        // slice, the grid/fog/token layers stay the same either way.
        backgroundImage: [
          `linear-gradient(to right, transparent calc(100% - 1px), var(--qa-map-grid) calc(100% - 1px))`,
          `linear-gradient(to bottom, transparent calc(100% - 1px), var(--qa-map-grid) calc(100% - 1px))`,
          'radial-gradient(120% 90% at 56% 30%, var(--qa-map-hi) 0%, var(--qa-map-mid) 44%, var(--qa-map-lo) 100%)',
        ].join(', '),
        backgroundSize: `${cellPctX}% ${cellPctY}%, ${cellPctX}% ${cellPctY}%, 100% 100%`,
        border: 'var(--qa-hairline) solid var(--qa-glass-border)',
        boxShadow: 'var(--qa-shadow)',
      }}
    >
      {/* grid + cell states */}
      {Array.from({ length: h }, (_, y) =>
        Array.from({ length: w }, (_, x) => {
          const cell = { x, y };
          const key = cellKey(cell);
          const isRevealed = revealed.has(key);
          const isFogged = mode !== 'edit' && !isRevealed; // edit sees all; play/table respect fog
          const tag = room.cellTags[key];
          const inAoe = affected.has(key);
          const ring = measureFrom !== undefined ? distFt(measureFrom, cell) : undefined;
          return (
            <button
              key={key}
              type="button"
              onClick={onCellClick !== undefined ? () => onCellClick(cell) : undefined}
              aria-label={`cell ${x},${y}`}
              style={{
                position: 'absolute',
                left: `${x * cellPctX}%`,
                top: `${y * cellPctY}%`,
                width: `${cellPctX}%`,
                height: `${cellPctY}%`,
                boxSizing: 'border-box',
                border: 'none',
                background: cellFill(isFogged, inAoe, tag?.difficultTerrain === true),
                backdropFilter: isFogged ? 'blur(2px)' : undefined,
                WebkitBackdropFilter: isFogged ? 'blur(2px)' : undefined,
                cursor: onCellClick !== undefined ? 'pointer' : 'default',
                padding: 0,
                display: 'grid',
                placeItems: 'center',
                fontFamily: mono,
                fontSize: 'var(--qa-text-whisper)',
                color: 'var(--qa-ink-faint)',
              }}
            >
              {chrome && ring !== undefined && ring > 0 && ring <= 15 ? ring : ''}
            </button>
          );
        }),
      )}

      {/* assets: dashed footprints, cross-hatched when they're difficult terrain */}
      {room.assets.map((a) => (
        <div
          key={a.id}
          aria-label={`asset ${a.id}${a.state !== undefined ? ` (${a.state})` : ''}`}
          style={{
            position: 'absolute',
            left: `${a.cell.x * cellPctX}%`,
            top: `${a.cell.y * cellPctY}%`,
            width: `${a.footprint.w * cellPctX}%`,
            height: `${a.footprint.h * cellPctY}%`,
            boxSizing: 'border-box',
            border: `var(--qa-hairline) dashed var(--qa-ink-faint)`,
            borderRadius: 'var(--qa-radius-sm)',
            background: 'var(--qa-chip)',
            display: 'grid',
            placeItems: 'center',
            fontFamily: mono,
            fontSize: 'var(--qa-text-body)',
            color: 'var(--qa-ink-dim)',
            pointerEvents: 'none',
          }}
        >
          {a.flags.blocking ? '▪' : '▫'}
        </div>
      ))}

      {/* tokens: elevated miniature-base discs, inset within their cell, not flat painted circles */}
      {room.tokens.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={onTokenClick !== undefined ? () => onTokenClick(t.id) : undefined}
          aria-label={`token ${t.creatureRef}${t.staged ? ' (staged)' : ''}`}
          style={{
            position: 'absolute',
            left: `${t.cell.x * cellPctX}%`,
            top: `${t.cell.y * cellPctY}%`,
            width: `${cellPctX}%`,
            height: `${cellPctY}%`,
            background: 'transparent',
            border: 'none',
            padding: 0,
            cursor: onTokenClick !== undefined ? 'pointer' : 'default',
          }}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: '12%',
              borderRadius: 'var(--qa-radius-round)',
              border: `2px solid ${t.staged ? 'var(--qa-ink-faint)' : 'var(--qa-accent)'}`,
              boxShadow: t.staged ? 'none' : '0 0 0 3px var(--qa-accent-soft), var(--qa-shadow)',
              background: 'var(--qa-glass-solid)',
              color: 'var(--qa-ink)',
              fontFamily: mono,
              fontSize: 'var(--qa-text-whisper)',
              fontWeight: 600,
              opacity: t.staged ? 0.6 : 1,
              display: 'grid',
              placeItems: 'center',
            }}
          >
            {initials(t.creatureRef)}
          </span>
        </button>
      ))}

      {mode === 'table' && <TableBadge />}
    </div>
  );
}

/** Fog (an ink scrim) beats AoE beats difficult terrain (a gold hazard hatch) beats plain floor. */
function cellFill(isFogged: boolean, inAoe: boolean, isDifficult: boolean): CSSProperties['background'] {
  if (isFogged) return 'var(--qa-scrim)';
  if (inAoe) return 'var(--qa-accent-soft)';
  if (isDifficult) {
    return 'repeating-linear-gradient(45deg, var(--qa-gold-soft) 0 4px, transparent 4px 10px)';
  }
  return 'transparent';
}

function initials(ref: string): string {
  const last = ref.split(/[.-_]/).pop() ?? ref;
  return last.slice(0, 2).toUpperCase();
}

function TableBadge(): ReactNode {
  return (
    <span
      style={{
        position: 'absolute',
        top: 6,
        right: 8,
        fontFamily: mono,
        fontSize: 'var(--qa-text-whisper)',
        letterSpacing: 'var(--qa-tracking-caps)',
        textTransform: 'uppercase',
        color: 'var(--qa-ink-faint)',
      }}
    >
      Table view
    </span>
  );
}
