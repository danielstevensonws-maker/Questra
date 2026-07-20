/**
 * The ws + Fastify transport adapter (ADR-0011) — the thin layer that binds real
 * WebSocket sockets to SyncCore through the Connection interface. All protocol
 * logic lives in SyncCore; this file only translates sockets ↔ messages.
 *
 * Run with `npm run dev -w @questra/server`. The SyncCore passed in carries the
 * real `resolveToken` (Brief 14 §1: `makeResolveToken`) when auth is wired; the
 * intent resolver is still the engine pipeline seam (Brief 02).
 */
import Fastify, { type FastifyInstance } from 'fastify';
import { WebSocketServer, type WebSocket } from 'ws';
import { ClientMsgSchema, type ServerMsg } from '@questra/contracts';
import { SyncCore } from './sync-core.js';
import type { Connection } from './transport.js';

export interface StartOptions {
  port?: number;
  core: SyncCore;
  /**
   * Optional auth wiring (Brief 14 §1). When present, /auth/* routes mount and the
   * SyncCore's `resolveToken` should be `makeResolveToken(repo, tokenCfg)`. Absent
   * ⇒ a bare sync server (dev without accounts, tests).
   */
  auth?: (app: FastifyInstance) => void;
}

/** Start the HTTP (Fastify) + WebSocket (ws) server. Returns a stop() handle. */
export async function start(opts: StartOptions): Promise<{ port: number; stop: () => Promise<void> }> {
  const app = Fastify({ logger: false });
  app.get('/health', async () => ({ ok: true }));
  opts.auth?.(app);

  const server = app.server;
  const wss = new WebSocketServer({ server });
  let connSeq = 0;

  wss.on('connection', (socket: WebSocket) => {
    const connId = `ws-${++connSeq}`;
    const conn: Connection = {
      connId,
      send(msg: ServerMsg) {
        if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(msg));
      },
      close(reason?: string) {
        socket.close(1000, reason);
      },
    };
    opts.core.onConnect(conn);

    socket.on('message', (data) => {
      let json: unknown;
      try { json = JSON.parse(String(data)); } catch { return conn.send({ m: 'error', code: 'bad_message' }); }
      const parsed = ClientMsgSchema.safeParse(json);
      if (!parsed.success) return conn.send({ m: 'error', code: 'bad_message' });
      opts.core.onMessage(conn, parsed.data);
    });
    socket.on('close', () => opts.core.onDisconnect(conn));
  });

  const port = opts.port ?? 8787;
  await app.listen({ port, host: '0.0.0.0' });
  return {
    port,
    stop: async () => {
      wss.close();
      await app.close();
    },
  };
}
