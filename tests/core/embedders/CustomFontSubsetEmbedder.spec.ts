import fs from 'fs';

import {
  CustomFontSubsetEmbedder,
  PDFContext,
  PDFDict,
  PDFHexString,
} from '../../../src/index';

const ubuntuFont = fs.readFileSync('./assets/fonts/ubuntu/Ubuntu-R.ttf');
const notoSansKhmerFont = fs.readFileSync(
  './assets/fonts/noto_sans_khmer/NotoSansKhmer-Regular.ttf',
);
const googleSansVariableFont = fs.readFileSync(
  './assets/fonts/google_sans/GoogleSans.ttf',
);

describe('CustomFontSubsetEmbedder', () => {
  it('can be constructed with CustomFontSubsetEmbedder.for(...)', async () => {
    const embedder = await CustomFontSubsetEmbedder.for(ubuntuFont);
    expect(embedder).toBeInstanceOf(CustomFontSubsetEmbedder);
  });

  it('can embed standard font dictionaries into PDFContexts', async () => {
    const context = PDFContext.create();
    const embedder = await CustomFontSubsetEmbedder.for(
      new Uint8Array(ubuntuFont),
    );

    expect(context.enumerateIndirectObjects().length).toBe(0);
    const ref = await embedder.embedIntoContext(context);
    expect(context.enumerateIndirectObjects().length).toBe(6);
    expect(context.lookup(ref)).toBeInstanceOf(PDFDict);
  });

  it('can encode text strings into PDFHexString objects', async () => {
    const text = 'Stuff and thingz!';
    const hexCodes =
      '00010002000300040005000600070008000500020009000A0007000B000C000D';
    const embedder = await CustomFontSubsetEmbedder.for(ubuntuFont);

    expect(embedder.encodeText(text)).toBeInstanceOf(PDFHexString);
    expect(String(embedder.encodeText(text))).toBe(
      String(PDFHexString.of(hexCodes)),
    );
  });

  it('can measure the width of text strings at the given font size', async () => {
    const text = 'Stuff and thingz!';
    const embedder = await CustomFontSubsetEmbedder.for(ubuntuFont);
    expect(embedder.widthOfTextAtSize(text, 12)).toBe(90.672);
    expect(embedder.widthOfTextAtSize(text, 24)).toBe(181.344);
  });

  it('can measure the height of the font at the given size', async () => {
    const embedder = await CustomFontSubsetEmbedder.for(ubuntuFont);
    expect(embedder.heightOfFontAtSize(12)).toBeCloseTo(13.452);
    expect(embedder.heightOfFontAtSize(24)).toBeCloseTo(26.904);
  });

  it('can measure the size of the font at a given height', async () => {
    const embedder = await CustomFontSubsetEmbedder.for(ubuntuFont);
    expect(embedder.sizeOfFontAtHeight(12)).toBeCloseTo(10.705);
    expect(embedder.sizeOfFontAtHeight(24)).toBeCloseTo(21.409);
  });

  it('can subset-encode Khmer text with HarfBuzz shaping', async () => {
    const text = 'សួស្តី';
    const hexCodes = '00010002000100030004';
    const embedder = await CustomFontSubsetEmbedder.for(notoSansKhmerFont);

    expect(String(embedder.encodeText(text))).toBe(
      String(PDFHexString.of(hexCodes)),
    );
    expect(embedder.widthOfTextAtSize(text, 12)).toBeCloseTo(22.272);
  });

  it('can subset variable font instances', async () => {
    const text = 'Variable Font Sample';
    const regular = await CustomFontSubsetEmbedder.for(
      googleSansVariableFont,
      undefined,
      undefined,
      { wght: 400 },
    );
    const bold = await CustomFontSubsetEmbedder.for(
      googleSansVariableFont,
      undefined,
      undefined,
      { wght: 700 },
    );

    expect(regular.widthOfTextAtSize(text, 24)).not.toBeCloseTo(
      bold.widthOfTextAtSize(text, 24),
      3,
    );
  });
});
