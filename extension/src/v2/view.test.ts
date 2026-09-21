import "fake-indexeddb/auto";

import { beforeEach, describe, expect, it } from "vitest";

import { exportCalendar } from "./calendar-export";
import { calendarExportInput } from "./calendar-plan";
import type {
  AssessmentRecord,
  CourseRecord,
  FactRecord,
  ReviewItemRecord,
  SemesterRecord,
  WorkflowRecord
} from "./schema";
import { DATABASE_NAME, LocalDatabase } from "./storage";
import { LocalStore } from "./store";
import { RebuildStagingStore } from "./staging";
import { taskStatus, ViewBuilder } from "./view";
import { applyInitialReviewDecision } from "./course-state";

/**
 * The Calendar Export screen reads a projection the View Builder has to produce. It did not: the
 * screen showed "There are no confirmed dates to export yet" whatever the Course contained, because
 * `exportPreview` was only ever set by the screen-fixture module the render tests use, never by the
 * real builder. A render test cannot see that — it supplies its own view — so these tests build the
 * view from a real store.
 *
 * The last test is the one that matters most: what the preview promises and what the export writes
 * come from one input builder, and this is what says so.
 */

const NOW = "2026-09-19T09:00:00.000Z";

const COURSE: CourseRecord = {
  courseId: "course_pm",
  semesterId: "sem_2026s1",
  courseCode: "MA6081",
  courseName: "Fundamentals of Project Management",
  curriculum: true,
  established: true,
  currentRevision: 1,
  consecutiveCheckFailures: 0,
  updatedAt: NOW
};

/** Semester 1 of AY2026/27: Aug–Dec 2026, so a day and month in that window resolves to 2026. */
const SEMESTER: SemesterRecord = {
  semesterId: "sem_2026s1",
  nativeSemesterId: "sem_2026s1",
  label: "AY2026/27 · Semester 1",
  status: "Current",
  discoveredAt: NOW,
  updatedAt: NOW
};

const ASSESSMENT: AssessmentRecord = {
  assessmentId: "assessment_group",
  courseId: COURSE.courseId,
  role: "assessment",
  kind: "project",
  name: "Group Project",
  aliases: [],
  marks: [],
  createdBy: "user",
  createdAt: NOW,
  updatedAt: NOW
};

function fact(overrides: Partial<FactRecord> & { factId: string; field: string }): FactRecord {
  return {
    courseId: COURSE.courseId,
    assessmentId: ASSESSMENT.assessmentId,
    value: { state: "KNOWN", value: "" },
    evidenceRefs: [],
    marks: [],
    updatedAt: NOW,
    ...overrides
  };
}

const deadline = (factId: string, value: unknown): FactRecord =>
  fact({ factId, field: "deadline", value: { state: "KNOWN", value: value as string } });

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
let views: ViewBuilder;

beforeEach(async () => {
  store = await freshStore();
  await store.saveSemester(SEMESTER);
  await store.upsertCourse(COURSE);
  await store.writeDraft({ assessments: [ASSESSMENT] });
  views = new ViewBuilder({
    store,
    productVersion: "0.2.0",
    settings: () =>
      Promise.resolve({
        apiKey: { state: "missing" },
        privacy: false,
        apiUsage: false,
        version: "0.2.0"
      })
  });
});

const previewFor = () =>
  views.build({ surface: "full-page", screen: "CAL-01", courseId: COURSE.courseId });

