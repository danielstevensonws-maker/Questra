/**
 * Auth data access (Brief 14 §1). Same seam pattern as EventStore: the flows and
 * resolveToken talk to the AuthRepo interface, never a concrete store — so the
 * ladder golden runs in-memory (no DB) and production runs against Postgres with no
 * code change. Token strings are passed in ALREADY HASHED; the repo never sees raw
 * verification/reset/refresh tokens.
 */
import type { Membership, ViewerRole } from '@questra/contracts';

/** The server-side account row — includes secrets that never reach a client. */
export interface AccountRow {
  id: string;
  email: string;
  emailVerified: boolean;
  displayName: string;
  passwordHash: string | null;
  onboarding: string;
  settings: Record<string, unknown>;
  ageBracket: 'under13' | '13to17' | 'adult' | null;
  createdAt: string;
  deletedAt: string | null;
}

export interface TokenRow {
  tokenHash: string;
  accountId: string;
  expiresAt: number; // unix seconds
  usedAt?: number | null;
  revokedAt?: number | null;
}

export interface AuthRepo {
  // accounts
  createAccount(a: Omit<AccountRow, 'createdAt' | 'deletedAt'> & { createdAt: string }): Promise<void>;
  accountByEmail(email: string): Promise<AccountRow | null>;
  accountById(id: string): Promise<AccountRow | null>;
  setEmailVerified(id: string): Promise<void>;
  setPasswordHash(id: string, hash: string): Promise<void>;
  softDeleteAccount(id: string, at: string): Promise<void>;
  hardDeleteAccountsDeletedBefore(cutoffIso: string): Promise<number>;

  // memberships (what resolveToken reads)
  addMembership(m: Membership): Promise<void>;
  membership(accountId: string, campaignId: string): Promise<Membership | null>;
  /** Campaigns this account OWNS (blocks deletion) — via campaign.owner_account_id. */
  ownedCampaigns(accountId: string): Promise<{ id: string; name: string }[]>;
  campaignIdForSession(playSessionId: string): Promise<string | null>;

  // single-use / rotating tokens (stored hashed)
  putVerification(t: TokenRow): Promise<void>;
  takeVerification(tokenHash: string): Promise<TokenRow | null>; // consume (delete) if unexpired
  putReset(t: TokenRow): Promise<void>;
  takeReset(tokenHash: string): Promise<TokenRow | null>;
  putRefresh(t: TokenRow): Promise<void>;
  getRefresh(tokenHash: string): Promise<TokenRow | null>;
  revokeRefresh(tokenHash: string): Promise<void>;
  revokeAllRefresh(accountId: string): Promise<void>;
}

// -------------------------------------------------------------- in-memory repo
/**
 * In-memory AuthRepo (dev/tests). Also seeds campaigns/sessions since the slice's
 * membership + deletion rules need them but campaign CRUD is §2 (M3). `addCampaign`
 * is a test seam, not a production surface.
 */
export class InMemoryAuthRepo implements AuthRepo {
  private accounts = new Map<string, AccountRow>();
  private byEmail = new Map<string, string>();
  private memberships = new Map<string, Membership>(); // key: campaign|account
  private campaigns = new Map<string, { id: string; name: string; ownerAccountId: string }>();
  private sessions = new Map<string, string>(); // playSessionId → campaignId
  private verifications = new Map<string, TokenRow>();
  private resets = new Map<string, TokenRow>();
  private refresh = new Map<string, TokenRow>();

  private mkey(accountId: string, campaignId: string): string {
    return `${campaignId}|${accountId}`;
  }

  // --- test seams (campaign/session CRUD is §2; these stand in for it) ---
  addCampaign(c: { id: string; name: string; ownerAccountId: string }): void {
    this.campaigns.set(c.id, c);
  }
  addSession(playSessionId: string, campaignId: string): void {
    this.sessions.set(playSessionId, campaignId);
  }
  archiveCampaign(id: string): void {
    this.campaigns.delete(id); // "archived" ⇒ no longer blocks deletion (§2 owns real archive)
  }

  async createAccount(a: Omit<AccountRow, 'createdAt' | 'deletedAt'> & { createdAt: string }): Promise<void> {
    const row: AccountRow = { ...a, deletedAt: null };
    this.accounts.set(row.id, row);
    this.byEmail.set(row.email.toLowerCase(), row.id);
  }
  async accountByEmail(email: string): Promise<AccountRow | null> {
    const id = this.byEmail.get(email.toLowerCase());
    return id ? (this.accounts.get(id) ?? null) : null;
  }
  async accountById(id: string): Promise<AccountRow | null> {
    return this.accounts.get(id) ?? null;
  }
  async setEmailVerified(id: string): Promise<void> {
    const a = this.accounts.get(id);
    if (a) a.emailVerified = true;
  }
  async setPasswordHash(id: string, hash: string): Promise<void> {
    const a = this.accounts.get(id);
    if (a) a.passwordHash = hash;
  }
  async softDeleteAccount(id: string, at: string): Promise<void> {
    const a = this.accounts.get(id);
    if (a) a.deletedAt = at;
  }
  async hardDeleteAccountsDeletedBefore(cutoffIso: string): Promise<number> {
    let n = 0;
    for (const [id, a] of [...this.accounts]) {
      if (a.deletedAt !== null && a.deletedAt < cutoffIso) {
        this.accounts.delete(id);
        this.byEmail.delete(a.email.toLowerCase());
        n++;
      }
    }
    return n;
  }

  async addMembership(m: Membership): Promise<void> {
    this.memberships.set(this.mkey(m.accountId, m.campaignId), m);
  }
  async membership(accountId: string, campaignId: string): Promise<Membership | null> {
    return this.memberships.get(this.mkey(accountId, campaignId)) ?? null;
  }
  async ownedCampaigns(accountId: string): Promise<{ id: string; name: string }[]> {
    return [...this.campaigns.values()]
      .filter((c) => c.ownerAccountId === accountId)
      .map((c) => ({ id: c.id, name: c.name }));
  }
  async campaignIdForSession(playSessionId: string): Promise<string | null> {
    return this.sessions.get(playSessionId) ?? null;
  }

  async putVerification(t: TokenRow): Promise<void> { this.verifications.set(t.tokenHash, t); }
  async takeVerification(tokenHash: string): Promise<TokenRow | null> {
    return this.consume(this.verifications, tokenHash);
  }
  async putReset(t: TokenRow): Promise<void> { this.resets.set(t.tokenHash, t); }
  async takeReset(tokenHash: string): Promise<TokenRow | null> {
    return this.consume(this.resets, tokenHash);
  }
  async putRefresh(t: TokenRow): Promise<void> { this.refresh.set(t.tokenHash, t); }
  async getRefresh(tokenHash: string): Promise<TokenRow | null> {
    const t = this.refresh.get(tokenHash);
    return t && !t.revokedAt ? t : null;
  }
  async revokeRefresh(tokenHash: string): Promise<void> {
    const t = this.refresh.get(tokenHash);
    if (t) t.revokedAt = Math.floor(Date.now() / 1000);
  }
  async revokeAllRefresh(accountId: string): Promise<void> {
    for (const t of this.refresh.values()) if (t.accountId === accountId) t.revokedAt = 1;
  }

  private consume(map: Map<string, TokenRow>, tokenHash: string): TokenRow | null {
    const t = map.get(tokenHash);
    if (!t) return null;
    map.delete(tokenHash); // single-use
    return t;
  }
}

export type { ViewerRole };
