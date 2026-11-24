import { archiveCourseDraft } from "./course-draft-archive";
import { requirePresent } from "./errors";
import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it } from "vitest";

import { applyInitialReviewDecision, keepCurrent, replaceCourseState } from "./course-state";
import type {
  AssessmentRecord,
  CourseRecord,
  ReviewItemRecord,
  ChangeRecord,
  FactRecord
} from "./schema";
import { DATABASE_NAME, LocalDatabase } from "./storage";
import { LocalStore } from "./store";

/**
 * When a Course is established, and what a Review decision leaves behind.
 *
 * Both rules are the same question asked twice: what is in the store once the user has decided
 * something. §3.5 gives a Not Established Course no status text at all, so a Course whose whole
 * Initial Review is still waiting cannot be established — while §6.7 makes establishment
 * incremental, so the first Confirm is what establishes it. Neither held: `recomputeEstablished`
 * had no caller anywhere, so `established` stayed false for the life of the Course, and the
 * decided Review item was never removed, so the Review handed the same item back for ever.
 * (Gate 3 findings F22 and F25.)
 */

const NOW = "2026-09-19T09:00:00.000Z";

const COURSE: CourseRecord = {
  courseId: "course_pm",
  semesterId: "sem_2026s1",
  courseCode: "MA6081",
  courseName: "Fundamentals of Project Management",
  curriculum: true,
  established: false,
  currentRevision: 1,
  consecutiveCheckFailures: 0,
  updatedAt: NOW
};

const assessment = (
  assessmentId: string,
  name: string,
  createdBy: "ai" | "user"
): AssessmentRecord => ({
  assessmentId,
  courseId: COURSE.courseId,
  role: "assessment",
  kind: "project",
  name,
  aliases: [],
  marks: [],
  createdBy,
  createdAt: NOW,
  updatedAt: NOW
});

const reviewItem = (reviewItemId: string, targetId: string): ReviewItemRecord => ({
  reviewItemId,
  courseId: COURSE.courseId,
  workflowId: "wf-1",
  kind: "initial",
  targetId,
  payload: {},
  createdAt: NOW,
  updatedAt: NOW
});

const GROUP = "assessment_group";
const QUIZ = "assessment_quiz";

async function freshStore(): Promise<LocalStore> {
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DATABASE_NAME);
    for (const event of ["success", "error", "blocked"]) {
      request.addEventListener(event, () => {
        resolve();
      });
    }
  });
  const store = new LocalStore(new LocalDatabase());
  await store.initialize();
  return store;
}

let store: LocalStore;

beforeEach(async () => {
  store = await freshStore();
  await store.upsertCourse(COURSE);
  // What a finished Initial Scan leaves behind: canonical Assessments that are not Current Course
  // State yet, each one still waiting for the user's decision.
  await store.writeDraft({
    assessments: [assessment(GROUP, "Group Project", "ai"), assessment(QUIZ, "Quiz", "ai")],
    reviewItems: [reviewItem("ri-group", GROUP), reviewItem("ri-quiz", QUIZ)]
  });
});

describe("when a Course is established", () => {
  it("is not established while every item it found is still waiting for a decision", async () => {
    expect(await store.recomputeEstablished(COURSE.courseId)).toMatchObject({ established: false });
  });

  it("is established by the first decision, without waiting for the rest of the Review", async () => {
    const decided = await decide("ri-group", "Confirm");
    expect(decided.established).toBe(true);
  });

  it("is established by a Manual Add, which no Review ever carried", async () => {
    const snapshot = await store.readSnapshot(COURSE.courseId);
    if (!snapshot) throw new Error("SNAPSHOT_MISSING");
    await store.commitMutation(COURSE.courseId, {
      snapshot: {
        ...snapshot,
        assessments: [
          ...snapshot.assessments,
          assessment("assessment_manual", "Added by hand", "user")
        ]
      },
      decisions: [],
      history: []
    });
    expect((await store.readCourse(COURSE.courseId))?.established).toBe(true);
  });
});

