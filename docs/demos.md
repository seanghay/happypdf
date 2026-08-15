# Live Demos

Every demo on this page runs **in your browser** — no install, no server, no
build step. Edit the code and press Run (or <kbd>⌘</kbd>/<kbd>Ctrl</kbd> +
<kbd>Enter</kbd>) to re-render the PDF beside it.

Each snippet receives two things:

- `happypdf` — the library, as if you had done `import * as happypdf from 'happypdf'`
- `fonts` — preloaded font bytes, keyed by name

and must **return a `PDFDocument`**.

## Khmer shaping

The reason this fork exists. Khmer stacks consonants into orthographic clusters
and reorders vowels around them — shaping the font engine has to perform. Try
adding your own Khmer text.

<PdfDemo id="khmer-shaping" />

## Wrapping and alignment

`maxWidth` wraps the text; `align` decides how the lines sit within it. Change
`align` in the loop, or narrow `maxWidth`, and re-run.

<PdfDemo id="alignment" height="520px" />

## Justifying a script without spaces

Khmer does not separate words with spaces. Break points come from
`Intl.Segmenter`, so wrapping and justification still land on word boundaries
instead of splitting mid-word.

<PdfDemo id="khmer-justify" />

## Variable fonts

`variations` instances a variable font on its axes, and the instanced outlines
are what gets embedded — so the weight you ask for is the weight that renders.

<PdfDemo id="variable-font" />

## Drawing and shapes

Everything inherited from pdf-lib works unchanged.

<PdfDemo id="drawing" />

## Forms

Fields can be created, filled and given appearances. Multiline fields wrap with
the same segmenter `drawText` uses.

<PdfDemo id="forms" />
