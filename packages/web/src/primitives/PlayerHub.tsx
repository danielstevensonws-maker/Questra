/**
 * PlayerHub — the §2 tree composed. IdentityHeader + VitalsBar + (ActionBar OR
 * DeathSaveCard) + DiceLog. The hub FLIPS when dying (Brief 10 §2): the ActionBar
 * is replaced by the DeathSaveCard and vitals dim; revive flips it back. This is
 * driven purely by the `dying` view-model — no local game state.
 *
 * First-contact (§2, Brief 13): `firstContact` dims the tabs/inventory-until-earned
 * and seeds a reduced tile set — passed as a prop now, wired to Brief 13 flags later.
 *
 * Composes the design-system Avatar for the portrait (Playbook §3).
 */
import type { ReactElement, ReactNode } from 'react';
import { Avatar } from '@questra/ui';
import { VitalsBar } from './VitalsBar.js';
import { ActionBar } from './ActionBar.js';
import { DeathSaveCard } from './DeathSaveCard.js';
import { DiceLog, type DiceLogEntry } from './DiceLog.js';
import type { VitalsVM, ActionTileVM, DeathSaveVM } from './sheetToPlayerHub.js';

export interface PlayerHubProps {
  identity: { name: string; level: number; portraitRef?: string };
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

export function PlayerHub({
  identity, vitals, tiles, log, dying, firstContact = false, onUse, onExplain, onRollDeathSave, sideSheets,
}: PlayerHubProps): ReactElement {
  const isDying = dying !== undefined && dying.phase !== 'up';
  return (
    <div className="flex flex-col gap-2" aria-label={`${identity.name}'s hub`}>
      {/* IdentityHeader */}
      <header className="flex items-center gap-3 px-4 pt-3">
        <Avatar initial={identity.name.charAt(0)} shape="circle" size={44} />
        <div className="flex flex-col">
          <span className="text-base font-semibold text-ink">{identity.name}</span>
          <span className="text-xs text-ink-faint">Level {identity.level}</span>
        </div>
      </header>

      <VitalsBar vitals={vitals} {...(onExplain ? { onExplain } : {})} dimmed={isDying} />

      {/* the flip: ActionBar ⇄ DeathSaveCard */}
      {isDying ? (
        <div className="px-4 py-2">
          <DeathSaveCard state={dying} onRoll={() => onRollDeathSave?.()} />
        </div>
      ) : (
        <ActionBar tiles={tiles} onUse={onUse} {...(onExplain ? { onExplain } : {})} />
      )}

      <div style={{ opacity: firstContact ? 0.5 : 1, transition: 'opacity var(--q-dur) var(--q-ease)' }}>
        <DiceLog entries={log} />
        {sideSheets}
      </div>
    </div>
  );
}
