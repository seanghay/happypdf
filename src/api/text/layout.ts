import PDFFont from '../PDFFont';
import { CombedTextLayoutError } from '../errors';
import { TextAlignment } from './alignment';

import { PDFHexString } from '../../core';
import { wrapText } from './wrap';
import {
  cleanText,
  lineSplit,
  mergeLines,
  charAtIndex,
  charSplit,
} from '../../utils';

export interface TextPosition {
  text: string;
  encoded: PDFHexString;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayoutBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MIN_FONT_SIZE = 4;
const MAX_FONT_SIZE = 500;

const computeFontSize = (
  lines: string[],
  font: PDFFont,
  bounds: LayoutBounds,
  multiline: boolean = false,
) => {
  let fontSize = MIN_FONT_SIZE;

  while (fontSize < MAX_FONT_SIZE) {
    const size = fontSize;
    const measure = (t: string) => font.widthOfTextAtSize(t, size);

    // Count the lines the text actually occupies at this size, wrapping with
    // the same segmenter used to draw it so that scripts without spaces are
    // measured correctly.
    let linesUsed = 0;
    for (let idx = 0, len = lines.length; idx < len; idx++) {
      linesUsed += wrapText(lines[idx], measure, {
        maxWidth: bounds.width,
      }).length;
    }

    // Return if we exceeded the allowed width
    if (!multiline && linesUsed > lines.length) return fontSize - 1;

    const height = font.heightAtSize(fontSize);
    const lineHeight = height + height * 0.2;
    const totalHeight = lineHeight * linesUsed;

    // Return if we exceeded the allowed height
    if (totalHeight > Math.abs(bounds.height)) return fontSize - 1;

    fontSize += 1;
  }

  return fontSize;
};

const computeCombedFontSize = (
  line: string,
  font: PDFFont,
  bounds: LayoutBounds,
  cellCount: number,
) => {
  const cellWidth = bounds.width / cellCount;
  const cellHeight = bounds.height;

  let fontSize = MIN_FONT_SIZE;

  const chars = charSplit(line);
  while (fontSize < MAX_FONT_SIZE) {
    for (let idx = 0, len = chars.length; idx < len; idx++) {
      const c = chars[idx];
      const tooLong = font.widthOfTextAtSize(c, fontSize) > cellWidth * 0.75;
      if (tooLong) return fontSize - 1;
    }

    const height = font.heightAtSize(fontSize, { descender: false });
    if (height > cellHeight) return fontSize - 1;

    fontSize += 1;
  }

  return fontSize;
};

export interface LayoutTextOptions {
  alignment: TextAlignment;
  fontSize?: number;
  font: PDFFont;
  bounds: LayoutBounds;
}

export interface MultilineTextLayout {
  bounds: LayoutBounds;
  lines: TextPosition[];
  fontSize: number;
  lineHeight: number;
}

export const layoutMultilineText = (
  text: string,
  { alignment, fontSize, font, bounds }: LayoutTextOptions,
): MultilineTextLayout => {
  const lines = lineSplit(cleanText(text));

  if (fontSize === undefined || fontSize === 0) {
    fontSize = computeFontSize(lines, font, bounds, true);
  }
  const size = fontSize;
  const height = font.heightAtSize(size);
  const lineHeight = height + height * 0.2;

  const measure = (t: string) => font.widthOfTextAtSize(t, size);
  const wrapped = wrapText(text, measure, { maxWidth: bounds.width });

  const textLines: TextPosition[] = [];

  let minX = bounds.x;
  let minY = bounds.y;
  let maxX = bounds.x + bounds.width;
  let maxY = bounds.y + bounds.height;

  let y = bounds.y + bounds.height;
  for (let idx = 0, len = wrapped.length; idx < len; idx++) {
    const { text: line, width } = wrapped[idx];

    // A field's alignment comes from its /Q quadding entry, which has no
    // justified value, so every line is a single run.
    // prettier-ignore
    const x = (
        alignment === TextAlignment.Left   ? bounds.x
      : alignment === TextAlignment.Center ? bounds.x + (bounds.width / 2) - (width / 2)
      : alignment === TextAlignment.Right  ? bounds.x + bounds.width - width
      : bounds.x
    );

    y -= lineHeight;

    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + width > maxX) maxX = x + width;
    if (y + height > maxY) maxY = y + height;

    textLines.push({
      text: line,
      encoded: font.encodeText(line),
      width,
      height,
      x,
      y,
    });
  }

  return {
    fontSize,
    lineHeight,
    lines: textLines,
    bounds: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    },
  };
};

export interface LayoutCombedTextOptions {
  fontSize?: number;
  font: PDFFont;
  bounds: LayoutBounds;
  cellCount: number;
}

export interface CombedTextLayout {
  bounds: LayoutBounds;
  cells: TextPosition[];
  fontSize: number;
}

export const layoutCombedText = (
  text: string,
  { fontSize, font, bounds, cellCount }: LayoutCombedTextOptions,
): CombedTextLayout => {
  const line = mergeLines(cleanText(text));

  if (line.length > cellCount) {
    throw new CombedTextLayoutError(line.length, cellCount);
  }

  if (fontSize === undefined || fontSize === 0) {
    fontSize = computeCombedFontSize(line, font, bounds, cellCount);
  }

  const cellWidth = bounds.width / cellCount;

  const height = font.heightAtSize(fontSize, { descender: false });
  const y = bounds.y + (bounds.height / 2 - height / 2);

  const cells: TextPosition[] = [];

  let minX = bounds.x;
  let minY = bounds.y;
  let maxX = bounds.x + bounds.width;
  let maxY = bounds.y + bounds.height;

  let cellOffset = 0;
  let charOffset = 0;
  while (cellOffset < cellCount) {
    const [char, charLength] = charAtIndex(line, charOffset);

    const encoded = font.encodeText(char);
    const width = font.widthOfTextAtSize(char, fontSize);

    const cellCenter = bounds.x + (cellWidth * cellOffset + cellWidth / 2);
    const x = cellCenter - width / 2;

    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + width > maxX) maxX = x + width;
    if (y + height > maxY) maxY = y + height;

    cells.push({ text: line, encoded, width, height, x, y });

    cellOffset += 1;
    charOffset += charLength;
  }

  return {
    fontSize,
    cells,
    bounds: {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    },
  };
};

export interface LayoutSinglelineTextOptions {
  alignment: TextAlignment;
  fontSize?: number;
  font: PDFFont;
  bounds: LayoutBounds;
}

export interface SinglelineTextLayout {
  bounds: LayoutBounds;
  line: TextPosition;
  fontSize: number;
}

export const layoutSinglelineText = (
  text: string,
  { alignment, fontSize, font, bounds }: LayoutSinglelineTextOptions,
): SinglelineTextLayout => {
  const line = mergeLines(cleanText(text));

  if (fontSize === undefined || fontSize === 0) {
    fontSize = computeFontSize([line], font, bounds);
  }

  const encoded = font.encodeText(line);
  const width = font.widthOfTextAtSize(line, fontSize);
  const height = font.heightAtSize(fontSize, { descender: false });

  // prettier-ignore
  const x = (
      alignment === TextAlignment.Left   ? bounds.x
    : alignment === TextAlignment.Center ? bounds.x + (bounds.width / 2) - (width / 2)
    : alignment === TextAlignment.Right  ? bounds.x + bounds.width - width
    : bounds.x
  );

  const y = bounds.y + (bounds.height / 2 - height / 2);

  return {
    fontSize,
    line: { text: line, encoded, width, height, x, y },
    bounds: { x, y, width, height },
  };
};
