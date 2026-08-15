import { cleanText, lineSplit } from '../../utils';

/**
 * How a wrapped paragraph is aligned within its `maxWidth`.
 *
 * `justify` stretches every line except the last one of a paragraph to fill
 * the full width, distributing the slack across that line's break
 * opportunities. The last line is drawn `left` aligned, matching the
 * convention of CSS `text-align: justify`.
 */
export type TextAlign = 'left' | 'center' | 'right' | 'justify';

/**
 * Which algorithm chooses the break points.
 *
 * `greedy` fills each line until the next segment no longer fits. It is O(n)
 * and matches the behaviour of most browsers. This is currently the only
 * strategy; the option exists so that an optimal (Knuth-Plass) strategy can be
 * added later without an API change.
 */
export type BreakStrategy = 'greedy';

/**
 * How words that are wider than `maxWidth` on their own are handled.
 *
 * - `normal` — break inside the word (between graphemes) so it fits.
 * - `keep-all` — never break inside a word; let it overflow.
 */
export type WordBreak = 'normal' | 'keep-all';

/** A measurable piece of text, and whether a line may break before it. */
interface Segment {
  text: string;
  width: number;
  /** A line break is permitted immediately before this segment. */
  breakBefore: boolean;
  /** Whitespace, which collapses at the start and end of a wrapped line. */
  isSpace: boolean;
}

/** A horizontal piece of a laid out line, offset from the line's origin. */
export interface TextRun {
  text: string;
  /** Offset from the start of the line, in the text's own units. */
  x: number;
}

export interface WrappedLine {
  /** The line's text, with collapsed leading/trailing whitespace removed. */
  text: string;
  /**
   * The pieces to draw. Left/center/right aligned lines hold a single run;
   * justified lines hold one run per stretched segment.
   */
  runs: TextRun[];
  /** Natural width of `text`, ignoring any justification stretch. */
  width: number;
  /** True when this line ends a paragraph (a hard break or end of text). */
  isParagraphEnd: boolean;
}

export interface WrapTextOptions {
  /** Width to wrap at. When omitted, only hard line breaks are honoured. */
  maxWidth?: number;
  align?: TextAlign;
  breakStrategy?: BreakStrategy;
  wordBreak?: WordBreak;
  /** Locale passed to `Intl.Segmenter`. */
  locale?: string;
}

const SOFT_HYPHEN = '­';

const segmenterCache = new Map<string, Intl.Segmenter>();

/** Segmenters are expensive to build and safe to share, so they are cached. */
const getSegmenter = (
  granularity: 'word' | 'grapheme',
  locale?: string,
): Intl.Segmenter => {
  const key = `${granularity}:${locale ?? ''}`;
  let segmenter = segmenterCache.get(key);
  if (!segmenter) {
    segmenter = new Intl.Segmenter(locale, { granularity });
    segmenterCache.set(key, segmenter);
  }
  return segmenter;
};

const isSpaceText = (text: string) => /^\s+$/.test(text);

/** Splits `text` into graphemes, keeping combining marks with their base. */
const graphemesOf = (text: string, locale?: string): string[] =>
  Array.from(getSegmenter('grapheme', locale).segment(text), (s) => s.segment);

/**
 * Splits a single (hard-break free) line into segments with break
 * opportunities marked.
 *
 * `Intl.Segmenter` is used when available because it finds word boundaries in
 * scripts that do not separate words with spaces — Khmer, Thai, Lao, Japanese
 * — which is exactly where a whitespace-only rule fails. We permit a break
 * before a segment when the previous segment was whitespace, or when two
 * word-like segments sit directly next to each other (the spaceless case).
 * That deliberately excludes breaking before punctuation such as `.` or `)`.
 */
