/**
 * PlayerHub — the whole in-play HUD for one player, as ONE surface.
 *
 * THE ARRANGEMENT (2026-08 redesign). Three panels, grouped by the question
 * each one answers:
 *
 *     [ character ][ stats ]        [ turn strip      ]
 *                                   [ action bar      ]      (log, a sibling)
 *
 * WHO YOU ARE (character + stats) pairs off to the left; WHAT YOU CAN DO takes
 * the centre of the screen, because it is the only panel a player actually
 * operates — the other two are read, not clicked.
 *
 * These were briefly merged into one hairline-divided frame to stop three
 * cards of three different widths (240 / 216 / 340) and two different radii
 * from disagreeing. Separation is back by request, and the fix for that
 * disagreement turned out to be portable: it was never the merging, it was the
 * SHARED CHROME CONTRACT — one radius, one padding, one fill, one type ramp.
 * That now lives in `HubPanel` below (and, for the standalone stats card, in
 * StatBar's own Panel, which must be kept in step with it). Build any new hub
 * surface through HubPanel and the three cannot drift apart again.
 *
 * THE TURN STRIP is attached to the ACTION panel's top edge rather than
 * spanning the whole bar: whose turn it is, what you are aimed at, and how far
 * you can still move are all facts about ACTING, so they belong to the panel
 * you act from. The hub had every number a character SHEET holds and nothing a
 * TURN holds, which is most of why it felt static — a sheet is a document, a
 * turn is a game. See TurnStrip.tsx.
 *
 * THE FLIP is unchanged (Brief 10 §2): when `dying` is present and its phase
 * isn't 'up', the action panel's contents are replaced by the DeathSaveCard
 * and the vitals dim. It is a pure function of the `dying` view-model — the server's dying
 * ladder (Brief 04) drives it entirely, and there is no local game state here.
 *
 * The identity block (avatar + name) is the hub's click target for the Player
 * Menu overlay (`onOpenMenu`) — BG3 opens its character sheet the same way,
 * from the portrait, which keeps the click away from the ActionBar's own tiles
 * so the two affordances never fight. The coin line deep-links straight to the
 * menu's Inventory tab rather than duplicating an inventory list here.
 */
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { Avatar, Panel } from '@questra/ui';
import { VitalsBar } from './VitalsBar.js';
import { ActionBar } from './ActionBar.js';
import { StatBar } from './StatBar.js';
import { DeathSaveCard } from './DeathSaveCard.js';
import { TurnStrip, type TurnTargetVM } from './TurnStrip.js';
import { name as nameType, sectionLabel, statMeta } from './hudType.js';
import type { VitalsVM, ActionTileVM, DeathSaveVM, ReadinessVM, StatBarVM } from './sheetToPlayerHub.js';
import type { PlayerMenuTab } from './PlayerMenu.js';

export interface PlayerHubTurnVM {
  /** false ⇒ someone else's turn: the badge reads their name and the strip quiets. */
  active: boolean;
  activeName?: string;
  targets?: TurnTargetVM[];
  movement?: { left: number; max: number };
}

export interface PlayerHubProps {
  identity: { name: string; level: number; className?: string; portraitRef?: string };
  vitals: VitalsVM;
  readiness: ReadinessVM;
  tiles: ActionTileVM[];
  /** omit to drop the stats bay — the actions bay takes the width instead. */
  stats?: StatBarVM;
  /** omit to drop the turn strip (e.g. out-of-combat exploration). */
  turn?: PlayerHubTurnVM;
  /** present ⇒ the hub is in the death-save state (flips the action bay → DeathSaveCard). */
  dying?: DeathSaveVM;
  onUse: (tileId: string) => void;
  onExplain?: (ref: string) => void;
  onRollDeathSave?: () => void;
  /** tap an empty ActionBar socket ⇒ open equip/pick-an-ability for that row. */
  onEquip?: (economy: ActionTileVM['economy']) => void;
  /** tap the identity block or coin line ⇒ open the Player Menu overlay, optionally straight to a tab. */
  onOpenMenu?: (tab?: PlayerMenuTab) => void;
  onTarget?: (id: string) => void;
}

const PANEL_WIDTH = 232;

