/**
 * Named-entity splitter for the simpler content types — species, backgrounds,
 * and feats (Brief 01 §2). Contracts leaves these types' `meta` loose (a plain
 * record, tightened later per their own brief), so ingestion only needs each
 * entry's name and verbatim srd_text; the block runs from a known entry name to
 * the next.
 *
 * Entry names are enumerated (the SRD 5.2.1 subset is small and fixed), which is
 * more robust than guessing headers inside prose-heavy sections.
 */
import { reflow } from './conditions.js';

export const SPECIES_NAMES = [
  'Dragonborn', 'Dwarf', 'Elf', 'Gnome', 'Goliath', 'Halfling', 'Human', 'Orc', 'Tiefling',
] as const;

export const BACKGROUND_NAMES = ['Acolyte', 'Criminal', 'Sage', 'Soldier'] as const;

export const FEAT_NAMES = ['Alert', 'Magic Initiate', 'Savage Attacker', 'Skilled'] as const;

export interface NamedEntity {
  name: string;
  srdText: string;
}

/**
 * Extract each named block from a line range. Entries are located by exact name
 * match; a block runs from its name line to the next entry's name (or the end of
 * the range). `names` must be listed in the order they appear in the document.
 */
export function extractNamed(lines: string[], names: readonly string[]): NamedEntity[] {
  // find each name's line index (first occurrence at/after the previous one)
  const positions: { name: string; idx: number }[] = [];
  let from = 0;
  for (const name of names) {
    const idx = lines.findIndex((l, i) => i >= from && l.trim() === name);
    if (idx === -1) continue;
    positions.push({ name, idx });
    from = idx + 1;
  }

  const out: NamedEntity[] = [];
  for (let p = 0; p < positions.length; p++) {
    const { name, idx } = positions[p]!;
    const end = p + 1 < positions.length ? positions[p + 1]!.idx : lines.length;
    const body = lines.slice(idx + 1, end);
    out.push({ name, srdText: `${name}. ${reflow(body)}`.trim() });
  }
  return out;
}
