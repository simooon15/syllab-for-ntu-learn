import { createBackup, type DurableTable } from "./backup";
import { exportCalendar } from "./calendar-export";
import { calendarExportInput } from "./calendar-plan";
import type { Mutation, Surface, ViewMessage, ViewResponse } from "./contract";
import { CodedError } from "./errors";
import type {
  AssessmentRecord,
  CourseRecord,
  EvidenceRecord,
  FactRecord,
  ReviewItemRecord
} from "./domain";
import { randomId } from "./crypto";
import { exclusionKeysFor, isSuppressed, rebuildFailureSources } from "./materialize";
import { qaTrace } from "./qa-telemetry";
import { startMaintenanceCheck } from "./opportunity";
import { applyRestore, prepareRestore } from "./restore";
import { REVIEW_SCREENS } from "./screens/render";
import type { LocalStore } from "./store";
import type { LocalDatabase } from "./storage";
import type { RebuildStagingStore } from "./staging";
import type { Route, ViewBuilder } from "./view";
import type { CourseSnapshot } from "./course-state";
import type { WorkflowEngine } from "./workflow";

export interface RouteState {
  route: Route;
}

/** Survives a service-worker restart, so an interrupted session keeps its place. */
export interface SessionStorage {
  get(key: string): Promise<unknown>;
  set(key: string, value: unknown): Promise<void>;
}

const ROUTE_STORAGE_KEY = "syllab.surfaceRoutes";

export interface HandlerDependencies {
  store: LocalStore;
  database: LocalDatabase;
  staging: RebuildStagingStore;
  session: SessionStorage;
  views: ViewBuilder;
  engine: WorkflowEngine;
  surfaceRoutes: Map<string, Route>;
  now: () => Date;
  /** Runs the workflow to completion in the background, reporting only its final state. */
  driveWorkflow: (workflowId: string) => void;
  /**
   * The NTU Learn tab a Scan reads through, for the surfaces that cannot name one themselves. The
   * Full-page surface is its own tab, so the tab a Scan must use is never the tab it was started
   * from; it is whichever NTU Learn tab the user has open.
   */
  resolveScanTab: () => Promise<number | undefined>;
  exportBackup: (payload: string, fileName: string) => Promise<void>;
  exportCalendar: (payload: string, fileName: string) => Promise<void>;
  setApiKey: (apiKey: string) => Promise<void>;
  /**
   * Asks the provider whether the stored key works, and records the answer.
   *
   * A check button that does not check is worse than no button: the user saves a key, presses it,
   * is told nothing, and has no way left to tell a bad key from a broken product. (Gate 3 finding F2.)
   */
  validateApiKey: () => Promise<"missing" | "valid" | "invalid">;
  setAuthorization: (kind: "privacy" | "apiUsage", granted: boolean) => Promise<void>;
  productVersion: string;
}

const DEFAULT_ROUTE = (surface: Surface): Route => ({
  surface,
  screen: surface === "side-panel" ? "SEM-02" : "SEM-01"
});

function routeKey(message: { surface: Surface; tabId?: number }): string {
  return `${message.surface}:${message.tabId === undefined ? "default" : String(message.tabId)}`;
}

function errorCode(error: unknown): string {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = error.code;
    if (typeof code === "string") return code;
  }
  if (error instanceof Error && error.message) return error.message;
  return "UNKNOWN";
}

const ERROR_COPY: Record<string, string> = {
  COURSE_REVISION_CONFLICT:
    "This course changed while you were reading it. Your view has been refreshed.",
  COURSE_NOT_FOUND: "This course is no longer available.",
  REVIEW_ITEM_NOT_FOUND: "That review item has already been handled.",
  CHANGE_NOT_FOUND: "That change has already been handled.",
  CHANGE_NOT_APPLICABLE: "That change can no longer be applied.",
  CONFLICT_NOT_FOUND: "That conflict has already been resolved.",
  MERGE_SAME_TARGET: "Pick a different assessment to merge into.",
  MERGE_TARGET_NOT_CANONICAL: "That assessment can no longer be merged into.",
  SPLIT_NEEDS_TWO_PARTS: "A split needs at least two separate assessments.",
  ASSESSMENT_EXISTS: "That assessment already exists.",
  FACT_NOT_FOUND: "That field is no longer available.",
  BACKUP_FORMAT_UNSUPPORTED: "This backup file was made by an unsupported Syllab version.",
  BACKUP_DIGEST_MISMATCH: "This backup file is incomplete or was modified.",
  BACKUP_INVALID: "This backup file could not be read.",
  WORKFLOW_NOT_FOUND: "That task is no longer running.",
  PARTIAL_REBUILD_NOT_ADOPTABLE: "This partial rebuild cannot replace your current course.",
  API_KEY_EMPTY: "Enter your DeepSeek API key first."
};

