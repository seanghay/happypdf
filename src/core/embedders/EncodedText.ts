import PDFHexString from '../objects/PDFHexString';

export interface EncodedGlyph {
  encoded: PDFHexString;
  xAdvance: number;
  yAdvance: number;
  xOffset: number;
  yOffset: number;
}

export interface EncodedTextRun {
  glyphs: EncodedGlyph[];
  advanceWidth: number;
  advanceHeight: number;
}

const encodedTextKey = '__pdfLibEncodedTextRun__';

export const attachEncodedTextRun = (
  encoded: PDFHexString,
  run: EncodedTextRun,
): PDFHexString => {
  (encoded as any)[encodedTextKey] = run;
  return encoded;
};

export const getEncodedTextRun = (
  encoded: PDFHexString,
): EncodedTextRun | undefined => (encoded as any)[encodedTextKey];
