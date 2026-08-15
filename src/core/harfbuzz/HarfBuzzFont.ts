import {
  BoundingBox,
  Font,
  FontVariations,
  Glyph,
  GlyphRun,
  Subset,
  TypeFeatures,
} from '../../types/fontkit';

import {
  HarfBuzz,
  HarfBuzzFace,
  HarfBuzzFont,
  loadHarfBuzz,
  sliceFontBytes,
} from './HarfBuzz';
import { instantiateFont, subsetFont } from './HarfBuzzSubset';
import { sortedUniq } from '../../utils';

class HarfBuzzEmbeddedFont implements Font {
  static async create(
    fontData: Uint8Array,
    variations?: FontVariations,
  ): Promise<HarfBuzzEmbeddedFont> {
    const materializedFontData = await instantiateFont(fontData, variations);
    const harfBuzz = await loadHarfBuzz();
    const blob = harfBuzz.createBlob(sliceFontBytes(materializedFontData));
    const face = harfBuzz.createFace(blob, 0);
    const font = harfBuzz.createFont(face);

    const parsed = parseFontMetadata(face, font);
    font.setScale(parsed.unitsPerEm, parsed.unitsPerEm);

    return new HarfBuzzEmbeddedFont(
      harfBuzz,
      blob,
      face,
      font,
      materializedFontData,
      parsed,
    );
  }

  readonly postscriptName: string | null;
  readonly fullName: string | null;
  readonly familyName: string | null;
  readonly subfamilyName: string | null;
  readonly copyright: string | null;
  readonly version: string | null;
  readonly unitsPerEm: number;
  readonly ascent: number;
  readonly descent: number;
  readonly lineGap: number;
  readonly underlinePosition: number;
  readonly underlineThickness: number;
  readonly italicAngle: number;
  readonly capHeight: number;
  readonly xHeight: number;
  readonly bbox: BoundingBox;
  readonly numGlyphs: number;
  readonly characterSet: number[];
  readonly availableFeatures: (keyof TypeFeatures)[];
  readonly cff: any;
  readonly 'OS/2': { sFamilyClass: number };
  readonly head: { macStyle: { italic: boolean } };
  readonly post: { isFixedPitch: boolean };

  private readonly harfBuzz: HarfBuzz;
  private readonly hbBlob: any;
  private readonly hbFace: HarfBuzzFace;
  private readonly hbFont: HarfBuzzFont;
  private readonly fontData: Uint8Array;
  private readonly cmap: CmapLookup;

  private constructor(
    harfBuzz: HarfBuzz,
    hbBlob: any,
    hbFace: HarfBuzzFace,
    hbFont: HarfBuzzFont,
    fontData: Uint8Array,
    parsed: ParsedFontMetadata,
  ) {
    this.harfBuzz = harfBuzz;
    this.hbBlob = hbBlob;
    this.hbFace = hbFace;
    this.hbFont = hbFont;
    this.fontData = fontData;
    this.cmap = parsed.cmap;

    this.postscriptName = parsed.postscriptName;
    this.fullName = parsed.fullName;
    this.familyName = parsed.familyName;
    this.subfamilyName = parsed.subfamilyName;
    this.copyright = parsed.copyright;
    this.version = parsed.version;
    this.unitsPerEm = parsed.unitsPerEm;
    this.ascent = parsed.ascent;
    this.descent = parsed.descent;
    this.lineGap = parsed.lineGap;
    this.underlinePosition = parsed.underlinePosition;
    this.underlineThickness = parsed.underlineThickness;
    this.italicAngle = parsed.italicAngle;
    this.capHeight = parsed.capHeight;
    this.xHeight = parsed.xHeight;
    this.bbox = parsed.bbox;
    this.numGlyphs = parsed.numGlyphs;
    this.characterSet = parsed.characterSet;
    this.availableFeatures = [];
    this.cff = parsed.cff;
    this['OS/2'] = { sFamilyClass: parsed.familyClass };
    this.head = { macStyle: { italic: parsed.italic } };
    this.post = { isFixedPitch: parsed.isFixedPitch };
  }

  glyphForCodePoint(codePoint: number): Glyph {
    const glyphId = this.cmap.glyphIndex(codePoint);
    return this.getGlyph(glyphId, [codePoint]);
  }

