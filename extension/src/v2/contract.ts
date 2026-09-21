import type { CurrentMark, FactValue, TaskCChangeType } from "./schema";

export const V2_MESSAGE_CONTRACT = 2 as const;

/** Which surface asked. Density differs; semantics never do. */
export type Surface = "side-panel" | "full-page";

export type ScreenId =
  | "SEM-01"
  | "SEM-02"
  | "SEM-03"
  | "SEM-04"
  | "SEM-05"
  | "SEM-06"
  | "SEM-07"
  | "CRS-01"
  | "CRS-02"
  | "CRS-03"
  | "CRS-04"
  | "CRS-05"
  | "CRS-06"
  | "ISC-01"
  | "ISC-02"
  | "ISC-03"
  | "ISC-04"
  | "ISC-05"
  | "ISC-06"
  | "IRV-01"
  | "IRV-02"
  | "IRV-03"
  | "IRV-04"
  | "IRV-05"
  | "IRV-06"
  | "CRV-01"
  | "CRV-02"
  | "CRV-03"
  | "CRV-04"
  | "CRV-05"
  | "CRV-06"
  | "RBL-01"
  | "RBL-02"
  | "RBL-03"
  | "RBL-04"
  | "CAL-01"
  | "CAL-02"
  | "SET-01"
  | "SET-02"
  | "SET-03"
  | "SET-04"
  | "SET-05"
  | "BKP-01"
  | "BKP-02"
  | "BKP-03"
  | "BKP-04"
  | "BKP-05";

/** Status shown in one shared position: Course Status Area / Semester Status Area. */
export type StatusCue =
  | { kind: "pending-review"; count: number; copy: string }
  | { kind: "checking"; copy: string }
  | { kind: "needs-attention"; copy: string; detail?: string }
  | { kind: "freshness"; copy: string }
  | { kind: "api-key"; copy: string }
  | { kind: "permission"; copy: string }
  | { kind: "authorization"; copy: string };

export type TaskPhaseCopy =
  | "Finding course content…"
  | "Reading course materials…"
  | "Understanding course information…"
  | "Organizing assessments…";

export interface AssessmentCardView {
  assessmentId: string;
  name: string;
  kind: AssessmentKindView;
  kindGroup: "Assignments" | "Projects" | "Quizzes & Tests" | "Exams" | "Other";
  marks: CurrentMark[];
  summary: string[];
  requirements: string[];
  components: AssessmentCardView[];
  seriesInstances: Array<{ name: string; summary: string[] }>;
  seriesNote?: string;
  unresolvedQuestions: string[];
  facts: FactView[];
}

export type AssessmentKindView = "assignment" | "project" | "quiz_test" | "exam" | "other";

export interface FactView {
  factId: string;
  field: string;
  label: string;
  display: string;
  mark?: CurrentMark;
  /** Competing values stay visible; the product never silently picks one. */
  competingValues?: string[];
  knowledge: FactValue["state"];
  evidence: EvidenceView[];
  editable: boolean;
}

export interface EvidenceView {
  evidenceId: string;
  sourceTitle: string;
  locator: string;
  excerpt: string;
}

export interface ConstraintView {
  constraintId: string;
  content: string;
  marks: CurrentMark[];
  evidence: EvidenceView[];
}

export interface CourseView {
  courseId: string;
  courseCode: string;
  courseName: string;
  established: boolean;
  revision: number;
  status: StatusCue[];
  freshness?: string;
  assessments: AssessmentCardView[];
  constraints: ConstraintView[];
  noAssessments: boolean;
  more: { addAssessment: true; checkForUpdates: true; exportCalendar: true; rebuildCourse: true };
}

export interface SemesterCourseCardView {
  courseId: string;
  courseCode: string;
  courseName: string;
  established: boolean;
  preview: Array<{ group: string; lines: string[] }>;
  moreAssessments?: number;
  status: StatusCue[];
}

export interface SemesterView {
  semesterId: string;
  label: string;
  lifecycle: "Current" | "Historical";
  courses: SemesterCourseCardView[];
  status: StatusCue[];
  empty: boolean;
  switcherOptions: Array<{
    semesterId: string;
    label: string;
    lifecycle: "Current" | "Historical";
  }>;
}

export interface ReviewItemView {
  reviewItemId: string;
  kind: "initial" | "change" | "identity";
  changeType?: TaskCChangeType;
  title: string;
  subtitle?: string;
  position: { index: number; total: number };
  current?: { label: string; values: Array<{ display: string; evidence: EvidenceView[] }> };
  latest?: { label: string; values: Array<{ display: string; evidence: EvidenceView[] }> };
  unresolvedQuestions: string[];
  actions: Array<
    | "Confirm"
    | "Edit"
    | "Exclude"
    | "ReviewLater"
    | "SameAssessmentAs"
    | "Split"
    | "AcceptChange"
    | "KeepCurrent"
    | "ChooseValue"
    | "EditValue"
    | "Keep"
    | "Remove"
    | "SameAssessment"
    | "DifferentAssessment"
  >;
}

export interface TaskStatusView {
  workflowId: string;
  /**
   * The three states a task can be in *on screen*.
   *
   * `saved` is a workflow state (§5.6.5: what has been persisted and can be resumed) and is not
   * one of these: §11.3 keeps it out of the interface, a run parked on its retry schedule is still
   * the task the user started, and the sentence that used to stand for it — `Progress saved.` —
   * appears in no product document.
   */
  state: "working" | "waiting" | "failed";
  /** Fixed user-facing stages only; internal pipeline names never surface. */
  phase?: TaskPhaseCopy;
  waiting?: {
    /** The four reasons §11.7 gives a user, each one something only the user can supply. */
    reason: "api-key" | "privacy-authorization" | "api-usage-authorization" | "host-permission";
    copy: string;
    action?: "OpenSettings" | "GrantPermission" | "Resume";
  };
  failure?: { copy: string; retryable: boolean; consumesApi: boolean; errorCode: string };
  cursor?: { index: number; total: number };
}

