import { describe, expect, it } from "vitest";

import type { RawSourceUnit } from "./domain";
import { createNormalizedBatches, normalizeEvidenceText, normalizeSourceUnits } from "./normalizer";

const base: Omit<RawSourceUnit, "sourceId" | "locator" | "text"> = {
  courseId: "course_1",
  scanId: "scan_1",
  sourceType: "attachment",
  title: "Course guide",
  path: ["Course content", "Week 1"]
};

describe("source normalization", () => {
  it("removes layout noise without rewriting dates or evidence wording", () => {
    expect(normalizeEvidenceText("  Due\t  12 Sep 2026\r\n\r\n\r\nKeep   wording  ")).toBe(
      "Due 12 Sep 2026\n\nKeep wording"
    );
  });

  it("converts stored Blackboard markup to text while keeping the wording", () => {
    expect(normalizeEvidenceText("<p>Bring&nbsp;calculator</p><p>Week 7</p>")).toBe(
      "Bring calculator\nWeek 7"
    );
  });

  it("keeps duplicate evidence units while marking their shared content hash", async () => {
    const units = await normalizeSourceUnits([
      { ...base, sourceId: "source:a", locator: "page:1", text: "Same fact" },
      { ...base, sourceId: "source:b", locator: "slide:2", text: " Same  fact " }
    ]);
    expect(units[0]?.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(units[1]?.contentHash).toBe(units[0]?.contentHash);
    expect(units[1]?.duplicateOfUnitId).toBe("source:a:page:1");
    expect(units).toHaveLength(2);
  });

  it("batches on source boundaries and character limits", async () => {
    const units = await normalizeSourceUnits([
      { ...base, sourceId: "source:a", locator: "page:1", text: "1234" },
      { ...base, sourceId: "source:a", locator: "page:2", text: "5678" },
      { ...base, sourceId: "source:b", locator: "item", text: "90" }
    ]);
    const batches = createNormalizedBatches(units, 6);
    expect(batches.map((batch) => batch.units.map((unit) => unit.locator))).toEqual([
      ["page:1"],
      ["page:2"],
      ["item"]
    ]);
  });

  it("rejects a unit that would require cutting through its evidence locator", async () => {
    const units = await normalizeSourceUnits([
      { ...base, sourceId: "source:a", locator: "page:1", text: "too long" }
    ]);
    expect(() => createNormalizedBatches(units, 4)).toThrow("NORMALIZED_UNIT_TOO_LARGE");
  });
});