  hasGlyphForCodePoint(codePoint: number): boolean {
    return this.cmap.glyphIndex(codePoint) !== 0;
  }

  glyphsForString(str: string): Glyph[] {
    const glyphs: Glyph[] = [];
    for (let idx = 0, len = str.length; idx < len;) {
      const codePoint = str.codePointAt(idx)!;
      glyphs.push(this.glyphForCodePoint(codePoint));
      idx += codePoint > 0xffff ? 2 : 1;
    }
    return glyphs;
  }

  widthOfGlyph(glyphId: number): number {
    return this.hbFont.glyphHAdvance(glyphId);
  }

  layout(
    str: string,
    features?: TypeFeatures | (keyof TypeFeatures)[],
  ): GlyphRun {
    this.keepHarfBuzzReferencesAlive();
    const buffer = this.harfBuzz.createBuffer();
    try {
      buffer.addText(str);
      buffer.guessSegmentProperties();
      this.harfBuzz.shape(this.hbFont, buffer, formatFeatures(features));

      const infos = buffer.getGlyphInfos();
      const rawPositions = buffer.getGlyphPositions();
      const clusterMap = buildClusterCodePointMap(
        str,
        infos.map((info) => info.cluster),
      );

      const glyphs = new Array(infos.length);
      const positions = new Array(infos.length);
      let advanceWidth = 0;
      let advanceHeight = 0;

      for (let idx = 0, len = infos.length; idx < len; idx++) {
        glyphs[idx] = this.getGlyph(
          infos[idx].codepoint,
          clusterMap[infos[idx].cluster],
        );
        positions[idx] = {
          xAdvance: rawPositions[idx].x_advance,
          yAdvance: rawPositions[idx].y_advance,
          xOffset: rawPositions[idx].x_offset,
          yOffset: rawPositions[idx].y_offset,
        };
        advanceWidth += rawPositions[idx].x_advance;
        advanceHeight += rawPositions[idx].y_advance;
      }

      void features;
      void advanceWidth;
      void advanceHeight;

      return { glyphs, positions };
    } finally {
      buffer.destroy();
    }
  }

  getGlyph(glyphId: number, codePoints: number[] = []): Glyph {
    this.keepHarfBuzzReferencesAlive();

    return {
      id: glyphId,
      codePoints,
      advanceWidth: this.hbFont.glyphHAdvance(glyphId),
    };
  }

  createSubset(): Subset {
    return new HarfBuzzFontSubset(this.fontData, !!this.cff);
  }

  private keepHarfBuzzReferencesAlive() {
    return this.hbBlob && this.hbFace;
  }
}

export default HarfBuzzEmbeddedFont;

class HarfBuzzFontSubset implements Subset {
  readonly cff: boolean;

  private readonly fontData: Uint8Array;
  private readonly glyphs = new Set<number>();
  private readonly glyphIdMap = new Map<number, number>();
  private readonly glyphIdsBySubsetId: number[] = [];
  private readonly codePoints = new Set<number>();

  constructor(fontData: Uint8Array, cff: boolean) {
    this.fontData = fontData;
    this.cff = cff;
  }

  includeGlyph(glyph: number | Glyph): number {
    const glyphObject = typeof glyph === 'number' ? undefined : glyph;
    const glyphId = typeof glyph === 'number' ? glyph : glyph.id;

    const existingSubsetGlyphId = this.glyphIdMap.get(glyphId);
    if (existingSubsetGlyphId !== undefined) return existingSubsetGlyphId;

    const subsetGlyphId = this.glyphIdMap.size + 1;

    this.glyphs.add(glyphId);
    this.glyphIdMap.set(glyphId, subsetGlyphId);
    this.glyphIdsBySubsetId[subsetGlyphId] = glyphId;
    if (glyphObject) {
      for (let idx = 0, len = glyphObject.codePoints.length; idx < len; idx++) {
        this.codePoints.add(glyphObject.codePoints[idx]);
      }
    }

    return subsetGlyphId;
  }