const segmentLine = (
  text: string,
  measure: (t: string) => number,
  locale?: string,
): Segment[] => {
  const segments: Segment[] = [];

  const push = (raw: string, breakBefore: boolean) => {
    if (raw === '') return;
    segments.push({
      text: raw,
      width: measure(raw),
      breakBefore: breakBefore && segments.length > 0,
      isSpace: isSpaceText(raw),
    });
  };

  let prevWordLike = false;
  let prevWasSpace = false;

  for (const { segment, isWordLike } of getSegmenter('word', locale).segment(
    text,
  )) {
    const wordLike = !!isWordLike;
    const breakBefore = prevWasSpace || (wordLike && prevWordLike);

    // A soft hyphen is an author-supplied break opportunity. Split it out so
    // the break can be taken, and drop the character when it is not.
    if (wordLike && segment.includes(SOFT_HYPHEN)) {
      const pieces = segment.split(SOFT_HYPHEN);
      for (let idx = 0; idx < pieces.length; idx++) {
        push(pieces[idx], idx === 0 ? breakBefore : true);
      }
    } else {
      push(segment, breakBefore);
    }

    prevWordLike = wordLike;
    prevWasSpace = isSpaceText(segment);
  }

  return segments;
};

/**
 * Splits an over-long segment into the widest grapheme runs that each fit
 * within `maxWidth`.
 */
const breakOverlongSegment = (
  segment: Segment,
  maxWidth: number,
  measure: (t: string) => number,
  locale?: string,
): Segment[] => {
  const graphemes = graphemesOf(segment.text, locale);
  const pieces: Segment[] = [];

  let current = '';
  for (const grapheme of graphemes) {
    const candidate = current + grapheme;
    if (current !== '' && measure(candidate) > maxWidth) {
      pieces.push({
        text: current,
        width: measure(current),
        breakBefore: pieces.length === 0 ? segment.breakBefore : true,
        isSpace: false,
      });
      current = grapheme;
    } else {
      current = candidate;
    }
  }

  if (current !== '') {
    pieces.push({
      text: current,
      width: measure(current),
      breakBefore: pieces.length === 0 ? segment.breakBefore : true,
      isSpace: false,
    });
  }

  return pieces.length > 0 ? pieces : [segment];
};

/**
 * Turns a run of segments into a finished line: trailing whitespace is
 * dropped, and the visible text is measured once as a whole so that the width
 * used for alignment accounts for kerning and shaping across segment
 * boundaries.
 */
interface BuiltLine {
  line: WrappedLine;
  /** The line's segments with trailing whitespace removed. */
  segments: Segment[];
}

const buildLine = (
  segments: Segment[],
  isParagraphEnd: boolean,
  measure: (t: string) => number,
): BuiltLine | undefined => {
  let end = segments.length;
  while (end > 0 && segments[end - 1].isSpace) end--;
  const visible = segments.slice(0, end);

  if (visible.length === 0) {
    return isParagraphEnd
      ? {
          line: { text: '', runs: [], width: 0, isParagraphEnd },
          segments: [],
        }
      : undefined;
  }

  const text = textOf(visible, 0, visible.length);

  return {
    line: {
      text,
      // Justification replaces this with one run per stretched piece.
      runs: [{ text, x: 0 }],
      width: measure(text),
      isParagraphEnd,
    },
    segments: visible,
  };
};

/**
 * Distributes the slack between `line.width` and `maxWidth` across the line's
 * internal break opportunities, producing one run per piece.
 *
 * Each run is encoded and drawn separately, so shaping does not carry across a
 * stretched gap. For space-separated scripts that is harmless, and for
 * spaceless scripts the gaps land on the word boundaries `Intl.Segmenter`
 * found.
 */
const justifyLine = (
  line: WrappedLine,
  segments: Segment[],
  maxWidth: number,
  measure: (t: string) => number,
): WrappedLine => {
  const gapIndices: number[] = [];
  for (let idx = 1; idx < segments.length; idx++) {
    if (segments[idx].breakBefore) gapIndices.push(idx);
  }

  const slack = maxWidth - line.width;
  if (gapIndices.length === 0 || slack <= 0) return line;

  const extraPerGap = slack / gapIndices.length;
  const runs: TextRun[] = [];

  let pieceStart = 0;
  for (let gap = 0; gap <= gapIndices.length; gap++) {
    const pieceEnd =
      gap < gapIndices.length ? gapIndices[gap] : segments.length;
    const text = textOf(segments, pieceStart, pieceEnd);

    if (text !== '') {
      // The piece keeps its natural offset within the line, pushed right by
      // one share of the slack for every gap that precedes it.
      const natural = measure(textOf(segments, 0, pieceStart));
      runs.push({ text, x: natural + gap * extraPerGap });
    }

    pieceStart = pieceEnd;
  }

  return { ...line, runs };
};