describe("what a Review decision leaves behind", () => {
  it("atomically replaces adopted Rebuild facts rather than retaining omitted old values, while preserving another course", async () => {
    const old: FactRecord = {
      factId: "old-summary",
      courseId: COURSE.courseId,
      assessmentId: GROUP,
      field: "weight",
      value: { state: "KNOWN", value: "25%" },
      evidenceRefs: [],
      marks: [],
      updatedAt: NOW
    };
    await store.upsertCourse({ ...COURSE, courseId: "other-course" });
    await store.writeDraft({
      facts: [old, { ...old, factId: "other-fact", courseId: "other-course" }]
    });
    const snapshot = await store.readSnapshot(COURSE.courseId);
    if (!snapshot) throw Error("SNAPSHOT_MISSING");
    const replacement = {
      ...old,
      factId: "current-weight",
      value: { state: "KNOWN" as const, value: "45%" }
    };
    await store.commitMutation(
      COURSE.courseId,
      replaceCourseState(snapshot, {
        assessments: [assessment(GROUP, "Group Project", "ai")],
        constraints: [],
        facts: [replacement],
        expectedRevision: snapshot.course.currentRevision,
        now: NOW,
        note: "rebuild"
      }),
      { replaceCurrentObjects: true }
    );
    const reopened = new LocalStore(new LocalDatabase());
    expect((await reopened.readTrustedSnapshot(COURSE.courseId))?.facts).toEqual([replacement]);
    expect(
      (await reopened.readSnapshot(COURSE.courseId))?.assessments.map((a) => a.assessmentId)
    ).toEqual([GROUP]);
    expect((await reopened.readSnapshot("other-course"))?.facts.map((f) => f.factId)).toEqual([
      "other-fact"
    ]);
  });
  it("atomically removes a resolved change and review item across native reload while protecting another course's queues", async () => {
    const pending: ChangeRecord = {
      changeId: "change-kept",
      courseId: COURSE.courseId,
      workflowId: "wf",
      targetId: GROUP,
      field: "weight",
      changeType: "CONFLICT",
      currentValue: { state: "KNOWN", value: "41%" },
      latestValue: { state: "KNOWN", value: "45%" },
      currentEvidenceIds: [],
      newEvidenceIds: ["native-new"],
      createdAt: NOW,
      updatedAt: NOW
    };
    await store.writeDraft({
      changes: [pending, { ...pending, changeId: "other-course-change", courseId: "other-course" }],
      reviewItems: [
        { ...reviewItem(pending.changeId, GROUP), kind: "change", changeType: "CONFLICT" },
        { ...reviewItem("other-course-review", GROUP), courseId: "other-course" }
      ]
    });
    await store.upsertCourse({ ...COURSE, courseId: "other-course" });
    const snapshot = await store.readSnapshot(COURSE.courseId);
    if (!snapshot) throw Error("SNAPSHOT_MISSING");
    const result = keepCurrent(snapshot, {
      changeId: pending.changeId,
      expectedRevision: snapshot.course.currentRevision,
      now: NOW
    });
    result.snapshot.reviewItems = result.snapshot.reviewItems.filter(
      (i) => i.reviewItemId !== pending.changeId
    );
    await store.commitMutation(COURSE.courseId, result);
    const reopened = new LocalStore(new LocalDatabase());
    const current = await reopened.readSnapshot(COURSE.courseId),
      other = await reopened.readSnapshot("other-course");
    expect(current?.changes).toHaveLength(0);
    expect(current?.reviewItems.some((i) => i.reviewItemId === pending.changeId)).toBe(false);
    expect(other?.changes.map((c) => c.changeId)).toEqual(["other-course-change"]);
    expect(other?.reviewItems.map((i) => i.reviewItemId)).toEqual(["other-course-review"]);
    expect((await reopened.readDecisions(COURSE.courseId)).at(-1)?.kind).toBe("KeepCurrent");
  });
  it("takes the decided item out, so the next read hands back the next item", async () => {
    await decide("ri-group", "Confirm");
    const after = await store.readSnapshot(COURSE.courseId);
    expect(after?.reviewItems.map((item) => item.reviewItemId)).toEqual(["ri-quiz"]);
  });

  it("leaves the Course unestablished when the decision was to exclude", async () => {
    // Excluding is a decision like any other, and the item that is left is still waiting — but the
    // Review did resolve, so this is one item fewer and nothing in Current Course State yet.
    await decide("ri-group", "Exclude");
    const after = await store.readSnapshot(COURSE.courseId);
    expect(after?.reviewItems.map((item) => item.reviewItemId)).toEqual(["ri-quiz"]);
    expect((await store.readCourse(COURSE.courseId))?.established).toBe(false);
  });
});

