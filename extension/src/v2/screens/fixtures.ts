import { t } from "../copy";
import type {
  AppView,
  ScreenId,
  AssessmentCardView,
  CourseView,
  EvidenceView,
  FactView,
  ReviewItemView,
  SemesterCourseCardView,
  SemesterView,
  StatusCue,
  TaskStatusView
} from "../contract";
import type { HintKey, RuntimeState, UiState } from "./patterns";

/**
 * Synthetic AppViews for the render tests and for later screenshot automation. They are
 * shapes only: no real course content, no secrets, and every state the product defines.
 */

export function evidence(
  evidenceId: string,
  sourceTitle = "Course Guide",
  locator = "p.6",
  excerpt = "Submission is due on 18 October."
): EvidenceView {
  return { evidenceId, sourceTitle, locator, excerpt };
}

export function fact(overrides: Partial<FactView> & { factId: string }): FactView {
  return {
    field: "deadline",
    label: "Deadline",
    display: "18 Oct",
    knowledge: "KNOWN" as const,
    evidence: [evidence(`e-${overrides.factId}`)],
    editable: true,
    ...overrides
  };
}

export function assessment(
  overrides: Partial<AssessmentCardView> & { assessmentId: string }
): AssessmentCardView {
  return {
    name: "Assessment",
    kind: "assignment",
    kindGroup: "Assignments",
    marks: [],
    summary: [],
    requirements: [],
    components: [],
    seriesInstances: [],
    unresolvedQuestions: [],
    facts: [],
    ...overrides
  };
}

/** A Course with two components of grouping: order, nesting, series, marks and constraints. */
export const courseView: CourseView = {
  courseId: "course-1",
  courseCode: "MA6081",
  courseName: "Fundamentals of Project Management",
  established: true,
  revision: 7,
  status: [
    { kind: "pending-review", count: 2, copy: "2 to review" },
    { kind: "freshness", copy: "Checked 2h ago" }
  ],
  freshness: "Checked 2h ago",
  assessments: [
    assessment({
      assessmentId: "a-exam",
      name: "Final Exam",
      kind: "exam",
      kindGroup: "Exams",
      facts: [
        fact({ factId: "f-exam-date", field: "exam_date", label: "Exam date", display: "3 Dec" })
      ]
    }),
    assessment({
      assessmentId: "a-quizzes",
      name: "Quizzes",
      kind: "quiz_test",
      kindGroup: "Quizzes & Tests",
      seriesNote: "3 instances",
      seriesInstances: [
        { name: "Quiz 1", summary: ["12 Sep"] },
        { name: "Quiz 2", summary: ["26 Sep"] }
      ],
      facts: [fact({ factId: "f-quiz-weight", field: "weight", label: "Weight", display: "20%" })]
    }),
    assessment({
      assessmentId: "a-project",
      name: "Group Project",
      kind: "project",
      kindGroup: "Projects",
      marks: ["PossiblyRemoved"],
      components: [
        assessment({
          assessmentId: "a-project-report",
          name: "Written Report",
          kind: "project",
          kindGroup: "Projects",
          facts: [
            fact({ factId: "f-report-weight", field: "weight", label: "Weight", display: "25%" })
          ]
        })
      ],
      facts: [
        fact({ factId: "f-project-deadline", label: "Deadline", display: "12 Nov" }),
        fact({
          factId: "f-project-weight",
          field: "weight",
          label: "Weight",
          display: "40%",
          mark: "Changed"
        }),
        fact({
          factId: "f-project-size",
          field: "group_size",
          label: "Group size",
          display: "4–5",
          knowledge: "UNCERTAIN",
          evidence: []
        })
      ]
    }),
    assessment({
      assessmentId: "a-individual",
      name: "Individual Assignment",
      kind: "assignment",
      kindGroup: "Assignments",
      facts: [
        fact({ factId: "f-ind-weight", field: "weight", label: "Weight", display: "30%" }),
        fact({
          factId: "f-ind-requirement",
          field: "requirement",
          label: "Requirement",
          display:
            "Submit a written report of 2,000 words with a full reference list, plus a ten-minute presentation with slides. The report is marked on structure, evidence and clarity of argument, and the presentation is marked on delivery and how well the questions are answered.",
          mark: "Edited",
          evidence: []
        })
      ]
    }),
    assessment({
      assessmentId: "a-zeta",
      name: "Zeta Assignment",
      kind: "assignment",
      kindGroup: "Assignments",
      facts: []
    }),
    assessment({
      assessmentId: "a-attendance",
      name: "Attendance",
      kind: "other",
      kindGroup: "Other",
      facts: []
    })
  ],
  constraints: [
    {
      constraintId: "c-late",
      content: "Late submissions lose 10% per day.",
      marks: [],
      evidence: [evidence("e-late", "Course Guide", "p.4", "Ten percent is deducted for each day.")]
    }
  ],
  noAssessments: false,
  more: { addAssessment: true, checkForUpdates: true, exportCalendar: true, rebuildCourse: true }
};

