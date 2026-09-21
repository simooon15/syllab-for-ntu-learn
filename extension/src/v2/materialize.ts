import type { TaskAResult, TaskBResult, TaskCResult } from "./ai-contracts";
import { sha256, stableStringify } from "./crypto";
import type {
  AssessmentRecord,
  ChangeRecord,
  ConstraintRecord,
  CourseRecord,
  CoverageFacts,
  FactRecord,
  FactValue,
  KnowledgeState,
  SourceObservationRecord,
  SourceRecord
} from "./domain";
import type { DraftBundle } from "./store";

export const MATERIALIZE_SCHEMA_VERSION = "syllab.materialize/1" as const;

interface RawEvidence {
  evidenceId?: unknown;
  sourceId?: unknown;
  locator?: unknown;
  page?: unknown;
  region?: unknown;
  excerpt?: unknown;
}

interface RawField {
  fieldName?: unknown;
  state?: unknown;
  value?: unknown;
  competingValues?: unknown;
  evidence?: unknown;
}

interface RawRequirement {
  requirementId?: unknown;
  content?: unknown;
  evidence?: unknown;
}

interface RawIssue {
  issueId?: unknown;
  issueType?: unknown;
  affectedObjectOrField?: unknown;
  description?: unknown;
  relevantEvidence?: unknown;
}

interface RawDraft {
  draftId?: unknown;
  name?: unknown;
  type?: unknown;
  role?: unknown;
  parentDraftId?: unknown;
  aliases?: unknown;
  fields?: unknown;
  requirements?: unknown;
  unresolvedIssues?: unknown;
}

interface RawProposal {
  proposalId?: unknown;
  canonicalName?: unknown;
  type?: unknown;
  role?: unknown;
  componentOfProposalId?: unknown;
  aliases?: unknown;
  consolidatedFields?: unknown;
  requirements?: unknown;
  seriesInstances?: unknown;
  supportingEvidence?: unknown;
  unresolvedIssues?: unknown;
}

interface RawIdentityResolution {
  involvedObjectIds?: unknown;
  relationship?: unknown;
  supportingEvidence?: unknown;
  contradictoryEvidence?: unknown;
  judgmentBasis?: unknown;
}

const FIELD_STATES: KnowledgeState[] = ["KNOWN", "EXPLICITLY_UNKNOWN", "UNCERTAIN"];
const ASSESSMENT_KINDS = ["assignment", "project", "quiz_test", "exam", "other"] as const;
const ASSESSMENT_ROLES = ["assessment", "component", "series", "series_instance"] as const;

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function scalar(value: unknown): FactValue["value"] | undefined {
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return value;
  if (Array.isArray(value)) {
    const items = value.filter(
      (item): item is string | number | boolean =>
        typeof item === "string" || typeof item === "number" || typeof item === "boolean"
    );
    return items.length > 0 ? items.map(String) : undefined;
  }
  return undefined;
}

export interface MaterializeContext {
  course: CourseRecord;
  workflowId: string;
  /** Source id → the record it came from. Evidence naming anything else is dropped. */
  sources: Map<string, { sourceId: string; title: string }>;
  /** Disabled proposals: already excluded and still backed by unchanged evidence. */
  exclusionKeys: Set<string>;
  now: string;
}

export interface EvidenceDraft {
  evidenceId: string;
  sourceId: string;
  locator: string;
  excerpt: string;
  page?: number;
  region?: { x: number; y: number; width: number; height: number };
}

export class MaterializeError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

/**
 * Evidence is never invented locally: a reference whose source was not part of this run, or
 * whose excerpt is empty, is dropped rather than trusted. Traceability is the contract.
 */
function evidence(
  raw: unknown,
  context: MaterializeContext,
  collected: EvidenceDraft[]
): EvidenceDraft | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as RawEvidence;
  const sourceId = text(record.sourceId);
  const locator = text(record.locator);
  const excerpt = text(record.excerpt);
  if (!sourceId || !locator || !excerpt) return null;
  if (!context.sources.has(sourceId)) throw new MaterializeError("EVIDENCE_UNKNOWN_SOURCE");
  const evidenceId = text(record.evidenceId) ?? `ev_${randomSuffix()}`;
  const page = typeof record.page === "number" ? record.page : undefined;
  const region = isRegion(record.region) ? record.region : undefined;
  const draft: EvidenceDraft = {
    evidenceId,
    sourceId,
    locator,
    excerpt,
    ...(page !== undefined ? { page } : {}),
    ...(region ? { region } : {})
  };
  if (!collected.some((item) => item.evidenceId === evidenceId)) collected.push(draft);
  return draft;
}

