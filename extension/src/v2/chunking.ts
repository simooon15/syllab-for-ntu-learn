/**
 * Long-Source chunking (Technical Design §8.2).
 *
 * Native structure boundaries win: page, slide, section and table-run starts supplied by the
 * caller become cut candidates, and paragraph breaks are the fallback. Every chunk carries its
 * exact range into the supplied text, so a later Task A call can be pointed at a character range
 * without re-deriving offsets. Chunk ids are a digest of (sourceId, chunkIndex, text) only, so a
 * retried unit reuses the same idempotency key and never applies twice.
 */

export const CHUNK_TARGET_CHARS = 10_000;
export const CHUNK_HARD_LIMIT_CHARS = 14_000;
export const CHUNK_OVERLAP_LIMIT_CHARS = 800;

/**
 * A native division of the Source. `label` is the locator the caller already knows ("Page 4",
 * "Slides 12-18", "Table 2"); `start`/`end` are offsets into the same text handed to
 * `planChunks`.
 */
export interface ChunkStructureSegment {
  label: string;
  start: number;
  end: number;
}

/**
 * Either located segments, or a plain ordered list of native labels. A plain label list is
 * resolved by exact first-occurrence search in the text, in order, from a moving cursor; a label
 * that does not occur contributes no boundary rather than an invented one.
 */
export type ChunkStructure = ChunkStructureSegment[] | string[];

export interface ChunkInput {
  sourceId: string;
  /** Locator of the whole Source; used when no native structure label covers a chunk. */
  locator?: string;
  /** Canonical Source text. Offsets on the returned chunks index into exactly this string. */
  text: string;
  structure?: ChunkStructure;
}

export interface Chunk {
  chunkId: string;
  chunkIndex: number;
  chunkCount: number;
  text: string;
  /** First native label the chunk spans, else the Source locator. */
  locator: string;
  /** Every native label the chunk spans, in document order, without duplicates. */
  locators: string[];
  /** Inclusive start offset into the Source text; a later chunk may start before an earlier end. */
  start: number;
  /** Exclusive end offset into the Source text. */
  end: number;
}

interface Span {
  start: number;
  end: number;
  label?: string;
}

function clampOffset(value: number, length: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(length, Math.trunc(value)));
}

/** Boundaries name the region that starts at the offset, so a label at 0 labels the first span. */
function labelledSpans(length: number, boundaries: Array<{ label: string; at: number }>): Span[] {
  const sorted = boundaries
    .map((entry) => ({ label: entry.label, at: clampOffset(entry.at, length) }))
    .filter((entry) => entry.label.length > 0 && entry.at < length)
    .sort((left, right) => left.at - right.at);
  const spans: Span[] = [];
  let cursor = 0;
  let label: string | undefined;
  for (const boundary of sorted) {
    if (boundary.at < cursor) continue;
    if (boundary.at === 0) {
      label = boundary.label;
      continue;
    }
    if (boundary.at > cursor) {
      spans.push({ start: cursor, end: boundary.at, ...(label === undefined ? {} : { label }) });
    }
    cursor = boundary.at;
    label = boundary.label;
  }
  if (cursor < length) {
    spans.push({ start: cursor, end: length, ...(label === undefined ? {} : { label }) });
  }
  return spans;
}

function isLabelList(structure: ChunkStructure): structure is string[] {
  const [first] = structure;
  return typeof first === "string";
}

function structureSpans(text: string, structure: ChunkStructure | undefined): Span[] {
  if (structure === undefined || structure.length === 0) return [{ start: 0, end: text.length }];
  if (isLabelList(structure)) {
    let cursor = 0;
    const boundaries: Array<{ label: string; at: number }> = [];
    for (const label of structure) {
      if (label.length === 0) continue;
      const at = text.indexOf(label, cursor);
      if (at < 0) continue;
      boundaries.push({ label, at });
      cursor = at + label.length;
    }
    return labelledSpans(text.length, boundaries);
  }
  return labelledSpans(
    text.length,
    structure.map((segment) => ({ label: segment.label, at: segment.start }))
  );
}

/** Every position a paragraph starts at, i.e. directly after a blank-line separator. */
function paragraphStarts(text: string): number[] {
  const starts: number[] = [];
  let at = text.indexOf("\n\n");
  while (at >= 0) {
    starts.push(at + 2);
    at = text.indexOf("\n\n", at + 2);
  }
  return starts;
}

