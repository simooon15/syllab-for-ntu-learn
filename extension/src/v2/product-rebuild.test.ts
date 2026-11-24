import { expect, it } from "vitest";
import { prepareProductRebuild } from "./product-rebuild";
import type { CourseSnapshot } from "./course-state";
import { makeCourse } from "./testing";
import { emptyStaging } from "./staging";
import type { FactRecord } from "./schema";
const fact = (id: string, value: string): FactRecord => ({
  factId: id,
  courseId: "course",
  assessmentId: "a",
  field: "weight",
  value: { state: "KNOWN", value },
  evidenceRefs: [],
  marks: [],
  updatedAt: "old"
});
it("adopting a rebuilt candidate keeps saved values and independent requirements pending", () => {
  const course = { ...makeCourse(), courseId: "course" };
  const saved = { ...fact("weight", "35%"), userEdited: true };
  const snapshot: CourseSnapshot = {
    course,
    assessments: [
      {
        assessmentId: "a",
        courseId: "course",
        name: "Quiz",
        role: "assessment",
        kind: "quiz_test",
        createdBy: "ai",
        aliases: [],
        marks: [],
        createdAt: "old",
        updatedAt: "old"
      }
    ],
    constraints: [],
    facts: [saved],
    changes: [],
    reviewItems: [],
    history: []
  };
  const staged = {
    ...emptyStaging("course", "wf", "now"),
    assessments: snapshot.assessments,
    facts: [fact("weight", "45%"), { ...fact("risk", "Do not email"), field: "requirement" }],
    reviewItems: [
      {
        reviewItemId: "base",
        courseId: "course",
        workflowId: "wf",
        kind: "initial" as const,
        targetId: "a",
        payload: {
          productScope: true,
          ownerScope: true,
          scopeFactIds: ["weight"],
          scopeVersions: []
        },
        createdAt: "now",
        updatedAt: "now"
      },
      {
        reviewItemId: "risk",
        courseId: "course",
        workflowId: "wf",
        kind: "initial" as const,
        targetId: "a",
        payload: { productScope: true, scopeFactIds: ["risk"] },
        createdAt: "now",
        updatedAt: "now"
      }
    ]
  };
  const result = prepareProductRebuild(snapshot, staged, "now");
  expect(result.facts.find((f) => f.factId === "weight")).toEqual(saved);
  expect(result.changes[0]).toMatchObject({
    changeType: "CONFLICT",
    currentValue: { value: "35%" },
    latestValue: { value: "45%" },
    proposedFact: { value: { value: "45%" } }
  });
  expect(result.reviewItems.find((r) => r.reviewItemId === "base")?.payload.scopeFactIds).toEqual(
    []
  );
  expect(result.reviewItems.some((r) => r.reviewItemId === "risk")).toBe(true);
  expect(result.reviewItems.some((r) => r.kind === "change")).toBe(true);
});
it("an unmatched saved requirement retains its owner and requires an explicit scoped choice", () => {
  const course = { ...makeCourse(), courseId: "course" };
  const saved = { ...fact("saved", "Prepare a report"), field: "requirement", userEdited: true };
  const snapshot: CourseSnapshot = {
    course,
    assessments: [
      {
        assessmentId: "a",
        courseId: "course",
        name: "Saved task",
        role: "assessment",
        kind: "assignment",
        createdBy: "user",
        aliases: [],
        marks: [],
        createdAt: "old",
        updatedAt: "old"
      }
    ],
    constraints: [],
    facts: [saved],
    changes: [],
    reviewItems: [],
    history: []
  };
  const result = prepareProductRebuild(snapshot, emptyStaging("course", "wf", "now"), "now");
  expect(result.facts).toEqual([saved]);
  expect(result.assessments).toEqual(snapshot.assessments);
  expect(result.reviewItems[0]?.payload.scopeFactIds).toEqual(["saved"]);
  expect(result.changes).toEqual([]);
});

it("raises a separate rebuild conflict for changed Human conditions even when the value is unchanged", () => {
  const source = {
    ...fact("rule", "Submit"),
    field: "requirement",
    semanticClause: {
      clauseId: "c",
      content: "Submit",
      modality: "must",
      conditions: ["if assigned"],
      exceptions: ["unless waived"],
      applicability: "CURRENT" as const,
      judgmentBasis: "native"
    }
  };
  const saved = {
    ...source,
    userEdited: true,
    humanSemantics: { modality: "may", conditions: ["after approval"], exceptions: [] }
  };
  const snapshot: CourseSnapshot = {
    course: { ...makeCourse(), courseId: "course" },
    assessments: [],
    constraints: [],
    facts: [saved],
    changes: [],
    reviewItems: [],
    history: []
  };
  const staged = { ...emptyStaging("course", "wf", "now"), facts: [source] };
  const result = prepareProductRebuild(snapshot, staged, "now");
  expect(result.facts).toEqual([saved]);
  expect(result.changes).toHaveLength(1);
  expect(result.changes[0]?.proposedFact?.semanticClause).toEqual(source.semanticClause);
  expect(result.reviewItems[0]?.kind).toBe("change");
});