function copyFor(code: string): string {
  return ERROR_COPY[code] ?? "Something went wrong. Please try again.";
}

export class ViewHandler {
  private rehydrated: Promise<void> | null = null;

  constructor(private readonly dependencies: HandlerDependencies) {}

  /**
   * A Service Worker is evicted whenever the browser feels like it, and a surface's place in the
   * product must not depend on the worker staying warm. The route map is therefore restored from
   * session storage before the first message is served.
   */
  private async hydrate(): Promise<void> {
    this.rehydrated ??= (async () => {
      const stored = await this.dependencies.session.get(ROUTE_STORAGE_KEY);
      if (typeof stored !== "object" || stored === null) return;
      for (const [key, value] of Object.entries(stored as Record<string, unknown>)) {
        if (isRoute(value)) this.dependencies.surfaceRoutes.set(key, value);
      }
    })();
    return this.rehydrated;
  }

  private async rememberRoute(key: string, route: Route): Promise<void> {
    this.dependencies.surfaceRoutes.set(key, route);
    await this.dependencies.session.set(
      ROUTE_STORAGE_KEY,
      Object.fromEntries(this.dependencies.surfaceRoutes)
    );
  }

  private route(message: ViewMessage): Route {
    if (!("surface" in message)) return DEFAULT_ROUTE("full-page");
    const surface: Surface = message.surface;
    const stored = this.dependencies.surfaceRoutes.get(routeKey({ surface }));
    return stored ?? DEFAULT_ROUTE(surface);
  }

  async handle(message: ViewMessage): Promise<ViewResponse> {
    try {
      await this.hydrate();
      switch (message.type) {
        case "GET_VIEW": {
          const route = this.route(message);
          const tabCourseId = await this.courseIdFromTab(message.surface, message.tabId);
          return {
            ok: true,
            view: await this.dependencies.views.build({
              ...route,
              ...(tabCourseId && !route.courseId ? { tabCourseId } : {})
            })
          };
        }
        case "OPEN_SCREEN": {
          const route: Route = {
            surface: message.surface,
            screen: message.screen,
            ...(message.courseId ? { courseId: message.courseId } : {})
          };
          await this.rememberRoute(routeKey(message), route);
          const tabCourseId = await this.courseIdFromTab(message.surface, undefined);
          const opened = await this.dependencies.views.build({
            ...route,
            ...(tabCourseId && !route.courseId ? { tabCourseId } : {})
          });
          if (REVIEW_SCREENS.includes(message.screen)) {
            qaTrace("qa.review-opened", {
              screen: message.screen,
              pending: opened.review !== undefined
            });
          }
          return { ok: true, view: opened };
        }
        case "MUTATE":
          return await this.mutate(message);
        case "SET_API_KEY":
          await this.setApiKey(message.apiKey);
          return { ok: true, view: await this.dependencies.views.build(this.route(message)) };
        case "VALIDATE_API_KEY":
          await this.dependencies.validateApiKey();
          return { ok: true, view: await this.dependencies.views.build(this.route(message)) };
        case "SET_AUTHORIZATION":
          await this.setAuthorization(message.kind, message.granted);
          return { ok: true, view: await this.dependencies.views.build(this.route(message)) };
        case "EXPORT_BACKUP": {
          const tables = await this.dependencies.store.readDurableTables();
          const backup = await createBackup(tables, this.dependencies.now().toISOString());
          await this.dependencies.exportBackup(
            JSON.stringify(backup, null, 2),
            `syllab-backup-${new Date().toISOString().slice(0, 10)}.json`
          );
          return { ok: true, view: await this.dependencies.views.build(this.route(message)) };
        }
        case "EXPORT_CALENDAR": {
          const course = await this.dependencies.store.readCourse(message.courseId);
          if (!course) throw new CodedError("COURSE_NOT_FOUND");
          const snapshot = await this.dependencies.store.readTrustedSnapshot(course.courseId);
          if (!snapshot) throw new CodedError("COURSE_NOT_FOUND");
          // The same input builder the CAL-01 preview uses, so the file cannot disagree with the
          // screen the user was looking at when they pressed Export.
          const semester = (await this.dependencies.store.readSemesters()).find(
            (item) => item.semesterId === course.semesterId
          );
          const exported = exportCalendar(calendarExportInput({ course, snapshot, semester }));
          await this.dependencies.exportCalendar(exported.content, exported.fileName);
          // What the file actually holds, counted from the file, and the same number the preview
          // gave — recorded separately so the two agreeing is evidence rather than a tautology.
          qaTrace("qa.calendar-exported", {
            courseCode: course.courseCode,
            fileName: exported.fileName,
            events: (exported.content.match(/BEGIN:VEVENT/g) ?? []).length
          });
          return { ok: true, view: await this.dependencies.views.build(this.route(message)) };
        }
        case "RESTORE_BACKUP":
          return await this.restore(message.backup, message.confirmed === true, message);
        default:
          return {
            ok: false,
            error: { code: "UNSUPPORTED", copy: "This action is not available." }
          };
      }
    } catch (error) {
      const code = errorCode(error);
      return {
        ok: false,
        error: {
          code,
          copy: copyFor(code),
          ...(error instanceof Error && error.message !== code ? { detail: error.message } : {})
        }
      };
    }
  }

