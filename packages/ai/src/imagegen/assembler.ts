/**
 * The portrait prompt assembler (Brief 09a §1) — a pure, byte-testable function
 * implementing the Portrait Style Prompt System's layered order:
 *   locked base → figure (ancestry + role + free-form) → accents → setting →
 *   composition lock → Avoid line → ratio words → exact-as-written line.
 *
 * Byte-for-byte reproduction of the spec's §5 worked example is the golden test.
 * Adding a wizard chip = adding a token row (tokens.ts); the assembler is stable.
 */
import {
  LOCKED_BASE, ANCESTRY, ROLE, ACCENTS, SETTINGS, FRAMES,
  COMPOSITION_LOCK, AVOID_LINE, EXACT_LINE,
} from './tokens.js';

export interface PortraitSelection {
  ancestry: string;
  role: string;
  accents: string;
  setting: string;
  /** the wizard's free-form appearance line. */
  freeForm: string;
  /** aspect ratio words. */
  aspect: '2:3';
}

export interface AssembledPrompt {
  prompt: string;
  /** style reference asset ids to attach (seed images), Portrait spec §7. */
  styleRefs: string[];
}

/** Assemble the paste-ready portrait prompt from wizard selections. */
export function assemblePortraitPrompt(sel: PortraitSelection): AssembledPrompt {
  const role = ROLE[sel.role];
  const ancestryTmpl = ANCESTRY[sel.ancestry];
  const accents = ACCENTS[sel.accents];
  const setting = SETTINGS[sel.setting];
  const frame = FRAMES[sel.setting];
  if (!role || !ancestryTmpl || !accents || !setting || !frame) {
    throw new Error(`assemblePortraitPrompt: unknown token in selection ${JSON.stringify(sel)}`);
  }

  // ratio words (layer: aspect) — "tall 2:3" for a portrait.
  const ratio = `Create a tall ${sel.aspect} portrait image.`;

  // figure line: ancestry template with {role} filled, then stance + free-form + garb + accents.
  const ancestry = ancestryTmpl.replace('{role}', role.noun);
  const figure =
    `Full-body portrait of ${ancestry}, ${role.stance} — ${sel.freeForm} — ` +
    `wearing ornate baroque brocade garb repurposed at tiny scale from leaf and thorn, ${accents}, ` +
    `expression mischievous and playful.`;

  const composition = COMPOSITION_LOCK.replace('{frame}', frame);

  const prompt = [
    ratio,
    LOCKED_BASE,
    figure,
    `${setting} ${composition}`,
    AVOID_LINE,
    EXACT_LINE,
  ].join('\n');

  return { prompt, styleRefs: [] };
}