export function PlayerHub({
  identity,
  vitals,
  readiness,
  tiles,
  stats,
  turn,
  dying,
  onUse,
  onExplain,
  onRollDeathSave,
  onEquip,
  onOpenMenu,
  onTarget,
}: PlayerHubProps): ReactElement {
  const isDying = dying !== undefined && dying.phase !== 'up';

  return (
    <div
      aria-label={`${identity.name}'s hub`}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--qa-s3)', width: '100%' }}
    >
      {/* WHO YOU ARE — character and stats sit as a pair, left. */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 'var(--qa-s3)', flex: 'none' }}>
        <HubPanel width={PANEL_WIDTH} label={identity.name}>
          <button
            type="button"
            onClick={onOpenMenu ? () => onOpenMenu() : undefined}
            aria-label={`Open ${identity.name}'s character menu`}
            disabled={onOpenMenu === undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--qa-s3)',
              background: 'transparent',
              border: 'none',
              padding: 0,
              textAlign: 'left',
              cursor: onOpenMenu !== undefined ? 'pointer' : 'default',
            }}
          >
            <Avatar initial={identity.name.charAt(0)} shape="square" size={44} />
            <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
              <span style={nameType}>{identity.name}</span>
              <span style={sectionLabel}>
                {identity.className !== undefined ? `${identity.className} · ` : ''}Level {identity.level}
              </span>
            </span>
          </button>

          <Divider />

          <VitalsBar vitals={vitals} {...(onExplain !== undefined ? { onExplain } : {})} dimmed={isDying} />

          {/* readiness, one compact line — these were two large chips plus a
              separate coin row, which is a lot of height for three small facts.
              Pinned to the bay's bottom edge (`marginTop: auto`) so that when the
              action bay is the taller one, this bay ends on a deliberate line
              instead of trailing off into the dead space that made the old card
              look unfinished. */}
          <Divider style={{ marginTop: 'auto' }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--qa-s2)' }}>
            <MetaReadout
              label="Init"
              value={readiness.initiative.value >= 0 ? `+${readiness.initiative.value}` : String(readiness.initiative.value)}
              onClick={onExplain ? () => onExplain('initiative') : undefined}
              title={`Initiative ${readiness.initiative.value} — explain`}
            />
            <MetaReadout label="Hit dice" value={`${readiness.hitDice.max}${readiness.hitDice.die}`} title={`Hit Dice: ${readiness.hitDice.max} ${readiness.hitDice.die}`} />
            <MetaReadout
              label="Carrying"
              value={readiness.coins}
              tone="gold"
              onClick={onOpenMenu ? () => onOpenMenu('inventory') : undefined}
              title={`Carrying ${readiness.coins} — open inventory`}
            />
          </div>
        </HubPanel>

        {stats !== undefined && <StatBar stats={stats} {...(onExplain !== undefined ? { onExplain } : {})} />}
      </div>

      {/* WHAT YOU CAN DO — the action panel takes the centre of the screen, with
          the turn strip attached to its top edge rather than spanning the whole
          bar: whose turn it is, what you're aimed at and how far you can move
          are all facts ABOUT acting, so they belong to this panel. */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'center' }}>
        <HubPanel label="Actions">
          {turn !== undefined && (
            <>
              <TurnStrip
                active={turn.active}
                {...(turn.activeName !== undefined ? { activeName: turn.activeName } : {})}
                {...(turn.targets !== undefined ? { targets: turn.targets } : {})}
                {...(turn.movement !== undefined ? { movement: turn.movement } : {})}
                {...(onTarget !== undefined ? { onTarget } : {})}
              />
              <Divider />
            </>
          )}

          {isDying ? (
            <DeathSaveCard state={dying} onRoll={() => onRollDeathSave?.()} />
          ) : (
            <ActionBar
              tiles={tiles}
              onUse={onUse}
              {...(onExplain !== undefined ? { onExplain } : {})}
              {...(onEquip !== undefined ? { onEquip } : {})}
            />
          )}
        </HubPanel>
      </div>
    </div>
  );
}

/**
 * The shared chrome contract. These are three separate surfaces again (the
 * single-frame version merged them to stop the widths and radii disagreeing),
 * so what keeps them reading as ONE system is that every hub panel is built
 * here and nowhere else: same fill, same border, same `large` radius, same
 * `--qa-s4` padding, same `--qa-s3` internal rhythm. Add a fourth panel to the
 * hub through this component, never by hand-rolling another <Panel>.
 */
function HubPanel({ children, width, label }: { children: ReactNode; width?: number; label: string }): ReactElement {
  return (
    <Panel
      large
      aria-label={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--qa-s3)',
        padding: 'var(--qa-s4)',
        ...(width !== undefined ? { width, flex: 'none' } : {}),
      }}
    >
      {children}
    </Panel>
  );
}

function Divider({ style }: { style?: CSSProperties }): ReactElement {
  return <span aria-hidden="true" style={{ height: 'var(--qa-hairline)', background: 'var(--qa-glass-border)', flex: 'none', ...style }} />;
}

/** A label-over-value readout, sized for three-up in the identity bay. */
function MetaReadout({
  label,
  value,
  title,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  title: string;
  tone?: 'gold';
  onClick?: (() => void) | undefined;
}): ReactElement {
  return (
    <button
      type="button"
      aria-label={title}
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        background: 'transparent',
        border: 'none',
        padding: 0,
        textAlign: 'left',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span style={sectionLabel}>{label}</span>
      <span style={{ ...statMeta, color: tone === 'gold' ? 'var(--qa-gold)' : 'var(--qa-ink)' }}>{value}</span>
    </button>
  );
}
