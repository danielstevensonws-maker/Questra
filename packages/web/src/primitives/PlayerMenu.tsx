/**
 * PlayerMenu — the hub's hidden overlay (Brief 10 §2): everything about the
 * character that doesn't fit the always-visible hub — full ability scores,
 * saving throws, passives, trained skills, and what they're carrying. Opens
 * from the hub's identity block (PlayerHub's `onOpenMenu`); this component
 * only knows `open`/`onClose`, not how it was triggered.
 *
 * Design reference: the user's Baldur's Gate 3 character sheet
 * ("Referrence images/baldur-s-gate-3-inventory-management-tips.avif") — a
 * full-viewport three-pane takeover (paperdoll, 3D model, inventory grid)
 * with a LOT of chrome Questra has no assets for (no item icon art, no 3D
 * model pipeline). Rather than an emptier copy of that layout, this is a
 * single compact glass card centered over the game — one manifest, three
 * quiet tabs (Stats / Skills / Inventory), no page-darkening full takeover.
 * That's the "innovative and compact" brief: BG3 answers "show everything at
 * once"; this answers "show one thing well, switch fast" (CLAUDE.md law 4 —
 * screen time is a cost, so the overlay stays small and the map never fully
 * disappears behind it).
 *
 * Presentational: view-models only (sheetToPlayerHub + the local
 * InventoryLineVM below), no local game state beyond which tab is open.
 */
