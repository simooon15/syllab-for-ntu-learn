import type { SemanticUnit } from "./assessment-coverage";
import { AI_SCHEMAS } from "./contract-registry";
import type { EvidenceRequest } from "./evidence-retrieval";
import { isRecord, type EvidenceReference } from "@syllab/contracts";
import type { FactRecord } from "./schema";

export const TASK_A_SCHEMA = AI_SCHEMAS.a;
export const TASK_B_SCHEMA = AI_SCHEMAS.b;
export const TASK_C_SCHEMA = AI_SCHEMAS.c;

export type SourceResult =
  "RELEVANT_INFORMATION_FOUND" | "NO_RELEVANT_INFORMATION" | "PARTIALLY_UNDERSTOOD";
export type IdentityRelationship = "SAME_ASSESSMENT" | "DIFFERENT_ASSESSMENT" | "UNCERTAIN";
export type TaskCChangeType =
  | "NO_MEANINGFUL_CHANGE"
  | "NEW"
  | "CHANGED"
  | "CONFLICT"
  | "POSSIBLY_REMOVED"
  | "IDENTITY_UNCERTAIN";

export interface AiEvidence extends EvidenceReference {
  origin?: "native" | "visual" | "unverified";
  representationHash?: string;
  capturedAt?: string;
  page?: number;
  region?: { x: number; y: number; width: number; height: number };
  evidenceId: string;
  excerpt: string;
}

export interface TaskAResult {
  semanticInventory?: SemanticUnit[];
  sourceCoverage?: unknown[];
  schema: typeof TASK_A_SCHEMA;
  sourceId: string;
  sourceResult: SourceResult;
  visualRequestRefs?: string[];
  fileContext?: string;
  identityContext?: string;
  structuralRelationships?: unknown[];
  assessmentDrafts: unknown[];
  courseWideConstraintCandidates: unknown[];
  unresolvedIssues: unknown[];
}

export interface TaskBResult {
  facetInventory?: unknown;
  semanticCoverage?: unknown[];
  semanticInventory?: SemanticUnit[];
  coverageDecisions?: unknown[];
  requestedEvidenceRefs?: EvidenceRequest[];
  schema: typeof TASK_B_SCHEMA;
  identityResolutions: Array<{
    involvedObjectIds: string[];
    relationship: IdentityRelationship;
    supportingEvidence: AiEvidence[];
    contradictoryEvidence: AiEvidence[];
    judgmentBasis: string;
  }>;
  canonicalAssessmentProposals: unknown[];
  courseWideConstraintProposals: unknown[];
  fieldConsolidationResults: unknown[];
  structuralRelationships: unknown[];
  unresolvedIssues: unknown[];
}

export interface TaskCResult {
  schema: typeof TASK_C_SCHEMA;
  changeResults: Array<{
    changeType: TaskCChangeType;
    targetObjectId: string;
    affectedFieldOrRequirement?: string;
    currentEvidence: AiEvidence[];
    newEvidence: AiEvidence[];
    judgmentBasis: string;
    currentValue?: Record<string, unknown>;
    latestValue?: Record<string, unknown>;
    relevantUserState?: string;
    relevantCoverageFacts?: Record<string, unknown>;
    /** Local-only projection from a reference comparison; never decoded from model JSON. */
    proposedFact?: FactRecord;
  }>;
  unresolvedIssues: unknown[];
}

function array(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value))
    throw new Error(
      `AI_CONTRACT:${field}; "${field}" must be a JSON array, not an object, string or null. Use [] when there are no entries.`
    );
  return value;
}

function boundedRequests(value: unknown): unknown[] {
  const requests = array(value, "requestedEvidenceRefs");
  return requests;
}

function string(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`AI_CONTRACT:${field}`);
  return value;
}

function evidence(value: unknown, knownSourceIds: ReadonlySet<string>): AiEvidence {
  if (!isRecord(value)) throw new Error("AI_CONTRACT:evidence");
  const sourceId = string(value.sourceId, "evidence.sourceId");
  if (!knownSourceIds.has(sourceId)) throw new Error("AI_CONTRACT:unknown_source_evidence");
  return {
    evidenceId: string(value.evidenceId, "evidence.evidenceId"),
    sourceId,
    locator: string(value.locator, "evidence.locator"),
    excerpt: string(value.excerpt, "evidence.excerpt")
  };
}