  /**
   * Full Replace, in the two steps the Interaction Spec requires. An unconfirmed send only
   * validates the file and reports what it holds, so the Full Replace warning is shown before
   * anything is written; the confirmed send swaps the generation in one transaction.
   */
  private async restore(
    backup: unknown,
    confirmed: boolean,
    message: ViewMessage
  ): Promise<ViewResponse> {
    const surface: Surface = "surface" in message ? message.surface : "full-page";
    const prepared = await prepareRestore(backup);
    // The user stays where they are while reading the summary; only a confirmed replace moves
    // them, because the state it described has gone.
    const route = this.route(message);
    const view = await this.dependencies.views.build(route);
    const withSummary: ViewResponse = {
      ok: true,
      view: {
        ...view,
        backupSummary: {
          semesters: prepared.summary.semesters,
          courseCount: prepared.summary.courseCount,
          assessmentCount: prepared.summary.assessmentCount
        }
      }
    };
    if (!confirmed) return withSummary;
    await applyRestore(this.dependencies.database, prepared);
    const restored = DEFAULT_ROUTE(surface);
    await this.rememberRoute(routeKey({ surface }), restored);
    const restoredView = await this.dependencies.views.build(restored);
    return {
      ok: true,
      view: {
        ...restoredView,
        backupSummary: {
          semesters: prepared.summary.semesters,
          courseCount: prepared.summary.courseCount,
          assessmentCount: prepared.summary.assessmentCount
        }
      }
    };
  }

  private async setApiKey(apiKey: string): Promise<void> {
    await this.dependencies.setApiKey(apiKey.trim());
  }

  private async setAuthorization(kind: "privacy" | "apiUsage", granted: boolean): Promise<void> {
    await this.dependencies.setAuthorization(kind, granted);
  }

  /**
   * The Course the current tab is looking at. The toolbar records it when it opens the Side Panel,
   * so the surface can land on the right Course without re-deriving the tab context.
   */
  private courseIdFromTab(surface: Surface, tabId: number | undefined): Promise<string | null> {
    if (surface !== "side-panel") return Promise.resolve(null);
    const key = tabId === undefined ? "side-panel:default" : `side-panel:${String(tabId)}`;
    return Promise.resolve(this.dependencies.surfaceRoutes.get(key)?.courseId ?? null);
  }

  private async mutate(message: Extract<ViewMessage, { type: "MUTATE" }>): Promise<ViewResponse> {
    const courseId = message.courseId;
    const mutation: Mutation = message.mutation;
    const now = this.dependencies.now().toISOString();

    if ("courseId" in mutation && typeof mutation.courseId === "string") {
      await this.applyCourseMutation(mutation.courseId, mutation, message.expectedRevision, now);
    } else if (courseId) {
      await this.applyCourseMutation(courseId, mutation, message.expectedRevision, now);
    }

    const route = this.route(message);
    return {
      ok: true,
      view: await this.dependencies.views.build({ ...route, ...(courseId ? { courseId } : {}) })
    };
  }

