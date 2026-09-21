import type { TaskAResult, TaskBResult, TaskCResult } from "./ai-contracts";
import { TASK_A_SCHEMA, validateTaskA, validateTaskB, validateTaskC } from "./ai-contracts";
import type { AiCall, AiCallOutcome, AiCourseIndexEntry, AiEvidence } from "./ai-pipeline";

/** What the engine knows about the run that the contract check needs. */
export interface AiCallContext {
  knownSourceIds: ReadonlySet<string>;
  coverage?: CoverageFacts;
  /** Supplied Evidence pool, tagged with the canonical object it was captured for. */
  evidence?: AiEvidence[];
}
import type { Chunk } from "./chunking";
import { createInitialWorkflow } from "./course-state";
import { DeepSeekFailure } from "./deepseek";
import { randomId } from "./crypto";
import type {
  AiRunRecord,
  AssessmentRecord,
  ChangeRecord,
  ConstraintRecord,
  CourseRecord,
  CoverageFacts,
  FactRecord,
  FactValue,
  HistoryRecord,
  ReviewItemRecord,
  SourceObservationRecord,
  SourceRecord,
  WorkflowKind,
  WorkflowPhase,
  WorkflowRecord
} from "./domain";
import { compareMachineRepresentations, sourceMachineRepresentation } from "./fingerprint";
import {
  coverageFromObservations,
  coverageSufficient,
  materializeTaskA,
  materializeTaskB,
  materializeTaskC,
  observationFor,
  type MaterializeContext,
  type PartialBundle
} from "./materialize";
import { upsertLatestChange } from "./change-reducer";
import { emptyStaging, type RebuildStagingStore, type StagedCourseState } from "./staging";
import { qaTrace } from "./qa-telemetry";
import { PROMPT_VERSIONS } from "./prompts";
import { invocationFingerprint } from "./invocation-policy";
import type { LocalStore } from "./store";

// A Task A/B stage can contain many sequential provider calls, and one provider call is allowed
// to run for five minutes. The heartbeat keeps long stages owned without weakening the
// completion-time token check; ten minutes is the grace window if the worker is briefly suspended.
export const LEASE_DURATION_MS = 10 * 60_000;
const LEASE_HEARTBEAT_MS = LEASE_DURATION_MS / 2;
export const MAX_ATTEMPTS = 3;
export const RETRY_DELAYS_MS = [5 * 60_000, 30 * 60_000, 2 * 60 * 60_000] as const;

/** One fetched and parsed Source, ready for the semantic stages. */
export interface FetchedSource {
  sourceId: string;
  nativeItemId: string;
  parentSourceId?: string;
  kind: string;
  title: string;
  text: string;
  structure: string[];
  pageLocators?: string[];
  pageImages?: Array<{ locator: string; dataUrl: string }>;
  fetchStatus: SourceObservationRecord["fetchStatus"];
  parseStatus: SourceObservationRecord["parseStatus"];
  errorCode?: string;
}

export interface MachinePort {
  discover(
    course: CourseRecord,
    tabId: number | undefined
  ): Promise<{
    sources: Array<{
      sourceId: string;
      /** The native item this Source is, as the course API names it. */
      nativeItemId: string;
      title: string;
      kind: string;
      parentSourceId?: string;
    }>;
  }>;
  /** Fetches and parses one Source. A per-Source failure is reported, not thrown. */
  fetchAndParse(
    source: SourceRecord,
    course: CourseRecord,
    tabId: number | undefined
  ): Promise<FetchedSource>;
  missingPermissionOrigins(): Promise<string[]>;
}

export interface AiPort {
  execute(call: AiCall, apiKey: string, context: AiCallContext): Promise<AiCallOutcome>;
  apiKey(): Promise<string | null>;
  privacyAuthorized(): Promise<boolean>;
  usageAuthorized(): Promise<boolean>;
}

export interface EngineClock {
  now(): Date;
}

export interface EngineOptions {
  store: LocalStore;
  machine: MachinePort;
  ai: AiPort;
  clock: EngineClock;
  /** Provisional Rebuild and maintenance Task A/B output lives outside Current State here. */
  staging: RebuildStagingStore;
  buildTaskACalls: (input: {
    source: {
      sourceId: string;
      sourceType: string;
      title: string;
      text: string;
      structure: string[];
      pageImages?: Array<{ locator: string; dataUrl: string }>;
    };
    course: { courseCode: string; courseName: string; semesterLabel?: string };
    chunks: Chunk[];
  }) => AiCall[];
  buildTaskAConsolidationCall: (input: {
    source: { sourceId: string; sourceType: string; title: string };
    chunkValues: unknown[];
    course: { courseCode: string; courseName: string };
  }) => AiCall;
  buildTaskBCalls: (input: {
    drafts: unknown[];
    constraintCandidates: unknown[];
    courseIndex: AiCourseIndexEntry[];
    evidence?: AiEvidence[];
  }) => AiCall[];
  buildTaskBExpansionCall: (input: {
    base: AiCall;
    requestedObjectIds: string[];
    evidence: AiEvidence[];
  }) => AiCall;
  buildTaskCCalls: (input: {
    target: AiCourseIndexEntry;
    currentFacts: unknown[];
    currentEvidence: AiEvidence[];
    newEvidence: AiEvidence[];
    identity: unknown;
    userState: unknown;
    coverageFacts: CoverageFacts;
    history?: unknown[];
  }) => AiCall[];
  planChunks: (input: {
    sourceId: string;
    locator: string;
    text: string;
    structure: string[];
  }) => Chunk[];
  /**
   * Called when a run moves to a different user-facing stage, and when it finishes.
   *
   * §5.2 asks the Scan screen to show the real current stage. A surface that is only told about the
   * run when the whole run is over shows the first stage for all of it — minutes, on a Course with
   * a hundred Sources — and the stage list stops meaning anything. The engine reports the stage;
   * what a surface does with it is not the engine's business. (Gate 3 finding F27.)
   */
  onStage?: (workflow: WorkflowRecord) => void;
}

/** Everything one engine step needs about the run: persistence context, Coverage inputs and the
 * Evidence pool the contract checks validate against. */
export type RunContext = MaterializeContext & {
  sourceRecords: SourceRecord[];
  observations: SourceObservationRecord[];
  evidence: AiEvidence[];
};

export interface StepResult {
  workflow: WorkflowRecord;
  /** True when the engine still has automatic work it can do right now. */
  progressed: boolean;
}

export class EngineError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
    message: string = code
  ) {
    super(message);
  }
}

/** A provider response arrived after this worker lost its workflow lease. */
export class StaleWorkflowCompletion extends Error {
  constructor(workflowId: string) {
    super(`Stale workflow completion discarded: ${workflowId}`);
    this.name = "StaleWorkflowCompletion";
  }
}

/**
 * Whether a parked run may be picked up again.
 *
 * `RETRY_DELAYS_MS` is the schedule this engine declares — five minutes, then thirty, then two hours
 * — and until Gate 3 nothing read it, so a parked run could be retried the instant anything looked
 * at it. That is only harmless while nothing looks; a service worker is restarted many times in one
 * browser session, and a resume wired to that without a delay would spend a paid call on every
 * restart. A run that was interrupted mid-flight (`working`) or never started (`queued`) is due
 * immediately: nothing was spent on it, and its lease is what stops two callers doing the same work.
 * (Gate 3 finding F5.)
 */
