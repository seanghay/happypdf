# Images

## Embedding

HappyPDF embeds PNG and JPEG directly:

```js
const png = await pdfDoc.embedPng(pngBytes);
const jpg = await pdfDoc.embedJpg(jpgBytes);
```

Both accept `Uint8Array`, `ArrayBuffer`, or a base64 data URI.

Other formats have to be converted first — to PNG or JPEG in a browser via a
canvas, or with an image library on the server.

## Drawing

```js
page.drawImage(png, { x: 50, y: 400, width: 200, height: 150 });
```

Width and height are in points, and are **not** derived from the image, so an
image drawn at the wrong aspect ratio will look stretched.

## Sizing

```js
const dims = png.scale(0.5); // half the intrinsic size
page.drawImage(png, { x: 50, y: 400, ...dims });
```

To fit a box while preserving aspect ratio:

```js
const dims = png.scaleToFit(300, 200);
page.drawImage(png, { x: 50, y: 400, ...dims });
```

The intrinsic size is available directly:

```js
png.width;
png.height;
```

## Rotation and opacity

```js
import { degrees } from 'happypdf';

page.drawImage(png, {
  x: 50,
  y: 400,
  width: 200,
  height: 150,
  rotate: degrees(15),
  opacity: 0.6,
});
```

## Reusing an image

An embedded image is stored once, however many times it is drawn:

```js
const logo = await pdfDoc.embedPng(logoBytes);

for (const page of pdfDoc.getPages()) {
  page.drawImage(logo, { x: 30, y: 750, width: 80, height: 30 });
}
```

Embedding the same bytes repeatedly instead would store a copy each time, so
hoist the `embedPng` call out of the loop.

## Pages as images

A page from another document can be embedded and drawn like an image, which is
how you build N-up layouts or thumbnails:

```js
const [embedded] = await pdfDoc.embedPdf(otherPdfBytes, [0]);

page.drawPage(embedded, {
  x: 50,
  y: 400,
  ...embedded.scale(0.4),
});
```