  private async applyCourseMutation(
    courseId: string,
    mutation: Mutation,
    expectedRevision: number,
    now: string
  ): Promise<void> {
    const store = this.dependencies.store;
    const course = await store.readCourse(courseId);
    if (!course) throw new CodedError("COURSE_NOT_FOUND");
    const snapshot = await store.readSnapshot(courseId);
    if (!snapshot) throw new CodedError("COURSE_NOT_FOUND");

    switch (mutation.kind) {
      case "StartScan": {
        // Discovery is a read through a live NTU Learn tab, so a Scan with no tab to read through
        // would fail at its first step rather than at anything the user did.
        const tabId = mutation.tabId ?? (await this.dependencies.resolveScanTab());
        const workflow = await this.dependencies.engine.start(course, "initial", {
          ...(tabId !== undefined ? { tabId } : {})
        });
        this.dependencies.driveWorkflow(workflow.workflowId);
        return;
      }
      case "CheckForUpdates": {
        const workflow = await startMaintenanceCheck(
          course,
          this.dependencies.engine,
          this.dependencies.resolveScanTab
        );
        if (!workflow) return;
        this.dependencies.driveWorkflow(workflow.workflowId);
        return;
      }
      case "RebuildCourse": {
        const tabId = await this.dependencies.resolveScanTab();
        const workflow = await this.dependencies.engine.start(course, "rebuild", {
          ...(tabId !== undefined ? { tabId } : {})
        });
        this.dependencies.driveWorkflow(workflow.workflowId);
        return;
      }
      case "RetryTask": {
        // What a retry resumes is a run that stopped because the user had something to do: a
        // failure they can try again, or a Source parked on an Origin they have now allowed. The
        // run keeps its place either way — the Sources it already read are settled. (F28.)
        const workflow = (await store.listWorkflows()).find(
          (item) =>
            item.workflowId === mutation.workflowId &&
            item.courseId === courseId &&
            (item.state === "failed" ||
              (item.state === "waiting" && item.waitingReason === "host-permission"))
        );
        if (workflow) {
          const {
            waitingReason: _waitingReason,
            errorCode: _errorCode,
            lastErrorDetail: _lastErrorDetail,
            paidRetryAvailable: _paidRetryAvailable,
            retryConsumesApi: _retryConsumesApi,
            lease: _lease,
            ...carried
          } = workflow;
          await store.saveWorkflow({
            ...carried,
            state: "saved",
            ...(workflow.state === "failed" ? { attempt: 0 } : {}),
            updatedAt: now
          });
          this.dependencies.driveWorkflow(workflow.workflowId);
        }
        return;
      }
      case "ConfirmReviewItem":
      case "ExcludeReviewItem":
      case "DeferReviewItem":
      case "SameAssessmentAs":
      case "SplitAssessment":
        await this.applyReviewMutation(course, snapshot, mutation, expectedRevision, now);
        return;
      case "AcceptChange":
      case "KeepCurrent":
      case "ResolveConflict":
      case "KeepPossiblyRemoved":
      case "RemovePossiblyRemoved":
      case "ResolveIdentity":
        await this.applyChangeMutation(course, snapshot, mutation, expectedRevision, now);
        return;
      case "EditFact":
        await this.applyEdit(course, snapshot, mutation, expectedRevision, now);
        return;
      case "RenameAssessment":
        await this.applyRename(course, snapshot, mutation, expectedRevision, now);
        return;
      case "AddAssessment":
        await this.applyManualAdd(course, mutation, expectedRevision, now);
        return;
      case "UseRebuiltCourse":
      case "KeepCurrentCourse":
        await this.confirmRebuild(course, snapshot, mutation.kind, expectedRevision, now);
        return;
      case "UndeleteExclusion":
        return;
      default:
        return;
    }
  }