/**
 * When a parked run may be picked up again, or null when it is not parked on a delay.
 *
 * Naming the moment, rather than only answering "is it due yet", is what lets something be
 * scheduled to wake up for it. A step that fails recoverably parks as `saved`, and `saved` renders
 * as `Progress saved.` — a screen with no action on it. The run was left waiting for whatever
 * happened to look next, which in practice meant the next browser start. (Gate 3 finding F31.)
 */
export function retryDueAt(workflow: WorkflowRecord): number | null {
  if (workflow.state === "queued") return 0;
  if (workflow.state === "working") {
    // A live owner may run for as long as the provider needs. The timestamp is not an AI runtime
    // limit; it is only the earliest moment a replacement worker may recover an abandoned run.
    // Booking that moment matters because a Service Worker can be evicted while a run is active:
    // boot sees the still-live lease, declines to duplicate it, and must arrange another wake-up
    // after the recovery lease expires.
    return workflow.lease ? Date.parse(workflow.lease.expiresAt) : 0;
  }
  if (workflow.state !== "saved") return null;
  const index = Math.max(0, Math.min(workflow.attempt, RETRY_DELAYS_MS.length) - 1);
  const delay = RETRY_DELAYS_MS[index] ?? 0;
  return Date.parse(workflow.updatedAt) + delay;
}

export function retryDue(workflow: WorkflowRecord, now: Date): boolean {
  const dueAt = retryDueAt(workflow);
  return dueAt !== null && dueAt <= now.getTime();
}

const REVIEW: WorkflowPhase = "review";

function sequenceFor(kind: WorkflowKind): WorkflowPhase[] {
  return kind === "check"
    ? ["discover", "fetch", "parse", "normalize", "task-a", "task-b", "task-c", REVIEW]
    : ["discover", "fetch", "parse", "normalize", "task-a", "task-b", REVIEW];
}

function nextPhase(kind: WorkflowKind, phase: WorkflowPhase): WorkflowPhase | null {
  const sequence = sequenceFor(kind);
  const index = sequence.indexOf(phase);
  return index < 0 ? null : (sequence[index + 1] ?? null);
}

export class WorkflowEngine {
  constructor(private readonly options: EngineOptions) {}

  private nowIso(): string {
    return this.options.clock.now().toISOString();
  }

  private async assertCompletionOwnership(workflow: WorkflowRecord): Promise<void> {
    const current = await this.options.store.readWorkflow(workflow.workflowId);
    const ownsLease =
      current?.state === "working" &&
      current.lease?.token !== undefined &&
      current.lease.token === workflow.lease?.token &&
      current.phase === workflow.phase &&
      current.attempt === workflow.attempt;
    if (!ownsLease) throw new StaleWorkflowCompletion(workflow.workflowId);
  }

  private async renewLease(workflow: WorkflowRecord): Promise<void> {
    const current = await this.options.store.readWorkflow(workflow.workflowId);
    if (
      current?.state !== "working" ||
      current.lease?.token === undefined ||
      current.lease.token !== workflow.lease?.token ||
      current.phase !== workflow.phase ||
      current.attempt !== workflow.attempt
    ) {
      return;
    }
    await this.options.store.saveWorkflow({
      ...current,
      lease: {
        token: current.lease.token,
        expiresAt: new Date(Date.parse(this.nowIso()) + LEASE_DURATION_MS).toISOString()
      },
      updatedAt: this.nowIso()
    });
  }

  /**
   * Machine facts (Sources, Observations) are recorded immediately because they are true
   * regardless of the outcome. Course state is different: during a Rebuild it accumulates in
   * staging so a failure or a declined result cannot disturb the trusted Current State.
   */
  private async writeState(workflow: WorkflowRecord, bundle: PartialBundle): Promise<void> {
    await this.assertCompletionOwnership(workflow);
    const { sources, observations, ...state } = bundle;
    if (sources || observations) {
      await this.options.store.writeDraft({
        ...(sources ? { sources } : {}),
        ...(observations ? { observations } : {})
      });
    }
    // Destructuring above already proved there is state; an empty bundle needs no write.
    if (Object.keys(state).length === 0) return;
    const provisional =
      workflow.kind === "rebuild" ||
      (workflow.kind === "check" && (workflow.phase === "task-a" || workflow.phase === "task-b"));
    if (!provisional) {
      await this.options.store.writeDraft(state);
      return;
    }
    const current =
      (await this.options.staging.read(workflow.courseId, workflow.workflowId)) ??
      emptyStaging(workflow.courseId, workflow.workflowId, this.nowIso());
    const merge = <T extends { courseId: string }>(
      existing: T[],
      incoming: T[] | undefined,
      keyOf: (item: T) => string
    ): T[] => {
      if (!incoming || incoming.length === 0) return existing;
      const keys = new Set(incoming.map(keyOf));
      return [...existing.filter((item) => !keys.has(keyOf(item))), ...incoming];
    };
    await this.options.staging.write({
      ...current,
      stagedAt: this.nowIso(),
      assessments: merge(current.assessments, state.assessments, (item) => item.assessmentId),
      constraints: merge(current.constraints, state.constraints, (item) => item.constraintId),
      facts: merge(current.facts, state.facts, (item) => item.factId),
      evidence: merge(current.evidence, state.evidence, (item) => item.evidenceId),
      reviewItems: merge(current.reviewItems, state.reviewItems, (item) => item.reviewItemId),
      changes: merge(current.changes, state.changes, (item) => item.changeId)
    });
  }

  async start(
    course: CourseRecord,
    kind: WorkflowKind,
    context: { tabId?: number } = {}
  ): Promise<WorkflowRecord> {
    const now = this.nowIso();
    const workflows = await this.options.store.listWorkflows();
    // A run that is waiting on the user is not a reason to refuse a new check: an Initial Review
    // can stay open for days, and maintenance must continue underneath it. Only a run of the same
    // kind that is genuinely in flight is reused.
    const inFlight = workflows.find(
      (workflow) => workflow.courseId === course.courseId && workflow.state === "working"
    );
    if (inFlight) return inFlight;
    if (kind !== "check") {
      const waitingSameKind = workflows.find(
        (workflow) =>
          workflow.courseId === course.courseId &&
          workflow.kind === kind &&
          (workflow.state === "queued" ||
            workflow.state === "saved" ||
            workflow.state === "waiting")
      );
      if (waitingSameKind) {
        // A pre-fix Rebuild could leave a review workflow waiting after its staging was
        // cleared by Keep current. It has no preview to resume and must not block the next
        // user-requested Rebuild. A live waiting preview still owns the course and is reused.
        if (
          waitingSameKind.kind === "rebuild" &&
          waitingSameKind.state === "waiting" &&
          waitingSameKind.waitingReason === "review" &&
          (await this.options.staging.read(course.courseId, waitingSameKind.workflowId)) === null
        ) {
          const { lease: _lease, waitingReason: _waitingReason, ...carried } = waitingSameKind;
          await this.options.store.saveWorkflow({
            ...carried,
            state: "complete",
            phase: "review",
            phaseCursor: "complete",
            updatedAt: now
          });
        } else {
          return waitingSameKind;
        }
      }
    }
    const workflow: WorkflowRecord = {
      ...createInitialWorkflow(randomId("wf"), course, now, kind),
      ...(context.tabId !== undefined ? { returnContext: { tabId: context.tabId } } : {})
    };
    await this.options.store.saveWorkflow(workflow);
    qaTrace("qa.scan-started", {
      kind,
      courseCode: course.courseCode,
      established: course.established,
      hasTab: context.tabId !== undefined
    });
    return workflow;
  }

