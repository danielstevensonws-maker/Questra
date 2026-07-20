/**
 * InfoPanel — THE primitive. Character Wizard §4: "one component, used
 * everywhere." Reused by: wizard, compendium, session planner, level-up,
 * homebrew builder, community library, and every tap-"?" in play.
 *
 * Three jobs (all from the spec):
 *   1. INFORMS via three layers — plain sentence / derivation / full SRD text.
 *      These map 1:1 onto the contracts RulesEntity shape (plain / derivation
 *      / srd_text), so the panel renders any class/species/feat/spell/stat/
 *      condition — official OR homebrew — with zero per-type code.
 *   2. SELECTS — the "Choose" button lives INSIDE the panel, so reading,
 *      understanding, and deciding are one motion.
 *   3. RENDERS HOMEBREW IDENTICALLY — a homebrew entity opens in this exact
 *      panel; the source flag is the only difference, shown as a quiet badge.
 *
 * Design: the Questra V1 Prototype sheet, §InfoPanel. A floating glass card
 * (--qa-glass-raised, heavy blur, shadow-menu), kicker over title, layer
 * toggles as uppercase-mono rows with ▸/▾ chevrons, derivation as a label +
 * big-mono-number list with faint sub-parts, and the ember Choose button. Adds
 * the loading (candle-breath skeleton) and not-found states from the sheet.
 * Themed entirely via --qa-* tokens.
 */
import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/** Layer 2 line: a computed value with its provenance ("15 = 11 base + 2 Dex + 2 shield"). */
export interface DerivationLine {
  label: string;
  value: string | number;
  /** optional breakdown parts, each a small labeled contribution */
  parts?: { label: string; value: string | number }[];
}

/**
 * The panel's data contract. A thin view-model derived from a contracts
 * RulesEntity — the caller maps entity.plain → summary, entity.derivation →
 * derivation, entity.srd_text → rulesText. Kept as its own type so non-entity
 * things (a computed AC, a homebrew draft-in-progress) can also open the panel.
 */
export interface InfoPanelData {
  name: string;
  kind: string;                     // "Class", "Condition", "Spell — Level 3", etc. (plain-language)
  source: 'srd-5.2.1' | 'homebrew';
  summary: string;                  // Layer 1 — one plain sentence
  derivation?: DerivationLine[];    // Layer 2 — where numbers came from (optional; many entities have none)
  rulesText?: string;               // Layer 3 — full SRD text
  /** Optional extra slot for rich content (e.g. a homebrew level table preview). */
  extra?: ReactNode;
}

export interface InfoPanelProps {
  open: boolean;
  data: InfoPanelData | null;
  onClose: () => void;
  /**
   * When present, renders the in-panel "Choose" button (job #2). Omit for
   * pure-reference contexts (compendium browsing) where nothing is being picked.
   */
  onChoose?: () => void;
  chooseLabel?: string;
  /** Which layers to expand by default. Beginners want L1; veterans open L3. */
  defaultExpanded?: ('derivation' | 'rules')[];
  /** The lookup is still resolving — show the candle-breath skeleton. */
  loading?: boolean;
}

const kickerStyle: CSSProperties = {
  fontFamily: 'var(--qa-font-mono)',
  fontSize: 8.5,
  letterSpacing: 'var(--qa-track-label)',
  textTransform: 'uppercase',
  color: 'var(--qa-glass-dim)',
};

const cardShell: CSSProperties = {
  width: 300,
  borderRadius: 'var(--qa-radius-lg)',
  background: 'var(--qa-glass-raised)',
  border: '1px solid var(--qa-glass-border)',
  backdropFilter: 'blur(var(--qa-blur-heavy))',
  WebkitBackdropFilter: 'blur(var(--qa-blur-heavy))',
  boxShadow: 'var(--qa-shadow-menu)',
  display: 'flex',
  flexDirection: 'column',
  color: 'var(--qa-glass-text)',
};