import { useCallback, useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';
import { Avatar, Panel } from '@questra/ui';
import { fmtMod, ABILITY_LABEL, type StatBarVM, type SaveStatVM, type PassivesVM, type SkillLineVM, type VitalsVM } from './sheetToPlayerHub.js';

/**
 * A carried item, generic on purpose: @questra/contracts has no Item catalog
 * yet (ComputedSheet only carries `coins` + choice-time equipment IDs), so
 * this is the seam a future `itemsToInventory()` adapter will fill in. The
 * caller supplies names/quantities directly until that contract lands.
 */
export interface InventoryLineVM {
  id: string;
  name: string;
  qty?: number;
  note?: string;
}

export interface PlayerMenuProps {
  open: boolean;
  onClose: () => void;
  identity: { name: string; level: number; className?: string };
  vitals: VitalsVM;
  stats: StatBarVM;
  saves: SaveStatVM[];
  passives: PassivesVM;
  skills: SkillLineVM[];
  coins: string;
  inventory: InventoryLineVM[];
  onExplain?: (ref: string) => void;
  /** which tab to land on when it opens — e.g. the hub's coin readout opens straight to Inventory. Defaults to Stats. */
  initialTab?: PlayerMenuTab;
}

export type PlayerMenuTab = 'stats' | 'skills' | 'inventory';
const TABS: { id: PlayerMenuTab; label: string }[] = [
  { id: 'stats', label: 'Stats' },
  { id: 'skills', label: 'Skills' },
  { id: 'inventory', label: 'Inventory' },
];

const mono = 'var(--qa-font-mono)';
const body = 'var(--qa-font-body)';
const display = 'var(--qa-font-display)';

export function PlayerMenu({ open, onClose, identity, vitals, stats, saves, passives, skills, coins, inventory, onExplain, initialTab }: PlayerMenuProps): ReactElement | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<PlayerMenuTab>(initialTab ?? 'stats');

  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // Re-lands on the requested tab every time it opens — e.g. reopening from the coin readout should always go to Inventory, not wherever it was left last time.
  useEffect(() => {
    if (open) setTab(initialTab ?? 'stats');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 20, fontFamily: body }}>
      <div
        onClick={close}
        style={{
          position: 'absolute',
          inset: 0,
          background: 'var(--qa-scrim)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          animation: 'qa-scrim-in var(--qa-dur) var(--qa-ease)',
        }}
      />

      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--qa-s6)', pointerEvents: 'none' }}>
        <Panel
          large
          className="qa-player-menu"
          style={{
            pointerEvents: 'auto',
            width: 640,
            maxWidth: '100%',
            maxHeight: '100%',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--qa-shadow-pop)',
            animation: 'qa-card-in var(--qa-dur-slow) var(--qa-ease-out)',
          }}
        >
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${identity.name}'s character menu`}
            tabIndex={-1}
            style={{ display: 'flex', flexDirection: 'column', minHeight: 0, outline: 'none' }}
          >
            {/* header */}
            <header
              style={{
                flex: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--qa-s3)',
                padding: 'var(--qa-s5) var(--qa-s5) var(--qa-s4)',
                borderBottom: 'var(--qa-hairline) solid var(--qa-glass-border)',
              }}
            >
              <Avatar initial={identity.name.charAt(0)} shape="square" size={44} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
                <span style={{ fontFamily: display, fontSize: 'var(--qa-text-title)', color: 'var(--qa-ink)', lineHeight: 1.05 }}>{identity.name}</span>
                <span style={{ fontFamily: mono, fontSize: 'var(--qa-text-whisper)', letterSpacing: 'var(--qa-tracking-caps)', textTransform: 'uppercase', color: 'var(--qa-ink-faint)' }}>
                  {identity.className !== undefined ? `${identity.className} · ` : ''}Level {identity.level} · HP {vitals.hp.current}/{vitals.hp.max}
                </span>
              </div>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                style={{
                  flex: 'none',
                  width: 30,
                  height: 30,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 'var(--qa-radius)',
                  color: 'var(--qa-ink-faint)',
                  fontFamily: mono,
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </header>

            {/* tabs */}
            <div role="tablist" aria-label="Character details" style={{ flex: 'none', display: 'flex', gap: 'var(--qa-s2)', padding: 'var(--qa-s4) var(--qa-s5) 0' }}>
              {TABS.map((t) => {
                const activeTab = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    role="tab"
                    aria-selected={activeTab}
                    onClick={() => setTab(t.id)}
                    style={{
                      fontFamily: mono,
                      fontSize: 'var(--qa-text-whisper)',
                      letterSpacing: 'var(--qa-tracking-caps)',
                      textTransform: 'uppercase',
                      padding: '6px 14px',
                      borderRadius: 'var(--qa-radius-round)',
                      border: `var(--qa-hairline) solid ${activeTab ? 'var(--qa-accent-line)' : 'var(--qa-glass-border)'}`,
                      background: activeTab ? 'var(--qa-accent-soft)' : 'transparent',
                      color: activeTab ? 'var(--qa-accent)' : 'var(--qa-ink-faint)',
                      cursor: 'pointer',
                      transition: 'all var(--qa-dur-fast) var(--qa-ease)',
                    }}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* content */}
            <div style={{ padding: 'var(--qa-s5)', overflowY: 'auto' }}>
              {tab === 'stats' && <StatsTab stats={stats} saves={saves} passives={passives} onExplain={onExplain} />}
              {tab === 'skills' && <SkillsTab skills={skills} onExplain={onExplain} />}
              {tab === 'inventory' && <InventoryTab coins={coins} inventory={inventory} />}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }): ReactElement {
  return (
    <span
      style={{
        fontFamily: mono,
        fontSize: 'var(--qa-text-whisper)',
        letterSpacing: 'var(--qa-tracking-caps)',
        textTransform: 'uppercase',
        color: 'var(--qa-ink-faint)',
      }}
    >
      {children}
    </span>
  );
}

function StatsTab({ stats, saves, passives, onExplain }: { stats: StatBarVM; saves: SaveStatVM[]; passives: PassivesVM; onExplain?: ((ref: string) => void) | undefined }): ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s5)' }}>
      <div>
        <SectionLabel>Ability Scores</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--qa-s2)', marginTop: 'var(--qa-s2)' }}>
          {stats.abilities.map((a) => (
            <StatCell
              key={a.ability}
              topLabel={ABILITY_LABEL[a.ability].slice(0, 3).toUpperCase()}
              value={fmtMod(a.mod)}
              subValue={String(a.score)}
              onClick={onExplain ? () => onExplain(a.ability) : undefined}
              ariaLabel={`${ABILITY_LABEL[a.ability]} ${fmtMod(a.mod)}, score ${a.score} — explain`}
            />
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Saving Throws</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--qa-s2)', marginTop: 'var(--qa-s2)' }}>
          {saves.map((s) => (
            <StatCell
              key={s.ability}
              topLabel={ABILITY_LABEL[s.ability].slice(0, 3).toUpperCase()}
              value={fmtMod(s.mod)}
              onClick={onExplain ? () => onExplain(`save.${s.ability}`) : undefined}
              ariaLabel={`${ABILITY_LABEL[s.ability]} saving throw ${fmtMod(s.mod)} — explain`}
            />
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>Passives</SectionLabel>
        <div style={{ display: 'flex', gap: 'var(--qa-s3)', marginTop: 'var(--qa-s2)', flexWrap: 'wrap' }}>
          {([passives.perception, passives.investigation, passives.insight] as const).map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={onExplain ? () => onExplain(p.label) : undefined}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 6,
                padding: '6px 10px',
                borderRadius: 'var(--qa-radius-sm)',
                background: 'var(--qa-chip)',
                border: 'var(--qa-hairline) solid var(--qa-glass-border)',
                cursor: onExplain ? 'pointer' : 'default',
              }}
            >
              <span style={{ fontFamily: mono, fontSize: 'var(--qa-text-lg)', fontWeight: 600, color: 'var(--qa-ink)' }}>{p.value}</span>
              <span style={{ fontFamily: body, fontSize: 'var(--qa-text-whisper)', color: 'var(--qa-ink-dim)' }}>{p.label.replace('Passive ', '')}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 'var(--qa-s3)' }}>
        <StatCell topLabel="AC" value={String(stats.ac.value)} onClick={onExplain ? () => onExplain('ac') : undefined} ariaLabel={`Armor Class ${stats.ac.value} — explain`} wide />
        <StatCell topLabel="Speed" value={`${stats.speed.value} ft`} onClick={onExplain ? () => onExplain('speed') : undefined} ariaLabel={`Speed ${stats.speed.value} feet — explain`} wide />
      </div>
    </div>
  );
}

