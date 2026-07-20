/**
 * MapCanvas — the one renderer, three modes (Brief 06 §5). A single component
 * draws a Room in `edit` (planner), `play` (DM), or `table` (spectator) mode.
 * It calls the ONE contracts geometry — distFt / affectedCells / filterRoomForViewer
 * — never a second implementation (§4.5), so the highlight the player sees is the
 * same math the engine batch-saves.
 *
 * Fog is server-side (non-negotiable #3): the caller passes a room already run
 * through filterRoomForViewer for player/table viewers, so this component never
 * receives unrevealed cells or hidden/staged tokens to leak. The fog dim here is
 * PRESENTATION only — in the table view a hidden token isn't dimmed, it's absent
 * from the data.
 *
 * Design: the Questra V1 Prototype sheet, §MapCanvas. The grid is drawn ON the
 * terrain (repeating-linear-gradient over the terrain image, or the --qa-ink-char
 * ground when there's no image yet). Tokens compose the @questra/ui MapToken
 * (class/foe tint, the vellum spotlight ring, Bloodied/Unhurt tags). Fog is a
 * --qa-ink-deep wash; AoE is an --qa-arcane fill; difficult terrain is a hatch;
 * assets are dashed boxes with a gold prep-note dot. Themed via --qa-* tokens.
 *
 * `terrainImageRef` display: the Room carries a reference to an image the Session
 * Planner generates (Brief 09a); this renders it as the ground layer via the
 * caller-supplied `resolveTerrain`. Absent that, the --qa-ink-char grid stands in.
 */
import { useMemo, type CSSProperties, type ReactElement, type ReactNode } from 'react';
import { MapToken } from '@questra/ui';
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
  /** the id of the viewer's own token — it gets the vellum spotlight ring. */
  youTokenId?: string;
  /**
   * Resolve a terrain/asset imageRef to a URL. The Room stores refs (Brief 06 §2);
   * the Session Planner (Brief 09a) fills them. Omit and the grid ground stands in.
   */
  resolveTerrain?: (imageRef: string) => string | undefined;
  /** map a token's creatureRef to a class colour + optional status tag. */
  tokenMeta?: (creatureRef: string) => { color?: string; foe?: boolean; tag?: string } | undefined;
  /** token click (play/edit): select or begin a move. */
  onTokenClick?: (tokenId: string) => void;
  /** cell click (edit: paint / play: move target). */
  onCellClick?: (cell: Cell) => void;
}

