/**
 * InfoPanel — the 3-layer "?".
 *
 * THE REFERENCE PRIMITIVE. Match this file's structure when building any other
 * primitive: themed only via --qa-* tokens, driven by a thin view-model derived
 * from contracts shapes, storybook against real fixtures.
 *
 * It does three jobs:
 *
 * 1. IT INFORMS, IN THREE LAYERS — which map 1:1 onto the contracts entity, so
 *    one panel renders any entity type (official or homebrew) with zero
 *    per-type code:
 *      L1 plain sentence   — always visible, large type. Beginners live here.
 *      L2 derivation       — collapsible "Where the numbers come from".
 *      L3 full rules text  — collapsible, verbatim. Veterans open this.
 *
 * 2. IT SELECTS — the Choose button lives INSIDE the panel, in a sticky footer,
 *    so reading, understanding, and deciding are one motion rather than a
 *    read-then-go-back-and-pick round trip. Omit `onChoose` and the footer
 *    disappears; that is how pure-reference contexts (the compendium) use it.
 *
 * 3. IT RENDERS HOMEBREW IDENTICALLY — same panel, plus one quiet tinted badge.
 *    A tint, never a warning: custom content never looks second-class.
 *
 * Theming note: every value here is a --qa-* token read through the active
 * [data-qa-theme]. Nothing is pinned to ghost, so slate/ivory drop in later
 * with no edits to this file (ADR-0014).
 */
import { useEffect, useId, useRef, useState } from 'react';
import { Panel, Chip, Button, Label } from '@questra/ui';
import type { DerivationLine, InfoPanelData } from './entityToInfoPanel.js';

export interface InfoPanelProps {
  data: InfoPanelData;
  open: boolean;
  onClose: () => void;
  /** Present → the sticky Choose footer renders. Absent → pure reference. */
  onChoose?: () => void;
  /** Label for the choose action; defaults to the plain "Choose". */
  chooseLabel?: string;
  /** Which collapsible layers start open. */
  defaultExpanded?: { derivation?: boolean; rulesText?: boolean };
}

