/**
 * Stages the assets the live demos need into `docs/public`.
 *
 * These are copied at build time rather than committed so the repository does
 * not carry a second copy of the fonts, and so the demos always run the exact
 * browser bundle this repo produces rather than a CDN copy of another version.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'docs/public');

const bundle = path.join(root, 'dist/happypdf.min.js');
if (!fs.existsSync(bundle)) {
  console.error('dist/happypdf.min.js is missing — run `npm run build` first.');
  process.exit(1);
}

/** Demo fonts, named as the demos key them. */
const fonts = {
  'NotoSansKhmer-Regular.ttf':
    'assets/fonts/noto_sans_khmer/NotoSansKhmer-Regular.ttf',
  'GoogleSans.ttf': 'assets/fonts/google_sans/GoogleSans.ttf',
  'NotoSansArabic-Regular.ttf':
    'assets/fonts/noto_sans_arabic/NotoSansArabic-Regular.ttf',
  'NotoSansThai-Regular.ttf':
    'assets/fonts/noto_sans_thai/NotoSansThai-Regular.ttf',
};

const mb = (file) => (fs.statSync(file).size / 1024 / 1024).toFixed(1);

fs.copyFileSync(bundle, path.join(publicDir, 'happypdf.min.js'));
console.log(`happypdf.min.js (${mb(bundle)}MB)`);

const fontsDir = path.join(publicDir, 'fonts');
fs.mkdirSync(fontsDir, { recursive: true });

for (const [name, source] of Object.entries(fonts)) {
  const from = path.join(root, source);
  if (!fs.existsSync(from)) {
    console.error(`Missing demo font: ${source}`);
    process.exit(1);
  }
  fs.copyFileSync(from, path.join(fontsDir, name));
  console.log(`fonts/${name} (${mb(from)}MB)`);
}
