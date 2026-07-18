/**
 * Portrait prompt token tables (Brief 09a §1: "token tables live as data, one row
 * per wizard chip"). These map the wizard's chip selections to the exact prompt
 * fragments the Portrait Style Prompt System spec specifies.
 *
 * M2.4 seeds the rows the spec's §5 worked example needs (the byte-match target);
 * the full chip vocabulary is authored as the Character Wizard lands (M4). Adding
 * a chip = adding a row here, never touching the assembler.
 */

/** The locked base style block (Portrait spec §1 layer 0) — verbatim, never edited by tokens. */
export const LOCKED_BASE =
  'Painterly semi-realist fantasy illustration, digital oil painting with visible brushwork and soft gouache texture, fantasy book-cover quality, richly detailed. Single-character hero portrait, soft diffused lighting, a warm-lit figure against a cool ground, muted desaturated palette lifted by one or two rich saturated accent colors.';

/** Ancestry chip → the figure description fragment. */
export const ANCESTRY: Record<string, string> = {
  fae: 'a delicate fae {role} with pointed ears and translucent iridescent dragonfly wings',
};

/** Role chip → the role/pose fragment (fills the {role} slot + the stance/gear). */
export const ROLE: Record<string, { noun: string; stance: string }> = {
  duelist: { noun: 'duelist', stance: 'in a dynamic dueling stance holding a curved thorn-blade rapier' },
};

/** Accent-color chip → the accent phrase. */
export const ACCENTS: Record<string, string> = {
  'plum + gold': 'plum purple and gold-ochre accents',
};

/** Setting chip → the ground/atmosphere block. */
export const SETTINGS: Record<string, string> = {
  'Winter Garden': 'Cold snowy ground, pale grey-white winter atmosphere, drifting snow.',
};

/** Frame chip → the composition-lock framing detail. */
export const FRAMES: Record<string, string> = {
  'Winter Garden': 'framed at the edges by thorny bramble vines',
};

/** The composition lock (Portrait spec layer 3) — always present. */
export const COMPOSITION_LOCK =
  'Character cleanly separated from the background on soft negative space, {frame}. Clean silhouette, three-quarter or full-body view, centered.';

/** The Avoid line (Portrait spec layer 4) — always present, verbatim. */
export const AVOID_LINE =
  'Avoid: anime or cel-shaded style, 3D render, photograph, text, watermark, logos, extra limbs, deformed hands, cluttered background, multiple characters.';

/** The exact-as-written line (Portrait spec layer 6). */
export const EXACT_LINE = 'Use this prompt exactly as written.';
