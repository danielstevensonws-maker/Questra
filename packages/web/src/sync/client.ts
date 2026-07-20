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

  constructor(opts: SyncClientOptions) {
    this.opts = opts;
  }

  /** Open the socket and send `hello`. Idempotent-ish: call once per client. */
  connect(): void {
    const WS = this.opts.WebSocketImpl ?? WebSocket;
    const ws = new WS(this.opts.url);
    this.ws = ws;
    this.patch({ status: 'connecting' });

    ws.addEventListener('open', () => {
      this.send({ m: 'hello', playSessionId: this.opts.playSessionId, token: this.opts.token });
      this.patch({ status: 'open' });
    });
    ws.addEventListener('message', (ev: MessageEvent) => this.onMessage(ev));
    ws.addEventListener('close', () => this.patch({ status: 'closed' }));
    ws.addEventListener('error', () => this.patch({ status: 'error' }));
  }

  /** Reconnect after a drop, resuming from lastSeq (the server replays the gap). */
  reconnect(): void {
    const WS = this.opts.WebSocketImpl ?? WebSocket;
    const ws = new WS(this.opts.url);
    this.ws = ws;
    this.patch({ status: 'connecting' });
    ws.addEventListener('open', () => {
      this.send({ m: 'hello', playSessionId: this.opts.playSessionId, token: this.opts.token, lastSeq: this.state.lastSeq });
      this.patch({ status: 'open' });
    });
    ws.addEventListener('message', (ev: MessageEvent) => this.onMessage(ev));
    ws.addEventListener('close', () => this.patch({ status: 'closed' }));
    ws.addEventListener('error', () => this.patch({ status: 'error' }));
  }

  /** Send an intent envelope. The server validates, rules on legality, and emits.
   *  `intent` is validated by ClientMsgSchema in `send()`; a bad shape throws there. */
  sendIntent(idempotencyKey: string, intent: unknown): void {
    // cast at the boundary: the schema parse in send() is the real gate.
    this.send({ m: 'intent', envelope: { idempotencyKey, intent } } as ClientMsg);
  }

  disconnect(): void {
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
        const status: ConnStatus = msg.code === 'auth' || msg.code === 'not_member' ? 'auth_failed' : this.state.status;
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
