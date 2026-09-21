import { describe, expect, it } from "vitest";

import { TASK_A_SCHEMA, TASK_C_SCHEMA, validateTaskA, validateTaskC } from "./ai-contracts";

describe("Task A/B/C deterministic contracts", () => {
  it("accepts PARTIALLY_UNDERSTOOD as a first-class Source result", () => {
    expect(
      validateTaskA(
        {
          schema: TASK_A_SCHEMA,
          sourceId: "source-1",
          sourceResult: "PARTIALLY_UNDERSTOOD",
          assessmentDrafts: [],
          courseWideConstraintCandidates: [],
          unresolvedIssues: [{ issue: "visual table is unclear" }]
        },
        new Set(["source-1"])
      ).sourceResult
    ).toBe("PARTIALLY_UNDERSTOOD");
  });

  it("rejects Possibly Removed when deterministic coverage is insufficient", () => {
    expect(() =>
      validateTaskC(
        {
          schema: TASK_C_SCHEMA,
          changeResults: [
            {
              changeType: "POSSIBLY_REMOVED",
              targetObjectId: "assessment-1",
              currentEvidence: [],
              newEvidence: [],
              judgmentBasis: "not found"
            }
          ],
          unresolvedIssues: []
        },
        new Set(),
        false
      )
    ).toThrow("removal_without_coverage");
  });
});
