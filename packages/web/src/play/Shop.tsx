/**
 * Buying and selling at the table — Brief 07 §4.
 *
 * WHY IT LOOKS LIKE THE COMPENDIUM AND NOT LIKE A STORE. Shopping in D&D is
 * looking a price up: the equipment list IS the shop, and every table already
 * knows how to read it. So this is the search a DM already uses to bring a
 * monster in, pointed at the equipment table, with the price where the plain
 * line would be. Nobody has to learn a second way to find a thing.
 *
 * THE PRICE ON SCREEN IS NOT THE PRICE CHARGED, and that is deliberate rather
 * than sloppy: the server owns the economy (list price to buy, half to sell,
 * whatever the DM says instead), so this shows the compendium's figure as
 * guidance and lets the server settle it. A client that computed the total
 * would be a client that could be argued with.
 *
 * ONE ROW AT A TIME. A basket with quantities and a running total is a shape
 * this screen does not need: at a table somebody says "I'll take a rope", and
 * the answer is one line in the journal. The transaction is still atomic — the
 * server moves the coins and the pack together — so a basket can be added later
 * without changing what an event means.
 */
import { useEffect, useState, type ReactElement } from 'react';
import { Eyebrow, Glyph, prose } from '../design/index.js';

interface ItemRow {
  id: string;
  name: string;
  plain: string;
}

export interface ShopProps {
  fetchJson: <T>(path: string) => Promise<T>;
  /** Whose purse. Null when nobody is chosen — the panel says so rather than guessing. */
  characterId: string | null;
  characterName: string | null;
  /** What they are carrying, so the sell side only offers what exists. */
  inventory: readonly string[];
  onTrade: (trade: { characterId: string; direction: 'buy' | 'sell'; itemId: string }) => void;
}

export function Shop({ fetchJson, characterId, characterName, inventory, onTrade }: ShopProps): ReactElement {
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<ItemRow[]>([]);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ type: 'item' });
    if (query.trim()) params.set('q', query.trim());
    fetchJson<{ entries: ItemRow[] }>(`/compendium?${params.toString()}`)
      .then((r) => { if (!cancelled) setRows(r.entries); })
      .catch(() => { if (!cancelled) setRows([]); });
    return () => { cancelled = true; };
  }, [query, fetchJson]);

  if (characterId === null) {
    return (
      <p className="qa2-detail" style={{ ...prose, margin: 0 }}>
        Tap somebody in the turn order first — a purse belongs to a person.
      </p>
    );
  }

  /* Selling is limited to what is in the pack, and the list says so by being
     shorter rather than by refusing things after they are tapped. */
  const carried = new Set(inventory);
  const shown = side === 'sell' ? rows.filter((r) => carried.has(r.id)) : rows;

  return (
    <div className="qa2-ask qa-add">
      <div className="qa-add-actions" role="group" aria-label="Buying or selling">
        <button
          type="button"
          className={side === 'buy' ? 'qa2-cta' : 'qa2-quiet-link'}
          aria-pressed={side === 'buy'}
          onClick={() => { setSide('buy'); }}
        >
          Buying
        </button>
        <button
          type="button"
          className={side === 'sell' ? 'qa2-cta' : 'qa2-quiet-link'}
          aria-pressed={side === 'sell'}
          onClick={() => { setSide('sell'); }}
        >
          Selling
        </button>
      </div>

      <span className="qa2-open">
        <Glyph name="search" size={14} />
        <input
          className="qa2-input"
          placeholder="Search — rope, torch, longsword"
          aria-label="Search equipment"
          value={query}
          onChange={(e) => { setQuery(e.target.value); }}
        />
      </span>

      {shown.length === 0 ? (
        <p className="qa2-detail" style={{ ...prose, margin: 0 }}>
          {side === 'sell'
            ? `${characterName ?? 'They'} is not carrying anything that matches.`
            : 'Nothing on the equipment list matches that.'}
        </p>
      ) : (
        <ul className="qa-add-list">
          {shown.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                className="qa-add-row"
                onClick={() => { onTrade({ characterId, direction: side, itemId: r.id }); }}
              >
                <Eyebrow tone="faint">{r.name}</Eyebrow>
                {/* The compendium's own plain line already carries the price —
                    "Club — SRD weapon (10 cp)" — so there is nothing to compute
                    here and nothing to disagree with the server about. */}
                <span style={prose}>{r.plain}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
