import { isRecord, type EvidenceReference } from "@syllab/contracts";

export const TASK_A_SCHEMA = "syllab.ai.task-a/1" as const;
export const TASK_B_SCHEMA = "syllab.ai.task-b/1" as const;
export const TASK_C_SCHEMA = "syllab.ai.task-c/1" as const;

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
  evidenceId: string;
  excerpt: string;
}

export interface TaskAResult {
  schema: typeof TASK_A_SCHEMA;
  sourceId: string;
  sourceResult: SourceResult;
  assessmentDrafts: unknown[];
  courseWideConstraintCandidates: unknown[];
  unresolvedIssues: unknown[];
}

export interface TaskBResult {
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
    relevantCoverageFacts?: Record<string, unknown>;
  }>;
  unresolvedIssues: unknown[];
}

function array(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`AI_CONTRACT:${field}`);
  return value;
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
  return {
    schema: TASK_A_SCHEMA,
    sourceId,
    sourceResult,
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
    identityResolutions,
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
    return {
      changeType: changeType as TaskCChangeType,
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
