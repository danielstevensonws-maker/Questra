/**
 * InfoPanel — the 3-layer "?".  THE REFERENCE PRIMITIVE.
 *
 * Rebuilt to the Claude Design handoff (design_handoff_infopanel/). A right-side
 * slide-over over the dark translucent "glass" ground — not a modal. Renders any
 * game entity in three progressive layers, every value bound to a --qa-* token
 * (ADR-0014): drop a new token set into @questra/theme and this re-themes with no
 * edits here.
 *
 * THE TWO ENTRY PATHS (the one interaction rule)
 * The panel opens two ways and leads with a different layer in each. It is the
 * SAME panel both times — only two things differ, nothing else:
 *   "explain" (Path 1 — the ? on a number, Player View): leads with the L2
 *             derivation; the Choose footer is always absent (pure reference).
 *   "read"    (Path 2 — the entity's own card, Wizard/Compendium/…): leads with
 *             the L1 summary; the Choose footer shows in pick contexts.
 *   l2ExpandedByDefault = (mode === "explain") && hasDerivation
 *   footerVisible       = (mode === "read")    && showChoose
 *
 * The panel takes a thin `InfoPanelData` view-model, never a contracts entity
 * directly — non-entity things (a computed AC from a sheet, a homebrew draft)
 * need it too. `entityToInfoPanel()` is the only entity→view-model mapping.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { DerivationLine, InfoPanelData } from './entityToInfoPanel.js';

/** How the panel was entered — sets the default-expanded layer. */
export type InfoPanelMode = 'explain' | 'read';

export interface InfoPanelProps {
  data: InfoPanelData;
  open?: boolean;
  onClose: () => void;
  /** Path 1 vs Path 2. Default "read". */
  openMode?: InfoPanelMode;
  /**
   * Whether a Choose footer appears. Honoured only in "read" mode — in
   * "explain" mode the footer is always absent. True for pick contexts
   * (wizard, level-up), false for pure browsing (compendium).
   */
  showChoose?: boolean;
  onChoose?: (data: InfoPanelData) => void;
  /** Footer label; defaults to "Choose". */
  chooseLabel?: string;
}

const mono = 'var(--qa-font-mono)';
const body = 'var(--qa-font-body)';
const display = 'var(--qa-font-display)';

