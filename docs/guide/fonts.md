# Fonts and Shaping

## Standard fonts

The 14 standard PDF fonts need no embedding, but only support Latin text
(WinAnsi encoding):

```js
import { StandardFonts } from 'happypdf';

const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
```

For anything else — accents outside Latin-1, or any non-Latin script — embed a
font.

## Embedding a custom font

```js
const font = await pdfDoc.embedFont(fs.readFileSync('Ubuntu-R.ttf'));
```

Accepts `Uint8Array`, `ArrayBuffer`, or a base64 string. TrueType and OpenType
(including CFF) are supported.

## Subsetting

```js
const font = await pdfDoc.embedFont(bytes, { subset: true });
```

Only the glyphs you actually draw are embedded. For a large font used for a
little text this is the difference between a 5 MB file and a 30 KB one.

Subsetting happens when the document is saved, so it accounts for every string
you drew with that font.

## Complex scripts

Nothing special is required — shaping is always on:

```js
const khmer = await pdfDoc.embedFont(
  fs.readFileSync('NotoSansKhmer-Regular.ttf'),
);
page.drawText('សួស្តីពិភពលោក', { font: khmer, x: 50, y: 700, size: 24 });
```

The same applies to Thai, Lao, Arabic, Devanagari, Tamil and other scripts that
need reordering or mark attachment. See the [live demo](/demos#khmer-shaping).

## OpenType features

```js
const font = await pdfDoc.embedFont(bytes, {
  features: { liga: false, onum: true },
});
```

Feature tags are passed to HarfBuzz. Set a tag to `false` to disable a feature
that is on by default, or `true` to enable an optional one.

## Variable fonts

`variations` pins a variable font's axes:

```js
const regular = await pdfDoc.embedFont(bytes, { variations: { wght: 400 } });
const bold = await pdfDoc.embedFont(bytes, { variations: { wght: 700 } });
```

Each combination produces a separately embedded instance, so use only the ones
you need.

::: warning Axis ranges
Values are clamped to the axis range declared in the font's `fvar` table. A
font whose `wght` runs 400–700 will treat `{ wght: 100 }` as 400 — the request
is silently clamped, not rejected.
:::

## Measuring text

```js
font.widthOfTextAtSize('Hello', 24); // shaped advance width
font.heightAtSize(24); // line height
font.sizeAtHeight(30); // size that yields a given height
```

Widths come from the shaped run, so kerning and ligatures are accounted for.

## Custom font names

```js
const font = await pdfDoc.embedFont(bytes, { customName: 'MyFont' });
```

Overrides the name written into the PDF, which some workflows rely on for
downstream processing.
