/**
 * Putting something on the board for the party to fight.
 *
 * WITHOUT THIS THE MAP IS EMPTY and every attack row is dead — a fight is the
 * party rolling initiative against nobody (owner, 2026-08-25: "there's no
 * enemies on the board, so I'm not sure what this enemy thing is"). The whole
 * combat layer had nothing to point at.
 *
 * IT SEARCHES THE REAL COMPENDIUM. The SRD monsters are already loaded and
 * already searchable — the same route the rules browser uses — so a DM types
 * "gob" and gets the actual goblin with its actual hit points, rather than
 * typing numbers in by hand.
 *
 * BUT HAND-ENTRY STAYS, because a DM inventing something at the table is
 * normal and a compendium that refuses to hold their idea sends them back to
 * paper. The fields are the three a creature genuinely needs: what it is
 * called, how much it can take, and how hard it is to hit.
 */
import { useEffect, useState, type ReactElement } from 'react';

interface MonsterRow {
  id: string;
  name: string;
  plain: string;
}

export interface AddCreatureProps {
  fetchJson: <T>(path: string) => Promise<T>;
  onAdd: (creature: { name: string; maxHp: number; ac: number; monsterId?: string }) => void;
}

export function AddCreature({ fetchJson, onAdd }: AddCreatureProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [rows, setRows] = useState<MonsterRow[]>([]);
  const [byHand, setByHand] = useState(false);
  const [name, setName] = useState('');
  const [hp, setHp] = useState('');
  const [ac, setAc] = useState('');

  useEffect(() => {
    if (!open || byHand) return;
    let cancelled = false;
    const params = new URLSearchParams({ type: 'monster' });
    if (query.trim()) params.set('q', query.trim());
    fetchJson<{ entries: MonsterRow[] }>(`/compendium?${params.toString()}`)
      .then((r) => { if (!cancelled) setRows(r.entries); })
      .catch(() => { if (!cancelled) setRows([]); });
    return () => { cancelled = true; };
  }, [open, byHand, query, fetchJson]);

  const addFromCompendium = (row: MonsterRow): void => {
    /* The list carries what a DM needs to choose; the full entry carries the
       numbers. Fetching it on pick rather than for every row keeps the search
       cheap. */
    fetchJson<{ id: string; name: string; meta?: { hp?: number; ac?: number } }>(`/compendium/${row.id}`)
      .then((entry) => {
        onAdd({
          name: entry.name,
          /* Falling back rather than refusing: a monster whose meta is still
             draft should still be placeable, and a DM can correct it. */
          maxHp: entry.meta?.hp ?? 10,
          ac: entry.meta?.ac ?? 12,
          monsterId: entry.id,
        });
        setOpen(false);
        setQuery('');
      })
      .catch(() => { /* the list stays open; nothing was placed */ });
  };

  const addByHand = (): void => {
    const n = name.trim();
    const h = Number(hp);
    const a = Number(ac);
    if (!n || !Number.isFinite(h) || h <= 0 || !Number.isFinite(a) || a <= 0) return;
    onAdd({ name: n, maxHp: h, ac: a });
    setOpen(false);
    setByHand(false);
    setName(''); setHp(''); setAc('');
  };

  if (!open) {
    return (
      <button type="button" className="qa2-pill" onClick={() => { setOpen(true); }}>
        Add a creature
      </button>
    );
  }

  return (
    <div className="qa2-panel qa-add">
      <header className="qa-ask-head">
        <span className="qa-dm-kicker">Add a creature</span>
        <button type="button" className="qa-dm-drawer-toggle" onClick={() => { setOpen(false); }}>Close</button>
      </header>

      {byHand ? (
        <form
          className="qa-add-hand"
          onSubmit={(e) => { e.preventDefault(); addByHand(); }}
        >
          <input className="qa-dm-input" placeholder="What is it called?" aria-label="Name"
            value={name} onChange={(e) => { setName(e.target.value); }} />
          <div className="qa-add-numbers">
            <input className="qa-dm-input" placeholder="Hit points" aria-label="Hit points"
              inputMode="numeric" value={hp} onChange={(e) => { setHp(e.target.value); }} />
            <input className="qa-dm-input" placeholder="Armour class" aria-label="Armour class"
              inputMode="numeric" value={ac} onChange={(e) => { setAc(e.target.value); }} />
          </div>
          <div className="qa-add-actions">
            <button type="submit" className="qa2-cta">Put it on the board</button>
            <button type="button" className="qa2-quiet-link" onClick={() => { setByHand(false); }}>
              Search instead
            </button>
          </div>
        </form>
      ) : (
        <>
          <input
            className="qa-dm-input"
            placeholder="Search — goblin, wolf, bandit"
            aria-label="Search creatures"
            value={query}
            onChange={(e) => { setQuery(e.target.value); }}
          />
          <ul className="qa-add-list">
            {rows.map((r) => (
              <li key={r.id}>
                <button type="button" className="qa-comp-row" onClick={() => { addFromCompendium(r); }}>
                  <span className="qa-comp-row-name">{r.name}</span>
                  <span className="qa-comp-row-plain">{r.plain}</span>
                </button>
              </li>
            ))}
            {rows.length === 0 && (
              <li><p className="qa-dm-empty">Nothing matches that yet.</p></li>
            )}
          </ul>
          {/* A DM inventing something at the table is normal, and a compendium
              that refuses to hold their idea sends them back to paper. */}
          <button type="button" className="qa2-quiet-link" onClick={() => { setByHand(true); }}>
            Make one up instead
          </button>
        </>
      )}
    </div>
  );
}