function lastCandidateAtOrBefore(
  candidates: number[],
  from: number,
  until: number
): number | undefined {
  let found: number | undefined;
  for (const candidate of candidates) {
    if (candidate <= from) continue;
    if (candidate > until) break;
    found = candidate;
  }
  return found;
}

function chooseContentEnd(
  native: number[],
  paragraph: number[],
  total: number,
  contentStart: number,
  target: number,
  budget: number
): number {
  const limit = Math.min(total, contentStart + budget);
  // The rest of the Source fits in this chunk: never split off a small tail chunk.
  if (limit === total) return total;
  const prefer = Math.min(total, contentStart + target);
  const insideTarget = (candidates: number[]) =>
    lastCandidateAtOrBefore(candidates, contentStart, prefer);
  const insideLimit = (candidates: number[]) =>
    lastCandidateAtOrBefore(candidates, contentStart, limit);
  return (
    insideTarget(native) ??
    insideTarget(paragraph) ??
    insideLimit(native) ??
    insideLimit(paragraph) ??
    limit
  );
}

/**
 * Overlap is the last complete paragraph of the chunk, capped at 800 characters. A trailing
 * paragraph separator belongs to the cut rather than to a paragraph, so a chunk that ends on a
 * paragraph boundary still hands over that whole paragraph.
 */
function overlapLength(text: string, chunkStart: number, contentEnd: number): number {
  const chunkText = text.slice(chunkStart, contentEnd);
  if (chunkText.length <= 1) return 0;
  let bodyEnd = chunkText.length;
  while (bodyEnd > 0 && chunkText[bodyEnd - 1] === "\n") bodyEnd -= 1;
  if (bodyEnd === 0) return 0;
  const lastBreak = chunkText.slice(0, bodyEnd).lastIndexOf("\n\n");
  const lastParagraphStart = lastBreak < 0 ? 0 : lastBreak + 2;
  return Math.min(
    chunkText.length - lastParagraphStart,
    CHUNK_OVERLAP_LIMIT_CHARS,
    chunkText.length - 1
  );
}

function labelsFor(spans: Span[], start: number, end: number): string[] {
  const labels: string[] = [];
  for (const span of spans) {
    if (span.label === undefined) continue;
    if (span.end > start && span.start < end) labels.push(span.label);
  }
  return [...new Set(labels)];
}

/**
 * Plans the chunks of one Source. The union of `[start, end)` ranges always covers the whole
 * text, and the text of every chunk is exactly `text.slice(start, end)`.
 */
export function planChunks(input: ChunkInput): Chunk[] {
  const text = input.text;
  if (text.length === 0) return [];
  const spans = structureSpans(text, input.structure);
  const native = spans.slice(1).map((span) => span.start);
  const paragraph = paragraphStarts(text);
  const ranges: Array<{ start: number; end: number }> = [];
  let contentStart = 0;
  let chunkStart = 0;
  while (contentStart < text.length) {
    const inherited = chunkStart < contentStart ? contentStart - chunkStart : 0;
    const budget = Math.max(1, CHUNK_HARD_LIMIT_CHARS - inherited);
    const contentEnd = chooseContentEnd(
      native,
      paragraph,
      text.length,
      contentStart,
      Math.min(CHUNK_TARGET_CHARS, budget),
      budget
    );
    ranges.push({ start: chunkStart, end: contentEnd });
    contentStart = contentEnd;
    chunkStart = Math.max(0, contentEnd - overlapLength(text, chunkStart, contentEnd));
  }
  const chunkCount = ranges.length;
  return ranges.map((range, chunkIndex) => {
    const chunkText = text.slice(range.start, range.end);
    const locators = labelsFor(spans, range.start, range.end);
    return {
      chunkId: `chunk_${stableDigest([input.sourceId, String(chunkIndex), chunkText].join("\u0000"))}`,
      chunkIndex,
      chunkCount,
      text: chunkText,
      locator: locators[0] ?? input.locator ?? input.sourceId,
      locators,
      start: range.start,
      end: range.end
    };
  });
}

/**
 * Synchronous 64-bit FNV-1a digest over UTF-16 code units. `crypto.subtle` is asynchronous and
 * therefore unusable inside the pure id derivations (chunk ids, idempotency keys) that must be
 * reproducible from the same input.
 */
export function stableDigest(value: string): string {
  let hash = 0xcbf29ce484222325n;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= BigInt(value.charCodeAt(index));
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, "0");
}
