# Wrapping and Alignment

## Wrapping

Pass `maxWidth` and text wraps to fit:

```js
page.drawText(paragraph, {
  font,
  x: 40,
  y: 700,
  size: 11,
  maxWidth: 360,
  lineHeight: 15,
});
```

Without `maxWidth`, only hard line breaks (`\n`, `\r`, `\f`, `\v`) split lines.

## Alignment

`align` controls how wrapped lines sit within `maxWidth`:

```js
page.drawText(paragraph, {
  font,
  x: 40,
  y: 700,
  maxWidth: 360,
  align: 'justify',
});
```

| Value     | Behaviour                     |
| --------- | ----------------------------- |
| `left`    | Default. Lines start at `x`.  |
| `center`  | Centred within `maxWidth`.    |
| `right`   | Flush to `x + maxWidth`.      |
| `justify` | Stretched to fill `maxWidth`. |

`justify` stretches every line **except the last of each paragraph**, matching
CSS `text-align: justify`. See the [live demo](/demos#wrapping-and-alignment).

Without `maxWidth`, `center` and `right` align against the widest line, and
`justify` falls back to `left`.

## Word boundaries

Break points come from `Intl.Segmenter`, so text in scripts that do not separate
words with spaces — Khmer, Thai, Lao, Japanese — wraps and justifies at real
word boundaries rather than only at spaces:

```js
page.drawText('សួស្តីពិភពលោក សូមស្វាគមន៍មកកាន់ប្រទេសកម្ពុជា', {
  font: khmer,
  maxWidth: 360,
  align: 'justify',
});
```

Set `locale` to choose a specific segmentation locale; it defaults to the
runtime's.

## Long words

A word wider than `maxWidth` is broken between graphemes, so combining marks
stay attached to their base character. To let it overflow instead:

```js
page.drawText(text, { maxWidth: 200, wordBreak: 'keep-all' });
```

Soft hyphens (`­`) act as optional break points and are never rendered.

## Laying out text yourself

`wrapText` returns the line boxes without drawing anything — useful for
measuring a block, paginating, or rendering elsewhere:

```js
import { wrapText } from 'happypdf';

const lines = wrapText(paragraph, (t) => font.widthOfTextAtSize(t, 11), {
  maxWidth: 360,
  align: 'justify',
});
```

Each line is:

```ts
interface WrappedLine {
  text: string; // the line, whitespace trimmed
  runs: { text: string; x: number }[]; // pieces to draw, offset from the line start
  width: number; // natural width, before justification
  isParagraphEnd: boolean; // ends at a hard break or end of text
}
```

Justified lines carry one run per stretched piece; every other alignment carries
a single run.

### Measuring a block's height

```js
const lines = wrapText(text, (t) => font.widthOfTextAtSize(t, size), {
  maxWidth,
});
const height = lines.length * lineHeight;
```
