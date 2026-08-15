/**
 * Source for the live demos.
 *
 * Kept out of the markdown because Vue parses attribute values as JavaScript
 * expressions, which multi-line snippets full of quotes do not survive.
 */
export interface Demo {
  /** Font files to preload from `public/fonts`, keyed into `fonts`. */
  fonts?: string[];
  code: string;
}

export const demos: Record<string, Demo> = {
  'khmer-shaping': {
    fonts: ['NotoSansKhmer-Regular'],
    code: `const { PDFDocument, rgb } = happypdf;

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([420, 260]);
const font = await pdfDoc.embedFont(fonts['NotoSansKhmer-Regular']);

page.drawText('សួស្តី ព្រះរាជាណាចក្រកម្ពុជា', {
  font, x: 25, y: 190, size: 24,
});

page.drawText('ក្ដី ក្ឌី ក្បួន ស្ត្រី ង្គ្រ', {
  font, x: 25, y: 130, size: 28, color: rgb(0.1, 0.1, 0.6),
});

page.drawText('អក្សរសិល្ប៍ខ្មែរ', {
  font, x: 25, y: 60, size: 30,
});

return pdfDoc;`,
  },

  alignment: {
    code: `const { PDFDocument, StandardFonts, rgb } = happypdf;

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([420, 480]);
const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

const text =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do ' +
  'eiusmod tempor incididunt ut labore et dolore magna aliqua.';

let y = 440;
for (const align of ['left', 'center', 'right', 'justify']) {
  page.drawText(align.toUpperCase(), {
    font, x: 30, y, size: 8, color: rgb(0.7, 0, 0),
  });
  page.drawText(text, {
    font, x: 30, y: y - 16, size: 11,
    maxWidth: 360, lineHeight: 14, align,
  });
  y -= 110;
}

return pdfDoc;`,
  },

  'khmer-justify': {
    fonts: ['NotoSansKhmer-Regular'],
    code: `const { PDFDocument } = happypdf;

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([420, 300]);
const font = await pdfDoc.embedFont(fonts['NotoSansKhmer-Regular'], {
  subset: true,
});

const text =
  'សួស្តីពិភពលោក សូមស្វាគមន៍មកកាន់ប្រទេសកម្ពុជា ' +
  'ដែលជាប្រទេសមួយនៅតំបន់អាស៊ីអាគ្នេយ៍។';

// Ragged right
page.drawText(text, {
  font, x: 30, y: 250, size: 14, maxWidth: 360, lineHeight: 24,
});

// Justified — gaps land on word boundaries, not between letters
page.drawText(text, {
  font, x: 30, y: 130, size: 14, maxWidth: 360, lineHeight: 24,
  align: 'justify',
});

return pdfDoc;`,
  },

  'variable-font': {
    fonts: ['GoogleSans'],
    code: `const { PDFDocument } = happypdf;

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([420, 220]);

const samples = [
  ['wght 400', { wght: 400 }],
  ['wght 700', { wght: 700 }],
  ['GRAD -50', { GRAD: -50 }],
  ['GRAD 200', { GRAD: 200 }],
];

let y = 170;
for (const [label, variations] of samples) {
  const font = await pdfDoc.embedFont(fonts['GoogleSans'], { variations });
  page.drawText(label + '  Variable Font', { font, x: 20, y, size: 20 });
  y -= 40;
}

return pdfDoc;`,
  },

  drawing: {
    code: `const { PDFDocument, StandardFonts, rgb, degrees } = happypdf;

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([420, 300]);
const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

page.drawRectangle({
  x: 30, y: 180, width: 160, height: 80,
  color: rgb(0.95, 0.6, 0.2),
  borderColor: rgb(0.4, 0.2, 0), borderWidth: 2,
});

page.drawEllipse({
  x: 300, y: 220, xScale: 70, yScale: 40, color: rgb(0.2, 0.5, 0.9),
});

page.drawText('Rotated', {
  font, x: 60, y: 90, size: 28,
  rotate: degrees(20), color: rgb(0.1, 0.1, 0.1),
});

page.drawLine({
  start: { x: 30, y: 50 }, end: { x: 390, y: 50 },
  thickness: 3, color: rgb(0.8, 0.1, 0.3),
});

return pdfDoc;`,
  },

  'arabic-shaping': {
    fonts: ['NotoSansArabic-Regular'],
    code: `const { PDFDocument, StandardFonts, rgb } = happypdf;

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([420, 240]);
const arabic = await pdfDoc.embedFont(fonts['NotoSansArabic-Regular']);
const label = await pdfDoc.embedFont(StandardFonts.Helvetica);

// Arabic letters change shape depending on their neighbours, and the script
// runs right to left. Both are handled by the shaper.
page.drawText('مرحبا بالعالم', { font: arabic, x: 25, y: 170, size: 28 });
page.drawText('اللغة العربية جميلة', { font: arabic, x: 25, y: 110, size: 24 });

page.drawText('Initial / medial / final forms are chosen by context', {
  font: label, x: 25, y: 50, size: 9, color: rgb(0.45, 0.45, 0.45),
});

return pdfDoc;`,
  },

  'thai-wrapping': {
    fonts: ['NotoSansThai-Regular'],
    code: `const { PDFDocument } = happypdf;

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([420, 260]);
const font = await pdfDoc.embedFont(fonts['NotoSansThai-Regular'], {
  subset: true,
});

// Thai has no spaces between words either — Intl.Segmenter finds the breaks.
const text =
  'ประเทศไทยเป็นประเทศในภูมิภาคเอเชียตะวันออกเฉียงใต้ ' +
  'มีวัฒนธรรมและอาหารที่มีชื่อเสียงไปทั่วโลก';

page.drawText(text, {
  font, x: 30, y: 210, size: 14, maxWidth: 360, lineHeight: 26,
});

page.drawText(text, {
  font, x: 30, y: 100, size: 14, maxWidth: 360, lineHeight: 26,
  align: 'justify',
});

return pdfDoc;`,
  },

  'multi-page': {
    code: `const { PDFDocument, StandardFonts, rgb } = happypdf;

const pdfDoc = await PDFDocument.create();
const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

const paragraphs = [
  'HappyPDF paginates by measuring text before it draws it.',
  'wrapText returns the line boxes for a block, so you can decide where a page ends.',
  'Each line is positioned individually, which is what makes justification and complex scripts work.',
];

for (let i = 0; i < 3; i++) {
  const page = pdfDoc.addPage([400, 260]);

  page.drawText('Page ' + (i + 1), { font: bold, x: 30, y: 210, size: 18 });
  page.drawText(paragraphs[i], {
    font, x: 30, y: 175, size: 12, maxWidth: 340, lineHeight: 18,
  });

  page.drawLine({
    start: { x: 30, y: 40 }, end: { x: 370, y: 40 },
    thickness: 1, color: rgb(0.8, 0.8, 0.8),
  });
  page.drawText(String(i + 1) + ' / 3', {
    font, x: 350, y: 26, size: 9, color: rgb(0.5, 0.5, 0.5),
  });
}

return pdfDoc;`,
  },

  measuring: {
    code: `const { PDFDocument, StandardFonts, wrapText, rgb } = happypdf;

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([420, 300]);
const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

const text =
  'wrapText gives you the line boxes without drawing anything, so you can ' +
  'measure a block before deciding where to put it.';

const size = 12;
const lineHeight = 17;
const maxWidth = 340;

// Measure first...
const lines = wrapText(text, (t) => font.widthOfTextAtSize(t, size), {
  maxWidth,
});
const blockHeight = lines.length * lineHeight;

// ...then draw a box that fits exactly, and the text inside it.
const top = 250;
page.drawRectangle({
  x: 30, y: top - blockHeight, width: maxWidth, height: blockHeight,
  color: rgb(0.96, 0.96, 0.99),
  borderColor: rgb(0.75, 0.75, 0.9), borderWidth: 1,
});

page.drawText(text, {
  font, x: 30, y: top - lineHeight + 4, size, maxWidth, lineHeight,
});

page.drawText(lines.length + ' lines, ' + blockHeight + 'pt tall', {
  font, x: 30, y: top - blockHeight - 24, size: 10,
  color: rgb(0.4, 0.4, 0.4),
});

return pdfDoc;`,
  },

  'edit-existing': {
    code: `const { PDFDocument, StandardFonts, rgb, degrees } = happypdf;

// Build a document, then load it back and stamp it — the same flow you would
// use on a PDF fetched from a server.
const original = await PDFDocument.create();
const originalPage = original.addPage([400, 260]);
const originalFont = await original.embedFont(StandardFonts.TimesRoman);
originalPage.drawText('Original invoice', {
  font: originalFont, x: 30, y: 200, size: 18,
});
originalPage.drawText('Amount due: $420.00', {
  font: originalFont, x: 30, y: 170, size: 12,
});
const bytes = await original.save();

const pdfDoc = await PDFDocument.load(bytes);
const [page] = pdfDoc.getPages();
const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

page.drawText('PAID', {
  font, x: 150, y: 80, size: 52,
  color: rgb(0.85, 0.15, 0.15), rotate: degrees(18), opacity: 0.45,
});

return pdfDoc;`,
  },

  'merge-pages': {
    code: `const { PDFDocument, StandardFonts, rgb } = happypdf;

// Two source documents...
const makeDoc = async (label, color) => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const page = doc.addPage([300, 200]);
  page.drawRectangle({ x: 0, y: 0, width: 300, height: 200, color });
  page.drawText(label, { font, x: 24, y: 90, size: 26 });
  return doc;
};

const a = await makeDoc('Document A', rgb(0.93, 0.96, 1));
const b = await makeDoc('Document B', rgb(1, 0.95, 0.9));

// ...copied into one.
const merged = await PDFDocument.create();
for (const src of [a, b]) {
  const pages = await merged.copyPages(src, src.getPageIndices());
  for (const page of pages) merged.addPage(page);
}

return merged;`,
  },

  'images-svg': {
    code: `const { PDFDocument, StandardFonts, rgb } = happypdf;

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([420, 300]);
const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

// SVG paths are drawn natively — no rasterisation.
const heart =
  'M 0 0 C -20 -20 -50 10 0 45 C 50 10 20 -20 0 0 Z';

page.drawSvgPath(heart, {
  x: 90, y: 230, color: rgb(0.9, 0.2, 0.35), scale: 1.4,
});

page.drawSvgPath('M 0 0 L 40 -60 L 80 0 Z', {
  x: 200, y: 230, color: rgb(0.2, 0.6, 0.4), scale: 1.2,
});

page.drawSvgPath('M 0 0 L 60 0 L 60 60 L 0 60 Z', {
  x: 320, y: 175, borderColor: rgb(0.2, 0.3, 0.8), borderWidth: 3,
});

page.drawText('drawSvgPath renders vector paths directly', {
  font, x: 30, y: 120, size: 11, color: rgb(0.4, 0.4, 0.4),
});

page.drawText('Scale, rotate, fill and stroke all work', {
  font, x: 30, y: 100, size: 11, color: rgb(0.4, 0.4, 0.4),
});

return pdfDoc;`,
  },

  'features-kerning': {
    fonts: ['GoogleSans'],
    code: `const { PDFDocument, StandardFonts, rgb } = happypdf;

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([420, 220]);
const label = await pdfDoc.embedFont(StandardFonts.Helvetica);

// OpenType feature tags are forwarded to HarfBuzz.
const withLiga = await pdfDoc.embedFont(fonts['GoogleSans']);
const noLiga = await pdfDoc.embedFont(fonts['GoogleSans'], {
  features: { liga: false, kern: false },
});

const sample = 'Waffle office film — AV To Ye';

page.drawText('default (liga + kern on)', {
  font: label, x: 25, y: 175, size: 9, color: rgb(0.55, 0.55, 0.55),
});
page.drawText(sample, { font: withLiga, x: 25, y: 145, size: 22 });

page.drawText('liga: false, kern: false', {
  font: label, x: 25, y: 95, size: 9, color: rgb(0.55, 0.55, 0.55),
});
page.drawText(sample, { font: noLiga, x: 25, y: 65, size: 22 });

return pdfDoc;`,
  },

  forms: {
    code: `const { PDFDocument, StandardFonts } = happypdf;

const pdfDoc = await PDFDocument.create();
const page = pdfDoc.addPage([420, 260]);
const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
const form = pdfDoc.getForm();

page.drawText('Registration', { font, x: 30, y: 215, size: 16 });

const name = form.createTextField('form.name');
name.setText('Sokha Chan');
name.addToPage(page, { x: 30, y: 160, width: 240, height: 26 });

const notes = form.createTextField('form.notes');
notes.enableMultiline();
notes.setText('Wrapped field text that runs past the width of the widget.');
notes.addToPage(page, { x: 30, y: 80, width: 240, height: 60 });

const check = form.createCheckBox('form.subscribe');
check.check();
check.addToPage(page, { x: 300, y: 160, width: 20, height: 20 });
page.drawText('Subscribe', { font, x: 326, y: 165, size: 11 });

form.updateFieldAppearances(font);
return pdfDoc;`,
  },
};
