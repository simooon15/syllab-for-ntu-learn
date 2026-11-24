import { archiveCourseDraft } from "./course-draft-archive";
import { organizeCourseProduct } from "./course-product";
import {
  PROJECTED_COURSE_POLICY,
  PRODUCT_COURSE_POLICY,
  isSelectiveCoursePolicy,
  projectCourseDraft
} from "./course-projection";
import { directEvidenceCatalog } from "./direct-evidence";
import { directNativeBatches, remapDirectNativeEvidence } from "./direct-native-batches";
import {
  prepareDirectCourse,
  materializeDirectCourse,
  validateDirectCourse,
  directClaimAudit,
  type DirectCourseInput
} from "./direct-course";
import { directReviewItems } from "./direct-review";
import {
  runSelectiveCourse,
  compileCourseDraft,
  compareCourseDraft,
  semanticSourceVersion,
  SELECTIVE_COURSE_POLICY,
  type CourseDraft
} from "./selective-course";
import {
  nativeFacetContent,
  validateFacetInventory,
  validateFacetSynthesis,
  type FacetInventory
} from "./semantic-facets";
import {
  sourceInventory,
  registryInventory,
  validateSourceCoverage,
  validateInventoryRouting,
  groupInventory,
  validateCoverageDecisions
} from "./assessment-coverage";
import { validateOutputA, validateOutputB2, validateGroupStructure } from "./assessment-output";
import {
  ASSESSMENT_SEMANTIC_POLICY,
  assessmentSourceContexts,
  validateAssessmentRelevance,
  relevanceSourceIds,
  relevanceFields,
  validateExcludedAssessment
} from "./assessment-semantics";
import type { EvidenceRecord } from "./schema";
import type { AiVisualPart } from "./ai-context";
import { validateProvenance, scopeEvidenceIds } from "./architecture-provenance";
import { compareNativeSignals, type NativeSignal } from "./native-signal";
import {
  ARCHITECTURE_POLICY,
  digest,
  type Session,
  type SessionReply
} from "./architecture-session";
import { runSession } from "./architecture-runner";
import { bootstrap, resolveReads, sourceUnits, type ReadScope } from "./course-read";
import {
  emptyRegistry,
  applyOperations,
  validateRegistry,
  type Registry,
  type RegistryRecord
} from "./progressive-registry";
import { canonicalEnvelope, AI_SCHEMAS } from "./contract-registry";
import { assertNoProductInstructions, assertSuppliedEvidence } from "./ai-pipeline";
import {
  runPhysicalWork,
  PHYSICAL_WORK_POLICY,
  type PhysicalWorkLedger,
  type LogicalInput
} from "./physical-work";
import {
  newBLedger,
  splitBPart,
  applyBResponse,
  captureBResponseCandidates,
  stopBLedger,
  assertBLedgerAccounting,
  bLedgerProjection,
  type BLogicalLedger
} from "./task-b-ledger";
import { isRecord } from "@syllab/contracts";
import { AiUnitFailure } from "./deepseek-complete";
import { evidenceRegistry, GROUNDED_B_SCHEMA } from "./task-b-grounding";
import { semanticCoverage } from "./semantic-coverage";
import {
  teachingInput,
  teachingCheckpointsCurrent,
  teachingCall,
  validateTeachingResult,
  reusableTeaching,
  semanticallyProcess,
  teachingSourceView,
  needsTeachingClassification,
  DEFERRAL_POLICY,
  DEFERRAL_SCHEMA,
  DEFERRAL_PROMPT,
  type TeachingResult,
  type TeachingInput
} from "./teaching-deferral";
import { contentIndex, type CourseContentIndex } from "./content-index";
import {
  validateExhaustiveRouting,
  type ExhaustiveRoutingResult,
  type RoutingInput
} from "./exhaustive-routing";
import { historicalCoverageReusable } from "./coverage-isolation";
import type { ParseResult, ParsedTextUnit } from "../parser/domain";
import type { EvidenceCatalogEntry } from "./evidence-retrieval";
import type { TaskAResult, TaskBResult, TaskCResult } from "./ai-contracts";
import {
  TASK_A_SCHEMA,
  validateTaskAVisualRequests,
  validateTaskA,
  validateTaskB,
  validateTaskC
} from "./ai-contracts";
import type { AiCall, AiCallOutcome, AiCourseIndexEntry, AiEvidence } from "./ai-pipeline";

/** What the engine knows about the run that the contract check needs. */
export interface AiCallContext {
  knownSourceIds: ReadonlySet<string>;
  allowedVisualRequestRefs?: ReadonlySet<string>;
  knownObjectIds?: ReadonlySet<string>;
  coverage?: CoverageFacts;
  /** Supplied Evidence pool, tagged with the canonical object it was captured for. */
  evidence?: AiEvidence[];
}
import { stableDigest, type Chunk } from "./chunking";
import { createInitialWorkflow } from "./course-state";
import { DeepSeekFailure } from "./deepseek";
import {
  EvidenceProgress,
  evidenceCatalog,
  retrieveEvidence,
  continueTaskB
} from "./evidence-retrieval";
import { schedulePackages, type PackageOutcome } from "./package-scheduler";
import { runtimeSpan } from "./runtime-metrics";
import { randomId, stableStringify } from "./crypto";
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
import { sourceMachineRepresentation } from "./fingerprint";
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

// Ownership uses session/token fencing; elapsed provider latency is not a processing deadline.

