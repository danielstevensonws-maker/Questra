/**
 * The ws + Fastify transport adapter (ADR-0011) — the thin layer that binds real
 * WebSocket sockets to SyncCore through the Connection interface. All protocol
 * logic lives in SyncCore; this file only translates sockets ↔ messages.
 *
 * Run with `npm run dev -w @questra/server`. The SyncCore passed in carries the
 * real `resolveToken` (Brief 14 §1: `makeResolveToken`) when auth is wired; the
 * intent resolver is still the engine pipeline seam (Brief 02).
 */
import { pathToFileURL } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
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
  /** The web app's origin (undefined ⇒ no CORS registered — tests hit the app directly). */
  corsOrigin?: string;
}

/** Start the HTTP (Fastify) + WebSocket (ws) server. Returns a stop() handle. */
export async function start(opts: StartOptions): Promise<{ port: number; stop: () => Promise<void> }> {
  const app = Fastify({ logger: false });
  if (opts.corsOrigin) {
    // credentialed (the refresh cookie) — `*` can't carry credentials, so this is a
    // named origin, not a wildcard (ADR-0004 spirit: least surface, not "allow everyone").
    await app.register(cors, { origin: opts.corsOrigin, credentials: true });
  }
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

// ---------------------------------------------------------------- entrypoint
/**
 * Run directly (`npm run dev -w @questra/server`) — the ADR-0015 dev-env entrypoint.
 * Loads .env.local, builds the wired app (Postgres if DATABASE_URL is set), mounts
 * /auth/* + the real resolveToken, and listens on 0.0.0.0 so a second physical
 * device can join. Guarded so importing this module (tests) does not start a server.
 */
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { loadDotEnvLocal, readConfig } = await import('./config.js');
  const { createApp } = await import('./app.js');
  loadDotEnvLocal();
  const config = readConfig();
  const built = createApp(config);
  const { port } = await start({ core: built.core, auth: built.auth, port: config.port, corsOrigin: config.webOrigin });
  const where = config.databaseUrl ? 'Postgres (durable)' : 'in-memory (no DATABASE_URL)';
  console.log(`[questra] server on http://0.0.0.0:${port} — store: ${where}`);
  const shutdown = async () => { await built.close(); process.exit(0); };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}
