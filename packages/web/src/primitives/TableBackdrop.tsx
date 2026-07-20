/**
 * TableBackdrop — the story-only stage that puts HUD glass in its real context.
 *
 * NOT a product component. The design's panels are translucent glass meant to
 * float over the map (tokens/colors.css --qa-glass); judged on Storybook's flat
 * canvas they read as washed-out and thin, which is a lighting artefact, not a
 * design fault. This backdrop reproduces the Player View's actual ground —
 * dark room, grid, the vignette + grain atmosphere overlays — so what you see
 * in a story is what the player sees at the table.
 *
 * Composes the real MapCanvas when given a room, so the glass sits over genuine
 * map pixels rather than a painted approximation.
 */
import type { ReactElement, ReactNode } from 'react';
import type { Room } from '@questra/contracts';
import { MapCanvas } from './MapCanvas.js';

export interface TableBackdropProps {
  children: ReactNode;
  /** render a real MapCanvas as the ground; omit for the bare lit-room wash. */
  room?: Room;
  /** stage height; the Player View's own stage is 1080 tall. */
  height?: number;
  /** center the children instead of filling (for single-panel stories). */
  center?: boolean;
}

export function TableBackdrop({ children, room, height = 720, center = false }: TableBackdropProps): ReactElement {
  return (
    <div
      style={{
        position: 'relative',
        minHeight: height,
        width: '100%',
        overflow: 'hidden',
        background: 'var(--qa-ink)',
        fontFamily: 'var(--qa-font-body)',
      }}
    >
      {/* ---- the ground ---- */}
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', opacity: room ? 0.9 : 1 }}>
        {room ? (
          <MapCanvas room={room} mode="table" cellPx={96} />
        ) : (
          // a lit stone room: warm pool of candlelight falling off into the dark
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse 60% 55% at 50% 42%, #2A2115 0%, #1B1610 45%, #12100A 100%)',
            }}
          />
        )}
      </div>

      {/* grid, only for the painted ground — MapCanvas draws its own */}
      {!room && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'linear-gradient(rgba(230,220,196,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(230,220,196,.05) 1px, transparent 1px)',
            backgroundSize: '96px 96px',
          }}
        />
      )}

      {/* ---- atmosphere: the design's own overlays (effects.css) ---- */}
      <div style={{ position: 'absolute', inset: 0, background: 'var(--qa-grain)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'var(--qa-vignette)', pointerEvents: 'none' }} />

      {/* ---- the HUD under judgement ---- */}
      <div
        style={{
          position: 'relative',
          minHeight: height,
          padding: 'var(--qa-hud-inset)',
          ...(center ? { display: 'grid', placeItems: 'center' } : {}),
        }}
      >
        {children}
      </div>
    </div>
  );
}
