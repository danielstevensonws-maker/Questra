/**
 * node-pg-migrate runner. The repo standardized on `tsx` (not `ts-node`) as its
 * TypeScript runner, but node-pg-migrate only knows how to bootstrap ts-node for
 * `.ts` migrations. This wrapper preloads the tsx ESM loader via NODE_OPTIONS —
 * portable across cmd.exe (Windows/npm) and POSIX shells, with no cross-env dep —
 * then execs the CLI, forwarding args (`up` / `down` / `redo`, etc.).
 *
 * Usage (via package.json): npm run migrate:up -w @questra/server
 * DATABASE_URL comes from the environment, or from the repo-root .env.local
 * (auto-loaded below) so `npm run migrate:up` works with no manual export.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const serverDir = join(here, '..');
const args = process.argv.slice(2);

// Auto-load the repo-root .env.local (gitignored) so DATABASE_URL is set without a
// manual `export`. Only fills keys not already in the environment; no dotenv dep.
try {
  const raw = readFileSync(join(serverDir, '..', '..', '.env.local'), 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    const v = t.slice(eq + 1).trim();
    if (k && process.env[k] === undefined) process.env[k] = v;
  }
} catch { /* no .env.local — rely on the ambient environment */ }

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Create .env.local (copy .env.example) or export it.');
  process.exit(1);
}

// The repo standardized on `tsx` (not `ts-node`). node-pg-migrate v7 has a native
// `--tsx` flag (it require()s `tsx/cjs` itself) — so we run its JS entrypoint
// directly with that flag, no ts-node and no NODE_OPTIONS loader needed. Resolve
// the entrypoint from the hoisted install so PATH is irrelevant on Windows.
const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve('node-pg-migrate/package.json'));
const entry = join(pkgDir, 'bin', 'node-pg-migrate.js');

const result = spawnSync(
  process.execPath,
  [entry, '--tsx', '--tsconfig', 'tsconfig.json', '-m', 'src/store/migrations', ...args],
  { cwd: serverDir, stdio: 'inherit' },
);

process.exit(result.status ?? 1);