describe("AI run invocation identity", () => {
  it.each(["retrieval-planner", "task-a", "task-b", "task-b-expand"] as const)(
    "filters cross-workflow %s results while retaining same-workflow recovery",
    async (task) => {
      const record = {
        aiRunId: "old",
        workflowId: "historical",
        courseId: COURSE.courseId,
        task,
        schemaVersion: "synthetic/1",
        promptVersion: "synthetic/1",
        idempotencyKey: "collision",
        invocationFingerprint: "same",
        status: "succeeded" as const,
        payload: { value: "old" },
        attempt: 1,
        recordedAt: NOW
      };
      await store.recordAiRun(record);
      expect(await store.findAiRun("collision", "same", "fresh")).toBeNull();
      expect(await store.findAiRun("collision", "same")).toMatchObject({
        workflowId: "historical"
      });
      await store.recordAiRun({
        ...record,
        aiRunId: "new",
        workflowId: "fresh",
        payload: { value: "new" }
      });
      expect(await store.findAiRun("collision", "same", "fresh")).toMatchObject({
        payload: { value: "new" }
      });
      expect(await store.findAiRun("collision", "same", "historical")).toMatchObject({
        payload: { value: "old" }
      });
    }
  );

  it("reuses only a result with the same invocation fingerprint", async () => {
    await store.recordAiRun({
      aiRunId: "airun-fingerprint",
      workflowId: "wf-fingerprint",
      courseId: COURSE.courseId,
      task: "task-a",
      schemaVersion: "syllab.ai/task-a/1",
      promptVersion: "task-a/1",
      idempotencyKey: "same-logical-unit",
      invocationFingerprint: "policy-old",
      status: "succeeded",
      payload: { value: "old" },
      attempt: 1,
      recordedAt: NOW
    });

    expect(await store.findAiRun("same-logical-unit", "policy-old")).toMatchObject({
      payload: { value: "old" }
    });
    expect(await store.findAiRun("same-logical-unit", "policy-new")).toBeNull();
  });
});

/** Decides one item the way the handler does, and answers with the state it left. */
async function decide(reviewItemId: string, kind: "Confirm" | "Exclude"): Promise<CourseRecord> {
  const snapshot = await store.readSnapshot(COURSE.courseId);
  if (!snapshot) throw new Error("SNAPSHOT_MISSING");
  const item = snapshot.reviewItems.find((entry) => entry.reviewItemId === reviewItemId);
  if (!item) throw new Error("REVIEW_ITEM_MISSING");
  const target = snapshot.assessments.find((entry) => entry.assessmentId === item.targetId);
  const input = {
    reviewItemId: item.reviewItemId,
    kind,
    expectedRevision: snapshot.course.currentRevision,
    now: NOW,
    ...(kind === "Confirm" && target ? { assessment: target } : {})
  };
  const result = applyInitialReviewDecision(snapshot, input);
  await store.commitReviewDecision(COURSE.courseId, item.reviewItemId, result);
  const course = await store.readCourse(COURSE.courseId);
  if (!course) throw new Error("COURSE_MISSING");
  return course;
}

