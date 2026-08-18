/**
 * SceneHeader — where the table is and how far into the fight it is. Floats
 * top-centre over the map, opposite the hub.
 *
 * WHY IT EXISTS. Round count and session time were nowhere on the player's
 * screen, so the HUD could tell you your armour class but not what was
 * happening. The scene's NAME is the piece that does the most work: it's the
 * only thing on screen that says where you are, and it's set in the display
 * serif because it belongs to the fiction, not the arithmetic (see hudType).
 *
 * Deliberately quiet and non-interactive. CLAUDE.md law 4 — nothing here may
 * require reading while another player is talking, so it carries no controls
 * and no state that changes fast enough to pull the eye.
 */
import type { ReactElement } from 'react';
import { name as nameType, sectionLabel, statMeta } from './hudType.js';

export interface SceneHeaderProps {
  /** the scene's name — "The Ruined Steading". */
  title: string;
  /** where/when, shown small under the title — "Outskirts · Dusk". */
  subtitle?: string;
  round?: number;
  /** whose turn it is right now, shown in accent when it's the viewer's. */
  turn?: { name: string; isYou: boolean };
  /** session clock, already formatted — "01:42:33". */
  elapsed?: string;
}

export function SceneHeader({ title, subtitle, round, turn, elapsed }: SceneHeaderProps): ReactElement {
  return (
    <header
      aria-label="Scene"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: 'var(--qa-s3) var(--qa-s5)',
        borderRadius: 'var(--qa-radius-lg)',
        background: 'var(--qa-glass)',
        border: 'var(--qa-hairline) solid var(--qa-glass-border)',
        backdropFilter: 'blur(var(--qa-glass-blur))',
        WebkitBackdropFilter: 'blur(var(--qa-glass-blur))',
        pointerEvents: 'none',
      }}
    >
      <span style={nameType}>{title}</span>

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s3)' }}>
        {subtitle !== undefined && <span style={sectionLabel}>{subtitle}</span>}
        {round !== undefined && <span style={sectionLabel}>Round {round}</span>}
        {turn !== undefined && (
          <span style={{ ...sectionLabel, color: turn.isYou ? 'var(--qa-accent)' : 'var(--qa-ink-faint)' }}>
            {turn.isYou ? 'Your turn' : `${turn.name}'s turn`}
          </span>
        )}
        {elapsed !== undefined && <span style={statMeta}>{elapsed}</span>}
      </div>
    </header>
  );
}
