import { describe, expect, it } from "vitest";

import type { ReviewCandidate } from "../review/domain";
import { addUserBriefItem, briefItemsFromReview, editBriefItem, resolveBriefField } from "./state";

function candidate(
  status: ReviewCandidate["status"],
  overrides: Partial<ReviewCandidate> = {}
): ReviewCandidate {
  return {
    candidateId: "candidate_1",
    courseId: "course_1",
    scanId: "scan_1",
    kind: "assessment",
    status,
    semanticKey: "assessment:final",
    proposedValue: { title: "Final", dueDate: "2026-09-12" },
    evidenceRefs: [{ sourceId: "source_1", locator: "page:2" }],
    createdAt: "2026-09-16T00:00:00.000Z",
    providerResponse: { provider: "deepseek", model: "deepseek-flash", requestId: "req_1" },
    ...overrides
  };
}

describe("Course Brief fact state", () => {
  it("only consumes confirmed Review candidates", () => {
    expect(briefItemsFromReview("course_1", [candidate("Detected")])).toEqual([]);
    const items = briefItemsFromReview("course_1", [candidate("Confirmed")]);
    expect(items[0]).toMatchObject({
      origin: "candidate",
      status: "Confirmed",
      currentValue: { title: "Final", dueDate: "2026-09-12" }
    });
  });

  it("supports a confirmed subject with one Unresolved field and preserves evidence", () => {
    const items = briefItemsFromReview(
      "course_1",
      [candidate("Confirmed")],
      { candidate_1: { dueDate: ["2026-09-12", "2026-09-19"] } },
      new Date("2026-09-16T00:00:00.000Z")
    );
    expect(items[0]?.currentValue).toEqual({ title: "Final" });
    expect(items[0]?.fieldStates.dueDate).toMatchObject({ status: "Unresolved" });
    const briefItemId = items[0]?.briefItemId;
    if (!briefItemId) throw new Error("Brief fixture was not created");
    const resolved = resolveBriefField(items, briefItemId, "dueDate", "2026-09-19");
    expect(resolved[0]?.currentValue).toEqual({ title: "Final", dueDate: "2026-09-19" });
    expect(resolved[0]?.evidenceRefs).toEqual(items[0]?.evidenceRefs);
  });

  it("projects detected field conflicts into Brief after the subject is confirmed", () => {
    const items = briefItemsFromReview("course_1", [
      candidate("Confirmed", { unresolvedFields: { dueDate: ["2026-09-12", "2026-09-19"] } })
    ]);
    expect(items[0]?.currentValue).toEqual({ title: "Final" });
    expect(items[0]?.fieldStates.dueDate).toMatchObject({
      status: "Unresolved",
      candidateValues: ["2026-09-12", "2026-09-19"]
    });
  });

  it("keeps user-added facts distinct from AI candidates", () => {
    const items = addUserBriefItem([], "course_1", "important_rule", { rule: "Bring calculator" });
    expect(items[0]).toMatchObject({
      origin: "user_added",
      status: "UserAddedConfirmed",
      sourceCandidateRefs: [],
      evidenceRefs: []
    });
  });

  it("edits only current Brief value and preserves source evidence", () => {
    const items = briefItemsFromReview("course_1", [candidate("Confirmed")]);
    const item = items[0];
    if (!item) throw new Error("Brief fixture was not created");
    const edited = editBriefItem(items, item.briefItemId, { title: "Edited final" });
    expect(edited[0]).toMatchObject({
      status: "EditedConfirmed",
      currentValue: { title: "Edited final" },
      evidenceRefs: item.evidenceRefs,
      sourceCandidateRefs: item.sourceCandidateRefs
    });
  });

  it("projects an attached child under a confirmed parent exactly once", () => {
    const parent = candidate("Confirmed", {
      candidateId: "parent",
      semanticKey: "assessment:ca1",
      proposedValue: { identifier: "CA1", name: "Group Assignment" }
    });
    const child = candidate("Confirmed", {
      candidateId: "child",
      kind: "important_rule",
      semanticKey: "important_rule:maximum 8 slides:assessment:ca1",
      scope: "assessment",
      appliesToAssessmentKey: "assessment:ca1",
      proposedValue: { rule: "Maximum 8 slides" }
    });
    const items = briefItemsFromReview("course_1", [parent, child]);
    const parentItem = items.find((item) => item.kind === "assessment");
    const childItem = items.find((item) => item.kind === "important_rule");

    expect(items).toHaveLength(2);
    expect(childItem?.parentBriefItemId).toBe(parentItem?.briefItemId);
    expect(items.filter((item) => !item.parentBriefItemId)).toHaveLength(1);
  });

  it("preserves child confirmation without creating or projecting an unconfirmed parent", () => {
    const parent = candidate("Detected", {
      candidateId: "parent",
      semanticKey: "assessment:ca1"
    });
    const child = candidate("Confirmed", {
      candidateId: "child",
      kind: "important_rule",
      scope: "assessment",
      appliesToAssessmentKey: "assessment:ca1"
    });

    expect(briefItemsFromReview("course_1", [parent, child])).toEqual([]);
    expect(child.status).toBe("Confirmed");
  });

  it("does not silently reclassify a child whose parent was ignored", () => {
    const parent = candidate("Ignored", {
      candidateId: "parent",
      semanticKey: "assessment:ca1"
    });
    const child = candidate("Confirmed", {
      candidateId: "child",
      kind: "important_rule",
      scope: "assessment",
      appliesToAssessmentKey: "assessment:ca1"
    });

    expect(briefItemsFromReview("course_1", [parent, child])).toEqual([]);
    expect(child.scope).toBe("assessment");
  });

  it("projects a newly confirmed child under an Assessment retained from an earlier scan", () => {
    const existingParent = briefItemsFromReview("course_1", [
      candidate("Confirmed", {
        candidateId: "old-parent",
        semanticKey: "assessment:part-2",
        proposedValue: { name: "Part 2: Multiple Choice Quiz" }
      })
    ])[0];
    if (!existingParent) throw new Error("Existing parent fixture was not created");
    const child = candidate("Confirmed", {
      candidateId: "new-child",
      kind: "important_date",
      semanticKey: "important_date:part-2-quiz:assessment:part-2",
      scope: "assessment",
      appliesToAssessmentKey: "assessment:part-2",
      proposedValue: { label: "Part 2 Multiple Choice Quiz", date: "2026-11-14" }
    });

    const items = briefItemsFromReview("course_1", [child], {}, new Date(), [existingParent]);

    expect(items).toHaveLength(1);
    expect(items[0]?.parentBriefItemId).toBe(existingParent.briefItemId);
  });

  it("uses one unambiguous Assessment alias when an earlier Brief has a more specific key", () => {
    const existingParent = briefItemsFromReview("course_1", [
      candidate("Confirmed", {
        candidateId: "old-parent",
        semanticKey: "assessment:part-1-group-presentation-project-management-plan-presentation",
        proposedValue: {
          name: "Part 1: Group Presentation (Project Management Plan Presentation)"
        }
      })
    ])[0];
    if (!existingParent) throw new Error("Existing parent fixture was not created");
    const child = candidate("Confirmed", {
      candidateId: "new-child",
      kind: "important_date",
      semanticKey: "important_date:presentation-submission:assessment:part-1-group-presentation",
      scope: "assessment",
      appliesToAssessmentKey: "assessment:part-1-group-presentation",
      proposedValue: { label: "Presentation Submission", date: "2026-10-21" }
    });

    const items = briefItemsFromReview("course_1", [child], {}, new Date(), [existingParent]);

    expect(items[0]?.parentBriefItemId).toBe(existingParent.briefItemId);
  });

  it("does not guess when an Assessment alias matches more than one existing parent", () => {
    const parents = [
      "assessment:part-1-group-presentation",
      "assessment:part-2-group-presentation"
    ].map(
      (semanticKey, index) =>
        briefItemsFromReview("course_1", [
          candidate("Confirmed", {
            candidateId: `parent-${String(index)}`,
            semanticKey,
            proposedValue: { name: `Group Presentation ${String(index + 1)}` }
          })
        ])[0]
    );
    const child = candidate("Confirmed", {
      candidateId: "new-child",
      kind: "important_rule",
      scope: "assessment",
      appliesToAssessmentKey: "assessment:group-presentation"
    });

    expect(
      briefItemsFromReview(
        "course_1",
        [child],
        {},
        new Date(),
        parents.filter((item): item is NonNullable<typeof item> => Boolean(item))
      )
    ).toEqual([]);
  });
});