describe("Gate A initial provisional canonical replacement", () => {
  const owner = () => ({
    workflowId: "initial-gate-a",
    courseId: COURSE.courseId,
    kind: "initial" as const,
    state: "working" as const,
    phase: "task-b" as const,
    phaseCursor: "",
    attempt: 0,
    baseCourseRevision: 0,
    lease: { token: "gate-a", sessionId: "session-a" },
    createdAt: NOW,
    updatedAt: NOW
  });
  const seed = async (row: AssessmentRecord) => {
    const workflow = owner();
    await store.upsertCourse({ ...COURSE, currentRevision: 0 });
    await store.saveWorkflow(workflow);
    await store.writeDraft({ assessments: [row] });
    await store.setMetadata({
      [`task-b-ledger:${workflow.workflowId}`]: {
        ledger: { taskABaseline: { assessments: [row] } }
      }
    });
    return workflow;
  };
  it("rejects trusted or user-edited rows without changing native data", async () => {
    const row = assessment(GROUP, "Synthetic user state", "user"),
      workflow = await seed(row);
    await expect(
      store.replaceInitialProvisional(workflow, { assessments: [row] }, { assessments: [] })
    ).rejects.toThrow("TRUSTED_INITIAL_BASELINE_WRITE_FORBIDDEN");
    expect((await store.readSnapshot(COURSE.courseId))?.assessments).toContainEqual(row);
  });
  it("checks exact durable baseline and owner session before any deletion", async () => {
    const row = assessment(GROUP, "Synthetic unreviewed", "ai"),
      workflow = await seed(row);
    await expect(
      store.replaceInitialProvisional(
        { ...workflow, lease: { token: "gate-a", sessionId: "stale" } },
        { assessments: [row] },
        { assessments: [] }
      )
    ).rejects.toThrow("STALE_INITIAL_CANONICAL_WRITE");
    await expect(
      store.replaceInitialProvisional(
        workflow,
        { assessments: [{ ...row, name: "changed" }] },
        { assessments: [] }
      )
    ).rejects.toThrow("INITIAL_BASELINE_NOT_DURABLE");
    expect((await store.readSnapshot(COURSE.courseId))?.assessments).toContainEqual(row);
  });
  it("replaces only exact unreviewed baseline IDs and retains the durable original", async () => {
    const row = assessment(GROUP, "Synthetic unreviewed", "ai"),
      workflow = await seed(row),
      replacement = assessment("canonical-new", "Synthetic canonical", "ai");
    await store.replaceInitialProvisional(
      workflow,
      { assessments: [row] },
      { assessments: [replacement] }
    );
    const snapshot = await store.readSnapshot(COURSE.courseId);
    expect(snapshot?.assessments).toContainEqual(replacement);
    expect(snapshot?.assessments.some((a) => a.assessmentId === GROUP)).toBe(false);
    expect(snapshot?.assessments.some((a) => a.assessmentId === QUIZ)).toBe(true);
    expect(await store.readMetadataValue(`task-b-ledger:${workflow.workflowId}`)).toEqual({
      ledger: { taskABaseline: { assessments: [row] } }
    });
    expect((await store.readCourse(COURSE.courseId))?.established).toBe(false);
  });
});

it("Source understanding excludes one-Source physical envelopes and selects the logical checkpoint", async () => {
  const common = {
    workflowId: "single-source",
    courseId: COURSE.courseId,
    task: "task-a" as const,
    promptVersion: "synthetic",
    idempotencyKey: "single-source",
    status: "succeeded" as const,
    sourceId: "synthetic-source",
    attempt: 1,
    recordedAt: NOW
  };
  await store.recordAiRun({
    ...common,
    aiRunId: "physical",
    schemaVersion: "syllab.ai.physical-work/1",
    invocationRole: "physical",
    payload: { schema: "syllab.ai.physical-work/1", items: [] }
  });
  expect(await store.sourceUnderstanding("single-source", "synthetic-source")).toBeNull();
  await store.recordAiRun({
    ...common,
    aiRunId: "logical",
    schemaVersion: "syllab.ai.task-a/1",
    invocationRole: "logical-checkpoint",
    payload: { schema: "syllab.ai.task-a/1", sourceId: "synthetic-source" }
  });
  expect(await store.sourceUnderstanding("single-source", "synthetic-source")).toMatchObject({
    aiRunId: "logical",
    invocationRole: "logical-checkpoint"
  });
});

