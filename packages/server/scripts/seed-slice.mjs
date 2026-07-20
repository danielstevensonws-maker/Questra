/**
 * seed:slice — one command to see the Player View slice.
 *
 * Signs up a demo player, verifies them, logs them in (real token), and seats them
 * in a play session with the yard's combatants (the same ids the web sliceConfig
 * uses). Then prints a ready-to-paste URL for the web app.
 *
 * Prereqs: the dev server is RUNNING (npm run dev -w @questra/server) against the
 * same Postgres this script writes to, and .env.local has DATABASE_URL +
 * QUESTRA_JWT_SECRET (auto-loaded below). Idempotent-ish: each run makes a fresh
 * demo account + session so you can re-run freely.
 *
 * Usage:  npm run seed:slice -w @questra/server
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '..', '..', '..');

// load .env.local (same loader shape as migrate.mjs)
try {
  const raw = readFileSync(join(repoRoot, '.env.local'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    if (k && process.env[k] === undefined) process.env[k] = t.slice(eq + 1).trim();
  }
} catch { /* rely on ambient env */ }

const DATABASE_URL = process.env.DATABASE_URL;
const PORT = process.env.PORT ?? '8787';
const HTTP = `http://localhost:${PORT}`;
const WS = `ws://localhost:${PORT}`;
if (!DATABASE_URL) { console.error('DATABASE_URL not set (see .env.local).'); process.exit(1); }

// pg is resolvable from the server workspace
const require = createRequire(import.meta.url);
const pg = require('pg');

const RUN = Date.now().toString(36);
const email = `slice_${RUN}@questra.dev`;
const password = 'demo password';
const SESSION = `sess_slice_${RUN}`;
const CAMPAIGN = `camp_slice_${RUN}`;

async function main() {
  // server reachable?
  try {
    const h = await fetch(`${HTTP}/health`);
    if (!h.ok) throw new Error('health not ok');
  } catch {
    console.error(`\nThe dev server isn't answering on ${HTTP}.`);
    console.error('Start it first:  npm run dev -w @questra/server\n');
    process.exit(1);
  }

  // 1. signup
  const signup = await fetch(`${HTTP}/auth/signup`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, displayName: 'Demo Player' }),
  });
  if (signup.status !== 201) { console.error('signup failed', signup.status, await signup.text()); process.exit(1); }
  const accountId = (await signup.json()).id;

  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  try {
    // 2. verify (flip the row — equivalent to consuming the emailed token)
    await pool.query(`UPDATE account SET email_verified = true WHERE id = $1`, [accountId]);

    // 3. login → real access token
    const login = await fetch(`${HTTP}/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (login.status !== 200) { console.error('login failed', login.status, await login.text()); process.exit(1); }
    const token = (await login.json()).access;

    // 4. seat the player in a fresh session (campaign CRUD is §2; this stands in)
    await pool.query(`INSERT INTO campaign (id, name, owner_account_id) VALUES ($1,$2,$3)`, [CAMPAIGN, 'The Slice', accountId]);
    await pool.query(`INSERT INTO play_session (id, campaign_id) VALUES ($1,$2)`, [SESSION, CAMPAIGN]);
    await pool.query(`INSERT INTO membership (campaign_id, account_id, role) VALUES ($1,$2,'player')`, [CAMPAIGN, accountId]);

    const url = `http://localhost:5173/?server=${encodeURIComponent(WS)}&session=${encodeURIComponent(SESSION)}&token=${encodeURIComponent(token)}`;
    console.log('\n─────────────────────────────────────────────────────────────');
    console.log('  Slice seeded. Start the web app if it isn\'t running:');
    console.log('    npm run dev -w @questra/web');
    console.log('\n  Then open this URL (token is valid ~15 min):\n');
    console.log('  ' + url);
    console.log('─────────────────────────────────────────────────────────────\n');
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