  encodeStream() {
    const listeners = {
      data: [] as Array<(data: Uint8Array) => any>,
      end: [] as Array<() => any>,
      error: [] as Array<(error: Error) => any>,
    };

    const stream = {
      on: (
        eventType: 'data' | 'end' | 'error',
        callback:
          | ((data: Uint8Array) => any)
          | ((error: Error) => any)
          | (() => any),
      ) => {
        (listeners as any)[eventType].push(callback);
        return stream;
      },
    };

    const emit = (event: 'data' | 'end' | 'error', value?: any) => {
      const callbacks = (listeners as any)[event];
      for (let idx = 0, len = callbacks.length; idx < len; idx++) {
        callbacks[idx](value);
      }
    };

    Promise.resolve()
      .then(() =>
        subsetFont(
          this.fontData,
          Array.from(this.glyphs).sort((a, b) => a - b),
          Array.from(this.codePoints).sort((a, b) => a - b),
        ),
      )
      .then((bytes) => {
        emit('data', bytes);
        emit('end');
      })
      .catch((error) => emit('error', error));

    return stream as any;
  }

  glyphIdForSubsetId(subsetGlyphId: number): number {
    return this.glyphIdsBySubsetId[subsetGlyphId] || 0;
  }
}

interface ParsedFontMetadata {
  postscriptName: string | null;
  fullName: string | null;
  familyName: string | null;
  subfamilyName: string | null;
  copyright: string | null;
  version: string | null;
  unitsPerEm: number;
  ascent: number;
  descent: number;
  lineGap: number;
  underlinePosition: number;
  underlineThickness: number;
  italicAngle: number;
  capHeight: number;
  xHeight: number;
  bbox: BoundingBox;
  numGlyphs: number;
  characterSet: number[];
  familyClass: number;
  italic: boolean;
  isFixedPitch: boolean;
  cff: boolean;
  cmap: CmapLookup;
}

interface CmapLookup {
  glyphIndex(codePoint: number): number;
  includesNotdefCodePoint: boolean;
}

const parseFontMetadata = (
  face: HarfBuzzFace,
  font: HarfBuzzFont,
): ParsedFontMetadata => {
  const head = mustTable(face, 'head');
  const hhea = mustTable(face, 'hhea');
  const maxp = mustTable(face, 'maxp');
  const name = cloneBytes(face.reference_table('name'));
  const os2 = cloneBytes(face.reference_table('OS/2'));
  const post = cloneBytes(face.reference_table('post'));
  const cmapTable = mustTable(face, 'cmap');

  const names = parseNameTable(name);
  const unitsPerEm = readUInt16(head, 18);
  const bbox = makeBoundingBox(
    readInt16(head, 36),
    readInt16(head, 38),
    readInt16(head, 40),
    readInt16(head, 42),
  );
  const hExtents = font.hExtents();

  const parsedPost = parsePostTable(post);
  const parsedOs2 = parseOS2Table(os2);

  const cmap = parseCmapTable(cmapTable);

  return {
    postscriptName: names[6] || null,
    fullName: names[4] || null,
    familyName: names[1] || null,
    subfamilyName: names[2] || null,
    copyright: names[0] || null,
    version: names[5] || null,
    unitsPerEm,
    ascent: hExtents.ascender || readInt16(hhea, 4),
    descent: hExtents.descender || readInt16(hhea, 6),
    lineGap: hExtents.lineGap || readInt16(hhea, 8),
    underlinePosition: parsedPost.underlinePosition,
    underlineThickness: parsedPost.underlineThickness,
    italicAngle: parsedPost.italicAngle,
    capHeight: parsedOs2.capHeight,
    xHeight: parsedOs2.xHeight,
    bbox,
    numGlyphs: readUInt16(maxp, 4),
    characterSet: sortedUniq(
      Array.from(face.collectUnicodes())
        .concat(cmap.includesNotdefCodePoint ? [0xffff] : [])
        .sort((a, b) => a - b),
      (value) => value,
    ),
    familyClass: parsedOs2.familyClass,
    italic: (readUInt16(head, 44) & 0x0002) !== 0,
    isFixedPitch: parsedPost.isFixedPitch,
    cff: !!face.reference_table('CFF ') || !!face.reference_table('CFF2'),
    cmap,
  };
};

