/**
 * PromptHolderCard — one card, used six ways (Brief 08 §1; Brief 05 rule 7:
 * the server owns the lifecycle).
 *
 * Renders wherever the prompt's holder lives: a player's reaction (Player
 * View, that player's screen only), a monster/boss/lair (DM View), or anyone
 * when the DM answers for them (DM View, with the `asDm` note). It is an
 * overlay/interrupt surface, not part of either screen's resting layout —
 * one modal-priority prompt at a time per viewer.
 *
 * THE SERVER OWNS THE LIFECYCLE. This card only surfaces the prompt and
 * reports take/decline — it never decides the outcome. The countdown here is
 * a MIRROR of the server's real 60s default timeout, not the authority; the
 * server enforces the timeout independently. Computed from a `Date.now()`
 * baseline captured on mount and ticked every 250ms so it stays accurate
 * even if the tab throttles timers.
 *
 * THE DELIBERATE CONTRACT GAP: `context` is `string[]` — pre-summarised
 * plain lines — not the typed `PromptContext` union directly. Brief 08 §1
 * also names two DM-facing decision kinds ("ruling", "rest" — Playbook §3
 * table) that have no contracts shape yet; keeping the card generic over
 * plain lines means it doesn't need to change the day those land, or the day
 * any of the six existing PromptContext kinds gets a new field. See
 * promptContextToLines.ts for the adapter that formats the six kinds that
 * DO have a contracts shape today (CLAUDE.md non-negotiable #1: no shape
 * gets invented here in a feature).
 */
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

export interface PromptOptionVM {
  id: string;
  label: string;
  /** e.g. "Reaction", "2 actions", "DC 13 or restrained". */
  detail?: string;
}

export interface PromptHolderCardProps {
  /** Plain-language prompt kind, e.g. "Opportunity Attack", "Legendary Action". */
  kind: string;
  /** The holder's display name, e.g. "Wren", "Ancient White Dragon". */
  holder: string;
  /** Pre-summarised plain lines — see the contract-gap note above. */
  context: string[];
  /** Present for a menu of costed choices (legendary/lair); absent for a bare Take/Decline. */
  options?: PromptOptionVM[];
  /** The DM is exercising the holder's choice on their behalf. */
  asDm?: boolean;
  /** Seconds until auto-decline. Default 60 (Brief 05 rule 7). */
  timeoutSec?: number;
  /** Fires with the chosen option's id, or undefined for the bare Take. */
  onTake: (optionId?: string) => void;
  onDecline: () => void;
}

const mono = 'var(--qa-font-mono)';
const body = 'var(--qa-font-body)';
const display = 'var(--qa-font-display)';