  /** Advances until the run needs the user, finishes, or fails unrecoverably. */
  async run(workflowId: string): Promise<WorkflowRecord> {
    let workflow = await this.options.store.readWorkflow(workflowId);
    if (!workflow) throw new EngineError("WORKFLOW_NOT_FOUND", false);
    for (;;) {
      if (
        workflow.state === "complete" ||
        workflow.state === "failed" ||
        workflow.state === "waiting"
      ) {
        return workflow;
      }
      const result = await this.step(workflow);
      workflow = result.workflow;
      if (!result.progressed) return workflow;
    }
  }

  async step(workflow: WorkflowRecord): Promise<StepResult> {
    const now = this.nowIso();
    if (workflow.state === "failed" || workflow.state === "complete") {
      return { workflow, progressed: false };
    }
    if (workflow.lease && Date.parse(workflow.lease.expiresAt) > Date.parse(now)) {
      // Another run holds the lease; this caller re-reads state rather than duplicating work.
      return { workflow, progressed: false };
    }
    const claimed: WorkflowRecord = {
      ...workflow,
      state: "working",
      lease: {
        token: randomId("lease"),
        expiresAt: new Date(Date.parse(now) + LEASE_DURATION_MS).toISOString()
      },
      updatedAt: now
    };
    await this.options.store.saveWorkflow(claimed);
    // The lease exists to stop two workers doing the same unit at once. This step owns it only
    // while it runs, so a released result can be stepped again immediately by the same run.
    const release = async (result: StepResult): Promise<StepResult> => {
      // The lease is this step's own claim; releasing it is the point of this function.
      const { lease: _lease, ...carried } = result.workflow;
      if (result.workflow.state === "working") {
        const released: WorkflowRecord = { ...carried, updatedAt: this.nowIso() };
        await this.options.store.saveWorkflow(released);
        return { ...result, workflow: released };
      }
      return result;
    };
    try {
      const heartbeat = setInterval(() => {
        void this.renewLease(claimed).catch(() => undefined);
      }, LEASE_HEARTBEAT_MS);
      try {
        return await release(await this.dispatch(claimed));
      } finally {
        clearInterval(heartbeat);
      }
    } catch (error) {
      if (error instanceof StaleWorkflowCompletion) {
        qaTrace("qa.workflow-stale-completion", { workflowId: claimed.workflowId });
        const current = await this.options.store.readWorkflow(claimed.workflowId);
        const fallback = { ...claimed };
        delete fallback.lease;
        fallback.state = "failed";
        return {
          workflow: current ?? fallback,
          progressed: false
        };
      }
      return { workflow: await this.fail(claimed, error), progressed: false };
    }
  }

  private async dispatch(workflow: WorkflowRecord): Promise<StepResult> {
    switch (workflow.phase) {
      case "discover":
        return this.unitDiscover(workflow);
      case "fetch":
      case "parse":
        return this.unitFetchAndParse(workflow);
      case "normalize":
        return this.advance(workflow);
      case "task-a":
        return this.unitTaskA(workflow);
      case "task-b":
        return this.unitTaskB(workflow);
      case "task-c":
        return this.unitTaskC(workflow);
      default:
        return { workflow: await this.reachReview(workflow), progressed: false };
    }
  }

  private async advance(workflow: WorkflowRecord): Promise<StepResult> {
    await this.assertCompletionOwnership(workflow);
    const next = nextPhase(workflow.kind, workflow.phase);
    const now = this.nowIso();
    if (!next) return { workflow: await this.complete(workflow), progressed: false };
    const {
      waitingReason,
      errorCode,
      lastErrorDetail,
      paidRetryAvailable: _paidRetryAvailable,
      retryConsumesApi: _retryConsumesApi,
      lease: _lease,
      ...carried
    } = workflow;
    const advanced: WorkflowRecord = {
      ...carried,
      phase: next,
      phaseCursor: "start",
      attempt: 0,
      state: next === REVIEW ? "waiting" : "working",
      updatedAt: now
    };
    if (next === REVIEW) {
      advanced.waitingReason = "review";
      const parked = await this.reachReview(advanced);
      this.options.onStage?.(parked);
      return { workflow: parked, progressed: false };
    }
    await this.options.store.saveWorkflow(advanced);
    this.options.onStage?.(advanced);
    return { workflow: advanced, progressed: true };
  }

  private async complete(workflow: WorkflowRecord): Promise<WorkflowRecord> {
    // A completed run carries no waiting reason and no lease.
    const { waitingReason: _waitingReason, lease: _lease, ...carried } = workflow;
    const record: WorkflowRecord = { ...carried, state: "complete", updatedAt: this.nowIso() };
    await this.options.store.saveWorkflow(record);
    if (record.kind === "check")
      await this.options.staging.clear(record.courseId, record.workflowId);
    this.options.onStage?.(record);
    await this.traceCompletion(record);
    return record;
  }

  /** What the Course briefly holds once the run that produced it is over. */
  private async traceCompletion(workflow: WorkflowRecord): Promise<void> {
    const { sources } = await this.options.store.readAllSourceStates(workflow.courseId);
    const snapshot = await this.options.store.readSnapshot(workflow.courseId);
    qaTrace("qa.course-brief", {
      kind: workflow.kind,
      sources: sources.length,
      assessments: snapshot?.assessments.length ?? 0,
      constraints: snapshot?.constraints.length ?? 0,
      facts: snapshot?.facts.length ?? 0,
      reviewItems: snapshot?.reviewItems.length ?? 0
    });
  }

  // -------------------------------------------------------------------------

  private async unitDiscover(workflow: WorkflowRecord): Promise<StepResult> {
    const course = await this.requireCourse(workflow);
    const tabId = tabIdOf(workflow);
    const { sources } = await this.options.machine.discover(course, tabId);
    qaTrace("qa.discovery-sources", {
      courseCode: course.courseCode,
      discovered: sources.length,
      kinds: [...new Set(sources.map((source) => source.kind))]
    });
    const previous = await this.options.store.readAllSourceStates(course.courseId);
    const now = this.nowIso();
    const records: SourceRecord[] = sources.map((source) => {
      const prior = previous.sources.find((item) => item.sourceId === source.sourceId);
      const { parentSourceId: _oldParent, ...carried } = prior ?? {
        sourceId: source.sourceId,
        courseId: course.courseId,
        updatedAt: now
      };
      return {
        ...carried,
        // Always refresh native metadata from this discovery. Older persisted records may carry
        // the historical F30 bug where Source id was written into nativeItemId.
        nativeItemId: source.nativeItemId,
        kind: source.kind,
        title: source.title,
        ...(source.parentSourceId ? { parentSourceId: source.parentSourceId } : {}),
        updatedAt: now
      };
    });
    await this.writeState(workflow, { sources: records });
    return this.advance(workflow);
  }

