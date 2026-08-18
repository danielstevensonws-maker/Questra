/**
 * HUD type hygiene.
 *
 * WHY THIS EXISTS. `packages/ui` has had a token-hygiene suite since ADR-0014,
 * but it scans only `packages/ui/src` — and every Player HUD primitive lives
 * here in `packages/web/src/primitives`, so it was never covered. The hub
 * duly drifted: 8.5px, 9px, 9.5px and `--qa-text-whisper` (10px) were all
 * rendering the same "small mono caps label", plus one-off 13px and 22px.
 * Nothing failed, because nothing was looking.
 *
 * This suite closes that hole for the surfaces a player stares at for three
 * hours. It is deliberately scoped to the HUD files rather than all of
 * `packages/web`: the wizard/lobby surfaces have their own drift to clean up
 * and failing on them here would just get this suite skipped. Widen `HUD_FILES`
 * as those surfaces are brought onto the ramp.
 *
 * The rule: a component may not name a font size at all. It asks hudType for a
 * ROLE (`sectionLabel`, `statValue`, …) and the role owns the token. See
 * hudType.ts for why roles rather than sizes.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const primitives = join(here, '../src/primitives');

/** The Player HUD surfaces — the ones this redesign brought onto the type ramp. */
const HUD_FILES = [
  'ActionBar.tsx',
  'DiceLog.tsx',
  'PlayerHub.tsx',
  'SceneHeader.tsx',
  'StatBar.tsx',
  'TurnStrip.tsx',
  'VitalsBar.tsx',
  'hudType.ts',
  // Player View v2 ("The Near Edge"). A second concept for the same screen,
  // built fresh — so it joins the guard on day one rather than drifting first
  // and being cleaned up afterwards, which is how v1 ended up with four sizes
  // doing one job. v2/ScreenStyles.tsx is scanned too: it is a stylesheet, but
  // it is still HUD styling, and a hex colour in a template literal is exactly
  // as much of a leak as one in a style object.
  'v2/ActionRows.tsx',
  'v2/JournalRail.tsx',
  'v2/NearEdge.tsx',
  'v2/Overlays.tsx',
  'v2/PlayerViewV2.tsx',
  'v2/RoundSpine.tsx',
  'v2/SceneRail.tsx',
  'v2/ScreenStyles.tsx',
  'v2/TableGround.tsx',
  'v2/glyphs.tsx',
  'v2/parts.tsx',
  'v2/type.ts',
];

/** The modules allowed to name a font family — the type ramps themselves. */
const TYPE_MODULES = new Set(['hudType.ts', 'v2/type.ts', 'v2/ScreenStyles.tsx']);

const files = HUD_FILES.map((name) => ({ name, text: readFileSync(join(primitives, name), 'utf8') }));

/** Strip comments so prose examples ("8.5px") don't trip the scanners. */
const codeOf = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

describe('the HUD reads its type from the token ramp', () => {
  it('finds the HUD sources', () => {
    expect(files.length).toBe(HUD_FILES.length);
    for (const f of files) expect(f.text.length, `${f.name} is empty`).toBeGreaterThan(0);
  });

  it('no numeric fontSize — only var(--qa-text-*) via a hudType role', () => {
    for (const { name, text } of files) {
      const hits = codeOf(text).match(/fontSize:\s*[\d.]+/g);
      expect(hits, `${name} hardcodes a font size: ${hits?.join(', ')}. Use a role from hudType.ts.`).toBeNull();
    }
  });

  it('only a type module names a font family', () => {
    for (const { name, text } of files) {
      if (TYPE_MODULES.has(name)) continue;
      const hits = codeOf(text).match(/var\(--qa-font-(display|body|mono)\)/g);
      expect(hits, `${name} names a font family directly: ${hits?.join(', ')}. Use a role from hudType.ts.`).toBeNull();
    }
  });

  it('no hex / rgb colour literals', () => {
    for (const { name, text } of files) {
      const code = codeOf(text);
      expect(code.match(/#[0-9a-fA-F]{3,8}\b/g), `${name} hardcodes a hex colour`).toBeNull();
      expect(code.match(/\b(rgba?|hsla?)\s*\(/g), `${name} hardcodes a colour function`).toBeNull();
    }
  });

  it('no literal animation durations', () => {
    for (const { name, text } of files) {
      const hits = codeOf(text).match(/\b\d+(\.\d+)?m?s\b/g);
      expect(hits, `${name} hardcodes a duration: ${hits?.join(', ')}`).toBeNull();
    }
  });

  /**
   * v2 keeps its stylesheet in a template literal, which has bitten twice: a
   * backtick inside a CSS comment (quoting a class name, the natural thing to
   * write) silently closes the string and the file stops parsing. Two backticks
   * is exactly the pair that opens and closes the literal; a third means one
   * has been written inside it.
   */
  it('the v2 stylesheet has no backtick inside its template literal', () => {
    const sheet = files.find((f) => f.name === 'v2/ScreenStyles.tsx');
    expect(sheet, 'v2/ScreenStyles.tsx is not in HUD_FILES').toBeDefined();
    // Everything from the declaration onward: the file's own JSDoc header may
    // quote class names freely, since it sits outside the literal.
    const body = sheet!.text.slice(sheet!.text.indexOf('const CSS ='));
    const count = (body.match(/`/g) ?? []).length;
    expect(count, 'a backtick inside the CSS closes the template literal — write class names bare in CSS comments').toBe(2);
  });
});