export function validateTaskA(value: unknown, knownSourceIds: ReadonlySet<string>): TaskAResult {
  if (!isRecord(value) || value.schema !== TASK_A_SCHEMA) throw new Error("AI_CONTRACT:task_a");
  const sourceId = string(value.sourceId, "sourceId");
  if (!knownSourceIds.has(sourceId)) throw new Error("AI_CONTRACT:unknown_source");
  const sourceResult = value.sourceResult;
  if (
    sourceResult !== "RELEVANT_INFORMATION_FOUND" &&
    sourceResult !== "NO_RELEVANT_INFORMATION" &&
    sourceResult !== "PARTIALLY_UNDERSTOOD"
  ) {
    throw new Error("AI_CONTRACT:sourceResult");
  }
  // Validate nested evidence before accepting/caching a physical success. The materializer
  // previously discovered unknown source IDs only after the provider repair boundary had closed.
  const pending: unknown[] = [value.assessmentDrafts, value.courseWideConstraintCandidates];
  while (pending.length) {
    const entry = pending.pop();
    if (Array.isArray(entry)) pending.push(...(entry as unknown[]));
    else if (isRecord(entry)) {
      if (
        typeof entry.sourceId === "string" &&
        typeof entry.locator === "string" &&
        typeof entry.excerpt === "string" &&
        !knownSourceIds.has(entry.sourceId)
      )
        throw new Error("AI_CONTRACT:unknown_source_evidence");
      pending.push(...Object.values(entry));
    }
  }
  return {
    schema: TASK_A_SCHEMA,
    ...(value.semanticInventory === undefined
      ? {}
      : {
          semanticInventory: array(value.semanticInventory, "semanticInventory") as SemanticUnit[]
        }),
    ...(value.sourceCoverage === undefined
      ? {}
      : { sourceCoverage: array(value.sourceCoverage, "sourceCoverage") }),
    sourceId,
    ...(value.visualRequestRefs === undefined
      ? {}
      : {
          visualRequestRefs: array(value.visualRequestRefs, "visualRequestRefs").map((ref) =>
            string(ref, "visualRequestRef")
          )
        }),
    sourceResult,
    ...(value.fileContext === undefined
      ? {}
      : { fileContext: string(value.fileContext, "fileContext") }),
    ...(value.identityContext === undefined
      ? {}
      : { identityContext: string(value.identityContext, "identityContext") }),
    ...(value.structuralRelationships === undefined
      ? {}
      : {
          structuralRelationships: array(value.structuralRelationships, "structuralRelationships")
        }),
    assessmentDrafts: array(value.assessmentDrafts, "assessmentDrafts"),
    courseWideConstraintCandidates: array(
      value.courseWideConstraintCandidates,
      "courseWideConstraintCandidates"
    ),
    unresolvedIssues: array(value.unresolvedIssues, "unresolvedIssues")
  };
}

export function validateTaskB(value: unknown, knownSourceIds: ReadonlySet<string>): TaskBResult {
  if (!isRecord(value) || value.schema !== TASK_B_SCHEMA) throw new Error("AI_CONTRACT:task_b");
  const identityResolutions = array(value.identityResolutions, "identityResolutions").map(
    (item) => {
      if (!isRecord(item)) throw new Error("AI_CONTRACT:identityResolution");
      const relationshipValue = item.relationship;
      if (
        relationshipValue !== "SAME_ASSESSMENT" &&
        relationshipValue !== "DIFFERENT_ASSESSMENT" &&
        relationshipValue !== "UNCERTAIN"
      ) {
        throw new Error("AI_CONTRACT:relationship");
      }
      const relationship: IdentityRelationship = relationshipValue;
      if (
        relationship === "SAME_ASSESSMENT" &&
        array(item.supportingEvidence, "supportingEvidence").length === 0
      )
        throw new Error("AI_CONTRACT:same_assessment_without_evidence");
      return {
        involvedObjectIds: array(item.involvedObjectIds, "involvedObjectIds").map((entry) =>
          string(entry, "involvedObjectId")
        ),
        relationship,
        supportingEvidence: array(item.supportingEvidence, "supportingEvidence").map((entry) =>
          evidence(entry, knownSourceIds)
        ),
        contradictoryEvidence: array(item.contradictoryEvidence, "contradictoryEvidence").map(
          (entry) => evidence(entry, knownSourceIds)
        ),
        judgmentBasis: string(item.judgmentBasis, "judgmentBasis")
      };
    }
  );
  return {
    schema: TASK_B_SCHEMA,
    ...(value.semanticCoverage === undefined
      ? {}
      : { semanticCoverage: array(value.semanticCoverage, "semanticCoverage") }),
    ...(value.semanticInventory === undefined
      ? {}
      : {
          semanticInventory: array(value.semanticInventory, "semanticInventory") as SemanticUnit[]
        }),
    ...(value.coverageDecisions === undefined
      ? {}
      : { coverageDecisions: array(value.coverageDecisions, "coverageDecisions") }),
    identityResolutions,
    ...(value.requestedEvidenceRefs === undefined
      ? {}
      : {
          requestedEvidenceRefs: boundedRequests(value.requestedEvidenceRefs).map((entry) => {
            if (!isRecord(entry)) throw new Error("AI_CONTRACT:evidence_request");
            const refId = string(entry.refId, "evidence_request.refId");
            if (
              (entry.start !== undefined &&
                (!Number.isSafeInteger(entry.start) || Number(entry.start) < 0)) ||
              (entry.length !== undefined &&
                (!Number.isSafeInteger(entry.length) || Number(entry.length) < 1))
            )
              throw new Error("AI_CONTRACT:evidence_request.range");
            return {
              refId,
              ...(entry.start === undefined ? {} : { start: Number(entry.start) }),
              ...(entry.length === undefined ? {} : { length: Number(entry.length) })
            };
          })
        }),
    canonicalAssessmentProposals: array(
      value.canonicalAssessmentProposals,
      "canonicalAssessmentProposals"
    ),
    courseWideConstraintProposals: array(
      value.courseWideConstraintProposals,
      "courseWideConstraintProposals"
    ),
    fieldConsolidationResults: array(value.fieldConsolidationResults, "fieldConsolidationResults"),
    structuralRelationships: array(value.structuralRelationships, "structuralRelationships"),
    unresolvedIssues: array(value.unresolvedIssues, "unresolvedIssues")
  };
}

