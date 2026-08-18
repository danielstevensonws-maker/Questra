/**
 * shell/api — the thin fetch client every shell screen talks to the server
 * through. One place that knows the API's base URL, attaches the bearer
 * access token, and turns a `{ error, reason }` body (routes.ts / campaign-routes.ts's
 * shared error shape) into a typed, catchable ApiError.
 *
 * `credentials: 'include'` on every call is what lets the httpOnly refresh
 * cookie (Brief 14 §1: "the refresh token lives ONLY in the cookie") ride
 * along cross-origin to the server on :8787.
 */
const API_BASE = (import.meta as unknown as { env?: { VITE_API_BASE?: string } }).env?.VITE_API_BASE ?? 'http://localhost:8787';

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

interface ErrorBody { error?: string; reason?: string }

export async function apiRequest<T>(
  path: string,
  opts: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown; token?: string | null } = {},
): Promise<T> {
  const res = await fetch(API_BASE + path, {
    method: opts.method ?? 'GET',
    credentials: 'include',
    headers: {
      'content-type': 'application/json',
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
    },
    ...(opts.body !== undefined ? { body: JSON.stringify(opts.body) } : {}),
  });
  const json = (await res.json().catch(() => ({}))) as T & ErrorBody;
  if (!res.ok) {
    throw new ApiError(res.status, json.error ?? 'unknown', json.reason ?? 'Something went wrong. Try again.');
  }
  return json;
}
