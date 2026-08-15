import { Font, FontVariations, Glyph, TypeFeatures } from '../../types/fontkit';

import { createCmap } from './CMap';
import { attachEncodedTextRun, EncodedGlyph } from './EncodedText';
import { deriveFontFlags } from './FontFlags';
import HarfBuzzEmbeddedFont from '../harfbuzz/HarfBuzzFont';
import PDFHexString from '../objects/PDFHexString';
import PDFRef from '../objects/PDFRef';
import PDFString from '../objects/PDFString';
import PDFContext from '../PDFContext';
import {
  byAscendingId,
  Cache,
  sortedUniq,
  toHexStringOfMinLength,
} from '../../utils';

/**
 * A note of thanks to the developers of https://github.com/foliojs/pdfkit, as
 * this class borrows from:
 *   https://github.com/devongovett/pdfkit/blob/e71edab0dd4657b5a767804ba86c94c58d01fbca/lib/image/jpeg.coffee
 */
class CustomFontEmbedder {
  static async for(
    fontDataOrFontkit: Uint8Array | unknown,
    fontDataOrCustomName?: Uint8Array | string,
    customNameOrFeatures?: string | TypeFeatures,
    fontFeaturesOrVariations?: TypeFeatures | FontVariations,
    fontVariations?: FontVariations,
  ) {
    const {
      fontData,
      customName,
      resolvedFontFeatures,
      resolvedFontVariations,
    } = parseCreateArgs(
      fontDataOrFontkit,
      fontDataOrCustomName,
      customNameOrFeatures,
      fontFeaturesOrVariations,
      fontVariations,
    );
    const font = await HarfBuzzEmbeddedFont.create(
      fontData,
      resolvedFontVariations,
    );

    // Embed the instanced bytes, not the caller's: with a variable font the
    // originals would render at the axis defaults regardless of `variations`.
    return new CustomFontEmbedder(
      font,
      font.fontData,
      customName,
      resolvedFontFeatures,
    );
  }

  readonly font: Font;
  readonly scale: number;
  readonly fontData: Uint8Array;
  readonly fontName: string;
  readonly customName: string | undefined;
  readonly fontFeatures: TypeFeatures | undefined;

  protected baseFontName: string;
  protected glyphCache: Cache<Glyph[]>;

  protected constructor(
    font: Font,
    fontData: Uint8Array,
    customName?: string,
    fontFeatures?: TypeFeatures,
  ) {
    this.font = font;
    this.scale = 1000 / this.font.unitsPerEm;
    this.fontData = fontData;
    this.fontName = this.font.postscriptName || 'Font';
    this.customName = customName;
    this.fontFeatures = fontFeatures;

    this.baseFontName = '';
    this.glyphCache = Cache.populatedBy(this.allGlyphsInFontSortedById);
  }

  /**
   * Encode the JavaScript string into this font. (JavaScript encodes strings in
   * Unicode, but embedded fonts use their own custom encodings)
   */
  encodeText(text: string): PDFHexString {
    const { glyphs, positions } = this.layout(text);
    const hexCodes = new Array(glyphs.length);
    const encodedGlyphs = new Array(glyphs.length) as EncodedGlyph[];

    for (let idx = 0, len = glyphs.length; idx < len; idx++) {
      const glyph = glyphs[idx];
      const position = positions[idx];
      const hexCode = toHexStringOfMinLength(glyph.id, 4);
      hexCodes[idx] = hexCode;
      encodedGlyphs[idx] = {
        encoded: PDFHexString.of(hexCode),
        xAdvance: position.xAdvance * this.scale,
        yAdvance: position.yAdvance * this.scale,
        xOffset: position.xOffset * this.scale,
        yOffset: position.yOffset * this.scale,
      };
    }

    return attachEncodedTextRun(PDFHexString.of(hexCodes.join('')), {
      glyphs: encodedGlyphs,
      advanceWidth: sumPositionValues(positions, 'xAdvance') * this.scale,
      advanceHeight: sumPositionValues(positions, 'yAdvance') * this.scale,
    });
  }

  glyphCountOfText(text: string): number {
    const { glyphs } = this.layout(text);
    return glyphs.length;
  }

  // The advanceWidth takes into account kerning automatically, so we don't
  // have to do that manually like we do for the standard fonts.
  widthOfTextAtSize(text: string, size: number): number {
    const { positions } = this.layout(text);
    const totalWidth = sumPositionValues(positions, 'xAdvance') * this.scale;
    return totalWidth * (size / 1000);
  }

  heightOfFontAtSize(
    size: number,
    options: { descender?: boolean } = {},
  ): number {
    const { descender = true } = options;

    const { ascent, descent, bbox } = this.font;
    const yTop = (ascent || bbox.maxY) * this.scale;
    const yBottom = (descent || bbox.minY) * this.scale;

    let height = yTop - yBottom;
    if (!descender) height -= Math.abs(descent) || 0;

    return (height / 1000) * size;
  }

  sizeOfFontAtHeight(height: number): number {
    const { ascent, descent, bbox } = this.font;
    const yTop = (ascent || bbox.maxY) * this.scale;
    const yBottom = (descent || bbox.minY) * this.scale;
    return (1000 * height) / (yTop - yBottom);
  }

  embedIntoContext(context: PDFContext, ref?: PDFRef): Promise<PDFRef> {
    this.baseFontName =
      this.customName || context.addRandomSuffix(this.fontName);
    return this.embedFontDict(context, ref);
  }

