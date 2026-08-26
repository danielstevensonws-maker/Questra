/**
 * The equipment list, at the table.
 *
 * IT WAS BLOCKED ON THE CORPUS, not on the screen. The shop reads the
 * compendium, the compendium serves VERIFIED_DATASET, and all 180 SRD items sat
 * at `qa: 'draft'` — so a shop built before the promotion would have browsed an
 * empty shelf. That is why this file arrives with the promotion and not before.
 *
 * The PRICES are the server's and are tested there. What is tested here is the
 * part this file owns: that it asks the compendium for items, that a tap sends
 * one trade for the right person, and that selling only ever offers what is
 * actually in the pack.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { Shop } from './Shop.js';

afterEach(cleanup);

const ENTRIES = [
  { id: 'item.club', name: 'Club', plain: 'Club — SRD weapon (10 cp).' },
  { id: 'item.rope-hempen-50-feet', name: 'Rope', plain: 'Rope — SRD gear (100 cp).' },
];

/** A compendium that answers, and records what it was asked. */
const compendium = () => {
  const asked: string[] = [];
  /* Not vi.fn: its generic signature does not survive the wrapper, and the
     recorded paths are the only thing this needs to assert on anyway. */
  const fetchJson = <T,>(path: string): Promise<T> => {
    asked.push(path);
    return Promise.resolve({ entries: ENTRIES } as T);
  };
  return { fetchJson, asked };
};

const shop = (over: Partial<Parameters<typeof Shop>[0]> = {}) => {
  const { fetchJson, asked } = compendium();
  const onTrade = vi.fn();
  render(
    <Shop
      fetchJson={fetchJson}
      characterId="char_torvald"
      characterName="Torvald"
      inventory={['item.club']}
      onTrade={onTrade}
      {...over}
    />,
  );
  return { onTrade, asked };
};

describe('the shop', () => {
  it('asks the compendium for equipment, not for everything', async () => {
    const { asked } = shop();
    await waitFor(() => { expect(asked.length).toBeGreaterThan(0); });
    expect(asked[0]).toContain('type=item');
  });

  it('shows the price the compendium already prints, rather than computing one', async () => {
    shop();
    expect(await screen.findByText(/Club — SRD weapon \(10 cp\)\./)).toBeTruthy();
  });

  it('sends one trade, for the character whose purse it is', async () => {
    const { onTrade } = shop();
    fireEvent.click(await screen.findByRole('button', { name: /Club/ }));
    expect(onTrade).toHaveBeenCalledWith({
      characterId: 'char_torvald', direction: 'buy', itemId: 'item.club',
    });
  });

  it('only offers to sell what is actually in the pack', async () => {
    shop();
    await screen.findByRole('button', { name: /Rope/ });
    fireEvent.click(screen.getByRole('button', { name: 'Selling' }));
    expect(screen.getByRole('button', { name: /Club/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Rope/ })).toBeNull();
  });

  it('sells rather than buys once the sell side is chosen', async () => {
    const { onTrade } = shop();
    await screen.findByRole('button', { name: /Club/ });
    fireEvent.click(screen.getByRole('button', { name: 'Selling' }));
    fireEvent.click(screen.getByRole('button', { name: /Club/ }));
    expect(onTrade).toHaveBeenCalledWith({
      characterId: 'char_torvald', direction: 'sell', itemId: 'item.club',
    });
  });

  it('says a purse belongs to a person rather than guessing whose', () => {
    shop({ characterId: null, characterName: null });
    expect(screen.getByText(/a purse belongs to a person/i)).toBeTruthy();
  });

  it('explains an empty pack instead of showing an empty list', async () => {
    shop({ inventory: [] });
    await screen.findByRole('button', { name: /Club/ });
    fireEvent.click(screen.getByRole('button', { name: 'Selling' }));
    expect(screen.getByText(/is not carrying anything that matches/i)).toBeTruthy();
  });
});
