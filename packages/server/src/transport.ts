/**
 * The transport seam (ADR-0011: "WebSockets via ws behind a thin transport
 * interface"). SyncCore talks to Connections through this interface, never to
 * `ws` directly — so the wire logic is testable over an in-memory socket pair
 * with no real network, and the transport vendor stays swappable.
 */
import type { ClientMsg, ServerMsg } from '@questra/contracts';

/** One connected client, from the server's point of view. */
export interface Connection {
  /** Stable id for this socket (not the accountId; a client may reconnect with a new one). */
  connId: string;
  /** Send a server message to this client. */
  send(msg: ServerMsg): void;
  /** Close the connection (optionally with a reason). */
  close(reason?: string): void;
}

/** What SyncCore needs from the host: a way to receive messages + connect/disconnect signals. */
export interface TransportHandlers {
  onConnect(conn: Connection): void;
  onMessage(conn: Connection, msg: ClientMsg): void;
  onDisconnect(conn: Connection): void;
}

/**
 * An in-memory connection pair for tests: the server-side Connection plus a
 * client handle that captures every ServerMsg the server sends and lets the test
 * push ClientMsgs in.
 */
export interface MemoryClient {
  connId: string;
  /** All messages the server sent to this client, in order (the "capture"). */
  received: ServerMsg[];
  /** Push a client → server message. */
  send(msg: ClientMsg): void;
  /** Simulate the socket dropping. */
  disconnect(): void;
  /** True once close() was called on the server side. */
  closed: boolean;
}

let memCounter = 0;
/** Deterministic-ish id (tests may pass an explicit id for reproducibility). */
function nextConnId(explicit?: string): string {
  return explicit ?? `conn-${++memCounter}`;
}

/** Create a Connection + MemoryClient bound to a SyncCore's handlers. */
export function connectMemory(handlers: TransportHandlers, connId?: string): MemoryClient {
  const id = nextConnId(connId);
  const client: MemoryClient = {
    connId: id,
    received: [],
    send(msg) {
      handlers.onMessage(conn, msg);
    },
    disconnect() {
      handlers.onDisconnect(conn);
    },
    closed: false,
  };
  const conn: Connection = {
    connId: id,
    send(msg) {
      client.received.push(msg);
    },
    close() {
      client.closed = true;
      handlers.onDisconnect(conn);
    },
  };
  handlers.onConnect(conn);
  return client;
}
