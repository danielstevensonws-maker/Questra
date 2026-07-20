/**
 * SyncClient — the browser half of the wire protocol (Brief 05, client side).
 *
 * A thin WebSocket wrapper: connect → `hello` with a token → apply `welcome`
 * (the viewer-filtered projection snapshot) → apply each `event` by folding it
 * into projection state (the SAME `fold` the server used, §2.8) → send intents.
 *
 * It holds NO game logic and invents NO values. Projection state comes only from
 * the server's snapshot + `fold(events)`; a roll's dice come only from the
 * `roll_made` body (ADR-0008). The client's whole job is transport + apply.
 *
 * Transport-only, framework-agnostic — the React hook (useSync) subscribes to it.
 */
import {
  ClientMsgSchema, ServerMsgSchema,
  type ClientMsg, type ServerMsg, type PlayEvent,
} from '@questra/contracts';
import { fold, type ProjectionState } from '@questra/engine';

export type ConnStatus = 'connecting' | 'open' | 'closed' | 'error' | 'auth_failed';

export interface SyncState {
  status: ConnStatus;
  /** viewer role from `welcome`; undefined until welcomed. */
  role?: 'dm' | 'player' | 'table_display' | undefined;
  /** the folded projection — server snapshot + every applied event. */
  projection: ProjectionState;
  /** the highest seq applied (for reconnect `lastSeq`). */
  lastSeq: number;
  /** every event received, in order (the client-side log the UI derives from). */
  log: PlayEvent[];
  /** last error code the server sent, if any. */
  error?: string | undefined;
}

export interface SyncClientOptions {
  url: string;
  playSessionId: string;
  token: string;
  /** notified on every state change. */
  onState: (state: SyncState) => void;
  /** notified for each event as it arrives (e.g. to drive the dice tray on roll_made). */
  onEvent?: (event: PlayEvent) => void;
  /** injectable for tests; defaults to the global WebSocket. */
  WebSocketImpl?: typeof WebSocket;
}

const EMPTY_PROJECTION: ProjectionState = { combatants: {}, round: 0, nextSeq: 0 };

export class SyncClient {
  private ws: WebSocket | null = null;
  private state: SyncState = { status: 'connecting', projection: EMPTY_PROJECTION, lastSeq: 0, log: [] };
  private opts: SyncClientOptions;
  /** the server's snapshot base; events fold on top of it. */
  private base: ProjectionState = EMPTY_PROJECTION;
  /** reconnect bookkeeping. */
  private retries = 0;
  private closedByUs = false;
  /** set when the server rejects our token — a drop after this must NOT retry
   *  (a bad/expired token won't fix itself). Survives the `close` status patch. */
  private authFailed = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: SyncClientOptions) {
    this.opts = opts;
  }

  /** Open the socket and send `hello`. Call once; drops auto-reconnect after. */
  connect(): void {
    this.closedByUs = false;
    this.open();
  }

  /** Reconnect resuming from lastSeq (the server replays the gap). Public for tests. */
  reconnect(): void {
    this.open();
  }

  /**
   * Open a socket and `hello`. A first connect sends no lastSeq (fresh snapshot);
   * a reconnect sends lastSeq so the server replays only the gap. On an unexpected
   * close it retries with backoff — UNLESS the drop was an auth failure (a bad or
   * expired token won't fix itself) or we closed on purpose.
   */
  private open(): void {
    const WS = this.opts.WebSocketImpl ?? WebSocket;
    const ws = new WS(this.opts.url);
    this.ws = ws;
    this.patch({ status: 'connecting' });

    ws.addEventListener('open', () => {
      this.retries = 0;
      const hello: ClientMsg = this.state.lastSeq > 0
        ? { m: 'hello', playSessionId: this.opts.playSessionId, token: this.opts.token, lastSeq: this.state.lastSeq }
        : { m: 'hello', playSessionId: this.opts.playSessionId, token: this.opts.token };
      this.send(hello);
      this.patch({ status: 'open' });
    });
    ws.addEventListener('message', (ev: MessageEvent) => this.onMessage(ev));
    ws.addEventListener('close', () => {
      // keep auth_failed visible on drop (don't mask the real reason with 'closed').
      if (!this.authFailed) this.patch({ status: 'closed' });
      this.scheduleReconnect();
    });
    ws.addEventListener('error', () => this.patch({ status: 'error' }));
  }

  /** Retry with capped exponential backoff, unless we closed on purpose or auth failed. */
  private scheduleReconnect(): void {
    if (this.closedByUs || this.authFailed) return;
    const delay = Math.min(1000 * 2 ** this.retries, 10_000); // 1s → 2s → 4s → … → 10s cap
    this.retries += 1;
    this.reconnectTimer = setTimeout(() => this.open(), delay);
  }

  /** Send an intent envelope. The server validates, rules on legality, and emits.
   *  `intent` is validated by ClientMsgSchema in `send()`; a bad shape throws there. */
  sendIntent(idempotencyKey: string, intent: unknown): void {
    // cast at the boundary: the schema parse in send() is the real gate.
    this.send({ m: 'intent', envelope: { idempotencyKey, intent } } as ClientMsg);
  }

  disconnect(): void {
    this.closedByUs = true; // suppress the auto-reconnect on this close
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    this.ws?.close();
    this.ws = null;
  }

  getState(): SyncState {
    return this.state;
  }

  // ---- internals ---------------------------------------------------------

  private send(msg: ClientMsg): void {
    // validate our own outbound shape so a bug here fails loud, not on the wire.
    const parsed = ClientMsgSchema.safeParse(msg);
    if (!parsed.success) throw new Error(`SyncClient: refusing to send malformed ${msg.m}`);
    this.ws?.send(JSON.stringify(parsed.data));
  }

  private onMessage(ev: MessageEvent): void {
    let json: unknown;
    try { json = JSON.parse(String(ev.data)); } catch { return; }
    const parsed = ServerMsgSchema.safeParse(json);
    if (!parsed.success) return; // ignore anything off-contract
    this.apply(parsed.data);
  }

  private apply(msg: ServerMsg): void {
    switch (msg.m) {
      case 'welcome': {
        // the snapshot IS the folded projection at snapshotSeq (opaque on the wire,
        // engine-typed here). Adopt it as the base; live events fold on top.
        this.base = (msg.snapshot as ProjectionState) ?? EMPTY_PROJECTION;
        // clear any prior error explicitly (welcome means we're in).
        this.state = { ...this.state, error: undefined };
        this.patch({
          role: msg.viewer.role,
          projection: this.base,
          lastSeq: msg.snapshotSeq,
          log: [],
        });
        return;
      }
      case 'event': {
        const log = [...this.state.log, msg.event];
        this.patch({
          log,
          projection: fold(this.base, log), // the one projection function (§2.8)
          lastSeq: Math.max(this.state.lastSeq, msg.event.seq),
        });
        this.opts.onEvent?.(msg.event);
        return;
      }
      case 'error': {
        if (msg.code === 'auth' || msg.code === 'not_member') this.authFailed = true;
        const status: ConnStatus = this.authFailed ? 'auth_failed' : this.state.status;
        this.patch({ status, error: msg.code });
        return;
      }
      // presence / acks / pong: not needed to render the slice's hub; ignore for now.
      case 'presence':
      case 'intent_ack':
      case 'intent_rejected':
      case 'pong':
        return;
    }
  }

  private patch(delta: Partial<SyncState>): void {
    this.state = { ...this.state, ...delta };
    this.opts.onState(this.state);
  }
}
