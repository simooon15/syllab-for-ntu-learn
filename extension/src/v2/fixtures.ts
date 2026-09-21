/**
 * Deterministic, synthetic Course scenarios used by browser E2E acceptance and screenshot
 * capture. Fixtures are written through the real store so the captured screens are produced by
 * the same persistence and view paths the product uses. No real NTU Learn content appears here.
 */
import { randomId } from "./crypto";
import type {
  AssessmentRecord,
  ConstraintRecord,
  ChangeRecord,
  CourseRecord,
  EvidenceRecord,
  FactRecord,
  ReviewItemRecord,
  SemesterRecord,
  SourceRecord,
  WorkflowRecord
} from "./domain";
import type { LocalStore } from "./store";

const NOW = "2026-09-19T09:00:00.000Z";

export type FixtureScenario =
  | "semester-dashboard"
  | "empty-semester"
  | "historical-semester"
  | "course-brief"
  | "no-assessments"
  | "scan-working"
  | "scan-waiting-api-key"
  | "scan-waiting-permission"
  | "scan-failed"
  | "initial-review"
  | "change-review"
  | "conflict-review"
  | "possibly-removed"
  | "identity-uncertain"
  | "rebuild-confirmation"
  | "settings";

export interface FixtureResult {
  courseId?: string;
  workflowId?: string;
  reviewItemIds: string[];
  changeIds: string[];
}

function semester(status: SemesterRecord["status"], label: string, id: string): SemesterRecord {
  return {
    semesterId: id,
    nativeSemesterId: id,
    label,
    status,
    discoveredAt: NOW,
    updatedAt: NOW
  };
}

function course(overrides: Partial<CourseRecord> = {}): CourseRecord {
  return {
    courseId: "course_pm",
    semesterId: "sem_2026s1",
    courseCode: "MA6081",
    courseName: "Fundamentals of Project Management",
    curriculum: true,
    established: true,
    currentRevision: 3,
    lastSuccessfulCheckAt: NOW,
    consecutiveCheckFailures: 0,
    unchangedStreak: 1,
    updatedAt: NOW,
    ...overrides
  };
}

function assessment(overrides: Partial<AssessmentRecord>): AssessmentRecord {
  return {
    assessmentId: "assessment_placeholder",
    courseId: "course_pm",
    role: "assessment",
    kind: "other",
    name: "Assessment",
    aliases: [],
    marks: [],
    createdBy: "ai",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides
  };
}

function fact(overrides: Partial<FactRecord> & { factId: string; field: string }): FactRecord {
  return {
    courseId: "course_pm",
    assessmentId: "assessment_individual",
    value: { state: "KNOWN", value: "" },
    evidenceRefs: [],
    marks: [],
    updatedAt: NOW,
    ...overrides
  };
}

function source(sourceId: string, title: string, kind: string): SourceRecord {
  return {
    sourceId,
    courseId: "course_pm",
    nativeItemId: sourceId,
    kind,
    title,
    updatedAt: NOW
  };
}

function evidence(
  evidenceId: string,
  sourceId: string,
  locator: string,
  excerpt: string
): EvidenceRecord {
  return {
    evidenceId,
    courseId: "course_pm",
    sourceId,
    locator,
    excerpt,
    capturedAt: NOW
  };
}

const EVIDENCE = [
  evidence("ev-ia", "src-guide", "p.2", "Individual Assignment 30% due 18 October"),
  evidence(
    "ev-gp",
    "src-guide",
    "p.3",
    "Group Project 40%, written report and presentation, due 12 November"
  ),
  evidence("ev-quiz", "src-guide", "p.4", "Six quizzes, best four count"),
  evidence("ev-exam", "src-guide", "p.5", "Final Exam 30%"),
  evidence("ev-late", "src-guide", "p.7", "Late submissions lose 10% per day")
];

function sources(): SourceRecord[] {
  return [
    source("src-guide", "Course Guide", "attachment"),
    source("src-quizzes", "Quizzes", "course-content-item")
  ];
}

