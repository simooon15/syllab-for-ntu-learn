import { describe, expect, it } from "vitest";

import type { ReviewCandidate } from "./domain";
import { candidateRelationshipLabel } from "./relationship";

function candidate(
  candidateId: string,
  kind: ReviewCandidate["kind"],
  proposedValue: Record<string, unknown>
): ReviewCandidate {
  return {
    candidateId,
    courseId: "course_1",
    scanId: "scan_1",
    kind,
    status: "Detected",
    semanticKey: kind === "assessment" ? "assessment:ca1" : `${kind}:${candidateId}`,
    proposedValue,
    evidenceRefs: [{ sourceId: "source_1", locator: "page:1" }],
    createdAt: "2026-09-16T00:00:00.000Z",
    providerResponse: { provider: "deepseek", model: "deepseek-flash", requestId: "req_1" }
  };
}

describe("Review relationship context", () => {
  it("labels an assessment-specific child without nesting Review", () => {
    const parent = candidate("parent", "assessment", { identifier: "CA1", name: "Group work" });
    const child: ReviewCandidate = {
      ...candidate("child", "important_rule", { rule: "Maximum 8 slides" }),
      scope: "assessment",
      appliesToAssessmentKey: "assessment:ca1"
    };
    expect(candidateRelationshipLabel(child, [parent, child])).toBe("Applies to CA1");
  });

  it("labels a course-level rule explicitly", () => {
    const rule: ReviewCandidate = {
      ...candidate("rule", "important_rule", { rule: "General attendance policy" }),
      scope: "course"
    };
    expect(candidateRelationshipLabel(rule, [rule])).toBe("Course-level");
  });
});