  private async unitFetchAndParse(workflow: WorkflowRecord): Promise<StepResult> {
    const course = await this.requireCourse(workflow);
    // A Source the extension is not allowed to read parks the run instead of being counted as a
    // failure: the missing thing is an Origin the user can grant, which is exactly what §11.7
    // means by Waiting. The run resumes on the next drive, and the `Grant permission` action is
    // what asks for one. (Gate 3 finding F28.)
    if ((await this.options.machine.missingPermissionOrigins()).length > 0) {
      return { workflow: await this.waitForHostPermission(workflow), progressed: false };
    }
    const tabId = tabIdOf(workflow);
    const { sources, observations } = await this.options.store.readAllSourceStates(course.courseId);
    const scoped = observations.filter(
      (observation) => observation.workflowId === workflow.workflowId
    );
    // A Source settles once it has been attempted in this run, whether it succeeded or not:
    // a failure is a Coverage Fact, and retrying it forever inside one run would never end.
    const settled = new Set(scoped.map((observation) => observation.sourceId));
    const pending = sources.filter((source) => !settled.has(source.sourceId));
    if (pending.length === 0) {
      return this.afterIngest(workflow, course, sources, scoped);
    }
    const source = pending[0] as SourceRecord;
    const fetched = await this.options.machine.fetchAndParse(source, course, tabId);
    qaTrace("qa.source-read", {
      kind: fetched.kind,
      fetchStatus: fetched.fetchStatus,
      parseStatus: fetched.parseStatus,
      chars: fetched.text.length,
      errorCode: fetched.errorCode ?? null
    });
    const now = this.nowIso();
    const parsed =
      fetched.parseStatus === "ok"
        ? {
            text: fetched.text,
            structure: fetched.structure,
            ...(fetched.pageLocators ? { pageLocators: fetched.pageLocators } : {})
          }
        : source.parsed;
    const successfullyCovered = fetched.fetchStatus === "ok" && fetched.parseStatus === "ok";
    const machine = !successfullyCovered
      ? undefined
      : await sourceMachineRepresentation({
          sourceId: fetched.sourceId,
          title: fetched.title,
          sourceType: fetched.kind,
          ...(fetched.parentSourceId ? { parentSourceId: fetched.parentSourceId } : {}),
          text: fetched.text,
          structure: fetched.structure
        });
    const comparison = machine
      ? compareMachineRepresentations(source.machine, machine, true)
      : undefined;
    const observation = observationFor({
      workflowId: workflow.workflowId,
      sourceId: fetched.sourceId,
      courseId: course.courseId,
      fetchStatus: fetched.fetchStatus,
      parseStatus: fetched.parseStatus,
      ...(comparison ? { comparison } : {}),
      comparability:
        fetched.fetchStatus === "ok" && fetched.parseStatus === "ok"
          ? "comparable"
          : "incomparable",
      ...(fetched.errorCode ? { errorCode: fetched.errorCode } : {}),
      now
    });
    await this.writeState(workflow, {
      sources: [
        {
          ...source,
          title: fetched.title,
          kind: fetched.kind,
          ...(fetched.parentSourceId ? { parentSourceId: fetched.parentSourceId } : {}),
          ...(machine ? { machine } : {}),
          ...(parsed ? { parsed } : {}),
          lastFetchedAt: now,
          ...(fetched.parseStatus === "ok" ? { lastParsedAt: now } : {}),
          updatedAt: now
        }
      ],
      observations: [observation]
    });
    return { workflow: { ...workflow, phaseCursor: fetched.sourceId }, progressed: true };
  }

  /**
   * A Source counts as checked only when fetch+parse succeeded. No machine difference means
   * the run ends here, before any context is assembled, so an unchanged Course costs nothing.
   */
  private async afterIngest(
    workflow: WorkflowRecord,
    course: CourseRecord,
    sources: SourceRecord[],
    observations: SourceObservationRecord[]
  ): Promise<StepResult> {
    const changed = observations.some(
      (observation) =>
        observation.machineComparison === "machine-different" ||
        observation.machineComparison === "new-source"
    );
    if (workflow.kind === "check" && !changed) {
      const coverage = coverageFromObservations(
        observations,
        sources.map((source) => source.sourceId)
      );
      const now = this.nowIso();
      const migrated: CourseRecord = {
        ...course,
        consecutiveCheckFailures: coverage.partialCoverage
          ? course.consecutiveCheckFailures + 1
          : 0,
        unchangedStreak: coverage.partialCoverage
          ? (course.unchangedStreak ?? 0)
          : (course.unchangedStreak ?? 0) + 1,
        lastCheckAttemptAt: now,
        ...(coverage.partialCoverage ? {} : { lastSuccessfulCheckAt: now }),
        updatedAt: now
      };
      await this.options.store.upsertCourse(migrated);
      return { workflow: await this.complete(workflow), progressed: false };
    }
    return this.advance(workflow);
  }

  // -------------------------------------------------------------------------

  private async unitTaskA(workflow: WorkflowRecord): Promise<StepResult> {
    const course = await this.requireCourse(workflow);
    const apiKey = await this.requireApiKey();
    const context = await this.materializeContext(workflow, course);
    const sources = context.sourceRecords;
    const eligible = sources.filter((source) => {
      if (!source.parsed) return false;
      const observation = context.observations.find(
        (item) => item.sourceId === source.sourceId && item.workflowId === workflow.workflowId
      );
      // Coverage is a machine fact, not a semantic shortlist. Only Sources successfully captured in
      // this workflow enter Task A; every such Source does, and Task A alone decides relevance.
      if (observation?.fetchStatus !== "ok" || observation.parseStatus !== "ok") return false;
      if (workflow.kind !== "check") return true;
      return (
        observation.machineComparison === "machine-different" ||
        observation.machineComparison === "new-source"
      );
    });

    const failedSourcesForRecovery: SourceRecord[] = [];
    for (const source of eligible) {
      if (source.parsed === undefined) continue;
      try {
        const relevant = await this.runTaskASource({
          workflow,
          course,
          context,
          source,
          apiKey,
          keyPrefix: "task-a"
        });
        await this.recordTaskASuccess(workflow, source.sourceId, relevant);
      } catch (error) {
        const terminalSourceFailure =
          workflow.kind === "rebuild" &&
          error instanceof DeepSeekFailure &&
          error.code === "AI_CONTRACT";
        if (!terminalSourceFailure) throw error;
        await this.recordTaskAFailure(workflow, source.sourceId, error);
        if (workflow.kind === "rebuild") failedSourcesForRecovery.push(source);
      }
    }

    // A terminal Task A failure should not make an otherwise healthy Rebuild partial without one
    // bounded chance to re-run that captured unit. This is deliberately after the normal pass: it
    // never duplicates successful Sources and it gives the recovery calls a distinct idempotency
    // namespace for diagnosis and cache identity.
    if (workflow.kind === "rebuild") {
      for (const source of failedSourcesForRecovery) {
        qaTrace("qa.task-a-recovery-started", { sourceId: source.sourceId });
        try {
          const relevant = await this.runTaskASource({
            workflow,
            course,
            context,
            source,
            apiKey,
            keyPrefix: "task-a-recovery"
          });
          await this.recordTaskASuccess(workflow, source.sourceId, relevant);
          qaTrace(["qa.task", "-a-recovery-succeeded"].join(""), { sourceId: source.sourceId });
        } catch (error) {
          const terminalSourceFailure =
            error instanceof DeepSeekFailure && error.code === "AI_CONTRACT";
          if (!terminalSourceFailure) throw error;
          await this.recordTaskAFailure(workflow, source.sourceId, error);
          qaTrace("qa.task-a-recovery-failed", {
            sourceId: source.sourceId,
            errorCode: error.code
          });
        }
      }
    }
    if (workflow.kind === "rebuild") {
      const staged = await this.options.staging.read(workflow.courseId, workflow.workflowId);
      const coverage = staged?.taskACoverage;
      if (
        (coverage?.failedSources.length ?? 0) > 0 &&
        (coverage?.relevantSourceIds.length ?? 0) === 0
      ) {
        throw new DeepSeekFailure("AI_CONTRACT", false, "No relevant Source completed Task A");
      }
    }
    return this.advance(workflow);
  }