export function PromptHolderCard({
  kind,
  holder,
  context,
  options,
  asDm = false,
  timeoutSec = 60,
  onTake,
  onDecline,
}: PromptHolderCardProps) {
  const startRef = useRef(Date.now());
  const declinedRef = useRef(false);
  const [remaining, setRemaining] = useState(timeoutSec);

  useEffect(() => {
    startRef.current = Date.now();
    declinedRef.current = false;

    const tick = () => {
      const elapsed = (Date.now() - startRef.current) / 1000;
      const next = Math.max(0, timeoutSec - elapsed);
      setRemaining(next);
      if (next <= 0 && !declinedRef.current) {
        declinedRef.current = true;
        onDecline();
      }
    };

    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [timeoutSec, onDecline]);

  const remainingWhole = Math.ceil(remaining);
  const urgent = remainingWhole <= 10;
  const pct = Math.max(0, Math.min(100, (remaining / timeoutSec) * 100));

  return (
    <section
      role="alertdialog"
      aria-label={`${kind} — ${holder}`}
      style={{
        width: 480,
        maxWidth: '100%',
        background: 'var(--qa-glass)',
        border: `var(--qa-hairline) solid ${urgent ? 'var(--qa-danger)' : 'var(--qa-glass-border)'}`,
        borderRadius: 'var(--qa-radius-lg)',
        backdropFilter: 'blur(var(--qa-glass-blur))',
        WebkitBackdropFilter: 'blur(var(--qa-glass-blur))',
        boxShadow: 'var(--qa-shadow-pop)',
        overflow: 'hidden',
        color: 'var(--qa-ink)',
        fontFamily: body,
        animation: 'qa-card-in var(--qa-dur) var(--qa-ease-out)',
      }}
    >
      {/* ---- countdown bar — a mirror of the server timeout, not the authority ---- */}
      <div style={{ height: 3, background: 'var(--qa-glass-border)' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: urgent ? 'var(--qa-danger)' : 'var(--qa-accent)',
            transition: 'width 250ms linear, background var(--qa-dur) var(--qa-ease)',
          }}
        />
      </div>

      {/* ---- header ---- */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--qa-s3)',
          padding: 'var(--qa-s5) var(--qa-s5) 0',
        }}
      >
        <span
          style={{
            fontFamily: mono,
            fontSize: 'var(--qa-text-whisper)',
            letterSpacing: 'var(--qa-tracking-caps)',
            textTransform: 'uppercase',
            color: 'var(--qa-ink-dim)',
          }}
        >
          {kind}
        </span>
        <time
          aria-label={`${remainingWhole} seconds left`}
          style={{
            fontFamily: mono,
            fontVariantNumeric: 'tabular-nums',
            fontSize: 'var(--qa-text-body)',
            color: urgent ? 'var(--qa-danger)' : 'var(--qa-ink-faint)',
          }}
        >
          {remainingWhole}s
        </time>
      </header>

      {/* ---- body ---- */}
      <div style={{ padding: 'var(--qa-s3) var(--qa-s5) var(--qa-s5)' }}>
        <h2
          style={{
            fontFamily: display,
            fontWeight: 400,
            fontSize: 'var(--qa-text-title)',
            lineHeight: 1.1,
            margin: 0,
            color: 'var(--qa-ink)',
          }}
        >
          {holder}
        </h2>

        {asDm && (
          <p
            style={{
              fontFamily: body,
              fontStyle: 'italic',
              fontSize: 'var(--qa-text-whisper)',
              color: 'var(--qa-ink-faint)',
              margin: 'var(--qa-s1) 0 0',
            }}
          >
            Answering for {holder}.
          </p>
        )}

        {context.length > 0 && (
          <ul
            style={{
              listStyle: 'none',
              margin: 'var(--qa-s4) 0 0',
              padding: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--qa-s1)',
            }}
          >
            {context.map((line, i) => (
              <li
                key={i}
                style={{
                  fontFamily: body,
                  fontSize: 'var(--qa-text-body)',
                  lineHeight: 1.5,
                  color: 'var(--qa-ink-dim)',
                }}
              >
                {line}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---- footer ---- */}
      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--qa-s2)',
          padding: 'var(--qa-s4) var(--qa-s5)',
          background: 'var(--qa-glass-solid)',
          borderTop: 'var(--qa-hairline) solid var(--qa-glass-border)',
          flexWrap: 'wrap',
        }}
      >
        {options !== undefined && options.length > 0 ? (
          options.map((option) => (
            <TakeButton key={option.id} onClick={() => onTake(option.id)}>
              {option.label}
              {option.detail !== undefined && <Detail>{option.detail}</Detail>}
            </TakeButton>
          ))
        ) : (
          <TakeButton onClick={() => onTake()}>Take</TakeButton>
        )}
        <div style={{ flex: 1, minWidth: 'var(--qa-s6)' }} />
        <DeclineButton onClick={onDecline}>Decline</DeclineButton>
      </footer>
    </section>
  );
}

function Detail({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        marginLeft: 'var(--qa-s2)',
        fontFamily: mono,
        fontSize: 'var(--qa-text-whisper)',
        letterSpacing: 'var(--qa-tracking-caps)',
        textTransform: 'uppercase',
        opacity: 0.75,
      }}
    >
      {children}
    </span>
  );
}

const btnBase: CSSProperties = {
  height: 40,
  display: 'grid',
  placeItems: 'center',
  borderRadius: 'var(--qa-radius)',
  fontFamily: body,
  fontSize: 'var(--qa-text-body)',
  fontWeight: 500,
  cursor: 'pointer',
};

function TakeButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...btnBase,
        padding: '0 var(--qa-s5)',
        background: 'var(--qa-accent)',
        color: 'var(--qa-accent-ink)',
        border: 'none',
        transition: 'box-shadow var(--qa-dur) var(--qa-ease), transform var(--qa-dur-fast) var(--qa-ease)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 8px 24px -8px var(--qa-accent-glow)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
      onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(1px)')}
      onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
    >
      {children}
    </button>
  );
}

function DeclineButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...btnBase,
        padding: '0 var(--qa-s4)',
        background: 'transparent',
        color: 'var(--qa-ink-dim)',
        border: 'var(--qa-hairline) solid transparent',
        transition: 'all var(--qa-dur) var(--qa-ease)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--qa-danger)';
        e.currentTarget.style.background = 'var(--qa-danger-soft)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--qa-ink-dim)';
        e.currentTarget.style.background = 'transparent';
      }}
    >
      {children}
    </button>
  );
}