describe("the Calendar Export screen's projection", () => {
  it("places a day and month in the year the Course's Semester gives it", async () => {
    await store.writeDraft({ facts: [deadline("fact-deadline", "18 Oct")] });
    const view = await previewFor();
    expect(view.exportPreview?.events).toEqual([{ title: "Group Project", date: "2026-10-18" }]);
    expect(view.exportPreview?.dateCount).toBe(1);
    expect(view.exportPreview?.unresolvedCount).toBe(0);
  });

  it("leaves out a date whose value is still competing", async () => {
    // Exporting one side of an unresolved Conflict would pick a date the user has not chosen.
    await store.writeDraft({
      facts: [
        fact({
          factId: "fact-conflicted",
          field: "deadline",
          value: { state: "KNOWN", value: "2026-11-12", competingValues: ["2026-11-19"] }
        })
      ]
    });
    const view = await previewFor();
    expect(view.exportPreview?.events).toEqual([]);
  });

  it("counts a date it cannot place instead of exporting it", async () => {
    await store.writeDraft({ facts: [deadline("fact-week", "Week 8")] });
    const view = await previewFor();
    expect(view.exportPreview?.events).toEqual([]);
    // The Course does hold a date; it just cannot be placed, and the screen has to say so.
    expect(view.exportPreview?.dateCount).toBe(1);
    expect(view.exportPreview?.exportableCount).toBe(0);
    expect(view.exportPreview?.unresolvedCount).toBe(1);
  });

  it("reports a partly placeable Course as both", async () => {
    await store.writeDraft({
      facts: [deadline("fact-oct", "18 Oct"), deadline("fact-week", "Week 8")]
    });
    const view = await previewFor();
    expect(view.exportPreview?.events).toHaveLength(1);
    expect(view.exportPreview?.dateCount).toBe(2);
    expect(view.exportPreview?.exportableCount).toBe(1);
    expect(view.exportPreview?.unresolvedCount).toBe(1);
  });

  it("projects it for that screen only", async () => {
    // The projection reads the whole Course snapshot, so it is built where it is shown and nowhere
    // else; every other screen keeps the cost it had.
    await store.writeDraft({ facts: [deadline("fact-deadline", "18 Oct")] });
    const view = await views.build({
      surface: "full-page",
      screen: "CRS-01",
      courseId: COURSE.courseId
    });
    expect(view.exportPreview).toBeUndefined();
  });

  it("promises exactly the events the export writes", async () => {
    // The cross-layer guard. The preview and the download build their input with the same function,
    // so a screen that lists events while the file is empty — the defect this whole path was
    // rebuilt for — cannot come back without failing here.
    await store.writeDraft({
      facts: [
        deadline("fact-oct", "18 Oct"),
        deadline("fact-dec", "2026-12-03"),
        deadline("fact-week", "Week 8"),
        fact({ factId: "fact-weight", field: "weight", value: { state: "KNOWN", value: "40%" } })
      ]
    });
    const snapshot = await store.readSnapshot(COURSE.courseId);
    const exported = exportCalendar(
      calendarExportInput({ course: COURSE, snapshot, semester: SEMESTER })
    );
    const view = await previewFor();

    expect(view.exportPreview?.events).toEqual(
      exported.events.map((event) => ({ title: event.title, date: event.date }))
    );
    expect(view.exportPreview?.dateCount).toBe(exported.dateCount);
    expect(view.exportPreview?.exportableCount).toBe(exported.exportableCount);
    expect(view.exportPreview?.unresolvedCount).toBe(exported.unresolvedCount);
    // The file carries the resolved dates and the placeable ones only.
    expect(exported.content).toContain("DTSTART;VALUE=DATE:20261018");
    expect(exported.content).not.toContain("Week 8");
    expect(exported.dateCount).toBe(3);
    expect(exported.unresolvedCount).toBe(1);
  });
});