describe("RC2 approval boundaries", () => {
  const scopedFact = (id: string): FactRecord => ({
    factId: id,
    courseId: COURSE.courseId,
    assessmentId: GROUP,
    field: "requirement",
    value: { state: "KNOWN", value: id },
    evidenceRefs: [],
    marks: [],
    userEdited: false,
    updatedAt: NOW
  });
  it("approves only the displayed scope and keeps the independent pending requirement untrusted", async () => {
    const f1 = scopedFact("core"),
      f2 = scopedFact("risk");
    const base = {
      ...reviewItem("base", GROUP),
      payload: { productScope: true, ownerScope: true, scopeFactIds: ["core"] }
    };
    const risk = {
      ...reviewItem("risk-review", GROUP),
      payload: { productScope: true, ownerScope: false, scopeFactIds: ["risk"] }
    };
    await store.writeDraft({ facts: [f1, f2], reviewItems: [base, risk] });
    await store.deleteReviewItems(["ri-group", "ri-quiz"]);
    const snap = requirePresent(await store.readSnapshot(COURSE.courseId));
    const result = applyInitialReviewDecision(snap, {
      reviewItemId: "base",
      kind: "Confirm",
      expectedRevision: 1,
      now: NOW,
      assessment: requirePresent(snap.assessments.find((a) => a.assessmentId === GROUP)),
      facts: [f1]
    });
    requirePresent(result.decisions[0]).details = {
      productScope: true,
      ownerScope: true,
      courseRevision: 1,
      scopeFactIds: ["core"],
      scopeVersions: [{ factId: "core", updatedAt: NOW }]
    };
    await store.commitReviewDecision(COURSE.courseId, "base", result);
    expect(
      requirePresent(await store.readTrustedSnapshot(COURSE.courseId)).facts.map((f) => f.factId)
    ).toEqual(["core"]);
    expect(
      requirePresent(await store.readSnapshot(COURSE.courseId)).reviewItems.map(
        (i) => i.reviewItemId
      )
    ).toEqual(["risk-review"]);
  });
  it("rejects a stale scope atomically without writing approval or exclusion memory", async () => {
    const f = scopedFact("core");
    await store.writeDraft({ facts: [f] });
    const snap = requirePresent(await store.readSnapshot(COURSE.courseId));
    const result = applyInitialReviewDecision(snap, {
      reviewItemId: "ri-group",
      kind: "Confirm",
      expectedRevision: 1,
      now: NOW,
      assessment: requirePresent(snap.assessments[0]),
      facts: [f]
    });
    requirePresent(result.decisions[0]).details = {
      productScope: true,
      courseRevision: 1,
      scopeVersions: [{ factId: "core", updatedAt: "stale" }]
    };
    await expect(
      store.commitReviewDecision(COURSE.courseId, "ri-group", result, {
        exclusionMemory: {
          courseId: COURSE.courseId,
          proposalKey: "key",
          evidenceFingerprint: "fingerprint"
        }
      })
    ).rejects.toThrow("REVIEW_SCOPE_CHANGED");
    expect(await store.readDecisions(COURSE.courseId)).toEqual([]);
    expect(requirePresent(await store.readSnapshot(COURSE.courseId)).reviewItems).toHaveLength(2);
    expect(await store.readExclusionMemory(COURSE.courseId)).toEqual([]);
  });
  it("restores an excluded scope after reload without treating Undo as approval", async () => {
    const f = scopedFact("core");
    await store.writeDraft({ facts: [f] });
    const snap = requirePresent(await store.readSnapshot(COURSE.courseId));
    const result = applyInitialReviewDecision(snap, {
      reviewItemId: "ri-group",
      kind: "Exclude",
      expectedRevision: 1,
      now: NOW
    });
    requirePresent(result.decisions[0]).details = {
      ...requirePresent(result.decisions[0]).details,
      productScope: true,
      ownerScope: true,
      courseRevision: 1,
      scopeFactIds: ["core"],
      excludedReviewItem: snap.reviewItems.find((i) => i.reviewItemId === "ri-group")
    };
    await store.commitReviewDecision(COURSE.courseId, "ri-group", result);
    await store.undoExclusion(COURSE.courseId, "ri-group", "2026-10-11T00:00:00Z");
    expect(
      requirePresent(await store.readSnapshot(COURSE.courseId)).reviewItems.some(
        (i) => i.reviewItemId === "ri-group"
      )
    ).toBe(true);
    expect(requirePresent(await store.readTrustedSnapshot(COURSE.courseId)).facts).toEqual([]);
    expect((await store.readDecisions(COURSE.courseId)).map((d) => d.kind).sort()).toEqual([
      "Exclude",
      "UndoExclude"
    ]);
  });
});