/**
 * CAL-01: what an export would contain, and what it could not place.
 *
 * The three counts come from the same call that writes the file, so the screen cannot report a
 * different outcome from the download. `dateCount` includes every settled date the Course holds —
 * including ones no calendar can take — so a screen never says "no dates" about a Course that has
 * dates it could not read.
 */
export interface ExportPreviewView {
  events: Array<{ title: string; date: string }>;
  /** Settled facts in a date-bearing field. */
  dateCount: number;
  /** Of those, the ones that became events. */
  exportableCount: number;
  /** Of those, the ones whose dates are incomplete or unclear. */
  unresolvedCount: number;
}

export interface AppView {
  surface: Surface;
  screen: ScreenId;
  courseId?: string;
  semester?: SemesterView;
  course?: CourseView;
  rebuildPreview?: {
    course: CourseView;
    partial: boolean;
    failedSourceCount: number;
    canAdopt: boolean;
  };
  review?: ReviewItemView;
  task?: TaskStatusView;
  exportPreview?: ExportPreviewView;
  backupSummary?: { semesters: string[]; courseCount: number; assessmentCount: number };
  settings?: {
    apiKey: { state: "missing" | "unvalidated" | "valid" | "invalid"; maskedSuffix?: string };
    privacy: boolean;
    apiUsage: boolean;
    version: string;
  };
  returnContext?: { courseId?: string; screen: ScreenId };
}

export type ViewMessage =
  | { contract: typeof V2_MESSAGE_CONTRACT; type: "GET_VIEW"; surface: Surface; tabId?: number }
  | {
      contract: typeof V2_MESSAGE_CONTRACT;
      type: "OPEN_SCREEN";
      surface: Surface;
      screen: ScreenId;
      courseId?: string;
      semesterId?: string;
    }
  | {
      contract: typeof V2_MESSAGE_CONTRACT;
      type: "MUTATE";
      surface: Surface;
      courseId?: string;
      expectedRevision: number;
      mutation: Mutation;
    }
  | { contract: typeof V2_MESSAGE_CONTRACT; type: "SET_API_KEY"; surface: Surface; apiKey: string }
  | { contract: typeof V2_MESSAGE_CONTRACT; type: "VALIDATE_API_KEY"; surface: Surface }
  | {
      contract: typeof V2_MESSAGE_CONTRACT;
      type: "SET_AUTHORIZATION";
      surface: Surface;
      kind: "privacy" | "apiUsage";
      granted: boolean;
    }
  | { contract: typeof V2_MESSAGE_CONTRACT; type: "EXPORT_BACKUP"; surface: Surface }
  | {
      contract: typeof V2_MESSAGE_CONTRACT;
      type: "EXPORT_CALENDAR";
      surface: Surface;
      courseId: string;
    }
  | {
      contract: typeof V2_MESSAGE_CONTRACT;
      type: "RESTORE_BACKUP";
      surface: Surface;
      backup: unknown;
      /**
       * Absent or false validates the file and answers with its summary so the user can see what
       * it contains before deciding. Only `true` replaces the local state.
       */
      confirmed?: boolean;
    };

export type Mutation =
  | { kind: "StartScan"; courseId: string; tabId?: number }
  | { kind: "CheckForUpdates"; courseId: string }
  | {
      kind: "ConfirmReviewItem";
      reviewItemId: string;
      edited?: { name?: string; facts?: Array<{ factId: string; value: FactValue }> };
    }
  | { kind: "ExcludeReviewItem"; reviewItemId: string }
  | { kind: "UndeleteExclusion"; reviewItemId: string }
  | { kind: "DeferReviewItem"; reviewItemId: string }
  | { kind: "SameAssessmentAs"; reviewItemId: string; targetAssessmentId: string }
  | {
      kind: "SplitAssessment";
      reviewItemId: string;
      parts: Array<{ name: string; factIds: string[] }>;
    }
  | { kind: "AcceptChange"; changeId: string }
  | { kind: "KeepCurrent"; changeId: string }
  | { kind: "ResolveConflict"; changeId: string; value: FactValue }
  | { kind: "KeepPossiblyRemoved"; changeId: string }
  | { kind: "RemovePossiblyRemoved"; changeId: string }
  | {
      kind: "ResolveIdentity";
      changeId: string;
      relationship: "SAME_ASSESSMENT" | "DIFFERENT_ASSESSMENT";
    }
  | { kind: "EditFact"; factId: string; value: FactValue }
  | { kind: "RenameAssessment"; assessmentId: string; name: string }
  | {
      kind: "AddAssessment";
      assessment: { name: string; kind: AssessmentKindView };
      facts: Array<{ field: string; value: FactValue }>;
    }
  | { kind: "RebuildCourse" }
  | { kind: "UseRebuiltCourse" }
  | { kind: "KeepCurrentCourse" }
  | { kind: "RetryTask"; workflowId: string };

export type ViewResponse =
  | { ok: true; view: AppView }
  | { ok: false; error: { code: string; copy: string; detail?: string } };

export function isViewMessage(value: unknown): value is ViewMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { contract?: unknown }).contract === V2_MESSAGE_CONTRACT &&
    typeof (value as { type?: unknown }).type === "string"
  );
}