const parseNameTable = (table?: Uint8Array) => {
  if (!table) return {} as { [nameId: number]: string };

  const count = readUInt16(table, 2);
  const stringOffset = readUInt16(table, 4);
  const names = {} as { [nameId: number]: string };

  for (let idx = 0; idx < count; idx++) {
    const offset = 6 + idx * 12;
    const platformID = readUInt16(table, offset);
    const encodingID = readUInt16(table, offset + 2);
    const nameID = readUInt16(table, offset + 6);
    const length = readUInt16(table, offset + 8);
    const valueOffset = readUInt16(table, offset + 10);
    const bytes = table.subarray(
      stringOffset + valueOffset,
      stringOffset + valueOffset + length,
    );

    if (names[nameID]) continue;

    if (platformID === 3) {
      names[nameID] = decodeUtf16Be(bytes);
    } else if (platformID === 0) {
      names[nameID] = decodeUtf16Be(bytes);
    } else if (platformID === 1 && encodingID === 0) {
      names[nameID] = decodeAscii(bytes);
    }
  }

  return names;
};

const parseOS2Table = (table?: Uint8Array) => {
  if (!table) return { familyClass: 0, xHeight: 0, capHeight: 0 };

  const version = readUInt16(table, 0);
  return {
    familyClass: readInt16(table, 30),
    xHeight: version >= 2 && table.length >= 88 ? readInt16(table, 86) : 0,
    capHeight: version >= 2 && table.length >= 90 ? readInt16(table, 88) : 0,
  };
};

const parsePostTable = (table?: Uint8Array) => {
  if (!table) {
    return {
      italicAngle: 0,
      underlinePosition: 0,
      underlineThickness: 0,
      isFixedPitch: false,
    };
  }

  return {
    italicAngle: readFixed32(table, 4),
    underlinePosition: readInt16(table, 8),
    underlineThickness: readInt16(table, 10),
    isFixedPitch: readUInt32(table, 12) !== 0,
  };
};

const parseCmapTable = (table: Uint8Array): CmapLookup => {
  const numTables = readUInt16(table, 2);
  const records: Array<{
    platformID: number;
    encodingID: number;
    offset: number;
    format: number;
  }> = [];

  for (let idx = 0; idx < numTables; idx++) {
    const offset = 4 + idx * 8;
    const subtableOffset = readUInt32(table, offset + 4);
    records.push({
      platformID: readUInt16(table, offset),
      encodingID: readUInt16(table, offset + 2),
      offset: subtableOffset,
      format: readUInt16(table, subtableOffset),
    });
  }

  const preferred =
    findRecord(records, 3, 10, 12) ||
    findRecord(records, 0, 4, 12) ||
    findRecord(records, 0, 3, 4) ||
    findRecord(records, 3, 1, 4) ||
    records[0];

  if (preferred.format === 12) {
    return parseCmapFormat12(table, preferred.offset);
  }
  if (preferred.format === 4) return parseCmapFormat4(table, preferred.offset);
  throw new Error(`Unsupported cmap format: ${preferred.format}`);
};

const findRecord = (
  records: Array<{
    platformID: number;
    encodingID: number;
    offset: number;
    format: number;
  }>,
  platformID: number,
  encodingID: number,
  format: number,
) =>
  records.find(
    (record) =>
      record.platformID === platformID &&
      record.encodingID === encodingID &&
      record.format === format,
  );

const parseCmapFormat12 = (table: Uint8Array, offset: number): CmapLookup => {
  const nGroups = readUInt32(table, offset + 12);
  const groups = new Array(nGroups);

  for (let idx = 0; idx < nGroups; idx++) {
    const groupOffset = offset + 16 + idx * 12;
    groups[idx] = {
      startCharCode: readUInt32(table, groupOffset),
      endCharCode: readUInt32(table, groupOffset + 4),
      startGlyphID: readUInt32(table, groupOffset + 8),
    };
  }

  return {
    includesNotdefCodePoint: false,
    glyphIndex(codePoint: number) {
      for (let idx = 0, len = groups.length; idx < len; idx++) {
        const group = groups[idx];
        if (
          codePoint >= group.startCharCode &&
          codePoint <= group.endCharCode
        ) {
          return group.startGlyphID + (codePoint - group.startCharCode);
        }
      }
      return 0;
    },
  };
};