  private async runTaskASource(input: {
    workflow: WorkflowRecord;
    course: CourseRecord;
    context: MaterializeContext;
    source: SourceRecord;
    apiKey: string;
    keyPrefix: "task-a" | "task-a-recovery";
  }): Promise<boolean> {
    const { workflow, course, context, source, apiKey, keyPrefix } = input;
    if (source.parsed === undefined) return false;
    const sourceKey = `${keyPrefix}:${workflow.workflowId}:${source.sourceId}`;
    const calls = this.options.buildTaskACalls({
      source: {
        sourceId: source.sourceId,
        sourceType: source.kind,
        title: source.title,
        text: source.parsed.text,
        structure: source.parsed.structure
      },
      course: { courseCode: course.courseCode, courseName: course.courseName },
      chunks: this.options.planChunks({
        sourceId: source.sourceId,
        locator: source.title,
        text: source.parsed.text,
        structure: source.parsed.structure
      })
    });
    const aiContext: AiCallContext = { knownSourceIds: new Set([source.sourceId]) };
    const chunkValues: unknown[] = [];
    for (const [index, call] of calls.entries()) {
      const outcome = await this.execute({
        call: { ...call, idempotencyKey: `${sourceKey}:${String(index)}` },
        apiKey,
        workflow,
        course,
        task: "task-a",
        context: aiContext
      });
      chunkValues.push(outcome.value);
    }
    let taskA = chunkValues.length === 1 ? chunkValues[0] : undefined;
    if (chunkValues.length > 1) {
      const consolidation = this.options.buildTaskAConsolidationCall({
        source: { sourceId: source.sourceId, sourceType: source.kind, title: source.title },
        chunkValues,
        course: { courseCode: course.courseCode, courseName: course.courseName }
      });
      const outcome = await this.execute({
        call: { ...consolidation, idempotencyKey: `${sourceKey}:consolidate` },
        apiKey,
        workflow,
        course,
        task: "task-a-consolidate",
        context: aiContext
      });
      taskA = outcome.value;
    }
    const validated = validateTaskA(taskA, new Set([source.sourceId]));
    await this.persistTaskADrafts(workflow, context, source, validated);
    return validated.sourceResult !== "NO_RELEVANT_INFORMATION";
  }

  private async persistTaskADrafts(
    workflow: WorkflowRecord,
    context: MaterializeContext,
    source: SourceRecord,
    result: TaskAResult
  ): Promise<void> {
    if (result.sourceResult === "NO_RELEVANT_INFORMATION") return;
    const materialized = materializeTaskA(result, {
      ...context,
      sources: new Map([[source.sourceId, { sourceId: source.sourceId, title: source.title }]])
    });
    const assessments = materialized.drafts.map((draft) => ({
      assessmentId: draftIdFor(context.workflowId, source.sourceId, draft.draftId),
      courseId: context.course.courseId,
      role: draft.role,
      kind: draft.kind,
      name: draft.name,
      aliases: draft.aliases,
      marks: [],
      createdBy: "ai" as const,
      createdAt: context.now,
      updatedAt: context.now
    }));
    const facts = materialized.drafts.flatMap((draft) =>
      draft.facts.map((fact) => ({
        ...fact,
        assessmentId: draftIdFor(context.workflowId, source.sourceId, draft.draftId)
      }))
    );
    const reviewItems: ReviewItemRecord[] = materialized.drafts
      .filter((draft) => draft.role === "assessment" || draft.role === "series")
      .map((draft) => {
        const assessmentId = draftIdFor(context.workflowId, source.sourceId, draft.draftId);
        return {
          reviewItemId: `initial_${assessmentId}`,
          courseId: context.course.courseId,
          workflowId: context.workflowId,
          kind: "initial" as const,
          targetId: assessmentId,
          payload: {
            assessment: assessments.find((item) => item.assessmentId === assessmentId),
            facts: facts.filter((fact) => fact.assessmentId === assessmentId),
            proposalKey: draft.draftId,
            questions: draft.questions
          },
          createdAt: context.now,
          updatedAt: context.now
        };
      });
    await this.writeState(workflow, {
      ...(materialized.bundle.evidence ? { evidence: materialized.bundle.evidence } : {}),
      assessments,
      facts,
      reviewItems
    });
    qaTrace("qa.candidates", {
      assessments: assessments.length,
      facts: facts.length,
      reviewItems: reviewItems.length
    });
  }

  private async recordTaskASuccess(
    workflow: WorkflowRecord,
    sourceId: string,
    relevant: boolean
  ): Promise<void> {
    if (workflow.kind !== "rebuild") return;
    await this.assertCompletionOwnership(workflow);
    const staged =
      (await this.options.staging.read(workflow.courseId, workflow.workflowId)) ??
      emptyStaging(workflow.courseId, workflow.workflowId, this.nowIso());
    const coverage = staged.taskACoverage ?? {
      succeededSourceIds: [],
      relevantSourceIds: [],
      failedSources: []
    };
    await this.options.staging.write({
      ...staged,
      taskACoverage: {
        succeededSourceIds: [...new Set([...coverage.succeededSourceIds, sourceId])],
        relevantSourceIds: relevant
          ? [...new Set([...coverage.relevantSourceIds, sourceId])]
          : coverage.relevantSourceIds.filter((id) => id !== sourceId),
        failedSources: coverage.failedSources.filter((item) => item.sourceId !== sourceId)
      }
    });
  }

  private async recordTaskAFailure(
    workflow: WorkflowRecord,
    sourceId: string,
    error: DeepSeekFailure
  ): Promise<void> {
    await this.assertCompletionOwnership(workflow);
    const staged =
      (await this.options.staging.read(workflow.courseId, workflow.workflowId)) ??
      emptyStaging(workflow.courseId, workflow.workflowId, this.nowIso());
    const coverage = staged.taskACoverage ?? {
      succeededSourceIds: [],
      relevantSourceIds: [],
      failedSources: []
    };
    const prefix = `draft_${workflow.workflowId}_${sourceId}_`;
    const failedAssessmentIds = new Set(
      staged.assessments
        .filter((assessment) => assessment.assessmentId.startsWith(prefix))
        .map((assessment) => assessment.assessmentId)
    );
    await this.options.staging.write({
      ...staged,
      assessments: staged.assessments.filter(
        (assessment) => !failedAssessmentIds.has(assessment.assessmentId)
      ),
      constraints: staged.constraints.filter(
        (constraint) =>
          !constraint.evidenceRefs.some((reference) => reference.sourceId === sourceId)
      ),
      facts: staged.facts.filter(
        (fact) =>
          !failedAssessmentIds.has(fact.assessmentId ?? "") &&
          !fact.evidenceRefs.some((reference) => reference.sourceId === sourceId)
      ),
      evidence: staged.evidence.filter((evidence) => evidence.sourceId !== sourceId),
      reviewItems: staged.reviewItems.filter((item) => !failedAssessmentIds.has(item.targetId)),
      taskACoverage: {
        succeededSourceIds: coverage.succeededSourceIds.filter((id) => id !== sourceId),
        relevantSourceIds: coverage.relevantSourceIds.filter((id) => id !== sourceId),
        failedSources: [
          ...coverage.failedSources.filter((item) => item.sourceId !== sourceId),
          { sourceId, errorCode: error.code }
        ]
      }
    });
    await this.options.store.recordAiRun({
      aiRunId: randomId("airun"),
      workflowId: workflow.workflowId,
      courseId: workflow.courseId,
      task: "task-a",
      schemaVersion: TASK_A_SCHEMA,
      promptVersion: PROMPT_VERSIONS.a,
      idempotencyKey: `task-a-terminal:${workflow.workflowId}:${sourceId}`,
      status: "failed",
      errorCode: error.code,
      sourceId,
      attempt: workflow.attempt + 1,
      recordedAt: this.nowIso()
    });
    qaTrace("qa.task-a-source-failed", { sourceId, errorCode: error.code });
  }

