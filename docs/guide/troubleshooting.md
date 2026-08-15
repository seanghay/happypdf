# Troubleshooting

## Text renders as boxes or blanks

The font does not contain glyphs for those characters. The standard 14 fonts
only cover WinAnsi (Latin-1), so anything beyond that needs an embedded font:

```js
const font = await pdfDoc.embedFont(
  fs.readFileSync('NotoSansKhmer-Regular.ttf'),
);
```

If an embedded font still shows blanks, it genuinely lacks those glyphs — Noto
Sans does not cover Khmer, for instance; you need Noto Sans **Khmer**.

## `WinAnsi cannot encode` error

Thrown when non-Latin text is drawn with a standard font. Embed a font that
covers the script.

## Field appearances throw when a form is filled

Field appearances are generated with a font, and it must support the text:

```js
const khmer = await pdfDoc.embedFont(khmerBytes);
form.getTextField('name').setText('សុខា');
form.updateFieldAppearances(khmer);
```

## Variable font ignores my `variations`

Values are clamped to the axis range in the font's `fvar` table. A font whose
`wght` runs 400–700 treats `{ wght: 100 }` as 400 — silently. Check the axis
ranges before assuming the request was honoured.

## Output differs between runs

Documents get creation and modification dates by default. For byte-identical
output:

```js
const pdfDoc = await PDFDocument.create({ updateMetadata: false });
```

## Files are large

Subset the fonts:

```js
const font = await pdfDoc.embedFont(bytes, { subset: true });
```

A full CJK or variable font can be several megabytes; a subset is usually tens
of kilobytes. Also make sure a repeatedly-drawn image is embedded once and
reused rather than embedded per use.

## Text is positioned oddly after upgrading

HappyPDF writes one positioned glyph per operator instead of one string per
line, so the content stream differs from pdf-lib's. The rendering is equivalent,
but code that parses your own output, or compares content streams, will see
different operators.

## `Intl.Segmenter is not a function`

The runtime is too old. HappyPDF requires Node 22+, or a browser from 2022
onward.

## Loading an encrypted PDF fails

```js
const pdfDoc = await PDFDocument.load(bytes, { password: 'secret' });
```

Without the password, `EncryptedPDFError` is thrown. `ignoreEncryption: true`
lets you inspect the structure, but the content will be ciphertext.

## Getting help

Open an issue at
[github.com/seanghay/happypdf/issues](https://github.com/seanghay/happypdf/issues).
A minimal snippet and, where possible, the font you used make problems far
easier to reproduce.