function isRegion(
  value: unknown
): value is { x: number; y: number; width: number; height: number } {
  if (typeof value !== "object" || value === null) return false;
  const region = value as Record<string, unknown>;
  return (
    typeof region.x === "number" &&
    typeof region.y === "number" &&
    typeof region.width === "number" &&
    typeof region.height === "number"
  );
}

function randomSuffix(): string {
  return `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function factFromField(
  raw: unknown,
  context: MaterializeContext,
  collected: EvidenceDraft[],
  owner: { assessmentId?: string; constraintId?: string },
  index: number
): FactRecord | null {
  if (typeof raw !== "object" || raw === null) return null;
  const field = raw as RawField;
  const fieldName = text(field.fieldName);
  if (!fieldName) return null;
  const state = oneOf<KnowledgeState>(field.state, FIELD_STATES, "KNOWN");
  const value = scalar(field.value);
  const competing = list(field.competingValues)
    .map((item) => scalar(item))
    .filter((item): item is NonNullable<FactValue["value"]> => item !== undefined);
  const refs = list(field.evidence)
    .map((entry) => evidence(entry, context, collected))
    .filter((entry): entry is EvidenceDraft => entry !== null);
  return {
    factId: `${owner.assessmentId ?? owner.constraintId ?? "obj"}:${fieldName}:${String(index)}`,
    courseId: context.course.courseId,
    ...owner,
    field: fieldName,
    value: {
      state,
      ...(value !== undefined ? { value } : {}),
      ...(competing.length > 0 ? { competingValues: competing } : {})
    },
    evidenceRefs: refs.map((entry) => ({
      sourceId: entry.sourceId,
      locator: entry.locator,
      evidenceId: entry.evidenceId
    })),
    marks: [],
    updatedAt: context.now
  };
}

function unresolvedQuestions(raw: unknown): string[] {
  return list(raw)
    .map((entry) => {
      if (typeof entry !== "object" || entry === null) return null;
      const issue = entry as RawIssue;
      return text(issue.description) ?? text(issue.affectedObjectOrField);
    })
    .filter((entry): entry is string => entry !== null);
}

export type PartialBundle = Partial<DraftBundle>;

export interface MaterializedInitial {
  bundle: PartialBundle;
  drafts: Array<{
    draftId: string;
    name: string;
    kind: AssessmentRecord["kind"];
    role: AssessmentRecord["role"];
    parentDraftId?: string;
    aliases: string[];
    facts: FactRecord[];
    questions: string[];
  }>;
  constraintCandidates: Array<{ candidateId: string; content: string }>;
  sourceResult: TaskAResult["sourceResult"];
}

/** Task A output → internal drafts. No cross-Source judgement happens here. */
export function materializeTaskA(
  result: TaskAResult,
  context: MaterializeContext
): MaterializedInitial {
  const collected: EvidenceDraft[] = [];
  const drafts: MaterializedInitial["drafts"] = [];
  for (const raw of result.assessmentDrafts) {
    if (typeof raw !== "object" || raw === null) continue;
    const draft = raw as RawDraft;
    const name = text(draft.name);
    const draftId = text(draft.draftId);
    if (!name || !draftId) continue;
    const facts: FactRecord[] = [];
    list(draft.fields).forEach((field, index) => {
      const fact = factFromField(field, context, collected, { assessmentId: draftId }, index);
      if (fact) facts.push(fact);
    });
    list(draft.requirements).forEach((entry, index) => {
      if (typeof entry !== "object" || entry === null) return;
      const requirement = entry as RawRequirement;
      const content = text(requirement.content);
      if (!content) return;
      const refs = list(requirement.evidence)
        .map((item) => evidence(item, context, collected))
        .filter((item): item is EvidenceDraft => item !== null);
      facts.push({
        factId: text(requirement.requirementId) ?? `${draftId}:requirement:${String(index)}`,
        courseId: context.course.courseId,
        assessmentId: draftId,
        field: "requirement",
        value: { state: "KNOWN", value: content },
        evidenceRefs: refs.map((ref) => ({
          sourceId: ref.sourceId,
          locator: ref.locator,
          evidenceId: ref.evidenceId
        })),
        marks: [],
        updatedAt: context.now
      });
    });
    const parent = text(draft.parentDraftId);
    drafts.push({
      draftId,
      name,
      kind: oneOf<AssessmentRecord["kind"]>(draft.type, ASSESSMENT_KINDS, "other"),
      role: oneOf<AssessmentRecord["role"]>(draft.role, ASSESSMENT_ROLES, "assessment"),
      ...(parent ? { parentDraftId: parent } : {}),
      aliases: list(draft.aliases).filter((alias): alias is string => typeof alias === "string"),
      facts,
      questions: unresolvedQuestions(draft.unresolvedIssues)
    });
  }

  const constraintCandidates = result.courseWideConstraintCandidates
    .map((raw, index) => {
      if (typeof raw !== "object" || raw === null) return null;
      const candidate = raw as { candidateId?: unknown; content?: unknown };
      const content = text(candidate.content);
      if (!content) return null;
      return {
        candidateId: text(candidate.candidateId) ?? `candidate_${String(index)}`,
        content
      };
    })
    .filter((item): item is { candidateId: string; content: string } => item !== null);

  return {
    drafts,
    constraintCandidates,
    sourceResult: result.sourceResult,
    bundle: {
      evidence: collected.map((entry) => ({
        evidenceId: entry.evidenceId,
        courseId: context.course.courseId,
        sourceId: entry.sourceId,
        locator: entry.locator,
        excerpt: entry.excerpt,
        ...(entry.page !== undefined ? { page: entry.page } : {}),
        ...(entry.region ? { region: entry.region } : {}),
        capturedAt: context.now
      }))
    }
  };
}

export interface MaterializedCanonical {
  bundle: PartialBundle;
  assessments: AssessmentRecord[];
  constraints: ConstraintRecord[];
  identities: Array<{
    involvedObjectIds: string[];
    relationship: "SAME_ASSESSMENT" | "DIFFERENT_ASSESSMENT" | "UNCERTAIN";
    judgmentBasis: string;
  }>;
}

/**
 * Task B output → Canonical Assessment Proposals bound to stable ids. Proposals whose
 * evidence-backed identity is already known to be false-positive stay out of Review.
 */
export function materializeTaskB(
  result: TaskBResult,
  context: MaterializeContext,
  draftFacts: Map<string, FactRecord[]>,
  existingAssessmentIds: Set<string>
): MaterializedCanonical {
  const collected: EvidenceDraft[] = [];
  const assessments: AssessmentRecord[] = [];
  const createdFacts: FactRecord[] = [];

  for (const raw of result.canonicalAssessmentProposals) {
    if (typeof raw !== "object" || raw === null) continue;
    const proposal = raw as RawProposal;
    const proposalId = text(proposal.proposalId);
    const name = text(proposal.canonicalName);
    if (!proposalId || !name) continue;
    const role = oneOf<AssessmentRecord["role"]>(proposal.role, ASSESSMENT_ROLES, "assessment");
    const assessmentId = existingAssessmentIds.has(proposalId)
      ? proposalId
      : role === "series" || role === "assessment"
        ? `assessment_${proposalId}`
        : `component_${proposalId}`;
    const parentProposalId = text(proposal.componentOfProposalId);

    // Collecting the proposal's supporting Evidence is what makes it traceable later; the
    // identity judgement itself comes from the proposal's own fields plus the supplied index.
    for (const entry of list(proposal.supportingEvidence)) evidence(entry, context, collected);
    const own = draftFacts.get(proposalId) ?? [];
    const fields = list(proposal.consolidatedFields);
    const facts: FactRecord[] = [...own];
    fields.forEach((field, index) => {
      const fact = factFromField(field, context, collected, { assessmentId }, index);
      if (fact) facts.push(fact);
    });
    for (const entry of list(proposal.requirements)) {
      if (typeof entry !== "object" || entry === null) continue;
      const requirement = entry as RawRequirement;
      const content = text(requirement.content);
      if (!content) continue;
      const refs = list(requirement.evidence)
        .map((item) => evidence(item, context, collected))
        .filter((item): item is EvidenceDraft => item !== null);
      facts.push({
        factId: `${assessmentId}:requirement:${text(requirement.requirementId) ?? randomSuffix()}`,
        courseId: context.course.courseId,
        assessmentId,
        field: "requirement",
        value: { state: "KNOWN", value: content },
        evidenceRefs: refs.map((ref) => ({
          sourceId: ref.sourceId,
          locator: ref.locator,
          evidenceId: ref.evidenceId
        })),
        marks: [],
        updatedAt: context.now
      });
    }
    createdFacts.push(...facts);
    const aliasSource = list(proposal.aliases).filter(
      (alias): alias is string => typeof alias === "string"
    );
    assessments.push({
      assessmentId,
      courseId: context.course.courseId,
      ...(parentProposalId ? { parentAssessmentId: `assessment_${parentProposalId}` } : {}),
      role,
      kind: oneOf<AssessmentRecord["kind"]>(proposal.type, ASSESSMENT_KINDS, "other"),
      name,
      aliases: [...new Set(aliasSource.filter((alias) => alias !== name))],
      marks: [],
      createdBy: "ai",
      createdAt: context.now,
      updatedAt: context.now
    });
  }

  const constraints: ConstraintRecord[] = [];
  for (const raw of result.courseWideConstraintProposals) {
    if (typeof raw !== "object" || raw === null) continue;
    const proposal = raw as RawProposal & { normalizedRuleContent?: unknown };
    const content = text(proposal.normalizedRuleContent);
    const proposalId = text(proposal.proposalId);
    if (!content || !proposalId) continue;
    const refs = list(proposal.supportingEvidence)
      .map((entry) => evidence(entry, context, collected))
      .filter((entry): entry is EvidenceDraft => entry !== null);
    constraints.push({
      constraintId: `constraint_${proposalId}`,
      courseId: context.course.courseId,
      content,
      evidenceRefs: refs.map((ref) => ({
        sourceId: ref.sourceId,
        locator: ref.locator,
        evidenceId: ref.evidenceId
      })),
      marks: [],
      createdBy: "ai",
      updatedAt: context.now
    });
  }

  const identities = result.identityResolutions.map((raw) => {
    const resolution = raw as unknown as RawIdentityResolution;
    return {
      involvedObjectIds: list(resolution.involvedObjectIds)
        .map((id) => text(id))
        .filter((id): id is string => id !== null),
      relationship: oneOf(
        resolution.relationship,
        ["SAME_ASSESSMENT", "DIFFERENT_ASSESSMENT", "UNCERTAIN"] as const,
        "UNCERTAIN"
      ),
      judgmentBasis: text(resolution.judgmentBasis) ?? ""
    };
  });

  return {
    assessments,
    constraints,
    identities,
    bundle: {
      assessments,
      constraints,
      facts: createdFacts,
      evidence: collected.map((entry) => ({
        evidenceId: entry.evidenceId,
        courseId: context.course.courseId,
        sourceId: entry.sourceId,
        locator: entry.locator,
        excerpt: entry.excerpt,
        ...(entry.page !== undefined ? { page: entry.page } : {}),
        ...(entry.region ? { region: entry.region } : {}),
        capturedAt: context.now
      }))
    }
  };
}

export interface MaterializedChanges {
  bundle: PartialBundle;
  changes: ChangeRecord[];
}

/** Task C output → pending changes. Nothing here touches Current State. */
export function materializeTaskC(
  result: TaskCResult,
  context: MaterializeContext,
  targetAssessmentIdByObjectId: Map<string, string>,
  coverage: CoverageFacts
): MaterializedChanges {
  const collected: EvidenceDraft[] = [];
  const changes: ChangeRecord[] = [];
  for (const raw of result.changeResults) {
    if (raw.changeType === "NO_MEANINGFUL_CHANGE") continue;
    // Local guard rail: a removal proposal without sufficient coverage is a contract violation.
    if (raw.changeType === "POSSIBLY_REMOVED" && !coverageSufficient(coverage)) {
      throw new MaterializeError("REMOVAL_WITHOUT_COVERAGE");
    }
    const targetId = targetAssessmentIdByObjectId.get(raw.targetObjectId);
    if (!targetId) throw new MaterializeError("CHANGE_UNKNOWN_TARGET");
    const currentRefs = raw.currentEvidence
      .map((entry) => evidence(entry, context, collected))
      .filter((entry): entry is EvidenceDraft => entry !== null);
    const newRefs = raw.newEvidence
      .map((entry) => evidence(entry, context, collected))
      .filter((entry): entry is EvidenceDraft => entry !== null);
    const rawChange = raw as unknown as {
      currentValue?: unknown;
      latestValue?: unknown;
      relevantUserState?: unknown;
    };
    const value = (input: unknown): FactValue | undefined => {
      if (typeof input !== "object" || input === null) return undefined;
      const record = input as RawField;
      const state = oneOf<KnowledgeState>(record.state, FIELD_STATES, "KNOWN");
      const scalarValue = scalar(record.value);
      const competing = list(record.competingValues)
        .map((item) => scalar(item))
        .filter((item): item is NonNullable<FactValue["value"]> => item !== undefined);
      return {
        state,
        ...(scalarValue !== undefined ? { value: scalarValue } : {}),
        ...(competing.length > 0 ? { competingValues: competing } : {})
      };
    };
    const currentValue = value(rawChange.currentValue);
    const latestValue = value(rawChange.latestValue);
    const change: ChangeRecord = {
      changeId: `change_${randomSuffix()}`,
      courseId: context.course.courseId,
      workflowId: context.workflowId,
      targetId,
      changeType: raw.changeType,
      currentEvidenceIds: currentRefs.map((entry) => entry.evidenceId),
      newEvidenceIds: newRefs.map((entry) => entry.evidenceId),
      createdAt: context.now,
      updatedAt: context.now
    };
    if (raw.affectedFieldOrRequirement) change.field = raw.affectedFieldOrRequirement;
    if (currentValue) change.currentValue = currentValue;
    if (latestValue) change.latestValue = latestValue;
    if (raw.judgmentBasis) change.judgmentBasis = raw.judgmentBasis;
    if (typeof rawChange.relevantUserState === "string") {
      change.relevantUserState = rawChange.relevantUserState;
    }
    changes.push(change);
  }
  return {
    changes,
    bundle: {
      changes,
      evidence: collected.map((entry) => ({
        evidenceId: entry.evidenceId,
        courseId: context.course.courseId,
        sourceId: entry.sourceId,
        locator: entry.locator,
        excerpt: entry.excerpt,
        ...(entry.page !== undefined ? { page: entry.page } : {}),
        ...(entry.region ? { region: entry.region } : {}),
        capturedAt: context.now
      }))
    }
  };
}

export function coverageSufficient(coverage: CoverageFacts): boolean {
  return (
    coverage.scopeComplete &&
    !coverage.partialCoverage &&
    !coverage.permissionDenied &&
    coverage.failedSourceIds.length === 0
  );
}

/**
 * Exclusion memory is keyed by the proposal's semantic identity plus the evidence that
 * supported it, so an unchanged false positive stays suppressed across scans while genuinely
 * new evidence lets it resurface.
 */
export async function exclusionKeysFor(input: {
  proposalKey: string;
  evidenceIds: string[];
  evidenceById: Map<string, { sourceId: string; locator: string; excerpt: string }>;
}): Promise<{ proposalKey: string; fingerprint: string }> {
  const parts = input.evidenceIds
    .map((id) => input.evidenceById.get(id))
    .filter(
      (entry): entry is { sourceId: string; locator: string; excerpt: string } =>
        entry !== undefined
    )
    .map((entry) => `${entry.sourceId}|${entry.locator}|${entry.excerpt}`)
    .sort();
  return {
    proposalKey: input.proposalKey,
    fingerprint: await sha256(stableStringify(parts))
  };
}

export function isSuppressed(
  key: { proposalKey: string; fingerprint: string },
  memory: Array<{ proposalKey: string; evidenceFingerprint: string }>
): boolean {
  return memory.some(
    (entry) =>
      entry.proposalKey === key.proposalKey && entry.evidenceFingerprint === key.fingerprint
  );
}

export function observationFor(input: {
  workflowId: string;
  sourceId: string;
  courseId: string;
  fetchStatus: SourceObservationRecord["fetchStatus"];
  parseStatus: SourceObservationRecord["parseStatus"];
  comparison?: SourceObservationRecord["machineComparison"];
  comparability: SourceObservationRecord["comparability"];
  errorCode?: string;
  now: string;
}): SourceObservationRecord {
  return {
    observationId: `obs_${input.workflowId}_${input.sourceId}`,
    workflowId: input.workflowId,
    sourceId: input.sourceId,
    courseId: input.courseId,
    fetchStatus: input.fetchStatus,
    parseStatus: input.parseStatus,
    ...(input.comparison ? { machineComparison: input.comparison } : {}),
    comparability: input.comparability,
    ...(input.errorCode ? { errorCode: input.errorCode } : {}),
    recordedAt: input.now
  };
}

export function coverageFromObservations(
  observations: SourceObservationRecord[],
  scopeSourceIds: string[]
): CoverageFacts {
  const scope = new Set(scopeSourceIds);
  const succeeded: string[] = [];
  const failed: string[] = [];
  const missing: string[] = [];
  let permissionDenied = false;
  for (const observation of observations) {
    if (!scope.has(observation.sourceId)) continue;
    if (observation.fetchStatus === "permission-denied") {
      permissionDenied = true;
      failed.push(observation.sourceId);
      continue;
    }
    if (observation.fetchStatus === "ok" && observation.parseStatus === "ok") {
      succeeded.push(observation.sourceId);
      if (observation.machineComparison === "missing-after-successful-coverage") {
        missing.push(observation.sourceId);
      }
      continue;
    }
    failed.push(observation.sourceId);
  }
  const checked = new Set(observations.map((item) => item.sourceId));
  const scopeComplete = [...scope].every((id) => checked.has(id));
  return {
    checkedSourceIds: [...checked],
    succeededSourceIds: succeeded,
    failedSourceIds: failed,
    permissionDenied,
    partialCoverage: failed.length > 0 || !scopeComplete,
    scopeComplete,
    missingAfterCoverageSourceIds: missing
  };
}

/**
 * A Rebuild is not adoptable when ingestion itself left any Source unreadable. Task A failures
 * already live in staging; this helper joins them with the deterministic fetch/parse observations
 * for the same workflow so an incomplete ingest cannot look like a complete AI result.
 */
export function rebuildFailureSources(
  taskAFailedSources: Array<{ sourceId: string; errorCode: string }>,
  observations: SourceObservationRecord[]
): Array<{ sourceId: string; errorCode: string }> {
  const failures = new Map(taskAFailedSources.map((item) => [item.sourceId, item]));
  for (const observation of observations) {
    if (observation.fetchStatus === "ok" && observation.parseStatus === "ok") continue;
    if (failures.has(observation.sourceId)) continue;
    failures.set(observation.sourceId, {
      sourceId: observation.sourceId,
      errorCode: observation.errorCode ?? "SOURCE_NOT_COVERED"
    });
  }
  return [...failures.values()];
}

export function sourceRecordFor(input: {
  sourceId: string;
  courseId: string;
  nativeItemId: string;
  kind: string;
  title: string;
  parentSourceId?: string;
  machine?: SourceRecord["machine"];
  now: string;
}): SourceRecord {
  return {
    sourceId: input.sourceId,
    courseId: input.courseId,
    nativeItemId: input.nativeItemId,
    kind: input.kind,
    title: input.title,
    ...(input.parentSourceId ? { parentSourceId: input.parentSourceId } : {}),
    ...(input.machine ? { machine: input.machine } : {}),
    lastFetchedAt: input.now,
    updatedAt: input.now
  };
}
