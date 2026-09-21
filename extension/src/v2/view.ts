import {
  fieldLabel,
  groupAssessments,
  kindLabel,
  partitionAssessmentFacts,
  competingValues,
  presentAssessment,
  renderFactValue,
  type AssessmentPresentation
} from "./assessments";
import { calendarSummary } from "./calendar-export";
import { calendarExportInput } from "./calendar-plan";
import type {
  AppView,
  AssessmentCardView,
  CourseView,
  EvidenceView,
  ExportPreviewView,
  FactView,
  ReviewItemView,
  ScreenId,
  SemesterCourseCardView,
  SemesterView,
  StatusCue,
  Surface,
  TaskPhaseCopy,
  TaskStatusView
} from "./contract";
import { t } from "./copy";
import type { CourseSnapshot } from "./course-state";
import type {
  AssessmentRecord,
  ChangeRecord,
  ConstraintRecord,
  CourseRecord,
  EvidenceRecord,
  FactRecord,
  ReviewItemRecord,
  SemesterRecord,
  SourceRecord,
  WorkflowRecord
} from "./domain";
import { needsFreshnessAttention, type CheckSchedule } from "./opportunity";
import { qaTrace } from "./qa-telemetry";
import { rebuildFailureSources } from "./materialize";
import type { RebuildStagingStore } from "./staging";
import { REVIEW_SCREENS, semesterIsEmpty } from "./screens/render";
import type { LocalStore } from "./store";

export interface Route {
  surface: Surface;
  screen?: ScreenId;
  courseId?: string;
  semesterId?: string;
  tabCourseId?: string;
}

export interface SettingsView {
  apiKey: { state: "missing" | "unvalidated" | "valid" | "invalid"; maskedSuffix?: string };
  privacy: boolean;
  apiUsage: boolean;
  version: string;
}

export interface BuildViewDependencies {
  store: LocalStore;
  staging?: RebuildStagingStore;
  productVersion: string;
  now?: () => Date;
  settings: () => Promise<SettingsView>;
}

const PHASE_COPY: Record<string, TaskPhaseCopy> = {
  discover: "Finding course content…",
  fetch: "Finding course content…",
  parse: "Reading course materials…",
  normalize: "Reading course materials…",
  "task-a": "Understanding course information…",
  "task-b": "Organizing assessments…",
  "task-c": "Understanding course information…",
  review: "Organizing assessments…"
};

/**
 * The Course Status Area shows exactly one thing. Needs-user-action outranks a pending
 * Review, which outranks an in-flight check, which outranks transient freshness.
 */
const STATUS_PRIORITY = [
  "api-key",
  "permission",
  "authorization",
  "needs-attention",
  "pending-review",
  "checking",
  "freshness"
] as const;

/** A dashboard with nothing on it is an empty state, not a blank dashboard. */
function currentSemesterScreen(
  requested: ScreenId,
  semester: SemesterView | undefined,
  surface: Surface
): ScreenId {
  if (!semesterIsEmpty(semester)) return requested;
  // An explicit request for the switcher or a historical view still wins.
  if (requested === "SEM-03" || requested === "SEM-04" || requested === "SEM-05") return requested;
  if (semester?.lifecycle === "Historical") return surface === "side-panel" ? "SEM-05" : "SEM-04";
  return surface === "side-panel" ? "SEM-02" : "SEM-06";
}

export function primaryCue(cues: StatusCue[]): StatusCue | null {
  for (const kind of STATUS_PRIORITY) {
    const found = cues.find((cue) => cue.kind === kind);
    if (found) return found;
  }
  return null;
}

