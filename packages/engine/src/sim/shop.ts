/**
 * Shop transactions — Brief 07 §4. Pure and AI-free (ADR-0005). Buy/sell is ONE
 * atomic transaction: a signed coins delta + itemized inventory lines, validated
 * (funds on buy, availability on sell) and committed under one causeId so undo
 * reverses BOTH the coins and the inventory (acceptance #5). Insufficient funds ⇒
 * zero deltas (the whole transaction is rejected, never partially applied).
 *
 * Money math is done in copper (the lossless integer base) so `unitPriceCp` and
 * `coinsDelta` stay exact; the denomination bag is only re-expressed at the edges.
 */
import type { Coins, PlayEvent } from '@questra/contracts';

type Body = PlayEvent['body'];

/** Copper value of a five-denomination coin bag (SRD: 1sp=10cp, 1ep=50cp, 1gp=100cp, 1pp=1000cp). */
export function coinsToCp(c: Coins): number {
  return c.cp + c.sp * 10 + c.ep * 50 + c.gp * 100 + c.pp * 1000;
}

/** Re-express a copper total as a canonical bag (greedy, largest-first; no ep — SRD makes change in the four common coins). */
export function cpToCoins(totalCp: number): Coins {
  let n = Math.max(0, Math.trunc(totalCp));
  const pp = Math.floor(n / 1000); n -= pp * 1000;
  const gp = Math.floor(n / 100); n -= gp * 100;
  const sp = Math.floor(n / 10); n -= sp * 10;
  return { pp, gp, ep: 0, sp, cp: n };
}

export interface ShopLine {
  itemId: string;
  qty: number;
  /** unit price in copper. On a sell, the effective price is halved by default (DM-overridable per line). */
  unitPriceCp: number;
}

export type ShopReject = { ok: false; reason: string };

export interface ShopResult {
  ok: true;
  /** the atomic transaction event (coins delta + lines), for the caller to commit. */
  event: Body;
  /** the resulting coin bag, for the review card. */
  resultingCoins: Coins;
  totalCp: number;
}

/**
 * Buy: total = Σ(qty × unitPriceCp). Rejected with a plain string if the wallet
 * can't cover it (zero deltas). On success, coins go DOWN and inventory goes UP,
 * one event.
 */
export function buy(characterId: string, wallet: Coins, lines: ShopLine[]): ShopResult | ShopReject {
  const totalCp = lines.reduce((s, l) => s + l.qty * l.unitPriceCp, 0);
  const walletCp = coinsToCp(wallet);
  if (totalCp > walletCp) {
    return { ok: false, reason: `That costs ${cpLabel(totalCp)}, but you only have ${cpLabel(walletCp)}.` };
  }
  const resultingCoins = cpToCoins(walletCp - totalCp);
  const coinsDelta = signedDelta(wallet, resultingCoins);
  return {
    ok: true,
    totalCp,
    resultingCoins,
    event: { t: 'shop_transaction', characterId, direction: 'buy', lines: lines as [ShopLine, ...ShopLine[]], coinsDelta },
  };
}

/**
 * Sell: proceeds = Σ(qty × unitPriceCp). The caller passes the already-resolved
 * per-line prices (default half, DM-overridable — §4); this function just totals
 * and moves coins UP, inventory DOWN, one event. `owned` gates availability.
 */
export function sell(
  characterId: string,
  wallet: Coins,
  lines: ShopLine[],
  ownedQty: (itemId: string) => number,
): ShopResult | ShopReject {
  for (const l of lines) {
    if (ownedQty(l.itemId) < l.qty) {
      return { ok: false, reason: `You don't have ${l.qty}× ${l.itemId} to sell.` };
    }
  }
  const totalCp = lines.reduce((s, l) => s + l.qty * l.unitPriceCp, 0);
  const walletCp = coinsToCp(wallet);
  const resultingCoins = cpToCoins(walletCp + totalCp);
  const coinsDelta = signedDelta(wallet, resultingCoins);
  return {
    ok: true,
    totalCp,
    resultingCoins,
    event: { t: 'shop_transaction', characterId, direction: 'sell', lines: lines as [ShopLine, ...ShopLine[]], coinsDelta },
  };
}

/** The default sell price for a list price (half, rounded down — §4). */
export function defaultSellPriceCp(listPriceCp: number): number {
  return Math.floor(listPriceCp / 2);
}

/** Per-denomination signed delta (after − before). */
function signedDelta(before: Coins, after: Coins): Coins {
  return {
    cp: after.cp - before.cp, sp: after.sp - before.sp, ep: after.ep - before.ep,
    gp: after.gp - before.gp, pp: after.pp - before.pp,
  };
}

/** Plain-language money label from copper (e.g. "1 gp, 5 sp"). */
function cpLabel(totalCp: number): string {
  const c = cpToCoins(totalCp);
  const parts: string[] = [];
  if (c.pp) parts.push(`${c.pp} pp`);
  if (c.gp) parts.push(`${c.gp} gp`);
  if (c.sp) parts.push(`${c.sp} sp`);
  if (c.cp) parts.push(`${c.cp} cp`);
  return parts.length ? parts.join(', ') : '0 cp';
}
