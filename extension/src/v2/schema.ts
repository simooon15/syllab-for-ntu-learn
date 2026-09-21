import type { EvidenceReference } from "@syllab/contracts";

export type KnowledgeState = "KNOWN" | "EXPLICITLY_UNKNOWN" | "UNCERTAIN";
export type AssessmentRole = "assessment" | "component" | "series" | "series_instance";
export type CurrentMark = "Edited" | "Changed" | "PossiblyRemoved";
export type TaskCChangeType =
  | "NO_MEANINGFUL_CHANGE"
  | "NEW"
  | "CHANGED"
  | "CONFLICT"
  | "POSSIBLY_REMOVED"
  | "IDENTITY_UNCERTAIN";

export interface FactValue {
  state: KnowledgeState;
  value?: string | number | boolean | string[];
  competingValues?: Array<string | number | boolean | string[]>;
}

export type MachineComparison =
  | "unchanged"
  | "machine-different"
  | "new-source"
  | "missing-after-successful-coverage"
  | "incomparable";

export interface SourceMachineRepresentation {
  sourceId: string;
  canonicalMetadataHash: string;
  contentHash: string;
  structureHash: string;
  representationVersion: number;
}

/** Everything a Materialize step needs, including the run's Coverage inputs. */
export interface MaterializeInputs {
  sources: Map<string, { sourceId: string; title: string }>;
  sourceRecords: SourceRecord[];
  observations: SourceObservationRecord[];
}

export interface AuthorizationRecord {
  granted: boolean;
  policyVersion: string;
  grantedAt?: string;
  revokedAt?: string;
}

export const V2_DATABASE_VERSION = 6 as const;
export const V2_SCHEMA_REVISION = "syllab.local/2" as const;

/**
 * Every durable record carries the restore generation it belongs to. Restore writes a
 * complete new generation and only then moves the active pointer, so an interrupted
 * restore can never be observed as a half-restored state. Runtime stores are not
 * generation-scoped: they are cleared whenever the active generation changes.
 */
export const GENERATION_FIELD = "restoreGeneration" as const;

export const V2_STORES = {
  semesters: "semesterId",
  courses: "courseId",
  courseStates: "courseId",
  assessments: "assessmentId",
  constraints: "constraintId",
  facts: "factId",
  sources: "sourceId",
  evidence: "evidenceId",
  sourceObservations: "observationId",
  reviewItems: "reviewItemId",
  reviewDecisions: "decisionId",
  exclusionMemory: "memoryId",
  changes: "changeId",
  history: "historyId",
  workflows: "workflowId",
  aiRuns: "aiRunId",
  appMetadata: "key"
} as const;

export type V2StoreName = keyof typeof V2_STORES;

/** Tables that participate in Backup / Restore. Runtime-only stores are excluded. */
export const DURABLE_TABLES = [
  "semesters",
  "courses",
  "courseStates",
  "assessments",
  "constraints",
  "facts",
  "sources",
  "evidence",
  "reviewItems",
  "reviewDecisions",
  "exclusionMemory",
  "changes",
  "history"
] as const satisfies readonly V2StoreName[];

export type DurableTable = (typeof DURABLE_TABLES)[number];

/** Stores that must be scoped by generation but never leave the device. */
export const RUNTIME_TABLES = [
  "sourceObservations",
  "workflows",
  "aiRuns",
  "appMetadata"
] as const satisfies readonly V2StoreName[];

export const ACTIVE_GENERATION_KEY = "activeGeneration";

// ---------------------------------------------------------------------------
// Durable records
// ---------------------------------------------------------------------------

export interface SemesterRecord {
  semesterId: string;
  nativeSemesterId: string;
  label: string;
  status: "Current" | "Historical";
  discoveredAt: string;
  updatedAt: string;
}

export interface CourseRecord {
  courseId: string;
  semesterId: string;
  courseCode: string;
  courseName: string;
  curriculum: boolean;
  established: boolean;
  missingFromNative?: boolean;
  currentRevision: number;
  lastSuccessfulCheckAt?: string;
  lastCheckAttemptAt?: string;
  consecutiveCheckFailures: number;
  unchangedStreak?: number;
  nextCheckAt?: string;
  updatedAt: string;
}

export interface CourseStateRecord {
  courseId: string;
  revision: number;
  updatedAt: string;
}

