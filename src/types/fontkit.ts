/**
 * Minimal structural types for a fontkit-compatible engine registered via
 * `PDFDocument.registerFontkit`. Compatible with upstream `fontkit` v2+ and
 * `@pdf-lib/fontkit`. Not a full mirror of either package's typings.
 */

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface Glyph {
  id: number;
  codePoints: number[];
  advanceWidth: number;
}

export interface GlyphPosition {
  /** The amount to move the virtual pen in the X direction after this glyph. */
  xAdvance: number;
  /** The amount to move the virtual pen in the Y direction after this glyph. */
  yAdvance: number;
  /** The offset from the pen position in the X direction at which to render. */
  xOffset: number;
  /** The offset from the pen position in the Y direction at which to render. */
  yOffset: number;
}

export interface GlyphRun {
  glyphs: Glyph[];
  positions: GlyphPosition[];
}

export interface SubsetStream {
  on: (
    eventType: 'data' | 'end',
    callback: (data: Uint8Array) => any,
  ) => SubsetStream;
}

export interface Subset {
  includeGlyph(glyph: number | Glyph): number;
  /** Upstream `fontkit` v2+ */
  encode?(): Uint8Array;
  /** `@pdf-lib/fontkit` */
  encodeStream?(): SubsetStream;
}

/** OpenType / AAT feature flags passed to `font.layout`. */
export type TypeFeatures = Record<string, boolean>;

/** Variable-font axis values (e.g. `{ wght: 700 }`). */
export interface FontVariations {
  [key: string]: number | undefined;
}

export interface Font {
  postscriptName: string | null;
  unitsPerEm: number;
  ascent: number;
  descent: number;
  italicAngle: number;
  capHeight: number;
  xHeight: number;
  bbox: BoundingBox;
  characterSet: number[];
  cff: any;
  'OS/2': { sFamilyClass: number };
  head: { macStyle: { italic: boolean } };
  post: { isFixedPitch: boolean };

  glyphForCodePoint(codePoint: number): Glyph;
  layout(str: string, features?: TypeFeatures | string[]): GlyphRun;
  createSubset(): Subset;
}

export interface Fontkit {
  create(buffer: Uint8Array, postscriptName?: string): Font | Promise<Font>;
}