it("retains an untrusted interpretation archive through decisions and revision pointer writes", async () => {
  const archive = archiveCourseDraft(
    {
      schema: "syllab.ai.course-draft/1",
      clauses: [],
      entities: [],
      links: [],
      identities: [],
      inspections: [],
      deepLocators: {},
      productVerification: "old"
    },
    "wf-archive",
    NOW
  );
  await store.writeCourseDraftArchive(COURSE.courseId, archive);
  const owner = {
    workflowId: archive.workflowId,
    courseId: COURSE.courseId,
    kind: "check" as const,
    state: "working" as const,
    phase: "task-b" as const,
    phaseCursor: "start",
    attempt: 0,
    lease: { token: "archive-lease", sessionId: "archive-session" },
    baseCourseRevision: COURSE.currentRevision,
    createdAt: NOW,
    updatedAt: NOW
  };
  await store.saveWorkflow(owner);
  await expect(
    store.writeCourseDraftArchive(COURSE.courseId, archive, { ...owner, courseId: "other" })
  ).rejects.toThrow("STALE_WORKFLOW_WRITE");
  await expect(
    store.writeCourseDraftArchive(COURSE.courseId, { ...archive, workflowId: "other" }, owner)
  ).rejects.toThrow("STALE_WORKFLOW_WRITE");
  await store.writeCourseDraftArchive(COURSE.courseId, archive, owner);
  const snapshot = requirePresent(await store.readSnapshot(COURSE.courseId));
  const result = applyInitialReviewDecision(snapshot, {
    assessment: requirePresent(snapshot.assessments.find((a) => a.assessmentId === GROUP)),
    reviewItemId: "ri-group",
    kind: "Confirm",
    expectedRevision: snapshot.course.currentRevision,
    now: NOW
  });
  await store.commitReviewDecision(COURSE.courseId, "ri-group", result);
  await store.writeCourseStateRecord({
    courseId: COURSE.courseId,
    revision: result.snapshot.course.currentRevision,
    updatedAt: NOW
  });
  expect(await store.readCourseDraftArchive(COURSE.courseId)).toEqual(archive);
  expect(archive.draft.productVerification).toBeUndefined();
  expect((await store.readDurableTables()).courseStates[0]?.sourceInterpretation).toEqual(archive);
});

it("never exposes pending typed rule prose through a legacy constraint summary fallback", async () => {
  const rules = {
    constraintId: "rule-owner",
    courseId: COURSE.courseId,
    content: "APPROVED_RULE and PENDING_PROHIBITION",
    evidenceRefs: [],
    marks: [],
    createdBy: "ai" as const,
    updatedAt: NOW
  };
  const makeRule = (id: string): FactRecord => ({
    factId: id,
    courseId: COURSE.courseId,
    constraintId: rules.constraintId,
    field: "content",
    value: { state: "KNOWN", value: id },
    evidenceRefs: [],
    marks: [],
    updatedAt: NOW,
    product: {
      propositionRef: id,
      clauseRefs: [id],
      predicate: "requirement",
      unit: "text",
      disposition: "IMPORTANT_RULE",
      role: "risk",
      title: id,
      group: "Rules",
      relation: "INDEPENDENT",
      modality: "must",
      conditions: [],
      exceptions: [],
      support: [{ clauseRef: id, quote: id }],
      basis: "native",
      independentReview: true,
      sourceVersions: []
    }
  });
  const facts = [makeRule("APPROVED_RULE"), makeRule("PENDING_PROHIBITION")];
  const reviews = facts.map((f) => ({
    ...reviewItem("review:" + f.factId, rules.constraintId),
    payload: { productScope: true, ownerScope: false, scopeFactIds: [f.factId] }
  }));
  await store.writeDraft({ constraints: [rules], facts, reviewItems: reviews });
  expect((await store.readTrustedSnapshot(COURSE.courseId))?.constraints).toEqual([]);
  await store.deleteReviewItems([requirePresent(reviews[0]).reviewItemId]);
  const trusted = requirePresent(await store.readTrustedSnapshot(COURSE.courseId));
  expect(trusted.constraints).toHaveLength(1);
  expect(trusted.constraints[0]?.content).toBe("APPROVED_RULE");
  expect(trusted.facts.map((f) => f.factId)).toEqual(["APPROVED_RULE"]);
  expect((await store.readSnapshot(COURSE.courseId))?.constraints[0]?.content).toBe(rules.content);
});