  private async unitTaskB(workflow: WorkflowRecord): Promise<StepResult> {
    const course = await this.requireCourse(workflow);
    const apiKey = await this.requireApiKey();
    const context = await this.materializeContext(workflow, course);
    const snapshot = await this.readStateUnderReview(workflow);
    const drafts = (snapshot?.assessments ?? []).filter(
      (item) => item.createdBy === "ai" && !item.supersededBy
    );
    if (drafts.length === 0) return this.advance(workflow);

    const key = `task-b:${workflow.workflowId}`;
    const courseIndex = courseIndexFrom(snapshot);
    const calls = this.options.buildTaskBCalls({
      drafts: drafts.map((draft) => ({
        draftId: draft.assessmentId,
        name: draft.name,
        type: draft.kind,
        role: draft.role
      })),
      constraintCandidates: (snapshot?.constraints ?? []).map((constraint) => ({
        constraintId: constraint.constraintId,
        content: constraint.content
      })),
      courseIndex,
      evidence: context.evidence
    });
    let values: TaskBResult | null = null;
    let expansionRounds = 0;
    for (const call of calls) {
      const outcome = await this.execute({
        call: { ...call, idempotencyKey: `${key}:0` },
        apiKey,
        workflow,
        course,
        task: "task-b",
        context: { knownSourceIds: evidenceSourceIds(context) }
      });
      let validation = validateTaskB(outcome.value, evidenceSourceIds(context));
      while (validation.unresolvedIssues.length > 0 && expansionRounds < 2) {
        const requestedIds = validation.identityResolutions
          .flatMap((resolution) => resolution.involvedObjectIds)
          .filter((id) => courseIndex.some((entry) => entry.objectId === id || entry.name === id));
        if (requestedIds.length === 0) break;
        const expansion = this.options.buildTaskBExpansionCall({
          base: call,
          requestedObjectIds: requestedIds,
          evidence: context.evidence.filter((entry) => requestedIds.includes(entry.objectId ?? ""))
        });
        const expanded = await this.execute({
          call: { ...expansion, idempotencyKey: `${key}:expand:${String(expansionRounds)}` },
          apiKey,
          workflow,
          course,
          task: "task-b-expand",
          context: { knownSourceIds: evidenceSourceIds(context) }
        });
        expansionRounds += 1;
        validation = validateTaskB(expanded.value, evidenceSourceIds(context));
      }
      values = validation;
      break;
    }
    if (values) {
      const materialized = materializeTaskB(
        values,
        context,
        new Map(),
        new Set((snapshot?.assessments ?? []).map((item) => item.assessmentId))
      );
      const reviewItems: ReviewItemRecord[] = materialized.assessments
        .filter((assessment) => assessment.createdBy === "ai" && !assessment.supersededBy)
        .map((assessment) => ({
          reviewItemId: `initial_${assessment.assessmentId}`,
          courseId: course.courseId,
          workflowId: workflow.workflowId,
          kind: "initial" as const,
          targetId: assessment.assessmentId,
          payload: { assessmentId: assessment.assessmentId },
          createdAt: context.now,
          updatedAt: context.now
        }));
      await this.writeState(workflow, {
        ...(materialized.bundle.evidence ? { evidence: materialized.bundle.evidence } : {}),
        assessments: materialized.assessments,
        constraints: materialized.constraints,
        ...(materialized.bundle.facts ? { facts: materialized.bundle.facts } : {}),
        reviewItems
      });
      if (workflow.kind !== "initial") {
        const staged = await this.options.staging.read(workflow.courseId, workflow.workflowId);
        if (staged) await this.options.staging.write({ ...staged, taskBResult: values });
      }
    }
    return this.advance(workflow);
  }

  private async unitTaskC(workflow: WorkflowRecord): Promise<StepResult> {
    const course = await this.requireCourse(workflow);
    const apiKey = await this.requireApiKey();
    const context = await this.materializeContext(workflow, course);
    const snapshot = await this.readStateUnderReview(workflow);
    if (!snapshot) return this.advance(workflow);
    const trusted = await this.options.store.readTrustedSnapshot(workflow.courseId);
    if (!trusted) return this.advance(workflow);
    const staged = await this.options.staging.read(workflow.courseId, workflow.workflowId);
    if (!staged) return this.advance(workflow);
    const [decisions, history] = await Promise.all([
      this.options.store.readDecisions(workflow.courseId),
      this.options.store.readHistory(workflow.courseId)
    ]);
    const coverage = coverageFromObservations(
      context.observations.filter((item) => item.workflowId === workflow.workflowId),
      context.sourceRecords.map((source) => source.sourceId)
    );
    const courseIndex = courseIndexFrom(snapshot);
    const targetMap = new Map(courseIndex.map((entry) => [entry.objectId, entry.objectId]));
    const stagedEvidenceIds = new Set(staged.evidence.map((item) => item.evidenceId));

    for (const entry of courseIndex) {
      const key = `task-c:${workflow.workflowId}:${entry.objectId}`;
      const calls = this.options.buildTaskCCalls({
        target: entry,
        currentFacts: trusted.facts
          .filter((fact) => fact.assessmentId === entry.objectId)
          .map((fact) => ({ field: fact.field, value: fact.value })),
        currentEvidence: context.evidence.filter(
          (item) => item.objectId === entry.objectId && !stagedEvidenceIds.has(item.evidenceId)
        ),
        newEvidence: context.evidence.filter(
          (item) => item.objectId === entry.objectId && stagedEvidenceIds.has(item.evidenceId)
        ),
        identity: {
          resolutions:
            staged.taskBResult?.identityResolutions.filter((resolution) =>
              resolution.involvedObjectIds.includes(entry.objectId)
            ) ?? [],
          structuralRelationships: staged.taskBResult?.structuralRelationships ?? []
        },
        userState: {
          marks:
            trusted.assessments.find((item) => item.assessmentId === entry.objectId)?.marks ?? [],
          decisions: decisions.filter((decision) => decision.targetId === entry.objectId)
        },
        coverageFacts: coverage,
        history: history.filter((item) => item.targetId === entry.objectId)
      });
      for (const call of calls) {
        const outcome = await this.execute({
          call: { ...call, idempotencyKey: key },
          apiKey,
          workflow,
          course,
          task: "task-c",
          context: { knownSourceIds: evidenceSourceIds(context), coverage }
        });
        const validated: TaskCResult = validateTaskC(
          outcome.value,
          evidenceSourceIds(context),
          coverageSatisfied(coverage)
        );
        const materialized = materializeTaskC(validated, context, targetMap, coverage);
        const merged = mergePendingChanges(snapshot.changes, materialized.changes, context.now);
        const reviewItems: ReviewItemRecord[] = merged.changes.map((change) => {
          const assessment = staged.assessments.find(
            (item) => item.assessmentId === change.targetId
          );
          const facts = staged.facts.filter((item) => item.assessmentId === change.targetId);
          const evidenceIds = new Set([
            ...facts.flatMap((fact) => fact.evidenceRefs.map((ref) => ref.evidenceId ?? "")),
            ...change.newEvidenceIds
          ]);
          const evidence = staged.evidence.filter((item) => evidenceIds.has(item.evidenceId));
          return {
            reviewItemId: change.changeId,
            courseId: course.courseId,
            workflowId: workflow.workflowId,
            kind:
              change.changeType === "IDENTITY_UNCERTAIN"
                ? ("identity" as const)
                : ("change" as const),
            changeType: change.changeType,
            targetId: change.targetId,
            payload: {
              changeId: change.changeId,
              ...(change.changeType === "NEW" && assessment ? { assessment, facts, evidence } : {})
            },
            createdAt: context.now,
            updatedAt: context.now
          };
        });
        await this.writeState(workflow, {
          ...(materialized.bundle.evidence ? { evidence: materialized.bundle.evidence } : {}),
          changes: merged.changes,
          reviewItems
        });
      }
    }
    return this.advance(workflow);
  }