function relativeTime(iso: string, now: Date): string {
  const elapsed = now.getTime() - Date.parse(iso);
  if (!Number.isFinite(elapsed) || elapsed < 0) return "just now";
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${String(minutes)}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${String(hours)}h ago`;
  const days = Math.floor(hours / 24);
  return `${String(days)}d ago`;
}

function evidenceViews(
  records: EvidenceRecord[],
  sources: Map<string, SourceRecord>
): EvidenceView[] {
  return records.map((record) => ({
    evidenceId: record.evidenceId,
    sourceTitle: sources.get(record.sourceId)?.title ?? t("evidenceCourseSource"),
    locator: record.locator,
    excerpt: record.excerpt
  }));
}

function factView(fact: FactRecord, evidence: EvidenceView[]): FactView {
  const competing = competingValues(fact.value);
  return {
    factId: fact.factId,
    field: fact.field,
    label: fieldLabel(fact.field),
    display: renderFactValue(fact.value),
    ...(fact.marks.length > 0 ? { mark: fact.marks[fact.marks.length - 1] } : {}),
    ...(competing.length > 1 ? { competingValues: competing } : {}),
    knowledge: fact.value.state,
    evidence,
    editable: true
  };
}

function unresolvedQuestion(fact: FactRecord): string | null {
  if (fact.value.state !== "UNCERTAIN") return null;
  return `${fieldLabel(fact.field)} is unclear`;
}

function assessmentCard(
  assessment: AssessmentRecord,
  factsByAssessment: Map<string, FactRecord[]>,
  evidenceById: Map<string, EvidenceRecord[]>,
  evidenceViewsFor: (ids: string[]) => EvidenceView[],
  childrenOf: (assessmentId: string) => AssessmentRecord[]
): AssessmentCardView {
  const facts = factsByAssessment.get(assessment.assessmentId) ?? [];
  const children = childrenOf(assessment.assessmentId);
  const presentation: AssessmentPresentation = presentAssessment(
    assessment,
    facts,
    children,
    (assessmentId) => factsByAssessment.get(assessmentId) ?? []
  );
  const factViews = [...facts]
    .sort((left, right) => left.field.localeCompare(right.field))
    .map((fact) =>
      factView(
        fact,
        evidenceViewsFor((evidenceById.get(fact.factId) ?? []).map((item) => item.evidenceId))
      )
    );
  return {
    assessmentId: assessment.assessmentId,
    name: presentation.name,
    kind: presentation.kind,
    kindGroup: presentation.group,
    marks: assessment.marks,
    summary: presentation.summary,
    requirements: presentation.requirements,
    components: presentation.children.map((child) =>
      assessmentCard(child.record, factsByAssessment, evidenceById, evidenceViewsFor, childrenOf)
    ),
    seriesInstances: presentation.seriesInstances,
    ...(presentation.seriesNote ? { seriesNote: presentation.seriesNote } : {}),
    unresolvedQuestions: facts
      .map((fact) => unresolvedQuestion(fact))
      .filter((question): question is string => question !== null),
    facts: factViews
  };
}

export class ViewBuilder {
  constructor(private readonly dependencies: BuildViewDependencies) {}

  private now(): Date {
    return this.dependencies.now?.() ?? new Date();
  }

  async build(route: Route): Promise<AppView> {
    const store = this.dependencies.store;
    const [semesters, courses, workflows, settings] = await Promise.all([
      store.readSemesters(),
      store.readCourses(),
      store.listWorkflows(),
      this.dependencies.settings()
    ]);
    const currentSemester =
      semesters.find((semester) => semester.status === "Current") ?? semesters[0];
    const semesterId = route.semesterId ?? currentSemester?.semesterId;
    const semester = await this.buildSemester(semesterId, semesters, courses, workflows, settings);
    const base: AppView = {
      surface: route.surface,
      screen: route.screen ?? (route.surface === "side-panel" ? "SEM-02" : "SEM-01"),
      settings
    };
    if (semester) base.semester = semester;
    // A Semester with no Curriculum Courses is its own normal state, not a dashboard that happens
    // to be blank. The screen router reaches the same conclusion from the view; setting it here as
    // well keeps the view honest on its own.
    base.screen = currentSemesterScreen(base.screen, semester, route.surface);

    const courseId = route.courseId ?? route.tabCourseId;
    if (!courseId) return this.finish(base, route);
    const course = courses.find((item) => item.courseId === courseId);
    // A stale route to a Course that no longer exists falls back to the Semester view rather than
    // rendering an empty shell for something that is gone.
    if (!course) {
      const { screen: _stale, ...rest } = route;
      return this.finish(
        { ...base, screen: route.surface === "side-panel" ? "SEM-02" : "SEM-01" },
        rest
      );
    }
    base.courseId = courseId;

    const workflow = workflows
      .filter((item) => item.courseId === courseId && item.state !== "complete")
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    if (workflow) base.task = taskStatus(workflow);

    // §5.4: a Scan that finished while the user was still watching goes straight into the Initial
    // Review it produced, so the Scan screen resolves to IRV-01 (`render.ts::scanScreen`).
    // Whichever route brought the user here, the view has to carry the item that screen draws —
    // in the scan flow the route still says ISC-02 until the Review is what the surface is on.
    // (Gate 3 finding F21.)
    const awaitingReview = workflow?.state === "waiting" && workflow.waitingReason === "review";

    if (!course.established && !workflow) {
      base.screen = route.screen ?? "SEM-07";
      return this.finish(base, route);
    }
    if (!course.established && workflow) {
      base.screen = route.screen ?? "ISC-02";
      base.course = await this.buildCourse(course, workflow);
      if (awaitingReview) {
        const review = await this.buildReview(courseId);
        if (review) base.review = review;
      }
      return this.finish(base, route);
    }
    base.course = await this.buildCourse(course, workflow);
    const rebuildWorkflow = workflows
      .filter(
        (item) => item.courseId === courseId && item.kind === "rebuild" && item.state !== "complete"
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    if (
      rebuildWorkflow?.state === "waiting" &&
      rebuildWorkflow.waitingReason === "review" &&
      this.dependencies.staging
    ) {
      const staged = await this.dependencies.staging.read(courseId, rebuildWorkflow.workflowId);
      if (staged) {
        const { observations } = await this.dependencies.store.readAllSourceStates(courseId);
        const failedSources = rebuildFailureSources(
          staged.taskACoverage?.failedSources ?? [],
          observations.filter((item) => item.workflowId === rebuildWorkflow.workflowId)
        );
        const projection: CourseSnapshot = {
          course,
          assessments: staged.assessments,
          constraints: staged.constraints,
          facts: staged.facts,
          changes: staged.changes,
          reviewItems: staged.reviewItems,
          history: []
        };
        const failedSourceCount = failedSources.length;
        base.rebuildPreview = {
          course: await this.buildCourse(course, rebuildWorkflow, projection, staged.evidence),
          partial: failedSourceCount > 0,
          failedSourceCount,
          canAdopt: failedSourceCount === 0
        };
      }
    }
    if (route.screen === "SEM-07" || route.screen === "ISC-01") base.screen = "SEM-07";
    else if (!route.screen) base.screen = route.surface === "side-panel" ? "CRS-02" : "CRS-01";
    if ((route.screen && REVIEW_SCREENS.includes(route.screen)) || awaitingReview) {
      const review = await this.buildReview(courseId);
      if (review) base.review = review;
    }
    // Built only for the screen that shows it, so every other view stays as cheap as it was.
    if ((route.screen ?? base.screen) === "CAL-01") {
      base.exportPreview = await this.buildExportPreview(course);
    }
    return this.finish(base, route);
  }

  /**
   * CAL-01's event list. `calendarExportInput` is the same input the export action builds, so the
   * preview cannot promise a set of events the downloaded file does not contain.
   */
  private async buildExportPreview(course: CourseRecord): Promise<ExportPreviewView> {
    const store = this.dependencies.store;
    const [snapshot, semesters] = await Promise.all([
      store.readTrustedSnapshot(course.courseId),
      store.readSemesters()
    ]);
    const summary = calendarSummary(
      calendarExportInput({
        course,
        snapshot,
        semester: semesters.find((item) => item.semesterId === course.semesterId)
      })
    );
    // What the preview promised. The export records what the file actually contained, so the two
    // counts in a run's trace are two independent readings rather than one repeated.
    qaTrace("qa.calendar-preview", {
      courseCode: course.courseCode,
      preview: summary.events.length,
      dates: summary.dateCount,
      unresolved: summary.unresolvedCount
    });
    return {
      events: summary.events.map((event) => ({ title: event.title, date: event.date })),
      dateCount: summary.dateCount,
      exportableCount: summary.exportableCount,
      unresolvedCount: summary.unresolvedCount
    };
  }

  private finish(view: AppView, route: Route): AppView {
    return route.screen ? { ...view, screen: route.screen } : view;
  }

  private async buildSemester(
    semesterId: string | undefined,
    semesters: SemesterRecord[],
    courses: CourseRecord[],
    workflows: WorkflowRecord[],
    settings: SettingsView
  ): Promise<SemesterView | undefined> {
    if (!semesterId) return undefined;
    const semester = semesters.find((item) => item.semesterId === semesterId);
    if (!semester) return undefined;
    const members = courses.filter((course) => course.semesterId === semesterId);
    const cards: SemesterCourseCardView[] = [];
    for (const course of members) {
      cards.push(await this.semesterCard(course, workflows, settings));
    }
    const checking = workflows.some(
      (workflow) =>
        workflow.state === "working" &&
        members.some((course) => course.courseId === workflow.courseId)
    );
    const attention = cards.filter((card) =>
      card.status.some((cue) => cue.kind === "needs-attention")
    ).length;
    const status: StatusCue[] = [];
    if (checking) status.push({ kind: "checking", copy: "Checking courses…" });
    if (attention > 0) {
      status.push({
        kind: "needs-attention",
        copy:
          attention === 1
            ? "1 course needs attention"
            : `${String(attention)} courses need attention`
      });
    }
    if (settings.apiKey.state === "missing") {
      status.push({ kind: "api-key", copy: "API key needs attention" });
    }
    return {
      semesterId,
      label: semester.label,
      lifecycle: semester.status,
      courses: cards,
      status,
      empty: cards.length === 0,
      switcherOptions: [...semesters]
        .sort((left, right) => right.label.localeCompare(left.label))
        .map((item) => ({ semesterId: item.semesterId, label: item.label, lifecycle: item.status }))
    };
  }

  private async semesterCard(
    course: CourseRecord,
    workflows: WorkflowRecord[],
    settings: SettingsView
  ): Promise<SemesterCourseCardView> {
    const card: SemesterCourseCardView = {
      courseId: course.courseId,
      courseCode: course.courseCode,
      courseName: course.courseName,
      established: course.established,
      preview: [],
      status: []
    };
    if (!course.established) return card;

    const snapshot = await this.dependencies.store.readTrustedSnapshot(course.courseId);
    if (!snapshot) return card;
    const visible = snapshot;
    const groups = groupAssessments(
      visible.assessments.filter((item) => item.role === "assessment")
    );
    const factsByAssessment = groupFacts(visible.facts);
    let shown = 0;
    const total = visible.assessments.filter((item) => item.role === "assessment").length;
    for (const group of groups) {
      const lines: string[] = [];
      for (const assessment of group.items) {
        if (shown >= 3) break;
        const facts = factsByAssessment.get(assessment.assessmentId) ?? [];
        const summary = partitionAssessmentFacts(facts)
          .summary.slice(0, 3)
          .map((fact) => renderFactValue(fact.value));
        lines.push([assessment.name, ...summary].join(" · "));
        shown += 1;
      }
      if (lines.length > 0) card.preview.push({ group: group.group, lines });
      if (shown >= 3) break;
    }
    const remaining = total - shown;
    if (remaining > 0) card.moreAssessments = remaining;
    card.status = courseCues(
      course,
      snapshot.changes,
      snapshot.reviewItems,
      workflows,
      settings,
      this.now()
    );
    return card;
  }

  private async buildCourse(
    course: CourseRecord,
    workflow: WorkflowRecord | undefined,
    projection?: CourseSnapshot,
    projectedEvidence?: EvidenceRecord[]
  ): Promise<CourseView> {
    const store = this.dependencies.store;
    const snapshot = projection ?? (await store.readTrustedSnapshot(course.courseId));
    const now = this.now();
    if (!snapshot) {
      return {
        courseId: course.courseId,
        courseCode: course.courseCode,
        courseName: course.courseName,
        established: course.established,
        revision: course.currentRevision,
        status: [],
        assessments: [],
        constraints: [],
        noAssessments: true,
        more: {
          addAssessment: true,
          checkForUpdates: true,
          exportCalendar: true,
          rebuildCourse: true
        }
      };
    }
    const visible = snapshot;
    const { sources } = await store.readAllSourceStates(course.courseId);
    const sourceIndex = new Map(sources.map((source) => [source.sourceId, source]));
    const factsByAssessment = groupFacts(visible.facts);
    const evidenceIds = new Set(
      [
        ...visible.facts.flatMap((fact) => fact.evidenceRefs.map((ref) => ref.evidenceId ?? "")),
        ...snapshot.constraints.flatMap((constraint) =>
          constraint.evidenceRefs.map((ref) => ref.evidenceId ?? "")
        ),
        ...snapshot.changes.flatMap((change) => [
          ...change.currentEvidenceIds,
          ...change.newEvidenceIds
        ])
      ].filter((id) => id.length > 0)
    );
    const evidenceRecords = projectedEvidence ?? (await store.readEvidence([...evidenceIds]));
    const evidenceById = new Map(evidenceRecords.map((record) => [record.evidenceId, record]));
    const evidenceViewsFor = (ids: string[]): EvidenceView[] =>
      evidenceViews(
        ids
          .map((id) => evidenceById.get(id))
          .filter((record): record is EvidenceRecord => record !== undefined),
        sourceIndex
      );
    const evidenceByFact = new Map<string, EvidenceRecord[]>();
    for (const fact of visible.facts) {
      const records = fact.evidenceRefs
        .map((ref) => (ref.evidenceId ? evidenceById.get(ref.evidenceId) : undefined))
        .filter((record): record is EvidenceRecord => record !== undefined);
      if (records.length > 0) evidenceByFact.set(fact.factId, records);
    }

    const topLevel = visible.assessments.filter(
      (item) => item.role === "assessment" || item.role === "series"
    );
    const childrenOf = (assessmentId: string) =>
      visible.assessments.filter((item) => item.parentAssessmentId === assessmentId);
    const cards: AssessmentCardView[] = [];
    for (const group of groupAssessments(topLevel)) {
      for (const assessment of group.items) {
        cards.push(
          assessmentCard(
            assessment,
            factsByAssessment,
            evidenceByFact,
            evidenceViewsFor,
            childrenOf
          )
        );
      }
    }
    const constraints: ConstraintViewLike[] = visible.constraints
      .slice()
      .sort((left, right) => left.content.localeCompare(right.content))
      .map((constraint) => ({
        constraintId: constraint.constraintId,
        content: constraint.content,
        marks: constraint.marks,
        evidence: evidenceViewsFor(constraint.evidenceRefs.map((ref) => ref.evidenceId ?? ""))
      }));

    return {
      courseId: course.courseId,
      courseCode: course.courseCode,
      courseName: course.courseName,
      established: course.established,
      revision: course.currentRevision,
      status: courseCues(
        course,
        visible.changes,
        visible.reviewItems,
        [workflow].filter(isWorkflow),
        this.settingsPlaceholder(),
        now
      ),
      ...(course.lastSuccessfulCheckAt
        ? { freshness: `Checked ${relativeTime(course.lastSuccessfulCheckAt, now)}` }
        : {}),
      assessments: cards,
      constraints,
      noAssessments: cards.length === 0,
      more: {
        addAssessment: true,
        checkForUpdates: true,
        exportCalendar: true,
        rebuildCourse: true
      }
    };
  }

  /**
   * One pending decision, in the shape the Review screens read. The unit is a whole Assessment for
   * Initial Review and a single changed field for Change Review, and the id the surface sends back
   * is the review item's own.
   */
  private async buildReview(courseId: string): Promise<ReviewItemView | null> {
    const snapshot = await this.dependencies.store.readSnapshot(courseId);
    if (!snapshot) return null;
    const pending = [
      ...snapshot.reviewItems,
      ...snapshot.changes
        .filter(
          (change) => !snapshot.reviewItems.some((item) => item.reviewItemId === change.changeId)
        )
        .map((change) => ({
          reviewItemId: change.changeId,
          courseId: change.courseId,
          workflowId: change.workflowId,
          kind:
            change.changeType === "IDENTITY_UNCERTAIN"
              ? ("identity" as const)
              : ("change" as const),
          changeType: change.changeType,
          targetId: change.targetId,
          payload: {},
          createdAt: change.createdAt,
          updatedAt: change.updatedAt
        }))
    ];
    if (pending.length === 0) return null;
    const item = pending[0] as (typeof pending)[number];
    const payload = item.payload as Record<string, unknown>;
    const payloadEvidence = Array.isArray(payload.evidence)
      ? payload.evidence.filter(isEvidenceRecord)
      : [];
    const evidenceIds = [
      ...snapshot.facts.flatMap((fact) => fact.evidenceRefs.map((ref) => ref.evidenceId ?? "")),
      ...snapshot.changes.flatMap((change) => [
        ...change.currentEvidenceIds,
        ...change.newEvidenceIds
      ])
    ].filter((id) => id.length > 0);
    const [storedRecords, sources] = await Promise.all([
      this.dependencies.store.readEvidence(evidenceIds),
      this.dependencies.store.readAllSourceStates(courseId)
    ]);
    const records = [...storedRecords, ...payloadEvidence];
    const sourceIndex = new Map(sources.sources.map((source) => [source.sourceId, source]));
    const evidenceFor = (ids: string[]): EvidenceView[] =>
      evidenceViews(
        ids
          .map((id) => records.find((record) => record.evidenceId === id))
          .filter((record): record is EvidenceRecord => record !== undefined),
        sourceIndex
      );
    const view = reviewItemView(item, snapshot, evidenceFor, {
      index: 1,
      total: pending.length
    });
    const payloadAssessmentId: unknown = payload.assessmentId;
    const payloadAssessment = isAssessmentRecord(payload.assessment)
      ? payload.assessment
      : undefined;
    const assessment =
      snapshot.assessments.find((entry) => entry.assessmentId === item.targetId) ??
      payloadAssessment ??
      (typeof payloadAssessmentId === "string"
        ? snapshot.assessments.find((entry) => entry.assessmentId === payloadAssessmentId)
        : undefined);
    if (assessment) {
      view.title = assessment.name;
      const payloadFacts = Array.isArray(payload.facts) ? payload.facts.filter(isFactRecord) : [];
      const storedFacts = snapshot.facts.filter(
        (fact) => fact.assessmentId === assessment.assessmentId
      );
      const facts = storedFacts.length > 0 ? storedFacts : payloadFacts;
      view.unresolvedQuestions = facts
        .map((fact) =>
          fact.value.state === "UNCERTAIN" ? `${fieldLabel(fact.field)} is unclear` : null
        )
        .filter((question): question is string => question !== null);
      if (view.subtitle === undefined) view.subtitle = kindLabel(assessment.kind, assessment.role);
    }
    return view;
  }

  private settingsPlaceholder(): SettingsView {
    return {
      apiKey: { state: "unvalidated" },
      privacy: true,
      apiUsage: true,
      version: this.dependencies.productVersion
    };
  }
}

type ConstraintViewLike = CourseView["constraints"][number];

function isAssessmentRecord(value: unknown): value is AssessmentRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Partial<AssessmentRecord>).assessmentId === "string"
  );
}

function isFactRecord(value: unknown): value is FactRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Partial<FactRecord>).factId === "string"
  );
}

function isEvidenceRecord(value: unknown): value is EvidenceRecord {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Partial<EvidenceRecord>).evidenceId === "string"
  );
}

function isWorkflow(value: WorkflowRecord | undefined): value is WorkflowRecord {
  return value !== undefined;
}

export function groupFacts(facts: FactRecord[]): Map<string, FactRecord[]> {
  const map = new Map<string, FactRecord[]>();
  for (const fact of facts) {
    if (!fact.assessmentId) continue;
    const list = map.get(fact.assessmentId) ?? [];
    list.push(fact);
    map.set(fact.assessmentId, list);
  }
  return map;
}

export function taskStatus(workflow: WorkflowRecord): TaskStatusView {
  // A run is one of three things to the person watching it: doing the work, needing them for
  // something only they can supply, or unable to go on. `saved` is none of those — §11.3 keeps it
  // for persistence, and a run parked on its retry schedule (five minutes, then thirty) is still
  // the task they started, which continues by itself. `Progress saved.` used to stand for it and
  // is in no product document. (Gate 3 finding F23; removed on Product Owner direction.)
  const state: TaskStatusView["state"] =
    workflow.state === "waiting" ? "waiting" : workflow.state === "failed" ? "failed" : "working";
  const phase = PHASE_COPY[workflow.phase];
  const base: TaskStatusView = {
    workflowId: workflow.workflowId,
    state,
    ...(state === "working" && phase ? { phase } : {})
  };
  // §11.7: Waiting on the user has exactly four reasons, and every one of them is something the
  // user supplies. A run waiting for nothing is a Scan that has finished — §5.4 sends it into the
  // Initial Review it produced — so it carries no waiting description at all, and
  // `Waiting for your review` is gone with it: §5.6 makes `Waiting` an internal state that is
  // never user copy. (Gate 3 finding F21.)
  if (
    workflow.state === "waiting" &&
    workflow.waitingReason !== undefined &&
    workflow.waitingReason !== "review"
  ) {
    const copy: Record<NonNullable<TaskStatusView["waiting"]>["reason"], string> = {
      "api-key": "DeepSeek API key required",
      "privacy-authorization": "Permission required",
      "api-usage-authorization": "Permission required",
      "host-permission": "Permission required"
    };
    base.waiting = {
      reason: workflow.waitingReason,
      copy: copy[workflow.waitingReason],
      // Every Waiting screen carries the action that ends it (§5.6). The two authorization reasons
      // were the exception — the screen said "Permission required" and offered nothing, telling the
      // user what was missing and giving them nowhere to fix it. Both are granted in Settings,
      // which is where §10.3 keeps them. (Gate 3 finding F24.)
      ...(workflow.waitingReason === "api-key" ||
      workflow.waitingReason === "privacy-authorization" ||
      workflow.waitingReason === "api-usage-authorization"
        ? { action: "OpenSettings" as const }
        : { action: "GrantPermission" as const })
    };
  }
  if (workflow.state === "failed") {
    base.failure = {
      copy: workflow.lastErrorDetail ?? t("taskCouldNotComplete"),
      retryable: workflow.paidRetryAvailable === true,
      consumesApi: workflow.retryConsumesApi === true,
      errorCode: workflow.errorCode ?? "UNKNOWN"
    };
  }
  return base;
}

export function courseCues(
  course: CourseRecord,
  changes: ChangeRecord[],
  reviewItems: ReviewItemRecord[],
  workflows: WorkflowRecord[],
  settings: SettingsView,
  now: Date
): StatusCue[] {
  const cues: StatusCue[] = [];
  const workflow = workflows.find((item) => item.state !== "complete");
  if (workflow?.state === "waiting" && workflow.waitingReason === "api-key") {
    cues.push({ kind: "api-key", copy: "API key required" });
  } else if (workflow?.state === "waiting" && workflow.waitingReason === "host-permission") {
    cues.push({ kind: "permission", copy: "Permission required" });
  } else if (
    workflow?.state === "waiting" &&
    (workflow.waitingReason === "privacy-authorization" ||
      workflow.waitingReason === "api-usage-authorization")
  ) {
    cues.push({ kind: "authorization", copy: "Permission required" });
  }
  if (settings.apiKey.state === "invalid") {
    cues.push({ kind: "needs-attention", copy: "API key needs attention" });
  }
  const schedule: CheckSchedule = {
    ...(course.lastSuccessfulCheckAt
      ? { lastSuccessfulCheckAt: course.lastSuccessfulCheckAt }
      : {}),
    ...(course.nextCheckAt ? { nextAttemptAt: course.nextCheckAt } : {}),
    unchangedStreak: course.unchangedStreak ?? 0,
    consecutiveFailures: course.consecutiveCheckFailures,
    currentSemester: true,
    established: course.established
  };
  if (needsFreshnessAttention(schedule, now)) {
    cues.push({
      kind: "needs-attention",
      copy: "Needs attention",
      // §4.17 / §11.6 draw the block as the sentence, then the date, then `Try again`. The detail
      // used to open with the sentence again — the screen already prints it as the title above — so
      // the reason the user was given appeared twice, and with no date it was the same line twice.
      // (Gate 3 finding F32.)
      ...(course.lastSuccessfulCheckAt
        ? { detail: t("attentionLastCheck", { date: formatDay(course.lastSuccessfulCheckAt) }) }
        : {})
    });
  }
  const pending = changes.length + reviewItems.length;
  if (pending > 0) {
    cues.push({ kind: "pending-review", count: pending, copy: `${String(pending)} to review` });
  }
  if (workflow?.state === "working") {
    cues.push({ kind: "checking", copy: "Checking…" });
  }
  if (course.lastSuccessfulCheckAt) {
    cues.push({
      kind: "freshness",
      copy: `Checked ${relativeTime(course.lastSuccessfulCheckAt, now)}`
    });
  }
  return cues;
}

function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function reviewItemView(
  item: ReviewItemRecord,
  snapshot: {
    assessments: AssessmentRecord[];
    facts: FactRecord[];
    changes: ChangeRecord[];
    constraints: ConstraintRecord[];
  },
  evidence: (ids: string[]) => EvidenceView[],
  position: { index: number; total: number }
): ReviewItemView {
  const change = snapshot.changes.find((entry) => entry.targetId === item.targetId);
  const assessment = snapshot.assessments.find((entry) => entry.assessmentId === item.targetId);
  const fact = snapshot.facts.find(
    (entry) => entry.assessmentId === item.targetId && entry.field === change?.field
  );
  const title = assessment?.name ?? change?.field ?? t("reviewCourseChange");
  const base: ReviewItemView = {
    reviewItemId: item.reviewItemId,
    kind: item.kind === "initial" ? "initial" : item.kind === "identity" ? "identity" : "change",
    ...(change?.changeType ? { changeType: change.changeType } : {}),
    title,
    position,
    unresolvedQuestions: [],
    actions: []
  };
  if (item.kind === "initial") {
    const draft = item.payload.assessment as AssessmentRecord | undefined;
    base.title = draft?.name ?? title;
    const subtitle = draft ? kindLabel(draft.kind, draft.role) : "";
    if (subtitle) base.subtitle = subtitle;
    base.actions = ["Confirm", "Edit", "Exclude", "ReviewLater", "SameAssessmentAs", "Split"];
    return base;
  }
  if (change?.changeType === "CONFLICT") {
    const currentValue = change.currentValue ?? fact?.value;
    base.current = {
      label: "Current",
      values: [
        {
          display: currentValue ? renderFactValue(currentValue) : "—",
          evidence: evidence(
            change.currentEvidenceIds.length > 0
              ? change.currentEvidenceIds
              : (fact?.evidenceRefs.map((ref) => ref.evidenceId ?? "") ?? [])
          )
        }
      ]
    };
    base.latest = {
      label: "Other values",
      values: competingValues(change.latestValue ?? { state: "KNOWN" }).map((value) => ({
        display: value,
        evidence: evidence(change.newEvidenceIds)
      }))
    };
    base.actions = ["ChooseValue", "EditValue"];
    return base;
  }
  if (change?.changeType === "POSSIBLY_REMOVED") {
    base.actions = ["Keep", "Remove"];
    return base;
  }
  if (change?.changeType === "IDENTITY_UNCERTAIN" || item.kind === "identity") {
    base.kind = "identity";
    base.actions = ["SameAssessment", "DifferentAssessment"];
    return base;
  }
  // A pending change always reads as Current → Latest, and the Current side is the value the
  // change was raised against — not whatever the field happens to hold now.
  const current = change?.currentValue ?? fact?.value;
  base.current = {
    label: "Current",
    values: [
      {
        display: current ? renderFactValue(current) : "—",
        evidence: evidence(
          change?.currentEvidenceIds ?? fact?.evidenceRefs.map((ref) => ref.evidenceId ?? "") ?? []
        )
      }
    ]
  };
  base.latest = {
    label: "Latest",
    values: [
      {
        display: change?.latestValue ? renderFactValue(change.latestValue) : "—",
        evidence: evidence(change?.newEvidenceIds ?? [])
      }
    ]
  };
  base.actions =
    change?.changeType === "NEW" ? ["Confirm", "Exclude"] : ["AcceptChange", "KeepCurrent"];
  return base;
}
