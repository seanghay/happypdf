# Migrating from pdf-lib

HappyPDF is a fork of pdf-lib, so most code runs unchanged. This page covers
what differs.

## Install

```bash
npm remove pdf-lib @pdf-lib/fontkit
npm install happypdf
```

```js
// before
import { PDFDocument } from 'pdf-lib';

// after
import { PDFDocument } from 'happypdf';
```

## Drop the fontkit registration

```js
// before
import fontkit from '@pdf-lib/fontkit';
pdfDoc.registerFontkit(fontkit);
const font = await pdfDoc.embedFont(bytes);

// after
const font = await pdfDoc.embedFont(bytes);
```

`registerFontkit` still exists as a no-op, so leaving the call in place is
harmless — it just does nothing.

## Replace `wordBreaks`

The `wordBreaks` option, `PDFDocument.defaultWordBreaks` and the exported
`breakTextIntoLines` have been removed. Break points now come from
`Intl.Segmenter`, which handles the cases `wordBreaks` was used to work around.

```js
// before
page.drawText(text, { maxWidth: 300, wordBreaks: [' ', '-'] });

// after
page.drawText(text, { maxWidth: 300 });
```

If you called `breakTextIntoLines` directly, use
[`wrapText`](/guide/text-layout#laying-out-text-yourself):

```js
// before
const lines = breakTextIntoLines(text, [' '], 300, measure);

// after
const lines = wrapText(text, measure, { maxWidth: 300 }).map((l) => l.text);
```

## Node 22

HappyPDF requires Node 22 or newer, for `Intl.Segmenter` and modern module
resolution. pdf-lib supported much older runtimes.

## What you gain

- Complex scripts render correctly
- `align: 'left' | 'center' | 'right' | 'justify'`
- `variations` for variable fonts
- Wrapping at real word boundaries in every script

## What is unchanged

Forms, SVG, images, page manipulation, encryption, PDF/A, annotations,
JavaScript actions, and the entire object model. Existing pdf-lib knowledge and
most existing code carry over directly.

## Output differences

Text is written as one positioned glyph per operator rather than one string per
line. The rendered result is the same or better, but if you compare content
streams byte-for-byte, or parse your own output, expect different operators.