const parseCmapFormat4 = (table: Uint8Array, offset: number): CmapLookup => {
  const segCount = readUInt16(table, offset + 6) / 2;
  const endCodeOffset = offset + 14;
  const startCodeOffset = endCodeOffset + segCount * 2 + 2;
  const idDeltaOffset = startCodeOffset + segCount * 2;
  const idRangeOffsetOffset = idDeltaOffset + segCount * 2;

  return {
    includesNotdefCodePoint: true,
    glyphIndex(codePoint: number) {
      if (codePoint > 0xffff) return 0;

      for (let idx = 0; idx < segCount; idx++) {
        const endCode = readUInt16(table, endCodeOffset + idx * 2);
        const startCode = readUInt16(table, startCodeOffset + idx * 2);

        if (codePoint < startCode || codePoint > endCode) continue;

        const idDelta = readInt16(table, idDeltaOffset + idx * 2);
        const idRangeOffset = readUInt16(table, idRangeOffsetOffset + idx * 2);
        if (idRangeOffset === 0) return (codePoint + idDelta) & 0xffff;

        const glyphIndexOffset =
          idRangeOffsetOffset +
          idx * 2 +
          idRangeOffset +
          (codePoint - startCode) * 2;
        const glyphId = readUInt16(table, glyphIndexOffset);
        if (glyphId === 0) return 0;
        return (glyphId + idDelta) & 0xffff;
      }

      return 0;
    },
  };
};

const buildClusterCodePointMap = (text: string, clusters: number[]) => {
  const sortedClusters = sortedUniq(
    clusters.slice().sort((a, b) => a - b),
    (v) => v,
  );
  const clusterMap = {} as { [cluster: number]: number[] };

  for (let idx = 0, len = sortedClusters.length; idx < len; idx++) {
    const start = sortedClusters[idx];
    const end = sortedClusters[idx + 1] ?? text.length;
    clusterMap[start] = codePointsInRange(text, start, end);
  }

  return clusterMap;
};

const codePointsInRange = (text: string, start: number, end: number) => {
  const codePoints: number[] = [];
  for (let idx = start; idx < end;) {
    const codePoint = text.codePointAt(idx)!;
    codePoints.push(codePoint);
    idx += codePoint > 0xffff ? 2 : 1;
  }
  return codePoints;
};

const formatFeatures = (
  features?: TypeFeatures | (keyof TypeFeatures)[],
): string | undefined => {
  if (!features) return undefined;
  if (Array.isArray(features)) return features.join(',');

  const enabled = Object.keys(features)
    .sort()
    .filter((feature) => features[feature] !== undefined)
    .map((feature) => `${feature}=${features[feature] ? 1 : 0}`);

  return enabled.length > 0 ? enabled.join(',') : undefined;
};

const mustTable = (face: HarfBuzzFace, table: string) => {
  const bytes = cloneBytes(face.reference_table(table));
  if (!bytes) throw new Error(`Missing required font table: ${table}`);
  return bytes;
};

const cloneBytes = (bytes?: Uint8Array) =>
  bytes ? new Uint8Array(bytes) : undefined;

const readUInt16 = (bytes: Uint8Array, offset: number) =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint16(
    offset,
    false,
  );

const readInt16 = (bytes: Uint8Array, offset: number) =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getInt16(
    offset,
    false,
  );

const readUInt32 = (bytes: Uint8Array, offset: number) =>
  new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(
    offset,
    false,
  );

const readFixed32 = (bytes: Uint8Array, offset: number) => {
  const raw = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getInt32(offset, false);
  return raw / 65536;
};

const decodeUtf16Be = (bytes: Uint8Array) => {
  const words = new Array(bytes.length / 2);
  for (let idx = 0, len = words.length; idx < len; idx++) {
    words[idx] = readUInt16(bytes, idx * 2);
  }
  return String.fromCharCode.apply(null, words as any);
};

const decodeAscii = (bytes: Uint8Array) => {
  let value = '';
  for (let idx = 0, len = bytes.length; idx < len; idx++) {
    value += String.fromCharCode(bytes[idx]);
  }
  return value;
};

const makeBoundingBox = (
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): BoundingBox => ({
  minX,
  minY,
  maxX,
  maxY,
  width: maxX - minX,
  height: maxY - minY,
});