export function courseCard(
  overrides: Partial<SemesterCourseCardView> = {}
): SemesterCourseCardView {
  return {
    courseId: "course-1",
    courseCode: "MA6081",
    courseName: "Fundamentals of Project Management",
    established: true,
    preview: [{ group: "Assignments", lines: ["Individual Assignment · 30% · 18 Oct"] }],
    moreAssessments: 2,
    status: [{ kind: "pending-review", count: 2, copy: "2 to review" }],
    ...overrides
  };
}

export const currentSemester: SemesterView = {
  semesterId: "sem-1",
  label: "AY2026/27 · Semester 1",
  lifecycle: "Current",
  courses: [
    courseCard(),
    courseCard({
      courseId: "course-2",
      courseCode: "MA6082",
      courseName: "Synthetic Seminar",
      established: false,
      preview: [],
      status: []
    })
  ],
  status: [{ kind: "checking", copy: "Checking courses…" }],
  empty: false,
  switcherOptions: [
    { semesterId: "sem-1", label: "AY2026/27 · Semester 1", lifecycle: "Current" },
    { semesterId: "sem-0", label: "AY2025/26 · Semester 2", lifecycle: "Historical" }
  ]
};

export const historicalSemester: SemesterView = {
  ...currentSemester,
  semesterId: "sem-0",
  label: "AY2025/26 · Semester 2",
  lifecycle: "Historical",
  status: [],
  courses: [courseCard({ courseId: "course-3", courseCode: "MA5001", courseName: "Past Course" })]
};

export function taskStatus(
  overrides: Partial<TaskStatusView> & { state: TaskStatusView["state"] }
): TaskStatusView {
  return { workflowId: "wf-1", ...overrides };
}

export function reviewItem(
  overrides: Partial<ReviewItemView> & { reviewItemId: string }
): ReviewItemView {
  return {
    kind: "initial",
    title: "Group Project",
    position: { index: 2, total: 5 },
    unresolvedQuestions: [],
    actions: ["Confirm", "Edit", "Exclude", "ReviewLater", "SameAssessmentAs", "Split"],
    ...overrides
  };
}

const initialReview: ReviewItemView = reviewItem({ reviewItemId: "ri-initial" });

const changeReview: ReviewItemView = reviewItem({
  reviewItemId: "ri-changed",
  kind: "change",
  changeType: "CHANGED",
  title: "Group Project",
  current: { label: "Current", values: [{ display: "10 Oct", evidence: [evidence("e-cur")] }] },
  latest: { label: "Latest", values: [{ display: "18 Oct", evidence: [evidence("e-new")] }] },
  actions: ["AcceptChange", "KeepCurrent"]
});

export const conflictReview: ReviewItemView = reviewItem({
  reviewItemId: "ri-conflict",
  kind: "change",
  changeType: "CONFLICT",
  title: "Group Project",
  current: { label: "Current", values: [{ display: "10 Oct", evidence: [evidence("e-cur")] }] },
  latest: {
    label: "Other values",
    values: [
      { display: "18 Oct", evidence: [evidence("e-new")] },
      { display: "20 Oct", evidence: [evidence("e-newer")] }
    ]
  },
  actions: ["ChooseValue", "EditValue"]
});

