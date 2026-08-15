---
layout: home

hero:
  name: HappyPDF
  text: PDFs that shape text correctly
  tagline: Create and modify PDF documents in any JavaScript environment — with HarfBuzz shaping, so Khmer, Thai, Lao, Arabic and Indic scripts render the way they should.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Live Demos
      link: /demos
    - theme: alt
      text: GitHub
      link: https://github.com/seanghay/HappyPDF

features:
  - title: Correct complex scripts
    details: HarfBuzz shapes every custom font, so glyph reordering, ligatures and mark attachment survive into the PDF. No more broken Khmer or Thai.
  - title: No font engine to install
    details: HarfBuzz ships inlined as WebAssembly. Custom fonts embed out of the box — registerFontkit is kept only as a no-op for compatibility.
  - title: Wrapping and alignment
    details: maxWidth wraps and align supports left, center, right and justify. Break points come from Intl.Segmenter, so spaceless scripts wrap at real word boundaries.
  - title: Variable fonts
    details: Pass variations to embedFont to instance a variable font at any point on its axes. The instanced outlines are what gets embedded.
  - title: Runs anywhere
    details: Node, browsers, Deno and edge runtimes. Ships ESM, CommonJS and a standalone browser bundle, all fully typed.
  - title: A familiar API
    details: A fork of pdf-lib, so forms, SVG, PDF/A, encryption and everything else work exactly as you already know them.
---
