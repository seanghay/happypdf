import fs from 'fs';

import { demos } from '../../docs/.vitepress/theme/demos';
import * as happypdf from '../../src/index';

/**
 * Executes every live demo from the documentation.
 *
 * The demos run in the reader's browser, so a broken snippet is invisible until
 * someone opens the page and it throws. Running them here means a change to the
 * library that invalidates a documented example fails the build instead.
 */

/** The manifest the docs build copies into `docs/public/fonts`. */
const FONT_FILES: Record<string, string> = JSON.parse(
  fs.readFileSync('docs/demo-fonts.json', 'utf8'),
);

const loadFonts = (names: string[] = []) => {
  const fonts: Record<string, Uint8Array> = {};
  for (const name of names) {
    const file = FONT_FILES[name];
    if (!file) throw new Error(`Demo references an unknown font: ${name}`);
    fonts[name] = new Uint8Array(fs.readFileSync(file));
  }
  return fonts;
};

describe('documentation demos', () => {
  it.each(Object.keys(demos))('%s runs and produces a PDF', async (id) => {
    const demo = demos[id];

    // Exactly how PdfDemo.vue evaluates the snippet.
    const build = new Function(
      'happypdf',
      'fonts',
      `return (async () => { ${demo.code} })()`,
    );

    const pdfDoc = await build(happypdf, loadFonts(demo.fonts));

    expect(pdfDoc, `${id} must return a PDFDocument`).toBeDefined();
    expect(typeof pdfDoc.save).toBe('function');

    const bytes = await pdfDoc.save();
    expect(bytes.length).toBeGreaterThan(1000);
    expect(Buffer.from(bytes.subarray(0, 5)).toString()).toBe('%PDF-');
  });

  it('only references fonts the docs build ships', () => {
    for (const [id, demo] of Object.entries(demos)) {
      for (const font of demo.fonts ?? []) {
        const source = FONT_FILES[font];
        expect(
          source,
          `${id} references an unlisted font: ${font}`,
        ).toBeDefined();
        expect(fs.existsSync(source), `missing font file: ${source}`).toBe(
          true,
        );
      }
    }
  });
});
