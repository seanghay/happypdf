# Getting Started

## Install

```bash
npm install happypdf
```

happypdf requires **Node 22 or newer**, and works in modern browsers, Deno and
edge runtimes.

## Your first document

```js
import fs from 'node:fs';
import { PDFDocument, StandardFonts, rgb } from 'happypdf';

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([595, 842]); // A4
const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

page.drawText('Hello, world!', {
  font,
  x: 50,
  y: 750,
  size: 24,
  color: rgb(0.1, 0.1, 0.1),
});

fs.writeFileSync('hello.pdf', await pdfDoc.save());
```

## Embedding a custom font

Unlike pdf-lib, there is **no font engine to install and register**. Pass the
font bytes and happypdf shapes them with the bundled HarfBuzz:

```js
const fontBytes = fs.readFileSync('NotoSansKhmer-Regular.ttf');
const khmer = await pdfDoc.embedFont(fontBytes, { subset: true });

page.drawText('សួស្តីពិភពលោក', { font: khmer, x: 50, y: 700, size: 24 });
```

`subset: true` embeds only the glyphs you actually used, which usually shrinks
the file substantially.

::: tip Migrating from pdf-lib
`pdfDoc.registerFontkit(...)` still exists as a no-op, so existing code keeps
working. You can delete the call whenever convenient.
:::

## Modifying an existing PDF

```js
const existing = fs.readFileSync('input.pdf');
const pdfDoc = await PDFDocument.load(existing);

const [first] = pdfDoc.getPages();
first.drawText('Reviewed', { x: 50, y: 50, size: 12 });

fs.writeFileSync('output.pdf', await pdfDoc.save());
```

## In the browser

```html
<script src="https://unpkg.com/happypdf/dist/happypdf.min.js"></script>
<script>
  const { PDFDocument, StandardFonts } = happypdf;

  (async () => {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    page.drawText('From the browser', { font, x: 50, y: 700, size: 20 });

    const bytes = await pdfDoc.save();
    const url = URL.createObjectURL(
      new Blob([bytes], { type: 'application/pdf' }),
    );
    window.open(url);
  })();
</script>
```

The bundle inlines the HarfBuzz WebAssembly, so there is nothing else to fetch.

## Next steps

- [Why happypdf](/guide/why) — what this fork changes
- [Fonts and Shaping](/guide/fonts) — complex scripts, subsetting, variable fonts
- [Wrapping and Alignment](/guide/text-layout) — `maxWidth`, `align`, justification
- [Live Demos](/demos) — runnable examples in your browser
