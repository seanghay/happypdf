import fs from 'fs';

import { PDFDocument, rgb, StandardFonts } from '../../src/index';

/**
 * The fixture pages compared against committed reference images.
 *
 * Each one targets something the unit tests cannot see: whether glyphs actually
 * land where they should. Keep them small and deterministic — no dates, no
 * random content — so a diff always means a real change.
 */
export interface Fixture {
  name: string;
  build: () => Promise<Uint8Array>;
}

const khmerFont = () =>
  fs.readFileSync('assets/fonts/noto_sans_khmer/NotoSansKhmer-Regular.ttf');
const variableFont = () =>
  fs.readFileSync('assets/fonts/google_sans/GoogleSans.ttf');

const LOREM =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod ' +
  'tempor incididunt ut labore et dolore magna aliqua.';

const KHMER = 'សួស្តីពិភពលោក សូមស្វាគមន៍មកកាន់ប្រទេសកម្ពុជា ដែលជាប្រទេសមួយនៅតំបន់អាស៊ីអាគ្នេយ៍។';

const newDoc = async () => {
  const pdfDoc = await PDFDocument.create({ updateMetadata: false });
  return pdfDoc;
};

export const fixtures: Fixture[] = [
  {
    // Complex-script shaping: clusters, subscripts and vowel reordering must
    // survive into the page, both subset and fully embedded.
    name: 'khmer-shaping',
    build: async () => {
      const pdfDoc = await newDoc();
      const page = pdfDoc.addPage([420, 260]);
      const full = await pdfDoc.embedFont(khmerFont());
      const subset = await pdfDoc.embedFont(khmerFont(), { subset: true });

      page.drawText('សួស្តី ព្រះរាជាណាចក្រកម្ពុជា', {
        font: full,
        x: 20,
        y: 200,
        size: 22,
      });
      page.drawText('សួស្តី ព្រះរាជាណាចក្រកម្ពុជា', {
        font: subset,
        x: 20,
        y: 150,
        size: 22,
      });
      page.drawText('ក្ដី ក្ឌី ក្បួន ស្ត្រី ង្គ្រ', {
        font: full,
        x: 20,
        y: 90,
        size: 26,
        color: rgb(0.1, 0.1, 0.6),
      });

      return pdfDoc.save();
    },
  },
  {
    // Every alignment, so a regression in the offset maths is visible.
    name: 'alignment',
    build: async () => {
      const pdfDoc = await newDoc();
      const page = pdfDoc.addPage([420, 480]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

      let y = 440;
      for (const align of ['left', 'center', 'right', 'justify'] as const) {
        page.drawText(align.toUpperCase(), {
          font,
          x: 30,
          y,
          size: 8,
          color: rgb(0.7, 0, 0),
        });
        page.drawText(LOREM, {
          font,
          x: 30,
          y: y - 16,
          size: 11,
          maxWidth: 360,
          lineHeight: 14,
          align,
        });
        y -= 110;
      }

      return pdfDoc.save();
    },
  },
  {
    // Wrapping and justification in a script with no spaces between words.
    name: 'khmer-wrapping',
    build: async () => {
      const pdfDoc = await newDoc();
      const page = pdfDoc.addPage([420, 300]);
      const font = await pdfDoc.embedFont(khmerFont(), { subset: true });

      page.drawText(KHMER, {
        font,
        x: 30,
        y: 250,
        size: 14,
        maxWidth: 360,
        lineHeight: 24,
      });
      page.drawText(KHMER, {
        font,
        x: 30,
        y: 130,
        size: 14,
        maxWidth: 360,
        lineHeight: 24,
        align: 'justify',
      });

      return pdfDoc.save();
    },
  },
  {
    // Variable font instancing. Google Sans exposes wght 400-700 and GRAD
    // -50-200, so the samples sit at the ends of each axis: a regression that
    // stopped applying variations would collapse them onto one another.
    name: 'variable-font',
    build: async () => {
      const pdfDoc = await newDoc();
      const page = pdfDoc.addPage([420, 220]);

      const samples: [string, Record<string, number>][] = [
        ['wght 400', { wght: 400 }],
        ['wght 700', { wght: 700 }],
        ['GRAD -50', { GRAD: -50 }],
        ['GRAD 200', { GRAD: 200 }],
      ];

      let y = 170;
      for (const [label, variations] of samples) {
        const font = await pdfDoc.embedFont(variableFont(), { variations });
        page.drawText(`${label}  Variable Font`, {
          font,
          x: 20,
          y,
          size: 20,
        });
        y -= 40;
      }

      return pdfDoc.save();
    },
  },
];