function assessments(): AssessmentRecord[] {
  return [
    assessment({
      assessmentId: "assessment_individual",
      kind: "assignment",
      name: "Individual Assignment"
    }),
    assessment({ assessmentId: "assessment_group", kind: "project", name: "Group Project" }),
    assessment({
      assessmentId: "assessment_report",
      parentAssessmentId: "assessment_group",
      role: "component",
      kind: "project",
      name: "Written Report"
    }),
    assessment({
      assessmentId: "assessment_presentation",
      parentAssessmentId: "assessment_group",
      role: "component",
      kind: "project",
      name: "Presentation"
    }),
    assessment({
      assessmentId: "assessment_quizzes",
      role: "series",
      kind: "quiz_test",
      name: "Quizzes"
    }),
    assessment({
      assessmentId: "assessment_quiz_1",
      parentAssessmentId: "assessment_quizzes",
      role: "series_instance",
      kind: "quiz_test",
      name: "Quiz 1"
    }),
    assessment({
      assessmentId: "assessment_quiz_2",
      parentAssessmentId: "assessment_quizzes",
      role: "series_instance",
      kind: "quiz_test",
      name: "Quiz 2"
    }),
    assessment({ assessmentId: "assessment_exam", kind: "exam", name: "Final Exam" })
  ];
}

function facts(extra: FactRecord[] = []): FactRecord[] {
  return [
    fact({
      factId: "fact-ia-weight",
      field: "weight",
      assessmentId: "assessment_individual",
      value: { state: "KNOWN", value: "30%" },
      evidenceRefs: [{ sourceId: "src-guide", locator: "p.2", evidenceId: "ev-ia" }]
    }),
    fact({
      factId: "fact-ia-deadline",
      field: "deadline",
      assessmentId: "assessment_individual",
      value: { state: "KNOWN", value: "18 Oct" },
      evidenceRefs: [{ sourceId: "src-guide", locator: "p.2", evidenceId: "ev-ia" }]
    }),
    fact({
      factId: "fact-gp-weight",
      field: "weight",
      assessmentId: "assessment_group",
      value: { state: "KNOWN", value: "40%" },
      evidenceRefs: [{ sourceId: "src-guide", locator: "p.3", evidenceId: "ev-gp" }]
    }),
    fact({
      factId: "fact-gp-deadline",
      field: "deadline",
      assessmentId: "assessment_group",
      value: { state: "KNOWN", value: "12 Nov" },
      evidenceRefs: [{ sourceId: "src-guide", locator: "p.3", evidenceId: "ev-gp" }]
    }),
    fact({
      factId: "fact-gp-group-size",
      field: "group_size",
      assessmentId: "assessment_group",
      value: { state: "KNOWN", value: "Group of 4–5" },
      evidenceRefs: [{ sourceId: "src-guide", locator: "p.3", evidenceId: "ev-gp" }]
    }),
    fact({
      factId: "fact-gp-requirement",
      field: "requirement",
      assessmentId: "assessment_group",
      value: {
        state: "KNOWN",
        value: "Submit a written report and present it in the final session."
      },
      evidenceRefs: [{ sourceId: "src-guide", locator: "p.3", evidenceId: "ev-gp" }]
    }),
    fact({
      factId: "fact-report-weight",
      field: "weight",
      assessmentId: "assessment_report",
      value: { state: "KNOWN", value: "25%" },
      evidenceRefs: [{ sourceId: "src-guide", locator: "p.3", evidenceId: "ev-gp" }]
    }),
    fact({
      factId: "fact-report-deadline",
      field: "deadline",
      assessmentId: "assessment_report",
      value: { state: "KNOWN", value: "18 Oct" },
      evidenceRefs: [{ sourceId: "src-guide", locator: "p.3", evidenceId: "ev-gp" }]
    }),
    fact({
      factId: "fact-presentation-weight",
      field: "weight",
      assessmentId: "assessment_presentation",
      value: { state: "KNOWN", value: "15%" },
      evidenceRefs: [{ sourceId: "src-guide", locator: "p.3", evidenceId: "ev-gp" }]
    }),
    fact({
      factId: "fact-presentation-deadline",
      field: "deadline",
      assessmentId: "assessment_presentation",
      value: { state: "KNOWN", value: "25 Oct" },
      evidenceRefs: [{ sourceId: "src-guide", locator: "p.3", evidenceId: "ev-gp" }]
    }),
    fact({
      factId: "fact-quiz-weight",
      field: "weight",
      assessmentId: "assessment_quizzes",
      value: { state: "KNOWN", value: "20%" },
      evidenceRefs: [{ sourceId: "src-guide", locator: "p.4", evidenceId: "ev-quiz" }]
    }),
    fact({
      factId: "fact-quiz-note",
      field: "requirement",
      assessmentId: "assessment_quizzes",
      value: { state: "KNOWN", value: "Six quizzes across the term; the best four count." },
      evidenceRefs: [{ sourceId: "src-guide", locator: "p.4", evidenceId: "ev-quiz" }]
    }),
    fact({
      factId: "fact-quiz-1-date",
      field: "date",
      assessmentId: "assessment_quiz_1",
      value: { state: "KNOWN", value: "12 Sep" },
      evidenceRefs: [{ sourceId: "src-quizzes", locator: "line 2", evidenceId: "ev-quiz" }]
    }),
    fact({
      factId: "fact-quiz-2-date",
      field: "date",
      assessmentId: "assessment_quiz_2",
      value: { state: "KNOWN", value: "26 Sep" },
      evidenceRefs: [{ sourceId: "src-quizzes", locator: "line 3", evidenceId: "ev-quiz" }]
    }),
    fact({
      factId: "fact-exam-weight",
      field: "weight",
      assessmentId: "assessment_exam",
      value: { state: "KNOWN", value: "30%" },
      evidenceRefs: [{ sourceId: "src-guide", locator: "p.5", evidenceId: "ev-exam" }]
    }),
    fact({
      factId: "fact-exam-date",
      field: "date",
      assessmentId: "assessment_exam",
      value: { state: "EXPLICITLY_UNKNOWN" },
      evidenceRefs: [{ sourceId: "src-guide", locator: "p.5", evidenceId: "ev-exam" }]
    }),
    ...extra
  ];
}