export function InfoPanel({
  open,
  data,
  onClose,
  onChoose,
  chooseLabel = 'Choose',
  defaultExpanded = [],
  loading = false,
}: InfoPanelProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const [showDerivation, setShowDerivation] = useState(defaultExpanded.includes('derivation'));
  const [showRules, setShowRules] = useState(defaultExpanded.includes('rules'));

  // Escape closes; focus moves into the panel on open (accessibility).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Reset layer state when the subject changes.
  useEffect(() => {
    setShowDerivation(defaultExpanded.includes('derivation'));
    setShowRules(defaultExpanded.includes('rules'));
  }, [data?.name]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <div
      className="flex fixed inset-0 z-50 justify-center items-center"
      style={{ background: 'color-mix(in srgb, var(--qa-ink) 55%, transparent)' }}
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{ ...cardShell, outline: 'none', animation: 'qa-info-rise var(--qa-dur) var(--qa-ease)' }}
      >
        {loading ? (
          <LoadingSkeleton />
        ) : !data ? (
          <NotFound onClose={onClose} />
        ) : (
          <>
            {/* header — kicker over title, homebrew badge inline */}
            <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={kickerStyle}>{data.kind}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span
                  id={titleId}
                  style={{
                    fontFamily: 'var(--qa-font-display)',
                    fontSize: 'var(--qa-text-xl)',
                    color: 'var(--qa-glass-text)',
                  }}
                >
                  {data.name}
                </span>
                {data.source === 'homebrew' && <HomebrewBadge />}
              </span>
            </div>

            {/* Layer 1 — always visible */}
            <div style={{ padding: '12px 16px', fontSize: 15, lineHeight: 1.5, color: 'var(--qa-glass-text)' }}>
              {data.summary}
            </div>

            {/* Layer 2 — derivation, collapsible */}
            {data.derivation && data.derivation.length > 0 && (
              <>
                <Toggle
                  label="Where the numbers come from"
                  open={showDerivation}
                  onToggle={() => setShowDerivation((v) => !v)}
                  active={showDerivation}
                />
                {showDerivation && (
                  <dl style={{ margin: '0 16px', display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: 12 }}>
                    {data.derivation.map((line, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <dt style={{ fontSize: 12.5, color: 'var(--qa-glass-dim)' }}>{line.label}</dt>
                          <dd style={{ margin: 0, fontFamily: 'var(--qa-font-mono)', fontSize: 12.5, color: 'var(--qa-glass-text)' }}>
                            {line.value}
                          </dd>
                        </div>
                        {line.parts && (
                          <span style={{ fontFamily: 'var(--qa-font-mono)', fontSize: 9.5, color: 'var(--qa-vellum-faint)' }}>
                            {line.parts.map((p, j) => `${j > 0 ? ' + ' : ''}${p.value} ${p.label}`).join('')}
                          </span>
                        )}
                      </div>
                    ))}
                  </dl>
                )}
              </>
            )}

            {/* Layer 3 — full rules text, collapsible */}
            {data.rulesText && (
              <>
                <Toggle
                  label="Full rules text"
                  open={showRules}
                  onToggle={() => setShowRules((v) => !v)}
                  active={showRules}
                />
                {showRules && (
                  <div
                    style={{
                      margin: '0 16px 16px',
                      padding: '10px 12px',
                      borderRadius: 'var(--qa-radius-sm)',
                      background: 'var(--qa-vellum-ghost)',
                      fontSize: 12,
                      lineHeight: 1.55,
                      color: 'var(--qa-glass-dim)',
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {data.rulesText}
                  </div>
                )}
              </>
            )}

            {data.extra}

            {/* Job #2 — Choose lives INSIDE the panel */}
            {onChoose && (
              <div style={{ padding: '12px 16px', borderTop: '1px solid var(--qa-glass-border)' }}>
                <button
                  onClick={onChoose}
                  style={{
                    width: '100%',
                    fontFamily: 'var(--qa-font-display)',
                    fontSize: 15,
                    letterSpacing: '.5px',
                    border: 'none',
                    borderRadius: 'var(--qa-radius-sm)',
                    padding: 12,
                    background: 'linear-gradient(180deg,var(--qa-ember),var(--qa-ember-deep))',
                    color: 'var(--qa-vellum-bright)',
                    boxShadow: 'var(--qa-glow-ember)',
                    cursor: 'pointer',
                  }}
                >
                  {chooseLabel === 'Choose' ? `Choose ${data.name}` : chooseLabel}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes qa-info-rise { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
        @media (prefers-reduced-motion: reduce) { [role="dialog"] { animation: none !important } }
      `}</style>
    </div>
  );
}

/** A layer toggle — uppercase mono row with a chevron, top-bordered. */
function Toggle({
  label,
  open,
  onToggle,
  active,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onToggle}
      aria-expanded={open}
      style={{
        margin: '0 16px',
        display: 'flex',
        justifyContent: 'space-between',
        background: 'none',
        border: 'none',
        borderTop: '1px solid var(--qa-glass-border)',
        padding: '10px 0',
        fontFamily: 'var(--qa-font-mono)',
        fontSize: 10,
        letterSpacing: 'var(--qa-track-label)',
        textTransform: 'uppercase',
        // an open section reads in full-strength ink, a closed one dims
        color: active ? 'var(--qa-glass-text)' : 'var(--qa-glass-dim)',
        cursor: 'pointer',
      }}
    >
      {label} <span aria-hidden>{open ? '▾' : '▸'}</span>
    </button>
  );
}

function HomebrewBadge() {
  // "Custom content never looks second-class" — a quiet gold tint, not a warning.
  return (
    <span
      style={{
        fontFamily: 'var(--qa-font-mono)',
        fontSize: 8.5,
        letterSpacing: 'var(--qa-track-label)',
        textTransform: 'uppercase',
        padding: '2px 7px',
        borderRadius: 'var(--qa-radius-xs)',
        color: 'var(--qa-gold)',
        border: '1px solid color-mix(in srgb, var(--qa-gold) 50%, transparent)',
      }}
    >
      Homebrew
    </span>
  );
}

/** The candle-breath skeleton while a lookup resolves. */
function LoadingSkeleton() {
  const bar = (w: string | number, h: number): CSSProperties => ({
    width: w,
    height: h,
    borderRadius: 2,
    background: 'var(--qa-vellum-ghost)',
  });
  return (
    // qa- class so the base.css reduced-motion guard stops the breath
    <div className="qa-info-loading" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, animation: 'qa-candle 3.2s infinite' }}>
      <span style={bar(80, 8)} />
      <span style={bar(150, 16)} />
      <span style={bar('100%', 8)} />
      <span style={bar('70%', 8)} />
    </div>
  );
}

function NotFound({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontFamily: 'var(--qa-font-display)', fontSize: 17, color: 'var(--qa-glass-text)' }}>
        Nothing to show
      </span>
      <span style={{ fontSize: 12.5, fontStyle: 'italic', color: 'var(--qa-glass-dim)' }}>
        We couldn't find that entry.{' '}
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', padding: 0, color: 'var(--qa-ember-bright)', cursor: 'pointer', font: 'inherit', fontStyle: 'italic' }}
        >
          Close this
        </button>{' '}
        and try the search.
      </span>
    </div>
  );
}
