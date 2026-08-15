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