describe("trusted Current Course State projections", () => {
  it("shows a confirmed first draft but not the remaining pending Initial Review draft", async () => {
    const confirmed = {
      ...ASSESSMENT,
      assessmentId: "assessment_confirmed",
      name: "Confirmed Assignment",
      createdBy: "ai" as const
    };
    const pending = {
      ...ASSESSMENT,
      assessmentId: "assessment_pending",
      name: "Pending Exam",
      kind: "exam" as const,
      createdBy: "ai" as const
    };
    const pendingItem: ReviewItemRecord = {
      reviewItemId: "initial_assessment_pending",
      courseId: COURSE.courseId,
      workflowId: "wf-initial",
      kind: "initial",
      targetId: pending.assessmentId,
      payload: { assessmentId: pending.assessmentId },
      createdAt: NOW,
      updatedAt: NOW
    };
    await store.writeDraft({ assessments: [confirmed, pending], reviewItems: [pendingItem] });

    const courseView = await views.build({
      surface: "full-page",
      screen: "CRS-01",
      courseId: COURSE.courseId
    });
    const courseNames = courseView.course?.assessments.map((item) => item.name) ?? [];
    expect(courseNames).toContain("Confirmed Assignment");
    expect(courseNames).not.toContain("Pending Exam");

    const semesterView = await views.build({ surface: "full-page", screen: "SEM-01" });
    const preview = semesterView.semester?.courses
      .find((item) => item.courseId === COURSE.courseId)
      ?.preview.flatMap((group) => group.lines);
    expect(preview?.some((line) => line.includes("Confirmed Assignment"))).toBe(true);
    expect(preview?.some((line) => line.includes("Pending Exam"))).toBe(false);
  });

  it("shows Confirmed but not Excluded Initial Review drafts and preserves exclusion data", async () => {
    const course: CourseRecord = {
      ...COURSE,
      courseId: "course-review-decisions",
      courseCode: "MA6000",
      courseName: "Review Decisions",
      established: false,
      currentRevision: 0
    };
    const draft = (assessmentId: string, name: string): AssessmentRecord => ({
      ...ASSESSMENT,
      assessmentId,
      courseId: course.courseId,
      name,
      createdBy: "ai"
    });
    const confirmed = draft("assessment-a", "Confirmed A");
    const excluded = draft("assessment-b", "Excluded B");
    const review = (assessment: AssessmentRecord): ReviewItemRecord => ({
      reviewItemId: `initial_${assessment.assessmentId}`,
      courseId: course.courseId,
      workflowId: "wf-initial",
      kind: "initial",
      targetId: assessment.assessmentId,
      payload: { assessment, facts: [], proposalKey: assessment.assessmentId },
      createdAt: NOW,
      updatedAt: NOW
    });
    const reviewA = review(confirmed);
    const reviewB = review(excluded);
    await store.upsertCourse(course);
    await store.writeDraft({
      assessments: [confirmed, excluded],
      reviewItems: [reviewA, reviewB]
    });

    const first = await store.readSnapshot(course.courseId);
    if (!first) throw new Error("missing fixture snapshot");
    await store.commitReviewDecision(
      course.courseId,
      reviewA.reviewItemId,
      applyInitialReviewDecision(first, {
        reviewItemId: reviewA.reviewItemId,
        kind: "Confirm",
        assessment: confirmed,
        facts: [],
        expectedRevision: 0,
        now: NOW
      })
    );
    const second = await store.readSnapshot(course.courseId);
    if (!second) throw new Error("missing confirmed snapshot");
    await store.recordExclusion({
      courseId: course.courseId,
      proposalKey: excluded.assessmentId,
      evidenceFingerprint: "synthetic-fingerprint"
    });
    await store.commitReviewDecision(
      course.courseId,
      reviewB.reviewItemId,
      applyInitialReviewDecision(second, {
        reviewItemId: reviewB.reviewItemId,
        kind: "Exclude",
        expectedRevision: 1,
        now: NOW
      })
    );

    const courseView = await views.build({
      surface: "full-page",
      screen: "CRS-01",
      courseId: course.courseId
    });
    expect(courseView.course?.assessments.map((item) => item.name)).toEqual(["Confirmed A"]);
    const semesterView = await views.build({ surface: "full-page", screen: "SEM-01" });
    const card = semesterView.semester?.courses.find((item) => item.courseId === course.courseId);
    const lines = card?.preview.flatMap((group) => group.lines) ?? [];
    expect(lines.some((line) => line.includes("Confirmed A"))).toBe(true);
    expect(lines.some((line) => line.includes("Excluded B"))).toBe(false);

    expect((await store.readCourse(course.courseId))?.established).toBe(true);
    expect((await store.readSnapshot(course.courseId))?.assessments).toContainEqual(excluded);
    expect(await store.readExclusionMemory(course.courseId)).toHaveLength(1);
    expect(await store.readDecisions(course.courseId)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "Confirm", targetId: confirmed.assessmentId }),
        expect.objectContaining({ kind: "Exclude", targetId: excluded.assessmentId })
      ])
    );
  });
});