function constraints(): ConstraintRecord[] {
  return [
    {
      constraintId: "constraint_late",
      courseId: "course_pm",
      content: "Late submissions lose 10% per day.",
      evidenceRefs: [{ sourceId: "src-guide", locator: "p.7", evidenceId: "ev-late" }],
      marks: [],
      createdBy: "ai",
      updatedAt: NOW
    }
  ];
}

const WORKFLOW_BASE: Omit<WorkflowRecord, "workflowId" | "kind" | "state" | "phase"> = {
  courseId: "course_pm",
  phaseCursor: "start",
  attempt: 0,
  baseCourseRevision: 3,
  createdAt: NOW,
  updatedAt: NOW
};

function workflow(overrides: Partial<WorkflowRecord>): WorkflowRecord {
  return {
    ...WORKFLOW_BASE,
    workflowId: "wf_fixture",
    kind: "initial",
    state: "working",
    phase: "fetch",
    ...overrides
  };
}

function reviewItem(overrides: Partial<ReviewItemRecord>): ReviewItemRecord {
  return {
    reviewItemId: "review_fixture",
    courseId: "course_pm",
    workflowId: "wf_fixture",
    kind: "initial",
    targetId: "assessment_individual",
    payload: {},
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides
  };
}

type ChangeOverrides = Omit<Partial<ChangeRecord>, "field" | "currentValue" | "latestValue"> & {
  field?: string | undefined;
  currentValue?: ChangeRecord["currentValue"] | undefined;
  latestValue?: ChangeRecord["latestValue"] | undefined;
};

