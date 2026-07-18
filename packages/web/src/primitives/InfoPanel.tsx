/**
 * InfoPanel — THE primitive. Character Wizard §4: "one component, used
 * everywhere." Reused by: wizard, compendium, session planner, level-up,
 * homebrew builder, community library.
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
 * Themed entirely via CSS variables (theme/tokens.css). No hardcoded look.
 * Design token set drops into tokens.css and this re-themes with no edits here.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

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
}

export function InfoPanel({
  open,
  data,
  onClose,
  onChoose,
  chooseLabel = 'Choose',
  defaultExpanded = [],
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

  if (!open || !data) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      style={{ background: 'var(--q-overlay)' }}
      onClick={onClose}
      aria-hidden={false}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-md overflow-y-auto outline-none"
        style={{
          background: 'var(--q-surface)',
          boxShadow: 'var(--q-shadow-pop)',
          borderLeft: '1px solid var(--q-line)',
          animation: 'q-slide-in var(--q-dur) var(--q-ease)',
        }}
      >
        {/* header */}
        <header
          className="sticky top-0 flex items-start justify-between gap-3 px-6 py-4"
          style={{ background: 'var(--q-surface)', borderBottom: '1px solid var(--q-line)' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <h2 id={titleId} style={{ fontFamily: 'var(--q-font-display)', fontSize: 'var(--q-text-2xl)', lineHeight: 'var(--q-leading-tight)', color: 'var(--q-ink)' }}>
                {data.name}
              </h2>
              {data.source === 'homebrew' && <HomebrewBadge />}
            </div>
            <p style={{ fontSize: 'var(--q-text-sm)', color: 'var(--q-ink-faint)', marginTop: 'var(--q-space-1)' }}>
              {data.kind}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded"
            style={{ color: 'var(--q-ink-faint)', fontSize: 'var(--q-text-xl)', lineHeight: 1, padding: 'var(--q-space-1)' }}
          >
            ✕
          </button>
        </header>

        <div className="px-6 py-5" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--q-space-5)' }}>
          {/* Layer 1 — always visible */}
          <p style={{ fontSize: 'var(--q-text-lg)', lineHeight: 'var(--q-leading-normal)', color: 'var(--q-ink)' }}>
            {data.summary}
          </p>

          {/* Layer 2 — derivation, collapsible */}
          {data.derivation && data.derivation.length > 0 && (
            <Section
              title="Where the numbers come from"
              open={showDerivation}
              onToggle={() => setShowDerivation((v) => !v)}
            >
              <ul style={{ display: 'flex', flexDirection: 'column', gap: 'var(--q-space-2)' }}>
                {data.derivation.map((line, i) => (
                  <li key={i} style={{ fontSize: 'var(--q-text-sm)' }}>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--q-ink-soft)' }}>{line.label}</span>
                      <span style={{ color: 'var(--q-ink)', fontFamily: 'var(--q-font-mono)' }}>{line.value}</span>
                    </div>
                    {line.parts && (
                      <div style={{ marginTop: 'var(--q-space-1)', paddingLeft: 'var(--q-space-3)', color: 'var(--q-ink-faint)', fontSize: 'var(--q-text-xs)', fontFamily: 'var(--q-font-mono)' }}>
                        {line.parts.map((p, j) => (
                          <span key={j}>{j > 0 ? ' + ' : ''}{p.value} {p.label}</span>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Layer 3 — full rules text, collapsible */}
          {data.rulesText && (
            <Section title="Full rules text" open={showRules} onToggle={() => setShowRules((v) => !v)}>
              <p style={{ fontSize: 'var(--q-text-sm)', lineHeight: 'var(--q-leading-normal)', color: 'var(--q-ink-soft)', whiteSpace: 'pre-wrap' }}>
                {data.rulesText}
              </p>
            </Section>
          )}

          {data.extra}
        </div>

        {/* Job #2 — Choose lives INSIDE the panel */}
        {onChoose && (
          <footer
            className="sticky bottom-0 px-6 py-4"
            style={{ background: 'var(--q-surface)', borderTop: '1px solid var(--q-line)' }}
          >
            <button
              onClick={onChoose}
              className="w-full rounded font-medium"
              style={{
                background: 'var(--q-accent)', color: '#fff',
                padding: 'var(--q-space-3) var(--q-space-4)',
                fontSize: 'var(--q-text-base)', borderRadius: 'var(--q-radius)',
                transition: 'background var(--q-dur-fast) var(--q-ease)',
              }}
            >
              {chooseLabel}
            </button>
          </footer>
        )}
      </div>

      <style>{`
        @keyframes q-slide-in { from { transform: translateX(16px); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        @media (prefers-reduced-motion: reduce) { [role="dialog"] { animation: none !important } }
      `}</style>
    </div>
  );
}

function Section({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between"
        aria-expanded={open}
        style={{ fontSize: 'var(--q-text-sm)', fontWeight: 600, color: 'var(--q-ink-soft)', padding: 'var(--q-space-1) 0' }}
      >
        <span>{title}</span>
        <span style={{ color: 'var(--q-ink-faint)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform var(--q-dur-fast)' }}>›</span>
      </button>
      {open && <div style={{ marginTop: 'var(--q-space-3)' }}>{children}</div>}
    </div>
  );
}

function HomebrewBadge() {
  // "Custom content never looks second-class" — a quiet tint, not a warning.
  return (
    <span
      style={{
        fontSize: 'var(--q-text-xs)', fontWeight: 600, letterSpacing: '0.03em',
        color: 'var(--q-secret)', background: 'color-mix(in srgb, var(--q-secret) 12%, transparent)',
        padding: '2px 8px', borderRadius: '999px', textTransform: 'uppercase',
      }}
    >
      Homebrew
    </span>
  );
}