  // -------------------------------------------------------------------------

  private async execute(input: {
    call: AiCall;
    apiKey: string;
    workflow: WorkflowRecord;
    course: CourseRecord;
    task: AiRunRecord["task"];
    context: AiCallContext;
  }): Promise<AiCallOutcome> {
    const fingerprint =
      input.call.invocationFingerprint ??
      invocationFingerprint({
        task: input.call.task,
        promptVersion: input.call.promptVersion,
        schemaVersion: input.call.schemaVersion,
        system: input.call.system,
        user: input.call.user,
        maxTokens: input.call.maxTokens
      });
    const call = { ...input.call, invocationFingerprint: fingerprint };
    const existing = await this.options.store.findAiRun(call.idempotencyKey, fingerprint);
    if (existing?.status === "succeeded") {
      qaTrace("qa.ai-cache", {
        task: input.task,
        logicalUnitId: call.idempotencyKey,
        cache: "hit",
        invocationFingerprint: fingerprint
      });
      return {
        call,
        value: existing.payload
      };
    }
    await this.assertCompletionOwnership(input.workflow);
    const outcome = await this.options.ai.execute(call, input.apiKey, input.context);
    await this.assertCompletionOwnership(input.workflow);
    // One line per model call, with the task it was and what it cost. Never the prompt, never the
    // answer, and never the key that paid for it.
    qaTrace("qa.deepseek-task", {
      task: input.task,
      promptVersion: call.promptVersion,
      inputTokens: outcome.inputTokens ?? null,
      outputTokens: outcome.outputTokens ?? null,
      ...(outcome.reasoningTokens === undefined
        ? {}
        : { reasoningTokens: outcome.reasoningTokens }),
      cache: "miss",
      invocationFingerprint: fingerprint
    });
    const run: AiRunRecord = {
      aiRunId: randomId("airun"),
      workflowId: input.workflow.workflowId,
      courseId: input.course.courseId,
      task: input.task,
      schemaVersion: call.schemaVersion,
      promptVersion: call.promptVersion,
      idempotencyKey: call.idempotencyKey,
      invocationFingerprint: fingerprint,
      status: "succeeded",
      attempt: input.workflow.attempt + 1,
      payload: outcome.value,
      ...(outcome.inputTokens !== undefined ? { inputTokens: outcome.inputTokens } : {}),
      ...(outcome.outputTokens !== undefined ? { outputTokens: outcome.outputTokens } : {}),
      ...(outcome.reasoningTokens !== undefined
        ? { reasoningTokens: outcome.reasoningTokens }
        : {}),
      recordedAt: this.nowIso()
    };
    await this.options.store.recordAiRun(run);
    return { ...outcome, call };
  }

  private async requireApiKey(): Promise<string> {
    if (!(await this.options.ai.privacyAuthorized())) {
      throw new EngineError("AUTHORIZATION_REQUIRED", false, "Permission required");
    }
    if (!(await this.options.ai.usageAuthorized())) {
      throw new EngineError("AUTHORIZATION_REQUIRED", false, "Permission required");
    }
    const apiKey = await this.options.ai.apiKey();
    if (!apiKey) throw new EngineError("CONFIG_REQUIRED", false, "DeepSeek API key required");
    return apiKey;
  }

  /**
   * Rebuild reasons about its replacement. Maintenance Task C compares trusted Current State with
   * provisional Task A/B output, without publishing those drafts.
   */
  private async readStateUnderReview(workflow: WorkflowRecord): Promise<{
    course: CourseRecord;
    assessments: AssessmentRecord[];
    constraints: ConstraintRecord[];
    facts: FactRecord[];
    changes: ChangeRecord[];
    reviewItems: ReviewItemRecord[];
    history: HistoryRecord[];
  } | null> {
    const live =
      workflow.kind === "check"
        ? await this.options.store.readTrustedSnapshot(workflow.courseId)
        : await this.options.store.readSnapshot(workflow.courseId);
    if (workflow.kind === "initial") return live;
    const staged = await this.options.staging.read(workflow.courseId, workflow.workflowId);
    if (!staged) return live;
    const base = live ?? (await this.options.store.readSnapshot(workflow.courseId));
    if (!base) return null;
    if (workflow.kind === "check") {
      return {
        ...base,
        assessments: mergeById(base.assessments, staged.assessments, (item) => item.assessmentId),
        constraints: mergeById(base.constraints, staged.constraints, (item) => item.constraintId),
        facts: mergeById(base.facts, staged.facts, (item) => item.factId),
        changes: base.changes,
        reviewItems: base.reviewItems
      };
    }
    return {
      ...base,
      assessments: staged.assessments.filter((item) => !item.supersededBy),
      constraints: staged.constraints.filter((item) => !item.superseded),
      facts: staged.facts.filter((item) => !item.superseded),
      changes: staged.changes,
      reviewItems: staged.reviewItems
    };
  }

  private async requireCourse(workflow: WorkflowRecord): Promise<CourseRecord> {
    const course = await this.options.store.readCourse(workflow.courseId);
    if (!course) throw new EngineError("COURSE_NOT_FOUND", false);
    return course;
  }

  private async materializeContext(
    workflow: WorkflowRecord,
    course: CourseRecord
  ): Promise<RunContext> {
    const { sources, observations } = await this.options.store.readAllSourceStates(course.courseId);
    const memory = await this.options.store.readExclusionMemory(course.courseId);
    const snapshot =
      workflow.kind === "check"
        ? await this.options.store.readTrustedSnapshot(course.courseId)
        : await this.options.store.readSnapshot(course.courseId);
    const sourcesById = new Map(
      sources.map((source) => [source.sourceId, { sourceId: source.sourceId, title: source.title }])
    );
    const liveEvidence = await evidencePool(this.options.store, snapshot, sourcesById);
    const staged = await this.options.staging.read(course.courseId, workflow.workflowId);
    const stagedEvidence = staged ? evidencePoolFromStaging(staged) : [];
    return {
      course,
      workflowId: workflow.workflowId,
      sources: sourcesById,
      exclusionKeys: new Set(
        memory.map((entry) => `${entry.proposalKey}|${entry.evidenceFingerprint}`)
      ),
      now: this.nowIso(),
      sourceRecords: sources,
      observations,
      evidence: [...liveEvidence, ...stagedEvidence]
    };
  }

  private async reachReview(workflow: WorkflowRecord): Promise<WorkflowRecord> {
    // The lease is released here because the run now waits on the user.
    const { lease: _lease, ...carried } = workflow;
    const record: WorkflowRecord = {
      ...carried,
      state: "waiting",
      waitingReason: "review",
      updatedAt: this.nowIso()
    };
    await this.options.store.saveWorkflow(record);
    if (record.kind === "check")
      await this.options.staging.clear(record.courseId, record.workflowId);
    return record;
  }