const removedReview: ReviewItemView = reviewItem({
  reviewItemId: "ri-removed",
  kind: "change",
  changeType: "POSSIBLY_REMOVED",
  title: "Group Project",
  actions: ["Keep", "Remove"]
});

const identityReview: ReviewItemView = reviewItem({
  reviewItemId: "ri-identity",
  kind: "identity",
  changeType: "IDENTITY_UNCERTAIN",
  title: "Group Project",
  current: { label: "Current", values: [{ display: "Group Project", evidence: [] }] },
  latest: { label: "Latest", values: [{ display: "Final Group Project", evidence: [] }] },
  actions: ["SameAssessment", "DifferentAssessment"]
});

const newReview: ReviewItemView = reviewItem({
  reviewItemId: "ri-new",
  kind: "change",
  changeType: "NEW",
  title: "Peer Review",
  actions: ["Confirm", "Exclude"]
});

export const settingsView: NonNullable<AppView["settings"]> = {
  apiKey: { state: "invalid", maskedSuffix: "abcd" },
  privacy: true,
  apiUsage: false,
  version: "0.2.0"
};

export interface Fixture {
  name: string;
  /** The id the top-level screen element must carry for this state. */
  screen: ScreenId;
  /** Screen ids this state embeds: another screen's state, or a light feedback marker. */
  embedded?: ScreenId[];
  view: AppView;
  /** Local screen state this state is reached through, when it needs one. */
  ui?: Partial<UiState>;
  runtime?: Partial<RuntimeState>;
  hints?: Partial<Record<HintKey, boolean>>;
}

export function fixtureView(screen: AppView["screen"], overrides: Partial<AppView> = {}): AppView {
  return { surface: "full-page", screen, ...overrides };
}

function withCourse(screen: AppView["screen"], surface: AppView["surface"] = "full-page"): AppView {
  return {
    surface,
    screen,
    courseId: "course-1",
    course: courseView,
    semester: currentSemester,
    settings: settingsView
  };
}

const failedTask: TaskStatusView = taskStatus({
  state: "failed",
  failure: {
    copy: "The course sources could not be read.",
    retryable: true,
    consumesApi: false,
    errorCode: "SOURCE_ACCESS"
  }
});

