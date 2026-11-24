import { expect, it } from "vitest";
import { archiveCourseDraft, isCourseDraftArchive } from "./course-draft-archive";
import type { CourseDraft } from "./selective-course";
export const archivedDraft = (): CourseDraft => ({
  schema: "syllab.ai.course-draft/1",
  clauses: [
    {
      clauseId: "c",
      sourceId: "s",
      kind: "requirement",
      content: "Submit A OR B unless approved.",
      value: { state: "KNOWN", value: "Submit A OR B unless approved." },
      modality: "must",
      conditions: ["if assigned"],
      exceptions: ["unless approved"],
      applicability: "CURRENT",
      context: "Authored task",
      evidence: [
        {
          evidenceId: "e",
          sourceId: "s",
          locator: "page1",
          excerpt: "Submit A OR B unless approved."
        }
      ]
    }
  ],
  retiredClauses: [],
  entities: [],
  links: [],
  identities: [],
  inspections: [],
  deepLocators: {},
  productVerification: "not-a-restorable-certificate",
  projectionVerification: "old",
  projectionContextVerification: "old"
});
it("conserves original clauses and competing branches while removing only execution certificates", () => {
  const original = archivedDraft();
  const saved = archiveCourseDraft(original, "wf", "now");
  expect(saved.draft.clauses).toEqual(original.clauses);
  expect(saved.draft.productVerification).toBeUndefined();
  expect(original.productVerification).toBe("not-a-restorable-certificate");
  expect(isCourseDraftArchive(saved)).toBe(true);
  expect(
    isCourseDraftArchive({ ...saved, draft: { ...saved.draft, productVerification: "promoted" } })
  ).toBe(false);
});
