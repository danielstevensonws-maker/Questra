/**
 * The image-generation service interface (Brief 09a §2). One implementation per
 * vendor behind config; the assembler feeds it, results carry full provenance.
 * M2.4 ships the interface + a deterministic STUB (the real vendor call is the
 * slice-environment step; acceptability is a human judgment, not CI). Vendor code
 * never leaks outside an ImageGen implementation (§5.4 import-graph rule).
 */
export type ImageKind = 'portrait' | 'npc' | 'asset' | 'terrain';

export interface GenerationProvenance {
  prompt: string;
  vendor: string;
  ts: string;
}

export interface GeneratedImage {
  imageRef: string;
  meta: GenerationProvenance;
}

export interface ImageGen {
  generate(prompt: string, styleRefs: string[], kind: ImageKind): Promise<GeneratedImage>;
}

/**
 * A deterministic stub ImageGen: no vendor call, no network. It "generates" an
 * imageRef derived from a hash of the prompt (so the same prompt ⇒ the same ref,
 * mirroring the regeneration-consistency contract) and records provenance. The
 * real vendor implementation swaps in behind config; nothing else changes.
 */
export function makeStubImageGen(clock: () => string = () => 'stub-ts'): ImageGen {
  return {
    async generate(prompt, _styleRefs, kind): Promise<GeneratedImage> {
      const ref = `stub://${kind}/${hash(prompt)}`;
      return { imageRef: ref, meta: { prompt, vendor: 'stub', ts: clock() } };
    },
  };
}

/** Small stable hash for the stub's deterministic imageRef (not cryptographic). */
function hash(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}