/** Every screen and important state, in Spec order. */
export function allFixtures(): Fixture[] {
  return [
    {
      name: "SEM-01",
      screen: "SEM-01",
      view: fixtureView("SEM-01", { semester: currentSemester, settings: settingsView })
    },
    {
      name: "SEM-02",
      screen: "SEM-02",
      view: fixtureView("SEM-02", {
        surface: "side-panel",
        semester: currentSemester,
        settings: settingsView
      })
    },
    {
      name: "SEM-03",
      screen: "SEM-03",
      view: fixtureView("SEM-03", { semester: currentSemester })
    },
    {
      name: "SEM-04",
      screen: "SEM-04",
      view: fixtureView("SEM-04", { semester: historicalSemester })
    },
    {
      name: "SEM-05",
      screen: "SEM-05",
      view: fixtureView("SEM-05", { surface: "side-panel", semester: historicalSemester })
    },
    {
      name: "SEM-06",
      screen: "SEM-06",
      view: fixtureView("SEM-01", {
        semester: { ...currentSemester, courses: [], empty: true, status: [] }
      })
    },
    {
      name: "SEM-07",
      screen: "SEM-07",
      view: fixtureView("SEM-07", { semester: currentSemester, courseId: "course-2" })
    },
    {
      name: "ISC-01",
      screen: "ISC-01",
      view: fixtureView("ISC-01", { semester: currentSemester, courseId: "course-2" })
    },
    {
      name: "ISC-02",
      screen: "ISC-02",
      view: fixtureView("ISC-02", {
        courseId: "course-2",
        course: {
          ...courseView,
          established: false,
          assessments: [],
          constraints: [],
          noAssessments: true
        },
        task: taskStatus({ state: "working", phase: "Reading course materials…" })
      })
    },
    {
      name: "ISC-03",
      screen: "ISC-03",
      view: fixtureView("ISC-03", {
        courseId: "course-2",
        task: taskStatus({
          state: "waiting",
          waiting: { reason: "api-key", copy: "DeepSeek API key required", action: "OpenSettings" }
        })
      })
    },
    {
      name: "ISC-04",
      screen: "ISC-04",
      view: fixtureView("ISC-04", {
        courseId: "course-2",
        task: taskStatus({
          state: "waiting",
          waiting: {
            reason: "host-permission",
            copy: "Permission required",
            action: "GrantPermission"
          }
        })
      })
    },
    {
      name: "ISC-05",
      screen: "ISC-05",
      view: fixtureView("ISC-05", { courseId: "course-2", task: failedTask })
    },
    {
      name: "ISC-06",
      screen: "ISC-06",
      view: fixtureView("ISC-06", { courseId: "course-2", task: failedTask })
    },
    {
      name: "CRS-01",
      screen: "CRS-01",
      view: withCourse("CRS-01")
    },
    {
      name: "CRS-02",
      screen: "CRS-02",
      view: withCourse("CRS-02", "side-panel")
    },
    {
      name: "CRS-03",
      screen: "CRS-03",
      view: withCourse("CRS-03")
    },
    {
      name: "CRS-04",
      screen: "CRS-04",
      view: withCourse("CRS-04")
    },
    {
      name: "CRS-06",
      screen: "CRS-06",
      view: {
        surface: "full-page",
        screen: "CRS-01",
        courseId: "course-1",
        semester: currentSemester,
        settings: settingsView,
        course: { ...courseView, assessments: [], constraints: [], noAssessments: true }
      }
    },
    {
      name: "IRV-01",
      screen: "IRV-01",
      view: { ...withCourse("IRV-01"), review: initialReview },
      hints: { split: true, "same-assessment-as": true }
    },
    {
      name: "IRV-01 (new assessment)",
      screen: "CRV-02",
      view: { ...withCourse("IRV-01"), review: newReview },
      hints: { split: true }
    },
    {
      name: "IRV-02",
      screen: "IRV-02",
      view: { ...withCourse("IRV-02"), review: initialReview },
      hints: { split: true }
    },
    {
      name: "IRV-03",
      screen: "IRV-03",
      embedded: ["IRV-05"],
      view: { ...withCourse("IRV-01"), review: initialReview },
      ui: { mergeOpen: true },
      hints: {}
    },
    {
      name: "IRV-04",
      screen: "IRV-04",
      embedded: ["IRV-05"],
      view: { ...withCourse("IRV-01"), review: initialReview },
      ui: { splitOpen: true },
      hints: {}
    },
    {
      name: "IRV-06 (notice)",
      screen: "IRV-01",
      embedded: ["IRV-06"],
      view: { ...withCourse("IRV-01"), review: initialReview },
      runtime: {
        notice: {
          screen: "IRV-06",
          message: t("toastExcluded"),
          actionLabel: t("undo")
        }
      }
    },
    {
      name: "CRV-01",
      screen: "CRV-01",
      view: { ...withCourse("CRV-01"), review: changeReview }
    },
    {
      name: "CRV-02",
      screen: "CRV-02",
      view: { ...withCourse("CRV-02"), review: newReview }
    },
    {
      name: "CRV-03",
      screen: "CRV-03",
      view: { ...withCourse("CRV-03"), review: conflictReview }
    },
    {
      name: "CRV-04",
      screen: "CRV-04",
      view: { ...withCourse("CRV-04"), review: removedReview }
    },
    {
      name: "CRV-05",
      screen: "CRV-05",
      view: { ...withCourse("CRV-05"), review: identityReview }
    },
    {
      name: "CRV-06 (notice)",
      screen: "CRS-01",
      embedded: ["CRV-06"],
      view: withCourse("CRS-01"),
      runtime: { notice: { screen: "CRV-06", message: t("toastReviewComplete") } }
    },
    {
      name: "RBL-01",
      screen: "RBL-01",
      view: withCourse("CRS-01"),
      ui: { rebuildConfirmOpen: true }
    },
    {
      name: "RBL-02",
      screen: "RBL-02",
      view: {
        ...withCourse("RBL-02"),
        task: taskStatus({ state: "working", phase: "Organizing assessments…" })
      }
    },
    {
      name: "RBL-03",
      screen: "RBL-03",
      view: withCourse("RBL-03")
    },
    {
      name: "RBL-04",
      screen: "RBL-04",
      view: { ...withCourse("RBL-04"), task: failedTask }
    },
    {
      name: "CAL-01",
      screen: "CAL-01",
      view: {
        ...withCourse("CAL-01"),
        exportPreview: {
          events: [
            { title: "Individual Assignment", date: "2026-10-18" },
            { title: "Group Project", date: "2026-11-12" }
          ],
          dateCount: 2,
          exportableCount: 2,
          unresolvedCount: 0
        }
      }
    },
    {
      name: "CAL-02 (notice)",
      screen: "CAL-01",
      embedded: ["CAL-02"],
      view: withCourse("CAL-01"),
      runtime: { notice: { screen: "CAL-02", message: t("calendarExported") } }
    },
    {
      name: "SET-01",
      screen: "SET-01",
      embedded: ["SET-02", "SET-03", "SET-04", "SET-05", "BKP-01"],
      view: fixtureView("SET-01", { settings: settingsView, semester: currentSemester })
    },
    {
      name: "SET-02",
      screen: "SET-01",
      embedded: ["SET-02"],
      view: fixtureView("SET-02", { settings: settingsView })
    },
    {
      name: "SET-03",
      screen: "SET-01",
      embedded: ["SET-03"],
      view: fixtureView("SET-03", { settings: settingsView })
    },
    {
      name: "SET-04",
      screen: "SET-01",
      embedded: ["SET-04"],
      view: fixtureView("SET-04", { settings: settingsView })
    },
    {
      name: "SET-05",
      screen: "SET-01",
      embedded: ["SET-05"],
      view: fixtureView("SET-05", { settings: settingsView })
    },
    {
      name: "BKP-01",
      screen: "SET-01",
      embedded: ["BKP-01"],
      view: fixtureView("BKP-01", { settings: settingsView })
    },
    {
      name: "BKP-02",
      screen: "SET-01",
      embedded: ["BKP-02"],
      view: fixtureView("SET-01", {
        settings: settingsView,
        backupSummary: {
          semesters: ["AY2025/26 · Semester 2"],
          courseCount: 8,
          assessmentCount: 27
        }
      })
    },
    {
      name: "BKP-03",
      screen: "BKP-03",
      view: fixtureView("BKP-03", { settings: settingsView }),
      runtime: { restoreStage: 1 }
    },
    {
      name: "BKP-04",
      screen: "BKP-04",
      view: fixtureView("BKP-04", { settings: settingsView }),
      runtime: { error: { code: "INTEGRITY", copy: t("restoreFailedTitle") } }
    },
    {
      name: "SYS-01 (attention detail)",
      screen: "CRS-01",
      view: {
        ...withCourse("CRS-01"),
        course: {
          ...courseView,
          status: [
            {
              kind: "needs-attention" as const,
              copy: "Needs attention",
              detail: "Last successful check: 8 Sep"
            }
          ]
        }
      },
      ui: { attentionOpen: true }
    },
    {
      name: "SYS-01 (checking)",
      screen: "CRS-01",
      view: {
        ...withCourse("CRS-01"),
        course: { ...courseView, status: [{ kind: "checking" as const, copy: "Checking…" }] }
      }
    },
    {
      name: "SYS-01 (permission)",
      screen: "CRS-01",
      view: {
        ...withCourse("CRS-01"),
        course: {
          ...courseView,
          status: [{ kind: "permission" as const, copy: "Permission required" }]
        }
      }
    },
    {
      name: "SYS-01 (authorization)",
      screen: "CRS-01",
      view: {
        ...withCourse("CRS-01"),
        course: {
          ...courseView,
          status: [{ kind: "authorization" as const, copy: "Authorization required" }]
        }
      }
    },
    {
      name: "SYS-02 (semester attention)",
      screen: "SEM-01",
      view: {
        surface: "full-page",
        screen: "SEM-01",
        settings: settingsView,
        semester: {
          ...currentSemester,
          status: [{ kind: "needs-attention" as const, copy: "1 course needs attention" }]
        }
      }
    },
    {
      name: "ISC-03 (resume)",
      screen: "ISC-04",
      view: fixtureView("ISC-04", {
        courseId: "course-2",
        task: taskStatus({
          state: "waiting",
          waiting: {
            reason: "privacy-authorization",
            copy: "Permission required",
            action: "Resume"
          }
        })
      })
    },
    {
      name: "SET-03 (missing)",
      screen: "SET-01",
      view: fixtureView("SET-01", { settings: { ...settingsView, apiKey: { state: "missing" } } })
    },
    {
      name: "SET-03 (unvalidated)",
      screen: "SET-01",
      view: fixtureView("SET-01", {
        settings: { ...settingsView, apiKey: { state: "unvalidated", maskedSuffix: "abcd" } }
      })
    },
    {
      name: "SET-03 (valid)",
      screen: "SET-01",
      view: fixtureView("SET-01", {
        settings: { ...settingsView, apiKey: { state: "valid", maskedSuffix: "abcd" } }
      })
    },
    {
      name: "SET-03 (missing, key not stored)",
      screen: "SET-01",
      view: fixtureView("SET-01", { settings: { ...settingsView, apiKey: { state: "invalid" } } })
    },
    {
      name: "CAL-01 (one event)",
      screen: "CAL-01",
      view: {
        ...withCourse("CAL-01"),
        exportPreview: {
          events: [{ title: "Final Exam", date: "2026-12-03" }],
          dateCount: 1,
          exportableCount: 1,
          unresolvedCount: 0
        }
      }
    },
    {
      // Some of the Course's dates resolved; the rest are named rather than dropped.
      name: "CAL-01 (one date unresolved)",
      screen: "CAL-01",
      view: {
        ...withCourse("CAL-01"),
        exportPreview: {
          events: [{ title: "Individual Assignment", date: "2026-10-18" }],
          dateCount: 2,
          exportableCount: 1,
          unresolvedCount: 1
        }
      }
    },
    {
      // The Course holds dates and none of them can be placed: not the same as having none.
      name: "CAL-01 (no date can be exported)",
      screen: "CAL-01",
      view: {
        ...withCourse("CAL-01"),
        exportPreview: {
          events: [],
          dateCount: 2,
          exportableCount: 0,
          unresolvedCount: 2
        }
      }
    },
    {
      name: "CRV-03 (editing a value)",
      screen: "CRV-03",
      view: { ...withCourse("CRV-03"), review: conflictReview },
      ui: { conflictEditing: true }
    },
    {
      name: "CRV-03 (no values yet)",
      screen: "CRV-03",
      view: {
        ...withCourse("CRV-03"),
        review: reviewItem({
          reviewItemId: "ri-conflict-empty",
          kind: "change",
          changeType: "CONFLICT",
          title: "Group Project",
          actions: ["ChooseValue", "EditValue"]
        })
      }
    },
    {
      name: "IRV-03 (no candidates)",
      screen: "IRV-03",
      view: {
        ...withCourse("IRV-01"),
        course: {
          ...courseView,
          assessments: [
            assessment({
              assessmentId: "a-project",
              name: "Group Project",
              kind: "project",
              kindGroup: "Projects"
            })
          ],
          constraints: []
        },
        review: initialReview
      },
      ui: { mergeOpen: true }
    },
    {
      name: "CRS-01 (More menu)",
      screen: "CRS-01",
      view: withCourse("CRS-01"),
      ui: { courseMoreOpen: true }
    },
    {
      name: "CRS-01 (long Requirement shown)",
      screen: "CRS-01",
      view: withCourse("CRS-01"),
      ui: { expanded: ["prose:f-ind-requirement"] }
    },
    {
      // §5.4: a Scan that finished while the user was still watching goes straight into the
      // Initial Review it produced. The route still names the Scan screen — the user never left it
      // — and what the surface shows is the Review. This used to be a fixture of its own screen
      // called "Waiting for your review", which told the user to finish a review and gave them no
      // way to open one. (Gate 3 finding F21.)
      name: "ISC-02 (scan finished → Initial Review)",
      screen: "IRV-01",
      view: {
        ...withCourse("ISC-02"),
        task: taskStatus({ state: "waiting" }),
        review: initialReview
      },
      hints: { split: true, "same-assessment-as": true }
    },
    {
      name: "SEM-04 (empty historical)",
      screen: "SEM-06",
      view: fixtureView("SEM-04", {
        semester: { ...historicalSemester, courses: [], empty: true, status: [] }
      })
    },
    {
      name: "SYS-01 (api key)",
      screen: "CRS-01",
      view: {
        ...withCourse("CRS-01"),
        course: { ...courseView, status: [{ kind: "api-key" as const, copy: "API key required" }] }
      }
    },
    {
      name: "SET-02 (key revealed)",
      screen: "SET-01",
      view: fixtureView("SET-01", { settings: settingsView }),
      ui: { apiKeyReveal: true }
    },
    {
      name: "CRV-03 (no labels)",
      screen: "CRV-03",
      view: {
        ...withCourse("CRV-03"),
        review: reviewItem({
          reviewItemId: "ri-conflict-bare",
          kind: "change",
          changeType: "CONFLICT",
          title: "Group Project",
          current: { label: "", values: [{ display: "10 Oct", evidence: [] }] },
          latest: {
            label: "",
            values: [{ display: "18 Oct", evidence: [evidence("e-bare")] }]
          },
          actions: ["ChooseValue", "EditValue"]
        })
      }
    },
    {
      // A Change Review item with no values yet: the layout names both sides itself.
      name: "CRV-01 (no values yet)",
      screen: "CRV-01",
      view: {
        ...withCourse("CRV-01"),
        review: reviewItem({
          reviewItemId: "ri-bare",
          kind: "change",
          changeType: "CHANGED",
          title: "Group Project",
          actions: ["AcceptChange", "KeepCurrent"]
        })
      }
    },
    {
      // SYS-07: the runtime could not reach the service worker at all.
      name: "SYS-07 (error)",
      screen: "CRS-01",
      view: withCourse("CRS-01"),
      runtime: { error: { code: "NO_RESPONSE", copy: t("errorUnreachable") } }
    },
    {
      name: "BKP-05 (notice)",
      screen: "SET-01",
      embedded: ["BKP-05"],
      view: fixtureView("SET-01", { settings: settingsView }),
      runtime: { notice: { screen: "BKP-05", message: t("backupExported") } }
    }
  ];
}

export const statusCueFixtures: StatusCue[][] = [
  [{ kind: "freshness", copy: "Checked 2h ago" }],
  [
    { kind: "freshness", copy: "Checked 2h ago" },
    { kind: "checking", copy: "Checking…" }
  ],
  [
    { kind: "freshness", copy: "Checked 2h ago" },
    { kind: "checking", copy: "Checking…" },
    { kind: "pending-review", count: 2, copy: "2 to review" }
  ],
  [
    { kind: "pending-review", count: 2, copy: "2 to review" },
    { kind: "needs-attention", copy: "Needs attention" }
  ],
  [
    { kind: "pending-review", count: 2, copy: "2 to review" },
    { kind: "needs-attention", copy: "Needs attention" },
    { kind: "api-key", copy: "API key required" }
  ]
];
