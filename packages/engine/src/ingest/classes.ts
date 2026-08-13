/**
 * Class level-table parser — Brief 01 §6/§7. Parses each class's "<Class>
 * Features" table into the 1–20 level rows the contracts ClassMetaSchema needs:
 * per level, a proficiency bonus and a non-empty list of feature ids
 * (acceptance #4: every level grants ≥1 feature).
 *
 * Table shape (per printed row):
 *   <level> +<pb> <Class Features …> <trailing resource/spell-slot columns>
 * Feature text can wrap onto continuation lines (no level prefix). The trailing
 * columns are numbers or "--"; we strip them to isolate the feature names, then
 * slugify each into a feature id (feature.<class>.<slug>).
 *
 * Caster levels sometimes show "--" in the Class Features column (they gain only
 * spell-slot progression that level). To keep acceptance #4 true, such a level
 * gets a synthetic `feature.<class>.spell-progression` id — a real thing the
 * character gains, just not a named feature.
 */
import { isPageNoise } from './conditions.js';

export const CLASS_NAMES = [
  'Barbarian', 'Bard', 'Cleric', 'Druid', 'Fighter', 'Monk',
  'Paladin', 'Ranger', 'Rogue', 'Sorcerer', 'Warlock', 'Wizard',
] as const;
export type ClassName = (typeof CLASS_NAMES)[number];

export interface ClassLevelRow {
  profBonus: number;
  features: string[];
}
export interface ClassTable {
  className: ClassName;
  classId: string;
  levels: Record<string, ClassLevelRow>;
}

export function classId(name: string): string {
  return 'class.' + name.toLowerCase();
}
function slugify(s: string): string {
  return s.toLowerCase().replace(/\([^)]*\)/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Feature id for a class-table entry. Decision points use the `choice.` id
 * convention the Fighter fixture established (subclass pick, ASI-or-feat);
 * everything else is `feature.<class>.<slug>`. The synthetic caster progression
 * marker is `feature.<class>.spell-progression`.
 */
function featureId(className: string, featureName: string): string {
  const cls = className.toLowerCase();
  const n = featureName.toLowerCase();
  if (/\bsubclass\b/.test(n) && !/feature/.test(n)) return `choice.${cls}.subclass`;
  if (/ability score improvement/.test(n)) return 'choice.asi-or-feat';
  return `feature.${cls}.${slugify(featureName)}`;
}

/**
 * Strip the trailing resource/spell-slot columns from a row body, leaving the
 * Class Features text. Trailing columns are a run of tokens that are each a
 * number or "--". We remove the maximal such trailing run.
 */
function stripTrailingColumns(body: string): string {
  const tokens = body.trim().split(/\s+/);
  let end = tokens.length;
  // A trailing resource/spell-slot column token is anything that is not part of a
  // feature name: bare/signed numbers, fractions ("1/2"), dice ("d8", "1d8"),
  // movement ("ft.", "15"), or the empty marker "--"/"—". Feature names are prose
  // words (possibly with a trailing comma), so we stop at the first word token.
  const isColumnToken = (tok: string) =>
    /^(--|—|[+-]?\d+(\/\d+)?|\d*[dD]\d+|ft\.?)$/.test(tok);
  while (end > 0 && isColumnToken(tokens[end - 1]!)) end--;
  return tokens.slice(0, end).join(' ').trim();
}

/** Split a Class Features cell into individual feature names (comma-separated). */
function splitFeatures(text: string): string[] {
  const cleaned = text.replace(/\s{2,}/g, ' ').trim();
  if (cleaned === '' || cleaned === '--' || cleaned === '—') return [];
  return cleaned.split(',').map((s) => s.trim()).filter((s) => s.length > 0);
}

/** Parse one class's features table starting at the header line index. */
export function parseClassTable(className: ClassName, lines: string[], headerIdx: number): ClassTable {
  const levels: Record<string, ClassLevelRow> = {};
  const rowStart = /^(\d{1,2})\s+\+(\d)\s+(.*)$/;

  let current: { level: number; pb: number; parts: string[] } | null = null;
  const flush = () => {
    if (!current) return;
    const body = stripTrailingColumns(current.parts.join(' '));
    let names = splitFeatures(body);
    // Acceptance #4: a level with no named feature still gains spell-slot progression.
    if (names.length === 0) names = ['Spell Progression'];
    levels[String(current.level)] = {
      profBonus: current.pb,
      features: names.map((n) => featureId(className, n)),
    };
    current = null;
  };

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const raw = lines[i]!;
    if (isPageNoise(raw)) continue;
    const t = raw.trim();
    const m = t.match(rowStart);
    if (m) {
      const lvl = Number(m[1]);
      if (lvl >= 1 && lvl <= 20) {
        flush();
        current = { level: lvl, pb: Number(m[2]), parts: [m[3] ?? ''] };
        if (lvl === 20) { flush(); break; } // level 20 is the last row; stop after it
        continue;
      }
    }
    if (current) {
      // continuation line: part of the current row's wrapped feature text. We do
      // NOT break on a Title-case line here — a wrapped feature name (e.g. Wizard
      // L1 "Arcane Recovery") looks exactly like a section header. The table ends
      // deterministically at level 20 (handled above) or at the next class header.
      if (t === '' && current.parts.join(' ').trim() !== '') continue; // ignore blanks within a row
      current.parts.push(t);
    }
  }
  flush();

  return { className, classId: classId(className), levels };
}

/** Find and parse all 12 class feature tables in the SRD line stream. */
export function extractClasses(lines: string[]): ClassTable[] {
  const out: ClassTable[] = [];
  for (const name of CLASS_NAMES) {
    const headerIdx = lines.findIndex((l) => l.trim() === `${name} Features`);
    if (headerIdx === -1) continue;
    out.push(parseClassTable(name, lines, headerIdx));
  }
  return out;
}