  private async applyReviewMutation(
    course: CourseRecord,
    snapshot: CourseSnapshot,
    mutation: Extract<Mutation, { reviewItemId: string }>,
    expectedRevision: number,
    now: string
  ): Promise<void> {
    const store = this.dependencies.store;
    const item = snapshot.reviewItems.find((entry) => entry.reviewItemId === mutation.reviewItemId);
    if (!item) throw new CodedError("REVIEW_ITEM_NOT_FOUND");

    if (mutation.kind === "DeferReviewItem") {
      await store.commitMutation(course.courseId, {
        snapshot,
        decisions: [
          {
            decisionId: randomId("dec"),
            courseId: course.courseId,
            reviewItemId: item.reviewItemId,
            kind: "Defer",
            targetId: item.targetId,
            decidedAt: now
          }
        ],
        history: []
      });
      return;
    }

    if (mutation.kind === "ExcludeReviewItem") {
      const memory = await this.exclusionKeyFor(course.courseId, item);
      if (memory) await store.recordExclusion(memory);
      const { applyInitialReviewDecision } = await import("./course-state");
      const decided = applyInitialReviewDecision(snapshot, {
        reviewItemId: item.reviewItemId,
        kind: "Exclude",
        expectedRevision,
        now
      });
      const result =
        item.changeType === "NEW"
          ? {
              ...decided,
              snapshot: {
                ...decided.snapshot,
                changes: decided.snapshot.changes.filter(
                  (change) => change.changeId !== item.payload.changeId
                )
              }
            }
          : decided;
      await store.commitReviewDecision(course.courseId, item.reviewItemId, result, {
        changeIdsToDelete:
          item.changeType === "NEW" && typeof item.payload.changeId === "string"
            ? [item.payload.changeId]
            : []
      });
      return;
    }

    if (mutation.kind === "ConfirmReviewItem") {
      const { applyInitialReviewDecision } = await import("./course-state");
      const payloadAssessment = isAssessmentRecord(item.payload.assessment)
        ? item.payload.assessment
        : undefined;
      const payloadFacts = Array.isArray(item.payload.facts)
        ? item.payload.facts.filter(isFactRecord)
        : [];
      const payloadEvidence = Array.isArray(item.payload.evidence)
        ? item.payload.evidence.filter(isEvidenceRecord)
        : [];
      const storedFacts = snapshot.facts.filter((fact) => fact.assessmentId === item.targetId);
      const facts = storedFacts.length > 0 ? storedFacts : payloadFacts;
      const assessment =
        snapshot.assessments.find((entry) => entry.assessmentId === item.targetId) ??
        payloadAssessment;
      if (!assessment) throw new CodedError("ASSESSMENT_EXISTS");
      const edited = mutation.edited;
      const editedFacts: FactRecord[] = edited?.facts
        ? facts.map((fact) => {
            const update = edited.facts?.find((entry) => entry.factId === fact.factId);
            return update ? { ...fact, value: update.value } : fact;
          })
        : facts;
      const decided = applyInitialReviewDecision(snapshot, {
        reviewItemId: item.reviewItemId,
        kind: edited ? "Edit" : "Confirm",
        expectedRevision,
        now,
        assessment: {
          ...assessment,
          name: edited?.name ?? assessment.name,
          established: true
        } as AssessmentRecord & { established?: boolean },
        facts: editedFacts
      });
      const result =
        item.changeType === "NEW"
          ? {
              ...decided,
              snapshot: {
                ...decided.snapshot,
                changes: decided.snapshot.changes.filter(
                  (change) => change.changeId !== item.payload.changeId
                )
              }
            }
          : decided;
      await store.commitReviewDecision(course.courseId, item.reviewItemId, result, {
        evidence: payloadEvidence,
        changeIdsToDelete:
          item.changeType === "NEW" && typeof item.payload.changeId === "string"
            ? [item.payload.changeId]
            : []
      });
      return;
    }

    if (mutation.kind === "SameAssessmentAs") {
      const { mergeAssessment } = await import("./course-state");
      const result = mergeAssessment(snapshot, {
        reviewItemId: item.reviewItemId,
        sourceAssessmentId: item.targetId,
        targetAssessmentId: mutation.targetAssessmentId,
        expectedRevision,
        now
      });
      await store.commitReviewDecision(course.courseId, item.reviewItemId, result);
      return;
    }

    if (mutation.kind !== "SplitAssessment") throw new CodedError("UNSUPPORTED");
    const { splitAssessment } = await import("./course-state");
    const result = splitAssessment(snapshot, {
      reviewItemId: item.reviewItemId,
      sourceAssessmentId: item.targetId,
      parts: mutation.parts.map((part) => ({
        assessmentId: `assessment_${randomId("split")}`,
        name: part.name,
        factIds: part.factIds
      })),
      expectedRevision,
      now
    });
    await store.commitReviewDecision(course.courseId, item.reviewItemId, result);
  }

