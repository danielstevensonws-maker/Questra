/**
 * Equipment / item parser — Brief 01 §7 ("items + prices with prices"). Parses
 * the SRD Weapons, Armor, and Adventuring Gear tables into draft item entities.
 *
 * Item rows end in a price (`<n> <coin>`); the name is the leading text before
 * the row's stat columns. Contracts leaves `item` meta loose, so each draft
 * carries the name, verbatim row text, and a structured price in meta
 * ({ costCp } — normalized to copper pieces, the economy's base unit).
 *
 * Weapons/armor damage, AC, and properties are not fully structured here (loose
 * meta, tightened per the equipment brief); the acceptance requirement is
 * "items + prices", which this delivers.
 */
import { reflow } from './conditions.js';

const COIN_TO_CP: Record<string, number> = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };

export interface ItemDraft {
  id: string;
  name: string;
  category: 'weapon' | 'armor' | 'gear';
  costCp?: number;
  srdText: string;
}

export function itemId(name: string): string {
  return 'item.' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Trailing "<n> <coin>" → cost in copper pieces. */
function parsePrice(row: string): number | undefined {
  const m = row.match(/([\d,]+)\s*(CP|SP|EP|GP|PP)\s*$/i);
  if (!m) return undefined;
  return Number(m[1]!.replace(/,/g, '')) * COIN_TO_CP[m[2]!.toLowerCase()]!;
}

/** The name is the run of leading words before the first stat/number/"--"/property token. */
function parseName(row: string): string {
  const tokens = row.trim().split(/\s+/);
  const nameParts: string[] = [];
  for (const tok of tokens) {
    // stop at the first token that begins the stat columns: a number, dice,
    // a sign, "--", or "+N" (armor "+2" shield). Names are words (may hold "'").
    if (/^(--|—|[+-]?\d|[\d]*d\d)/.test(tok)) break;
    nameParts.push(tok);
  }
  return nameParts.join(' ').trim();
}

/** Detect a plausible item row: has a trailing price and a leading name. */
function isItemRow(row: string): boolean {
  const t = row.trim();
  if (!/(CP|SP|EP|GP|PP)\s*$/i.test(t)) return false;
  if (!/^[A-Z]/.test(t)) return false;
  return parseName(t).length > 0;
}

/**
 * Extract item rows from a table region. A row may wrap (properties overflow to
 * the next line) — we join continuation lines that don't themselves start a new
 * priced row before parsing.
 */
export function extractItems(lines: string[], category: ItemDraft['category']): ItemDraft[] {
  const out: ItemDraft[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    let row = lines[i]!.trim();
    if (!/^[A-Z]/.test(row)) continue;
    // join wrapped continuation lines until the row ends in a price
    let k = i;
    while (!/(CP|SP|EP|GP|PP)\s*$/i.test(row) && k + 1 < lines.length && lines[k + 1]!.trim() !== '' && !isItemRow(lines[k + 1]!)) {
      k++;
      row += ' ' + lines[k]!.trim();
    }
    if (!isItemRow(row)) continue;
    const name = parseName(row);
    const id = itemId(name);
    if (name.length < 2 || seen.has(id)) { i = k; continue; }
    seen.add(id);
    const cost = parsePrice(row);
    out.push({ id, name, category, ...(cost !== undefined ? { costCp: cost } : {}), srdText: `${name}. ${reflow([row])}`.trim() });
    i = k;
  }
  return out;
}