describe("Rebuild preview projections", () => {
  it("shows workflow-scoped partial staging without replacing trusted Current Course State", async () => {
    const memory = new Map<string, unknown>();
    const staging = new RebuildStagingStore({
      get: (key) => Promise.resolve({ [String(key)]: memory.get(String(key)) }),
      set: (items) => {
        for (const [key, value] of Object.entries(items)) memory.set(key, value);
        return Promise.resolve();
      },
      remove: (key) => {
        memory.delete(String(key));
        return Promise.resolve();
      }
    });
    const workflow: WorkflowRecord = {
      workflowId: "wf-partial-rebuild",
      courseId: COURSE.courseId,
      kind: "rebuild",
      state: "waiting",
      phase: "review",
      phaseCursor: "complete",
      waitingReason: "review",
      attempt: 0,
      baseCourseRevision: COURSE.currentRevision,
      createdAt: NOW,
      updatedAt: NOW
    };
    const stagedAssessment: AssessmentRecord = {
      ...ASSESSMENT,
      assessmentId: "assessment_rebuilt",
      name: "Partial Rebuild Essay",
      createdBy: "ai"
    };
    await store.saveWorkflow(workflow);
    await store.writeDraft({
      observations: [
        {
          observationId: "obs-fetch-failed",
          workflowId: workflow.workflowId,
          sourceId: "source-fetch-failed",
          courseId: COURSE.courseId,
          fetchStatus: "failed",
          parseStatus: "not-attempted",
          comparability: "incomparable",
          errorCode: "NO_EXTRACTABLE_TEXT",
          recordedAt: NOW
        }
      ]
    });
    await staging.write({
      courseId: COURSE.courseId,
      workflowId: workflow.workflowId,
      stagedAt: NOW,
      assessments: [stagedAssessment],
      constraints: [],
      facts: [],
      evidence: [],
      reviewItems: [],
      changes: [],
      taskACoverage: {
        succeededSourceIds: ["source-readable"],
        relevantSourceIds: ["source-readable"],
        failedSources: []
      }
    });
    const rebuiltViews = new ViewBuilder({
      store,
      staging,
      productVersion: "0.2.0",
      settings: () =>
        Promise.resolve({
          apiKey: { state: "valid" },
          privacy: true,
          apiUsage: true,
          version: "0.2.0"
        })
    });

    const view = await rebuiltViews.build({
      surface: "full-page",
      screen: "RBL-02",
      courseId: COURSE.courseId
    });

    expect(view.course?.assessments.map((item) => item.name)).toEqual(["Group Project"]);
    expect(view.rebuildPreview).toMatchObject({
      partial: true,
      failedSourceCount: 1,
      canAdopt: false
    });
    expect(view.rebuildPreview?.course.assessments.map((item) => item.name)).toEqual([
      "Partial Rebuild Essay"
    ]);
  });
});

/**
 * What a Scan screen says about the run behind it.
 *
 * §11.3 keeps `Saved` for a parked, recoverable run and forbids it as a standing visual state, and
 * §11.7 wants Working / Waiting / Failed / Saved told apart. A run that exists and has not been
 * stepped — the first thing the user sees after pressing Scan course — used to fall through to
 * `saved`, so the screen said `Progress saved.` while the Scan was about to work for minutes, and
 * "running" and "stopped" were the same picture. (Gate 3 finding F23.)
 */
describe("what a Scan screen says about its run", () => {
  const workflow = (overrides: Partial<WorkflowRecord>): WorkflowRecord => ({
    workflowId: "wf-1",
    courseId: COURSE.courseId,
    kind: "initial",
    state: "queued",
    phase: "discover",
    phaseCursor: "start",
    attempt: 0,
    baseCourseRevision: 1,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides
  });

  it("shows a run that has not started yet as working, at its first stage", () => {
    expect(taskStatus(workflow({ state: "queued", phase: "discover" }))).toMatchObject({
      state: "working",
      phase: "Finding course content…"
    });
  });

  it("shows a run parked on its retry schedule as the task it still is", () => {
    // `saved` is §5.6.5's persistence state, not a screen state: §11.3 keeps it out of the
    // interface, and a run waiting five minutes to pick itself up is the same task the user
    // started. `Progress saved.` stood for it and is in no product document.
    expect(taskStatus(workflow({ state: "saved", phase: "task-a" }))).toMatchObject({
      state: "working",
      phase: "Understanding course information…"
    });
  });

  it("carries no waiting description for a run whose Scan has finished", () => {
    // §11.7: Waiting on the user has four reasons, all of them things the user supplies. A run
    // waiting for nothing is a Scan that has finished, and §5.4 sends it into the Initial Review.
    const finished = taskStatus(workflow({ state: "waiting", waitingReason: "review" }));
    expect(finished.state).toBe("waiting");
    expect(finished.waiting).toBeUndefined();
  });

  it("gives every reason the user can resolve the action that resolves it", () => {
    // §5.6 draws both Waiting screens with a button. The two authorization reasons drew none: the
    // screen said "Permission required" and offered nowhere to grant it. (Gate 3 finding F24.)
    expect(
      taskStatus(workflow({ state: "waiting", waitingReason: "api-key" })).waiting
    ).toMatchObject({ action: "OpenSettings" });
    expect(
      taskStatus(workflow({ state: "waiting", waitingReason: "host-permission" })).waiting
    ).toMatchObject({ action: "GrantPermission" });
    for (const reason of ["privacy-authorization", "api-usage-authorization"] as const) {
      expect(
        taskStatus(workflow({ state: "waiting", waitingReason: reason })).waiting
      ).toMatchObject({ action: "OpenSettings" });
    }
  });
});
