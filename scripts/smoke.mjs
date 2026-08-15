/**
 * Post-build smoke test.
 *
 * The unit tests import from `src/`, so they never exercise what actually ships.
 * This loads each published entry point the way a consumer would and renders a
 * PDF with an embedded complex-script font, which is the path most likely to
 * break when the bundler config changes (the HarfBuzz wasm and its CommonJS
 * glue have to survive bundling in all three formats).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

const fontBytes = fs.readFileSync(
  path.join(root, 'assets/fonts/noto_sans_khmer/NotoSansKhmer-Regular.ttf'),
);
const KHMER = 'សួស្តីពិភពលោក';

const render = async (PDFDocument, label) => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });
  const page = pdfDoc.addPage();

  page.drawText(KHMER, { font, x: 40, y: 100, size: 24 });
  page.drawText(`${KHMER} ${KHMER} ${KHMER}`, {
    font,
    x: 40,
    y: 200,
    size: 14,
    maxWidth: 300,
    lineHeight: 20,
    align: 'justify',
  });

  const bytes = await pdfDoc.save();

  assert.ok(bytes.length > 1000, `${label}: PDF looks empty`);
  assert.equal(
    Buffer.from(bytes.subarray(0, 5)).toString(),
    '%PDF-',
    `${label}: missing PDF header`,
  );

  console.log(`✔ ${label} (${bytes.length} bytes)`);
};

// ESM entry point.
const esm = await import(path.join(root, 'dist/index.mjs'));
await render(esm.PDFDocument, 'esm  dist/index.mjs');

// CommonJS entry point.
const cjs = require(path.join(root, 'dist/index.cjs'));
await render(cjs.PDFDocument, 'cjs  dist/index.cjs');

// Standalone browser bundle: evaluate it the way a <script> tag would and check
// it exposes the global.
const iifeSource = fs.readFileSync(
  path.join(root, 'dist/happypdf.min.js'),
  'utf8',
);
const sandbox = { console, TextEncoder, TextDecoder, WebAssembly, atob, btoa };
sandbox.globalThis = sandbox;
sandbox.window = sandbox;
sandbox.self = sandbox;
vm.runInContext(iifeSource, vm.createContext(sandbox), {
  filename: 'happypdf.min.js',
});

assert.ok(sandbox.happypdf?.PDFDocument, 'iife: global `happypdf` not exposed');
console.log(
  `✔ iife dist/happypdf.min.js (${Object.keys(sandbox.happypdf).length} exports)`,
);
