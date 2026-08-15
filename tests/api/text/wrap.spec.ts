import { FontNames } from '@pdf-lib/standard-fonts';
import fs from 'fs';

import { CustomFontEmbedder, StandardFontEmbedder } from '../../../src/core';
import { wrapText } from '../../../src/api/text/wrap';

const helvetica = StandardFontEmbedder.for(FontNames.Helvetica);
const size = 24;
const measure = (text: string) => helvetica.widthOfTextAtSize(text, size);

/** Convenience: just the text of each wrapped line. */
const linesOf = (...args: Parameters<typeof wrapText>) =>
  wrapText(...args).map((line) => line.text);

describe('wrapText', () => {
  describe('hard breaks', () => {
    it('splits on every newline flavour', () => {
      expect(linesOf('foo\nbar\rbaz\fqux', measure)).toEqual([
        'foo',
        'bar',
        'baz',
        'qux',
      ]);
    });

    it('drops a trailing newline rather than emitting a blank line', () => {
      expect(linesOf('foo\n', measure)).toEqual(['foo']);
      expect(linesOf('foo\r', measure)).toEqual(['foo']);
    });

    it('preserves interior blank lines', () => {
      expect(linesOf('foo\n\nbar', measure)).toEqual(['foo', '', 'bar']);
    });

    it('returns a single empty line for empty input', () => {
      expect(linesOf('', measure)).toEqual(['']);
    });
  });

  describe('wrapping', () => {
    it('wraps at word boundaries within maxWidth', () => {
      const lines = wrapText('the quick brown fox', measure, { maxWidth: 120 });
      for (const line of lines) expect(line.width).toBeLessThanOrEqual(120);
      expect(lines.map((l) => l.text).join(' ')).toBe('the quick brown fox');
    });

    it('does not leave whitespace at the start or end of a wrapped line', () => {
      const lines = wrapText('the quick brown fox', measure, { maxWidth: 120 });
      for (const line of lines) expect(line.text).toBe(line.text.trim());
    });

    it('honours hard breaks while wrapping', () => {
      const lines = linesOf('aaa bbb\nccc ddd', measure, { maxWidth: 60 });
      expect(lines).toEqual(['aaa', 'bbb', 'ccc', 'ddd']);
    });

    it('breaks a word that cannot fit on a line of its own', () => {
      const lines = wrapText('supercalifragilistic', measure, {
        maxWidth: 80,
      });
      expect(lines.length).toBeGreaterThan(1);
      expect(lines.map((l) => l.text).join('')).toBe('supercalifragilistic');
      for (const line of lines) expect(line.width).toBeLessThanOrEqual(80);
    });

    it('lets an over-long word overflow when wordBreak is keep-all', () => {
      const lines = wrapText('supercalifragilistic', measure, {
        maxWidth: 80,
        wordBreak: 'keep-all',
      });
      expect(lines.map((l) => l.text)).toEqual(['supercalifragilistic']);
    });

    it('treats a soft hyphen as an optional break point', () => {
      const lines = linesOf('super­califragilistic', measure, {
        maxWidth: 80,
      });
      // The soft hyphen itself is never rendered.
      for (const line of lines) expect(line).not.toContain('­');
    });

    it('only honours hard breaks when maxWidth is omitted', () => {
      expect(linesOf('a very long line indeed', measure)).toEqual([
        'a very long line indeed',
      ]);
    });
  });

  describe('alignment', () => {
    const text = 'aaa bbb ccc ddd eee';
    const maxWidth = 200;

    it('left aligns at offset zero', () => {
      const lines = wrapText(text, measure, { maxWidth, align: 'left' });
      for (const line of lines) expect(line.runs[0].x).toBe(0);
    });

    it('centers each line within maxWidth', () => {
      const lines = wrapText(text, measure, { maxWidth, align: 'center' });
      for (const line of lines) {
        expect(line.runs[0].x).toBeCloseTo((maxWidth - line.width) / 2, 5);
      }
    });

    it('right aligns each line flush to maxWidth', () => {
      const lines = wrapText(text, measure, { maxWidth, align: 'right' });
      for (const line of lines) {
        expect(line.runs[0].x + line.width).toBeCloseTo(maxWidth, 5);
      }
    });

    it('aligns against the widest line when maxWidth is omitted', () => {
      const lines = wrapText('a\nlonger line', measure, { align: 'right' });
      const widest = Math.max(...lines.map((l) => l.width));
      for (const line of lines) {
        expect(line.runs[0].x + line.width).toBeCloseTo(widest, 5);
      }
    });
  });

  describe('justification', () => {
    const text = 'aaa bbb ccc ddd eee fff ggg hhh';
    const maxWidth = 200;

    it('stretches every line except the last of a paragraph', () => {
      const lines = wrapText(text, measure, { maxWidth, align: 'justify' });
      expect(lines.length).toBeGreaterThan(1);

      lines.forEach((line, idx) => {
        const isLast = idx === lines.length - 1;
        const lastRun = line.runs[line.runs.length - 1];
        const end = lastRun.x + measure(lastRun.text);

        if (isLast) {
          expect(line.runs).toHaveLength(1);
          expect(line.runs[0].x).toBe(0);
        } else {
          expect(end).toBeCloseTo(maxWidth, 4);
        }
      });
    });

    it('leaves the runs in reading order with increasing offsets', () => {
      const [first] = wrapText(text, measure, { maxWidth, align: 'justify' });
      for (let idx = 1; idx < first.runs.length; idx++) {
        expect(first.runs[idx].x).toBeGreaterThan(first.runs[idx - 1].x);
      }
      expect(first.runs.map((r) => r.text).join('')).toBe(first.text);
    });

    it('does not stretch a line with no break opportunities', () => {
      const lines = wrapText('unbreakable', measure, {
        maxWidth: 400,
        align: 'justify',
      });
      expect(lines[0].runs).toHaveLength(1);
      expect(lines[0].runs[0].x).toBe(0);
    });

    it('falls back to left when there is no maxWidth to fill', () => {
      const lines = wrapText(text, measure, { align: 'justify' });
      for (const line of lines) expect(line.runs[0].x).toBe(0);
    });
  });

  describe('scripts without spaces', () => {
    it('wraps Japanese text between words', async () => {
      const bytes = fs.readFileSync(
        'assets/fonts/source_hans_jp/SourceHanSerifJP-Regular.otf',
      );
      const font = await CustomFontEmbedder.for(bytes);
      const jpMeasure = (t: string) => font.widthOfTextAtSize(t, 24);

      const input =
        '遅未亮惑職界転藤柔索名午納，問通桑転加料演載満経信回込町者訟窃。';
      const lines = wrapText(input, jpMeasure, { maxWidth: 125 });

      expect(lines.length).toBeGreaterThan(1);
      expect(lines.map((l) => l.text).join('')).toBe(input);
      for (const line of lines) expect(line.width).toBeLessThanOrEqual(125);
    });

    it('wraps Khmer text without splitting inside a cluster', async () => {
      const bytes = fs.readFileSync(
        'assets/fonts/noto_sans_khmer/NotoSansKhmer-Regular.ttf',
      );
      const font = await CustomFontEmbedder.for(bytes);
      const khMeasure = (t: string) => font.widthOfTextAtSize(t, 18);

      const input = 'សួស្តីពិភពលោក សូមស្វាគមន៍មកកាន់ប្រទេសកម្ពុជា';
      const lines = wrapText(input, khMeasure, { maxWidth: 120 });

      expect(lines.length).toBeGreaterThan(1);
      // No coeng (U+17D2) may be orphaned at the end of a line, which is what
      // happens when a break lands inside an orthographic cluster.
      for (const line of lines) expect(line.text.endsWith('្')).toBe(false);
    });
  });
});
