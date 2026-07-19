import { fileURLToPath } from 'node:url';

// Maps the bare @questra/engine specifier to its TS source entry, so dev +
// Storybook read the engine from src (never a stale dist) — mirroring
// contracts-src-alias. The engine is pure + AI-free (ADR-0005), so the web
// bundle importing it (for the shared legality function, Brief 10 §1) is safe.
export const engineSrcAlias = {
  find: /^@questra\/engine$/,
  replacement: fileURLToPath(
    new URL('../engine/src/index.ts', import.meta.url),
  ),
};
