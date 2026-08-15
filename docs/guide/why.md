# Why HappyPDF

HappyPDF is a fork of [pdf-lib](https://github.com/Hopding/pdf-lib) (by way of
[@cantoo/pdf-lib](https://github.com/cantoo-scribe/pdf-lib)) that replaces
fontkit with [HarfBuzz](https://harfbuzz.github.io/).

## The problem

pdf-lib shapes text with fontkit. That works for Latin and other simple scripts,
but scripts that need **reordering, mark attachment, or contextual
substitution** come out wrong — Khmer, Thai, Lao, Arabic, Devanagari and the
other Indic scripts.

A Khmer word like `សួស្តី` is not a sequence of independent letters. Consonants
stack into orthographic clusters, and vowels are reordered around them. Rendering
the code points in logical order produces text that is, at best, unreadable.

## What changed

**HarfBuzz does the shaping.** It is compiled to WebAssembly and inlined into
the bundle, so there is no extra download and nothing to install.

**Every glyph is positioned individually.** Rather than emitting one `Tj`
operator per line and trusting the viewer, HappyPDF writes each shaped glyph at
the position HarfBuzz computed. Reordering, ligatures and mark placement survive
into the file.

**No `registerFontkit`.** Custom fonts embed out of the box. The method is kept
as a no-op so pdf-lib code keeps working.

**Variable fonts.** `variations` instances a font on its axes, and the instanced
outlines are what gets embedded.

**Wrapping and alignment.** `maxWidth` wraps, and `align` supports `left`,
`center`, `right` and `justify`. Break points come from `Intl.Segmenter`, so
scripts without spaces wrap at real word boundaries.

## What did not change

Everything else. Forms, SVG, PDF/A, encryption, page manipulation, embedding
images — the API is pdf-lib's, so existing code and existing knowledge carry
over.

## Differences from pdf-lib

|                        | pdf-lib                    | HappyPDF                          |
| ---------------------- | -------------------------- | --------------------------------- |
| Shaping engine         | fontkit                    | HarfBuzz (bundled)                |
| Setup for custom fonts | `registerFontkit(fontkit)` | none                              |
| Complex scripts        | broken                     | correct                           |
| Variable fonts         | no                         | `variations`                      |
| Text alignment         | no                         | `left`/`center`/`right`/`justify` |
| Word breaking          | whitespace only            | `Intl.Segmenter`                  |
| Node                   | 14+                        | 22+                               |

### Removed APIs

These were superseded by segmentation and no longer exist:

- `breakTextIntoLines()`
- `PDFDocument.defaultWordBreaks`
- the `wordBreaks` option on `drawText`

Use [`wrapText`](/guide/text-layout#laying-out-text-yourself) instead.
