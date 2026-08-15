import fs from 'fs';
import path from 'path';

import { fixtures } from './fixtures';
import {
  comparePng,
  hasRasterizer,
  referencePath,
  renderToPng,
} from './render';

/**
 * Visual regression tests.
 *
 * The other suites assert operator counts and advance widths, which cannot tell
 * whether a glyph actually landed in the right place. These rasterise fixture
 * pages and compare them against committed reference images, so a shaping,
 * positioning or alignment regression shows up as a picture that changed.
 *
 * Regenerate the references with `npm run test:visual:update` after an
 * intentional change, and review the resulting image diff — that review is the
 * whole point of committing the images.
 */

/** Set by `npm run test:visual:update` to rewrite the reference images. */
const UPDATING = process.env.VISUAL_UPDATE === '1';

// Poppler antialiases glyph edges slightly differently between versions, so
// exact equality is not a usable bar. Calibration: shifting a single line of a
// fixture by one point measures ~0.8% mean / ~1.5% changed, so these thresholds
// sit below that — a one-point positioning regression fails the suite.
const MAX_MEAN_DIFFERENCE = 0.004;
const MAX_CHANGED_PIXELS = 0.008;

const rasterizerAvailable = hasRasterizer();

describe.skipIf(!rasterizerAvailable)('visual regression', () => {
  it.each(fixtures.map((f) => [f.name, f] as const))(
    'renders %s as expected',
    async (name, fixture) => {
      const actual = renderToPng(await fixture.build());
      const expectedPath = referencePath(name);

      if (UPDATING) {
        fs.mkdirSync(path.dirname(expectedPath), { recursive: true });
        fs.writeFileSync(expectedPath, actual);

        const stale = path.join(
          path.dirname(expectedPath),
          `${name}.actual.png`,
        );
        if (fs.existsSync(stale)) fs.rmSync(stale);
        return;
      }

      if (!fs.existsSync(expectedPath)) {
        throw new Error(
          `No reference image for "${name}". Run \`npm run test:visual:update\` to create it.`,
        );
      }

      const result = comparePng(actual, fs.readFileSync(expectedPath));

      if (
        result.sizeMismatch ||
        result.difference > MAX_MEAN_DIFFERENCE ||
        result.changedPixels > MAX_CHANGED_PIXELS
      ) {
        // Leave the failing render next to the reference so it can be opened.
        const failedPath = path.join(
          path.dirname(expectedPath),
          `${name}.actual.png`,
        );
        fs.writeFileSync(failedPath, actual);
      }

      expect(
        result.sizeMismatch,
        `${name}: rendered size differs from the reference`,
      ).toBeUndefined();
      expect(
        result.difference,
        `${name}: mean difference ${(result.difference * 100).toFixed(3)}%`,
      ).toBeLessThanOrEqual(MAX_MEAN_DIFFERENCE);
      expect(
        result.changedPixels,
        `${name}: ${(result.changedPixels * 100).toFixed(3)}% of pixels changed`,
      ).toBeLessThanOrEqual(MAX_CHANGED_PIXELS);
    },
  );
});

describe.skipIf(rasterizerAvailable)('visual regression', () => {
  it.skip('needs poppler (pdftoppm) to run', () => undefined);
});
