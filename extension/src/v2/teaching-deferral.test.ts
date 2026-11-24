import { describe, expect, it } from "vitest";
import type { SourceRecord } from "./domain";
import { contentIndex } from "./content-index";
import {
  DEFERRAL_POLICY,
  DEFERRAL_PROMPT,
  DEFERRAL_SCHEMA,
  needsTeachingClassification,
  teachingInput,
  teachingCall,
  validateTeachingResult,
  reusableTeaching,
  teachingSourceView
} from "./teaching-deferral";
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("fixture missing");
  return value;
}
const sources = (): SourceRecord[] => [
  {
    sourceId: "parent",
    courseId: "course",
    nativeItemId: "parent",
    kind: "course-content-item",
    title: "Week",
    updatedAt: "now",
    parsed: { text: "Teaching resources.", structure: [] }
  },
  {
    sourceId: "deck",
    courseId: "course",
    nativeItemId: "deck",
    parentSourceId: "parent",
    kind: "attachment",
    title: "Lecture",
    updatedAt: "now",
    machine: {
      sourceId: "deck",
      contentHash: "hash",
      canonicalMetadataHash: "meta",
      structureHash: "structure",
      representationVersion: 1
    },
    parsed: {
      text: "Opening.\nSecret internal body\nMiddle body not sent\nEnding.",
      structure: ["slide:1", "slide:2", "slide:3"],
      units: [
        {
          locator: "slide:1",
          text: "Opening.\nSecret internal body",
          partial: true,
          visualGaps: ["image"]
        },
        { locator: "slide:2", text: "Middle body not sent", partial: true, visualGaps: ["chart"] },
        { locator: "slide:3", text: "Ending.", partial: false }
      ]
    }
  },
  {
    sourceId: "assignment",
    courseId: "course",
    nativeItemId: "assignment",
    kind: "assignment",
    title: "Lecture assignment",
    updatedAt: "now",
    parsed: { text: "Submit report.", structure: [] }
  },
  {
    sourceId: "announcement",
    courseId: "course",
    nativeItemId: "announcement",
    kind: "announcement",
    title: "Lecture",
    updatedAt: "now",
    parsed: { text: "Deadline.", structure: [] }
  }
];
function checkpoint(
  inventory: SourceRecord[],
  classification: "PROCESS" | "UNCERTAIN" | "TEACHING_MATERIAL_DEFERRED"
) {
  const source = inventory.find((s) => s.sourceId === "deck");
  const profile = teachingInput(inventory).profiles[0];
  if (!source || !profile) throw new Error("fixture missing");
  source.teaching = {
    workflowId: "wf",
    policyVersion: DEFERRAL_POLICY,
    schemaVersion: DEFERRAL_SCHEMA,
    promptVersion: DEFERRAL_PROMPT,
    profileFingerprint: profile.profileFingerprint,
    result: {
      sourceId: source.sourceId,
      classification,
      evidenceUsed: ["profile anchor"],
      rationale: "synthetic decision"
    }
  };
  return source;
}
describe("DA-005 Source deferral", () => {
  it("classifies attachments only, never via title or folder keyword", () => {
    const inventory = sources(),
      input = teachingInput(inventory);
    expect(input.profiles.map((p) => p.sourceId)).toEqual(["deck"]);
    expect(
      needsTeachingClassification({ ...required(inventory[2]), title: "Lecture Week slides" })
    ).toBe(false);
    const call = teachingCall(input, "probe");
    expect(call.task).toBe("teaching-classification");
    expect(call.visualParts).toBeUndefined();
    expect(call.user).not.toContain("Middle body not sent");
    expect(input.profiles[0]?.nativeUnits).toBe(3);
    expect(input.profiles[0]?.samples.map((s) => s.locator)).toEqual(["slide:1", "slide:3"]);
  });
  it("classifies exact native file types and suppresses a sample that would be the entire file", () => {
    const inventory = sources();
    const source = required(inventory[1]);
    source.kind = "file";
    source.parsed = {
      text: "One sentence.",
      structure: [],
      units: [{ locator: "page:1", text: "One sentence.", partial: false }]
    };
    const profile = teachingInput(inventory).profiles[0];
    expect(profile?.fullBodySuppressed).toBe(true);
    expect(teachingCall(teachingInput(inventory), "probe").user).not.toContain("One sentence.");
  });
  it("preserves complete local inventory, gaps, fingerprints and original parsed bytes after deferral", () => {
    const inventory = sources();
    const before = contentIndex(inventory);
    const source = checkpoint(inventory, "TEACHING_MATERIAL_DEFERRED");
    const parsed = JSON.stringify(source.parsed);
    expect(teachingSourceView(source, inventory)).toBeNull();
    expect(contentIndex(inventory)).toEqual(before);
    expect(JSON.stringify(source.parsed)).toBe(parsed);
    expect(source.parsed?.understanding).toBeUndefined();
    expect(reusableTeaching(source, inventory)).toBe(true);
    expect(reusableTeaching(source, inventory, "new-clean")).toBe(false);
  });
  it.each(["PROCESS", "UNCERTAIN"] as const)(
    "%s enters full native processing without unit shortlist",
    (decision) => {
      const inventory = sources(),
        source = checkpoint(inventory, decision);
      const view = teachingSourceView(source, inventory);
      expect(view?.processing.parsed).toEqual(source.parsed);
      expect(view?.selectedUnitRefs).toHaveLength(3);
    }
  );
  it.each(["content", "title", "hierarchy", "policy", "parent text"])(
    "invalidates checkpoint on %s changes",
    (change) => {
      const inventory = sources(),
        source = checkpoint(inventory, "TEACHING_MATERIAL_DEFERRED");
      if (change === "content")
        required(required(required(source.parsed).units)[1]).text += " new native text";
      if (change === "title") source.title = "Revised source";
      if (change === "hierarchy") source.parentSourceId = "announcement";
      if (change === "policy") required(source.teaching).policyVersion = "old";
      if (change === "parent text")
        required(required(inventory[0]).parsed).text = "Changed course context";
      expect(reusableTeaching(source, inventory)).toBe(false);
    }
  );
  it.each(["missing", "duplicate", "unknown", "enum", "evidence"])(
    "rejects %s classification without local semantic repair",
    (mistake) => {
      const inventory = sources(),
        source = checkpoint(inventory, "PROCESS");
      const rows: unknown[] = [structuredClone(required(source.teaching).result)];
      if (mistake === "missing") rows.pop();
      if (mistake === "duplicate") rows.push(rows[0]);
      if (mistake === "unknown")
        rows.push({ ...required(source.teaching).result, sourceId: "unknown" });
      if (mistake === "enum")
        rows[0] = { ...required(source.teaching).result, classification: "SKIP" };
      if (mistake === "evidence")
        rows[0] = { ...required(source.teaching).result, evidenceUsed: [] };
      expect(() =>
        validateTeachingResult({ schema: DEFERRAL_SCHEMA, sources: rows }, teachingInput(inventory))
      ).toThrow("DEFERRAL_CONTRACT");
    }
  );
});
