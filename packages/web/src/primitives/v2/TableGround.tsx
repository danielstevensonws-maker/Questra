/**
 * v2/TableGround — the map, as the ground rather than as a panel.
 *
 * The single most important structural decision in the design request: "the map
 * is the ground. Not a panel — the full-bleed background of the screen." So
 * this sits at the bottom of the stacking order, edge to edge, and every frame
 * surface is translucent glass laid over it. It is what the player is looking
 * at; the HUD is what they are looking through.
 *
 * The vignette is not mood. §8 requires that text stay legible over ANY map,
 * and the corners are exactly where the frame's surfaces sit, so the ground
 * darkens toward its edges and lets the glass keep its contrast without the
 * fills having to be opaque enough to hide the room.
 *
 * Token positions are percentages of the ground, not multiples of a cell size,
 * so the composition survives any window without a fixed letterboxed stage.
 * This renders a placeholder terrain gradient in the same tokens the real map
 * uses — swapping the bottom layer for a terrain image changes nothing above it.
 */
import type { ReactElement } from 'react';

export interface GroundTokenVM {
  id: string;
  /** the initial drawn in the token. */
  label: string;
  /** percentage across and down the ground. */
  x: number;
  y: number;
  kind: 'you' | 'ally' | 'foe';
  /** the one word under the token — Bloodied, Dying, Unhurt. */
  tag?: string;
  /** this creature is acting right now. */
  acting?: boolean;
  down?: boolean;
}

export interface TableGroundProps {
  tokens: GroundTokenVM[];
  onTokenClick?: (id: string) => void;
}

export function TableGround({ tokens, onTokenClick }: TableGroundProps): ReactElement {
  return (
    <div className="qa2-ground" role="img" aria-label="The yard behind the ruined steading, seen from above">
      {tokens.map((t) => {
        const cls = [
          'qa2-token',
          t.kind === 'you' ? 'is-you' : t.kind === 'ally' ? 'is-ally' : 'is-foe',
          t.acting === true ? 'is-acting' : '',
          t.down === true ? 'is-down' : '',
        ].filter(Boolean).join(' ');
        const tagCls = t.tag === 'Bloodied' ? 'qa2-token-tag is-hurt' : t.down === true ? 'qa2-token-tag is-down' : 'qa2-token-tag';
        return (
          <button
            key={t.id}
            type="button"
            className={cls}
            style={{ left: `${t.x}%`, top: `${t.y}%` }}
            onClick={onTokenClick ? () => onTokenClick(t.id) : undefined}
            aria-label={`${t.label}${t.tag !== undefined ? `, ${t.tag}` : ''}`}
          >
            {t.label}
            {t.tag !== undefined && <span className={tagCls}>{t.tag}</span>}
          </button>
        );
      })}
    </div>
  );
}
