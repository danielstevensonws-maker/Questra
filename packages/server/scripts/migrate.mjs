/**
 * node-pg-migrate runner. The repo standardized on `tsx` (not `ts-node`) as its
 * TypeScript runner, but node-pg-migrate only knows how to bootstrap ts-node for
 * `.ts` migrations. This wrapper preloads the tsx ESM loader via NODE_OPTIONS —
 * portable across cmd.exe (Windows/npm) and POSIX shells, with no cross-env dep —
 * then execs the CLI, forwarding args (`up` / `down` / `redo`, etc.).
 *
 * Usage (via package.json): npm run migrate:up -w @questra/server
 * DATABASE_URL must be set (see .env.example / docker-compose.yml).
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const serverDir = join(here, '..');
const args = process.argv.slice(2);

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