  protected async embedFontDict(
    context: PDFContext,
    ref?: PDFRef,
  ): Promise<PDFRef> {
    const cidFontDictRef = await this.embedCIDFontDict(context);
    const unicodeCMapRef = this.embedUnicodeCmap(context);

    const fontDict = context.obj({
      Type: 'Font',
      Subtype: 'Type0',
      BaseFont: this.baseFontName,
      Encoding: 'Identity-H',
      DescendantFonts: [cidFontDictRef],
      ToUnicode: unicodeCMapRef,
    });

    if (ref) {
      context.assign(ref, fontDict);
      return ref;
    } else {
      return context.register(fontDict);
    }
  }

  protected isCFF(): boolean {
    return this.font.cff;
  }

  protected async embedCIDFontDict(context: PDFContext): Promise<PDFRef> {
    const fontDescriptorRef = await this.embedFontDescriptor(context);

    const cidFontDict = context.obj({
      Type: 'Font',
      Subtype: this.isCFF() ? 'CIDFontType0' : 'CIDFontType2',
      CIDToGIDMap: 'Identity',
      BaseFont: this.baseFontName,
      CIDSystemInfo: {
        Registry: PDFString.of('Adobe'),
        Ordering: PDFString.of('Identity'),
        Supplement: 0,
      },
      FontDescriptor: fontDescriptorRef,
      W: this.computeWidths(),
    });

    return context.register(cidFontDict);
  }

  protected async embedFontDescriptor(context: PDFContext): Promise<PDFRef> {
    const fontStreamRef = await this.embedFontStream(context);

    const { scale } = this;
    const { italicAngle, ascent, descent, capHeight, xHeight } = this.font;
    const { minX, minY, maxX, maxY } = this.font.bbox;

    const fontDescriptor = context.obj({
      Type: 'FontDescriptor',
      FontName: this.baseFontName,
      Flags: deriveFontFlags(this.font),
      FontBBox: [minX * scale, minY * scale, maxX * scale, maxY * scale],
      ItalicAngle: italicAngle,
      Ascent: ascent * scale,
      Descent: descent * scale,
      CapHeight: (capHeight || ascent) * scale,
      XHeight: (xHeight || 0) * scale,

      // Not sure how to compute/find this, nor is anybody else really:
      // https://stackoverflow.com/questions/35485179/stemv-value-of-the-truetype-font
      StemV: 0,

      [this.isCFF() ? 'FontFile3' : 'FontFile2']: fontStreamRef,
    });

    return context.register(fontDescriptor);
  }

  protected async serializeFont(): Promise<Uint8Array> {
    return this.fontData;
  }

  protected async embedFontStream(context: PDFContext): Promise<PDFRef> {
    const fontStream = context.flateStream(await this.serializeFont(), {
      Subtype: this.isCFF() ? 'CIDFontType0C' : undefined,
    });
    return context.register(fontStream);
  }

  protected embedUnicodeCmap(context: PDFContext): PDFRef {
    const cmap = createCmap(this.glyphCache.access(), this.glyphId.bind(this));
    const cmapStream = context.flateStream(cmap);
    return context.register(cmapStream);
  }

  protected glyphId(glyph?: Glyph): number {
    return glyph ? glyph.id : -1;
  }

  protected layout(text: string) {
    const { glyphs, positions } = this.font.layout(text, this.fontFeatures);
    return { glyphs, positions };
  }

  protected computeWidths(): (number | number[])[] {
    const glyphs = this.glyphCache.access();

    const widths: (number | number[])[] = [];
    let currSection: number[] = [];

    for (let idx = 0, len = glyphs.length; idx < len; idx++) {
      const currGlyph = glyphs[idx];
      const prevGlyph = glyphs[idx - 1];

      const currGlyphId = this.glyphId(currGlyph);
      const prevGlyphId = this.glyphId(prevGlyph);

      if (idx === 0) {
        widths.push(currGlyphId);
      } else if (currGlyphId - prevGlyphId !== 1) {
        widths.push(currSection);
        widths.push(currGlyphId);
        currSection = [];
      }

      currSection.push(currGlyph.advanceWidth * this.scale);
    }

    widths.push(currSection);

    return widths;
  }

  private allGlyphsInFontSortedById = (): Glyph[] => {
    const glyphs: Glyph[] = new Array(this.font.characterSet.length);
    for (let idx = 0, len = glyphs.length; idx < len; idx++) {
      const codePoint = this.font.characterSet[idx];
      glyphs[idx] = this.font.glyphForCodePoint(codePoint);
    }
    return sortedUniq(glyphs.sort(byAscendingId), (g) => g.id);
  };
}

export default CustomFontEmbedder;

const sumPositionValues = (
  positions: {
    xAdvance: number;
    yAdvance: number;
    xOffset: number;
    yOffset: number;
  }[],
  key: 'xAdvance' | 'yAdvance',
) => {
  let total = 0;
  for (let idx = 0, len = positions.length; idx < len; idx++) {
    total += positions[idx][key];
  }
  return total;
};

export const parseCreateArgs = (
  fontDataOrFontkit: Uint8Array | unknown,
  fontDataOrCustomName?: Uint8Array | string,
  customNameOrFeatures?: string | TypeFeatures,
  fontFeaturesOrVariations?: TypeFeatures | FontVariations,
  fontVariations?: FontVariations,
) => {
  if (fontDataOrFontkit instanceof Uint8Array) {
    return {
      fontData: fontDataOrFontkit,
      customName:
        typeof fontDataOrCustomName === 'string'
          ? fontDataOrCustomName
          : undefined,
      resolvedFontFeatures: customNameOrFeatures as TypeFeatures | undefined,
      resolvedFontVariations: fontFeaturesOrVariations as
        | FontVariations
        | undefined,
    };
  }

  return {
    fontData: fontDataOrCustomName as Uint8Array,
    customName: customNameOrFeatures as string | undefined,
    resolvedFontFeatures: fontFeaturesOrVariations as TypeFeatures | undefined,
    resolvedFontVariations: fontVariations,
  };
};
