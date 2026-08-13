/**
 * Monster stat-block parser — Brief 01 §7. Parses the SRD "Monsters" section
 * into draft monster entities whose `meta` conforms (as far as the reliably
 * structured fields go) to the contracts MonsterMetaSchema.
 *
 * A stat block is:
 *   <Name>
 *   <Size> <Type>[ (tags)], <Alignment>
 *   AC <n> Initiative <±n> (<n>)
 *   HP <avg> (<dice>[ + n])
 *   Speed <n> ft.[, <mode> <n> ft. …]
 *   MOD SAVE MOD SAVE MOD SAVE
 *   Str <n> <±mod> <±save> Dex <n> … Con <n> …
 *   Int <n> … Wis <n> … Cha <n> …
 *   [Skills …] [Resistances …] [Immunities …] [Gear …]
 *   Senses …; Passive Perception <n>
 *   Languages …
 *   CR <x> (XP <n>; PB <±n>)
 *   [Traits] [Actions] [Bonus Actions] [Reactions] …
 *
 * The parser extracts the structured header/ability/other fields the pipeline
 * can reliably derive, and captures the action text as reflowed prose. It does
 * NOT fully structure each action's attack/hit/rider — that per-monster encoding
 * is the rules-lawyer pass; monsters ship qa:draft with an actions[] of
 * name+text so the schema is satisfied, and are promoted in a curated pass.
 */
import { reflow, isPageNoise } from './conditions.js';

const SIZES = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'] as const;
const SIZE_TITLES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'];

export interface MonsterMeta {
  size: string;
  type: string;
  tags?: string[];
  alignment: string;
  ac: number;
  hp: { average: number; dice: string };
  speedFt: number;
  abilities: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  skills?: Record<string, number>;
  senses: { darkvisionFt?: number; blindsightFt?: number; passivePerception: number };
  languages: string[];
  cr: string;
  xp: number;
  profBonus: number;
  gear?: string[];
  actions: { name: string; text?: string }[];
}

export interface MonsterDraft {
  id: string;
  name: string;
  meta: MonsterMeta;
  srdText: string;
}

export function monsterId(name: string): string {
  return 'monster.' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** "Large Elemental (Air), Neutral Evil" / "Large Swarm of Tiny Beasts, Unaligned"
 *  → {size, type, tags?, alignment}. Type may be multi-word (swarms). */
function parseSubheader(line: string): { size: string; type: string; tags?: string[]; alignment: string } | null {
  const m = line.match(/^(Tiny|Small|Medium|Large|Huge|Gargantuan)\s+(.+?)(?:\s*\(([^)]+)\))?,\s*(.+?)\s*$/);
  if (!m) return null;
  const tags = m[3] ? m[3].split(',').map((t) => t.trim().toLowerCase()) : undefined;
  return {
    size: m[1]!.toLowerCase(),
    type: m[2]!.trim().toLowerCase(),
    ...(tags ? { tags } : {}),
    alignment: m[4]!.toLowerCase(),
  };
}

/** Parse the two ability rows into the six scores. */
function parseAbilities(rows: string[]): MonsterMeta['abilities'] | null {
  const text = rows.join(' ');
  const grab = (ab: string): number | null => {
    const re = new RegExp(`${ab}\\s+(-?\\d+)`, 'i');
    const m = text.match(re);
    return m ? Number(m[1]) : null;
  };
  const str = grab('Str'), dex = grab('Dex'), con = grab('Con'), int = grab('Int'), wis = grab('Wis'), cha = grab('Cha');
  if ([str, dex, con, int, wis, cha].some((v) => v === null)) return null;
  return { str: str!, dex: dex!, con: con!, int: int!, wis: wis!, cha: cha! };
}

/** A stat block begins where Name / Subheader / "AC n Initiative" line up. */
function statBlockAt(lines: string[], i: number): { name: string; sub: ReturnType<typeof parseSubheader> } | null {
  const name = (lines[i] ?? '').trim();
  if (!name || name.length > 50 || !/^[A-Z]/.test(name)) return null;
  const sub = parseSubheader((lines[i + 1] ?? '').trim());
  if (!sub) return null;
  // AC line follows the subheader; Initiative is present on most but not all blocks.
  if (!/^AC \d/.test((lines[i + 2] ?? '').trim())) return null;
  return { name, sub };
}

const SECTION_LABELS = ['Skills', 'Resistances', 'Immunities', 'Vulnerabilities', 'Gear', 'Senses', 'Languages', 'CR', 'Traits', 'Actions', 'Bonus Actions', 'Reactions', 'Legendary Actions'];

