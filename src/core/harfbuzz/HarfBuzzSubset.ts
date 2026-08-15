import { decodeFromBase64 } from '../../utils';
import { FontVariations } from '../../types/fontkit';
import hbSubsetWasmBase64 from './hb-subset.wasm.base64';
import { sliceFontBytes } from './HarfBuzz';

const HB_MEMORY_MODE_WRITABLE = 2;
const HB_SUBSET_FLAGS_RETAIN_GIDS = 1 << 1;

interface HarfBuzzSubsetExports {
  memory: WebAssembly.Memory;
  malloc(size: number): number;
  free(ptr: number): void;
  hb_blob_create(
    data: number,
    length: number,
    memoryMode: number,
    userData: number,
    destroy: number,
  ): number;
  hb_blob_destroy(blob: number): void;
  hb_blob_get_data(blob: number, length: number): number;
  hb_blob_get_length(blob: number): number;
  hb_face_create(blob: number, index: number): number;
  hb_face_destroy(face: number): void;
  hb_face_reference_blob(face: number): number;
  hb_subset_input_create_or_fail(): number;
  hb_subset_input_destroy(input: number): void;
  hb_subset_input_keep_everything(input: number): void;
  hb_subset_input_unicode_set(input: number): number;
  hb_subset_input_glyph_set(input: number): number;
  hb_subset_input_pin_all_axes_to_default(input: number, face: number): number;
  hb_subset_input_pin_axis_location(
    input: number,
    face: number,
    axisTag: number,
    axisValue: number,
  ): number;
  hb_subset_input_set_flags(input: number, value: number): void;
  hb_set_add(set: number, value: number): void;
  hb_subset_or_fail(face: number, input: number): number;
}

let harfBuzzSubsetPromise: Promise<HarfBuzzSubsetExports> | undefined;

const loadSubsetWasmBinary = () => decodeFromBase64(hbSubsetWasmBase64);

const loadHarfBuzzSubset = async (): Promise<HarfBuzzSubsetExports> => {
  if (!harfBuzzSubsetPromise) {
    harfBuzzSubsetPromise = WebAssembly.instantiate(
      sliceFontBytes(loadSubsetWasmBinary()),
    ).then(
      ({ instance }) => instance.exports as unknown as HarfBuzzSubsetExports,
    );
  }

  return harfBuzzSubsetPromise;
};

export const subsetFont = async (
  fontData: Uint8Array,
  glyphIds: number[],
  codePoints: number[],
): Promise<Uint8Array> => {
  const exports = await loadHarfBuzzSubset();

  const fontBytes = new Uint8Array(sliceFontBytes(fontData));
  const fontBuffer = exports.malloc(fontBytes.byteLength);
  const heap = new Uint8Array(exports.memory.buffer);
  heap.set(fontBytes, fontBuffer);

  const blob = exports.hb_blob_create(
    fontBuffer,
    fontBytes.byteLength,
    HB_MEMORY_MODE_WRITABLE,
    0,
    0,
  );
  const face = exports.hb_face_create(blob, 0);
  exports.hb_blob_destroy(blob);

  const input = exports.hb_subset_input_create_or_fail();
  exports.hb_subset_input_set_flags(input, HB_SUBSET_FLAGS_RETAIN_GIDS);

  const unicodeSet = exports.hb_subset_input_unicode_set(input);
  for (let idx = 0, len = codePoints.length; idx < len; idx++) {
    exports.hb_set_add(unicodeSet, codePoints[idx]);
  }

  const glyphSet = exports.hb_subset_input_glyph_set(input);
  for (let idx = 0, len = glyphIds.length; idx < len; idx++) {
    exports.hb_set_add(glyphSet, glyphIds[idx]);
  }

  const subsetFace = exports.hb_subset_or_fail(face, input);
  exports.hb_subset_input_destroy(input);
  if (!subsetFace) throw new Error('Failed to subset font');

  const resultBlob = exports.hb_face_reference_blob(subsetFace);
  const resultLength = exports.hb_blob_get_length(resultBlob);
  const resultOffset = exports.hb_blob_get_data(resultBlob, 0);
  const result = new Uint8Array(
    new Uint8Array(exports.memory.buffer).slice(
      resultOffset,
      resultOffset + resultLength,
    ),
  );

  exports.hb_blob_destroy(resultBlob);
  exports.hb_face_destroy(subsetFace);
  exports.hb_face_destroy(face);
  exports.free(fontBuffer);

  return result;
};

export const instantiateFont = async (
  fontData: Uint8Array,
  variations?: FontVariations,
): Promise<Uint8Array> => {
  const entries = variationEntries(variations);
  if (entries.length === 0) return fontData;

  const exports = await loadHarfBuzzSubset();

  const fontBytes = new Uint8Array(sliceFontBytes(fontData));
  const fontBuffer = exports.malloc(fontBytes.byteLength);
  const heap = new Uint8Array(exports.memory.buffer);
  heap.set(fontBytes, fontBuffer);

  const blob = exports.hb_blob_create(
    fontBuffer,
    fontBytes.byteLength,
    HB_MEMORY_MODE_WRITABLE,
    0,
    0,
  );
  const face = exports.hb_face_create(blob, 0);
  exports.hb_blob_destroy(blob);

  const input = exports.hb_subset_input_create_or_fail();
  exports.hb_subset_input_keep_everything(input);

  if (!exports.hb_subset_input_pin_all_axes_to_default(input, face)) {
    exports.hb_subset_input_destroy(input);
    exports.hb_face_destroy(face);
    exports.free(fontBuffer);
    throw new Error('Failed to initialize variable font axes');
  }

  for (let idx = 0, len = entries.length; idx < len; idx++) {
    const [axis, value] = entries[idx];
    if (
      !exports.hb_subset_input_pin_axis_location(
        input,
        face,
        hbTag(axis),
        value,
      )
    ) {
      exports.hb_subset_input_destroy(input);
      exports.hb_face_destroy(face);
      exports.free(fontBuffer);
      throw new Error(`Failed to pin font variation axis: ${axis}`);
    }
  }

  const instanceFace = exports.hb_subset_or_fail(face, input);
  exports.hb_subset_input_destroy(input);
  if (!instanceFace) {
    exports.hb_face_destroy(face);
    exports.free(fontBuffer);
    throw new Error('Failed to instantiate variable font');
  }

  const resultBlob = exports.hb_face_reference_blob(instanceFace);
  const resultLength = exports.hb_blob_get_length(resultBlob);
  const resultOffset = exports.hb_blob_get_data(resultBlob, 0);
  const result = new Uint8Array(
    new Uint8Array(exports.memory.buffer).slice(
      resultOffset,
      resultOffset + resultLength,
    ),
  );

  exports.hb_blob_destroy(resultBlob);
  exports.hb_face_destroy(instanceFace);
  exports.hb_face_destroy(face);
  exports.free(fontBuffer);

  return result;
};

const hbTag = (tag: string) =>
  ((tag.charCodeAt(0) & 0xff) << 24) |
  ((tag.charCodeAt(1) & 0xff) << 16) |
  ((tag.charCodeAt(2) & 0xff) << 8) |
  (tag.charCodeAt(3) & 0xff);

const variationEntries = (variations?: FontVariations) =>
  Object.keys(variations || {})
    .sort()
    .filter((axis) => variations![axis] !== undefined)
    .map((axis) => [axis, variations![axis] as number] as [string, number]);
