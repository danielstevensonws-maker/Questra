/**
 * Password hashing (Brief 14 §1) — argon2id, pure-WASM (hash-wasm) so there is no
 * native build step and it runs identically on every CI/OS. Parameters follow the
 * OWASP argon2id baseline (memory-hard). The hash string is self-describing
 * (encoded params + salt), so `verify` needs only the stored string.
 */
import { argon2id, argon2Verify } from 'hash-wasm';

/** OWASP-ish argon2id baseline. 19 MiB, 2 passes, 1 lane. */
const PARAMS = { parallelism: 1, iterations: 2, memorySize: 19_456, hashLength: 32 } as const;

const enc = new TextEncoder();
function randomSalt(): Uint8Array {
  const s = new Uint8Array(16);
  crypto.getRandomValues(s);
  return s;
}

/** Hash a plaintext password → an encoded argon2id string (safe to store). */
export async function hashPassword(plaintext: string): Promise<string> {
  return argon2id({
    password: enc.encode(plaintext),
    salt: randomSalt(),
    ...PARAMS,
    outputType: 'encoded',
  });
}

/** Verify a plaintext against a stored encoded hash. False on any mismatch/parse error. */
export async function verifyPassword(plaintext: string, encoded: string): Promise<boolean> {
  try {
    return await argon2Verify({ password: enc.encode(plaintext), hash: encoded });
  } catch {
    return false;
  }
}
