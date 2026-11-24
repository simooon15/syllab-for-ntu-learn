import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect } from "vitest";
import { LocalDatabase } from "./storage";
import { LocalStore } from "./store";
import { makeCourse } from "./testing";
import { RebuildStagingStore } from "./staging";
import { applyInitialReviewDecision } from "./course-state";
import {
  DIRECT_COURSE_SCHEMA,
  prepareDirectCourse,
  materializeDirectCourse
} from "./direct-course";
import { TASK_B_SCHEMA } from "./ai-contracts";
import type { AssessmentRecord, SourceRecord, ReviewItemRecord } from "./schema";

const now = "2026-10-10T00:00:00.000Z";
const course = makeCourse({
  courseId: "synthetic-course",
  courseCode: "TEST",
  courseName: "Synthetic",
  established: true
});
const source: SourceRecord = {
  sourceId: "s",
  courseId: course.courseId,
  nativeItemId: "n",
  kind: "attachment",
  title: "Synthetic",
  updatedAt: now,
  parsed: { text: "Submit PDF. Keep a copy.", structure: [] }
};
const input = {
  course: { courseCode: course.courseCode, courseName: course.courseName },
  sources: [source]
};
function candidate() {
  const evidence = {
    evidenceId: "e",
    sourceId: "s",
    locator: "native-text",
    excerpt: "Submit PDF. Keep a copy."
  };
  return materializeDirectCourse(
    {
      schema: DIRECT_COURSE_SCHEMA,
      snapshot: prepareDirectCourse(input, "synthetic").snapshot,
      coverage: [
        {
          sourceId: "s",
          examinedNativeLocators: ["native-text"],
          unresolvedNativeLocators: [],
          limitations: []
        }
      ],
      output: {
        schema: TASK_B_SCHEMA,
        identityResolutions: [],
        canonicalAssessmentProposals: [
          {
            proposalId: "new",
            canonicalName: "Synthetic assignment",
            type: "assignment",
            role: "assessment",
            aliases: [],
            consolidatedFields: [],
            requirements: [{ requirementId: "r", content: "Submit PDF.", evidence: [evidence] }],
            supportingEvidence: [evidence],
            unresolvedIssues: []
          }
        ],
        courseWideConstraintProposals: [
          {
            proposalId: "rule",
            normalizedRuleContent: "Keep a copy.",
            supportingEvidence: [evidence],
            unresolvedIssues: []
          }
        ],
        fieldConsolidationResults: [],
        structuralRelationships: [],
        unresolvedIssues: []
      }
    },
    input,
    { course, workflowId: "isolated", sources: new Map(), exclusionKeys: new Set(), now }
  );
}
async function seeded() {
  // A fresh in-memory factory and unique database name: never opens the browser's real DB.
  const store = new LocalStore(new LocalDatabase(new IDBFactory(), "synthetic-direct-review-050"));
  await store.initialize();
  await store.upsertCourse(course);
  const existing: AssessmentRecord = {
    assessmentId: "user-existing",
    courseId: course.courseId,
    role: "assessment",
    kind: "project",
    name: "Existing user choice",
    aliases: [],
    marks: [],
    createdBy: "user",
    createdAt: now,
    updatedAt: now
  };
  await store.writeDraft({ assessments: [existing] });
  return store;
}
const brief = (s: Awaited<ReturnType<LocalStore["readTrustedSnapshot"]>>) => ({
  assessments: s?.assessments,
  constraints: s?.constraints,
  facts: s?.facts
});
describe("direct candidate isolation at existing Review/trusted boundary", () => {
  it("keeps the entire rebuild candidate, including Rules, outside trusted state; discard is safe", async () => {
    const store = await seeded(),
      before = brief(await store.readTrustedSnapshot(course.courseId)),
      materialized = candidate();
    const memory: Record<string, unknown> = {};
    const staging = new RebuildStagingStore({
      get: (keys) =>
        Promise.resolve(
          Object.fromEntries((typeof keys === "string" ? [keys] : keys).map((k) => [k, memory[k]]))
        ),
      set: (items) => {
        Object.assign(memory, structuredClone(items));
        return Promise.resolve();
      },
      remove: (keys) => {
        for (const k of typeof keys === "string" ? [keys] : keys) Reflect.deleteProperty(memory, k);
        return Promise.resolve();
      }
    });
    await staging.write({
      courseId: course.courseId,
      workflowId: "isolated",
      stagedAt: now,
      assessments: materialized.assessments,
      constraints: materialized.constraints,
      facts: materialized.bundle.facts ?? [],
      evidence: materialized.bundle.evidence ?? [],
      reviewItems: [],
      changes: []
    });
    expect((await staging.read(course.courseId, "isolated"))?.constraints).toHaveLength(1);
    expect(brief(await store.readTrustedSnapshot(course.courseId))).toEqual(before);
    await staging.clear(course.courseId, "isolated");
    expect(await staging.read(course.courseId, "isolated")).toBeNull();
    expect(brief(await store.readTrustedSnapshot(course.courseId))).toEqual(before);
  });
  it("only admits an Assessment through the existing explicit Confirm decision, keeping prior user state", async () => {
    const store = await seeded(),
      before = brief(await store.readTrustedSnapshot(course.courseId)),
      m = candidate();
    const a = m.assessments[0];
    if (!a) throw Error("SYNTHETIC_CANDIDATE_MISSING");
    const item: ReviewItemRecord = {
      reviewItemId: "review-new",
      courseId: course.courseId,
      workflowId: "isolated",
      kind: "initial",
      targetId: a.assessmentId,
      payload: { assessmentId: a.assessmentId },
      createdAt: now,
      updatedAt: now
    };
    // Rules intentionally stay staged; Initial Confirm is not a Rule adoption interface.
    await store.writeDraft({
      assessments: m.assessments,
      facts: m.bundle.facts ?? [],
      evidence: m.bundle.evidence ?? [],
      reviewItems: [item]
    });
    expect(brief(await store.readTrustedSnapshot(course.courseId))).toEqual(before);
    const snapshot = await store.readSnapshot(course.courseId);
    if (!snapshot) throw Error("SYNTHETIC_SNAPSHOT_MISSING");
    const result = applyInitialReviewDecision(snapshot, {
      reviewItemId: item.reviewItemId,
      kind: "Confirm",
      assessment: a,
      facts: m.bundle.facts ?? [],
      expectedRevision: snapshot.course.currentRevision,
      now
    });
    await store.commitReviewDecision(course.courseId, item.reviewItemId, result);
    const trusted = await store.readTrustedSnapshot(course.courseId);
    expect(new Set(trusted?.assessments.map((x) => x.assessmentId))).toEqual(
      new Set(["user-existing", a.assessmentId])
    );
    expect(trusted?.facts.some((x) => x.assessmentId === a.assessmentId)).toBe(true);
    expect(trusted?.constraints).toEqual([]);
  });
});