const textOf = (segments: Segment[], from: number, to: number) =>
  segments
    .slice(from, to)
    .map((s) => s.text)
    .join('');

/**
 * Wraps `text` to `maxWidth` and resolves each line's horizontal offsets for
 * the requested alignment.
 *
 * `measure` receives a string and returns its width in the same units as
 * `maxWidth`; it is called with whole candidate lines, so shaping and kerning
 * are accounted for in the values used to align.
 */
export const wrapText = (
  text: string,
  measure: (t: string) => number,
  options: WrapTextOptions = {},
): WrappedLine[] => {
  const { maxWidth, align = 'left', wordBreak = 'normal', locale } = options;

  const hardLines = lineSplit(cleanText(text));

  // Text ending in a newline terminates the last paragraph rather than
  // starting an empty one. Interior blank lines are still preserved.
  if (hardLines.length > 1 && hardLines[hardLines.length - 1] === '') {
    hardLines.pop();
  }
  const wrapped: WrappedLine[] = [];
  // Segments backing each produced line, needed to justify it.
  const lineSegments: Segment[][] = [];

  for (const hardLine of hardLines) {
    if (maxWidth === undefined || maxWidth <= 0) {
      const built = buildLine(
        segmentLine(hardLine, measure, locale),
        true,
        measure,
      );
      if (built) {
        wrapped.push(built.line);
        lineSegments.push(built.segments);
      }
      continue;
    }

    const segments = segmentLine(hardLine, measure, locale);
    let current: Segment[] = [];
    let currentWidth = 0;

    const flush = (isParagraphEnd: boolean) => {
      const built = buildLine(current, isParagraphEnd, measure);
      if (built) {
        wrapped.push(built.line);
        lineSegments.push(built.segments);
      }
      current = [];
      currentWidth = 0;
    };

    for (let idx = 0; idx < segments.length; idx++) {
      let segment = segments[idx];

      // Whitespace never starts a wrapped line.
      if (segment.isSpace && current.length === 0) continue;

      const fits = currentWidth + segment.width <= maxWidth;

      if (!fits && segment.breakBefore && current.length > 0) {
        flush(false);
        if (segment.isSpace) continue;
      }

      // A segment that cannot fit on a line of its own.
      if (
        segment.width > maxWidth &&
        wordBreak === 'normal' &&
        !segment.isSpace
      ) {
        if (current.length > 0) flush(false);
        const pieces = breakOverlongSegment(segment, maxWidth, measure, locale);
        for (let p = 0; p < pieces.length - 1; p++) {
          current = [pieces[p]];
          flush(false);
        }
        segment = pieces[pieces.length - 1];
      }

      current.push(segment);
      currentWidth += segment.width;
    }

    flush(true);
  }

  if (wrapped.length === 0) {
    return [{ text: '', runs: [], width: 0, isParagraphEnd: true }];
  }

  // Resolve alignment. Without an explicit `maxWidth` the widest line defines
  // the box, so center/right stay meaningful and justify degrades to left.
  const boxWidth =
    maxWidth ?? wrapped.reduce((max, line) => Math.max(max, line.width), 0);

  return wrapped.map((line, idx) => {
    if (align === 'justify') {
      const canJustify = !line.isParagraphEnd && maxWidth !== undefined;
      return canJustify
        ? justifyLine(line, lineSegments[idx], boxWidth, measure)
        : line;
    }

    const offset =
      align === 'center'
        ? (boxWidth - line.width) / 2
        : align === 'right'
          ? boxWidth - line.width
          : 0;

    return offset === 0
      ? line
      : {
          ...line,
          runs: line.runs.map((run) => ({ ...run, x: run.x + offset })),
        };
  });
};
