import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it } from "vitest";

import { applyInitialReviewDecision } from "./course-state";
import type { AssessmentRecord, CourseRecord, ReviewItemRecord } from "./schema";
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
