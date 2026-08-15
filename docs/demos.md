# Live Demos

Every demo on this page runs **in your browser** — no install, no server, no
build step. Edit the code and press Run (or <kbd>⌘</kbd>/<kbd>Ctrl</kbd> +
<kbd>Enter</kbd>) to re-render the PDF beside it.

Each snippet receives two things:

- `happypdf` — the library, as if you had done `import * as happypdf from 'happypdf'`
- `fonts` — preloaded font bytes, keyed by name

and must **return a `PDFDocument`**.

[[toc]]

## Complex scripts

### Khmer shaping

The reason this fork exists. Khmer stacks consonants into orthographic clusters
and reorders vowels around them — shaping the font engine has to perform. Try
adding your own Khmer text.

<PdfDemo id="khmer-shaping" />

### Arabic

Arabic letters take different forms depending on their neighbours, and the
script runs right to left. Both fall out of shaping.

<PdfDemo id="arabic-shaping" />

### Thai wrapping

Thai does not put spaces between words either. `Intl.Segmenter` finds the break
opportunities, so wrapping and justification land in sensible places.

<PdfDemo id="thai-wrapping" />

### Justifying a script without spaces

The same idea in Khmer: the top block is ragged right, the bottom is justified.
Gaps open at word boundaries rather than between letters.

<PdfDemo id="khmer-justify" />

## Text layout

### Wrapping and alignment

`maxWidth` wraps the text; `align` decides how the lines sit within it. Change
`align` in the loop, or narrow `maxWidth`, and re-run.

<PdfDemo id="alignment" height="560px" />

### Measuring before drawing

`wrapText` returns the line boxes without drawing anything, so you can size a
container to its contents — here a box drawn to exactly fit the text.

<PdfDemo id="measuring" />

### Multi-page documents

<PdfDemo id="multi-page" height="560px" />

## Fonts

### Variable fonts

`variations` instances a variable font on its axes, and the instanced outlines
are what gets embedded — so the weight you ask for is the weight that renders.

<PdfDemo id="variable-font" />

### OpenType features

Feature tags are forwarded to HarfBuzz. Compare the default rendering with
ligatures and kerning switched off.

<PdfDemo id="features-kerning" />

## Documents

### Editing an existing PDF

Load a document, then stamp it. This is the flow you would use on a file
fetched from a server.

<PdfDemo id="edit-existing" />

### Merging documents

<PdfDemo id="merge-pages" height="520px" />

### Drawing and shapes

<PdfDemo id="drawing" />

### Vector paths

`drawSvgPath` renders vector paths directly, with no rasterisation.

<PdfDemo id="images-svg" />

### Forms

Fields can be created, filled and given appearances. Multiline fields wrap with
the same segmenter `drawText` uses.

<PdfDemo id="forms" />
