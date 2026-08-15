# Graphics

## Shapes

```js
import { rgb } from 'happypdf';

page.drawRectangle({
  x: 30,
  y: 180,
  width: 160,
  height: 80,
  color: rgb(0.95, 0.6, 0.2),
  borderColor: rgb(0.4, 0.2, 0),
  borderWidth: 2,
});

page.drawCircle({ x: 200, y: 100, size: 40, color: rgb(0.2, 0.5, 0.9) });
page.drawEllipse({ x: 300, y: 220, xScale: 70, yScale: 40 });
page.drawLine({
  start: { x: 30, y: 50 },
  end: { x: 390, y: 50 },
  thickness: 3,
  color: rgb(0.8, 0.1, 0.3),
});
```

Every shape takes `opacity`, `borderOpacity`, `rotate` and `blendMode`.

## Colours

```js
import { rgb, cmyk, grayscale } from 'happypdf';

rgb(1, 0, 0); // components are 0–1, not 0–255
cmyk(0, 1, 1, 0);
grayscale(0.5);
```

CMYK is the right choice for print work, since it avoids a colour-space
conversion in the printer's RIP.

## Vector paths

```js
page.drawSvgPath('M 0 0 L 100 0 L 50 80 Z', {
  x: 50,
  y: 500,
  color: rgb(0.2, 0.6, 0.4),
  scale: 1.5,
});
```

The path uses SVG's coordinate convention — y grows downward — while the page
uses PDF's, where y grows upward. `x` and `y` position the path's origin on the
page.

See the [vector path demo](/demos#vector-paths).

## Full SVG

```js
const svg = await pdfDoc.embedSvg(svgString);
page.drawSvg(svg, { x: 50, y: 400, width: 200, height: 150 });
```

Supports paths, basic shapes, groups, transforms and styling. Filters, masks
and embedded raster images are not rendered.

## Coordinates

PDF's origin is the **bottom-left** corner, with y increasing upward — the
opposite of most screen graphics APIs. A y of 0 is the bottom of the page.

```js
const { width, height } = page.getSize();
page.drawText('Top left', { x: 20, y: height - 40 });
```

Units are points: 72 per inch. A4 is 595 × 842, US Letter 612 × 792.

## Graphics state

```js
page.pushOperators(pushGraphicsState(), setLineWidth(2));
// ...draw...
page.pushOperators(popGraphicsState());
```

`pushOperators` writes raw PDF operators when you need something the high-level
API does not expose.
