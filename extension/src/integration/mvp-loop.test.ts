import { describe, expect, it } from "vitest";

import type { ReviewCandidate } from "../review/domain";
import { confirmCandidate } from "../review/state";
import { briefItemsFromReview, editBriefItem } from "../brief/state";
import { calendarEventsFromBrief } from "../calendar/query";
import { serializeCalendar } from "../calendar/ics";
import { reconcileScanAgain } from "../scan-again/reconcile";

function candidate(overrides: Partial<ReviewCandidate>): ReviewCandidate {
  return {
    candidateId: "assessment",
    courseId: "course",
    scanId: "scan-one",
    kind: "assessment",
    status: "Detected",
    semanticKey: "assessment:ca1",
    proposedValue: { identifier: "CA1", name: "Group Assignment" },
    evidenceRefs: [{ sourceId: "outline", locator: "item" }],
    createdAt: "2026-09-17T00:00:00.000Z",
    providerResponse: { provider: "deepseek", model: "deepseek-flash", requestId: "request" },
    ...overrides
  };
}

describe("MVP domain loop", () => {
  it("flows Review to nested Brief to Calendar and protects facts on Scan again", () => {
    const detected = [
      candidate({}),
      candidate({
        candidateId: "date",
        kind: "important_date",
        scope: "assessment",
        appliesToAssessmentKey: "assessment:ca1",
        semanticKey: "important_date:ca1-submission:2026-11-18:assessment:ca1",
        proposedValue: { title: "CA1 submission", date: "2026-11-18" }
      })
    ];
    const confirmed = confirmCandidate(
      confirmCandidate(detected, "assessment", new Date("2026-09-17T00:00:00Z")),
      "date",
      new Date("2026-09-17T00:00:00Z")
    );
    const brief = briefItemsFromReview("course", confirmed);
    expect(brief).toHaveLength(2);
    expect(brief.find((item) => item.kind === "important_date")?.parentBriefItemId).toBe(
      brief.find((item) => item.kind === "assessment")?.briefItemId
    );
    const events = calendarEventsFromBrief(brief);
    expect(serializeCalendar("course", events)).toContain("DTSTART;VALUE=DATE:20261118");

    const rescanned = detected.map((item) => ({
      ...item,
      candidateId: `again-${item.candidateId}`,
      scanId: "scan-two"
    }));
    expect(reconcileScanAgain(rescanned, brief, confirmed).candidates).toEqual([]);

    const assessment = brief.find((item) => item.kind === "assessment");
    if (!assessment) throw new Error("assessment fixture missing");
    const edited = editBriefItem(brief, assessment.briefItemId, { name: "My CA1" });
    expect(reconcileScanAgain(rescanned, edited, confirmed).candidates).toHaveLength(1);
    expect(
      edited.find((item) => item.briefItemId === assessment.briefItemId)?.currentValue
    ).toEqual({
      name: "My CA1"
    });
  });
});