  /**
   * Rebuild adoption is an all-or-nothing switch: the rebuilt state replaces Current State
   * only when the user adopts it, and declining changes nothing but History.
   */
  private async confirmRebuild(
    course: CourseRecord,
    snapshot: CourseSnapshot,
    kind: "UseRebuiltCourse" | "KeepCurrentCourse",
    expectedRevision: number,
    now: string
  ): Promise<void> {
    const state = await import("./course-state");
    const rebuildWorkflow = (await this.dependencies.store.listWorkflows())
      .filter((workflow) => workflow.courseId === course.courseId && workflow.kind === "rebuild")
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
    if (!rebuildWorkflow) throw new CodedError("REBUILD_STAGING_MISSING");
    const completeRebuildWorkflow = async (): Promise<void> => {
      const { lease: _lease, waitingReason: _waitingReason, ...carried } = rebuildWorkflow;
      await this.dependencies.store.saveWorkflow({
        ...carried,
        state: "complete",
        phase: "review",
        phaseCursor: "complete",
        updatedAt: now
      });
    };
    if (kind === "KeepCurrentCourse") {
      const result = state.recordKeepCurrentCourse(snapshot, { expectedRevision, now });
      await this.dependencies.store.commitMutation(course.courseId, result);
      await this.dependencies.staging.clear(course.courseId, rebuildWorkflow.workflowId);
      await completeRebuildWorkflow();
      return;
    }
    const staged = await this.dependencies.staging.read(
      course.courseId,
      rebuildWorkflow.workflowId
    );
    if (!staged) throw new CodedError("REBUILD_STAGING_MISSING");
    const { observations } = await this.dependencies.store.readAllSourceStates(course.courseId);
    const failedSources = rebuildFailureSources(
      staged.taskACoverage?.failedSources ?? [],
      observations.filter((item) => item.workflowId === rebuildWorkflow.workflowId)
    );
    if (failedSources.length > 0) {
      throw new CodedError("PARTIAL_REBUILD_NOT_ADOPTABLE");
    }
    // Adoption is one transaction: the rebuilt objects replace Current State together, or not
    // at all. Staging is cleared only after the swap commits.
    const result = state.replaceCourseState(snapshot, {
      assessments: staged.assessments,
      constraints: staged.constraints,
      facts: staged.facts,
      expectedRevision,
      now,
      note: "rebuild"
    });
    await this.dependencies.store.commitMutation(course.courseId, result, {
      evidence: staged.evidence
    });
    await this.dependencies.staging.clear(course.courseId, rebuildWorkflow.workflowId);
    await completeRebuildWorkflow();
  }

  private async exclusionKeyFor(
    courseId: string,
    item: ReviewItemRecord
  ): Promise<{ courseId: string; proposalKey: string; evidenceFingerprint: string } | null> {
    const snapshot = await this.dependencies.store.readSnapshot(courseId);
    if (!snapshot) return null;
    const storedFacts = snapshot.facts.filter((fact) => fact.assessmentId === item.targetId);
    const payloadFacts = Array.isArray(item.payload.facts)
      ? item.payload.facts.filter(isFactRecord)
      : [];
    const facts = storedFacts.length > 0 ? storedFacts : payloadFacts;
    const evidenceIds = facts
      .flatMap((fact) => fact.evidenceRefs.map((ref) => ref.evidenceId ?? ""))
      .filter((id) => id.length > 0);
    const storedRecords = await this.dependencies.store.readEvidence(evidenceIds);
    const payloadEvidence = Array.isArray(item.payload.evidence)
      ? item.payload.evidence.filter(isEvidenceRecord)
      : [];
    const records = [
      ...storedRecords,
      ...payloadEvidence.filter(
        (candidate) => !storedRecords.some((stored) => stored.evidenceId === candidate.evidenceId)
      )
    ];
    const key = await exclusionKeysFor({
      proposalKey: item.targetId,
      evidenceIds,
      evidenceById: new Map(
        records.map((record) => [
          record.evidenceId,
          { sourceId: record.sourceId, locator: record.locator, excerpt: record.excerpt }
        ])
      )
    });
    const memory = await this.dependencies.store.readExclusionMemory(courseId);
    if (isSuppressed(key, memory)) return null;
    return { courseId, proposalKey: key.proposalKey, evidenceFingerprint: key.fingerprint };
  }

