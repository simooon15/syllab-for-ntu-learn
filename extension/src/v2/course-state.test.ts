import { describe, expect, it } from "vitest";

import type {
  AssessmentRecord,
  ChangeRecord,
  CourseSnapshot,
  FactRecord,
  ReviewItemRecord
} from "./testing";
import { makeCourse, makeSnapshot } from "./testing";
import {
  acceptChange,
  factsForReview,
  constraintForReview,
  applyInitialReviewDecision,
  editFact,
  keepCurrent,
  keepPossiblyRemoved,
  manualAddAssessment,
  mergeAssessment,
  removeAssessment,
  renameAssessment,
  replaceCourseState,
  resolveConflict,
  resolveIdentity,
  resolveReappearance,
  splitAssessment,
  StateGuardError
} from "./course-state";

const now = "2026-09-19T00:00:00.000Z";

function assessment(overrides: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    assessmentId: "assessment-1",
    courseId: "course-1",
    role: "assessment",
    kind: "project",
    name: "Group Project",
    aliases: [],
    marks: [],
    createdBy: "ai",
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

function fact(overrides: Partial<FactRecord> = {}): FactRecord {
  return {
    factId: "fact-1",
    courseId: "course-1",
    assessmentId: "assessment-1",
    field: "deadline",
    value: { state: "KNOWN", value: "10 Oct" },
    evidenceRefs: [],
    marks: [],
    updatedAt: now,
    ...overrides
  };
}

function reviewItem(overrides: Partial<ReviewItemRecord> = {}): ReviewItemRecord {
  return {
    reviewItemId: "review-1",
    courseId: "course-1",
    workflowId: "workflow-1",
    kind: "initial",
    targetId: "assessment-1",
    payload: {},
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
}

/**
 * `exactOptionalPropertyTypes` is on, so a test that wants "no latest value" omits the key
 * rather than passing undefined.
 */
type ChangeOverrides = Omit<Partial<ChangeRecord>, "latestValue" | "currentValue" | "field"> & {
  latestValue?: ChangeRecord["latestValue"] | undefined;
  currentValue?: ChangeRecord["currentValue"] | undefined;
  field?: string | undefined;
};

function change(overrides: ChangeOverrides = {}): ChangeRecord {
  const base: ChangeRecord = {
    changeId: "change-1",
    courseId: "course-1",
    workflowId: "workflow-1",
    targetId: "assessment-1",
    field: "deadline",
    changeType: "CHANGED",
    currentValue: { state: "KNOWN", value: "10 Oct" },
    latestValue: { state: "KNOWN", value: "18 Oct" },
    currentEvidenceIds: ["ev-current"],
    newEvidenceIds: ["ev-new"],
    createdAt: now,
    updatedAt: now
  };
  return Object.fromEntries([
    ...Object.entries(base).filter(([key]) => !(key in overrides)),
    ...Object.entries(overrides).filter(([, value]) => value !== undefined)
  ]) as ChangeRecord;
}

it("confirms one new object with all its source fact proposals once, without leaving phantom NEW cards", () => {
  const facts = [
    fact(),
    fact({
      factId: "independent-rule",
      field: "requirement",
      value: { state: "KNOWN", value: "If assigned, submit a separate checklist" }
    })
  ];
  const newWeight = change({ changeType: "NEW", changeId: "new-weight" }),
    newRule = change({ changeType: "NEW", changeId: "new-rule", field: "requirement" }),
    other = change({ targetId: "other-assessment", changeId: "other-change" });
  const snapshot = makeSnapshot({
    assessments: [assessment()],
    facts,
    changes: [newWeight, newRule, other],
    reviewItems: [reviewItem({ reviewItemId: "new-weight", kind: "change", changeType: "NEW" })]
  });
  const result = acceptChange(snapshot, {
    changeId: "new-weight",
    expectedRevision: snapshot.course.currentRevision,
    now
  });
  expect(result.snapshot.changes.map((c) => c.changeId)).toEqual(["other-change"]);
  expect(result.snapshot.facts).toEqual(facts);
  expect(result.snapshot.reviewItems).toHaveLength(0);
  expect(result.decisions).toHaveLength(1);
});

it("confirming additions to an existing owner preserves Current and stores every new fact", () => {
  const current = fact({ value: { state: "KNOWN", value: "41%" }, userEdited: true });
  const proposal = {
    ...current,
    value: { state: "KNOWN" as const, value: "45%" },
    userEdited: false
  };
  const addition = fact({
    factId: "new-independent",
    field: "requirement",
    value: { state: "KNOWN", value: "No title registration is required" }
  });
  const state = makeSnapshot({
    assessments: [assessment()],
    facts: [current],
    reviewItems: [reviewItem({ changeType: "NEW" })]
  });
  const result = applyInitialReviewDecision(state, {
    reviewItemId: state.reviewItems[0]?.reviewItemId ?? "",
    kind: "Confirm",
    assessment: assessment(),
    facts: factsForReview([current], [proposal, addition], "NEW"),
    expectedRevision: state.course.currentRevision,
    now
  });
  expect(result.snapshot.facts.find((f) => f.factId === current.factId)?.value).toEqual(
    current.value
  );
  expect(result.snapshot.facts.find((f) => f.factId === current.factId)?.userEdited).toBe(true);
  expect(result.snapshot.facts.find((f) => f.factId === addition.factId)?.value).toEqual(
    addition.value
  );
});

function snapshot(overrides: Partial<CourseSnapshot> = {}): CourseSnapshot {
  return makeSnapshot(overrides);
}

describe("course state protection", () => {
  it("rejects a decision whose revision is stale", () => {
    const state = snapshot({ course: { ...makeCourse(), currentRevision: 4 } });
    expect(() => acceptChange(state, { changeId: "change-1", expectedRevision: 3, now })).toThrow(
      StateGuardError
    );
  });

  it("moves the revision exactly once per accepted decision", () => {
    const state = snapshot({
      course: { ...makeCourse(), currentRevision: 1 },
      assessments: [assessment()],
      facts: [fact()],
      changes: [change()]
    });
    const result = acceptChange(state, { changeId: "change-1", expectedRevision: 1, now });
    expect(result.snapshot.course.currentRevision).toBe(2);
    expect(result.history).toHaveLength(1);
    expect(result.history[0]?.revision).toBe(2);
  });
});

describe("initial review", () => {
  it("puts a confirmed assessment into Current State immediately", () => {
    const state = snapshot({
      reviewItems: [reviewItem({ payload: { assessment: assessment(), facts: [fact()] } })]
    });
    const result = applyInitialReviewDecision(state, {
      reviewItemId: "review-1",
      kind: "Confirm",
      expectedRevision: 0,
      now
    });
    expect(result.snapshot.assessments).toHaveLength(1);
    expect(result.snapshot.facts).toHaveLength(1);
    expect(result.snapshot.reviewItems).toHaveLength(0);
    expect(result.snapshot.course.established).toBe(true);
  });

  it("marks an edited confirm as Edited on the fact", () => {
    const state = snapshot({
      reviewItems: [reviewItem({ payload: { assessment: assessment(), facts: [fact()] } })]
    });
    const result = applyInitialReviewDecision(state, {
      reviewItemId: "review-1",
      kind: "Edit",
      expectedRevision: 0,
      now,
      facts: [fact({ value: { state: "KNOWN", value: "20 Oct" } })]
    });
    expect(result.snapshot.facts[0]?.marks).toContain("Edited");
    expect(result.snapshot.facts[0]?.userEdited).toBe(true);
  });

  it("excludes without creating any Current State object", () => {
    const state = snapshot({
      reviewItems: [reviewItem({ payload: { proposalKey: "proposal-a" } })]
    });
    const result = applyInitialReviewDecision(state, {
      reviewItemId: "review-1",
      kind: "Exclude",
      expectedRevision: 0,
      now
    });
    expect(result.snapshot.assessments).toHaveLength(0);
    expect(result.decisions[0]?.kind).toBe("Exclude");
    expect(result.snapshot.history[0]?.event).toBe("ASSESSMENT_EXCLUDED");
  });

  it("defers by leaving the item pending and moving no revision", () => {
    const state = snapshot({ reviewItems: [reviewItem()] });
    const result = applyInitialReviewDecision(state, {
      reviewItemId: "review-1",
      kind: "Defer",
      expectedRevision: 0,
      now
    });
    expect(result.snapshot).toBe(state);
    expect(result.snapshot.reviewItems).toHaveLength(1);
    expect(result.decisions[0]?.kind).toBe("Defer");
  });

  it("refuses a fact that belongs to another course", () => {
    const state = snapshot({ reviewItems: [reviewItem()] });
    expect(() =>
      applyInitialReviewDecision(state, {
        reviewItemId: "review-1",
        kind: "Confirm",
        expectedRevision: 0,
        now,
        assessment: assessment(),
        facts: [fact({ courseId: "course-2" })]
      })
    ).toThrow(StateGuardError);
  });
});

describe("structural correction", () => {
  it("merges a draft onto a canonical assessment and keeps both aliases", () => {
    const state = snapshot({
      assessments: [
        assessment(),
        assessment({
          assessmentId: "assessment-2",
          name: "Final Group Project",
          role: "assessment"
        })
      ],
      facts: [fact({ factId: "fact-2", assessmentId: "assessment-2", field: "weight" })]
    });
    const result = mergeAssessment(state, {
      reviewItemId: "review-1",
      sourceAssessmentId: "assessment-2",
      targetAssessmentId: "assessment-1",
      expectedRevision: 0,
      now
    });
    const merged = result.snapshot.assessments.find((item) => item.assessmentId === "assessment-1");
    expect(merged?.aliases).toContain("Final Group Project");
    expect(
      result.snapshot.assessments.find((item) => item.assessmentId === "assessment-2")?.supersededBy
    ).toBe("assessment-1");
    expect(result.snapshot.facts.find((item) => item.factId === "fact-2")?.assessmentId).toBe(
      "assessment-1"
    );
  });

  it("splits one assessment into separate canonical identities", () => {
    const state = snapshot({
      assessments: [assessment()],
      facts: [fact(), fact({ factId: "fact-2", field: "weight" })]
    });
    const result = splitAssessment(state, {
      reviewItemId: "review-1",
      sourceAssessmentId: "assessment-1",
      parts: [
        { assessmentId: "assessment-a", name: "Written Report", factIds: ["fact-1"] },
        { assessmentId: "assessment-b", name: "Presentation", factIds: ["fact-2"] }
      ],
      expectedRevision: 0,
      now
    });
    expect(result.snapshot.assessments.filter((item) => !item.supersededBy)).toHaveLength(2);
    expect(result.snapshot.facts.find((item) => item.factId === "fact-2")?.assessmentId).toBe(
      "assessment-b"
    );
  });

  it("adds a manual assessment into the same model without a User-added marker", () => {
    const state = snapshot();
    const result = manualAddAssessment(state, {
      assessment: assessment({ assessmentId: "assessment-manual", name: "Oral Exam" }),
      facts: [fact({ factId: "fact-manual", assessmentId: "assessment-manual" })],
      expectedRevision: 0,
      now
    });
    expect(result.snapshot.assessments[0]?.marks).toEqual([]);
    expect(result.snapshot.assessments[0]?.createdBy).toBe("user");
  });
});

describe("change review", () => {
  it("applies an accepted change and marks the fact Changed", () => {
    const state = snapshot({ assessments: [assessment()], facts: [fact()], changes: [change()] });
    const result = acceptChange(state, { changeId: "change-1", expectedRevision: 0, now });
    const updated = result.snapshot.facts[0];
    expect(updated?.value.value).toBe("18 Oct");
    expect(updated?.marks).toContain("Changed");
    expect(result.snapshot.changes).toHaveLength(0);
  });

  it("keeps the current value and records the discrepancy without permanent suppression", () => {
    const state = snapshot({ assessments: [assessment()], facts: [fact()], changes: [change()] });
    const result = keepCurrent(state, { changeId: "change-1", expectedRevision: 0, now });
    expect(result.snapshot.facts[0]?.value.value).toBe("10 Oct");
    expect(result.decisions[0]?.kind).toBe("KeepCurrent");
    expect(result.decisions[0]?.details?.latest).toEqual({ state: "KNOWN", value: "18 Oct" });
  });

  it("never lets a conflict overwrite current state on its own", () => {
    const state = snapshot({
      assessments: [assessment()],
      facts: [fact()],
      changes: [change({ changeType: "CONFLICT", latestValue: undefined })]
    });
    const result = resolveConflict(state, {
      changeId: "change-1",
      resolution: { state: "KNOWN", value: "20 Oct" },
      expectedRevision: 0,
      now
    });
    expect(result.snapshot.facts[0]?.value.value).toBe("20 Oct");
    expect(result.snapshot.history[0]?.event).toBe("CONFLICT_RESOLVED");
  });

  it("keeps a possibly removed object inside Current State with its mark", () => {
    const state = snapshot({
      assessments: [assessment()],
      changes: [
        change({ changeType: "POSSIBLY_REMOVED", latestValue: undefined, field: undefined })
      ]
    });
    const result = keepPossiblyRemoved(state, { changeId: "change-1", expectedRevision: 0, now });
    expect(result.snapshot.assessments[0]?.marks).toContain("PossiblyRemoved");
    expect(result.snapshot.assessments[0]?.supersededBy).toBeUndefined();
    expect(result.snapshot.changes).toHaveLength(0);
  });

  it("removes only through the explicit user decision", () => {
    const state = snapshot({
      assessments: [assessment()],
      facts: [fact()],
      changes: [
        change({ changeType: "POSSIBLY_REMOVED", latestValue: undefined, field: undefined })
      ]
    });
    const result = removeAssessment(state, { changeId: "change-1", expectedRevision: 0, now });
    expect(result.snapshot.assessments[0]?.supersededBy).toBe("removed");
    expect(result.snapshot.facts[0]?.superseded).toBe(true);
    expect(result.snapshot.course.currentRevision).toBe(1);
  });

  it("clears a kept Possibly Removed mark when evidence reappears, without a new review", () => {
    const state = snapshot({ assessments: [assessment({ marks: ["PossiblyRemoved"] })] });
    const result = resolveReappearance(state, {
      assessmentId: "assessment-1",
      expectedRevision: 0,
      now
    });
    expect(result?.snapshot.assessments[0]?.marks).toEqual([]);
    expect(result?.snapshot.reviewItems).toHaveLength(0);
    expect(result?.snapshot.history[0]?.event).toBe("POSSIBLY_REMOVED_RESOLVED");
  });

  it("does not create a reappearance event for an object that was never marked", () => {
    const state = snapshot({ assessments: [assessment()] });
    expect(
      resolveReappearance(state, { assessmentId: "assessment-1", expectedRevision: 0, now })
    ).toBeNull();
  });

  it("resolves identity uncertainty only through an explicit user judgement", () => {
    const state = snapshot({
      assessments: [assessment()],
      changes: [change({ changeType: "IDENTITY_UNCERTAIN", field: undefined })]
    });
    const same = resolveIdentity(state, {
      changeId: "change-1",
      relationship: "SAME_ASSESSMENT",
      expectedRevision: 0,
      now
    });
    expect(same.decisions[0]?.kind).toBe("KeepIdentity");
    const different = resolveIdentity(state, {
      changeId: "change-1",
      relationship: "DIFFERENT_ASSESSMENT",
      expectedRevision: 0,
      now
    });
    expect(different.decisions[0]?.kind).toBe("DifferentIdentity");
  });
});

describe("editing", () => {
  it("keeps evidence-backed edits attached to the field, not the assessment", () => {
    const state = snapshot({ assessments: [assessment()], facts: [fact()] });
    const result = editFact(state, {
      factId: "fact-1",
      value: { state: "KNOWN", value: "21 Oct" },
      expectedRevision: 0,
      now
    });
    expect(result.snapshot.facts[0]?.marks).toContain("Edited");
    expect(result.snapshot.assessments[0]?.marks).not.toContain("Edited");
    expect(result.history[0]?.field).toBe("deadline");
  });

  it("drops a Possibly Removed mark once the user edits the value", () => {
    const state = snapshot({ facts: [fact({ marks: ["PossiblyRemoved"] })] });
    const result = editFact(state, {
      factId: "fact-1",
      value: { state: "KNOWN", value: "21 Oct" },
      expectedRevision: 0,
      now
    });
    expect(result.snapshot.facts[0]?.marks).not.toContain("PossiblyRemoved");
  });

  it("treats the previous name as an alias after a rename", () => {
    const state = snapshot({ assessments: [assessment()] });
    const result = renameAssessment(state, {
      assessmentId: "assessment-1",
      name: "Group Project (Revised)",
      expectedRevision: 0,
      now
    });
    expect(result.snapshot.assessments[0]?.name).toBe("Group Project (Revised)");
    expect(result.snapshot.assessments[0]?.aliases).toContain("Group Project");
  });
});

describe("rebuild", () => {
  it("replaces current state only when the user adopts the rebuilt result", () => {
    const state = snapshot({ assessments: [assessment()], facts: [fact()] });
    const result = replaceCourseState(state, {
      assessments: [
        assessment({ assessmentId: "assessment-new", name: "Final Exam", kind: "exam" })
      ],
      constraints: [],
      facts: [fact({ factId: "fact-new", assessmentId: "assessment-new", field: "date" })],
      expectedRevision: 0,
      now,
      note: "rebuild"
    });
    expect(result.snapshot.assessments.map((item) => item.assessmentId)).toEqual([
      "assessment-new"
    ]);
    expect(result.snapshot.history[0]?.event).toBe("REBUILT_STATE_USED");
  });
});

describe("precise requirement and Rule decisions", () => {
  it("rejects ambiguous requirement updates and changes exactly the named fact", () => {
    const a = assessment();
    const one = fact({
        factId: "one",
        field: "requirement",
        value: { state: "KNOWN", value: "First instruction" }
      }),
      two = fact({
        factId: "two",
        field: "requirement",
        value: { state: "KNOWN", value: "Second instruction" }
      });
    const c = change({
      field: "requirement",
      latestValue: { state: "KNOWN", value: "Revised second instruction" }
    });
    const snapshot = makeSnapshot({ assessments: [a], facts: [one, two], changes: [c] });
    expect(() =>
      acceptChange(snapshot, {
        changeId: c.changeId,
        expectedRevision: snapshot.course.currentRevision,
        now
      })
    ).toThrow("CHANGE_FIELD_AMBIGUOUS");
    c.field = "two";
    const result = acceptChange(
      { ...snapshot, changes: [c] },
      { changeId: c.changeId, expectedRevision: snapshot.course.currentRevision, now }
    );
    expect(result.snapshot.facts.find((f) => f.factId === "one")?.value.value).toBe(
      "First instruction"
    );
    expect(result.snapshot.facts.find((f) => f.factId === "two")?.value.value).toBe(
      "Revised second instruction"
    );
  });
  it("applies a Rule content change only after an explicit decision and refuses unresolved text", () => {
    const rule = {
      constraintId: "rule",
      courseId: "course-1",
      content: "Original rule",
      evidenceRefs: [],
      marks: [],
      createdBy: "ai" as const,
      updatedAt: now
    };
    const c = change({
      targetId: "rule",
      field: "content",
      latestValue: { state: "KNOWN", value: "Revised rule" }
    });
    const snapshot = makeSnapshot({ constraints: [rule], changes: [c] });
    const result = acceptChange(snapshot, {
      changeId: c.changeId,
      expectedRevision: snapshot.course.currentRevision,
      now
    });
    expect(snapshot.constraints[0]?.content).toBe("Original rule");
    expect(result.snapshot.constraints[0]?.content).toBe("Revised rule");
    c.changeType = "CONFLICT";
    expect(() =>
      resolveConflict(
        { ...snapshot, changes: [c] },
        {
          changeId: c.changeId,
          resolution: { state: "UNCERTAIN", value: "Maybe" },
          expectedRevision: snapshot.course.currentRevision,
          now
        }
      )
    ).toThrow("CONSTRAINT_VALUE_UNRESOLVED");
    expect(
      resolveConflict(
        { ...snapshot, changes: [c] },
        {
          changeId: c.changeId,
          resolution: { state: "KNOWN", value: "Chosen rule" },
          expectedRevision: snapshot.course.currentRevision,
          now
        }
      ).snapshot.constraints[0]?.content
    ).toBe("Chosen rule");
  });
});

it("removes only the explicitly reviewed Rule, preserving independent trusted assessments", () => {
  const c = change({ targetId: "rule", field: "content", changeType: "POSSIBLY_REMOVED" });
  const source = makeSnapshot({
    assessments: [assessment()],
    facts: [fact()],
    constraints: [
      {
        constraintId: "rule",
        courseId: "course-1",
        content: "Old rule",
        evidenceRefs: [],
        marks: [],
        createdBy: "ai",
        updatedAt: now
      }
    ],
    changes: [c]
  });
  const result = removeAssessment(source, {
    changeId: c.changeId,
    expectedRevision: source.course.currentRevision,
    now
  });
  expect(source.constraints[0]?.superseded).toBeUndefined();
  expect(result.snapshot.constraints[0]?.superseded).toBe(true);
  expect(result.snapshot.assessments).toEqual(source.assessments);
  expect(result.snapshot.facts).toEqual(source.facts);
  expect(result.history[0]?.event).toBe("CONSTRAINT_REMOVED");
});

describe("evidenced additions to trusted assessment fields", () => {
  it("adds a previously absent field only through explicit acceptance and preserves existing facts", () => {
    const addition = change({
      field: "submissionFormat",
      currentValue: undefined,
      latestValue: { state: "KNOWN", value: "PDF" }
    });
    const before = snapshot({ assessments: [assessment()], facts: [fact()], changes: [addition] });
    const evidenceRefs = [{ evidenceId: "ev-new", sourceId: "source-1", locator: "page:1" }];
    const result = acceptChange(before, {
      changeId: addition.changeId,
      expectedRevision: 0,
      now,
      evidenceRefs
    });
    expect(before.facts).toEqual([fact()]);
    expect(result.snapshot.facts).toHaveLength(2);
    expect(result.snapshot.facts[0]).toEqual(before.facts[0]);
    expect(result.snapshot.facts[1]).toMatchObject({
      field: "submissionFormat",
      value: { state: "KNOWN", value: "PDF" },
      evidenceRefs
    });
    expect(result.snapshot.changes).toEqual([]);
    expect(result.snapshot.course.currentRevision).toBe(1);
    expect(result.history).toHaveLength(1);
  });
  it("rejects unsupported insertion, uncertain values, and invented prior values", () => {
    const addition = change({ field: "submissionFormat", currentValue: undefined });
    const state = snapshot({ assessments: [assessment()], changes: [addition] });
    const args = { changeId: addition.changeId, expectedRevision: 0, now };
    expect(() => acceptChange(state, args)).toThrow("NEW_FIELD_NOT_SUPPORTED");
    expect(() =>
      acceptChange(
        { ...state, changes: [{ ...addition, latestValue: { state: "UNCERTAIN" } }] },
        { ...args, evidenceRefs: [{ evidenceId: "ev", sourceId: "source", locator: "page:1" }] }
      )
    ).toThrow("NEW_FIELD_NOT_SUPPORTED");
    expect(() =>
      acceptChange(
        {
          ...state,
          changes: [{ ...addition, currentValue: { state: "KNOWN", value: "invented" } }]
        },
        args
      )
    ).toThrow("FACT_NOT_FOUND");
  });
});

it("keeps a Rule addition uncertain and preserves its original proof after Human Confirm", () => {
  const rule = {
    constraintId: "rule",
    courseId: makeCourse().courseId,
    content: "Existing attendance rule",
    evidenceRefs: [],
    marks: [],
    createdBy: "ai" as const,
    updatedAt: now
  };
  const addition = fact({
    constraintId: "rule",
    factId: "new-rule-clause",
    field: "content",
    value: { state: "UNCERTAIN", value: "The checklist may count toward participation" },
    semanticClause: {
      clauseId: "c",
      content: "The checklist may count toward participation",
      modality: "may",
      conditions: ["grading decision not confirmed"],
      exceptions: [],
      applicability: "CURRENT",
      context: "Current course update",
      judgmentBasis: "Unconfirmed authored update",
      originalState: "UNCERTAIN"
    }
  });
  delete addition.assessmentId;
  const item = reviewItem({ targetId: "rule", changeType: "NEW" });
  const state = makeSnapshot({ constraints: [rule], reviewItems: [item] });
  const reviewed = constraintForReview(rule, rule, [], [addition], "NEW");
  expect(reviewed.content).toContain("Existing attendance rule");
  expect(reviewed.content).toContain("UNCERTAIN — may:");
  expect(reviewed.content).toContain("grading decision not confirmed");
  const result = applyInitialReviewDecision(state, {
    reviewItemId: item.reviewItemId,
    kind: "Confirm",
    constraint: reviewed,
    facts: [addition],
    expectedRevision: state.course.currentRevision,
    now
  });
  expect(result.snapshot.facts.find((f) => f.factId === addition.factId)?.value.state).toBe(
    "UNCERTAIN"
  );
  expect(result.snapshot.constraints[0]?.content).toBe(reviewed.content);
  expect(() =>
    applyInitialReviewDecision(state, {
      reviewItemId: item.reviewItemId,
      kind: "Confirm",
      constraint: reviewed,
      facts: [{ ...addition, constraintId: "other" }],
      expectedRevision: state.course.currentRevision,
      now
    })
  ).toThrow("FACT_OWNERSHIP_MISMATCH");
});

it("edits operative force/conditions/exceptions without rewriting captured provenance", async () => {
  const { operativeSemantics } = await import("./fact-semantics");
  const original = fact({
    field: "requirement",
    semanticClause: {
      clauseId: "c",
      content: "Submit",
      modality: "must",
      conditions: ["if assigned"],
      exceptions: ["unless waived"],
      applicability: "CURRENT",
      judgmentBasis: "native"
    },
    evidenceRefs: [{ sourceId: "s", evidenceId: "e", locator: "page:1" }]
  });
  const state = makeSnapshot({ facts: [original], assessments: [assessment()] });
  const facets = { modality: "may", conditions: ["only after approval"], exceptions: [] };
  const result = editFact(state, {
    factId: original.factId,
    value: original.value,
    semantics: facets,
    expectedRevision: state.course.currentRevision,
    now
  });
  const edited = result.snapshot.facts[0];
  if (!edited) throw Error("EDITED_FACT_MISSING");
  expect(operativeSemantics(edited)).toEqual(facets);
  expect(edited.semanticClause).toEqual(original.semanticClause);
  expect(edited.evidenceRefs).toEqual(original.evidenceRefs);
  expect(result.history[0]).toMatchObject({ toSemantics: facets });
  expect(() =>
    editFact(state, {
      factId: original.factId,
      value: original.value,
      semantics: { ...facets, modality: " " },
      expectedRevision: state.course.currentRevision,
      now
    })
  ).toThrow("INVALID_HUMAN_SEMANTICS");
});

it("Keep Current retains Human facets; accepting an explicit new proposition replaces them", async () => {
  const { operativeSemantics } = await import("./fact-semantics");
  const original = fact({
    humanSemantics: { modality: "may", conditions: ["after approval"], exceptions: [] },
    userEdited: true
  });
  const captured = structuredClone(original);
  delete captured.humanSemantics;
  const proposedFact = {
    ...captured,
    semanticClause: {
      clauseId: "c2",
      content: "Submit",
      modality: "must",
      conditions: ["if assigned"],
      exceptions: ["unless waived"],
      applicability: "CURRENT" as const,
      judgmentBasis: "native"
    }
  };
  const proposal = change({ proposedFact });
  const state = makeSnapshot({
    facts: [original],
    assessments: [assessment()],
    changes: [proposal]
  });
  const args = { changeId: proposal.changeId, expectedRevision: state.course.currentRevision, now };
  const kept = keepCurrent(state, args).snapshot.facts[0];
  expect(operativeSemantics(kept)).toEqual(original.humanSemantics);
  const accepted = acceptChange(state, args).snapshot.facts[0];
  expect(accepted?.humanSemantics).toBeUndefined();
  expect(operativeSemantics(accepted)).toMatchObject({
    modality: "must",
    exceptions: ["unless waived"]
  });
});