export function MapCanvas({
  room,
  mode,
  cellPx = 36,
  aoe,
  measureFrom,
  youTokenId,
  resolveTerrain,
  tokenMeta,
  onTokenClick,
  onCellClick,
}: MapCanvasProps): ReactElement {
  const { w, h } = room.gridSize;
  const revealed = useMemo(() => new Set(room.revealed), [room.revealed]);
  const affected = useMemo(() => {
    if (!aoe) return new Set<string>();
    return new Set(affectedCells(aoe.shape, aoe.anchor).map(cellKey));
  }, [aoe]);

  const chrome = mode !== 'table';
  const terrainUrl = resolveTerrain?.(room.terrainImageRef);

  // The grid is drawn on the terrain: two hairline gradients at the cell pitch,
  // over the terrain image when present, else the --qa-ink-char ground.
  const gridLayer = `repeating-linear-gradient(90deg, var(--qa-hairline-soft) 0 1px, transparent 1px ${cellPx}px), repeating-linear-gradient(0deg, var(--qa-hairline-soft) 0 1px, transparent 1px ${cellPx}px)`;
  const ground: CSSProperties = terrainUrl
    ? { background: `${gridLayer}, center / cover no-repeat url("${terrainUrl}"), var(--qa-ink-char)` }
    : { background: `${gridLayer}, var(--qa-ink-char)` };

  return (
    <div
      role="img"
      aria-label={`Map ${room.id} (${mode} view)`}
      style={{
        position: 'relative',
        width: w * cellPx,
        height: h * cellPx,
        border: '1px solid var(--qa-hairline)',
        borderRadius: 'var(--qa-radius-sm)',
        overflow: 'hidden',
        userSelect: 'none',
        ...ground,
      }}
    >
      {/* per-cell states: fog, AoE, difficult terrain, range rings */}
      {Array.from({ length: h }, (_, y) =>
        Array.from({ length: w }, (_, x) => {
          const cell = { x, y };
          const key = cellKey(cell);
          const isRevealed = revealed.has(key);
          const isFogged = mode !== 'edit' && !isRevealed; // edit sees all; play/table respect fog
          const tag = room.cellTags[key];
          const inAoe = affected.has(key);
          const ring = measureFrom ? distFt(measureFrom, cell) : undefined;

          const background = isFogged
            ? mode === 'table'
              ? 'var(--qa-ink-deep)'
              : 'color-mix(in srgb, var(--qa-ink-deep) 78%, transparent)'
            : inAoe
              ? 'color-mix(in srgb, var(--qa-arcane) 20%, transparent)'
              : tag?.difficultTerrain
                ? 'repeating-linear-gradient(45deg, var(--qa-hairline-soft) 0 3px, transparent 3px 7px)'
                : 'transparent';

          const interactive = onCellClick !== undefined;
          const showRing = chrome && !isFogged && ring !== undefined && ring > 0 && ring <= 15;

          return (
            <button
              key={key}
              onClick={interactive ? () => onCellClick(cell) : undefined}
              aria-label={`cell ${x},${y}`}
              style={{
                position: 'absolute',
                left: x * cellPx,
                top: y * cellPx,
                width: cellPx,
                height: cellPx,
                boxSizing: 'border-box',
                border: 'none',
                background,
                cursor: interactive ? 'pointer' : 'default',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--qa-font-mono)',
                fontSize: 8.5,
                color: 'var(--qa-vellum-faint)',
              }}
            >
              {showRing ? ring : ''}
            </button>
          );
        }),
      )}

      {/* assets — dashed footprint, blocking mark, gold prep-note dot (edit only) */}
      {room.assets.map((a) => {
        const assetUrl = resolveTerrain?.(a.imageRef);
        return (
          <div
            key={a.id}
            aria-label={`asset ${a.id}${a.state ? ` (${a.state})` : ''}`}
            style={{
              position: 'absolute',
              left: a.cell.x * cellPx,
              top: a.cell.y * cellPx,
              width: a.footprint.w * cellPx,
              height: a.footprint.h * cellPx,
              border: '1px dashed var(--qa-hairline)',
              borderRadius: 'var(--qa-radius-xs)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'var(--qa-font-mono)',
              fontSize: 9,
              color: 'var(--qa-vellum-dim)',
              pointerEvents: 'none',
              ...(assetUrl
                ? { background: `center / cover no-repeat url("${assetUrl}")` }
                : { background: 'color-mix(in srgb, var(--qa-vellum) 6%, transparent)' }),
            }}
          >
            {!assetUrl && (
              <span>
                {a.flags.blocking ? '▪' : '▫'} {a.id}
              </span>
            )}
            {/* prep note is a DM-only reminder — a quiet gold dot, edit mode only */}
            {mode === 'edit' && a.prepNote && (
              <span
                title={a.prepNote}
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: 'var(--qa-gold)',
                }}
              />
            )}
          </div>
        );
      })}

      {/* tokens — the @questra/ui MapToken, class/foe tint + spotlight ring + tag */}
      {room.tokens.map((t) => {
        const meta = tokenMeta?.(t.creatureRef);
        const dimmed = t.staged; // staged tray tokens read faint
        return (
          <button
            key={t.id}
            onClick={onTokenClick ? () => onTokenClick(t.id) : undefined}
            aria-label={`token ${t.creatureRef}${t.staged ? ' (staged)' : ''}`}
            style={{
              position: 'absolute',
              left: t.cell.x * cellPx + (cellPx - tokenSize(cellPx)) / 2,
              top: t.cell.y * cellPx + (cellPx - tokenSize(cellPx)) / 2,
              border: 'none',
              background: 'transparent',
              padding: 0,
              opacity: dimmed ? 0.55 : 1,
              cursor: onTokenClick ? 'pointer' : 'default',
            }}
          >
            <MapToken
              label={initials(t.creatureRef)}
              size={tokenSize(cellPx)}
              active={t.id === youTokenId}
              {...(meta?.color ? { color: meta.color } : {})}
              {...(meta?.foe ? { foe: meta.foe } : {})}
              {...(meta?.tag ? { tag: meta.tag } : {})}
            />
          </button>
        );
      })}

      {mode === 'table' && <TableBadge />}
    </div>
  );
}

/** Token disk is a hair smaller than the cell so the grid reads around it. */
function tokenSize(cellPx: number): number {
  return Math.round(cellPx * 0.78);
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
        top: 8,
        right: 8,
        fontFamily: 'var(--qa-font-mono)',
        fontSize: 8,
        letterSpacing: 'var(--qa-track-label)',
        textTransform: 'uppercase',
        color: 'var(--qa-vellum-dim)',
        background: 'var(--qa-glass-raised)',
        border: '1px solid var(--qa-glass-border)',
        borderRadius: 'var(--qa-radius-xs)',
        padding: '2px 7px',
      }}
    >
      Table view
    </span>
  );
}
