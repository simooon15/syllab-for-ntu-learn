import { describe, expect, it } from "vitest";
import type { SourceRecord } from "./domain";
import { TASK_A_SCHEMA } from "./ai-contracts";
import { validateTaskAVisualRequests } from "./ai-contracts";
import {
  contentIndex,
  routingInput,
  validateExhaustiveRouting,
  routingSourceView,
  routingSelectedRefs,
  reusableRouting,
  exhaustiveRoutingCall,
  ROUTING_POLICY,
  ROUTING_SCHEMA,
  ROUTING_PROMPT
} from "./exhaustive-routing";
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("fixture missing");
  return value;
}
const sources = (): SourceRecord[] => [
  {
    sourceId: "deck",
    courseId: "course",
    nativeItemId: "deck",
    kind: "attachment",
    title: "Lecture",
    updatedAt: "now",
    parsed: {
      text: "Anchor.\nSelected body\nOther.\nExcluded body",
      structure: ["page:1", "page:2"],
      units: [
        { locator: "page:1", text: "Anchor.\nSelected body", partial: true, visualGaps: ["image"] },
        { locator: "page:2", text: "Other.\nExcluded body", partial: true, visualGaps: ["chart"] }
      ]
    }
  },
  {
    sourceId: "announcement",
    courseId: "course",
    nativeItemId: "announcement",
    kind: "announcement",
    title: "Update",
    updatedAt: "now",
    parsed: { text: "Notice.\nFull announcement", structure: [] }
  }
];
describe("DA-003 exhaustive routing", () => {
  it("addresses all natural units and unitless Sources, without directory entries or full body", () => {
    const input = routingInput(contentIndex(sources()));
    expect(input.entryRefs).toHaveLength(3);
    expect(input.entryRefs).not.toContain(input.index.sources[0]?.ref);
    const call = exhaustiveRoutingCall(input, "probe");
    expect(call.task).toBe("exhaustive-routing");
    expect(call.user).not.toContain("Selected body");
    expect(call.user).not.toContain("Excluded body");
    expect(call.user).not.toContain("Full announcement");
  });
  it.each(["missing", "unknown", "duplicate", "conflict", "invalid"])(
    "rejects %s without local repairs",
    (caseName) => {
      const input = routingInput(contentIndex(sources()));
      const decisions: unknown[][] = input.entryRefs.map((ref) => [ref, "EXPAND"]);
      if (caseName === "missing") decisions.pop();
      if (caseName === "unknown") decisions.push(["unknown", "EXPAND"]);
      if (caseName === "duplicate") decisions.push([input.entryRefs[0], "EXPAND"]);
      if (caseName === "conflict") decisions.push([input.entryRefs[0], "SKIP"]);
      if (caseName === "invalid") decisions[0] = [input.entryRefs[0], "COMPLETE"];
      expect(() => validateExhaustiveRouting({ schema: ROUTING_SCHEMA, decisions }, input)).toThrow(
        "ROUTING_CONTRACT"
      );
    }
  );
  it("expands UNCERTAIN, groups by Source and excludes SKIP bodies without mutating native evidence", () => {
    const native = sources(),
      index = contentIndex(native),
      input = routingInput(index);
    const result = validateExhaustiveRouting(
      {
        schema: ROUTING_SCHEMA,
        decisions: input.entryRefs.map((ref) => [
          ref,
          ref === index.units[1]?.[0] ? "SKIP" : "UNCERTAIN"
        ])
      },
      input
    );
    expect(routingSelectedRefs(result)).toHaveLength(2);
    const view = routingSourceView(required(native[0]), index, result);
    expect(view?.processing.parsed?.units).toHaveLength(1);
    expect(view?.processing.parsed?.text).toContain("Selected body");
    expect(view?.processing.parsed?.text).not.toContain("Excluded body");
    expect(native[0]?.parsed?.units).toHaveLength(2);
  });
  it("reuses only complete current-version checkpoints and isolates a clean workflow", () => {
    const native = sources(),
      index = contentIndex(native),
      input = routingInput(index);
    for (const source of native) {
      const row = required(index.sources.find((s) => s.sourceId === source.sourceId));
      const ownRefs = row.unitCount
        ? index.units.filter((u) => u[1] === row.ref).map((u) => u[0])
        : [row.ref];
      source.routing = {
        workflowId: "old",
        indexFingerprint: index.fingerprint,
        policyVersion: ROUTING_POLICY,
        representationVersion: index.policy,
        schemaVersion: ROUTING_SCHEMA,
        promptVersion: ROUTING_PROMPT,
        decisions: ownRefs.map((ref) => [ref, "EXPAND"])
      };
    }
    expect(reusableRouting(index, native)?.decisions).toHaveLength(input.entryRefs.length);
    expect(reusableRouting(index, native, "clean")).toBeNull();
    required(required(native[0]).routing).policyVersion = "legacy";
    expect(reusableRouting(index, native)).toBeNull();
  });
  it("rejects unknown, unselected/resolved and duplicate visual requests; gaps alone request nothing", () => {
    const result = {
      sourceId: "deck",
      sourceResult: "RELEVANT_INFORMATION_FOUND" as const,
      schema: TASK_A_SCHEMA,
      assessmentDrafts: [],
      courseWideConstraintCandidates: [],
      unresolvedIssues: []
    };
    expect(() => validateTaskAVisualRequests(result, new Set(["selected-partial"]))).not.toThrow();
    for (const refs of [["unknown"], ["selected-partial", "selected-partial"]])
      expect(() =>
        validateTaskAVisualRequests(
          { ...result, visualRequestRefs: refs },
          new Set(["selected-partial"])
        )
      ).toThrow("AI_CONTRACT");
  });
});