/** One fetched and parsed Source, ready for the semantic stages. */
export interface FetchedSource {
  sourceId: string;
  nativeItemId: string;
  parentSourceId?: string;
  kind: string;
  title: string;
  text: string;
  structure: string[];
  units?: ParsedTextUnit[];
  contentHash?: string;
  canonicalization?: ParseResult["canonicalization"];
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
    coverage?: {
      status: "Complete" | "Partial" | "Failed";
      pagesProcessed: number;
      issueCodes: string[];
    };
    sources: Array<{
      sourceId: string;
      /** The native item this Source is, as the course API names it. */
      nativeItemId: string;
      title: string;
      kind: string;
      parentSourceId?: string;
      discovery?: SourceRecord["discovery"];
    }>;
  }>;
  /** Fetches and parses one Source. A per-Source failure is reported, not thrown. */
  fetchAndParse(
    source: SourceRecord,
    course: CourseRecord,
    tabId: number | undefined
  ): Promise<FetchedSource>;
  visualParts?(source: SourceRecord): Promise<{
    parts: Array<{ locator: string; dataUrl: string }>;
    unresolved: string[];
  }>;
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
  directCourse?: boolean;
  selectiveCourse?: boolean;
  projectedCourse?: boolean;
  /** Bounded isolated acceptance transport; not a semantic truncation policy. */
  directCourseOutputLimit?: number;
  newArchitecture?: boolean;
  physicalBatching?: boolean;
  /** Enabled only by the compiled QA bridge, never normal UI. */
  allowQaAcceptance?: boolean;
  /** Acceptance verification only; never enters prompts or alters AI selection. */
  qaValidateRouting?: (workflowId: string, result: ExhaustiveRoutingResult) => Promise<boolean>;
  store: LocalStore;
  machine: MachinePort;
  ai: AiPort;
  clock: EngineClock;
  /** Provisional Rebuild and maintenance Task A/B output lives outside Current State here. */
  staging: RebuildStagingStore;
  buildTaskACalls: (input: {
    measuredPhysicalPacking?: boolean;
    source: {
      sourceId: string;
      sourceType: string;
      title: string;
      text: string;
      structure: string[];
      pageImages?: Array<{ locator: string; dataUrl: string }>;
      nativeUnits?: Array<ParsedTextUnit & { ref?: string }>;
      priorTaskAResult?: unknown;
      unresolvedVisualLocators?: string[];
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
    availableEvidenceRefs?: EvidenceCatalogEntry[];
    sharedWorkingContexts?: unknown[];
    groundedItems?: boolean;
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

/** DA-004: schedule only new or explicitly user-retried work; no TTL/backoff paid recovery. */
export const PERMISSION_RECOVERY_REVISION = "permission-recovery/036";

export function retryDueAt(workflow: WorkflowRecord): number | null {
  // Only queued and explicitly user-retried saved work can start, never abandoned paid work.
  return workflow.state === "queued" ||
    (workflow.state === "saved" &&
      (!workflow.phase.startsWith("task") || workflow.userRetryAuthorized === true))
    ? 0
    : null;
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
  private readonly sessionId = randomId("execution-session");
  private readonly phaseControllers = new Map<string, AbortController>();
  private phaseKey(workflow: WorkflowRecord): string {
    return `${workflow.workflowId}:${workflow.lease?.token ?? ""}`;
  }
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

  /** Private diagnostic boundaries; no additional scheduling or recovery decisions. */
  private async observePostProcessing<T>(
    workflow: WorkflowRecord,
    stage: string,
    body: () => Promise<T>,
    item?: { sourceId: string; order: number }
  ): Promise<T> {
    const started = performance.now();
    const fields = {
      scopeId: workflow.workflowId,
      stage,
      ...(item ? { sourceRef: stableDigest(item.sourceId), order: item.order } : {})
    };
    const startedAt = this.nowIso();
    const key = `runtime.task-a:${workflow.workflowId}:${String(workflow.attempt + 1)}:${String(item?.order ?? "phase")}:${stage}`;
    const persist = (phase: string, extra: Record<string, unknown> = {}) =>
      this.options.store.writePostProcessingDiagnostic(workflow, key, {
        ...fields,
        phase,
        startedAt,
        observedAt: this.nowIso(),
        elapsedMs: performance.now() - started,
        ...extra
      });
    await persist("start");
    qaTrace("qa.task-a-postprocess", { ...fields, phase: "start" });
    try {
      const value = await body();
      await persist("end");
      qaTrace("qa.task-a-postprocess", {
        ...fields,
        phase: "end",
        elapsedMs: performance.now() - started
      });
      return value;
    } catch (error) {
      await persist("error", {
        errorCode: failureCode(error),
        errorName: error instanceof Error ? error.name : typeof error,
        detailEmpty: error instanceof Error && error.message === "",
        detailFingerprint: stableDigest(error instanceof Error ? error.message : String(error)),
        // Stack frames are private durable diagnostics, never shared trace/course text.
        stackFrames:
          error instanceof Error ? error.stack?.split("\n").slice(1).join("\n") : undefined
      });
      qaTrace("qa.task-a-postprocess", {
        ...fields,
        phase: "error",
        elapsedMs: performance.now() - started,
        errorCode: failureCode(error),
        errorName: error instanceof Error ? error.name : typeof error,
        // Raw detail/stack may contain private Source text; retain only its identity here.
        errorIdentity: stableDigest(
          error instanceof Error ? (error.stack ?? error.message) : String(error)
        )
      });
      throw error;
    }
  }

  /** Startup reconciliation never guesses whether an abandoned AI request was billed. */
  async reconcileSession(): Promise<void> {
    for (const workflow of await this.options.store.listWorkflows()) {
      if (
        (workflow.state !== "working" &&
          !(
            workflow.state === "saved" &&
            workflow.phase.startsWith("task") &&
            !workflow.userRetryAuthorized
          )) ||
        workflow.lease?.sessionId === this.sessionId
      )
        continue;
      const { lease: _lease, ...carried } = workflow;
      const paid = workflow.phase.startsWith("task");
      const boundedB =
        workflow.phase === "task-b"
          ? (await this.options.staging.read(workflow.courseId, workflow.workflowId))?.taskBRecovery
          : undefined;
      await this.options.store.replaceWorkflow(workflow, {
        ...carried,
        state: paid ? "failed" : "saved",
        ...(paid
          ? {
              errorCode: "AI_INTERRUPTED",
              lastErrorDetail: "Previous execution session ended; user Retry required",
              paidRetryAvailable: !boundedB,
              retryConsumesApi: !boundedB
            }
          : {}),
        updatedAt: this.nowIso()
      });
    }
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
      await this.options.store.writeDraft(
        {
          ...(sources ? { sources } : {}),
          ...(observations ? { observations } : {})
        },
        workflow
      );
    }
    // Destructuring above already proved there is state; an empty bundle needs no write.
    if (Object.keys(state).length === 0) return;
    const provisional =
      workflow.kind === "rebuild" ||
      (workflow.kind === "check" && (workflow.phase === "task-a" || workflow.phase === "task-b"));
    if (!provisional) {
      await this.options.store.writeDraft(state, workflow);
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
    context: { tabId?: number; qaSemanticClean?: true } = {}
  ): Promise<WorkflowRecord> {
    if (
      context.qaSemanticClean &&
      (!this.options.allowQaAcceptance ||
        kind === "check" ||
        (kind === "initial" && (!this.options.newArchitecture || course.established)))
    )
      throw new EngineError("QA_ACCEPTANCE_UNAVAILABLE", false);
    const now = this.nowIso();
    const workflows = await this.options.store.listWorkflows();
    if (
      context.qaSemanticClean &&
      workflows.some(
        (w) =>
          w.courseId === course.courseId &&
          (["working", "queued", "saved"].includes(w.state) ||
            (w.state === "waiting" && w.waitingReason !== "review") ||
            !!w.lease)
      )
    )
      throw new EngineError("QA_ACCEPTANCE_ACTIVE_WORKFLOW", false);
    // A run that is waiting on the user is not a reason to refuse a new check: an Initial Review
    // can stay open for days, and maintenance must continue underneath it. Only a run of the same
    // kind that is genuinely in flight is reused.
    const inFlight = workflows.find(
      (workflow) => workflow.courseId === course.courseId && workflow.state === "working"
    );
    if (inFlight) return inFlight;
    if (kind !== "check" && !context.qaSemanticClean) {
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
      ...(this.options.directCourse
        ? {
            directCoursePolicy: this.options.selectiveCourse
              ? this.options.projectedCourse
                ? PRODUCT_COURSE_POLICY
                : SELECTIVE_COURSE_POLICY
              : ("native-global/1" as const)
          }
        : {}),
      ...(!this.options.directCourse && this.options.newArchitecture
        ? { architecturePolicy: ARCHITECTURE_POLICY, semanticPolicy: ASSESSMENT_SEMANTIC_POLICY }
        : {}),
      ...(this.options.physicalBatching ? { physicalWorkPolicy: PHYSICAL_WORK_POLICY } : {}),
      ...(context.qaSemanticClean ? { qaSemanticClean: true as const } : {}),
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

  /** P2E025: complete saved response revalidation only, never dispatch or trusted adoption. */
  async revalidateSavedTaskB(
    workflowId: string,
    raw: string
  ): Promise<{ verified: number; unresolved: number }> {
    const workflow = await this.options.store.readWorkflow(workflowId);
    if (
      !workflow ||
      workflow.kind !== "rebuild" ||
      workflow.state !== "waiting" ||
      workflow.phase !== "review" ||
      workflow.lease
    )
      throw Error("B_REVALIDATION_NOT_SETTLED");
    const saved = await this.options.store.readMetadataValue(`task-b-ledger:${workflowId}`);
    const staged = await this.options.staging.read(workflow.courseId, workflowId);
    if (!isRecord(saved) || !staged) throw Error("B_REVALIDATION_LEDGER_MISSING");
    const ledger = structuredClone(saved.ledger) as BLogicalLedger;
    if (ledger.physical.some((p) => p.state === "paid-unverified"))
      throw Error("B_REVALIDATION_AMBIGUOUS_PAID");
    const normalized = canonicalEnvelope(JSON.parse(raw), AI_SCHEMAS.groundedB);
    if (!normalized.repair) throw Error("B_REVALIDATION_EXACT_ALIAS_REQUIRED");
    const claimed: WorkflowRecord = {
      ...workflow,
      state: "working",
      lease: { token: randomId("lease"), sessionId: this.sessionId },
      updatedAt: this.nowIso()
    };
    if (!(await this.options.store.replaceWorkflow(workflow, claimed)))
      throw new StaleWorkflowCompletion(workflowId);
    try {
      const course = await this.requireCourse(claimed);
      const context = await this.materializeContext(claimed, course);
      const missing = new Set(staged.semanticCoverage?.unresolved.map((u) => u.sourceRef) ?? []);
      ledger.status = "active";
      delete ledger.stopReason;
      ledger.unresolved = ledger.unresolved.filter((u) => missing.has(u.ref));
      ledger.pendingRefs = ledger.requiredRefs.filter((r) => !missing.has(r));
      ledger.parts.forEach((p) => (p.delivered = false));
      const known = new Set(ledger.sourceRefs);
      let repaired = captureBResponseCandidates(ledger, normalized.value, known, this.nowIso());
      repaired = applyBResponse(repaired, normalized.value, known, this.nowIso());
      if (repaired.status === "active")
        repaired = stopBLedger(repaired, "ZERO_COST_SAVED_OUTPUT_NO_NEW_PROVIDER", this.nowIso());
      repaired.compatibilityRepairs = [...(repaired.compatibilityRepairs ?? []), normalized.repair];
      if (
        repaired.final.result.canonicalAssessmentProposals.length ||
        repaired.final.result.courseWideConstraintProposals.length
      )
        repaired.materialized = materializeTaskB(
          repaired.final.result,
          { ...context, now: repaired.final.recordedAt },
          new Map(),
          new Set(staged.assessments.map((a) => a.assessmentId))
        );
      await this.options.store.writeTaskBLogicalLedger(claimed, repaired);
      const m = repaired.materialized;
      await this.assertCompletionOwnership(claimed);
      await this.options.staging.write({
        ...staged,
        taskBLogicalLedger: bLedgerProjection(repaired),
        taskBCheckpoint: repaired.final,
        taskBResult: repaired.final.result,
        taskBRecovery: { authorization: "P2E-021", state: "settled", at: this.nowIso() },
        ...(m
          ? {
              assessments: m.assessments,
              constraints: m.constraints,
              facts: m.bundle.facts ?? [],
              evidence: m.bundle.evidence ?? [],
              reviewItems: m.bundle.reviewItems ?? [],
              changes: m.bundle.changes ?? []
            }
          : {})
      });
      return {
        verified: repaired.final.items.filter((i) => i.status === "verified").length,
        unresolved: repaired.unresolved.length
      };
    } finally {
      await this.options.store.saveWorkflow({ ...workflow, updatedAt: this.nowIso() }, claimed);
    }
  }

  /** Product-authorized single recovery; CAS prevents duplicate dispatch authorization. */
  async authorizeTaskBRecovery(workflowId: string): Promise<WorkflowRecord> {
    const workflow = await this.options.store.readWorkflow(workflowId);
    if (
      !workflow ||
      workflow.kind !== "rebuild" ||
      workflow.phase !== "task-b" ||
      workflow.state !== "failed" ||
      workflow.lease ||
      !workflow.taskASemanticCoverage
    )
      throw new EngineError("B_RECOVERY_NOT_SETTLED", false);
    const staged = await this.options.staging.read(workflow.courseId, workflowId);
    if (!staged || staged.taskBRecovery)
      throw new EngineError("B_RECOVERY_ALREADY_CONSUMED", false);
    const claimed = {
      ...workflow,
      state: "working" as const,
      lease: { token: randomId("lease"), sessionId: this.sessionId },
      updatedAt: this.nowIso()
    };
    if (!(await this.options.store.replaceWorkflow(workflow, claimed)))
      throw new StaleWorkflowCompletion(workflowId);
    await this.options.staging.write({
      ...staged,
      taskBRecovery: { authorization: "P2E-021", state: "authorized", at: this.nowIso() }
    });
    const { lease: _lease, ...released } = claimed;
    await this.options.store.saveWorkflow(released, claimed);
    return released;
  }

  /** One authorized known-response recovery; successful Task A checkpoints remain authoritative. */
  async authorizeNormalTaskBRecovery(workflowId: string): Promise<WorkflowRecord> {
    const workflow = await this.options.store.readWorkflow(workflowId);
    const staged = workflow && (await this.options.staging.read(workflow.courseId, workflowId));
    const saved = await this.options.store.readMetadataValue(`task-b-ledger:${workflowId}`);
    const archiveKey = `b-recovery-history:${workflowId}`;
    if (
      !workflow ||
      workflow.kind !== "initial" ||
      workflow.state !== "waiting" ||
      workflow.waitingReason !== "review" ||
      workflow.lease ||
      !staged ||
      staged.taskBRecovery?.authorization !== "normal" ||
      staged.taskBRecovery.state !== "settled" ||
      !isRecord(saved) ||
      saved.kind !== "task-b-logical-ledger"
    )
      throw new EngineError("B_SAFE_RECOVERY_NOT_SETTLED", false);
    const ledger = saved.ledger as BLogicalLedger;
    if (await this.options.store.readMetadataValue(archiveKey))
      throw new EngineError("B_RECOVERY_ALREADY_CONSUMED", false);
    if (
      ledger.status === "active" ||
      ledger.final.items.some((item) => item.status === "verified") ||
      ledger.physical.some(
        (item) => item.state !== "applied" || item.paidDisposition !== "known-response"
      )
    )
      throw new EngineError("B_SAFE_RECOVERY_REQUIRES_PRESERVED_RESULT", false);
    const claimed = {
      ...workflow,
      state: "working" as const,
      phase: "task-b" as const,
      lease: { token: randomId("lease"), sessionId: this.sessionId },
      updatedAt: this.nowIso()
    };
    if (!(await this.options.store.replaceWorkflow(workflow, claimed)))
      throw new StaleWorkflowCompletion(workflowId);
    await this.options.store.setMetadata({ [archiveKey]: saved });
    const {
      taskBCheckpoint: _checkpoint,
      taskBLogicalLedger: _ledger,
      taskBResult: _result,
      ...base
    } = staged;
    await this.options.staging.write({
      ...base,
      taskBRecovery: { authorization: "normal-recovery", state: "authorized", at: this.nowIso() }
    });
    const { lease: _lease, waitingReason: _waiting, ...released } = claimed;
    await this.options.store.saveWorkflow(released, claimed);
    return released;
  }

  /** Product-authorized targeted validation: one new logical attempt, immutable prior evidence. */
  async authorizeTaskBValidation(workflowId: string): Promise<WorkflowRecord> {
    const workflow = await this.options.store.readWorkflow(workflowId);
    const staged = workflow && (await this.options.staging.read(workflow.courseId, workflowId));
    const saved = await this.options.store.readMetadataValue(`task-b-ledger:${workflowId}`);
    const key = `b-validation-history:P2E-028:${workflowId}`;
    if (await this.options.store.readMetadataValue(key))
      throw new EngineError("B_VALIDATION_ALREADY_CONSUMED", false);
    if (
      !workflow ||
      !["initial", "rebuild"].includes(workflow.kind) ||
      workflow.state !== "waiting" ||
      workflow.waitingReason !== "review" ||
      workflow.lease ||
      !staged ||
      staged.taskBRecovery?.state !== "settled" ||
      !isRecord(saved) ||
      saved.kind !== "task-b-logical-ledger"
    )
      throw new EngineError("B_VALIDATION_NOT_SETTLED", false);
    const ledger = saved.ledger as BLogicalLedger;
    if (
      ledger.status === "active" ||
      ledger.final.result.canonicalAssessmentProposals.length ||
      ledger.physical.some((p) => p.state !== "applied" || p.paidDisposition !== "known-response")
    )
      throw new EngineError("B_VALIDATION_UNSAFE_PRIOR_RESULT", false);
    const claimed = {
      ...workflow,
      state: "working" as const,
      phase: "task-b" as const,
      lease: { token: randomId("lease"), sessionId: this.sessionId },
      updatedAt: this.nowIso()
    };
    if (!(await this.options.store.replaceWorkflow(workflow, claimed)))
      throw new StaleWorkflowCompletion(workflowId);
    await this.options.store.setMetadata({
      [key]: {
        kind: "b-validation-history",
        authorization: "P2E-028",
        saved,
        staged,
        workflow,
        at: this.nowIso()
      }
    });
    const {
      taskBCheckpoint: _checkpoint,
      taskBLogicalLedger: _ledger,
      taskBResult: _result,
      ...base
    } = staged;
    await this.options.staging.write({
      ...base,
      taskBRecovery: { authorization: "P2E-028", state: "authorized", at: this.nowIso() }
    });
    const { lease: _lease, waitingReason: _waiting, ...released } = claimed;
    await this.options.store.saveWorkflow(released, claimed);
    return released;
  }

  /** Recover validated post-processing only. Consumed/ambiguous requests never authorize payment. */
  async resumeTaskBCheckpoint(workflowId: string): Promise<WorkflowRecord> {
    const workflow = await this.options.store.readWorkflow(workflowId);
    if (
      !workflow ||
      workflow.kind !== "rebuild" ||
      workflow.phase !== "task-b" ||
      workflow.state !== "failed" ||
      workflow.lease
    )
      throw new EngineError("B_RESUME_NOT_SETTLED", false);
    const staged = await this.options.staging.read(workflow.courseId, workflowId);
    const saved = await this.options.store.findAiRun(
      `task-b:${workflowId}:P2E-021`,
      undefined,
      workflowId
    );
    if (
      !staged?.taskBCheckpoint &&
      !(saved?.status === "succeeded" && saved.schemaVersion === GROUNDED_B_SCHEMA)
    )
      throw new EngineError("B_NO_VERIFIED_CHECKPOINT_NO_REDISPATCH", false);
    const resumed = { ...workflow, state: "working" as const, updatedAt: this.nowIso() };
    if (!(await this.options.store.replaceWorkflow(workflow, resumed)))
      throw new StaleWorkflowCompletion(workflowId);
    return resumed;
  }

  /** DA-006: zero-cost continuation of a settled Rebuild; never invokes Task A. */
  async continueTaskAPartial(
    workflowId: string,
    summary: {
      mainWaves: number | null;
      recoveryWaves: number;
      paidRecoveryInvocations: number;
    }
  ): Promise<WorkflowRecord> {
    const workflow = await this.options.store.readWorkflow(workflowId);
    if (
      !workflow ||
      workflow.kind !== "rebuild" ||
      workflow.phase !== "task-a" ||
      workflow.state !== "failed" ||
      workflow.lease
    )
      throw new EngineError("PARTIAL_CONTINUATION_NOT_SETTLED", false);
    const course = await this.requireCourse(workflow);
    const context = await this.materializeContext(workflow, course);
    const observations = context.observations.filter((o) => o.workflowId === workflowId);
    const staged = await this.options.staging.read(workflow.courseId, workflowId);
    if (!staged?.taskACoverage) throw new EngineError("PARTIAL_COVERAGE_ABSENT", false);
    const index = contentIndex(context.sourceRecords);
    const eligible = context.sourceRecords.filter((source) => {
      const o = observations.find((x) => x.sourceId === source.sourceId);
      return (
        source.parsed &&
        !source.removedFromNative &&
        semanticallyProcess(source) &&
        o?.fetchStatus === "ok" &&
        (o.parseStatus === "ok" || o.parseStatus === "partial")
      );
    });
    const succeeded = new Set(staged.taskACoverage.succeededSourceIds);
    for (const id of succeeded) {
      const source = eligible.find((x) => x.sourceId === id);
      const selection = source && teachingSourceView(source, context.sourceRecords, index);
      const parsed = selection?.processing.parsed;
      if (!parsed) throw new EngineError("PARTIAL_CHECKPOINT_SOURCE_INVALID", false);
      const fingerprint = stableDigest(
        stableStringify({
          policy: DEFERRAL_POLICY,
          selection: selection.selectionFingerprint,
          native: {
            text: parsed.text,
            structure: parsed.structure,
            units: parsed.units,
            contentHash: parsed.contentHash,
            canonicalization: parsed.canonicalization
          },
          prompt: PROMPT_VERSIONS.a
        })
      );
      const checkpoint = await this.options.store.findTaskAPackage(workflowId, id, fingerprint);
      if (!checkpoint?.taskAPackage) throw new EngineError("PARTIAL_CHECKPOINT_INVALID", false);
      const verified = validateTaskA(checkpoint.taskAPackage.result, new Set([id]));
      if (verified.visualRequestRefs?.length)
        throw new EngineError("PARTIAL_CHECKPOINT_UNFINISHED", false);
    }
    const coverage = semanticCoverage({
      sources: eligible,
      observations,
      succeededSourceIds: staged.taskACoverage.succeededSourceIds,
      failedSources: staged.taskACoverage.failedSources,
      ...summary
    });
    const claimed = {
      ...workflow,
      state: "working" as const,
      lease: { token: randomId("lease"), sessionId: this.sessionId },
      taskASemanticCoverage: coverage,
      updatedAt: this.nowIso()
    };
    if (!(await this.options.store.replaceWorkflow(workflow, claimed)))
      throw new StaleWorkflowCompletion(workflowId);
    try {
      await this.options.staging.write({ ...staged, semanticCoverage: coverage });
      const unresolved = eligible.filter((source) => !succeeded.has(source.sourceId));
      await this.writeState(claimed, {
        observations: observations
          .filter((o) => unresolved.some((s) => s.sourceId === o.sourceId))
          .map((o) => ({ ...o, understandingStatus: "partial" as const })),
        sources: unresolved.map((source) => ({
          ...source,
          ...(source.parsed
            ? {
                parsed: {
                  ...source.parsed,
                  understanding: {
                    contentHash: source.machine?.contentHash ?? source.parsed.contentHash ?? "",
                    status: "partial" as const
                  }
                }
              }
            : {})
        }))
      });
      return (await this.advance(claimed)).workflow;
    } catch (error) {
      await this.fail(claimed, error);
      throw error;
    }
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
    if (workflow.lease) {
      // Another run holds the lease; this caller re-reads state rather than duplicating work.
      return { workflow, progressed: false };
    }
    const claimed: WorkflowRecord = {
      ...workflow,
      state: "working",
      lease: {
        token: randomId("lease"),
        sessionId: this.sessionId
      },
      updatedAt: now
    };
    if (!(await this.options.store.replaceWorkflow(workflow, claimed)))
      return {
        workflow: (await this.options.store.readWorkflow(workflow.workflowId)) ?? workflow,
        progressed: false
      };
    // The lease exists to stop two workers doing the same unit at once. This step owns it only
    // while it runs, so a released result can be stepped again immediately by the same run.
    const release = async (result: StepResult): Promise<StepResult> => {
      // The lease is this step's own claim; releasing it is the point of this function.
      const { lease: _lease, ...carried } = result.workflow;
      if (result.workflow.state === "working" && result.workflow.lease) {
        const released: WorkflowRecord = { ...carried, updatedAt: this.nowIso() };
        await this.options.store.saveWorkflow(released, claimed);
        return { ...result, workflow: released };
      }
      return result;
    };
    const controller = new AbortController();
    try {
      this.phaseControllers.set(this.phaseKey(claimed), controller);
      const ownershipWatch = setInterval(() => {
        void this.assertCompletionOwnership(claimed).catch((error: unknown) =>
          controller.abort(error)
        );
      }, 1000);
      try {
        return await release(await this.dispatch(claimed));
      } finally {
        clearInterval(ownershipWatch);
        this.phaseControllers.delete(this.phaseKey(claimed));
      }
    } catch (error) {
      if (
        error instanceof StaleWorkflowCompletion ||
        (controller.signal.aborted && controller.signal.reason instanceof StaleWorkflowCompletion)
      ) {
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
      lease,
      ...carried
    } = workflow;
    const advanced: WorkflowRecord = {
      ...carried,
      ...(next === REVIEW || !lease ? {} : { lease }),
      phase: next,
      phaseCursor: "start",
      attempt: 0,
      state: next === REVIEW ? "waiting" : "working",
      updatedAt: now
    };
    if (next === REVIEW) {
      advanced.waitingReason = "review";
      const parked = await this.reachReview(advanced, workflow);
      this.options.onStage?.(parked);
      return { workflow: parked, progressed: false };
    }
    await this.options.store.saveWorkflow(advanced, workflow);
    this.options.onStage?.(advanced);
    return { workflow: advanced, progressed: true };
  }

  private async complete(workflow: WorkflowRecord): Promise<WorkflowRecord> {
    // A completed run carries no waiting reason and no lease.
    const { waitingReason: _waitingReason, lease: _lease, ...carried } = workflow;
    const record: WorkflowRecord = { ...carried, state: "complete", updatedAt: this.nowIso() };
    await this.options.store.saveWorkflow(record, workflow);
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
    const { sources, coverage } = await this.options.machine.discover(course, tabId);
    if (coverage) {
      await this.assertCompletionOwnership(workflow);
      await this.options.store.setMetadata({
        [`discovery-coverage:${workflow.workflowId}`]: {
          workflowId: workflow.workflowId,
          ...coverage,
          sourceCount: sources.length,
          recordedAt: this.nowIso()
        }
      });
      qaTrace("qa.discovery-coverage", {
        workflowId: workflow.workflowId,
        ...coverage,
        sourceCount: sources.length
      });
      if (coverage.status !== "Complete")
        throw new EngineError(
          "DISCOVERY_INCOMPLETE",
          false,
          `Discovery ${coverage.status}: ${coverage.issueCodes.join(",")}; no downstream processing authorized`
        );
    }
    qaTrace("qa.discovery-sources", {
      courseCode: course.courseCode,
      discovered: sources.length,
      kinds: [...new Set(sources.map((source) => source.kind))]
    });
    if (
      sources.some(
        (source) =>
          typeof source.sourceId !== "string" ||
          !source.sourceId ||
          typeof source.nativeItemId !== "string" ||
          !source.nativeItemId ||
          typeof source.kind !== "string" ||
          !source.kind
      )
    )
      throw new EngineError("DISCOVERY_INCOMPLETE", false, "NATIVE_IDENTITY_INVALID");
    const previous = await this.options.store.readAllSourceStates(course.courseId);
    await this.options.store.writePhysicalWorkLedger(
      workflow,
      `native-before-discovery:${workflow.workflowId}`,
      Object.fromEntries(
        previous.sources.map((source) => [
          source.sourceId,
          source.nativeSignal ?? {
            courseId: source.courseId,
            kind: source.kind,
            nativeId: source.nativeItemId,
            resourceIds: [],
            adapterVersion: "blackboard-native/1-unqualified",
            reliableForContent: false,
            completeResourceInventory: false
          }
        ])
      )
    );
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
        ...(source.discovery ? { discovery: source.discovery } : {}),
        nativeSignal: {
          courseId: course.courseId,
          kind: source.kind,
          nativeId: source.nativeItemId,
          resourceIds: [],
          adapterVersion: "blackboard-native/1-unqualified",
          reliableForContent: false,
          completeResourceInventory: false
        },
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
    // Ordinary failures settle as Coverage Facts. Permission denial parks the run instead;
    // after a real grant the same Source must be attempted again, including after restart.
    const settled = new Set(
      scoped
        .filter((observation) => observation.fetchStatus !== "permission-denied")
        .map((observation) => observation.sourceId)
    );
    const pending = sources.filter((source) => !settled.has(source.sourceId));
    if (pending.length === 0) {
      return this.afterIngest(workflow, course, sources, scoped);
    }
    const source = pending[0] as SourceRecord;
    const fetched = await this.options.machine.fetchAndParse(source, course, tabId);
    qaTrace("qa.source-read", {
      workflowId: workflow.workflowId,
      sourceAlias: stableDigest(source.sourceId),
      kind: fetched.kind,
      fetchStatus: fetched.fetchStatus,
      parseStatus: fetched.parseStatus,
      chars: fetched.text.length,
      errorCode: fetched.errorCode ?? null
    });
    const now = this.nowIso();
    if (workflow.qaSemanticClean && source.parsed?.visualCoverageHash) {
      // Preserve the historical derived record as audit evidence, outside the fresh parse baseline.
      await this.options.store.setMetadata({
        [`qa.coverage-history:${workflow.workflowId}:${stableDigest(source.sourceId)}`]: {
          workflowId: workflow.workflowId,
          sourceId: source.sourceId,
          recordedAt: now,
          historicalParsed: structuredClone(source.parsed)
        }
      });
      qaTrace("qa.semantic-clean-coverage", {
        workflowId: workflow.workflowId,
        sourceAlias: stableDigest(source.sourceId),
        historicalHashMatched: source.parsed.visualCoverageHash === fetched.contentHash,
        freshParseStatus: fetched.parseStatus,
        acceptedHistoricalCoverage: false
      });
    }
    if (
      fetched.parseStatus === "partial" &&
      historicalCoverageReusable(
        workflow.qaSemanticClean,
        source.parsed?.visualCoverageHash,
        fetched.contentHash
      )
    )
      fetched.parseStatus = "ok";
    const parsed =
      fetched.parseStatus === "ok" || fetched.parseStatus === "partial"
        ? {
            text: fetched.text,
            structure: fetched.structure,
            ...(!workflow.qaSemanticClean &&
            source.parsed?.understanding &&
            source.machine &&
            source.machine.contentHash === (fetched.contentHash ?? source.machine.contentHash)
              ? { understanding: source.parsed.understanding }
              : {}),
            ...(fetched.units ? { units: fetched.units } : {}),
            ...(fetched.contentHash ? { contentHash: fetched.contentHash } : {}),
            ...(historicalCoverageReusable(
              workflow.qaSemanticClean,
              source.parsed?.visualCoverageHash,
              fetched.contentHash
            )
              ? { visualCoverageHash: fetched.contentHash }
              : {}),
            ...(fetched.canonicalization ? { canonicalization: fetched.canonicalization } : {}),
            ...(fetched.pageLocators ? { pageLocators: fetched.pageLocators } : {})
          }
        : source.parsed;
    const successfullyCovered =
      fetched.fetchStatus === "ok" &&
      (fetched.parseStatus === "ok" || fetched.parseStatus === "partial");
    const machine = !successfullyCovered
      ? undefined
      : await sourceMachineRepresentation({
          sourceId: fetched.sourceId,
          title: fetched.title,
          sourceType: fetched.kind,
          ...(fetched.parentSourceId ? { parentSourceId: fetched.parentSourceId } : {}),
          text: fetched.text,
          ...(fetched.contentHash ? { contentHash: fetched.contentHash } : {}),
          structure: fetched.structure
        });
    const priorNative = (await this.options.store.readMetadataValue(
      `native-before-discovery:${workflow.workflowId}`
    )) as { ledger?: Record<string, NativeSignal> } | undefined;
    const comparison = machine
      ? compareNativeSignals(
          priorNative?.ledger?.[source.sourceId],
          source.nativeSignal,
          source.machine,
          machine,
          fetched.fetchStatus === "ok" && fetched.parseStatus === "ok"
        )
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
      observations: [
        {
          ...observation,
          ...(!workflow.qaSemanticClean &&
          comparison === "unchanged" &&
          source.parsed?.understanding
            ? { understandingStatus: source.parsed.understanding.status }
            : {})
        }
      ]
    });
    if (fetched.fetchStatus === "permission-denied") {
      return { workflow: await this.waitForHostPermission(workflow), progressed: false };
    }
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
    if (
      workflow.directCoursePolicy &&
      (workflow.kind === "check" || !isSelectiveCoursePolicy(workflow.directCoursePolicy)) &&
      (!changed || isSelectiveCoursePolicy(workflow.directCoursePolicy))
    ) {
      const metadata = await this.options.store.readMetadataValue(
        `direct-course-checkpoint:${course.courseId}`
      );
      const saved = isRecord(metadata) && isRecord(metadata.ledger) ? metadata.ledger : undefined;
      const expected = isSelectiveCoursePolicy(workflow.directCoursePolicy)
        ? digest(sources.map((s) => semanticSourceVersion(s, sources)))
        : digest(directEvidenceCatalog(sources).delivered);
      if (saved?.nativeSnapshot === expected) {
        const coverage = coverageFromObservations(
          observations,
          sources.map((s) => s.sourceId)
        );
        const partial = coverage.partialCoverage || saved.partial === true;
        const now = this.nowIso();
        await this.options.store.upsertCourse({
          ...course,
          lastCheckAttemptAt: now,
          ...(partial ? {} : { lastSuccessfulCheckAt: now }),
          consecutiveCheckFailures: partial ? course.consecutiveCheckFailures + 1 : 0,
          updatedAt: now
        });
        return { workflow: await this.complete(workflow), progressed: false };
      }
    }
    const courseCheckpoint = workflow.architecturePolicy
      ? ((await this.options.store.readMetadataValue(
          `architecture-course-checkpoint:${course.courseId}`
        )) as { ledger?: { complete: boolean } } | undefined)
      : undefined;
    const compatible =
      !workflow.architecturePolicy ||
      (
        await Promise.all(
          sources.map(async (source) => {
            const checkpoint = (await this.options.store.readMetadataValue(
              `architecture-a-checkpoint:${course.courseId}:${source.sourceId}`
            )) as { ledger?: { snapshot: string; semanticPolicy?: string } } | undefined;
            return (
              checkpoint?.ledger?.snapshot === digest(bootstrap(source)) &&
              checkpoint.ledger.semanticPolicy === workflow.semanticPolicy
            );
          })
        )
      ).every(Boolean);
    if (
      workflow.kind === "check" &&
      !changed &&
      compatible &&
      (!workflow.architecturePolicy || courseCheckpoint?.ledger?.complete === true) &&
      (workflow.architecturePolicy
        ? coverageSatisfied(
            coverageFromObservations(
              observations,
              sources.map((s) => s.sourceId)
            )
          )
        : teachingCheckpointsCurrent(sources))
    ) {
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

  private async physicalUnits(
    workflow: WorkflowRecord,
    course: CourseRecord,
    identity: string,
    inputs: LogicalInput[],
    validate: (id: string, value: unknown) => unknown,
    recoveryWaves: 0 | 1 | 2 = 0
  ): Promise<PhysicalWorkLedger> {
    const key = `physical-work:${workflow.workflowId}:${identity}`;
    const saved = await this.options.store.readMetadataValue(key);
    const existing =
      isRecord(saved) && saved.kind === "physical-work-ledger"
        ? (saved.ledger as PhysicalWorkLedger)
        : undefined;
    if (!workflow.lease) throw new StaleWorkflowCompletion(workflow.workflowId);
    return runPhysicalWork({
      identity: key,
      owner: workflow.lease.token,
      session: workflow.lease.sessionId ?? this.sessionId,
      inputs,
      ...(existing ? { existing } : {}),
      mainWaves: 2,
      recoveryWaves,
      concurrency: 10, // Product initial dynamic target; bins balance measured input, no Source-count ceiling.
      ...(this.phaseControllers.get(this.phaseKey(workflow))
        ? { signal: this.phaseControllers.get(this.phaseKey(workflow))?.signal as AbortSignal }
        : {}),
      persist: (ledger) => this.options.store.writePhysicalWorkLedger(workflow, key, ledger),
      dispatch: (call) =>
        this.execute({
          call,
          apiKey: "",
          workflow,
          course,
          task: call.task,
          context: { knownSourceIds: new Set(inputs.map((u) => u.id)) }
        }),
      recover: async (call) => {
        const fingerprint = invocationFingerprint({ ...call });
        const run = await this.options.store.findAiRun(
          call.idempotencyKey,
          fingerprint,
          workflow.workflowId
        );
        return run?.status === "succeeded" ? run.payload : undefined;
      },
      validate
    });
  }

  private taskAPackageIdentity(
    source: SourceRecord,
    sources: SourceRecord[],
    index: CourseContentIndex
  ): string {
    const selection = teachingSourceView(source, sources, index);
    const parsed = selection?.processing.parsed;
    if (!selection || !parsed) throw Error("TASK_A_NATIVE_SELECTION_MISSING");
    return stableDigest(
      stableStringify({
        policy: DEFERRAL_POLICY,
        selection: selection.selectionFingerprint,
        native: {
          text: parsed.text,
          structure: parsed.structure,
          units: parsed.units,
          contentHash: parsed.contentHash,
          canonicalization: parsed.canonicalization
        },
        prompt: PROMPT_VERSIONS.a
      })
    );
  }

  private async batchedTaskA(
    workflow: WorkflowRecord,
    course: CourseRecord,
    context: RunContext,
    eligible: SourceRecord[],
    index: CourseContentIndex,
    apiKey: string
  ): Promise<
    PackageOutcome<TaskAResult & { visualCoverageComplete?: boolean; visualLocators?: string[] }>[]
  > {
    const allowed = new Map<string, Set<string>>();
    const cleanId =
      workflow.kind === "initial" || workflow.qaSemanticClean ? workflow.workflowId : undefined;
    const inputs = eligible
      .filter((source) => reusableTeaching(source, context.sourceRecords, cleanId, index))
      .map((source) => {
        const selection = teachingSourceView(source, context.sourceRecords, index);
        const parsed = selection?.processing.parsed;
        if (!selection || !parsed) throw Error("TASK_A_NATIVE_SELECTION_MISSING");
        const own = index.units.filter((u) => selection.selectedUnitRefs.includes(u[0]));
        allowed.set(
          source.sourceId,
          new Set(
            own
              .filter(
                (u) =>
                  source.kind === "attachment" && this.options.machine.visualParts && u[7].length
              )
              .map((u) => u[0])
          )
        );
        const calls = this.options.buildTaskACalls({
          measuredPhysicalPacking: true,
          source: {
            sourceId: source.sourceId,
            sourceType: source.kind,
            title: source.title,
            text: parsed.text,
            structure: parsed.structure,
            nativeUnits: (parsed.units ?? []).map((u) => ({
              ...u,
              ref:
                own.find((row) => row[2] === u.locator)?.[0] ??
                (() => {
                  throw Error("TASK_A_LOCATOR_MISSING");
                })()
            })),
            unresolvedVisualLocators: own.filter((u) => u[7].length).map((u) => u[2])
          },
          course: { courseCode: course.courseCode, courseName: course.courseName },
          chunks: [
            {
              chunkId: stableDigest(parsed.text),
              chunkIndex: 0,
              chunkCount: 1,
              text: parsed.text,
              locator: source.title,
              locators: parsed.structure,
              start: 0,
              end: parsed.text.length
            }
          ]
        });
        if (calls.length !== 1 || !calls[0]) throw Error("TASK_A_FULL_SOURCE_CALL_REQUIRED");
        return {
          id: source.sourceId,
          call: {
            ...calls[0],
            idempotencyKey: `native:${workflow.workflowId}:${source.sourceId}`,
            providerRequestCompatibility: "provider-default" as const
          }
        };
      });
    const ledger = await this.physicalUnits(
      workflow,
      course,
      "task-a-native",
      inputs,
      (id, value) => {
        const result = validateTaskA(value, new Set([id]));
        assertNoProductInstructions(value);
        validateTaskAVisualRequests(result, allowed.get(id) ?? new Set());
        return result;
      },
      1
    );
    const outcomes = await schedulePackages(
      eligible,
      async (
        source
      ): Promise<
        PackageOutcome<
          TaskAResult & { visualCoverageComplete?: boolean; visualLocators?: string[] }
        >
      > => {
        await this.assertCompletionOwnership(workflow);
        const unit = ledger.units.find((u) => u.id === source.sourceId);
        if (unit?.status !== "verified") {
          return {
            ok: false,
            error: new DeepSeekFailure(
              unit?.status === "paid-unverified" ? "NETWORK_TRANSIENT" : "AI_CONTRACT",
              false,
              unit?.error ?? "TASK_A_CLASSIFICATION_UNRESOLVED"
            )
          };
        }
        try {
          const fp = this.taskAPackageIdentity(source, context.sourceRecords, index);
          const cached = await this.options.store.findTaskAPackage(
            workflow.workflowId,
            source.sourceId,
            fp
          );
          let result = cached?.taskAPackage?.result as TaskAResult | undefined;
          if (!result) {
            result = validateTaskA(unit.value, new Set([source.sourceId]));
            if (result.visualRequestRefs?.length)
              result = await this.runTaskASource({
                workflow,
                course,
                context,
                source,
                apiKey,
                index,
                keyPrefix: "task-a",
                initialResult: result
              });
            await this.options.store.recordAiRun({
              aiRunId: `logical_${stableDigest(`${workflow.workflowId}:${source.sourceId}:${fp}`)}`,
              workflowId: workflow.workflowId,
              courseId: course.courseId,
              task: "task-a",
              schemaVersion: TASK_A_SCHEMA,
              promptVersion: PROMPT_VERSIONS.a,
              idempotencyKey: `logical:${workflow.workflowId}:${source.sourceId}`,
              status: "succeeded",
              sourceId: source.sourceId,
              attempt: workflow.attempt + 1,
              payload: result,
              taskAPackage: { fingerprint: fp, result },
              invocationRole: "logical-checkpoint",
              recordedAt: this.nowIso()
            });
          }
          return { ok: true, value: result };
        } catch (error) {
          return { ok: false, error };
        }
      },
      {
        initialConcurrency: 10,
        maxConcurrency: 25,
        retainSettledOnStop: true,
        ...(this.phaseControllers.get(this.phaseKey(workflow))
          ? { signal: this.phaseControllers.get(this.phaseKey(workflow))?.signal as AbortSignal }
          : {})
      }
    );
    return outcomes.map((outcome) => (outcome.ok ? outcome.value : outcome));
  }

  private async architectureSession(
    workflow: WorkflowRecord,
    context: RunContext,
    stage: "A" | "B1" | "B2" | "C",
    target: string,
    input: unknown,
    scope: ReadScope,
    validate: (output: unknown) => void,
    onReply?: (reply: SessionReply) => Promise<void>,
    phase?: "facets",
    precedingSemanticRounds?: number
  ): Promise<unknown> {
    const id = `${ARCHITECTURE_POLICY}:${workflow.workflowId}:${stage}:${target}`;
    const key = `architecture-session:${id}`;
    return runSession(id, stage, input, {
      ...(phase ? { phase } : {}),
      ...(precedingSemanticRounds !== undefined ? { precedingSemanticRounds } : {}),
      legacySemantics: !workflow.semanticPolicy,
      ...(workflow.semanticPolicy ? { semanticPolicy: workflow.semanticPolicy } : {}),
      load: async () => {
        const value = (await this.options.store.readMetadataValue(key)) as
          { ledger?: Session } | undefined;
        const saved = value?.ledger;
        for (const ref of saved?.renderedRefs ?? []) (scope.rendered ??= new Set()).add(ref);
        if (saved?.state === "failed" && workflow.userRetryAuthorized) {
          saved.state = "active";
          const last = saved.requests.at(-1);
          if (last && last.state !== "paid-unverified" && last.state !== "dispatched")
            last.state = "failed";
        }
        return saved;
      },
      save: async (session) => {
        await this.assertCompletionOwnership(workflow);
        await this.options.store.writePhysicalWorkLedger(workflow, key, session);
      },
      beforeDispatch: async () => {
        await this.requireApiKey();
        await this.assertCompletionOwnership(workflow);
      },
      execute: async (call) =>
        this.execute({
          call,
          apiKey: await this.requireApiKey(),
          workflow,
          course: context.course,
          task: call.task,
          context: {
            knownSourceIds: new Set(scope.sources.map((s) => s.sourceId)),
            evidence: scope.evidence
          }
        }),
      prepareVisuals: async (refs) => {
        const result: AiVisualPart[] = [];
        for (const ref of refs) {
          const source = scope.sources.find((s) => s.sourceId === ref.sourceId);
          if (!source || !this.options.machine.visualParts) throw Error("READ_VISUAL_UNAVAILABLE");
          const rendered = await this.options.machine.visualParts(source);
          const part = rendered.parts.find((p) => p.locator === ref.locator);
          if (!part || rendered.unresolved.includes(ref.locator))
            throw Error("READ_VISUAL_UNRESOLVED");
          result.push(part);
          (scope.rendered ??= new Set()).add(`${ref.sourceId}:${ref.locator}`);
        }
        return result;
      },
      resolve: (reads) => Promise.resolve(resolveReads(reads, scope)),
      resolveTransport: (reads) =>
        Promise.resolve(resolveReads(reads, { sources: [], evidence: [], objects: scope.objects })),
      validateFinal: validate,
      ...(onReply ? { onReply } : {})
    });
  }

  private async architectureTaskA(workflow: WorkflowRecord): Promise<StepResult> {
    const course = await this.requireCourse(workflow);
    const context = await this.materializeContext(workflow, course);
    const eligible = context.sourceRecords.filter((source) => {
      const observed = context.observations.find(
        (o) => o.workflowId === workflow.workflowId && o.sourceId === source.sourceId
      );
      return (
        !source.removedFromNative &&
        !!source.parsed &&
        observed?.fetchStatus === "ok" &&
        (observed.parseStatus === "ok" || observed.parseStatus === "partial")
      );
    });
    const outcomes = await schedulePackages<SourceRecord, TaskAResult>(
      eligible,
      async (source) => {
        const checkpointKey = `architecture-a-checkpoint:${course.courseId}:${source.sourceId}`;
        const snapshot = digest(bootstrap(source));
        const checkpoint = (await this.options.store.readMetadataValue(checkpointKey)) as
          | {
              ledger?: {
                snapshot: string;
                result: TaskAResult;
                semanticPolicy?: string;
                renderedRefs?: string[];
              };
            }
          | undefined;
        if (
          workflow.kind === "check" &&
          !workflow.qaSemanticClean &&
          context.observations.some(
            (o) =>
              o.workflowId === workflow.workflowId &&
              o.sourceId === source.sourceId &&
              o.machineComparison === "unchanged"
          ) &&
          checkpoint?.ledger?.snapshot === snapshot &&
          checkpoint.ledger.semanticPolicy === workflow.semanticPolicy
        ) {
          const cached = validateTaskA(checkpoint.ledger.result, new Set([source.sourceId]));
          if (
            workflow.semanticPolicy === "assessment-relevance/2" ||
            workflow.semanticPolicy === "assessment-relevance/3" ||
            workflow.semanticPolicy === "assessment-relevance/4"
          )
            validateOutputA(cached);
          if (
            workflow.semanticPolicy === "assessment-relevance/3" ||
            workflow.semanticPolicy === "assessment-relevance/4"
          )
            validateSourceCoverage(cached, {
              sources: [source],
              evidence: [],
              objects: {},
              rendered: new Set(checkpoint.ledger.renderedRefs ?? [])
            });
          return cached;
        }
        const scope: ReadScope = { sources: [source], evidence: [], objects: {} };
        const value = await this.architectureSession(
          workflow,
          context,
          "A",
          source.sourceId,
          {
            course: { courseCode: course.courseCode, courseName: course.courseName },
            ...bootstrap(source)
          },
          scope,
          (output) => {
            const final = validateTaskA(output, new Set([source.sourceId]));
            if (
              workflow.semanticPolicy === "assessment-relevance/2" ||
              workflow.semanticPolicy === "assessment-relevance/3" ||
              workflow.semanticPolicy === "assessment-relevance/4"
            )
              validateOutputA(final);
            if (
              workflow.semanticPolicy === "assessment-relevance/3" ||
              workflow.semanticPolicy === "assessment-relevance/4"
            )
              validateSourceCoverage(final, scope);
            if (final.visualRequestRefs?.length) throw Error("A_FINAL_PENDING_VISUAL_READ");
            assertNoProductInstructions(output);
            validateProvenance(output, scope);
          }
        );
        const result = validateTaskA(
          scopeEvidenceIds(value, course.courseId, scope),
          new Set([source.sourceId])
        );
        await this.options.store.writePhysicalWorkLedger(workflow, checkpointKey, {
          snapshot,
          ...(workflow.semanticPolicy ? { semanticPolicy: workflow.semanticPolicy } : {}),
          result,
          renderedRefs: [...(scope.rendered ?? [])]
        });
        return result;
      },
      {
        initialConcurrency: 10,
        maxConcurrency: 25,
        retainSettledOnStop: true,
        ...(this.phaseControllers.get(this.phaseKey(workflow))
          ? { signal: this.phaseControllers.get(this.phaseKey(workflow))?.signal as AbortSignal }
          : {}),
        fatal: (error) => error instanceof Error && error.message.includes("PAID_UNVERIFIED")
      }
    );
    const staged =
      (await this.options.staging.read(course.courseId, workflow.workflowId)) ??
      emptyStaging(course.courseId, workflow.workflowId, this.nowIso());
    const results: Array<{ sourceId: string; result?: TaskAResult; error?: string }> = [];
    for (const [i, outcome] of outcomes.entries()) {
      const source = eligible[i] as SourceRecord;
      results.push(
        outcome.ok
          ? { sourceId: source.sourceId, result: outcome.value }
          : {
              sourceId: source.sourceId,
              error: outcome.error instanceof Error ? outcome.error.message : "TASK_A_FAILED"
            }
      );
    }
    for (const source of context.sourceRecords)
      if (!results.some((r) => r.sourceId === source.sourceId))
        results.push({ sourceId: source.sourceId, error: "SOURCE_TECHNICAL_GAP" });
    await this.options.store.writePhysicalWorkLedger(
      workflow,
      `architecture-a:${workflow.workflowId}`,
      results
    );
    await this.options.staging.write({
      ...staged,
      taskACoverage: {
        succeededSourceIds: results.filter((r) => r.result).map((r) => r.sourceId),
        relevantSourceIds: results
          .filter((r) => r.result?.sourceResult !== "NO_RELEVANT_INFORMATION" && r.result)
          .map((r) => r.sourceId),
        failedSources: context.sourceRecords
          .filter(
            (s) =>
              !results.some(
                (r) =>
                  r.sourceId === s.sourceId &&
                  r.result &&
                  r.result.sourceResult !== "PARTIALLY_UNDERSTOOD"
              ) || s.parsed?.units?.some((u) => (u.visualGaps?.length ?? 0) > 0)
          )
          .map((s) => ({
            sourceId: s.sourceId,
            errorCode:
              results.find((r) => r.sourceId === s.sourceId)?.error ?? "SOURCE_TECHNICAL_GAP"
          }))
      }
    });
    if (results.some((r) => r.error?.includes("PAID_UNVERIFIED")))
      throw new EngineError("NETWORK_TRANSIENT", false, "PAID_UNVERIFIED");
    return this.advance(workflow);
  }

  private async architectureTaskB(workflow: WorkflowRecord): Promise<StepResult> {
    const course = await this.requireCourse(workflow);
    const context = await this.materializeContext(workflow, course);
    const stored = (await this.options.store.readMetadataValue(
      `architecture-a:${workflow.workflowId}`
    )) as
      { ledger?: Array<{ sourceId: string; result?: TaskAResult; error?: string }> } | undefined;
    if (!stored?.ledger) throw new EngineError("AI_CONTRACT", false, "TASK_A_BARRIER");
    const sourceLedger = stored.ledger;
    const inventory =
      workflow.semanticPolicy === "assessment-relevance/3" ||
      workflow.semanticPolicy === "assessment-relevance/4"
        ? sourceInventory(sourceLedger)
        : [];
    const drafts: Array<{ id: string; sourceId: string; payload: unknown }> = [];
    const rules: Array<{ id: string; sourceId: string; payload: unknown }> = [];
    for (const row of stored.ledger) {
      for (const [index, payload] of (row.result?.assessmentDrafts ?? []).entries())
        drafts.push({
          id: `${workflow.workflowId}:a:${row.sourceId}:draft:${String(index)}`,
          sourceId: row.sourceId,
          payload
        });
      for (const [index, payload] of (row.result?.courseWideConstraintCandidates ?? []).entries())
        rules.push({
          id: `${workflow.workflowId}:a:${row.sourceId}:rule:${String(index)}`,
          sourceId: row.sourceId,
          payload
        });
    }
    const trusted = await this.options.store.readTrustedSnapshot(course.courseId);
    const renderedRefs = new Set<string>();
    for (const row of stored.ledger) {
      const checkpoint = (await this.options.store.readMetadataValue(
        `architecture-a-checkpoint:${course.courseId}:${row.sourceId}`
      )) as { ledger?: { renderedRefs?: string[] } } | undefined;
      for (const ref of checkpoint?.ledger?.renderedRefs ?? []) renderedRefs.add(ref);
    }
    const aEvidence = validateProvenance(
      stored.ledger.map((r) => r.result),
      {
        sources: context.sourceRecords,
        evidence: context.evidence,
        objects: {},
        rendered: renderedRefs
      }
    );
    context.evidence = [...context.evidence, ...aEvidence];
    for (const source of context.sourceRecords)
      if (source.parsed)
        source.parsed = {
          ...source.parsed,
          visualEvidenceLocators: [
            ...new Set([
              ...(source.parsed.visualEvidenceLocators ?? []),
              ...sourceUnits(source)
                .filter((u) => renderedRefs.has(`${source.sourceId}:${u.locator}`))
                .map((u) => u.locator)
            ])
          ]
        };
    const trustedIds = new Set([
      ...(trusted?.assessments.map((a) => a.assessmentId) ?? []),
      ...(trusted?.constraints.map((r) => r.constraintId) ?? [])
    ]);
    const validateLinks = (candidate: Registry): void => {
      if (
        workflow.semanticPolicy === "assessment-relevance/2" ||
        workflow.semanticPolicy === "assessment-relevance/3" ||
        workflow.semanticPolicy === "assessment-relevance/4"
      )
        validateGroupStructure(candidate.records.filter((r) => r.kind === "group"));
      for (const record of candidate.records) {
        if (workflow.semanticPolicy)
          validateExcludedAssessment(record, {
            sources: context.sourceRecords,
            evidence: context.evidence,
            objects: {},
            rendered: renderedRefs
          });
        if (workflow.semanticPolicy && record.kind === "group")
          validateAssessmentRelevance(record, {
            sources: context.sourceRecords,
            evidence: context.evidence,
            objects: {},
            rendered: renderedRefs
          });
        if (
          record.kind === "group" &&
          typeof record.payload.trustedObjectId === "string" &&
          !trusted?.assessments.some((a) => a.assessmentId === record.payload.trustedObjectId)
        )
          throw Error("REGISTRY_UNKNOWN_TRUSTED_ID");
        if (record.kind === "rule") {
          if (
            typeof record.payload.trustedObjectId === "string" &&
            !trusted?.constraints.some((r) => r.constraintId === record.payload.trustedObjectId)
          )
            throw Error("RULE_UNKNOWN_TRUSTED_ID");
          if (
            !isRecord(record.payload.proposal) ||
            typeof record.payload.proposal.proposalId !== "string" ||
            typeof record.payload.proposal.normalizedRuleContent !== "string" ||
            !Array.isArray(record.payload.proposal.supportingEvidence) ||
            !record.payload.proposal.supportingEvidence.length
          )
            throw Error("RULE_PROPOSAL_SHAPE");
          if (
            !Array.isArray(record.payload.candidateRefs) ||
            !record.payload.candidateRefs.length ||
            record.payload.candidateRefs.some((id) => !rules.some((r) => r.id === id))
          )
            throw Error("RULE_UPSTREAM_REFS");
          validateProvenance(record.payload.proposal, {
            sources: context.sourceRecords,
            evidence: context.evidence,
            objects: {}
          });
        }
      }
      if (workflow.kind === "check")
        for (const id of trustedIds) {
          if (
            !candidate.records.some(
              (r) =>
                r.kind === "identity" &&
                r.payload.trustedObjectId === id &&
                ["SAME_ASSESSMENT", "DIFFERENT_ASSESSMENT", "UNCERTAIN", "missing"].includes(
                  String(r.payload.relationship)
                )
            )
          )
            throw Error("TRUSTED_IDENTITY_DISPOSITION_MISSING");
        }
    };
    const registryKey = `architecture-registry:${workflow.workflowId}`;
    const saved = (await this.options.store.readMetadataValue(registryKey)) as
      { ledger?: Registry } | undefined;
    let registry = saved?.ledger ?? emptyRegistry();
    const objects: Record<string, unknown> = Object.fromEntries(
      [...drafts, ...rules].map((d) => [d.id, d.payload])
    );
    for (const record of registry.records) objects[record.id] = record;
    for (const record of registry.versions)
      objects[`${record.id}@${String(record.revision)}`] = record;
    await this.architectureSession(
      workflow,
      context,
      "B1",
      "course",
      {
        drafts,
        rules,
        ...(workflow.semanticPolicy === "assessment-relevance/3" ||
        workflow.semanticPolicy === "assessment-relevance/4"
          ? { semanticInventory: inventory }
          : {}),
        ...(workflow.semanticPolicy
          ? {
              course: { courseCode: course.courseCode, courseName: course.courseName },
              sourceContexts: assessmentSourceContexts(stored.ledger, {
                sources: context.sourceRecords,
                evidence: context.evidence,
                objects: {}
              })
            }
          : {}),
        sourceTerminals: stored.ledger.map((r) => ({
          sourceId: r.sourceId,
          state: r.result ? "final" : "failed"
        })),
        trusted: workflow.kind === "check" ? trusted : null,
        registryManifest: []
      },
      { sources: context.sourceRecords, evidence: context.evidence, objects },
      (output) => {
        if (!isRecord(output) || !Array.isArray(output.operations)) throw Error("REGISTRY_OUTPUT");
        const candidate = applyOperations(registry, output.operations);
        validateLinks(candidate);
        validateRegistry(
          candidate,
          drafts.map((d) => d.id),
          rules.map((r) => r.id)
        );
      },
      async (reply) => {
        const operations =
          isRecord(reply.carry) && Array.isArray(reply.carry.operations)
            ? reply.carry.operations
            : [];
        registry = applyOperations(registry, operations);
        if (
          reply.kind === "ROUND_COMPLETE_FINAL" &&
          isRecord(reply.output) &&
          Array.isArray(reply.output.operations)
        )
          registry = applyOperations(registry, reply.output.operations);
        if (reply.kind === "ROUND_COMPLETE_FINAL") {
          if (
            workflow.semanticPolicy === "assessment-relevance/3" ||
            workflow.semanticPolicy === "assessment-relevance/4"
          ) {
            const routingScope: ReadScope = {
              sources: context.sourceRecords,
              evidence: context.evidence,
              objects: {},
              rendered: renderedRefs
            };
            validateInventoryRouting(
              registryInventory(inventory, registry.records, routingScope),
              registry.records,
              routingScope
            );
          }
          validateRegistry(
            registry,
            drafts.map((d) => d.id),
            rules.map((r) => r.id)
          );
          validateLinks(registry);
        }
        await this.options.store.writePhysicalWorkLedger(workflow, registryKey, registry);
        for (const record of registry.records) objects[record.id] = record;
        for (const record of registry.versions)
          objects[`${record.id}@${String(record.revision)}`] = record;
      }
    );
    validateRegistry(
      registry,
      drafts.map((d) => d.id),
      rules.map((r) => r.id)
    );
    const coverageScope: ReadScope = {
      sources: context.sourceRecords,
      evidence: context.evidence,
      objects: {},
      rendered: renderedRefs
    };
    const routedInventory =
      workflow.semanticPolicy === "assessment-relevance/3" ||
      workflow.semanticPolicy === "assessment-relevance/4"
        ? registryInventory(inventory, registry.records, coverageScope)
        : [];
    if (
      workflow.semanticPolicy === "assessment-relevance/3" ||
      workflow.semanticPolicy === "assessment-relevance/4"
    )
      validateInventoryRouting(routedInventory, registry.records, coverageScope);
    const groups = registry.records.filter((r) => r.kind === "group");
    const outcomes = await schedulePackages<RegistryRecord, TaskBResult>(
      groups,
      async (group) => {
        const memberIds = group.payload.memberDraftIds as string[];
        const members = drafts.filter((d) => memberIds.includes(d.id));
        const synthesisInventory = groupInventory(routedInventory, registry.records, group.id);
        const sourceIds = new Set([
          ...members.map((d) => d.sourceId),
          ...relevanceSourceIds(group),
          ...synthesisInventory.map((u) => u.sourceId)
        ]);
        const groupScope: ReadScope = {
          sources: context.sourceRecords.filter((s) => sourceIds.has(s.sourceId)),
          evidence: context.evidence.filter((e) => sourceIds.has(e.sourceId)),
          objects: {
            ...Object.fromEntries(members.map((d) => [d.id, d.payload])),
            [group.id]: group
          }
        };
        let facetInventory: FacetInventory | undefined;
        let facetSemanticRounds: number | undefined;
        if (workflow.semanticPolicy === "assessment-relevance/4") {
          const value = await this.architectureSession(
            workflow,
            context,
            "B2",
            `facets:${group.id}`,
            {
              group,
              members,
              semanticInventory: synthesisInventory,
              nativeContent: nativeFacetContent(groupScope),
              sourceContexts: assessmentSourceContexts(
                sourceLedger.filter((row) => sourceIds.has(row.sourceId)),
                groupScope
              )
            },
            groupScope,
            (value) => {
              validateFacetInventory(value, synthesisInventory, groupScope);
            },
            undefined,
            "facets"
          );
          facetInventory = validateFacetInventory(value, synthesisInventory, groupScope);
          const facetMetadata = (await this.options.store.readMetadataValue(
            `architecture-session:${ARCHITECTURE_POLICY}:${workflow.workflowId}:B2:facets:${group.id}`
          )) as { ledger?: Session } | undefined;
          if (!facetMetadata?.ledger || facetMetadata.ledger.state !== "final")
            throw Error("B2_FACET_BUDGET_RECEIPT_REQUIRED");
          facetSemanticRounds = facetMetadata.ledger.effectiveRounds;
        }
        const output = await this.architectureSession(
          workflow,
          context,
          "B2",
          group.id,
          {
            group,
            members,
            registryRevision: registry.revision,
            ...(workflow.semanticPolicy === "assessment-relevance/3" ||
            workflow.semanticPolicy === "assessment-relevance/4"
              ? {
                  semanticInventory: facetInventory?.facets ?? synthesisInventory,
                  ...(facetInventory ? { facetInventory } : {})
                }
              : {}),
            ...(workflow.semanticPolicy
              ? {
                  sourceContexts: assessmentSourceContexts(
                    sourceLedger.filter((row) => sourceIds.has(row.sourceId)),
                    groupScope
                  )
                }
              : {})
          },
          groupScope,
          (value) => {
            const result = validateTaskB(value, new Set(groupScope.sources.map((s) => s.sourceId)));
            if (
              workflow.semanticPolicy === "assessment-relevance/2" ||
              workflow.semanticPolicy === "assessment-relevance/3" ||
              workflow.semanticPolicy === "assessment-relevance/4"
            )
              validateOutputB2(value, result, group);
            if (
              workflow.semanticPolicy === "assessment-relevance/3" ||
              workflow.semanticPolicy === "assessment-relevance/4"
            )
              if (facetInventory) validateFacetSynthesis(result, facetInventory, groupScope);
              else validateCoverageDecisions(result, synthesisInventory, groupScope);
            if (
              result.canonicalAssessmentProposals.length !== 1 ||
              result.courseWideConstraintProposals.length
            )
              throw Error("GROUP_OUTPUT_CARDINALITY");
            const proposal = result.canonicalAssessmentProposals[0];
            if (
              !isRecord(proposal) ||
              typeof proposal.canonicalName !== "string" ||
              !proposal.canonicalName ||
              !Array.isArray(proposal.consolidatedFields) ||
              !Array.isArray(proposal.requirements) ||
              !Array.isArray(proposal.supportingEvidence)
            )
              throw Error("GROUP_PROPOSAL_SHAPE");
            if (result.identityResolutions.length || result.structuralRelationships.length)
              throw Error("GROUP_IDENTITY_AUTHORITY");
            if (
              !isRecord(value) ||
              !isRecord(value.upstream) ||
              value.upstream.groupId !== group.id ||
              value.upstream.revision !== group.revision ||
              !Array.isArray(value.upstream.memberDraftIds) ||
              JSON.stringify(value.upstream.memberDraftIds) !== JSON.stringify(memberIds)
            )
              throw Error("GROUP_UPSTREAM_REFS");
            assertNoProductInstructions(value);
            validateProvenance(value, groupScope);
          },
          undefined,
          undefined,
          facetSemanticRounds
        );
        for (const ref of groupScope.rendered ?? []) renderedRefs.add(ref);
        const result = validateTaskB(output, new Set(groupScope.sources.map((s) => s.sourceId)));
        return {
          ...result,
          ...(facetInventory
            ? {
                facetInventory,
                unresolvedIssues: [...result.unresolvedIssues, ...facetInventory.unresolvedIssues]
              }
            : {})
        };
      },
      {
        initialConcurrency: 10,
        maxConcurrency: 25,
        retainSettledOnStop: true,
        ...(this.phaseControllers.get(this.phaseKey(workflow))
          ? { signal: this.phaseControllers.get(this.phaseKey(workflow))?.signal as AbortSignal }
          : {}),
        fatal: (error) => error instanceof Error && error.message.includes("PAID_UNVERIFIED")
      }
    );
    const values: TaskBResult = {
      schema: AI_SCHEMAS.b,
      ...(workflow.semanticPolicy === "assessment-relevance/3" ||
      workflow.semanticPolicy === "assessment-relevance/4"
        ? { semanticCoverage: [] }
        : {}),
      identityResolutions: registry.records
        .filter((r) => r.kind === "identity" && isRecord(r.payload.resolution))
        .map((r) => r.payload.resolution) as TaskBResult["identityResolutions"],
      canonicalAssessmentProposals: [],
      courseWideConstraintProposals: registry.records
        .filter((r) => r.kind === "rule")
        .map((r) => ({
          ...(r.payload.proposal as Record<string, unknown>),
          proposalId:
            typeof r.payload.trustedObjectId === "string"
              ? r.payload.trustedObjectId
              : `${workflow.workflowId}:rule:${r.id}`
        })),
      fieldConsolidationResults: [],
      structuralRelationships: [],
      unresolvedIssues: registry.records
        .filter(
          (r) => r.kind === "issue" && !r.payload.semanticDisposition && !r.payload.semanticUnit
        )
        .map((r) => r.payload)
    };
    for (const [i, outcome] of outcomes.entries()) {
      if (!outcome.ok) {
        values.unresolvedIssues.push({
          groupId: (groups[i] as RegistryRecord).id,
          error: "GROUP_TECHNICAL_FAILURE"
        });
        continue;
      }
      const result = outcome.value;
      const group = groups[i] as RegistryRecord;
      if (
        workflow.semanticPolicy === "assessment-relevance/3" ||
        workflow.semanticPolicy === "assessment-relevance/4"
      )
        values.semanticCoverage?.push({
          groupId: group.id,
          proposalId:
            typeof group.payload.trustedObjectId === "string"
              ? group.payload.trustedObjectId
              : `${workflow.workflowId}:group:${group.id}`,
          targetObjectId:
            typeof group.payload.trustedObjectId === "string"
              ? group.payload.trustedObjectId
              : `${(group.payload.role ?? "assessment") === "assessment" || group.payload.role === "series" ? "assessment" : "component"}_${workflow.workflowId}:group:${group.id}`,
          ...(result.facetInventory ? { facetInventory: result.facetInventory } : {}),
          semanticInventory: isRecord(result.facetInventory)
            ? result.facetInventory.facets
            : [
                ...groupInventory(routedInventory, registry.records, group.id),
                ...(result.semanticInventory ?? [])
              ],
          coverageDecisions: (result.coverageDecisions ?? []).map((raw) =>
            isRecord(raw)
              ? {
                  ...raw,
                  targets: Array.isArray(raw.targets)
                    ? (raw.targets as unknown[]).map((t) =>
                        isRecord(t)
                          ? {
                              ...t,
                              proposalId:
                                typeof group.payload.trustedObjectId === "string"
                                  ? group.payload.trustedObjectId
                                  : `${workflow.workflowId}:group:${group.id}`
                            }
                          : t
                      )
                    : raw.targets
                }
              : raw
          )
        });
      for (const proposal of result.canonicalAssessmentProposals) {
        if (!isRecord(proposal)) throw Error("GROUP_PROPOSAL");
        const trustedId = group.payload.trustedObjectId;
        const proposalId =
          typeof trustedId === "string" ? trustedId : `${workflow.workflowId}:group:${group.id}`;
        values.canonicalAssessmentProposals.push({
          ...proposal,
          proposalId,
          ...((workflow.semanticPolicy === "assessment-relevance/2" ||
            workflow.semanticPolicy === "assessment-relevance/3" ||
            workflow.semanticPolicy === "assessment-relevance/4") &&
          typeof group.payload.parentGroupId === "string"
            ? {
                componentOfProposalId: (() => {
                  const parent = groups.find((g) => g.id === group.payload.parentGroupId);
                  if (!parent) throw Error("GROUP_PARENT_MISSING");
                  return typeof parent.payload.trustedObjectId === "string"
                    ? parent.payload.trustedObjectId
                    : `${workflow.workflowId}:group:${parent.id}`;
                })()
              }
            : {}),
          ...(workflow.semanticPolicy
            ? {
                consolidatedFields: [
                  ...(proposal.consolidatedFields as unknown[]),
                  ...relevanceFields(group)
                ]
              }
            : {})
        });
      }
      for (const raw of result.fieldConsolidationResults) {
        if (isRecord(raw))
          values.fieldConsolidationResults.push({
            ...raw,
            proposalId:
              typeof group.payload.trustedObjectId === "string"
                ? group.payload.trustedObjectId
                : `${workflow.workflowId}:group:${group.id}`
          });
      }
      values.unresolvedIssues.push(...result.unresolvedIssues);
    }
    const objectAliases = new Map<string, string>();
    for (const group of groups) {
      const proposal = values.canonicalAssessmentProposals.find(
        (p) =>
          isRecord(p) &&
          p.proposalId ===
            (typeof group.payload.trustedObjectId === "string"
              ? group.payload.trustedObjectId
              : `${workflow.workflowId}:group:${group.id}`)
      );
      if (isRecord(proposal))
        objectAliases.set(
          group.id,
          trustedIds.has(String(proposal.proposalId))
            ? String(proposal.proposalId)
            : `${proposal.role === "series" || proposal.role === "assessment" ? "assessment" : "component"}_${String(proposal.proposalId)}`
        );
    }
    values.identityResolutions = values.identityResolutions.map((r) => ({
      ...r,
      involvedObjectIds: r.involvedObjectIds.map((id) => objectAliases.get(id) ?? id)
    }));
    validateTaskB(values, new Set(context.sourceRecords.map((s) => s.sourceId)));
    const strictOutput =
      workflow.semanticPolicy === "assessment-relevance/2" ||
      workflow.semanticPolicy === "assessment-relevance/3" ||
      workflow.semanticPolicy === "assessment-relevance/4";
    const projectionScope: ReadScope = {
      sources: context.sourceRecords,
      evidence: context.evidence,
      objects: {},
      rendered: renderedRefs
    };
    const qualified = strictOutput
      ? (scopeEvidenceIds(values, course.courseId, projectionScope) as TaskBResult)
      : values;
    const verified = strictOutput ? validateProvenance(qualified, projectionScope) : [];
    const materialized = materializeTaskB(
      qualified,
      { ...context, evidence: [...context.evidence, ...verified], strictOutput },
      new Map(),
      new Set(trusted?.assessments.map((a) => a.assessmentId) ?? []),
      new Set(trusted?.constraints.map((r) => r.constraintId) ?? [])
    );
    const previous =
      (await this.options.staging.read(course.courseId, workflow.workflowId)) ??
      emptyStaging(course.courseId, workflow.workflowId, this.nowIso());
    const reviewItems: ReviewItemRecord[] = materialized.assessments.map((assessment) => ({
      reviewItemId: `initial_${assessment.assessmentId}`,
      courseId: course.courseId,
      workflowId: workflow.workflowId,
      kind: "initial",
      targetId: assessment.assessmentId,
      payload: { assessmentId: assessment.assessmentId },
      createdAt: context.now,
      updatedAt: context.now
    }));
    const bundle = {
      assessments: materialized.assessments,
      constraints: materialized.constraints,
      facts: materialized.bundle.facts ?? [],
      evidence: materialized.bundle.evidence ?? [],
      reviewItems,
      changes: []
    };
    const failedGroupSources = outcomes.flatMap((outcome, index) =>
      outcome.ok
        ? []
        : drafts
            .filter((d) =>
              ((groups[index] as RegistryRecord).payload.memberDraftIds as string[]).includes(d.id)
            )
            .map((d) => ({ sourceId: d.sourceId, errorCode: "GROUP_TECHNICAL_FAILURE" }))
    );
    await this.options.staging.write({
      ...previous,
      ...bundle,
      taskBResult: values,
      ...(previous.taskACoverage
        ? {
            taskACoverage: {
              ...previous.taskACoverage,
              failedSources: [...previous.taskACoverage.failedSources, ...failedGroupSources]
            }
          }
        : {})
    });
    await this.options.store.writePhysicalWorkLedger(
      workflow,
      `architecture-course-checkpoint:${course.courseId}`,
      {
        policy: ARCHITECTURE_POLICY,
        workflowId: workflow.workflowId,
        complete:
          workflow.kind !== "check" &&
          outcomes.every((o) => o.ok) &&
          !previous.taskACoverage?.failedSources.length &&
          !values.unresolvedIssues.length
      }
    );
    if (workflow.kind === "initial") await this.writeState(workflow, bundle);
    if (
      outcomes.some(
        (o) => !o.ok && o.error instanceof Error && o.error.message.includes("PAID_UNVERIFIED")
      )
    )
      throw new EngineError("NETWORK_TRANSIENT", false, "PAID_UNVERIFIED");
    return this.advance(workflow);
  }

  private async selectiveTaskB(workflow: WorkflowRecord): Promise<StepResult> {
    const course = await this.requireCourse(workflow);
    const context = await this.materializeContext(workflow, course);
    const trusted = await this.options.store.readTrustedSnapshot(course.courseId);
    const metadata = await this.options.store.readMetadataValue(
      `direct-course-checkpoint:${course.courseId}`
    );
    const previousDraft =
      isRecord(metadata) && isRecord(metadata.ledger) && isRecord(metadata.ledger.draft)
        ? (metadata.ledger.draft as unknown as CourseDraft)
        : (await this.options.store.readCourseDraftArchive(course.courseId))?.draft;
    const port = {
      load: async (key: string) => {
        const m = await this.options.store.readMetadataValue(key);
        return isRecord(m) && isRecord(m.ledger) ? m.ledger.value : undefined;
      },
      save: async (key: string, value: unknown) => {
        await this.options.store.writePhysicalWorkLedger(workflow, key, { value });
      },
      capture: async (call: AiCall): Promise<unknown> => {
        const key = `course-draft-call:${digest({ system: call.system, user: call.user, maxTokens: call.maxTokens, reasoningEffort: call.reasoningEffort })}`;
        const m = await this.options.store.readMetadataValue(key);
        const saved = isRecord(m) && isRecord(m.ledger) ? m.ledger : undefined;
        if (saved?.value !== undefined) return saved.value;
        if (saved)
          throw new EngineError("NETWORK_TRANSIENT", false, "COURSE_DRAFT_PAID_UNVERIFIED");
        const apiKey = await this.requireApiKey();
        await this.options.store.writePhysicalWorkLedger(workflow, key, { status: "dispatching" });
        const outcome = await this.execute({
          call,
          apiKey,
          workflow,
          course,
          task: call.task === "task-c" ? "task-c" : "task-b",
          context: {
            knownSourceIds: new Set(context.sourceRecords.map((s) => s.sourceId)),
            evidence: context.evidence
          }
        });
        await this.options.store.writePhysicalWorkLedger(workflow, key, {
          status: "captured",
          value: outcome.value
        });
        return outcome.value;
      }
    };
    let draft = await runSelectiveCourse(
      {
        course: { courseCode: course.courseCode, courseName: course.courseName },
        sources: context.sourceRecords,
        outputLimit: this.options.directCourseOutputLimit,
        previous: previousDraft,
        completeScreening:
          workflow.directCoursePolicy === PROJECTED_COURSE_POLICY ||
          workflow.directCoursePolicy === PRODUCT_COURSE_POLICY,
        currentContext: trusted?.course.established
          ? {
              assessments: trusted.assessments,
              constraints: trusted.constraints,
              facts: trusted.facts.filter((f) => !f.superseded),
              decisions: await this.options.store.readDecisions(course.courseId)
            }
          : undefined
      },
      port
    );
    if (workflow.directCoursePolicy === PROJECTED_COURSE_POLICY)
      draft = await projectCourseDraft(
        draft,
        port,
        previousDraft?.projection,
        trusted?.course.established
          ? {
              assessments: trusted.assessments,
              constraints: trusted.constraints,
              decisions: await this.options.store.readDecisions(course.courseId)
            }
          : undefined,
        this.options.directCourseOutputLimit,
        undefined,
        previousDraft
      );
    if (workflow.directCoursePolicy === PRODUCT_COURSE_POLICY)
      draft = await organizeCourseProduct(
        {
          ...draft,
          ...(previousDraft?.product
            ? {
                product: previousDraft.product,
                ...(previousDraft.productVerification
                  ? { productVerification: previousDraft.productVerification }
                  : {})
              }
            : {})
        },
        port,
        this.options.directCourseOutputLimit,
        context.sourceRecords,
        (previous, riskReads) =>
          runSelectiveCourse(
            {
              course: { courseCode: course.courseCode, courseName: course.courseName },
              sources: context.sourceRecords,
              outputLimit: this.options.directCourseOutputLimit,
              previous,
              completeScreening: true,
              riskReads,
              ...(trusted?.course.established
                ? {
                    currentContext: {
                      assessments: trusted.assessments,
                      constraints: trusted.constraints,
                      facts: trusted.facts.filter((f) => !f.superseded)
                    }
                  }
                : {})
            },
            port
          )
      );
    const { candidate, output } = compileCourseDraft(
      draft,
      context.sourceRecords,
      context,
      new Set(trusted?.assessments.map((a) => a.assessmentId)),
      new Set(trusted?.constraints.map((c) => c.constraintId))
    );
    const incremental =
      workflow.kind === "check" && trusted
        ? await compareCourseDraft(
            trusted.facts.filter((f) => !f.superseded),
            candidate.bundle.facts,
            [...context.evidence, ...candidate.bundle.evidence],
            context.sourceRecords,
            draft,
            port,
            this.options.directCourseOutputLimit,
            {
              assessments: trusted.assessments,
              constraints: trusted.constraints,
              decisions: await this.options.store.readDecisions(course.courseId)
            },
            coverageFromObservations(
              context.observations.filter((o) => o.workflowId === workflow.workflowId),
              context.sourceRecords.map((s) => s.sourceId)
            )
          )
        : undefined;
    const reviewItems = directReviewItems(
      candidate,
      course.courseId,
      workflow.workflowId,
      context.now,
      new Map(context.sourceRecords.map((s) => [s.sourceId, s.title]))
    );
    const previous =
      (await this.options.staging.read(course.courseId, workflow.workflowId)) ??
      emptyStaging(course.courseId, workflow.workflowId, context.now);
    const bundle = {
      assessments: candidate.assessments,
      constraints: candidate.constraints,
      facts: candidate.bundle.facts,
      evidence: candidate.bundle.evidence,
      reviewItems,
      changes: []
    };
    const failed = draft.inspections.filter((i) => i.depth === "UNRESOLVED");
    await this.options.staging.write({
      ...previous,
      ...bundle,
      taskBResult: output,
      courseDraft: draft,
      ...(incremental ? { directIncremental: incremental } : {}),
      taskACoverage: {
        succeededSourceIds: draft.inspections
          .filter((i) => i.depth !== "UNRESOLVED")
          .map((i) => i.sourceId),
        relevantSourceIds: context.sourceRecords.map((s) => s.sourceId),
        failedSources: failed.map((i) => ({
          sourceId: i.sourceId,
          errorCode: "READING_UNRESOLVED"
        }))
      }
    });
    if (
      !reviewItems.length &&
      (failed.length > 0 ||
        draft.links.some((l) => l.disposition === "UNRESOLVED") ||
        candidate.coverage.some((c) => c.unresolvedNativeLocators.length || c.limitations.length))
    )
      throw new EngineError("AI_CONTRACT", false, "COURSE_DRAFT_UNREVIEWED_GAPS");
    if (
      incremental?.unresolvedIssues.length &&
      !incremental.changeResults.some((c) => c.changeType !== "NO_MEANINGFUL_CHANGE")
    )
      throw new EngineError("AI_CONTRACT", false, "COURSE_DRAFT_UNASSIGNED_CHANGES");
    if (workflow.kind === "initial") await this.writeState(workflow, bundle);
    await this.options.store.writePhysicalWorkLedger(
      workflow,
      `direct-course-checkpoint:${course.courseId}`,
      {
        nativeSnapshot: digest(
          context.sourceRecords.map((s) => semanticSourceVersion(s, context.sourceRecords))
        ),
        partial: failed.length > 0,
        draft,
        readingSummary: candidate.readingSummary
      }
    );
    if (workflow.kind !== "rebuild")
      await this.options.store.writeCourseDraftArchive(
        course.courseId,
        archiveCourseDraft(draft, workflow.workflowId, context.now),
        workflow
      );
    return this.advance(workflow);
  }

  private async directTaskB(workflow: WorkflowRecord): Promise<StepResult> {
    if (isSelectiveCoursePolicy(workflow.directCoursePolicy)) return this.selectiveTaskB(workflow);
    const course = await this.requireCourse(workflow);
    const context = await this.materializeContext(workflow, course);
    const trusted = await this.options.store.readTrustedSnapshot(course.courseId);
    const coverage = coverageFromObservations(
      context.observations.filter((o) => o.workflowId === workflow.workflowId),
      context.sourceRecords.map((s) => s.sourceId)
    );
    const input = {
      course: { courseCode: course.courseCode, courseName: course.courseName },
      sources: context.sourceRecords,
      ...(this.options.directCourseOutputLimit
        ? { outputLimit: this.options.directCourseOutputLimit }
        : {}),
      ...(workflow.kind === "check" && trusted
        ? {
            incrementalSnapshot: {
              coverageSufficient: coverageSatisfied(coverage),
              userState: {
                decisions: await this.options.store.readDecisions(course.courseId),
                history: await this.options.store.readHistory(course.courseId)
              },
              objects: [
                ...trusted.assessments
                  .filter((a) => !a.supersededBy)
                  .map((a) => ({
                    objectId: a.assessmentId,
                    assessment: a,
                    facts: trusted.facts.filter(
                      (f) => f.assessmentId === a.assessmentId && !f.superseded
                    )
                  })),
                ...trusted.constraints
                  .filter((c) => !c.superseded)
                  .map((c) => ({
                    objectId: c.constraintId,
                    constraint: c,
                    facts: trusted.facts.filter(
                      (f) => f.constraintId === c.constraintId && !f.superseded
                    )
                  }))
              ]
            }
          }
        : {})
    };
    const capture = async (captureInput: DirectCourseInput, suffix: string): Promise<unknown> => {
      const { snapshot, call } = prepareDirectCourse(
        captureInput,
        `direct:${workflow.workflowId}:${suffix}`
      );
      const key = suffix.startsWith("clauses")
        ? `direct-native:${snapshot}`
        : `direct-candidate:${snapshot}`;
      const metadata = await this.options.store.readMetadataValue(key);
      const saved = isRecord(metadata) && isRecord(metadata.ledger) ? metadata.ledger : undefined;
      if (saved && saved.snapshot !== snapshot)
        throw new EngineError("AI_CONTRACT", false, "DIRECT_RESUME_MISMATCH");
      if (saved?.value !== undefined) return saved.value;
      if (saved) throw new EngineError("NETWORK_TRANSIENT", false, "DIRECT_PAID_UNVERIFIED");
      await this.options.store.writePhysicalWorkLedger(workflow, key, {
        snapshot,
        status: "dispatching"
      });
      const outcome = await this.execute({
        call,
        apiKey: "",
        workflow,
        course,
        task: captureInput.comparisonOnly ? "task-c" : "task-b",
        context: {
          knownSourceIds: new Set(context.sourceRecords.map((s) => s.sourceId)),
          evidence: context.evidence
        }
      });
      await this.options.store.writePhysicalWorkLedger(workflow, key, {
        snapshot,
        status: "captured",
        value: outcome.value
      });
      return outcome.value;
    };
    const claims: NonNullable<DirectCourseInput["claimAudit"]> = [];
    const parts: unknown[] = [];
    const batches = directNativeBatches(input.sources);
    for (const [index, sources] of batches.entries()) {
      const captureInput: DirectCourseInput = {
        course: input.course,
        sources,
        sourceCapture: true,
        ...(this.options.directCourseOutputLimit
          ? { outputLimit: this.options.directCourseOutputLimit }
          : {})
      };
      const suffix = `clauses-${String(index + 1)}`;
      let sourceCapture = await capture(captureInput, suffix);
      let scopedClaims: NonNullable<DirectCourseInput["claimAudit"]>;
      try {
        scopedClaims = directClaimAudit(sourceCapture, captureInput);
      } catch (problem) {
        // One explicit, separately claimed repair. Never retry an ambiguous physical request.
        const repairedInput = {
          ...captureInput,
          contractRepair: {
            problem: problem instanceof Error ? problem.message : "AI_CONTRACT",
            capturedValue: sourceCapture
          }
        };
        sourceCapture = await capture(repairedInput, `${suffix}-contract-repair-v2`);
        scopedClaims = directClaimAudit(sourceCapture, repairedInput);
      }
      const mapped = remapDirectNativeEvidence(scopedClaims, sources, input.sources) as NonNullable<
        DirectCourseInput["claimAudit"]
      >;
      for (const c of mapped) claims.push({ ...c, claimId: `claim${String(claims.length + 1)}` });
      parts.push(
        remapDirectNativeEvidence(
          isRecord(sourceCapture) ? sourceCapture.output : undefined,
          sources,
          input.sources
        )
      );
    }
    const { incrementalSnapshot, ...globalInput } = input;
    let finalInput: DirectCourseInput = {
      ...globalInput,
      claimAudit: claims,
      requireExactClauses: true,
      claimAuditEncoding: "inline/1",
      losslessClaimEncoding: true,
      candidateUnderReview: {
        parts,
        warning:
          "Untrusted independently captured clauses; not gold or accepted task identities. Re-evaluate all claims against complete native Sources."
      }
    };
    let value = await capture(finalInput, "final-exact-clause-v9");
    let candidate: ReturnType<typeof materializeDirectCourse>;
    try {
      candidate = materializeDirectCourse(value, finalInput, context);
    } catch (problem) {
      if (
        !(problem instanceof Error) ||
        !/^(AI_CONTRACT:|ASSESSMENT_OUTPUT:|DIRECT_COURSE:)/u.test(problem.message)
      )
        throw problem;
      finalInput = {
        ...finalInput,
        contractRepair: { problem: problem.message, capturedValue: value }
      };
      value = await capture(finalInput, "final-exact-clause-v9-contract-repair");
      candidate = materializeDirectCourse(value, finalInput, context);
    }
    if (incrementalSnapshot) {
      let comparisonInput: DirectCourseInput = {
        ...globalInput,
        comparisonOnly: true,
        ...(this.options.directCourseOutputLimit === undefined
          ? {}
          : { outputLimit: this.options.directCourseOutputLimit }),
        incrementalSnapshot: {
          ...incrementalSnapshot,
          coverageSufficient:
            incrementalSnapshot.coverageSufficient &&
            !candidate.coverage.some(
              (c) => c.unresolvedNativeLocators.length || c.limitations.length
            )
        },
        candidateUnderReview: validateDirectCourse(value, finalInput)
      };
      let comparison = await capture(comparisonInput, "comparison-v2");
      let compared: ReturnType<typeof materializeDirectCourse>;
      try {
        compared = materializeDirectCourse(comparison, comparisonInput, context);
      } catch (problem) {
        if (
          !(problem instanceof Error) ||
          !/^(AI_CONTRACT:|ASSESSMENT_OUTPUT:|DIRECT_COURSE:)/u.test(problem.message)
        )
          throw problem;
        comparisonInput = {
          ...comparisonInput,
          contractRepair: { problem: problem.message, capturedValue: comparison }
        };
        comparison = await capture(comparisonInput, "comparison-v2-contract-repair");
        compared = materializeDirectCourse(comparison, comparisonInput, context);
      }
      if (!compared.incremental)
        throw new EngineError("AI_CONTRACT", false, "DIRECT_INCREMENTAL_MISSING");
      candidate = { ...candidate, incremental: compared.incremental };
    }
    const reviewItems = directReviewItems(
      candidate,
      course.courseId,
      workflow.workflowId,
      context.now,
      new Map(context.sourceRecords.map((s) => [s.sourceId, s.title]))
    );
    const previous =
      (await this.options.staging.read(course.courseId, workflow.workflowId)) ??
      emptyStaging(course.courseId, workflow.workflowId, context.now);
    const unresolved = candidate.coverage.filter(
      (c) => c.unresolvedNativeLocators.length || c.limitations.length
    );
    const bundle = {
      assessments: candidate.assessments,
      constraints: candidate.constraints,
      facts: candidate.bundle.facts ?? [],
      evidence: candidate.bundle.evidence ?? [],
      reviewItems,
      changes: []
    };
    await this.options.staging.write({
      ...previous,
      ...bundle,
      taskBResult: validateDirectCourse(value, finalInput).output,
      ...(candidate.incremental ? { directIncremental: candidate.incremental } : {}),
      taskACoverage: {
        succeededSourceIds: candidate.coverage
          .filter((c) => !unresolved.includes(c))
          .map((c) => c.sourceId),
        relevantSourceIds: context.sourceRecords.map((s) => s.sourceId),
        failedSources: unresolved.map((c) => ({
          sourceId: c.sourceId,
          errorCode: "NATIVE_PARTIAL"
        }))
      }
    });
    if (workflow.kind === "initial") await this.writeState(workflow, bundle);
    await this.options.store.writePhysicalWorkLedger(
      workflow,
      `direct-course-checkpoint:${course.courseId}`,
      {
        nativeSnapshot: digest(directEvidenceCatalog(input.sources).delivered),
        partial: unresolved.length > 0
      }
    );
    return this.advance(workflow);
  }

  private async unitTaskA(workflow: WorkflowRecord): Promise<StepResult> {
    if (workflow.directCoursePolicy) return this.advance(workflow);
    if (workflow.architecturePolicy) return this.architectureTaskA(workflow);
    const course = await this.requireCourse(workflow);
    const apiKey = await this.requireApiKey();
    const context = await this.materializeContext(workflow, course);
    const sources = context.sourceRecords;
    const index = contentIndex(sources);
    const cleanId =
      workflow.kind === "initial" || workflow.qaSemanticClean ? workflow.workflowId : undefined;
    const cached = sources
      .filter((source) => !source.removedFromNative)
      .every((source) => reusableTeaching(source, sources, cleanId, index));
    const candidates = sources.filter((source) => {
      if (!source.parsed || source.removedFromNative) return false;
      const observation = context.observations.find(
        (item) => item.sourceId === source.sourceId && item.workflowId === workflow.workflowId
      );
      // Coverage is a machine fact, not a semantic shortlist. Only Sources successfully captured in
      // this workflow are eligible for AI-selected retrieval and downstream Task A.
      if (
        observation?.fetchStatus !== "ok" ||
        (observation.parseStatus !== "ok" && observation.parseStatus !== "partial")
      )
        return false;
      if (workflow.kind !== "check") return true;
      return (
        observation.machineComparison === "machine-different" ||
        observation.machineComparison === "new-source" ||
        !cached
      );
    });

    if (!candidates.length) return this.advance(workflow);

    // Stable batch identity lets an explicit retry reuse the already-successful classification
    // even when checkpoint persistence stopped halfway through the Source list.
    const targets = candidates.filter(needsTeachingClassification);
    if (targets.some((source) => !reusableTeaching(source, sources, cleanId, index))) {
      const input = teachingInput(sources, targets, index);
      const outcome = workflow.physicalWorkPolicy
        ? await (async () => {
            const inputs = targets.map((source) => ({
              id: source.sourceId,
              call: teachingCall(
                teachingInput(sources, [source], index),
                `classification:${workflow.workflowId}:${source.sourceId}`
              )
            }));
            const ledger = await this.physicalUnits(
              workflow,
              course,
              "classification",
              inputs,
              (id, value) =>
                validateTeachingResult(
                  value,
                  teachingInput(
                    sources,
                    targets.filter((s) => s.sourceId === id),
                    index
                  )
                )
            );
            if (ledger.units.some((unit) => unit.status === "paid-unverified"))
              throw new EngineError(
                "NETWORK_TRANSIENT",
                false,
                "CLASSIFICATION_PAID_UNVERIFIED_ADMISSION_STOP"
              );
            return {
              call: teachingCall(input, `classification:${workflow.workflowId}`),
              value: {
                schema: DEFERRAL_SCHEMA,
                sources: ledger.units.flatMap((u) =>
                  u.status === "verified" ? (u.value as TeachingResult).sources : []
                )
              }
            };
          })()
        : await this.execute({
            call: teachingCall(input, `classification:${workflow.workflowId}`),
            apiKey,
            workflow,
            course,
            task: "teaching-classification",
            context: { knownSourceIds: new Set(targets.map((s) => s.sourceId)) }
          });
      const result = workflow.physicalWorkPolicy
        ? (outcome.value as TeachingResult)
        : validateTeachingResult(outcome.value, input);
      for (const row of result.sources) {
        const source = sources.find((s) => s.sourceId === row.sourceId);
        const profile = input.profiles.find((p) => p.sourceId === row.sourceId);
        if (!source || !profile)
          throw new EngineError("AI_CONTRACT", false, "Classification Source missing");
        source.teaching = {
          workflowId: workflow.workflowId,
          policyVersion: DEFERRAL_POLICY,
          schemaVersion: DEFERRAL_SCHEMA,
          promptVersion: DEFERRAL_PROMPT,
          profileFingerprint: profile.profileFingerprint,
          result: row
        };
        await this.writeState(workflow, { sources: [source] });
      }
    }
    const deferred = candidates.filter(
      (source) => reusableTeaching(source, sources, cleanId, index) && !semanticallyProcess(source)
    );
    const deferredIds = new Set(deferred.map((source) => source.sourceId));
    const eligible = candidates.filter((source) => !deferredIds.has(source.sourceId));
    for (const source of deferred) {
      const observation = context.observations.find(
        (o) => o.sourceId === source.sourceId && o.workflowId === workflow.workflowId
      );
      if (observation) {
        observation.understandingStatus = "partial";
        await this.writeState(workflow, { observations: [observation] });
      }
    }
    qaTrace("qa.teaching-deferral", {
      scopeId: workflow.workflowId,
      classified: targets.filter((source) => reusableTeaching(source, sources, cleanId, index))
        .length,
      deferred: candidates.length - eligible.length,
      downstream: eligible.length,
      retainedUnits: index.units.length
    });
    // Provider work is concurrent; ordered commits avoid read/modify/write races in staging.
    const outcomes = workflow.physicalWorkPolicy
      ? await this.batchedTaskA(workflow, course, context, eligible, index, apiKey)
      : await schedulePackages(
          eligible,
          (source) =>
            this.runTaskASource({
              workflow,
              course,
              context,
              source,
              apiKey,
              index,
              keyPrefix: "task-a"
            }),
          {
            ...(this.phaseControllers.get(this.phaseKey(workflow))
              ? {
                  signal: this.phaseControllers.get(this.phaseKey(workflow))?.signal as AbortSignal
                }
              : {}),
            identity: (source) => source.sourceId,
            scope: workflow.workflowId,
            cooldown: (error) => (error instanceof DeepSeekFailure ? error.retryAfterMs : 0),
            pressure: (error) =>
              error instanceof DeepSeekFailure &&
              (error.code === "AI_RATE_LIMIT" || error.code === "NETWORK_TRANSIENT"),
            fatal: (error) =>
              error instanceof EngineError ||
              error instanceof StaleWorkflowCompletion ||
              (error instanceof DeepSeekFailure &&
                ["AI_AUTH", "NETWORK_TRANSIENT", "AI_PROVIDER"].includes(error.code)),
            onConcurrency: (limit) => qaTrace("qa.task-a-concurrency", { limit }),
            retainSettledOnStop: true
          }
        );
    await this.commitTaskAOutcomes(workflow, context, eligible, outcomes);
    return this.advance(workflow);
  }

  /** All independently verified successes commit even if a preceding item is unusable. */
  private async commitTaskAOutcomes(
    workflow: WorkflowRecord,
    context: RunContext,
    eligible: SourceRecord[],
    outcomes: PackageOutcome<
      TaskAResult & { visualCoverageComplete?: boolean; visualLocators?: string[] }
    >[]
  ): Promise<void> {
    const failedSourcesForRecovery: SourceRecord[] = [];
    let unexpected: { error: unknown } | undefined;
    await this.assertCompletionOwnership(workflow);
    qaTrace("qa.task-a-postprocess", {
      scopeId: workflow.workflowId,
      stage: "packages-settled",
      count: outcomes.length,
      successes: outcomes.filter((outcome) => outcome.ok).length,
      failures: outcomes.filter((outcome) => !outcome.ok).length
    });
    await this.options.store.writePostProcessingDiagnostic(
      workflow,
      `runtime.task-a:${workflow.workflowId}:${String(workflow.attempt + 1)}:outcomes`,
      {
        stage: "packages-settled",
        phase: "end",
        observedAt: this.nowIso(),
        items: eligible.map((source, order) => ({
          sourceRef: stableDigest(source.sourceId),
          order,
          disposition: outcomes[order]?.ok ? "verified-success" : "unresolved"
        }))
      }
    );
    for (const [index, outcome] of outcomes.entries()) {
      const source = eligible[index];
      if (!source) continue;
      try {
        await this.assertCompletionOwnership(workflow);
        if (outcome.ok) {
          const item = { sourceId: source.sourceId, order: index };
          await this.observePostProcessing(
            workflow,
            "understanding-write",
            () => this.recordUnderstanding(workflow, context, source, outcome.value),
            item
          );
          await this.observePostProcessing(
            workflow,
            "draft-staging-write",
            () => this.persistTaskADrafts(workflow, context, source, outcome.value),
            item
          );
          await this.observePostProcessing(
            workflow,
            "coverage-staging-write",
            () =>
              this.recordTaskASuccess(
                workflow,
                source.sourceId,
                outcome.value.sourceResult !== "NO_RELEVANT_INFORMATION"
              ),
            item
          );
        } else {
          const error = outcome.error;
          const terminalSourceFailure =
            workflow.kind === "rebuild" &&
            error instanceof DeepSeekFailure &&
            error.code === "AI_CONTRACT";
          if (!terminalSourceFailure) {
            await this.observePostProcessing(
              workflow,
              "unexpected-outcome",
              () =>
                Promise.resolve().then(() => {
                  throw error;
                }),
              {
                sourceId: source.sourceId,
                order: index
              }
            );
            throw error;
          }
          await this.observePostProcessing(
            workflow,
            "failure-staging-write",
            () => this.recordTaskAFailure(workflow, source.sourceId, error),
            { sourceId: source.sourceId, order: index }
          );
          failedSourcesForRecovery.push(source);
        }
      } catch (error) {
        // Loss of ownership prohibits every later write; ordinary item failure does not.
        await this.assertCompletionOwnership(workflow);
        unexpected ??= { error };
        await this.recordTaskAFailure(workflow, source.sourceId, {
          code: failureCode(error)
        });
        failedSourcesForRecovery.push(source);
      }
    }

    qaTrace("qa.task-a-postprocess", {
      scopeId: workflow.workflowId,
      stage: "terminal-decision",
      failedSources: failedSourcesForRecovery.length
    });
    if (workflow.physicalWorkPolicy) {
      const staged = await this.options.staging.read(workflow.courseId, workflow.workflowId);
      const failed =
        staged?.taskACoverage?.failedSources ??
        failedSourcesForRecovery.map((source) => ({
          sourceId: source.sourceId,
          errorCode: "AI_CONTRACT"
        }));
      const physical = (await this.options.store.readMetadataValue(
        `physical-work:${workflow.workflowId}:task-a-native`
      )) as { ledger?: PhysicalWorkLedger } | undefined;
      const requests = physical?.ledger?.requests ?? [];
      const coverage = semanticCoverage({
        observations: context.observations,
        succeededSourceIds: eligible
          .filter((s) => !failed.some((f) => f.sourceId === s.sourceId))
          .map((s) => s.sourceId),
        failedSources: failed,
        sources: eligible,
        mainWaves: new Set(requests.filter((r) => r.wave.startsWith("main:")).map((r) => r.wave))
          .size,
        recoveryWaves: new Set(
          requests.filter((r) => r.wave.startsWith("recovery:")).map((r) => r.wave)
        ).size,
        paidRecoveryInvocations: requests.filter(
          (r) => r.wave.startsWith("recovery:") && r.consumesApi === true
        ).length
      });
      workflow.taskASemanticCoverage = coverage;
      await this.options.store.saveWorkflow(
        { ...workflow, taskASemanticCoverage: coverage },
        workflow
      );
      if (staged) await this.options.staging.write({ ...staged, semanticCoverage: coverage });
      return;
    }
    if (unexpected) throw unexpected.error;
    if (failedSourcesForRecovery.length)
      throw new EngineError(
        "AI_CONTRACT",
        true,
        "Failed Source packages retained; user Retry required"
      );
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
  }

  private async runTaskASource(input: {
    workflow: WorkflowRecord;
    course: CourseRecord;
    context: MaterializeContext;
    source: SourceRecord;
    apiKey: string;
    keyPrefix: "task-a" | "task-a-recovery";
    index: CourseContentIndex;
    initialResult?: TaskAResult;
  }): Promise<TaskAResult & { visualCoverageComplete?: boolean; visualLocators?: string[] }> {
    const { workflow, course, apiKey, keyPrefix } = input;
    const originalSource = input.source;
    const index = input.index;
    const selection = teachingSourceView(originalSource, input.context.sourceRecords ?? [], index);
    if (!selection?.processing.parsed)
      throw new EngineError("AI_CONTRACT", false, "Source not routed to native read");
    const source = selection.processing;
    const parsed = source.parsed;
    if (!parsed) throw new EngineError("INTERNAL", false, "Source not parsed");
    const sourceKey = `${keyPrefix}:${workflow.workflowId}:${source.sourceId}`;
    const packageFingerprint = stableDigest(
      stableStringify({
        policy: DEFERRAL_POLICY,
        selection: selection.selectionFingerprint,
        native: {
          text: parsed.text,
          structure: parsed.structure,
          units: parsed.units,
          contentHash: parsed.contentHash,
          canonicalization: parsed.canonicalization
        },
        prompt: PROMPT_VERSIONS.a
      })
    );
    const checkpoint = await this.options.store.findTaskAPackage(
      workflow.workflowId,
      source.sourceId,
      packageFingerprint
    );
    if (checkpoint?.taskAPackage) {
      const result = validateTaskA(checkpoint.taskAPackage.result, new Set([source.sourceId]));
      if (!result.visualRequestRefs?.length)
        return { ...result, ...(checkpoint.taskAPackage.result as TaskAResult) };
    }
    const ownUnits = index.units.filter((u) => selection.selectedUnitRefs.includes(u[0]));
    const rendered = new Map<string, { locator: string; dataUrl: string }>();
    const releasePackage = runtimeSpan("package", workflow.workflowId, source.sourceId);
    let priorTaskAResult: unknown;
    let finalCall: AiCall | undefined;
    try {
      for (;;) {
        const allowed = new Set(
          ownUnits
            .filter(
              (u) =>
                source.kind === "attachment" &&
                this.options.machine.visualParts &&
                u[7].length &&
                !rendered.has(u[2])
            )
            .map((u) => u[0])
        );
        const calls = this.options.buildTaskACalls({
          ...(workflow.physicalWorkPolicy ? { measuredPhysicalPacking: true } : {}),
          source: {
            sourceId: source.sourceId,
            sourceType: source.kind,
            title: source.title,
            text: parsed.text,
            structure: parsed.structure,
            ...(parsed.units
              ? {
                  nativeUnits: parsed.units.map((u) => {
                    const ref = ownUnits.find((row) => row[2] === u.locator)?.[0];
                    if (!ref) throw new Error("ROUTING_UNIT_MISSING");
                    return { ...u, ref };
                  })
                }
              : {}),
            unresolvedVisualLocators: ownUnits
              .filter((u) => u[7].length && !rendered.has(u[2]))
              .map((u) => u[2]),
            pageImages: [...rendered.values()],
            ...(priorTaskAResult === undefined ? {} : { priorTaskAResult })
          },
          course: { courseCode: course.courseCode, courseName: course.courseName },
          chunks: workflow.physicalWorkPolicy
            ? [
                {
                  chunkId: stableDigest(parsed.text),
                  chunkIndex: 0,
                  chunkCount: 1,
                  text: parsed.text,
                  locator: source.title,
                  locators: parsed.structure,
                  start: 0,
                  end: parsed.text.length
                }
              ]
            : this.options.planChunks({
                sourceId: source.sourceId,
                locator: source.title,
                text: parsed.text,
                structure: parsed.structure
              })
        });
        const state = stableDigest(stableStringify([...rendered.keys()]));
        const values: unknown[] = [];
        for (const [i, call] of calls.entries()) {
          if (input.initialResult && priorTaskAResult === undefined && rendered.size === 0) {
            values.push(input.initialResult);
            continue;
          }
          const outcome = workflow.physicalWorkPolicy
            ? await (async () => {
                const l = await this.physicalUnits(
                  workflow,
                  course,
                  `${sourceKey}:${state}:${String(i)}`,
                  [{ id: source.sourceId, call }],
                  (_id, value) => {
                    const result = validateTaskA(value, new Set([source.sourceId]));
                    validateTaskAVisualRequests(result, allowed);
                    return result;
                  }
                );
                const u = l.units[0];
                if (u?.status !== "verified")
                  throw new DeepSeekFailure(
                    "AI_CONTRACT",
                    false,
                    u?.error ?? "TASK_A_VISUAL_UNRESOLVED"
                  );
                return { call, value: u.value };
              })()
            : await this.execute({
                call: { ...call, idempotencyKey: `${sourceKey}:${state}:${String(i)}` },
                apiKey,
                workflow,
                course,
                task: "task-a",
                context: {
                  knownSourceIds: new Set([source.sourceId]),
                  allowedVisualRequestRefs: allowed
                }
              });
          finalCall = outcome.call;
          values.push(outcome.value);
        }
        let value = values[0];
        if (values.length > 1) {
          const call = this.options.buildTaskAConsolidationCall({
            source: { sourceId: source.sourceId, sourceType: source.kind, title: source.title },
            chunkValues: values,
            course: { courseCode: course.courseCode, courseName: course.courseName }
          });
          const outcome = await this.execute({
            call: { ...call, idempotencyKey: `${sourceKey}:${state}:consolidate` },
            apiKey,
            workflow,
            course,
            task: "task-a-consolidate",
            context: {
              knownSourceIds: new Set([source.sourceId]),
              allowedVisualRequestRefs: allowed
            }
          });
          value = outcome.value;
          finalCall = outcome.call;
        }
        const result = validateTaskA(value, new Set([source.sourceId]));
        const requested = result.visualRequestRefs ?? [];
        validateTaskAVisualRequests(result, allowed);
        if (!requested.length) {
          const locators = [...rendered.keys()];
          const gaps = originalSource.parsed?.units?.filter((u) => u.partial) ?? [];
          const packageResult = {
            ...result,
            visualLocators: locators,
            visualCoverageComplete:
              gaps.length > 0 &&
              gaps.every((u) => rendered.has(u.locator)) &&
              result.sourceResult !== "PARTIALLY_UNDERSTOOD"
          };
          if (finalCall) {
            const run = await this.options.store.findAiRun(
              finalCall.idempotencyKey,
              finalCall.invocationFingerprint
            );
            if (run)
              await this.options.store.recordAiRun({
                ...run,
                taskAPackage: { fingerprint: packageFingerprint, result: packageResult }
              });
          }
          return packageResult;
        }
        if (!this.options.machine.visualParts)
          throw new EngineError("AI_CONTRACT", false, "Requested visual renderer unavailable");
        const requestedLocators = new Set(
          ownUnits.filter((u) => requested.includes(u[0])).map((u) => u[2])
        );
        const rendering = structuredClone(source);
        if (rendering.parsed?.units)
          rendering.parsed.units = rendering.parsed.units.map((u) => ({
            ...u,
            partial: requestedLocators.has(u.locator)
          }));
        const releaseRender = runtimeSpan("render", workflow.workflowId, source.sourceId);
        let visual: Awaited<ReturnType<NonNullable<MachinePort["visualParts"]>>>;
        try {
          await this.assertCompletionOwnership(workflow);
          visual = await this.options.machine.visualParts(rendering);
        } finally {
          releaseRender();
        }
        let progress = 0;
        for (const part of visual.parts) {
          if (!requestedLocators.has(part.locator))
            throw new EngineError("AI_CONTRACT", false, "Renderer returned unrequested locator");
          if (!rendered.has(part.locator)) {
            rendered.set(part.locator, part);
            progress++;
          }
        }
        qaTrace("qa.task-a-visual-evidence", {
          scopeId: workflow.workflowId,
          requested: requested.length,
          delivered: progress,
          unresolved: visual.unresolved.length
        });
        if (!progress) throw new EngineError("AI_CONTRACT", false, "TASK_A_VISUAL_NO_PROGRESS");
        priorTaskAResult = result;
      }
    } finally {
      releasePackage();
    }
  }

  private async recordUnderstanding(
    workflow: WorkflowRecord,
    context: MaterializeContext & { observations: SourceObservationRecord[] },
    source: SourceRecord,
    result: TaskAResult & { visualCoverageComplete?: boolean; visualLocators?: string[] }
  ): Promise<void> {
    const observation = context.observations.find(
      (item) => item.sourceId === source.sourceId && item.workflowId === workflow.workflowId
    );
    if (!observation) return;
    const contextSource = context.sourceRecords?.find((item) => item.sourceId === source.sourceId);
    if (contextSource?.parsed && result.visualLocators?.length)
      contextSource.parsed = {
        ...contextSource.parsed,
        visualEvidenceLocators: result.visualLocators
      };
    await this.writeState(workflow, {
      observations: [
        {
          ...observation,
          ...(result.visualCoverageComplete
            ? { parseStatus: "ok", comparability: "comparable" }
            : {}),
          understandingStatus:
            result.sourceResult === "PARTIALLY_UNDERSTOOD" ||
            (observation.parseStatus === "partial" && !result.visualCoverageComplete)
              ? "partial"
              : "complete",
          recordedAt: this.nowIso()
        }
      ],
      ...(source.parsed && source.machine?.contentHash
        ? {
            sources: [
              {
                ...source,
                parsed: {
                  ...source.parsed,
                  ...(result.visualLocators?.length
                    ? { visualEvidenceLocators: result.visualLocators }
                    : {}),
                  ...(result.visualCoverageComplete && source.parsed.contentHash
                    ? { visualCoverageHash: source.parsed.contentHash }
                    : {}),
                  understanding: {
                    contentHash: source.machine.contentHash,
                    status:
                      result.sourceResult === "PARTIALLY_UNDERSTOOD" ||
                      (observation.parseStatus === "partial" && !result.visualCoverageComplete)
                        ? "partial"
                        : "complete"
                  }
                }
              }
            ]
          }
        : {})
    });
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
    if (workflow.kind === "check") return;
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
    error: { code: string }
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
    if (workflow.directCoursePolicy) return this.directTaskB(workflow);
    if (workflow.architecturePolicy) return this.architectureTaskB(workflow);
    const course = await this.requireCourse(workflow);
    const apiKey = await this.requireApiKey();
    const context = await this.materializeContext(workflow, course);
    const classificationIndex = contentIndex(context.sourceRecords);
    const deferredIds = new Set(
      context.sourceRecords
        .filter(
          (source) =>
            reusableTeaching(source, context.sourceRecords, undefined, classificationIndex) &&
            !semanticallyProcess(source)
        )
        .map((source) => source.sourceId)
    );
    let semanticStaging = await this.options.staging.read(workflow.courseId, workflow.workflowId);
    if (workflow.kind !== "initial" && workflow.taskASemanticCoverage && semanticStaging)
      context.evidence = evidencePoolFromStaging(semanticStaging);
    let succeededSemanticIds: Set<string> | undefined;
    if (workflow.taskASemanticCoverage) {
      if (workflow.kind === "initial") {
        const unresolved = new Set(
          workflow.taskASemanticCoverage.unresolved.map((u) => u.sourceRef)
        );
        const completed = await Promise.all(
          context.sourceRecords.map(async (source) => ({
            source,
            run: await this.options.store.sourceUnderstanding(workflow.workflowId, source.sourceId)
          }))
        );
        succeededSemanticIds = new Set(
          completed
            .filter(
              ({ source, run }) =>
                run?.status === "succeeded" && !unresolved.has(`s:${stableDigest(source.sourceId)}`)
            )
            .map(({ source }) => source.sourceId)
        );
      } else
        succeededSemanticIds = new Set(semanticStaging?.taskACoverage?.succeededSourceIds ?? []);
    }
    context.evidence = context.evidence.filter(
      (entry) =>
        !deferredIds.has(entry.sourceId) &&
        (!succeededSemanticIds || succeededSemanticIds.has(entry.sourceId))
    );

    const snapshot = await this.readStateUnderReview(workflow);
    if (
      workflow.physicalWorkPolicy &&
      snapshot &&
      (!semanticStaging?.taskBRecovery ||
        (workflow.kind === "initial" &&
          semanticStaging.taskBRecovery.authorization === "normal-recovery" &&
          semanticStaging.taskBRecovery.state === "authorized"))
    ) {
      const base =
        semanticStaging ?? emptyStaging(workflow.courseId, workflow.workflowId, this.nowIso());
      semanticStaging = {
        ...base,
        ...(workflow.kind === "initial"
          ? {
              assessments: snapshot.assessments,
              constraints: snapshot.constraints,
              facts: snapshot.facts,
              evidence: await this.options.store.readEvidence(
                context.evidence.map((entry) => entry.evidenceId)
              ),
              reviewItems: snapshot.reviewItems,
              changes: snapshot.changes,
              ...(workflow.taskASemanticCoverage
                ? { semanticCoverage: workflow.taskASemanticCoverage }
                : {}),
              taskACoverage: {
                succeededSourceIds: [...(succeededSemanticIds ?? [])],
                relevantSourceIds: [...(succeededSemanticIds ?? [])],
                failedSources: context.sourceRecords
                  .filter((source) =>
                    workflow.taskASemanticCoverage?.unresolved.some(
                      (u) => u.sourceRef === `s:${stableDigest(source.sourceId)}`
                    )
                  )
                  .map((source) => ({ sourceId: source.sourceId, errorCode: "TASK_A_UNRESOLVED" }))
              }
            }
          : {}),
        taskBRecovery: semanticStaging?.taskBRecovery ?? {
          authorization: "normal",
          state: "authorized",
          at: this.nowIso()
        }
      };
      await this.options.staging.write(semanticStaging);
    }
    const drafts = (snapshot?.assessments ?? []).filter(
      (item) => item.createdBy === "ai" && !item.supersededBy
    );
    if (drafts.length === 0) return this.advance(workflow);

    const key = `task-b:${workflow.workflowId}`;
    const courseIndex = courseIndexFrom(snapshot);
    const knownObjectIds = new Set([
      ...(snapshot?.assessments ?? []).map((item) => item.assessmentId),
      ...(snapshot?.constraints ?? []).map((item) => item.constraintId),
      ...courseIndex.map((item) => item.objectId)
    ]);
    const semanticSources = context.sourceRecords.filter(
      (source) =>
        semanticallyProcess(source) &&
        (!succeededSemanticIds || succeededSemanticIds.has(source.sourceId))
    );
    const semanticSourceIds = new Set(semanticSources.map((source) => source.sourceId));
    const sharedWorkingContexts = [];
    for (const source of semanticSources) {
      const run = await this.options.store.sourceUnderstanding(
        workflow.workflowId,
        source.sourceId
      );
      if (!run?.payload) continue;
      const result = validateTaskA(run.payload, new Set([source.sourceId]));
      sharedWorkingContexts.push({
        sourceId: source.sourceId,
        title: source.title,
        contentHash: source.parsed?.contentHash,
        fileContext: result.fileContext,
        identityContext: result.identityContext,
        structuralRelationships: result.structuralRelationships,
        unresolvedIssues: result.unresolvedIssues,
        sourceResult: result.sourceResult
      });
    }
    const calls = this.options.buildTaskBCalls({
      sharedWorkingContexts,
      ...(semanticStaging?.taskBRecovery ? { groundedItems: true } : {}),
      ...(workflow.taskASemanticCoverage
        ? { unresolvedCoverage: workflow.taskASemanticCoverage }
        : {}),
      drafts: drafts.map((draft) => ({
        draftId: draft.assessmentId,
        name: draft.name,
        type: draft.kind,
        role: draft.role,
        aliases: draft.aliases,
        parentAssessmentId: draft.parentAssessmentId,
        fields: (snapshot?.facts ?? [])
          .filter((fact) => fact.assessmentId === draft.assessmentId)
          .map((fact) => ({
            field: fact.field,
            value: fact.value,
            evidenceRefs: fact.evidenceRefs
          })),
        sources: context.evidence
          .filter((entry) => entry.objectId === draft.assessmentId)
          .map((entry) => ({
            sourceId: entry.sourceId,
            locator: entry.locator,
            refId: entry.evidenceId
          }))
      })),
      constraintCandidates: (snapshot?.constraints ?? []).map((constraint) => ({
        constraintId: constraint.constraintId,
        content: constraint.content
      })),
      courseIndex,
      evidence: context.evidence,
      availableEvidenceRefs: evidenceCatalog(semanticSources)
    });
    if (semanticStaging?.taskBRecovery) {
      return this.unitGroundedTaskB(
        workflow,
        course,
        context,
        calls[0],
        semanticSources,
        knownObjectIds,
        drafts
      );
    }
    let values: TaskBResult | null = null;
    let expansionRounds = 0;
    const evidenceProgress = new EvidenceProgress(context.evidence);
    for (const call of calls) {
      const outcome = await this.execute({
        call: { ...call, idempotencyKey: `${key}:0` },
        apiKey,
        workflow,
        course,
        task: "task-b",
        context: {
          knownSourceIds: semanticSourceIds,
          knownObjectIds,
          evidence: context.evidence
        }
      });
      let validation = validateTaskB(outcome.value, semanticSourceIds);
      let session = call;
      let previous = outcome.value;
      const suppliedEvidence = [...context.evidence];
      while ((validation.requestedEvidenceRefs?.length ?? 0) > 0) {
        const replies = retrieveEvidence(
          validation.requestedEvidenceRefs ?? [],
          semanticSources,
          suppliedEvidence
        );
        const delivered = replies.filter((reply) => evidenceProgress.accept(reply));
        if (!delivered.length)
          throw new DeepSeekFailure(
            "AI_CONTRACT",
            false,
            "EVIDENCE_NO_PROGRESS: requested evidence is unavailable or already delivered"
          );
        for (const reply of delivered)
          if (reply.evidence) {
            suppliedEvidence.push(reply.evidence);
          }
        session = continueTaskB(session, previous, replies, expansionRounds + 1);
        const expanded = await this.execute({
          call: { ...session, idempotencyKey: `${key}:expand:${String(expansionRounds)}` },
          apiKey,
          workflow,
          course,
          task: "task-b-expand",
          context: {
            knownSourceIds: semanticSourceIds,
            knownObjectIds,
            evidence: suppliedEvidence
          }
        });
        expansionRounds += 1;
        previous = expanded.value;
        validation = validateTaskB(previous, semanticSourceIds);
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

  private async unitGroundedTaskB(
    workflow: WorkflowRecord,
    course: CourseRecord,
    context: RunContext,
    original: AiCall | undefined,
    sources: SourceRecord[],
    knownObjects: Set<string>,
    drafts: AssessmentRecord[]
  ): Promise<StepResult> {
    let staged = await this.options.staging.read(course.courseId, workflow.workflowId);
    if (!staged || !original) throw new EngineError("B_RECOVERY_CONTEXT_ABSENT", false);
    const knownSources = new Set(sources.map((s) => s.sourceId));
    const originalContext = JSON.parse(original.user) as Record<string, unknown>;
    const recoveryBase = { ...original };
    delete recoveryBase.invocationFingerprint;
    const absent = staged.taskACoverage?.failedSources ?? [];
    const constraintRefs = Array.isArray(originalContext.constraintCandidates)
      ? originalContext.constraintCandidates
          .filter(isRecord)
          .map((c) => c.constraintId)
          .filter((id): id is string => typeof id === "string")
      : [];
    const logicalRefs = [
      ...new Set([
        ...knownSources,
        ...drafts.map((d) => d.assessmentId),
        ...absent.map((s) => s.sourceId),
        ...constraintRefs
      ])
    ];
    const durable = await this.options.store.readMetadataValue(
      `task-b-ledger:${workflow.workflowId}`
    );
    const durableLedger =
      isRecord(durable) &&
      durable.kind === "task-b-logical-ledger" &&
      (staged.taskBRecovery?.authorization === "normal" ||
        !staged.taskBRecovery ||
        (durable.ledger as BLogicalLedger).attemptId.endsWith(
          `:${staged.taskBRecovery.authorization}`
        ))
        ? (durable.ledger as BLogicalLedger)
        : undefined;
    let ledger: BLogicalLedger =
      durableLedger ??
      staged.taskBLogicalLedger ??
      newBLedger(
        `task-b:${workflow.workflowId}:${staged.taskBRecovery?.authorization ?? "P2E-021"}`,
        logicalRefs,
        original.user,
        context.evidence,
        this.nowIso()
      );
    if (!durableLedger && !staged.taskBLogicalLedger) {
      ledger.taskABaseline = {
        assessments: staged.assessments,
        constraints: staged.constraints,
        facts: staged.facts,
        evidence: staged.evidence,
        reviewItems: staged.reviewItems,
        changes: staged.changes
      };
      ledger.sourceRefs = [...knownSources];
      ledger.unresolved = absent.map((s) => ({
        ref: s.sourceId,
        reason: `Task A Unresolved: ${s.errorCode}`
      }));
      ledger.pendingRefs = ledger.pendingRefs.filter((r) => !absent.some((s) => s.sourceId === r));
    }
    const progress = new EvidenceProgress(ledger.suppliedEvidence);
    let checkpoint = staged.taskBCheckpoint;
    const persist = async () => {
      assertBLedgerAccounting(ledger);
      await this.assertCompletionOwnership(workflow);
      const current = await this.options.staging.read(course.courseId, workflow.workflowId);
      if (!current) throw new EngineError("B_CHECKPOINT_STORAGE_LOST", false);
      await this.options.store.writeTaskBLogicalLedger(workflow, ledger);
      staged = {
        ...current,
        ...(staged?.taskBRecovery ? { taskBRecovery: staged.taskBRecovery } : {}),
        taskBLogicalLedger: bLedgerProjection(ledger),
        taskBCheckpoint: ledger.final
      };
      await this.options.staging.write(staged);
      checkpoint = ledger.final;
    };
    if (
      !durableLedger &&
      !staged.taskBLogicalLedger &&
      staged.taskBRecovery?.state !== "authorized"
    )
      throw new EngineError("B_PAID_UNVERIFIED_NO_REDISPATCH", false);
    await persist();
    try {
      while (ledger.status === "active") {
        let physical = ledger.physical.at(-1);
        const unfinished =
          physical?.state === "prepared" ||
          physical?.state === "dispatched" ||
          physical?.state === "completed";
        if (!unfinished) {
          const part = ledger.parts.find((p) => !p.delivered);
          const pendingSources = new Set(ledger.pendingRefs);
          const pendingDrafts = Array.isArray(originalContext.drafts)
            ? originalContext.drafts.filter(
                (d) =>
                  isRecord(d) &&
                  typeof d.draftId === "string" &&
                  ledger.pendingRefs.includes(d.draftId)
              )
            : [];
          for (const d of pendingDrafts)
            if (isRecord(d) && typeof d.sourceId === "string") pendingSources.add(d.sourceId);
          const user = JSON.stringify({
            logicalAttemptId: ledger.attemptId,
            completeInputRegistry: ledger.requiredRefs,
            pendingRefs: ledger.pendingRefs,
            closedRefs: ledger.processedRefs,
            unresolved: ledger.unresolved,
            retiredItems: ledger.retiredItems,
            unresolvedCandidateIds: ledger.unresolvedCandidateIds,
            inputPart: part ? { id: part.id, text: part.text } : null,
            pendingWorkingData:
              !part && !ledger.reconciliationPartitioned
                ? {
                    drafts: pendingDrafts,
                    sharedWorkingContexts: Array.isArray(originalContext.sharedWorkingContexts)
                      ? originalContext.sharedWorkingContexts.filter(
                          (c) =>
                            isRecord(c) &&
                            typeof c.sourceId === "string" &&
                            pendingSources.has(c.sourceId)
                        )
                      : [],
                    constraintCandidates: originalContext.constraintCandidates
                  }
                : null,
            availableEvidenceRefs: originalContext.availableEvidenceRefs,
            allInputDeliveredAfterThisPart:
              !part || ledger.parts.filter((p) => !p.delivered).length === 1,
            provisionalCandidates: ledger.reconciliationPartitioned ? [] : ledger.candidates,
            candidateIndex: ledger.reconciliationPartitioned
              ? ledger.candidates.map((i) =>
                  isRecord(i)
                    ? {
                        itemId: i.itemId,
                        inputRefs: i.inputRefs,
                        dependencies: i.dependencies,
                        category: i.category,
                        identity: isRecord(i.payload)
                          ? {
                              proposalId: i.payload.proposalId,
                              canonicalName: i.payload.canonicalName,
                              type: i.payload.type,
                              role: i.payload.role,
                              involvedObjectIds: i.payload.involvedObjectIds,
                              relationship: i.payload.relationship
                            }
                          : null
                      }
                    : i
                )
              : [],
            finalItemIds: ledger.final.items
              .filter((i) => i.status === "verified")
              .map((i) => i.itemId),
            suppliedEvidenceRegistry: [...evidenceRegistry(ledger.suppliedEvidence)].map(
              ([ref, e]) => ({ ref, ...e })
            ),
            instruction: `Read this exact technical input fragment (may split an encoded JSON payload). Preserve all supported cross-source observations as provisional items. Never finalize partition-local identity. Continue only pending work; never regenerate closed work. Return schema ${GROUNDED_B_SCHEMA} and items. On reconciliation include closure:{scopeRefs:the completeInputRegistry,dispositions:[{ref,status:resolved|unresolved,itemIds:[stable item IDs],reason:explicit semantic judgment}]}. Every resolved draft/constraint ref needs a contract-valid item referencing that ref. A Source requiring no additional B output can explicitly return resolved/noOutputNeeded:true/itemIds:[]/reason; never use this for drafts/constraints or infer absence/removal. All refs must eventually be resolved or explicit unresolved. Include all final item IDs in dispositions. Explicitly retire superseded provisional candidates with closure.discardedCandidates:[{itemId,reason}]; never retire already final items. Unselected/undiscarded candidates remain Partial. Only assert closure after all input delivered and all cross-source dependencies considered; unknown dependencies stay unresolved. Use compact registry aliases only. Complete candidate items first; do not repeat excerpts. New native Evidence is requested through requestedEvidenceRefs.`
          });
          physical = {
            id: `${ledger.attemptId}:physical:${String(ledger.physical.length)}`,
            request: user,
            state: "prepared",
            owner: workflow.lease?.token ?? "",
            session: this.sessionId,
            at: this.nowIso()
          };
          ledger = { ...ledger, physical: [...ledger.physical, physical] };
          await persist();
        }
        if (!physical) throw new Error("B_PHYSICAL_LEDGER_ABSENT");
        const call: AiCall = {
          ...recoveryBase,
          user: physical.request,
          schemaVersion: GROUNDED_B_SCHEMA,
          providerRequestCompatibility: "provider-default",
          taskBPhysicalContinuation: true,
          promptVersion: "task-b/5",
          idempotencyKey: physical.id
        };
        const fingerprint = invocationFingerprint({
          task: call.task,
          promptVersion: call.promptVersion,
          schemaVersion: call.schemaVersion,
          system: call.system,
          user: call.user,
          maxTokens: call.maxTokens,
          providerRequestCompatibility: "provider-default",
          taskBPhysicalContinuation: true
        });
        let response: unknown = physical.response;
        if (physical.state === "dispatched") {
          const saved = await this.options.store.findAiRun(
            physical.id,
            fingerprint,
            workflow.workflowId
          );
          if (saved?.status !== "succeeded") {
            physical.state = "paid-unverified";
            ledger = stopBLedger(ledger, "B_PAID_UNVERIFIED_NO_REDISPATCH", this.nowIso());
            await persist();
            break;
          }
          response = saved.payload;
        } else if (physical.state === "prepared") {
          physical.state = "dispatched";
          staged.taskBRecovery = {
            authorization: staged.taskBRecovery?.authorization ?? "P2E-021",
            state: "dispatched",
            at: this.nowIso()
          };
          await persist();
          try {
            const outcome = await this.execute({
              call,
              apiKey: await this.requireApiKey(),
              workflow,
              course,
              task: "task-b",
              context: {
                knownSourceIds: knownSources,
                knownObjectIds: knownObjects,
                evidence: ledger.suppliedEvidence
              }
            });
            response = outcome.value;
          } catch (error) {
            if (
              error instanceof AiUnitFailure &&
              error.failure.preGenerationBoundary === true &&
              !error.failure.consumesApi
            ) {
              physical.state = "pre-generation-rejected";
              physical.paidDisposition = "refused";
              physical.consumesApi = false;
              physical.error = error.message;
              ledger = splitBPart(ledger);
              await persist();
              continue;
            }
            const knownFailure =
              error instanceof AiUnitFailure &&
              (error.failure.errorCode === "AI_CONTRACT" || error.failure.errorCode === "AI_AUTH");
            physical.state = knownFailure ? "failed" : "paid-unverified";
            physical.paidDisposition = knownFailure
              ? error instanceof AiUnitFailure && !error.failure.consumesApi
                ? "refused"
                : "known-response"
              : "ambiguous";
            if (error instanceof AiUnitFailure) physical.consumesApi = error.failure.consumesApi;
            physical.error = error instanceof Error ? error.message : "B_UNKNOWN_DISPATCH";
            throw error;
          }
        }
        physical.response = response;
        physical.state = "completed";
        physical.paidDisposition = "known-response";
        physical.consumesApi = true;
        await persist(); // Raw physical prefix/complete output is durable BEFORE item validation.
        ledger = captureBResponseCandidates(ledger, response, knownSources, this.nowIso());
        await persist();
        ledger = applyBResponse(ledger, response, knownSources, this.nowIso());
        // Complete prefix candidates are provisional until the course-wide model closure validates.
        await persist();
        const requests = ledger.requestedEvidenceRefs;
        if (requests.length) {
          const parsed = validateTaskB(
            { ...ledger.final.result, requestedEvidenceRefs: requests },
            knownSources
          );
          const replies = retrieveEvidence(
            parsed.requestedEvidenceRefs ?? [],
            sources,
            ledger.suppliedEvidence
          );
          if (replies.some((r) => r.status !== "available"))
            throw new Error("B_EXPANSION_INVALID_REF");
          const delivered = replies.filter((r) => progress.accept(r));
          if (!delivered.length) throw new Error("B_EXPANSION_NO_PROGRESS");
          for (const reply of delivered)
            if (reply.evidence) ledger.suppliedEvidence.push(reply.evidence);
          ledger.requestedEvidenceRefs = [];
          await persist();
        }
        physical.state = "applied";
        await persist();
      }
    } catch (error) {
      await this.assertCompletionOwnership(workflow);
      const completedPhysical = ledger.physical.at(-1);
      if (completedPhysical?.state === "completed" && completedPhysical.response !== undefined) {
        try {
          ledger = applyBResponse(ledger, completedPhysical.response, knownSources, this.nowIso());
          completedPhysical.state = "applied";
        } catch {
          /* Original failure and exact raw output remain diagnostic; no semantic repair. */
        }
      }
      ledger = stopBLedger(
        ledger,
        error instanceof Error ? error.message : "B_UNEXPECTED",
        this.nowIso()
      );
      await persist();
      staged.taskBRecovery = {
        authorization: staged.taskBRecovery?.authorization ?? "P2E-021",
        state: "settled",
        at: this.nowIso(),
        ...(ledger.stopReason ? { error: ledger.stopReason } : {})
      };
      await this.options.staging.write(staged);
    }
    await this.assertCompletionOwnership(workflow);
    // Absence of verified canonical items is an explicitly provisional degraded Preview.
    if (
      checkpoint &&
      (checkpoint.result.canonicalAssessmentProposals.length ||
        checkpoint.result.courseWideConstraintProposals.length)
    ) {
      const materialized =
        ledger.materialized ??
        materializeTaskB(
          checkpoint.result,
          { ...context, now: checkpoint.recordedAt },
          new Map(),
          new Set(drafts.map((d) => d.assessmentId))
        );
      if (!ledger.materialized) {
        ledger.materialized = materialized;
        await persist(); // Exact post-processing result survives restart before any staging/view write.
      }
      const target = await this.options.staging.read(course.courseId, workflow.workflowId);
      if (!target) throw new EngineError("B_CHECKPOINT_STORAGE_LOST", false);
      await this.assertCompletionOwnership(workflow);
      await this.options.staging.write({
        ...target,
        assessments: materialized.assessments,
        constraints: materialized.constraints,
        facts: materialized.bundle.facts ?? [],
        evidence: materialized.bundle.evidence ?? [],
        reviewItems: materialized.bundle.reviewItems ?? [],
        changes: materialized.bundle.changes ?? []
      });
    }
    if (workflow.kind === "initial" && ledger.materialized) {
      const m = ledger.materialized;
      await this.options.store.replaceInitialProvisional(workflow, ledger.taskABaseline ?? {}, {
        ...m.bundle,
        assessments: m.assessments,
        constraints: m.constraints,
        reviewItems: m.assessments.map((a) => ({
          reviewItemId: `initial_${a.assessmentId}`,
          courseId: course.courseId,
          workflowId: workflow.workflowId,
          kind: "initial" as const,
          targetId: a.assessmentId,
          payload: { assessmentId: a.assessmentId },
          createdAt: this.nowIso(),
          updatedAt: this.nowIso()
        }))
      });
    }
    const latest = await this.options.staging.read(course.courseId, workflow.workflowId);
    if (!latest) throw new EngineError("B_CHECKPOINT_STORAGE_LOST", false);
    await this.options.staging.write({
      ...latest,
      ...(checkpoint ? { taskBCheckpoint: checkpoint, taskBResult: checkpoint.result } : {}),
      taskBRecovery: {
        ...staged.taskBRecovery,
        authorization: staged.taskBRecovery?.authorization ?? "P2E-021",
        state: "settled",
        at: this.nowIso()
      }
    });
    return this.advance(workflow);
  }

  private async unitTaskC(workflow: WorkflowRecord): Promise<StepResult> {
    const course = await this.requireCourse(workflow);
    const context = await this.materializeContext(workflow, course);

    const snapshot = await this.readStateUnderReview(workflow);
    if (!snapshot) return this.advance(workflow);
    const trusted = await this.options.store.readTrustedSnapshot(workflow.courseId);
    if (!trusted) return this.advance(workflow);
    const staged = await this.options.staging.read(workflow.courseId, workflow.workflowId);
    if (!staged) return this.advance(workflow);
    if (workflow.directCoursePolicy) {
      if (!staged.directIncremental)
        throw new EngineError("AI_CONTRACT", false, "DIRECT_INCREMENTAL_MISSING");
      const directIncremental = staged.directIncremental;
      const coverage = coverageFromObservations(
        context.observations.filter((o) => o.workflowId === workflow.workflowId),
        context.sourceRecords.map((s) => s.sourceId)
      );
      if (staged.taskACoverage?.failedSources.length) coverage.partialCoverage = true;
      const targets = new Map([
        ...trusted.assessments.map((a) => [a.assessmentId, a.assessmentId] as const),
        ...trusted.constraints.map((c) => [c.constraintId, c.constraintId] as const),
        ...staged.assessments.map((a) => [a.assessmentId, a.assessmentId] as const),
        ...staged.constraints.map((c) => [c.constraintId, c.constraintId] as const)
      ]);
      const removalProof =
        isSelectiveCoursePolicy(workflow.directCoursePolicy) &&
        staged.directIncremental.changeResults
          .filter((c) => c.changeType === "POSSIBLY_REMOVED")
          .every((c) => c.relevantCoverageFacts?.selectiveRemovalProof === true);
      const m = materializeTaskC(
        staged.directIncremental,
        context,
        targets,
        removalProof ? { ...coverage, partialCoverage: false, failedSourceIds: [] } : coverage
      );
      const merged = mergePendingChanges(snapshot.changes, m.changes, context.now);
      // NEW confirms one object with all its independent facts. Keep audit changes, show one card.
      const visibleChanges = merged.changes.filter(
        (c, index, all) =>
          c.changeType !== "NEW" ||
          all.findIndex((x) => x.changeType === "NEW" && x.targetId === c.targetId) === index
      );
      const reviewItems: ReviewItemRecord[] = visibleChanges.map((c, index) => ({
        reviewItemId: c.changeId,
        courseId: course.courseId,
        workflowId: workflow.workflowId,
        kind: c.changeType === "IDENTITY_UNCERTAIN" ? "identity" : "change",
        changeType: c.changeType,
        targetId: c.targetId,
        payload: {
          changeId: c.changeId,
          unresolvedQuestions: [
            ...new Set([
              ...(c.judgmentBasis ? [c.judgmentBasis] : []),
              ...(isSelectiveCoursePolicy(workflow.directCoursePolicy) && index > 0
                ? []
                : directIncremental.unresolvedIssues.flatMap((i) =>
                    isRecord(i) && typeof i.description === "string" ? [i.description] : []
                  )),
              ...(isSelectiveCoursePolicy(workflow.directCoursePolicy) &&
              index === 0 &&
              Array.isArray(staged.reviewItems[0]?.payload.unresolvedQuestions)
                ? staged.reviewItems[0].payload.unresolvedQuestions.filter(
                    (q): q is string => typeof q === "string"
                  )
                : [])
            ])
          ],
          ...(isSelectiveCoursePolicy(workflow.directCoursePolicy) && index === 0
            ? {
                evidence: staged.reviewItems.flatMap((i) =>
                  Array.isArray(i.payload.evidence) ? (i.payload.evidence as unknown[]) : []
                ),
                issueEvidenceIds: staged.reviewItems.flatMap((i) =>
                  Array.isArray(i.payload.issueEvidenceIds)
                    ? (i.payload.issueEvidenceIds as unknown[])
                    : []
                )
              }
            : {}),
          ...(c.changeType === "NEW"
            ? {
                assessment: staged.assessments.find((a) => a.assessmentId === c.targetId),
                constraint: staged.constraints.find((r) => r.constraintId === c.targetId),
                facts: staged.facts.filter(
                  (f) => f.assessmentId === c.targetId || f.constraintId === c.targetId
                ),
                evidence: staged.evidence
              }
            : {})
        },
        createdAt: context.now,
        updatedAt: context.now
      }));
      await this.writeState(workflow, {
        ...(m.bundle.evidence ? { evidence: m.bundle.evidence } : {}),
        changes: merged.changes,
        reviewItems
      });
      return this.advance(workflow);
    }
    const apiKey = await this.requireApiKey();
    const classificationIndex = contentIndex(context.sourceRecords);
    const deferredIds = new Set(
      (workflow.architecturePolicy ? [] : context.sourceRecords)
        .filter(
          (source) =>
            reusableTeaching(source, context.sourceRecords, undefined, classificationIndex) &&
            !semanticallyProcess(source)
        )
        .map((source) => source.sourceId)
    );
    context.evidence = context.evidence.filter((entry) => !deferredIds.has(entry.sourceId));
    const [decisions, history] = await Promise.all([
      this.options.store.readDecisions(workflow.courseId),
      this.options.store.readHistory(workflow.courseId)
    ]);
    const coverage = coverageFromObservations(
      context.observations.filter((item) => item.workflowId === workflow.workflowId),
      context.sourceRecords.map((source) => source.sourceId)
    );
    if (
      workflow.architecturePolicy &&
      ((staged.taskACoverage?.failedSources.length ?? 0) > 0 ||
        (staged.taskBResult?.unresolvedIssues.length ?? 0) > 0)
    ) {
      coverage.partialCoverage = true;
      coverage.failedSourceIds = [
        ...new Set([
          ...coverage.failedSourceIds,
          ...(staged.taskACoverage?.failedSources.map((s) => s.sourceId) ?? [])
        ])
      ];
    }
    const courseIndex = courseIndexFrom(snapshot);
    if (workflow.architecturePolicy) {
      const known = new Set(courseIndex.map((e) => e.objectId));
      for (const target of courseIndexFrom(trusted))
        if (!known.has(target.objectId)) courseIndex.push(target);
    }
    const targetMap = new Map(courseIndex.map((entry) => [entry.objectId, entry.objectId]));
    const stagedEvidenceIds = new Set(staged.evidence.map((item) => item.evidenceId));

    const registryMetadata = workflow.architecturePolicy
      ? ((await this.options.store.readMetadataValue(
          `architecture-registry:${workflow.workflowId}`
        )) as { ledger?: Registry } | undefined)
      : undefined;
    const unresolvedTargets = new Set<string>();
    for (const entry of courseIndex) {
      const key = `task-c:${workflow.workflowId}:${entry.objectId}`;
      const calls = this.options.buildTaskCCalls({
        target: entry,
        currentFacts: trusted.facts
          .filter(
            (fact) => fact.assessmentId === entry.objectId || fact.constraintId === entry.objectId
          )
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
            trusted.assessments.find((item) => item.assessmentId === entry.objectId)?.marks ??
            trusted.constraints.find((r) => r.constraintId === entry.objectId)?.marks ??
            [],
          decisions: decisions.filter((decision) => decision.targetId === entry.objectId)
        },
        coverageFacts: coverage,
        history: history.filter((item) => item.targetId === entry.objectId)
      });
      const objectSide = (side: typeof trusted | typeof staged) => ({
        assessment: side.assessments.find((a) => a.assessmentId === entry.objectId) ?? null,
        rule: side.constraints.find((r) => r.constraintId === entry.objectId) ?? null,
        facts: side.facts.filter(
          (f) => f.assessmentId === entry.objectId || f.constraintId === entry.objectId
        ),
        evidence: context.evidence.filter(
          (e) =>
            e.objectId === entry.objectId &&
            (side === staged
              ? stagedEvidenceIds.has(e.evidenceId)
              : !stagedEvidenceIds.has(e.evidenceId))
        )
      });
      const currentSide = objectSide(trusted),
        latestSide = objectSide(staged);
      for (const call of calls) {
        const outcome = workflow.architecturePolicy
          ? {
              call,
              value: await this.architectureSession(
                workflow,
                context,
                "C",
                entry.objectId,
                {
                  target: entry,
                  comparison: JSON.parse(call.user) as unknown,
                  current: currentSide,
                  latest: latestSide,
                  ...(workflow.semanticPolicy === "assessment-relevance/3" ||
                  workflow.semanticPolicy === "assessment-relevance/4"
                    ? {
                        semanticCoverage: (staged.taskBResult?.semanticCoverage ?? []).filter(
                          (r) => isRecord(r) && r.targetObjectId === entry.objectId
                        )
                      }
                    : {}),
                  coverage,
                  identity: (staged.taskBResult?.identityResolutions ?? []).filter((r) =>
                    r.involvedObjectIds.includes(entry.objectId)
                  ),
                  registryDisposition:
                    registryMetadata?.ledger?.records.filter(
                      (r) => r.kind === "identity" && r.payload.trustedObjectId === entry.objectId
                    ) ?? []
                },
                {
                  sources: context.sourceRecords,
                  evidence: context.evidence,
                  objects: { current: currentSide, latest: latestSide, target: entry }
                },
                (value) => {
                  assertNoProductInstructions(value);
                  assertSuppliedEvidence(value, context.evidence);
                  const result = validateTaskC(
                    value,
                    evidenceSourceIds(context),
                    coverageSatisfied(coverage)
                  );
                  if (
                    result.changeResults.length !== 1 ||
                    result.changeResults.some((c) => c.targetObjectId !== entry.objectId)
                  )
                    throw Error("AI_CONTRACT:unknown_object_id");
                }
              )
            }
          : workflow.physicalWorkPolicy
            ? await (async () => {
                const ledger = await this.physicalUnits(
                  workflow,
                  course,
                  key,
                  [{ id: entry.objectId, call }],
                  (_id, value) => {
                    assertNoProductInstructions(value);
                    assertSuppliedEvidence(value, context.evidence);
                    const result = validateTaskC(
                      value,
                      evidenceSourceIds(context),
                      coverageSatisfied(coverage)
                    );
                    if (result.changeResults.some((c) => c.targetObjectId !== entry.objectId))
                      throw Error("AI_CONTRACT:unknown_object_id");
                    return result;
                  }
                );
                const unit = ledger.units[0];
                return unit?.status === "verified"
                  ? { call, value: unit.value }
                  : { call, value: null, paidUnverified: unit?.status === "paid-unverified" };
              })()
            : await this.execute({
                call: { ...call, idempotencyKey: key },
                apiKey,
                workflow,
                course,
                task: "task-c",
                context: {
                  knownSourceIds: evidenceSourceIds(context),
                  coverage,
                  evidence: context.evidence
                }
              });
        if (outcome.value === null) {
          if ("paidUnverified" in outcome && outcome.paidUnverified)
            throw new EngineError(
              "NETWORK_TRANSIENT",
              false,
              "TASK_C_PAID_UNVERIFIED_ADMISSION_STOP"
            );
          unresolvedTargets.add(entry.objectId);
          continue;
        }
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
    if (unresolvedTargets.size)
      throw new EngineError("AI_CONTRACT", false, "TASK_C_UNRESOLVED_CHECKPOINTS_RETAINED");
    if (workflow.architecturePolicy)
      await this.options.store.writePhysicalWorkLedger(
        workflow,
        `architecture-course-checkpoint:${course.courseId}`,
        {
          policy: ARCHITECTURE_POLICY,
          workflowId: workflow.workflowId,
          complete: coverageSatisfied(coverage)
        }
      );
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
        maxTokens: input.call.maxTokens,
        ...(input.call.reasoningEffort ? { reasoningEffort: input.call.reasoningEffort } : {}),
        ...(input.call.taskBPhysicalContinuation ? { taskBPhysicalContinuation: true } : {}),
        ...(input.call.physicalWorkContinuation ? { physicalWorkContinuation: true } : {}),
        ...(input.call.providerRequestCompatibility
          ? { providerRequestCompatibility: input.call.providerRequestCompatibility }
          : {})
      });
    const call = {
      ...input.call,
      ...(this.phaseControllers.get(this.phaseKey(input.workflow))
        ? {
            signal: this.phaseControllers.get(this.phaseKey(input.workflow))?.signal as AbortSignal
          }
        : {}),
      invocationFingerprint: fingerprint,
      ...(input.task === "exhaustive-routing" || input.task === "teaching-classification"
        ? {}
        : {
            activityScope: {
              courseId: input.course.courseId,
              workflowId: input.workflow.workflowId,
              ...(input.task.startsWith("task-a") && input.context.knownSourceIds.size === 1
                ? { packageUnitId: stableDigest([...input.context.knownSourceIds][0] ?? "") }
                : {}),
              task: input.task.startsWith("task-a")
                ? "A"
                : input.task.startsWith("task-b")
                  ? "B"
                  : "C"
            }
          })
    };
    const existing = await this.options.store.findAiRun(
      call.idempotencyKey,
      fingerprint,
      input.workflow.qaSemanticClean ? input.workflow.workflowId : undefined
    );
    if (input.workflow.qaSemanticClean)
      qaTrace("qa.semantic-clean-lookup", {
        workflowId: input.workflow.workflowId,
        task: input.task,
        policy: "same-workflow-only",
        acceptedHistoricalHits: 0,
        sameWorkflowHit: existing?.status === "succeeded",
        requestBytes: new TextEncoder().encode(call.user).byteLength,
        logicalUnitId: call.idempotencyKey
      });
    let reusable = existing?.status === "succeeded";
    if (
      reusable &&
      !input.call.physicalWorkContinuation &&
      input.call.schemaVersion !== AI_SCHEMAS.session &&
      (input.task.startsWith("task-a") ||
        input.task === "exhaustive-routing" ||
        input.task === "teaching-classification")
    ) {
      try {
        if (input.task === "teaching-classification")
          validateTeachingResult(existing?.payload, JSON.parse(call.user) as TeachingInput);
        else if (input.task === "exhaustive-routing")
          validateExhaustiveRouting(existing?.payload, JSON.parse(call.user) as RoutingInput);
        else validateTaskA(existing?.payload, input.context.knownSourceIds);
      } catch {
        reusable = false;
        qaTrace("qa.ai-cache", {
          task: input.task,
          cache: "invalid-contract",
          logicalUnitId: call.idempotencyKey
        });
      }
    }
    if (reusable && existing) {
      qaTrace("qa.ai-cache", {
        task: input.task,
        logicalUnitId: call.idempotencyKey,
        cache: "hit",
        invocationFingerprint: fingerprint
      });
      return {
        call,
        value: existing.payload,
        consumesApi: false
      };
    }
    await this.assertCompletionOwnership(input.workflow);
    const releaseAi =
      input.task === "task-a-consolidate"
        ? runtimeSpan("consolidation", input.workflow.workflowId, call.idempotencyKey)
        : () => undefined;
    let outcome: AiCallOutcome;
    const providerStarted = performance.now();
    try {
      outcome = await this.options.ai.execute(
        call,
        input.apiKey || (await this.requireApiKey()),
        input.context
      );
      if (input.call.physicalWorkContinuation) {
        /* per-unit checks belong to durable physical ledger */
      } else if (input.task === "teaching-classification")
        validateTeachingResult(outcome.value, JSON.parse(call.user) as TeachingInput);
      else if (input.task === "exhaustive-routing")
        validateExhaustiveRouting(outcome.value, JSON.parse(call.user) as RoutingInput);
    } catch (error) {
      if (input.task === "exhaustive-routing" || input.task === "teaching-classification") {
        await this.assertCompletionOwnership(input.workflow);
        await this.options.store.recordAiRun({
          aiRunId: randomId("airun"),
          workflowId: input.workflow.workflowId,
          courseId: input.course.courseId,
          task: input.task,
          schemaVersion: call.schemaVersion,
          promptVersion: call.promptVersion,
          idempotencyKey: call.idempotencyKey,
          invocationFingerprint: fingerprint,
          status: "failed",
          errorCode: error instanceof DeepSeekFailure ? error.code : "AI_CONTRACT",
          attempt: input.workflow.attempt + 1,
          durationMs: performance.now() - providerStarted,
          recordedAt: this.nowIso()
        });
      }
      if (
        input.task === "teaching-classification" &&
        error instanceof Error &&
        error.message.startsWith("DEFERRAL_CONTRACT")
      )
        throw new EngineError("AI_CONTRACT", false, error.message);
      throw error;
    } finally {
      releaseAi();
    }
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
      ...(input.call.physicalWorkContinuation || input.call.schemaVersion === AI_SCHEMAS.session
        ? { invocationRole: "physical" as const }
        : {}),
      ...(outcome.compatibilityRepair ? { compatibilityRepair: outcome.compatibilityRepair } : {}),
      durationMs: performance.now() - providerStarted,
      ...(input.task.startsWith("task-a") && input.context.knownSourceIds.size === 1
        ? { sourceId: [...input.context.knownSourceIds][0] as string }
        : {}),
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

  private async reachReview(
    workflow: WorkflowRecord,
    owner: WorkflowRecord = workflow
  ): Promise<WorkflowRecord> {
    // The lease is released here because the run now waits on the user.
    const { lease: _lease, ...carried } = workflow;
    const record: WorkflowRecord = {
      ...carried,
      state: "waiting",
      waitingReason: "review",
      updatedAt: this.nowIso()
    };
    await this.options.store.saveWorkflow(record, owner);
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
    await this.options.store.saveWorkflow(record, workflow);
    return record;
  }

  private async fail(workflow: WorkflowRecord, error: unknown): Promise<WorkflowRecord> {
    const code = failureCode(error);
    const retryable = failureRetryable(error);
    const attempt = workflow.attempt + 1;
    const paid = workflow.phase.startsWith("task");
    const boundedB =
      (workflow.architecturePolicy &&
        error instanceof Error &&
        error.message.includes("PAID_UNVERIFIED")) ||
      (workflow.phase === "task-b" &&
        ((await this.options.staging.read(workflow.courseId, workflow.workflowId))
          ?.taskBRecovery !== undefined ||
          (await this.options.store.readMetadataValue(`task-b-ledger:${workflow.workflowId}`)) !==
            undefined));
    qaTrace("qa.workflow-user-retry-required", {
      workflowId: workflow.workflowId,
      code,
      paid,
      retryable
    });
    // A failed or parked run releases its lease so a later attempt can claim it.
    const { lease: _lease, userRetryAuthorized: _authorization, ...carried } = workflow;
    const record: WorkflowRecord = {
      ...carried,
      state: "failed",
      attempt,
      errorCode: code,
      lastErrorDetail: error instanceof Error ? error.message : String(error),
      paidRetryAvailable: !boundedB,
      retryConsumesApi: paid && !boundedB,
      updatedAt: this.nowIso()
    };
    await this.observePostProcessing(workflow, "terminal-state-write", () =>
      this.options.store.saveWorkflow(record, workflow)
    );
    return record;
  }
}

function mergeById<T>(existing: T[], incoming: T[], keyOf: (item: T) => string): T[] {
  const incomingKeys = new Set(incoming.map(keyOf));
  return [...existing.filter((item) => !incomingKeys.has(keyOf(item))), ...incoming];
}

function evidencePoolFromStaging(staged: StagedCourseState): AiEvidence[] {
  return projectEvidence(staged.evidence, staged.facts, staged.constraints);
}

function projectEvidence(
  records: EvidenceRecord[],
  facts: FactRecord[],
  constraints: ConstraintRecord[]
): AiEvidence[] {
  const owners = new Map<string, Set<string>>();
  const add = (id: string | undefined, owner: string | undefined) => {
    if (!id || !owner) return;
    const set = owners.get(id) ?? new Set<string>();
    set.add(owner);
    owners.set(id, set);
  };
  for (const fact of facts)
    for (const ref of fact.evidenceRefs)
      add(ref.evidenceId, fact.assessmentId ?? fact.constraintId);
  for (const rule of constraints)
    for (const ref of rule.evidenceRefs) add(ref.evidenceId, rule.constraintId);
  return records.flatMap((record) =>
    [...(owners.get(record.evidenceId) ?? [undefined])].map((objectId) => ({
      evidenceId: record.evidenceId,
      sourceId: record.sourceId,
      locator: record.locator,
      excerpt: record.excerpt,
      capturedAt: record.capturedAt,
      ...(record.origin ? { origin: record.origin } : {}),
      ...(record.representationHash ? { representationHash: record.representationHash } : {}),
      ...(record.page === undefined ? {} : { page: record.page }),
      ...(record.region ? { region: record.region } : {}),
      ...(objectId ? { objectId } : {})
    }))
  );
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
        // Withdrawal of the current requirement and a separately evidenced new instruction
        // have different approval scopes, even when the model reused a proposition identity.
        (item.changeType === "POSSIBLY_REMOVED") === (change.changeType === "POSSIBLY_REMOVED") &&
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
  snapshot: { facts: FactRecord[]; constraints?: ConstraintRecord[] } | null,
  sources: Map<string, { sourceId: string; title: string }>
): Promise<AiEvidence[]> {
  if (!snapshot) return [];
  const constraints = snapshot.constraints ?? [];
  const ids = [
    ...snapshot.facts.flatMap((f) => f.evidenceRefs.map((r) => r.evidenceId)),
    ...constraints.flatMap((r) => r.evidenceRefs.map((e) => e.evidenceId))
  ].filter((id): id is string => !!id);
  const records = await store.readEvidence([...new Set(ids)]);
  return projectEvidence(
    records.filter((record) => sources.has(record.sourceId)),
    snapshot.facts,
    constraints
  );
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
