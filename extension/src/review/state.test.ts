import { describe, expect, it } from "vitest";

import type { ReviewCandidate } from "./domain";
import {
  assignCandidateRelationship,
  confirmCandidate,
  confirmDetectedCategory,
  editAndConfirmCandidate,
  ignoreCandidate,
  reviewProgress,
  skipCandidate
} from "./state";

function candidate(
  id: string,
  kind: ReviewCandidate["kind"],
  status: ReviewCandidate["status"]
): ReviewCandidate {
  return {
    candidateId: id,
    courseId: "course_1",
    scanId: "scan_1",
    kind,
    status,
    semanticKey: `${kind}:${id}`,
    proposedValue: { title: `Original ${id}` },
    evidenceRefs: [{ sourceId: "source_1", locator: "page:1" }],
    createdAt: "2026-09-16T00:00:00.000Z",
    providerResponse: { provider: "deepseek", model: "deepseek-flash", requestId: "req_1" }
  };
}

describe("Review state", () => {
  it("edits a confirmed value without overwriting original candidate evidence", () => {
    const original = candidate("a", "assessment", "NeedsReview");
    const next = editAndConfirmCandidate([original], "a", { title: "Edited" });
    expect(next[0]).toMatchObject({
      status: "EditedConfirmed",
      confirmedValue: { title: "Edited" }
    });
    expect(next[0]?.proposedValue).toEqual({ title: "Original a" });
    expect(next[0]?.evidenceRefs).toEqual(original.evidenceRefs);
  });

  it("Confirm all affects only Detected candidates in one category", () => {
    const next = confirmDetectedCategory(
      [
        candidate("a", "assessment", "Detected"),
        candidate("b", "assessment", "NeedsReview"),
        candidate("c", "important_date", "Detected")
      ],
      "assessment"
    );
    expect(next.map((item) => item.status)).toEqual(["Confirmed", "NeedsReview", "Detected"]);
  });

  it("Skip is non-mutating while confirm and ignore advance progress", () => {
    const initial = [
      candidate("a", "important_rule", "Detected"),
      candidate("b", "important_date", "NeedsReview")
    ];
    expect(reviewProgress("scan_1", skipCandidate(initial))).toMatchObject({ reviewed: 0 });
    const handled = ignoreCandidate(confirmCandidate(initial, "a"), "b");
    expect(reviewProgress("scan_1", handled)).toMatchObject({ reviewed: 2, complete: true });
  });

  it("confirming an attached child does not confirm its parent", () => {
    const parent = candidate("parent", "assessment", "Detected");
    const child: ReviewCandidate = {
      ...candidate("child", "important_rule", "Detected"),
      scope: "assessment",
      appliesToAssessmentKey: "assessment:parent"
    };
    const next = confirmCandidate([parent, child], "child");
    expect(next.map((item) => item.status)).toEqual(["Detected", "Confirmed"]);
  });

  it("Confirm all important rules leaves parent Assessments untouched", () => {
    const parent = candidate("parent", "assessment", "Detected");
    const child: ReviewCandidate = {
      ...candidate("child", "important_rule", "Detected"),
      scope: "assessment",
      appliesToAssessmentKey: "assessment:parent"
    };
    const next = confirmDetectedCategory([parent, child], "important_rule");
    expect(next.map((item) => item.status)).toEqual(["Detected", "Confirmed"]);
  });

  it("reclassifies ambiguous ownership without confirming the fact", () => {
    const ambiguous = {
      ...candidate("child", "important_rule", "NeedsReview"),
      reviewReason:
        "The referenced parent Assessment was not found. Choose the correct Assessment before confirming."
    };
    const attached = assignCandidateRelationship(
      [ambiguous],
      "child",
      "assessment",
      "assessment:ca1"
    );
    expect(attached[0]).toMatchObject({
      status: "NeedsReview",
      scope: "assessment",
      appliesToAssessmentKey: "assessment:ca1"
    });
    expect(attached[0]).not.toHaveProperty("reviewReason");
    const courseLevel = assignCandidateRelationship(attached, "child", "course");
    expect(courseLevel[0]).toMatchObject({ status: "NeedsReview", scope: "course" });
    expect(courseLevel[0]).not.toHaveProperty("appliesToAssessmentKey");
  });
});
