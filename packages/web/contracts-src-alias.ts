import { fileURLToPath } from 'node:url';

// Maps the bare @questra/contracts specifier to its TS source entry. Deep imports
// (e.g. @questra/contracts/src/fixtures/*.json) already point at src and are left alone.
export const contractsSrcAlias = {
  find: /^@questra\/contracts$/,
  replacement: fileURLToPath(
    new URL('../contracts/src/index.ts', import.meta.url),
  ),
};