export function InfoPanel({
  data,
  open = true,
  onClose,
  openMode = 'read',
  showChoose = false,
  onChoose,
  chooseLabel,
}: InfoPanelProps) {
  const panelRef = useRef<HTMLElement>(null);

  const hasDerivation = data.derivation !== undefined && data.derivation.length > 0;
  const hasRules = data.rulesText !== undefined && data.rulesText.trim() !== '';

  // "explain" leads with the derivation; "read" leads with the summary.
  const l2Default = openMode === 'explain' && hasDerivation;
  // Choose is only ever shown when reading to pick — never when explaining.
  const footerVisible = openMode === 'read' && showChoose;

  const [l2Open, setL2Open] = useState(l2Default);
  const [l3Open, setL3Open] = useState(false);

  // Collapse state resets whenever the entity or the entry mode changes —
  // otherwise a freshly-opened panel would inherit the previous layers.
  useEffect(() => {
    setL2Open(l2Default);
    setL3Open(false);
  }, [data.name, l2Default]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Focus moves into the panel on open, so keyboard users land inside it.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  const close = useCallback(() => onClose(), [onClose]);

  if (!open) return null;

  return (
    <div style={{ position: 'absolute', inset: 0, fontFamily: body, color: 'var(--qa-ink)' }}>
      {/* scrim — click closes; a light blur so the map reads as "behind" */}
      <div
        className="qa-infopanel-scrim"
        onClick={close}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 10,
          background: 'var(--qa-scrim)',
          backdropFilter: 'blur(2px)',
          WebkitBackdropFilter: 'blur(2px)',
          animation: 'qa-scrim-in var(--qa-dur) var(--qa-ease)',
        }}
      />

      {/* panel */}
      <aside
        ref={panelRef}
        className="qa-infopanel"
        role="dialog"
        aria-modal="true"
        aria-label={data.name}
        tabIndex={-1}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          zIndex: 11,
          height: '100%',
          width: 428,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--qa-glass)',
          borderLeft: 'var(--qa-hairline) solid var(--qa-glass-border)',
          backdropFilter: 'blur(var(--qa-glass-blur))',
          WebkitBackdropFilter: 'blur(var(--qa-glass-blur))',
          boxShadow: 'var(--qa-shadow-pop)',
          outline: 'none',
          animation: 'qa-panel-in var(--qa-dur-slow) var(--qa-ease-out)',
        }}
      >
        {/* ---- header --------------------------------------------------- */}
        <header
          style={{
            flex: 'none',
            background: 'var(--qa-glass-solid)',
            borderBottom: 'var(--qa-hairline) solid var(--qa-glass-border)',
            padding: 'var(--qa-s5) var(--qa-s5) var(--qa-s4)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--qa-s3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--qa-s2)', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontFamily: mono,
                  fontSize: 'var(--qa-text-whisper)',
                  letterSpacing: 'var(--qa-tracking-caps)',
                  textTransform: 'uppercase',
                  color: 'var(--qa-ink-dim)',
                }}
              >
                {data.kind}
              </span>
              {data.homebrew === true && (
                <span
                  style={{
                    fontFamily: mono,
                    fontSize: 9,
                    letterSpacing: 'var(--qa-tracking-caps)',
                    textTransform: 'uppercase',
                    color: 'var(--qa-accent)',
                    background: 'var(--qa-accent-soft)',
                    border: 'var(--qa-hairline) solid var(--qa-accent-line)',
                    padding: '2px 8px',
                    borderRadius: 'var(--qa-radius-round)',
                  }}
                >
                  Homebrew
                </span>
              )}
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
                margin: '-4px -6px 0 0',
                background: 'transparent',
                border: 'none',
                borderRadius: 'var(--qa-radius)',
                color: 'var(--qa-ink-faint)',
                fontFamily: mono,
                fontSize: 16,
                cursor: 'pointer',
                transition: 'color var(--qa-dur) var(--qa-ease)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--qa-ink)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--qa-ink-faint)')}
            >
              ✕
            </button>
          </div>
          <h2
            style={{
              fontFamily: display,
              fontWeight: 400,
              fontSize: 'var(--qa-text-title)',
              lineHeight: 1.08,
              margin: 'var(--qa-s2) 0 0',
              color: 'var(--qa-ink)',
            }}
          >
            {data.name}
          </h2>
        </header>

        {/* ---- body ----------------------------------------------------- */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--qa-s5)' }}>
          {/* Layer 1 — always visible */}
          <p
            style={{
              fontFamily: body,
              fontSize: 'var(--qa-text-lg)',
              lineHeight: 1.5,
              color: 'var(--qa-ink)',
              margin: 0,
              textWrap: 'pretty',
            }}
          >
            {data.summary}
          </p>

          {/* Layer 2 — where the numbers come from */}
          {hasDerivation && (
            <section style={{ marginTop: 'var(--qa-s5)', borderTop: 'var(--qa-hairline) solid var(--qa-glass-border)' }}>
              <CollapseHeader label="Where the numbers come from" open={l2Open} onToggle={() => setL2Open((v) => !v)} />
              {l2Open && (
                <div style={{ paddingBottom: 'var(--qa-s2)' }}>
                  {data.derivation!.map((row, i) => (
                    <DerivationRow key={row.label} row={row} first={i === 0} />
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Layer 3 — the verbatim rules text */}
          {hasRules && (
            <section style={{ marginTop: 'var(--qa-s4)', borderTop: 'var(--qa-hairline) solid var(--qa-glass-border)' }}>
              <CollapseHeader label="Full rules text" open={l3Open} onToggle={() => setL3Open((v) => !v)} />
              {l3Open && (
                <div
                  style={{
                    fontFamily: body,
                    fontSize: 'var(--qa-text-body)',
                    lineHeight: 1.6,
                    color: 'var(--qa-ink-dim)',
                    whiteSpace: 'pre-line',
                    paddingBottom: 'var(--qa-s2)',
                    textWrap: 'pretty',
                  }}
                >
                  {data.rulesText}
                </div>
              )}
            </section>
          )}
        </div>

        {/* ---- footer: deciding happens HERE (Path 2 pick contexts) ----- */}
        {footerVisible && (
          <footer
            style={{
              flex: 'none',
              background: 'var(--qa-glass-solid)',
              borderTop: 'var(--qa-hairline) solid var(--qa-glass-border)',
              padding: 'var(--qa-s4) var(--qa-s5)',
            }}
          >
            <button
              type="button"
              onClick={() => onChoose?.(data)}
              style={{
                width: '100%',
                height: 48,
                display: 'grid',
                placeItems: 'center',
                background: 'var(--qa-accent)',
                color: 'var(--qa-accent-ink)',
                border: 'none',
                borderRadius: 'var(--qa-radius)',
                fontFamily: body,
                fontSize: 'var(--qa-text-body)',
                fontWeight: 500,
                letterSpacing: '0.01em',
                cursor: 'pointer',
                transition: 'box-shadow var(--qa-dur) var(--qa-ease), transform var(--qa-dur-fast) var(--qa-ease)',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 8px 24px -8px var(--qa-accent-glow)')}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(1px)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {chooseLabel ?? 'Choose'}
            </button>
          </footer>
        )}
      </aside>
    </div>
  );
}

/** A collapsible info layer's header. */
function CollapseHeader({ label, open, onToggle }: { label: string; open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 'var(--qa-s3)',
        padding: 'var(--qa-s4) 0 var(--qa-s3)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        textAlign: 'left',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.82')}
      onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
    >
      <span
        style={{
          fontFamily: mono,
          fontSize: 'var(--qa-text-label)',
          letterSpacing: 'var(--qa-tracking-caps)',
          textTransform: 'uppercase',
          color: 'var(--qa-ink-dim)',
        }}
      >
        {label}
      </span>
      <span aria-hidden="true" style={{ fontFamily: mono, fontSize: 'var(--qa-text-label)', color: 'var(--qa-ink-faint)' }}>
        {open ? '▾' : '▸'}
      </span>
    </button>
  );
}

/** One derivation line: prose label (left), mono value + optional parts (right). */
function DerivationRow({ row, first }: { row: DerivationLine; first: boolean }) {
  const rowStyle: CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 'var(--qa-s4)',
    padding: 'var(--qa-s3) 0',
    ...(first ? {} : { borderTop: 'var(--qa-hairline) solid var(--qa-glass-border)' }),
  };
  return (
    <div style={rowStyle}>
      <div style={{ fontFamily: body, fontSize: 'var(--qa-text-body)', color: 'var(--qa-ink-dim)', flex: 1 }}>{row.label}</div>
      <div style={{ textAlign: 'right', flex: 'none' }}>
        <div style={{ fontFamily: mono, fontSize: 'var(--qa-text-body)', color: 'var(--qa-ink)', lineHeight: 1.2 }}>{row.value}</div>
        {row.parts !== undefined && (
          <div style={{ fontFamily: mono, fontSize: 'var(--qa-text-whisper)', color: 'var(--qa-ink-faint)', lineHeight: 1.4, marginTop: 3 }}>
            {row.parts}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * ExplainButton — the "?" affordance for Path 1.
 *
 * Sits on a number/chip and reads as "there's more here" without competing with
 * the number. Wire onClick to open the InfoPanel with openMode="explain".
 * States (resting / hover / focus / pressed) all bind to --qa-* tokens.
 */
export function ExplainButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      style={{
        display: 'inline-grid',
        placeItems: 'center',
        width: 16,
        height: 16,
        borderRadius: 'var(--qa-radius-round)',
        fontFamily: mono,
        fontSize: 10,
        lineHeight: 1,
        padding: 0,
        cursor: 'pointer',
        background: 'var(--qa-chip)',
        color: 'var(--qa-ink-faint)',
        border: 'var(--qa-hairline) solid transparent',
        transition: 'all var(--qa-dur) var(--qa-ease)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--qa-ink)';
        e.currentTarget.style.borderColor = 'var(--qa-accent-line)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--qa-ink-faint)';
        e.currentTarget.style.borderColor = 'transparent';
      }}
      onFocus={(e) => {
        e.currentTarget.style.color = 'var(--qa-ink)';
        e.currentTarget.style.borderColor = 'var(--qa-accent-line)';
        e.currentTarget.style.boxShadow = '0 0 0 2px var(--qa-accent-soft)';
      }}
      onBlur={(e) => {
        e.currentTarget.style.color = 'var(--qa-ink-faint)';
        e.currentTarget.style.borderColor = 'transparent';
        e.currentTarget.style.boxShadow = 'none';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.background = 'var(--qa-accent-soft)';
        e.currentTarget.style.color = 'var(--qa-accent)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.background = 'var(--qa-chip)';
      }}
    >
      ?
    </button>
  );
}
