import { describe, expect, it } from "vitest";

import type { PendingChangeRecord } from "./domain";
import { canProposePossiblyRemoved, upsertLatestChange } from "./change-reducer";

function change(value: string, updatedAt: string): PendingChangeRecord {
  return {
    changeId: `change-${value}`,
    courseId: "course-1",
    workflowId: "workflow-1",
    targetId: "assessment-1",
    field: "deadline",
    changeType: "CHANGED",
    currentValue: { state: "KNOWN", value: "10 Oct" },
    latestValue: { state: "KNOWN", value },
    currentEvidenceIds: [],
    newEvidenceIds: [],
    createdAt: updatedAt,
    updatedAt
  };
}

describe("pending change reducer", () => {
  it("keeps Current vs Latest and histories the superseded pending value", () => {
    const result = upsertLatestChange(
      change("15 Oct", "2026-09-19T00:00:00.000Z"),
      change("18 Oct", "2026-09-20T00:00:00.000Z"),
      "2026-09-20T00:00:00.000Z"
    );
    expect(result.pending.currentValue?.value).toBe("10 Oct");
    expect(result.pending.latestValue?.value).toBe("18 Oct");
    expect(result.history?.value?.value).toBe("15 Oct");
  });

  it("requires successful complete coverage before removal can be proposed", () => {
    expect(
      canProposePossiblyRemoved({
        allRelevantSourcesFetched: true,
        allRelevantSourcesParsed: true,
        permissionDenied: false,
        partialCoverage: false,
        aiJudgment: "POSSIBLY_REMOVED"
      })
    ).toBe(true);
    expect(
      canProposePossiblyRemoved({
        allRelevantSourcesFetched: true,
        allRelevantSourcesParsed: true,
        permissionDenied: true,
        partialCoverage: false,
        aiJudgment: "POSSIBLY_REMOVED"
      })
    ).toBe(false);
  });
});