  private async applyChangeMutation(
    course: CourseRecord,
    snapshot: CourseSnapshot,
    mutation: Extract<Mutation, { changeId: string }>,
    expectedRevision: number,
    now: string
  ): Promise<void> {
    const state = await import("./course-state");
    const result = (() => {
      switch (mutation.kind) {
        case "AcceptChange":
          return state.acceptChange(snapshot, {
            changeId: mutation.changeId,
            expectedRevision,
            now
          });
        case "KeepCurrent":
          return state.keepCurrent(snapshot, {
            changeId: mutation.changeId,
            expectedRevision,
            now
          });
        case "ResolveConflict":
          return state.resolveConflict(snapshot, {
            changeId: mutation.changeId,
            resolution: mutation.value,
            expectedRevision,
            now
          });
        case "KeepPossiblyRemoved":
          return state.keepPossiblyRemoved(snapshot, {
            changeId: mutation.changeId,
            expectedRevision,
            now
          });
        case "RemovePossiblyRemoved":
          return state.removeAssessment(snapshot, {
            changeId: mutation.changeId,
            expectedRevision,
            now
          });
        default:
          return state.resolveIdentity(snapshot, {
            changeId: mutation.changeId,
            relationship: mutation.relationship,
            expectedRevision,
            now
          });
      }
    })();
    await this.dependencies.store.commitMutation(course.courseId, result);
    // The surface only ever holds a Review item id, so a change decision is resolved by finding
    // the review item that carries this change — whether it was materialised under the change id
    // or under an explicit `change_` prefix.
    await this.dependencies.store.deleteReviewItems(
      snapshot.reviewItems
        .filter(
          (item) =>
            item.reviewItemId === mutation.changeId ||
            item.payload.changeId === mutation.changeId ||
            `change_${item.reviewItemId}` === mutation.changeId
        )
        .map((item) => item.reviewItemId)
    );
  }

  private async applyEdit(
    course: CourseRecord,
    snapshot: CourseSnapshot,
    mutation: Extract<Mutation, { factId: string }>,
    expectedRevision: number,
    now: string
  ): Promise<void> {
    const { editFact } = await import("./course-state");
    const result = editFact(snapshot, {
      factId: mutation.factId,
      value: mutation.value,
      expectedRevision,
      now
    });
    await this.dependencies.store.commitMutation(course.courseId, result);
  }

  private async applyRename(
    course: CourseRecord,
    snapshot: CourseSnapshot,
    mutation: Extract<Mutation, { assessmentId: string }>,
    expectedRevision: number,
    now: string
  ): Promise<void> {
    const { renameAssessment } = await import("./course-state");
    const result = renameAssessment(snapshot, {
      assessmentId: mutation.assessmentId,
      name: mutation.name,
      expectedRevision,
      now
    });
    await this.dependencies.store.commitMutation(course.courseId, result);
  }

  private async applyManualAdd(
    course: CourseRecord,
    mutation: Extract<Mutation, { kind: "AddAssessment" }>,
    expectedRevision: number,
    now: string
  ): Promise<void> {
    const { manualAddAssessment } = await import("./course-state");
    const assessmentId = `assessment_user_${randomId("manual")}`;
    const facts: FactRecord[] = mutation.facts.map((entry, index) => ({
      factId: `${assessmentId}:${entry.field}:${String(index)}`,
      courseId: course.courseId,
      assessmentId,
      field: entry.field,
      value: entry.value,
      evidenceRefs: [],
      marks: [],
      userEdited: true,
      updatedAt: now
    }));
    const snapshot = await this.dependencies.store.readSnapshot(course.courseId);
    if (!snapshot) throw new CodedError("COURSE_NOT_FOUND");
    const result = manualAddAssessment(snapshot, {
      assessment: {
        assessmentId,
        courseId: course.courseId,
        role: "assessment",
        kind: mutation.assessment.kind,
        name: mutation.assessment.name,
        aliases: [],
        marks: [],
        createdBy: "user",
        createdAt: now,
        updatedAt: now
      },
      facts,
      expectedRevision,
      now
    });
    await this.dependencies.store.commitMutation(course.courseId, result);
  }
}

function isRoute(value: unknown): value is Route {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Route>;
  return candidate.surface === "side-panel" || candidate.surface === "full-page";
}

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

export type { DurableTable };