export interface AssessmentRecord {
  assessmentId: string;
  courseId: string;
  parentAssessmentId?: string;
  role: AssessmentRole;
  kind: "assignment" | "project" | "quiz_test" | "exam" | "other";
  name: string;
  aliases: string[];
  marks: CurrentMark[];
  createdBy: "ai" | "user" | "migration";
  supersededBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConstraintRecord {
  constraintId: string;
  courseId: string;
  content: string;
  evidenceRefs: EvidenceReference[];
  scopeNote?: string;
  marks: CurrentMark[];
  superseded?: boolean;
  createdBy: "ai" | "user" | "migration";
  updatedAt: string;
}

export interface FactRecord {
  factId: string;
  courseId: string;
  assessmentId?: string;
  constraintId?: string;
  field: string;
  value: FactValue;
  evidenceRefs: EvidenceReference[];
  marks: CurrentMark[];
  userEdited?: boolean;
  superseded?: boolean;
  updatedAt: string;
}

export interface EvidenceRecord {
  evidenceId: string;
  courseId: string;
  sourceId: string;
  locator: string;
  page?: number;
  region?: { x: number; y: number; width: number; height: number };
  excerpt: string;
  capturedAt: string;
}

export interface SourceRecord {
  sourceId: string;
  courseId: string;
  nativeItemId: string;
  parentSourceId?: string;
  kind: string;
  title: string;
  machine?: SourceMachineRepresentation;
  lastFetchedAt?: string;
  lastParsedAt?: string;
  /**
   * Normalised text and structure of the last successful parse. Required to materialise
   * Evidence and to re-run Task A without re-fetching; schema-migrated, not Backup-durable
   * (it is Source-derived, not user state).
   */
  parsed?: { text: string; structure: string[]; pageLocators?: string[] };
  removedFromNative?: boolean;
  updatedAt: string;
}

export interface SourceObservationRecord {
  observationId: string;
  workflowId: string;
  sourceId: string;
  courseId: string;
  fetchStatus: "ok" | "failed" | "not-attempted" | "permission-denied";
  parseStatus: "ok" | "failed" | "not-attempted" | "unsupported";
  machineComparison?:
    | "unchanged"
    | "machine-different"
    | "new-source"
    | "missing-after-successful-coverage"
    | "incomparable";
  comparability: "comparable" | "incomparable" | "not-attempted";
  errorCode?: string;
  recordedAt: string;
}

export interface CoverageFacts {
  checkedSourceIds: string[];
  succeededSourceIds: string[];
  failedSourceIds: string[];
  permissionDenied: boolean;
  partialCoverage: boolean;
  scopeComplete: boolean;
  missingAfterCoverageSourceIds: string[];
}

export interface ReviewItemRecord {
  reviewItemId: string;
  courseId: string;
  workflowId: string;
  kind: "initial" | "change" | "rebuild" | "identity";
  changeType?: TaskCChangeType;
  targetId: string;
  payload: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ReviewDecisionKind =
  | "Confirm"
  | "Edit"
  | "Exclude"
  | "Merge"
  | "Split"
  | "Defer"
  | "AcceptChange"
  | "KeepCurrent"
  | "Remove"
  | "KeepPossiblyRemoved"
  | "ResolveConflict"
  | "KeepIdentity"
  | "DifferentIdentity"
  | "UseRebuilt"
  | "KeepCurrentCourse"
  | "ManualAdd";

export interface ReviewDecisionRecord {
  decisionId: string;
  courseId: string;
  reviewItemId: string;
  kind: ReviewDecisionKind;
  targetId?: string;
  details?: Record<string, unknown>;
  decidedAt: string;
}

export interface ExclusionMemoryRecord {
  memoryId: string;
  courseId: string;
  proposalKey: string;
  evidenceFingerprint: string;
  createdAt: string;
}

export interface ChangeRecord {
  changeId: string;
  courseId: string;
  workflowId: string;
  targetId: string;
  field?: string;
  changeType: TaskCChangeType;
  currentValue?: FactValue;
  latestValue?: FactValue;
  currentEvidenceIds: string[];
  newEvidenceIds: string[];
  competingValues?: FactValue[];
  judgmentBasis?: string;
  relevantUserState?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryRecord {
  historyId: string;
  courseId: string;
  revision: number;
  targetId: string;
  field?: string;
  event:
    | "PENDING_SUPERSEDED"
    | "CHANGE_ACCEPTED"
    | "CHANGE_KEPT_CURRENT"
    | "FIELD_EDITED"
    | "ASSESSMENT_CONFIRMED"
    | "ASSESSMENT_EXCLUDED"
    | "ASSESSMENT_MERGED"
    | "ASSESSMENT_SPLIT"
    | "ASSESSMENT_ADDED"
    | "ASSESSMENT_REMOVED"
    | "POSSIBLY_REMOVED_KEPT"
    | "POSSIBLY_REMOVED_RESOLVED"
    | "CONFLICT_RESOLVED"
    | "REBUILT_STATE_USED"
    | "STATE_RESTORED"
    | "MIGRATED";
  fromValue?: FactValue;
  toValue?: FactValue;
  note?: string;
  recordedAt: string;
}

// ---------------------------------------------------------------------------
// Runtime records
// ---------------------------------------------------------------------------

export type WorkflowKind = "initial" | "check" | "rebuild";
export type WorkflowState = "queued" | "working" | "waiting" | "saved" | "failed" | "complete";
export type WorkflowPhase =
  | "discover"
  | "fetch"
  | "parse"
  | "normalize"
  | "task-a"
  | "task-b"
  | "task-c"
  | "review"
  | "staged";

export type WaitingReason =
  "api-key" | "privacy-authorization" | "api-usage-authorization" | "host-permission" | "review";

export interface WorkflowRecord {
  workflowId: string;
  courseId: string;
  kind: WorkflowKind;
  state: WorkflowState;
  phase: WorkflowPhase;
  phaseCursor: string;
  attempt: number;
  baseCourseRevision: number;
  stagingRevision?: number;
  waitingReason?: WaitingReason;
  errorCode?: string;
  lastErrorDetail?: string;
  paidRetryAvailable?: boolean;
  retryConsumesApi?: boolean;
  returnContext?: Record<string, unknown>;
  lease?: { token: string; expiresAt: string };
  createdAt: string;
  updatedAt: string;
}

export interface AiRunRecord {
  aiRunId: string;
  workflowId: string;
  courseId: string;
  task: "task-a" | "task-a-consolidate" | "task-b" | "task-b-expand" | "task-c" | "repair";
  schemaVersion: string;
  promptVersion: string;
  idempotencyKey: string;
  /** Non-secret invocation/config identity used to prevent stale-policy cache reuse. */
  invocationFingerprint?: string;
  status: "succeeded" | "failed";
  errorCode?: string;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  chunkIndex?: number;
  sourceId?: string;
  attempt: number;
  payload?: unknown;
  recordedAt: string;
}

export interface AppMetadataRecord {
  key: string;
  value: unknown;
}

export const WORKFLOW_ACTIVE_STATES: readonly WorkflowState[] = ["queued", "working", "waiting"];

export { type EvidenceReference };