export function extractMonsters(lines: string[]): MonsterDraft[] {
  const out: MonsterDraft[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < lines.length - 2; i++) {
    const block = statBlockAt(lines, i);
    if (!block) continue;
    const { name, sub } = block;
    // gather the block until the next stat block start
    let j = i + 2;
    const raw: string[] = [];
    for (; j < lines.length; j++) {
      if (statBlockAt(lines, j)) break;
      if (!isPageNoise(lines[j]!)) raw.push(lines[j]!);
    }

    const meta = buildMeta(name, sub!, raw);
    if (!meta) continue; // don't advance i past the scanned range — a failed parse must not swallow the blocks inside it
    i = j - 1; // only skip ahead on a successful emit
    const id = monsterId(name);
    if (seen.has(id)) continue; // some names repeat as page headers; keep the first complete parse
    seen.add(id);
    out.push({ id, name, meta, srdText: `${name}. ${sub!.size[0]!.toUpperCase()}${sub!.size.slice(1)} ${reflow(raw)}`.trim() });
  }
  return out;
}

function num(s: string | undefined): number | undefined {
  if (s === undefined) return undefined;
  const m = s.match(/-?\d+/);
  return m ? Number(m[0]) : undefined;
}

function buildMeta(name: string, sub: NonNullable<ReturnType<typeof parseSubheader>>, raw: string[]): MonsterMeta | null {
  const text = raw.join('\n');
  const line = (label: string): string | undefined => raw.find((l) => l.trim().startsWith(label))?.trim();

  const ac = num(line('AC'));
  const hpLine = line('HP');
  const hpM = hpLine?.match(/HP\s+(\d+)\s*\(([^)]+)\)/);
  const speedM = line('Speed')?.match(/Speed\s+(\d+)\s*ft/);
  if (ac === undefined || !hpM || !speedM) return null;

  // ability grid: the two rows after "MOD SAVE MOD SAVE MOD SAVE"
  const gridIdx = raw.findIndex((l) => /MOD\s+SAVE/.test(l));
  if (gridIdx === -1) return null;
  const abilities = parseAbilities(raw.slice(gridIdx + 1, gridIdx + 3));
  if (!abilities) return null;

  // CR / XP / PB
  const crM = text.match(/CR\s+(\S+)\s*\(XP\s+([\d,]+)[^;]*;\s*PB\s+\+?(\d+)\)/);
  if (!crM) return null;

  // Senses + passive perception
  const sensesLine = line('Senses') ?? 'Passive Perception 10';
  const pp = num(sensesLine.match(/Passive Perception\s+(\d+)/)?.[0]) ?? 10;
  const darkvision = num(sensesLine.match(/Darkvision\s+(\d+)/)?.[0]);
  const blindsight = num(sensesLine.match(/Blindsight\s+(\d+)/)?.[0]);

  // Languages
  const langLine = line('Languages')?.replace(/^Languages\s*/, '').trim() ?? '';
  const languages = langLine && !/^(None|—|-)?$/.test(langLine)
    ? langLine.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
    : [];

  // Skills
  const skills: Record<string, number> = {};
  const skillLine = line('Skills')?.replace(/^Skills\s*/, '');
  if (skillLine) {
    for (const m of skillLine.matchAll(/([A-Za-z ]+?)\s+\+(\d+)/g)) {
      skills[m[1]!.trim().toLowerCase().replace(/ /g, '_')] = Number(m[2]);
    }
  }

  // Gear
  const gearLine = line('Gear')?.replace(/^Gear\s*/, '');
  const gear = gearLine ? gearLine.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) : undefined;

  // Actions: names in the Actions… section (best-effort; kept as name entries so schema is satisfied)
  const actions = parseActionNames(raw);

  const meta: MonsterMeta = {
    size: sub.size,
    type: sub.type,
    ...(sub.tags ? { tags: sub.tags } : {}),
    alignment: sub.alignment,
    ac,
    hp: { average: Number(hpM[1]), dice: hpM[2]!.trim() },
    speedFt: Number(speedM[1]),
    abilities,
    ...(Object.keys(skills).length ? { skills } : {}),
    senses: {
      ...(darkvision !== undefined ? { darkvisionFt: darkvision } : {}),
      ...(blindsight !== undefined ? { blindsightFt: blindsight } : {}),
      passivePerception: pp,
    },
    languages,
    cr: crM[1]!,
    xp: Number(crM[2]!.replace(/,/g, '')),
    profBonus: Number(crM[3]),
    ...(gear ? { gear } : {}),
    actions: actions.length ? actions : [{ name: 'Actions' }],
  };
  return meta;
}

/** Best-effort action-name extraction: lines like "Name. <text>" under an Actions header. */
function parseActionNames(raw: string[]): { name: string; text?: string }[] {
  const out: { name: string; text?: string }[] = [];
  let inActions = false;
  for (const l of raw) {
    const t = l.trim();
    if (/^(Actions|Bonus Actions|Reactions|Legendary Actions)$/.test(t)) { inActions = true; continue; }
    if (/^(Traits)$/.test(t)) { inActions = false; continue; }
    if (!inActions) continue;
    const m = t.match(/^([A-Z][A-Za-z' ]+?)\.\s+(.+)$/);
    if (m && m[1]!.length < 40) out.push(m[2] ? { name: m[1]!.trim(), text: m[2] } : { name: m[1]!.trim() });
  }
  return out;
}
