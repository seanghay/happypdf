import { decodeFromBase64 } from '../../utils';
import hbWasmBase64 from './hb.wasm.base64';

interface HarfBuzzGlyphData {
  g: number;
  cl: number;
  ax: number;
  ay: number;
  dx: number;
  dy: number;
}

interface HarfBuzzBlob {
  destroy(): void;
}

export interface HarfBuzzFace {
  upem: number;
  reference_table(table: string): Uint8Array | undefined;
  collectUnicodes(): Uint32Array;
  destroy(): void;
}

export interface HarfBuzzFont {
  hExtents(): {
    ascender: number;
    descender: number;
    lineGap: number;
  };
  glyphHAdvance(glyphId: number): number;
  glyphExtents(glyphId: number): {
    xBearing: number;
    yBearing: number;
    width: number;
    height: number;
  } | null;
  setScale(xScale: number, yScale: number): void;
  destroy(): void;
}

export interface HarfBuzzBuffer {
  addText(text: string): void;
  guessSegmentProperties(): void;
  getGlyphInfos(): Array<{ codepoint: number; cluster: number }>;
  getGlyphPositions(): Array<{
    x_advance: number;
    y_advance: number;
    x_offset: number;
    y_offset: number;
  }>;
  destroy(): void;
}

export interface HarfBuzz {
  createBlob(blob: ArrayBuffer): HarfBuzzBlob;
  createFace(blob: HarfBuzzBlob, index: number): HarfBuzzFace;
  createFont(face: HarfBuzzFace): HarfBuzzFont;
  createBuffer(): HarfBuzzBuffer;
  shape(font: HarfBuzzFont, buffer: HarfBuzzBuffer, features?: string): void;
}

export interface ShapedGlyphData extends HarfBuzzGlyphData {}

let harfBuzzPromise: Promise<HarfBuzz> | undefined;

const loadWasmBinary = () => decodeFromBase64(hbWasmBase64);

export const sliceFontBytes = (fontData: Uint8Array): ArrayBuffer =>
  fontData.buffer.slice(
    fontData.byteOffset,
    fontData.byteOffset + fontData.byteLength,
  ) as ArrayBuffer;

export const loadHarfBuzz = async (): Promise<HarfBuzz> => {
  if (!harfBuzzPromise) {
    harfBuzzPromise = (async () => {
      // tslint:disable-next-line:no-var-requires
      const createHarfBuzz = require('harfbuzzjs/hb.js');
      // tslint:disable-next-line:no-var-requires
      const bindHarfBuzz = require('harfbuzzjs/hbjs.js');

      const harfBuzzModule = await createHarfBuzz({
        wasmBinary: loadWasmBinary(),
      });

      return bindHarfBuzz(harfBuzzModule);
    })();
  }

  return harfBuzzPromise;
};