/** Explicit `undefined` removes an optional key, so a fixture can model "no value at all". */
function change(overrides: ChangeOverrides): ChangeRecord {
  const base: ChangeRecord = {
    changeId: "change_fixture",
    courseId: "course_pm",
    workflowId: "wf_fixture",
    targetId: "assessment_group",
    field: "deadline",
    changeType: "CHANGED",
    currentValue: { state: "KNOWN", value: "10 Oct" },
    latestValue: { state: "KNOWN", value: "18 Oct" },
    currentEvidenceIds: ["ev-gp"],
    newEvidenceIds: ["ev-gp"],
    createdAt: NOW,
    updatedAt: NOW
  };
  return Object.fromEntries([
    ...Object.entries(base).filter(([key]) => !(key in overrides)),
    ...Object.entries(overrides).filter(([, value]) => value !== undefined)
  ]) as ChangeRecord;
}

/**
 * Writes one scenario and returns the ids the caller needs to route to the right screen.
 */
export async function applyFixture(
  store: LocalStore,
  scenario: FixtureScenario
): Promise<FixtureResult> {
  const currentSemester = semester("Current", "AY2026/27 · Semester 1", "sem_2026s1");
  const historical = semester("Historical", "AY2025/26 · Semester 2", "sem_2025s2");

  if (scenario === "empty-semester") {
    // Only the empty semester is Current, so the scenario is genuinely "No courses found yet"
    // even when an earlier scenario in the same run already wrote a Course. Any semester that was
    // Current before becomes Historical, exactly as the real rollover does.
    for (const existing of await store.readSemesters()) {
      if (existing.status === "Current") {
        await store.saveSemester({ ...existing, status: "Historical", updatedAt: NOW });
      }
    }
    // A rollover lands on the NEXT semester, so it gets its own label. Reusing the previous
    // semester's label left two semesters named "AY2026/27 · Semester 1" in the store, and the
    // Backup summary then listed the same line twice — which reads as duplicated data.
    await store.saveSemester(semester("Current", "AY2026/27 · Semester 2", "sem_2026s2"));
    await store.saveSemester(historical);
    return { reviewItemIds: [], changeIds: [] };
  }

  await store.saveSemester(currentSemester);
  await store.saveSemester(historical);
  await store.upsertCourse(course());
  await store.writeDraft({ sources: sources() });
  await store.writeDraft({ evidence: EVIDENCE });
  await store.writeDraft({
    assessments: assessments(),
    facts: facts(),
    constraints: constraints()
  });

  // Each scenario is self-contained: acceptance runs several in one profile, and a pending
  // decision left behind by an earlier scenario would otherwise leak into the next one.
  await store.replaceCourseDecisions("course_pm", {
    changes: [],
    reviewItems: [],
    decisions: [],
    history: []
  });

  if (scenario === "historical-semester") {
    await store.upsertCourse(
      course({
        courseId: "course_hist",
        semesterId: historical.semesterId,
        courseCode: "MA5001",
        courseName: "Applied Statistics",
        established: true
      })
    );
    return { courseId: "course_pm", reviewItemIds: [], changeIds: [] };
  }

  if (scenario === "semester-dashboard") {
    await store.upsertCourse(
      course({
        courseId: "course_unestablished",
        courseCode: "MA6082",
        courseName: "Operations Research",
        established: false,
        currentRevision: 0
      })
    );
    return { reviewItemIds: [], changeIds: [] };
  }

  if (scenario === "no-assessments") {
    await store.upsertCourse(
      course({ courseId: "course_empty", courseCode: "MA6099", courseName: "Research Seminar" })
    );
    return { courseId: "course_empty", reviewItemIds: [], changeIds: [] };
  }

  if (scenario === "scan-working") {
    const record = workflow({ state: "working", phase: "task-a", kind: "initial" });
    await store.saveWorkflow(record);
    return {
      courseId: record.courseId,
      workflowId: record.workflowId,
      reviewItemIds: [],
      changeIds: []
    };
  }

  if (scenario === "scan-waiting-api-key") {
    const record = workflow({ state: "waiting", phase: "task-a", waitingReason: "api-key" });
    await store.saveWorkflow(record);
    return {
      courseId: record.courseId,
      workflowId: record.workflowId,
      reviewItemIds: [],
      changeIds: []
    };
  }

  if (scenario === "scan-waiting-permission") {
    // The other waiting reason: host permission or content authorization is missing.
    const record = workflow({ state: "waiting", phase: "fetch", waitingReason: "host-permission" });
    await store.saveWorkflow(record);
    return {
      courseId: record.courseId,
      workflowId: record.workflowId,
      reviewItemIds: [],
      changeIds: []
    };
  }

  if (scenario === "scan-failed") {
    const record = workflow({
      state: "failed",
      phase: "fetch",
      errorCode: "NETWORK_TRANSIENT",
      lastErrorDetail: "Syllab could not reach NTU Learn.",
      paidRetryAvailable: false,
      retryConsumesApi: false
    });
    await store.saveWorkflow(record);
    return {
      courseId: record.courseId,
      workflowId: record.workflowId,
      reviewItemIds: [],
      changeIds: []
    };
  }

  if (scenario === "rebuild-confirmation") {
    const record = workflow({ state: "waiting", phase: "review", kind: "rebuild" });
    await store.saveWorkflow(record);
    return {
      courseId: record.courseId,
      workflowId: record.workflowId,
      reviewItemIds: [],
      changeIds: []
    };
  }

  if (scenario === "initial-review") {
    const items = [0, 1, 2].map((index) => {
      const targetId =
        ["assessment_group", "assessment_individual", "assessment_exam"][index] ??
        "assessment_group";
      return reviewItem({
        reviewItemId: `review_${String(index)}`,
        targetId,
        // Shaped exactly like the engine's own Initial Review item, so the view projects it the
        // same way a real scan would.
        payload: {
          assessmentId: targetId,
          proposalKey: targetId,
          facts: facts()
            .filter((item) => item.assessmentId === targetId)
            .map((item) => item.factId)
        }
      });
    });
    await store.writeDraft({ reviewItems: items });
    return {
      courseId: "course_pm",
      workflowId: "wf_fixture",
      reviewItemIds: items.map((item) => item.reviewItemId),
      changeIds: []
    };
  }

  if (scenario === "change-review") {
    const record = change({});
    await store.writeDraft({ changes: [record] });
    return {
      courseId: "course_pm",
      workflowId: "wf_fixture",
      reviewItemIds: [],
      changeIds: [record.changeId]
    };
  }

  if (scenario === "conflict-review") {
    const record = change({
      changeId: "change_conflict",
      changeType: "CONFLICT",
      latestValue: { state: "KNOWN", value: "18 Oct", competingValues: ["18 Oct", "20 Oct"] }
    });
    await store.writeDraft({ changes: [record] });
    return {
      courseId: "course_pm",
      workflowId: "wf_fixture",
      reviewItemIds: [],
      changeIds: [record.changeId]
    };
  }

  if (scenario === "possibly-removed") {
    const record = change({
      changeId: "change_removed",
      changeType: "POSSIBLY_REMOVED",
      field: undefined,
      currentValue: undefined,
      latestValue: undefined
    });
    await store.writeDraft({ changes: [record] });
    return {
      courseId: "course_pm",
      workflowId: "wf_fixture",
      reviewItemIds: [],
      changeIds: [record.changeId]
    };
  }

  if (scenario === "identity-uncertain") {
    const record = change({
      changeId: "change_identity",
      changeType: "IDENTITY_UNCERTAIN",
      field: undefined,
      currentValue: undefined,
      latestValue: undefined
    });
    await store.writeDraft({ changes: [record] });
    return {
      courseId: "course_pm",
      workflowId: "wf_fixture",
      reviewItemIds: [],
      changeIds: [record.changeId]
    };
  }

  return { courseId: "course_pm", reviewItemIds: [], changeIds: [] };
}

export const FIXTURE_COURSE_ID = "course_pm";
export const FIXTURE_UNESTABLISHED_COURSE_ID = "course_unestablished";
export const FIXTURE_GENERATED_AT = NOW;
export const FIXTURE_RUN_ID = randomId("fixture");