  /**
   * Parks a run on an Origin the user has to allow before a Source can be read.
   *
   * The run keeps its place: it holds no lease, so the next drive claims it again and continues
   * from the Source that is still unsettled. `Grant permission` is what starts that drive, and
   * the permission itself is asked for by the surface that has the click. (Gate 3 finding F28.)
   */
  private async waitForHostPermission(workflow: WorkflowRecord): Promise<WorkflowRecord> {
    const { lease: _lease, ...carried } = workflow;
    const record: WorkflowRecord = {
      ...carried,
      state: "waiting",
      waitingReason: "host-permission",
      updatedAt: this.nowIso()
    };
    await this.options.store.saveWorkflow(record);
    return record;
  }

  private async fail(workflow: WorkflowRecord, error: unknown): Promise<WorkflowRecord> {
    const code = failureCode(error);
    const retryable = failureRetryable(error);
    const attempt = workflow.attempt + 1;
    const terminalContract = error instanceof DeepSeekFailure && error.code === "AI_CONTRACT";
    const timeout =
      error instanceof DeepSeekFailure &&
      error.code === "NETWORK_TRANSIENT" &&
      /timed out/i.test(error.message);
    const exhausted =
      !retryable || attempt >= MAX_ATTEMPTS || terminalContract || (timeout && attempt >= 2);
    // A failed or parked run releases its lease so a later attempt can claim it.
    const { lease: _lease, ...carried } = workflow;
    const record: WorkflowRecord = {
      ...carried,
      state: exhausted ? "failed" : "saved",
      attempt,
      errorCode: code,
      lastErrorDetail: error instanceof Error ? error.message : String(error),
      paidRetryAvailable: exhausted && workflow.phase.startsWith("task"),
      retryConsumesApi: workflow.phase.startsWith("task"),
      updatedAt: this.nowIso()
    };
    await this.options.store.saveWorkflow(record);
    return record;
  }
}

function mergeById<T>(existing: T[], incoming: T[], keyOf: (item: T) => string): T[] {
  const incomingKeys = new Set(incoming.map(keyOf));
  return [...existing.filter((item) => !incomingKeys.has(keyOf(item))), ...incoming];
}

function evidencePoolFromStaging(staged: StagedCourseState): AiEvidence[] {
  const ownerByEvidenceId = new Map<string, string>();
  for (const fact of staged.facts) {
    const owner = fact.assessmentId ?? fact.constraintId;
    if (!owner) continue;
    for (const ref of fact.evidenceRefs) {
      if (ref.evidenceId) ownerByEvidenceId.set(ref.evidenceId, owner);
    }
  }
  return staged.evidence.map((record) => {
    const objectId = ownerByEvidenceId.get(record.evidenceId);
    return {
      evidenceId: record.evidenceId,
      sourceId: record.sourceId,
      locator: record.locator,
      excerpt: record.excerpt,
      ...(objectId ? { objectId } : {})
    };
  });
}

/**
 * The stable code an error carries, whichever layer raised it.
 *
 * The AI layer's failures are not engine failures and are not raised by the engine's own steps, so
 * reading only `EngineError` turned every provider problem into `INTERNAL` — a code that says
 * nothing and that a reader has to open a debugger to get past. `AI_AUTH`, `AI_RATE_LIMIT`,
 * `NETWORK_TRANSIENT` and `AI_CONTRACT` are the difference between "your key is wrong", "you are
 * being throttled", "the network blipped" and "the model answered something unusable", and the
 * workflow is the last place that can still tell them apart. (Gate 3 finding F3.)
 */
function failureCode(error: unknown): string {
  if (error instanceof EngineError) return error.code;
  if (error instanceof DeepSeekFailure) return error.code;
  return "INTERNAL";
}

/** Whether the workflow may spend another attempt on this failure. */
function failureRetryable(error: unknown): boolean {
  if (error instanceof EngineError) return error.retryable;
  if (error instanceof DeepSeekFailure) return error.retryable;
  return true;
}

export function mergePendingChanges(
  existing: ChangeRecord[],
  incoming: ChangeRecord[],
  now: string
): { changes: ChangeRecord[] } {
  const changes = [...existing];
  for (const change of incoming) {
    const index = changes.findIndex(
      (item) =>
        item.targetId === change.targetId &&
        item.field === change.field &&
        item.changeId !== change.changeId
    );
    if (index < 0) {
      changes.push(change);
      continue;
    }
    const previous = changes[index] as ChangeRecord;
    const merged = upsertLatestChange(previous, change, now);
    changes[index] = merged.pending;
  }
  return { changes };
}

function coverageSatisfied(coverage: CoverageFacts): boolean {
  return coverageSufficient(coverage);
}

function tabIdOf(workflow: WorkflowRecord): number | undefined {
  const value = workflow.returnContext?.tabId;
  return typeof value === "number" ? value : undefined;
}

function draftIdFor(workflowId: string, sourceId: string, draftId: string): string {
  return `draft_${workflowId}_${sourceId}_${draftId}`;
}

function evidenceSourceIds(context: { sources: Map<string, unknown> }): Set<string> {
  return new Set(context.sources.keys());
}

/**
 * Every piece of original Evidence this Course can offer, tagged with the canonical object it was
 * captured for. Task B's first call receives this pool; the expansion round receives only the
 * entries for the objects the model asked about, because index summaries alone cannot support an
 * identity merge.
 */
async function evidencePool(
  store: LocalStore,
  snapshot: { facts: FactRecord[] } | null,
  sources: Map<string, { sourceId: string; title: string }>
): Promise<AiEvidence[]> {
  if (!snapshot) return [];
  const ownerByEvidenceId = new Map<string, string>();
  const ids: string[] = [];
  for (const fact of snapshot.facts) {
    const owner = fact.assessmentId ?? fact.constraintId;
    if (!owner) continue;
    for (const ref of fact.evidenceRefs) {
      const evidenceId = ref.evidenceId;
      if (!evidenceId) continue;
      ownerByEvidenceId.set(evidenceId, owner);
      ids.push(evidenceId);
    }
  }
  const records = await store.readEvidence(ids);
  return records
    .filter((record) => sources.has(record.sourceId))
    .map((record) => ({
      evidenceId: record.evidenceId,
      sourceId: record.sourceId,
      locator: record.locator,
      excerpt: record.excerpt,
      ...(ownerByEvidenceId.get(record.evidenceId)
        ? { objectId: ownerByEvidenceId.get(record.evidenceId) as string }
        : {})
    }));
}

function courseIndexFrom(
  snapshot: {
    assessments: AssessmentRecord[];
    constraints: ConstraintRecord[];
    facts: FactRecord[];
    course: CourseRecord;
  } | null
): AiCourseIndexEntry[] {
  if (!snapshot) return [];
  const entries: AiCourseIndexEntry[] = snapshot.assessments.map((assessment) => ({
    objectId: assessment.assessmentId,
    kind: "assessment" as const,
    name: assessment.name,
    type: assessment.kind,
    role: assessment.role,
    ...(assessment.parentAssessmentId ? { parentObjectId: assessment.parentAssessmentId } : {}),
    aliases: assessment.aliases,
    fields: snapshot.facts
      .filter((fact) => fact.assessmentId === assessment.assessmentId)
      .map((fact) => ({ fieldName: fact.field, display: displayOf(fact.value) })),
    flags: assessment.marks
  }));
  for (const constraint of snapshot.constraints) {
    entries.push({
      objectId: constraint.constraintId,
      kind: "constraint",
      name: constraint.content.slice(0, 120),
      aliases: [],
      fields: [],
      flags: constraint.marks
    });
  }
  return entries;
}

function displayOf(value: FactValue): string {
  if (value.state === "EXPLICITLY_UNKNOWN") return "To be announced";
  if (value.value === undefined) return "";
  return Array.isArray(value.value) ? value.value.join(", ") : String(value.value);
}
