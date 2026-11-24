import { it, expect } from "vitest";
import { directNativeBatches, remapDirectNativeEvidence } from "./direct-native-batches";
import type { SourceRecord } from "./schema";
const make = (id: string, text: string): SourceRecord => ({
  sourceId: id,
  courseId: "c",
  nativeItemId: id,
  title: "Synthetic",
  kind: "attachment",
  updatedAt: "now",
  parsed: { text, structure: [] }
});
it("packs every intact Source once and resolves subset references to their exact full-source passages", () => {
  const sources = [make("a", "Synthetic first text"), make("b", "Synthetic second text")];
  const batches = directNativeBatches(sources, 1);
  expect(batches.flat()).toEqual(sources);
  expect(batches).toHaveLength(2);
  expect(
    remapDirectNativeEvidence({ evidence: ["n1.1.1"] }, [sources[1] as SourceRecord], sources)
  ).toEqual({ evidence: [{ refId: "n2.1.1" }] });
  expect(() =>
    remapDirectNativeEvidence({ evidence: ["n9.1.1"] }, [sources[1] as SourceRecord], sources)
  ).toThrow("DIRECT_REF_UNKNOWN");
  expect(() =>
    remapDirectNativeEvidence(
      { evidence: [{ refId: "n1.1.1" }] },
      [make("b", "Changed text")],
      sources
    )
  ).toThrow("REMAP_MISSING");
});