export function InfoPanel({
  data,
  open,
  onClose,
  onChoose,
  chooseLabel = 'Choose',
  defaultExpanded,
}: InfoPanelProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const [showDerivation, setShowDerivation] = useState(defaultExpanded?.derivation ?? false);
  const [showRules, setShowRules] = useState(defaultExpanded?.rulesText ?? false);

  // Layer state resets when the panel switches to a different subject —
  // otherwise you'd open a spell and find the previous entity's layers already
  // expanded.
  useEffect(() => {
    setShowDerivation(defaultExpanded?.derivation ?? false);
    setShowRules(defaultExpanded?.rulesText ?? false);
  }, [data.name, defaultExpanded?.derivation, defaultExpanded?.rulesText]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Focus moves into the panel on open, so keyboard users land inside it.
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const hasDerivation = data.derivation !== undefined && data.derivation.length > 0;
  const hasRules = data.rulesText !== undefined && data.rulesText.trim() !== '';

  return (
    <div
      // The scrim. Clicking it closes; clicks inside the panel stop propagating.
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'var(--qa-map-lo)',
        // The scrim is a wash, not a blackout — the map stays legible behind it.
        opacity: 0.999,
        zIndex: 50,
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(28rem, 100%)',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          animation: `q-slide-in var(--qa-dur) var(--qa-ease)`,
          outline: 'none',
        }}
      >
        <Panel
          tone="solid"
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 0,
            borderTop: 'none',
            borderRight: 'none',
            borderBottom: 'none',
          }}
        >
          {/* ---- header ------------------------------------------------- */}
          <header
            style={{
              padding: 'var(--qa-s4)',
              borderBottom: 'var(--qa-hairline) solid var(--qa-glass-border)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--qa-s4)',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <Label>{data.kind}</Label>
              <h2
                id={titleId}
                style={{
                  margin: 'var(--qa-s1) 0 0',
                  fontFamily: 'var(--qa-font-display)',
                  fontSize: '1.5rem',
                  fontWeight: 400,
                  lineHeight: 1.15,
                  color: 'var(--qa-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--qa-s4)',
                  flexWrap: 'wrap',
                }}
              >
                {data.name}
                {data.homebrew === true && <Chip tone="accent">Homebrew</Chip>}
              </h2>
            </div>
            <Button onClick={onClose} aria-label="Close">
              ✕
            </Button>
          </header>

          {/* ---- body --------------------------------------------------- */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--qa-s4)' }}>
            {/* Layer 1 — always visible, large type. */}
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--qa-font-body)',
                fontSize: '1.125rem',
                lineHeight: 1.5,
                color: 'var(--qa-ink)',
              }}
            >
              {data.summary}
            </p>

            {/* Layer 2 — where the numbers come from. */}
            {hasDerivation && (
              <Section
                title="Where the numbers come from"
                expanded={showDerivation}
                onToggle={() => setShowDerivation((v) => !v)}
              >
                <dl style={{ margin: 0, display: 'grid', gap: 'var(--qa-s1)' }}>
                  {data.derivation!.map((line) => (
                    <DerivationRow key={line.label} line={line} />
                  ))}
                </dl>
              </Section>
            )}

            {/* Layer 3 — the verbatim rules text. */}
            {hasRules && (
              <Section
                title="Full rules text"
                expanded={showRules}
                onToggle={() => setShowRules((v) => !v)}
              >
                <div
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'var(--qa-font-body)',
                    fontSize: '0.9375rem',
                    lineHeight: 1.6,
                    color: 'var(--qa-ink-dim)',
                  }}
                >
                  {data.rulesText}
                </div>
              </Section>
            )}
          </div>

          {/* ---- sticky footer: deciding happens HERE ------------------- */}
          {onChoose !== undefined && (
            <footer
              style={{
                padding: 'var(--qa-s4)',
                borderTop: 'var(--qa-hairline) solid var(--qa-glass-border)',
                background: 'var(--qa-glass-solid)',
              }}
            >
              <Button variant="primary" onClick={onChoose} style={{ width: '100%' }}>
                {chooseLabel}
              </Button>
            </footer>
          )}
        </Panel>
      </div>
    </div>
  );
}

/** A collapsible info layer. */
function Section({
  title,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: 'var(--qa-s4)' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        style={{
          appearance: 'none',
          background: 'transparent',
          border: 'none',
          padding: 0,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--qa-s1)',
          cursor: 'pointer',
          fontFamily: 'var(--qa-font-body)',
          fontSize: '0.8125rem',
          color: 'var(--qa-ink-faint)',
          textAlign: 'left',
        }}
      >
        <span aria-hidden="true">{expanded ? '▾' : '▸'}</span>
        {title}
      </button>
      {expanded && <div style={{ marginTop: 'var(--qa-s4)' }}>{children}</div>}
    </section>
  );
}

/** One derivation line: prose label, mono value, optional breakdown. */
function DerivationRow({ line }: { line: DerivationLine }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--qa-s4)' }}>
      <div style={{ minWidth: 0 }}>
        <dt
          style={{
            fontFamily: 'var(--qa-font-body)',
            fontSize: '0.9375rem',
            color: 'var(--qa-ink-dim)',
          }}
        >
          {line.label}
        </dt>
        {line.parts !== undefined && line.parts.length > 0 && (
          <div
            style={{
              fontFamily: 'var(--qa-font-mono)',
              fontSize: '0.75rem',
              color: 'var(--qa-ink-faint)',
            }}
          >
            {line.parts.join(' + ')}
          </div>
        )}
      </div>
      <dd
        style={{
          margin: 0,
          fontFamily: 'var(--qa-font-mono)',
          fontSize: '0.9375rem',
          color: 'var(--qa-ink)',
          whiteSpace: 'nowrap',
        }}
      >
        {line.value}
      </dd>
    </div>
  );
}
