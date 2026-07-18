/**
 * MapCanvas — the one renderer, three modes (Brief 06 §5). A single component
 * draws a Room in `edit` (planner), `play` (DM), or `table` (spectator) mode.
 * It calls the ONE contracts geometry — distFt / affectedCells / filterRoomForViewer
 * — never a second implementation (§4.5), so the highlight the player sees is the
 * same math the engine batch-saves.
 *
 * Fog is server-side (non-negotiable #3): the caller passes a room already run
 * through filterRoomForViewer for player/table viewers, so this component never
 * receives unrevealed cells or hidden/staged tokens to leak.
 *
 * Themed entirely via theme/tokens.css variables. No hardcoded look.
 */
import { useMemo, type ReactNode } from 'react';
import { distFt, affectedCells, cellKey, type Room, type Cell, type AoeShape } from '@questra/contracts';

export type MapMode = 'edit' | 'play' | 'table';

export interface MapCanvasProps {
  room: Room;
  mode: MapMode;
  /** cell size in px. */
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

export function MapCanvas({ room, mode, cellPx = 40, aoe, measureFrom, onTokenClick, onCellClick }: MapCanvasProps) {
  const { w, h } = room.gridSize;
  const revealed = useMemo(() => new Set(room.revealed), [room.revealed]);
  const affected = useMemo(() => {
    if (!aoe) return new Set<string>();
    return new Set(affectedCells(aoe.shape, aoe.anchor).map(cellKey));
  }, [aoe]);

  const chrome = mode !== 'table';

  return (
    <div
      role="img"
      aria-label={`Map ${room.id} (${mode} view)`}
      style={{
        position: 'relative',
        width: w * cellPx,
        height: h * cellPx,
        background: 'var(--q-surface-raised)',
        border: '1px solid var(--q-line)',
        borderRadius: 'var(--q-radius)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* terrain layer (placeholder tint; real terrain image is a background in the slice) */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'var(--q-bg)' }} />

      {/* grid + cell states */}
      {Array.from({ length: h }, (_, y) =>
        Array.from({ length: w }, (_, x) => {
          const cell = { x, y };
          const key = cellKey(cell);
          const isRevealed = revealed.has(key);
          const isFogged = mode !== 'edit' && !isRevealed; // edit sees all; play/table respect fog
          const tag = room.cellTags[key];
          const inAoe = affected.has(key);
          const ring = measureFrom ? distFt(measureFrom, cell) : undefined;
          return (
            <button
              key={key}
              onClick={onCellClick ? () => onCellClick(cell) : undefined}
              aria-label={`cell ${x},${y}`}
              style={{
                position: 'absolute',
                left: x * cellPx,
                top: y * cellPx,
                width: cellPx,
                height: cellPx,
                boxSizing: 'border-box',
                border: '1px solid color-mix(in srgb, var(--q-line) 60%, transparent)',
                background: isFogged
                  ? 'var(--q-overlay)'
                  : inAoe
                    ? 'color-mix(in srgb, var(--q-accent) 22%, transparent)'
                    : tag?.difficultTerrain
                      ? 'color-mix(in srgb, var(--q-ink-faint) 18%, transparent)'
                      : 'transparent',
                cursor: onCellClick ? 'pointer' : 'default',
                padding: 0,
                fontSize: 'var(--q-text-xs)',
                color: 'var(--q-ink-faint)',
              }}
            >
              {chrome && ring !== undefined && ring > 0 && ring <= 15 ? `${ring}` : ''}
            </button>
          );
        }),
      )}

      {/* assets */}
      {room.assets.map((a) => (
        <div
          key={a.id}
          aria-label={`asset ${a.id}${a.state ? ` (${a.state})` : ''}`}
          style={{
            position: 'absolute',
            left: a.cell.x * cellPx,
            top: a.cell.y * cellPx,
            width: a.footprint.w * cellPx,
            height: a.footprint.h * cellPx,
            border: '1px dashed var(--q-ink-faint)',
            borderRadius: 'var(--q-radius-sm)',
            background: 'color-mix(in srgb, var(--q-ink-soft) 12%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 'var(--q-text-xs)',
            color: 'var(--q-ink-soft)',
            pointerEvents: 'none',
          }}
        >
          {a.flags.blocking ? '▪' : '▫'}
        </div>
      ))}

      {/* tokens */}
      {room.tokens.map((t) => (
        <button
          key={t.id}
          onClick={onTokenClick ? () => onTokenClick(t.id) : undefined}
          aria-label={`token ${t.creatureRef}${t.staged ? ' (staged)' : ''}`}
          style={{
            position: 'absolute',
            left: t.cell.x * cellPx + 3,
            top: t.cell.y * cellPx + 3,
            width: cellPx - 6,
            height: cellPx - 6,
            borderRadius: '999px',
            border: `2px solid ${t.staged ? 'var(--q-ink-faint)' : 'var(--q-accent)'}`,
            background: 'var(--q-surface)',
            color: 'var(--q-ink)',
            fontSize: 'var(--q-text-xs)',
            fontWeight: 600,
            opacity: t.staged ? 0.55 : 1,
            cursor: onTokenClick ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {initials(t.creatureRef)}
        </button>
      ))}

      {mode === 'table' && <TableBadge />}
    </div>
  );
}

function initials(ref: string): string {
  const last = ref.split(/[.\-_]/).pop() ?? ref;
  return last.slice(0, 2).toUpperCase();
}

function TableBadge(): ReactNode {
  return (
    <span
      style={{
        position: 'absolute',
        top: 6,
        right: 8,
        fontSize: 'var(--q-text-xs)',
        fontFamily: 'var(--q-font-mono)',
        color: 'var(--q-ink-faint)',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}
    >
      Table view
    </span>
  );
}
