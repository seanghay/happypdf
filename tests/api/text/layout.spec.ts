import fs from 'fs';

import {
  layoutMultilineText,
  PDFDocument,
  StandardFonts,
  TextAlignment,
} from '../../../src/index';

const bounds = { x: 0, y: 0, width: 200, height: 400 };

const khmerBytes = fs.readFileSync(
  'assets/fonts/noto_sans_khmer/NotoSansKhmer-Regular.ttf',
);

describe('layoutMultilineText', () => {
  it('wraps text that exceeds the bounds width', async () => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const { lines } = layoutMultilineText(
      'the quick brown fox jumps over the lazy dog',
      { alignment: TextAlignment.Left, fontSize: 18, font, bounds },
    );

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(line.width).toBeLessThanOrEqual(200);
  });

  it('honours hard line breaks', async () => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const { lines } = layoutMultilineText('a\nb\nc', {
      alignment: TextAlignment.Left,
      fontSize: 12,
      font,
      bounds,
    });

    expect(lines.map((l) => l.text)).toEqual(['a', 'b', 'c']);
  });

  it.each([
    [TextAlignment.Left, (w: number) => 0],
    [TextAlignment.Center, (w: number) => (200 - w) / 2],
    [TextAlignment.Right, (w: number) => 200 - w],
  ])('positions lines for alignment %i', async (alignment, expectedX) => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const { lines } = layoutMultilineText('the quick brown fox jumps', {
      alignment,
      fontSize: 18,
      font,
      bounds,
    });

    for (const line of lines) {
      expect(line.x).toBeCloseTo(expectedX(line.width), 5);
    }
  });

  // Regression: field layout used to break only at whitespace, so Khmer — which
  // does not separate words with spaces — produced a single overflowing line.
  it('wraps Khmer text, which has no spaces between words', async () => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(khmerBytes);

    const text = 'សួស្តីពិភពលោកសូមស្វាគមន៍មកកាន់ប្រទេសកម្ពុជាដែលជាប្រទេសដ៏ស្រស់ស្អាត';
    const { lines } = layoutMultilineText(text, {
      alignment: TextAlignment.Left,
      fontSize: 14,
      font,
      bounds,
    });

    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) {
      expect(line.width).toBeLessThanOrEqual(bounds.width);
      // A break inside an orthographic cluster would strand a coeng.
      expect(line.text.endsWith('្')).toBe(false);
    }
  });

  it('auto-sizes Khmer text to fit the bounds', async () => {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(khmerBytes);

    const text = 'សួស្តីពិភពលោកសូមស្វាគមន៍មកកាន់ប្រទេសកម្ពុជា';
    const { fontSize, lines, lineHeight } = layoutMultilineText(text, {
      alignment: TextAlignment.Left,
      font,
      bounds,
    });

    expect(fontSize).toBeGreaterThan(0);
    expect(lines.length * lineHeight).toBeLessThanOrEqual(bounds.height);
    for (const line of lines) {
      expect(line.width).toBeLessThanOrEqual(bounds.width);
    }
  });
});
