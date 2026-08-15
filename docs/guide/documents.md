# Creating and Editing

## Creating

```js
const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([595, 842]); // A4, in points
```

Called with no size, `addPage()` uses US Letter (612 × 792).

## Loading

```js
const pdfDoc = await PDFDocument.load(bytes);
const pages = pdfDoc.getPages();
```

For encrypted documents:

```js
const pdfDoc = await PDFDocument.load(bytes, { password: 'secret' });
```

## Saving

```js
const bytes = await pdfDoc.save(); // Uint8Array
const base64 = await pdfDoc.saveAsBase64(); // string
```

## Pages

```js
pdfDoc.addPage();
pdfDoc.insertPage(0, page);
pdfDoc.removePage(2);

const page = pdfDoc.getPage(0);
page.setSize(595, 842);
page.setRotation(degrees(90));

const { width, height } = page.getSize();
```

## Copying between documents

```js
const src = await PDFDocument.load(bytes);
const out = await PDFDocument.create();

const [copied] = await out.copyPages(src, [0]);
out.addPage(copied);
```

## Images

```js
const png = await pdfDoc.embedPng(pngBytes);
const jpg = await pdfDoc.embedJpg(jpgBytes);

const dims = png.scale(0.5);
page.drawImage(png, { x: 50, y: 400, width: dims.width, height: dims.height });
```

## Shapes

```js
page.drawRectangle({
  x: 30,
  y: 180,
  width: 160,
  height: 80,
  color: rgb(1, 0.6, 0.2),
});
page.drawEllipse({ x: 300, y: 220, xScale: 70, yScale: 40 });
page.drawCircle({ x: 200, y: 100, size: 40 });
page.drawLine({
  start: { x: 30, y: 50 },
  end: { x: 390, y: 50 },
  thickness: 3,
});
page.drawSvgPath('M 0 0 L 100 100', { x: 50, y: 500 });
```

See the [drawing demo](/demos#drawing-and-shapes).

## Metadata

```js
pdfDoc.setTitle('Report');
pdfDoc.setAuthor('Sokha Chan');
pdfDoc.setSubject('Quarterly figures');
pdfDoc.setKeywords(['report', 'q3']);
pdfDoc.setCreationDate(new Date());
```