export function validateTaskC(
  value: unknown,
  knownSourceIds: ReadonlySet<string>,
  coverageSufficient: boolean
): TaskCResult {
  if (!isRecord(value) || value.schema !== TASK_C_SCHEMA) throw new Error("AI_CONTRACT:task_c");
  const changeResults = array(value.changeResults, "changeResults").map((item) => {
    if (!isRecord(item)) throw new Error("AI_CONTRACT:changeResult");
    const changeType = item.changeType;
    const values: TaskCChangeType[] = [
      "NO_MEANINGFUL_CHANGE",
      "NEW",
      "CHANGED",
      "CONFLICT",
      "POSSIBLY_REMOVED",
      "IDENTITY_UNCERTAIN"
    ];
    if (!values.includes(changeType as TaskCChangeType)) throw new Error("AI_CONTRACT:changeType");
    if (changeType === "POSSIBLY_REMOVED" && !coverageSufficient) {
      throw new Error("AI_CONTRACT:removal_without_coverage");
    }
    for (const key of ["currentValue", "latestValue"]) {
      const v = item[key];
      if (v === undefined) continue;
      if (!isRecord(v) || !["KNOWN", "UNCERTAIN", "EXPLICITLY_UNKNOWN"].includes(String(v.state)))
        throw Error("AI_CONTRACT:change_value_state");
      const scalar = (x: unknown): boolean =>
        typeof x === "string" ||
        typeof x === "boolean" ||
        (typeof x === "number" && Number.isFinite(x)) ||
        (Array.isArray(x) &&
          x.every(
            (y) =>
              typeof y === "string" ||
              typeof y === "boolean" ||
              (typeof y === "number" && Number.isFinite(y))
          ));
      if (v.value != null && !scalar(v.value)) throw Error("AI_CONTRACT:change_value_shape");
      if (v.state === "KNOWN" && (v.value == null || !scalar(v.value)))
        throw Error("AI_CONTRACT:change_known_value");
      if (v.state === "EXPLICITLY_UNKNOWN" && v.value != null)
        throw Error("AI_CONTRACT:change_unknown_value");
      if (v.state !== "UNCERTAIN" && Array.isArray(v.competingValues) && v.competingValues.length)
        throw Error("AI_CONTRACT:change_conflict_state");
      if (
        v.competingValues !== undefined &&
        (!Array.isArray(v.competingValues) || !v.competingValues.every(scalar))
      )
        throw Error("AI_CONTRACT:change_competing_shape");
    }
    return {
      changeType: changeType as TaskCChangeType,
      ...(isRecord(item.currentValue) ? { currentValue: item.currentValue } : {}),
      ...(isRecord(item.latestValue) ? { latestValue: item.latestValue } : {}),
      ...(typeof item.relevantUserState === "string"
        ? { relevantUserState: item.relevantUserState }
        : {}),
      targetObjectId: string(item.targetObjectId, "targetObjectId"),
      ...(typeof item.affectedFieldOrRequirement === "string"
        ? { affectedFieldOrRequirement: item.affectedFieldOrRequirement }
        : {}),
      currentEvidence: array(item.currentEvidence, "currentEvidence").map((entry) =>
        evidence(entry, knownSourceIds)
      ),
      newEvidence: array(item.newEvidence, "newEvidence").map((entry) =>
        evidence(entry, knownSourceIds)
      ),
      judgmentBasis: string(item.judgmentBasis, "judgmentBasis"),
      ...(isRecord(item.relevantCoverageFacts)
        ? { relevantCoverageFacts: item.relevantCoverageFacts }
        : {})
    };
  });
  return {
    schema: TASK_C_SCHEMA,
    changeResults,
    unresolvedIssues: array(value.unresolvedIssues, "unresolvedIssues")
  };
}

/** Only AI-requested selected/renderable Partial refs may enter visual completion. */
export function validateTaskAVisualRequests(
  result: TaskAResult,
  allowed: ReadonlySet<string>
): void {
  const refs = result.visualRequestRefs ?? [];
  if (new Set(refs).size !== refs.length || refs.some((ref) => !allowed.has(ref)))
    throw new Error("AI_CONTRACT:VISUAL_REQUEST_NOT_SELECTED_UNRESOLVED_OR_NO_PROGRESS");
}
