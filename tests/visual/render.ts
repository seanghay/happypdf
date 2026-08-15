import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import UPNG from '@pdf-lib/upng';

/** Resolution the fixtures are rasterised at. Low enough to keep the reference
 * images small, high enough that a one-glyph error is obvious. */
export const DPI = 72;

export const REFERENCE_DIR = path.join(__dirname, 'references');

export const hasRasterizer = (): boolean => {
  try {
    execFileSync('pdftoppm', ['-v'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

/** Rasterises the first page of a PDF to greyscale PNG bytes. */
export const renderToPng = (pdf: Uint8Array): Uint8Array => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'happypdf-visual-'));
  try {
    const pdfPath = path.join(dir, 'page.pdf');
    fs.writeFileSync(pdfPath, pdf);

    execFileSync(
      'pdftoppm',
      [
        '-png',
        '-gray',
        '-r',
        String(DPI),
        '-f',
        '1',
        '-l',
        '1',
        '-singlefile',
        pdfPath,
        path.join(dir, 'out'),
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );

    return fs.readFileSync(path.join(dir, 'out.png'));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

export interface Comparison {
  /** Mean absolute per-channel difference, 0 (identical) to 1. */
  difference: number;
  /** Fraction of pixels differing by more than a rasteriser-noise margin. */
  changedPixels: number;
  sizeMismatch?: string;
}

const toPixels = (png: Uint8Array) => {
  const image = UPNG.decode(png);
  return {
    width: image.width,
    height: image.height,
    rgba: new Uint8Array(UPNG.toRGBA8(image)[0]),
  };
};

/**
 * Compares two renders.
 *
 * Different poppler builds antialias glyph edges slightly differently, so an
 * exact match is not a usable bar. Both a mean difference and a changed-pixel
 * count are reported: edge noise moves a lot of pixels by a little, whereas a
 * wrong or displaced glyph moves a smaller number of pixels a great deal.
 */
export const comparePng = (
  actual: Uint8Array,
  expected: Uint8Array,
): Comparison => {
  const a = toPixels(actual);
  const b = toPixels(expected);

  if (a.width !== b.width || a.height !== b.height) {
    return {
      difference: 1,
      changedPixels: 1,
      sizeMismatch: `${a.width}x${a.height} vs ${b.width}x${b.height}`,
    };
  }

  let total = 0;
  let changed = 0;
  const pixels = a.width * a.height;

  for (let idx = 0; idx < pixels; idx++) {
    const offset = idx * 4;
    // Greyscale render, so one channel carries all the information.
    const delta = Math.abs(a.rgba[offset] - b.rgba[offset]);
    total += delta;
    if (delta > 32) changed++;
  }

  return {
    difference: total / pixels / 255,
    changedPixels: changed / pixels,
  };
};

export const referencePath = (name: string) =>
  path.join(REFERENCE_DIR, `${name}.png`);
