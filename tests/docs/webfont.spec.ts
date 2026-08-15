import fs from 'fs';
import path from 'path';

import {
  instantiateFont,
  subsetFont,
} from '../../src/core/harfbuzz/HarfBuzzSubset';

/**
 * Builds the web font the documentation site serves.
 *
 * Google Sans ships as a 4.6MB variable font, which is far too heavy for a
 * docs site, so it is instanced at a single weight and cut down to the
 * characters the site actually uses — with HappyPDF's own HarfBuzz subsetter.
 *
 * This lives in the test suite so that it is exercised on every run: if
 * subsetting ever breaks, this fails alongside everything else rather than
 * silently shipping a broken font.
 */

const SOURCE = 'assets/fonts/google_sans/GoogleSans.ttf';
const OUT_DIR = 'docs/public/webfonts';

/** Latin-1 plus the punctuation and symbols the docs use. */
const codePoints = () => {
  const points = new Set<number>();

  for (let cp = 0x20; cp <= 0x7e; cp++) points.add(cp); // ASCII
  for (let cp = 0xa0; cp <= 0xff; cp++) points.add(cp); // Latin-1 supplement

  const extra = '‘’“”–—…•·→←' + '✓✗×÷≤≥≠±€£¥';
  for (const ch of extra) points.add(ch.codePointAt(0)!);

  return [...points];
};

const build = async (weight: number, name: string) => {
  const source = new Uint8Array(fs.readFileSync(SOURCE));

  // Pin the weight axis, then keep only the characters we need.
  const instanced = await instantiateFont(source, { wght: weight });
  const subset = await subsetFont(instanced, [], codePoints());

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, name), subset);

  return { source: source.length, subset: subset.length };
};

describe('documentation web font', () => {
  it('subsets Google Sans small enough to serve', async () => {
    const regular = await build(400, 'GoogleSans-Regular-subset.ttf');
    const medium = await build(500, 'GoogleSans-Medium-subset.ttf');
    const bold = await build(700, 'GoogleSans-Bold-subset.ttf');

    for (const { source, subset } of [regular, medium, bold]) {
      expect(subset).toBeGreaterThan(1000);
      // A web font this size would be worse than not having one.
      expect(subset).toBeLessThan(300 * 1024);
      expect(subset).toBeLessThan(source / 10);
    }
  });

  it('produces fonts that still shape Latin text', async () => {
    const { PDFDocument } = await import('../../src/index');

    const bytes = fs.readFileSync(
      path.join(OUT_DIR, 'GoogleSans-Regular-subset.ttf'),
    );

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(new Uint8Array(bytes));

    expect(font.widthOfTextAtSize('Hello, world!', 16)).toBeGreaterThan(0);
  });
});
