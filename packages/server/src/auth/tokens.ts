/**
 * Session tokens (Brief 14 §1). Two kinds:
 *
 *  - ACCESS token: a short-lived signed JWT (HS256) carrying SessionClaims
 *    { sub, iat, exp }. `sub` IS the account id IS Viewer.accountId. This is the
 *    token `hello` carries; `verifySession` is what resolveToken calls. 15 min.
 *
 *  - REFRESH token: an opaque high-entropy string, stored HASHED (sha256), rotated
 *    on use, 30 days. Not a JWT — it is a bearer credential the server looks up.
 *
 * The signing secret comes from the environment (ADR-0004: secrets server-side).
 * Tests inject a fixed secret + a fixed clock so the ladder is deterministic.
 */
import { SignJWT, jwtVerify } from 'jose';
import { SessionClaimsSchema, type SessionClaims } from '@questra/contracts';

export const ACCESS_TTL_SECONDS = 15 * 60; // 15 minutes
export const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

/** Clock seam so the ladder golden can pin `now` (unix seconds). */
export type Clock = () => number;
export const systemClock: Clock = () => Math.floor(Date.now() / 1000);

export interface TokenConfig {
  /** HS256 signing secret (>= 32 bytes recommended). From QUESTRA_JWT_SECRET. */
  secret: Uint8Array;
  clock?: Clock;
}

const ALG = 'HS256';

/** Read the JWT secret from the environment (ADR-0004). Throws if unset in prod paths. */
export function secretFromEnv(env: NodeJS.ProcessEnv = process.env): Uint8Array {
  const raw = env.QUESTRA_JWT_SECRET;
  if (!raw || raw.length < 16) {
    throw new Error('QUESTRA_JWT_SECRET is unset or too short (need >= 16 chars).');
  }
  return new TextEncoder().encode(raw);
}

/** Sign an access token for an account. Returns the compact JWT + its exp (unix s). */
export async function signSession(accountId: string, cfg: TokenConfig): Promise<{ token: string; exp: number }> {
  const now = (cfg.clock ?? systemClock)();
  const exp = now + ACCESS_TTL_SECONDS;
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: ALG })
    .setSubject(accountId)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(cfg.secret);
  return { token, exp };
}

/** Verify + parse an access token → SessionClaims, or null on any failure (incl. expiry). */
export async function verifySession(token: string, cfg: TokenConfig): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, cfg.secret, {
      algorithms: [ALG],
      currentDate: new Date((cfg.clock ?? systemClock)() * 1000),
    });
    const parsed = SessionClaimsSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** A new opaque refresh token (raw) — hand the raw to the client, store its hash. */
export function newRefreshToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
}

/** sha256(token) as hex — how verification/reset/refresh tokens are stored (never raw). */
export async function hashToken(raw: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return Buffer.from(digest).toString('hex');
}
