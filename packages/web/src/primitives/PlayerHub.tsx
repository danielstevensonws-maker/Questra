/**
 * PlayerHub — the §2 tree composed. IdentityHeader + VitalsBar + (ActionBar OR
 * DeathSaveCard) + DiceLog. The hub FLIPS when dying (Brief 10 §2): the ActionBar
 * is replaced by the DeathSaveCard and vitals dim; revive flips it back. This is
 * driven purely by the `dying` view-model — no local game state.
 *
 * First-contact (§2, Brief 13): `firstContact` dims the tabs/inventory-until-earned
 * and seeds a reduced tile set — passed as a prop now, wired to Brief 13 flags later.
 *
 * Design: the Questra V1 Prototype sheet, §PlayerHub. Each section of the hub is
 * its OWN floating glass panel with its own blur — the map reads between them.
 * That separation is the whole look: one flat column of sections reads as a
 * sidebar, not as a HUD over a table. Composes @questra/ui Panel + Avatar.
 */
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { Avatar, Panel } from '@questra/ui';
import { VitalsBar } from './VitalsBar.js';
import { ActionBar } from './ActionBar.js';
import { DeathSaveCard } from './DeathSaveCard.js';
import { DiceLog, type DiceLogEntry } from './DiceLog.js';
import type { VitalsVM, ActionTileVM, DeathSaveVM } from './sheetToPlayerHub.js';

export interface PlayerHubProps {
  identity: {
    name: string;
    level: number;
    /** e.g. "Fighter" — renders as "Fighter · Level 3". View-model only. */
    className?: string;
    /** a --qa-class-* token for the avatar tint. */
    classColor?: string;
    portraitRef?: string;
  };
  vitals: VitalsVM;
  tiles: ActionTileVM[];
  log: DiceLogEntry[];
  /** present ⇒ the hub is in the death-save state (flips ActionBar → DeathSaveCard). */
  dying?: DeathSaveVM;
  /** first-contact: dims not-yet-earned surfaces (Brief 13 flags, props for now). */
  firstContact?: boolean;
  onUse: (tileId: string) => void;
  onExplain?: (ref: string) => void;
  onRollDeathSave?: () => void;
  /** side sheets (compendium, notes) the hub hosts; dimmed during first-contact. */
  sideSheets?: ReactNode;
}

/** The hub's panels share one shell: glass, hairline, blur, radius-md. */
const SECTION: CSSProperties = { padding: '11px 13px', gap: 8 };

export function PlayerHub({
  identity,
  vitals,
  tiles,
  log,
  dying,
  firstContact = false,
  onUse,
  onExplain,
  onRollDeathSave,
  sideSheets,
}: PlayerHubProps): ReactElement {
  const isDying = dying !== undefined && dying.phase !== 'up';

  return (
    <div
      aria-label={`${identity.name}'s hub`}
      style={{ display: 'flex', flexDirection: 'column', gap: 8, width: 344 }}
    >
      {/* IdentityHeader — its own panel, so the portrait floats free of the vitals */}
      <Panel style={{ padding: '10px 13px', flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Avatar
          initial={identity.name.charAt(0)}
          shape="square"
          size={40}
          {...(identity.classColor ? { color: identity.classColor } : {})}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span
            style={{
              fontFamily: 'var(--qa-font-display)',
              fontSize: 'var(--qa-text-xl)',
              letterSpacing: 'var(--qa-track-name)',
              color: 'var(--qa-glass-text)',
              lineHeight: 1.05,
            }}
          >
            {identity.name}
          </span>
          <span
            style={{
              fontFamily: 'var(--qa-font-mono)',
              fontSize: 10,
              letterSpacing: 'var(--qa-track-label)',
              textTransform: 'uppercase',
              color: 'var(--qa-glass-dim)',
            }}
          >
            {identity.className ? `${identity.className} · ` : ''}Level {identity.level}
          </span>
        </div>
      </Panel>

      <Panel style={SECTION}>
        <VitalsBar vitals={vitals} {...(onExplain ? { onExplain } : {})} dimmed={isDying} />
      </Panel>

      {/* the flip: ActionBar ⇄ DeathSaveCard. The death-save card brings its own
          raised shell, so it is NOT wrapped in a Panel — it replaces one. */}
      {isDying ? (
        <DeathSaveCard state={dying} onRoll={() => onRollDeathSave?.()} />
      ) : (
        <Panel style={SECTION}>
          <ActionBar tiles={tiles} onUse={onUse} {...(onExplain ? { onExplain } : {})} />
        </Panel>
      )}

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          opacity: firstContact ? 0.5 : 1,
          transition: 'opacity var(--qa-dur) var(--qa-ease)',
        }}
      >
        <Panel label="TABLE LOG" style={{ gap: 0 }}>
          <DiceLog entries={log} />
        </Panel>
        {sideSheets}
      </div>
    </div>
  );
}