function StatCell({
  topLabel,
  value,
  subValue,
  onClick,
  ariaLabel,
  wide = false,
}: {
  topLabel: string;
  value: string;
  subValue?: string;
  onClick?: (() => void) | undefined;
  ariaLabel: string;
  wide?: boolean;
}): ReactElement {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        flex: wide ? 1 : undefined,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 2,
        padding: 'var(--qa-s2) 0',
        borderRadius: 'var(--qa-radius-sm)',
        background: 'var(--qa-chip)',
        border: 'var(--qa-hairline) solid var(--qa-glass-border)',
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <span style={{ fontFamily: mono, fontSize: 9.5, letterSpacing: 'var(--qa-tracking-caps)', color: 'var(--qa-ink-faint)' }}>{topLabel}</span>
      <span style={{ fontFamily: mono, fontSize: 'var(--qa-text-lg)', fontWeight: 600, color: 'var(--qa-ink)', lineHeight: 1.1 }}>{value}</span>
      {subValue !== undefined && <span style={{ fontFamily: mono, fontSize: 9.5, color: 'var(--qa-ink-faint)' }}>{subValue}</span>}
    </button>
  );
}

function SkillsTab({ skills, onExplain }: { skills: SkillLineVM[]; onExplain?: ((ref: string) => void) | undefined }): ReactElement {
  if (skills.length === 0) {
    return <p style={{ fontFamily: body, fontSize: 'var(--qa-text-whisper)', fontStyle: 'italic', color: 'var(--qa-ink-faint)' }}>No trained skills yet.</p>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s1)' }}>
      {skills.map((s) => (
        <button
          key={s.skill}
          type="button"
          onClick={onExplain ? () => onExplain(`skill.${s.skill}`) : undefined}
          aria-label={`${s.label} ${fmtMod(s.mod)} — explain`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px',
            borderRadius: 'var(--qa-radius-sm)',
            background: 'var(--qa-chip)',
            border: 'var(--qa-hairline) solid var(--qa-glass-border)',
            cursor: onExplain ? 'pointer' : 'default',
          }}
        >
          <span style={{ fontFamily: body, fontSize: 'var(--qa-text-body)', color: 'var(--qa-ink)' }}>{s.label}</span>
          <span style={{ fontFamily: mono, fontSize: 'var(--qa-text-body)', color: 'var(--qa-gold)' }}>{fmtMod(s.mod)}</span>
        </button>
      ))}
    </div>
  );
}

function InventoryTab({ coins, inventory }: { coins: string; inventory: InventoryLineVM[] }): ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <SectionLabel>Carrying</SectionLabel>
        <span style={{ fontFamily: mono, fontSize: 'var(--qa-text-whisper)', color: 'var(--qa-gold)' }}>{coins}</span>
      </div>

      {inventory.length === 0 ? (
        <p style={{ fontFamily: body, fontSize: 'var(--qa-text-whisper)', fontStyle: 'italic', color: 'var(--qa-ink-faint)' }}>Nothing carried yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--qa-s1)' }}>
          {inventory.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--qa-s3)',
                padding: '8px 10px',
                borderRadius: 'var(--qa-radius-sm)',
                background: 'var(--qa-chip)',
                border: 'var(--qa-hairline) solid var(--qa-glass-border)',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  flex: 'none',
                  width: 28,
                  height: 28,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 'var(--qa-radius-sm)',
                  background: 'var(--qa-glass-solid)',
                  border: 'var(--qa-hairline) solid var(--qa-glass-border)',
                  color: 'var(--qa-ink-faint)',
                  fontSize: 13,
                }}
              >
                ✦
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, minWidth: 0, flex: 1 }}>
                <span style={{ fontFamily: body, fontSize: 'var(--qa-text-body)', color: 'var(--qa-ink)' }}>{item.name}</span>
                {item.note !== undefined && <span style={{ fontFamily: body, fontSize: 9.5, color: 'var(--qa-ink-faint)' }}>{item.note}</span>}
              </div>
              {item.qty !== undefined && item.qty > 1 && (
                <span style={{ fontFamily: mono, fontSize: 'var(--qa-text-whisper)', color: 'var(--qa-ink-dim)' }}>×{item.qty}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
