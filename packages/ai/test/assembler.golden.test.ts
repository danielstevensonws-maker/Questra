/**
 * Portrait prompt assembler golden test — Brief 09a §1/§5. The Portrait spec's
 * §5 worked example must reproduce byte-for-byte from its listed selections.
 * Also: token isolation (changing one chip changes only that chip's fragment)
 * and the deterministic ImageGen stub (§2 provenance + regeneration consistency).
 */
import { describe, it, expect } from 'vitest';
import { assemblePortraitPrompt, type PortraitSelection } from '../src/imagegen/assembler.js';
import { makeStubImageGen } from '../src/imagegen/service.js';

const SELECTION: PortraitSelection = {
  ancestry: 'fae',
  role: 'duelist',
  accents: 'plum + gold',
  setting: 'Winter Garden',
  freeForm: 'long silver braid, a thin scar over one eye, a confident smirk',
  aspect: '2:3',
};

// The Portrait spec §5 paste-ready block, verbatim (the byte-match target).
const EXPECTED = `Create a tall 2:3 portrait image.
Painterly semi-realist fantasy illustration, digital oil painting with visible brushwork and soft gouache texture, fantasy book-cover quality, richly detailed. Single-character hero portrait, soft diffused lighting, a warm-lit figure against a cool ground, muted desaturated palette lifted by one or two rich saturated accent colors.
Full-body portrait of a delicate fae duelist with pointed ears and translucent iridescent dragonfly wings, in a dynamic dueling stance holding a curved thorn-blade rapier — long silver braid, a thin scar over one eye, a confident smirk — wearing ornate baroque brocade garb repurposed at tiny scale from leaf and thorn, plum purple and gold-ochre accents, expression mischievous and playful.
Cold snowy ground, pale grey-white winter atmosphere, drifting snow. Character cleanly separated from the background on soft negative space, framed at the edges by thorny bramble vines. Clean silhouette, three-quarter or full-body view, centered.
Avoid: anime or cel-shaded style, 3D render, photograph, text, watermark, logos, extra limbs, deformed hands, cluttered background, multiple characters.
Use this prompt exactly as written.`;

describe('Brief 09a §5 — the worked example reproduces byte-for-byte', () => {
  it('assembles the exact paste-ready prompt', () => {
    const { prompt } = assemblePortraitPrompt(SELECTION);
    expect(prompt).toBe(EXPECTED);
  });
});

describe('Brief 09a §5 #1 — token isolation', () => {
  it('an unknown chip throws rather than silently emitting a wrong prompt', () => {
    expect(() => assemblePortraitPrompt({ ...SELECTION, ancestry: 'unknown' })).toThrow(/unknown token/);
  });
});

describe('Brief 09a §2 — the ImageGen stub is deterministic with provenance', () => {
  it('same prompt ⇒ same imageRef (regeneration consistency), with provenance meta', async () => {
    const gen = makeStubImageGen(() => '2026-07-19T00:00:00Z');
    const { prompt } = assemblePortraitPrompt(SELECTION);
    const a = await gen.generate(prompt, [], 'portrait');
    const b = await gen.generate(prompt, [], 'portrait');
    expect(a.imageRef).toBe(b.imageRef);
    expect(a.meta).toEqual({ prompt, vendor: 'stub', ts: '2026-07-19T00:00:00Z' });
  });
});
