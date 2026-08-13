/**
 * Condition splitter — Brief 01 §7. Given the `pdftotext -raw` line stream of
 * the SRD (raw mode reads the two-column glossary in correct order, so no
 * de-columning is needed), isolate each `Name [Condition]` entry and reflow its
 * wrapped body into clean verbatim prose (the entity's `srd_text`, layer 3).
 *
 * "Verbatim" here means faithful to the printed words: we undo the PDF's
 * line-wrapping (soft-hyphenation and mid-sentence breaks), drop running page
 * footers, and collapse runs of whitespace — but change no words. The result
 * byte-matches the SRD text a human reads off the page (the golden fixtures
 * assert exactly this: `extractConditions` reproduces `prone.json.srd_text`).
 *
 * The splitter does NOT author effects or the plain sentence — those are the
 * human QA pass (rules-lawyer read), which the pipeline cannot derive from prose
 * (Brief 01 §1 rule 1). It produces the verbatim text; the dataset adds the rest.
 */

/** The 15 SRD 5.2.1 conditions, in contracts CONDITION_IDS order. */
export const CONDITION_NAMES = [
  'Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled',
  'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone',
  'Restrained', 'Stunned', 'Unconscious',
] as const;
export type ConditionName = (typeof CONDITION_NAMES)[number];

const NAME_SET = new Set<string>(CONDITION_NAMES);

/** Header line for a glossary condition, e.g. "Prone [Condition]" (leading indent tolerated). */
function conditionHeader(line: string): ConditionName | null {
  const m = line.match(/^\s*([A-Z][a-z]+)\s*\[Condition\]\s*$/);
  if (m && NAME_SET.has(m[1]!)) return m[1] as ConditionName;
  return null;
}

/** Any glossary header line "Word [Tag]" or a bare Title-case term — a block boundary. */
function isGlossaryBoundary(raw: string): boolean {
  const line = raw.trim();
  if (/^[A-Z][A-Za-z]+(\s[A-Z][A-Za-z]+)*\s*\[[A-Za-z ]+\]\s*$/.test(line)) return true; // "X [Condition]", "Attack [Action]"
  // a bare glossary term: 1–4 Title-case words alone on a line, no trailing punctuation
  if (/^[A-Z][A-Za-z']+(\s[A-Z][A-Za-z']+){0,3}$/.test(line) && line.length < 40) return true;
  return false;
}

/** Running page footer / bare page-number noise that pdftotext leaves inline. */
function isPageNoise(line: string): boolean {
  const t = line.trim();
  if (t === '') return false; // handled separately
  if (/^System Reference Document 5\.2\.1(\s+\d+)?$/.test(t)) return true;
  if (/^\d{1,3}\s+System Reference Document 5\.2\.1$/.test(t)) return true;
  if (/^\d{1,3}$/.test(t)) return true; // bare page number on its own line
  return false;
}

/**
 * Reflow wrapped body lines into a single paragraph string. Joins soft-hyphen
 * breaks (word split "experi-\nence" → "experience") and collapses newlines /
 * runs of spaces to single spaces. Blank lines become paragraph joins (a space).
 * Page footers / page numbers are dropped (they interrupt the printed prose).
 */
export function reflow(lines: string[]): string {
  let out = '';
  for (const raw of lines) {
    const line = raw.trim();
    if (line === '') continue;
    if (isPageNoise(raw)) continue;
    if (out === '') {
      out = line;
    } else if (out.endsWith('-')) {
      // soft hyphen at wrap: drop the hyphen and join without space
      out = out.slice(0, -1) + line;
    } else {
      out += ' ' + line;
    }
  }
  return out.replace(/\s{2,}/g, ' ').trim();
}

export interface ExtractedCondition {
  name: ConditionName;
  srdText: string;
}

/**
 * Walk the de-columned line stream and pull each condition's body: everything
 * between its `Name [Condition]` header and the next glossary boundary.
 */
export function extractConditions(lines: string[]): ExtractedCondition[] {
  const found = new Map<ConditionName, string>();
  for (let i = 0; i < lines.length; i++) {
    const name = conditionHeader(lines[i]!);
    if (!name || found.has(name)) continue;
    const body: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j]!;
      if (conditionHeader(l) || isGlossaryBoundary(l)) break;
      body.push(l);
    }
    found.set(name, reflow(body));
  }
  // Return in canonical order; missing ones are simply absent (caller asserts count).
  return CONDITION_NAMES.filter((n) => found.has(n)).map((n) => ({ name: n, srdText: found.get(n)! }));
}
