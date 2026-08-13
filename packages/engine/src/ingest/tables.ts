/**
 * Reference-table parsers — Brief 01 §7 ("XP + difficulty-ladder tables").
 *
 * These are lookup tables the Engine and DM tools read, NOT RulesEntities:
 *  - Character Advancement: level → XP threshold + proficiency bonus.
 *  - XP Budget per Character: party level → {low, moderate, high} encounter budget.
 *
 * Both are clean 20-row grids in the SRD; we parse them into typed structures.
 */

export interface AdvancementRow {
  level: number;
  xp: number;
  profBonus: number;
}

export interface EncounterBudgetRow {
  level: number;
  low: number;
  moderate: number;
  high: number;
}

function toInt(s: string): number {
  return Number(s.replace(/,/g, ''));
}

/** Parse the "Character Advancement" table: rows "<level> <xp> +<pb>". */
export function extractAdvancement(lines: string[]): AdvancementRow[] {
  const start = lines.findIndex((l) => l.trim() === 'Character Advancement');
  if (start === -1) return [];
  const rows: AdvancementRow[] = [];
  for (let i = start + 1; i < lines.length && rows.length < 20; i++) {
    const m = lines[i]!.trim().match(/^(\d{1,2})\s+([\d,]+)\s+\+(\d+)$/);
    if (m) rows.push({ level: Number(m[1]), xp: toInt(m[2]!), profBonus: Number(m[3]) });
    else if (rows.length > 0) break; // table ended
  }
  return rows;
}

/** Parse the "XP Budget per Character" table: rows "<level> <low> <moderate> <high>". */
export function extractEncounterBudget(lines: string[]): EncounterBudgetRow[] {
  const start = lines.findIndex((l) => l.trim() === 'XP Budget per Character');
  if (start === -1) return [];
  const rows: EncounterBudgetRow[] = [];
  for (let i = start + 1; i < lines.length && rows.length < 20; i++) {
    const m = lines[i]!.trim().match(/^(\d{1,2})\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)$/);
    if (m) rows.push({ level: Number(m[1]), low: toInt(m[2]!), moderate: toInt(m[3]!), high: toInt(m[4]!) });
    else if (rows.length > 0) break;
  }
  return rows;
}
