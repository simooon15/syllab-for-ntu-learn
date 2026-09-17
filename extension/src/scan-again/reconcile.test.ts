import { describe, expect, it } from "vitest";

import type { CandidateRecord } from "../ai/domain";
import type { BriefItem } from "../brief/domain";
import { reconcileScanAgain } from "./reconcile";

const candidate: CandidateRecord = {
  candidateId: "new",
  courseId: "course",
  scanId: "scan-new",
  kind: "important_date",
  scope: "assessment",
  appliesToAssessmentKey: "assessment:ca1",
  status: "Detected",
  semanticKey: "important_date:ca1-submission:2026-11-18:assessment:ca1",
  proposedValue: { title: "CA1 submission", date: "2026-11-18" },
  evidenceRefs: [{ sourceId: "new-source", locator: "page 2" }],
  createdAt: "2026-09-17T00:00:00.000Z",
  providerResponse: { provider: "deepseek", model: "deepseek-flash", requestId: "request" }
};

function brief(status: BriefItem["status"] = "Confirmed"): BriefItem {
  return {
    briefItemId: "brief",
    courseId: "course",
    kind: "important_date",
    scope: "assessment",
    parentBriefItemId: "parent",
    parentSemanticKey: "assessment:ca1",
    semanticKey: candidate.semanticKey,
    origin: "candidate",
    status,
    currentValue: structuredClone(candidate.proposedValue),
    fieldStates: {},
    sourceCandidateRefs: ["old"],
    evidenceRefs: [{ sourceId: "old-source", locator: "page 1" }],
    updatedAt: "2026-09-16T00:00:00.000Z"
  };
}

describe("scan again reconciliation", () => {
  it("links an identical confirmed fact without another Review card", () => {
    const result = reconcileScanAgain([candidate], [brief()], []);
    expect(result.candidates).toEqual([]);
    expect(result.linkedCount).toBe(1);
    expect(result.briefItems[0]?.sourceCandidateRefs).toContain("new");
    expect(result.briefItems[0]?.evidenceRefs).toContainEqual({
      sourceId: "new-source",
      locator: "page 2"
    });
  });

  it.each([
    [
      "changed value",
      { ...candidate, proposedValue: { ...candidate.proposedValue, date: "2026-11-19" } },
      brief()
    ],
    ["changed parent", { ...candidate, appliesToAssessmentKey: "assessment:ca2" }, brief()],
    ["edited fact", candidate, brief("EditedConfirmed")]
  ])("keeps %s in Review", (_label, incoming, existing) => {
    expect(reconcileScanAgain([incoming], [existing], []).candidates).toHaveLength(1);
  });

  it("does not suppress a previously ignored candidate", () => {
    expect(
      reconcileScanAgain([candidate], [], [{ ...candidate, candidateId: "old", status: "Ignored" }])
        .candidates
    ).toHaveLength(1);
  });
});
