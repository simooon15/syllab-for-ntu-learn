import { describe, expect, it } from "vitest";

import {
  CHUNK_HARD_LIMIT_CHARS,
  CHUNK_OVERLAP_LIMIT_CHARS,
  CHUNK_TARGET_CHARS,
  planChunks,
  stableDigest,
  type Chunk,
  type ChunkStructureSegment
} from "./chunking";

function paragraph(seed: number, length: number): string {
  const unit = `Synthetic paragraph ${String(seed)} for chunking behaviour only. `;
  return unit.repeat(Math.ceil(length / unit.length)).slice(0, length);
}

function documentSections(sizes: number[]): string {
  return sizes.map((size, index) => paragraph(index, size)).join("\n\n");
}

function coversWholeText(text: string, chunks: Chunk[]): boolean {
  const covered = new Set<number>();
  for (const chunk of chunks) {
    expect(chunk.text).toBe(text.slice(chunk.start, chunk.end));
    for (let offset = chunk.start; offset < chunk.end; offset += 1) covered.add(offset);
  }
  return covered.size === text.length;
}

function expectedOverlap(text: string, chunk: Chunk): number {
  const chunkText = text.slice(chunk.start, chunk.end);
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

describe("long-Source chunking", () => {
  it("covers every character of a long Source without leaving a gap", () => {
    const text = documentSections([2_000, 3_000, 1_500, 4_000, 2_500, 900, 5_000, 1_200, 3_200]);
    const chunks = planChunks({ sourceId: "src-1", locator: "Handout", text, structure: [] });
    expect(chunks.length).toBeGreaterThan(1);
    expect(coversWholeText(text, chunks)).toBe(true);
    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual(chunks.map((_chunk, index) => index));
    expect(chunks.every((chunk) => chunk.chunkCount === chunks.length)).toBe(true);
    expect(chunks.at(-1)?.end).toBe(text.length);
  });

  it("keeps every chunk inside the hard limit and near the target", () => {
    const text = documentSections([9_000, 9_000, 9_000, 9_000]);
    const chunks = planChunks({ sourceId: "src-1", text, structure: [] });
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(CHUNK_HARD_LIMIT_CHARS);
    }
    const withoutOverlap = chunks.map((chunk) => chunk.end - chunk.start);
    expect(Math.max(...withoutOverlap.slice(0, -1))).toBeLessThanOrEqual(
      CHUNK_TARGET_CHARS + CHUNK_OVERLAP_LIMIT_CHARS
    );
  });

  it("hard-cuts inside one huge paragraph instead of exceeding the limit", () => {
    const text = paragraph(0, 40_000);
    const chunks = planChunks({ sourceId: "src-1", text, structure: [] });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(CHUNK_HARD_LIMIT_CHARS);
    }
    expect(coversWholeText(text, chunks)).toBe(true);
  });

  it("overlaps by the last complete paragraph, capped at the limit", () => {
    const text = documentSections(Array.from({ length: 40 }, () => 500));
    const chunks = planChunks({ sourceId: "src-1", text, structure: [] });
    expect(chunks.length).toBeGreaterThan(1);
    for (let index = 0; index < chunks.length - 1; index += 1) {
      const chunk = chunks[index];
      const next = chunks[index + 1];
      if (!chunk || !next) throw new Error("CHUNK_MISSING");
      const overlap = chunk.end - next.start;
      expect(overlap).toBe(expectedOverlap(text, chunk));
      expect(overlap).toBeGreaterThan(0);
      expect(overlap).toBeLessThanOrEqual(CHUNK_OVERLAP_LIMIT_CHARS);
      // The overlap is the tail of the previous chunk, and it starts a paragraph.
      expect(next.text.startsWith(text.slice(next.start, chunk.end))).toBe(true);
      expect(next.start === 0 || text.slice(next.start - 2, next.start) === "\n\n").toBe(true);
    }
  });

  it("caps the overlap at 800 characters when the last paragraph is longer", () => {
    const text = documentSections([6_000, 6_000, 6_000]);
    const chunks = planChunks({ sourceId: "src-1", text, structure: [] });
    for (let index = 0; index < chunks.length - 1; index += 1) {
      const chunk = chunks[index];
      const next = chunks[index + 1];
      if (!chunk || !next) throw new Error("CHUNK_MISSING");
      expect(chunk.end - next.start).toBe(CHUNK_OVERLAP_LIMIT_CHARS);
    }
  });

  it("prefers native page boundaries over paragraph boundaries", () => {
    const pages = [0, 1, 2, 3, 4, 5, 6, 7].map(() => documentSections([1_250, 1_250]));
    const text = pages.join("\n\n");
    const segments: ChunkStructureSegment[] = [];
    let cursor = 0;
    for (const [index, page] of pages.entries()) {
      segments.push({
        label: `Page ${String(index + 1)}`,
        start: cursor,
        end: cursor + page.length
      });
      cursor += page.length + 2;
    }
    const chunks = planChunks({ sourceId: "src-1", text, structure: segments });
    const pageStarts = segments.map((segment) => segment.start).slice(1);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks.slice(0, -1)) {
      expect(pageStarts).toContain(chunk.end);
    }
    expect(chunks[0]?.locators).toEqual(["Page 1", "Page 2", "Page 3"]);
    expect(chunks[0]?.locator).toBe("Page 1");
    const last = chunks.at(-1);
    // The trailing chunk starts inside the overlap, so it reaches back into Page 3.
    expect(last?.locators).toContain("Page 3");
    expect(last?.locators).toContain("Page 4");
    expect(last?.locators.at(-1)).toBe("Page 8");
  });

  it("resolves a plain label list by exact occurrence and ignores labels that are absent", () => {
    const text = documentSections([2_000, 2_000, 8_000, 2_000]);
    const chunks = planChunks({
      sourceId: "src-1",
      text,
      structure: ["Synthetic paragraph 0", "Synthetic paragraph 2", "Not present in this text"]
    });
    expect(chunks.length).toBeGreaterThan(1);
    const labels = chunks.flatMap((chunk) => chunk.locators);
    expect(labels).toContain("Synthetic paragraph 0");
    expect(labels).toContain("Synthetic paragraph 2");
    expect(labels).not.toContain("Not present in this text");
    expect(chunks[0]?.locators).toEqual(["Synthetic paragraph 0"]);
  });

  it("falls back to the Source locator when no structure label covers a chunk", () => {
    const chunks = planChunks({
      sourceId: "src-1",
      locator: "Handout",
      text: documentSections([5_000, 5_000]),
      structure: []
    });
    expect(chunks.every((chunk) => chunk.locator === "Handout")).toBe(true);
    expect(chunks.every((chunk) => chunk.locators.length === 0)).toBe(true);
  });

  it("is deterministic and derives chunk ids only from source, index and text", () => {
    const text = documentSections([6_000, 6_000, 6_000]);
    const first = planChunks({ sourceId: "src-1", locator: "Handout", text, structure: [] });
    const second = planChunks({ sourceId: "src-1", locator: "Handout", text, structure: [] });
    expect(second).toEqual(first);

    const otherSource = planChunks({ sourceId: "src-2", locator: "Handout", text, structure: [] });
    expect(otherSource.map((chunk) => chunk.chunkId)).not.toEqual(
      first.map((chunk) => chunk.chunkId)
    );
    expect(first[0]?.chunkId).toBe(
      `chunk_${stableDigest(["src-1", "0", first[0]?.text ?? ""].join("\u0000"))}`
    );
  });

  it("returns no chunks for empty text and one chunk for text that fits", () => {
    expect(planChunks({ sourceId: "src-1", text: "", structure: [] })).toEqual([]);
    const short = planChunks({ sourceId: "src-1", text: "Only one paragraph.", structure: [] });
    expect(short).toHaveLength(1);
    expect(short[0]).toMatchObject({ chunkIndex: 0, chunkCount: 1, start: 0, end: 19 });
  });

  it("digests are stable and differ for different input", () => {
    expect(stableDigest("abc")).toBe(stableDigest("abc"));
    expect(stableDigest("abc")).not.toBe(stableDigest("abd"));
    expect(stableDigest("")).toHaveLength(16);
  });
});
