import { isRecord } from "@syllab/contracts";
import type { TaskAResult, TaskBResult } from "./ai-contracts";
import type { RegistryRecord } from "./progressive-registry";

/** Explicit wire-key aliases only, not text/date inference or semantic classification. */
export function canonicalOutputFieldName(name: string): string {
  switch (name) {
    case "dueDate":
      return "due_date";
    case "startDate":
      return "start_date";
    case "examDate":
      return "exam_date";
    default:
      return name;
  }
}

export const OUTPUT_CONTRACT = "assessment-output/2";
export const OUTPUT_KINDS = ["assignment", "project", "quiz_test", "exam", "other"] as const;
export const OUTPUT_ROLES = ["assessment", "component", "series", "series_instance"] as const;
export const OUTPUT_STATES = ["KNOWN", "UNCERTAIN", "EXPLICITLY_UNKNOWN"] as const;
function fail(code: string): never {
  throw Error(`ASSESSMENT_OUTPUT:${code}`);
}
const text = (v: unknown) => typeof v === "string" && !!v.trim();
const array = (v: unknown): unknown[] => (Array.isArray(v) ? v : fail("ARRAY"));
const unique = (xs: unknown[], key: string) => {
  const ids = xs.map((x) =>
    isRecord(x)
      ? key === "fieldName" && typeof x[key] === "string"
        ? canonicalOutputFieldName(x[key])
        : x[key]
      : undefined
  );
  if (ids.some((x) => !text(x)) || new Set(ids).size !== ids.length)
    fail(`DUPLICATE_OR_MISSING_${key}`);
};
const scalar = (v: unknown): boolean =>
  typeof v === "string" ||
  typeof v === "boolean" ||
  (typeof v === "number" && Number.isFinite(v)) ||
  (Array.isArray(v) &&
    v.length > 0 &&
    v.every(
      (x) =>
        typeof x === "string" ||
        typeof x === "boolean" ||
        (typeof x === "number" && Number.isFinite(x))
    ));

function supports(v: unknown): unknown[] {
  const refs = array(v);
  if (
    refs.some(
      (e) =>
        !isRecord(e) || !["evidenceId", "sourceId", "locator", "excerpt"].every((k) => text(e[k]))
    )
  )
    fail("EVIDENCE_SHAPE");
  return refs;
}
/** Shape only. Quotation/source identity remains validateProvenance's job. */
export function validateOutputField(v: unknown): void {
  if (!isRecord(v) || !text(v.fieldName) || !OUTPUT_STATES.includes(v.state as never))
    fail("FIELD");
  if (["__proto__", "constructor", "prototype"].includes(String(v.fieldName)))
    fail("FIELD_RESERVED_KEY");
  if (v.value !== undefined && v.value !== null && !scalar(v.value)) fail("FIELD_VALUE");
  if (v.state === "KNOWN" && (v.value == null || !scalar(v.value))) fail("KNOWN_VALUE");
  if (v.state === "EXPLICITLY_UNKNOWN" && v.value != null) fail("UNKNOWN_VALUE");
  if (!array(v.competingValues).every(scalar)) fail("COMPETING_VALUE");
  if (v.state !== "UNCERTAIN" && (v.competingValues as unknown[]).length) fail("CONFLICT_STATE");
  if (v.state !== "UNCERTAIN" && !supports(v.evidence).length) fail("FIELD_SUPPORT");
  supports(v.evidence);
}
export function validateOutputRequirement(v: unknown): void {
  if (!isRecord(v) || !text(v.requirementId) || !text(v.content) || "description" in v)
    fail("REQUIREMENT_CONTENT");
  if (!supports(v.evidence).length) fail("REQUIREMENT_SUPPORT");
}
function object(v: unknown, canonical: boolean): void {
  if (!isRecord(v)) fail("OBJECT");
  if (
    !text(v[canonical ? "proposalId" : "draftId"]) ||
    !text(v[canonical ? "canonicalName" : "name"])
  )
    fail("OBJECT_ID_NAME");
  if (
    canonical &&
    ["components", "seriesInstances", "structuralRelationships", "identityResolutions"].some(
      (k) => k in v
    )
  )
    fail("B2_NESTED_STRUCTURE");
  if (!OUTPUT_KINDS.includes(v.type as never)) fail("TYPE_ENUM");
  if (!OUTPUT_ROLES.includes(v.role as never)) fail("ROLE_ENUM");
  if (!array(v.aliases).every(text)) fail("ALIASES");
  const fields = array(v[canonical ? "consolidatedFields" : "fields"]);
  unique(fields, "fieldName");
  fields.forEach(validateOutputField);
  const requirements = array(v.requirements);
  unique(requirements, "requirementId");
  requirements.forEach(validateOutputRequirement);
  array(v.unresolvedIssues);
  if (canonical && !supports(v.supportingEvidence).length) fail("PROPOSAL_SUPPORT");
}
export function validateOutputA(result: TaskAResult): void {
  if (!text(result.fileContext) || !text(result.identityContext)) fail("SOURCE_CONTEXT");
  unique(result.assessmentDrafts, "draftId");
  result.assessmentDrafts.forEach((v) => object(v, false));
  const ids = new Set(result.assessmentDrafts.map((v) => (v as Record<string, unknown>).draftId));
  for (const raw of result.assessmentDrafts) {
    const v = raw as Record<string, unknown>;
    if (
      v.parentDraftId !== undefined &&
      (!ids.has(v.parentDraftId) || v.parentDraftId === v.draftId)
    )
      fail("PARENT_DRAFT");
  }
  if (
    result.sourceResult === "NO_RELEVANT_INFORMATION" &&
    (result.assessmentDrafts.length || result.courseWideConstraintCandidates.length)
  )
    fail("NO_INFORMATION_WITH_OUTPUT");
}
export function validateGroupStructure(groups: RegistryRecord[]): void {
  for (const group of groups) {
    const role = group.payload.role ?? "assessment";
    if (!OUTPUT_ROLES.includes(role as never)) fail("GROUP_ROLE");
    let current: RegistryRecord | undefined = group;
    const visited = new Set<string>();
    for (;;) {
      if (visited.has(current.id)) fail("GROUP_PARENT_CYCLE");
      visited.add(current.id);
      const parent: unknown = current.payload.parentGroupId;
      if (parent == null) break;
      current = groups.find((g) => g.id === parent);
      if (!current) fail("GROUP_PARENT");
    }
    if ((role === "component" || role === "series_instance") !== text(group.payload.parentGroupId))
      fail("GROUP_PARENT_ROLE");
  }
}
/** Stage ownership checked before nested payloads; an invalid whole output is never sanitized. */
export function validateOutputB2(value: unknown, result: TaskBResult, group: RegistryRecord): void {
  if (
    result.identityResolutions.length ||
    result.structuralRelationships.length ||
    result.courseWideConstraintProposals.length
  )
    fail("B2_AUTHORITY");
  if (result.canonicalAssessmentProposals.length !== 1) fail("B2_CARDINALITY");
  if (
    !isRecord(value) ||
    !isRecord(value.upstream) ||
    value.upstream.groupId !== group.id ||
    value.upstream.revision !== group.revision ||
    JSON.stringify(value.upstream.memberDraftIds) !== JSON.stringify(group.payload.memberDraftIds)
  )
    fail("B2_UPSTREAM");
  const raw = result.canonicalAssessmentProposals[0];
  object(raw, true);
  const proposal = raw as Record<string, unknown>;
  if (
    proposal.role !== (group.payload.role ?? "assessment") ||
    proposal.componentOfProposalId != null
  )
    fail("B2_STRUCTURE");
  validateConsolidations(result);
  const auditKeys = result.fieldConsolidationResults.map((raw) =>
    isRecord(raw) ? JSON.stringify([raw.proposalId, raw.fieldName]) : ""
  );
  if (new Set(auditKeys).size !== auditKeys.length) fail("CONSOLIDATION_DUPLICATE");
  for (const raw of result.fieldConsolidationResults) {
    if (
      !isRecord(raw) ||
      !Array.isArray(raw.contributingDrafts) ||
      raw.contributingDrafts.some((id) => !(group.payload.memberDraftIds as unknown[]).includes(id))
    )
      fail("CONSOLIDATION_UPSTREAM");
  }
}
export function validateOutputB(result: TaskBResult): void {
  unique(result.canonicalAssessmentProposals, "proposalId");
  result.canonicalAssessmentProposals.forEach((v) => object(v, true));
  validateConsolidations(result);
}
export function validateConsolidations(result: TaskBResult): void {
  for (const raw of result.fieldConsolidationResults) {
    if (!isRecord(raw) || !text(raw.proposalId)) fail("CONSOLIDATION_OWNER");
    const p = result.canonicalAssessmentProposals.find(
      (p) => isRecord(p) && p.proposalId === raw.proposalId
    ) as Record<string, unknown> | undefined;
    const fields = p?.consolidatedFields;
    const f: unknown = Array.isArray(fields)
      ? fields.find((f) => isRecord(f) && f.fieldName === raw.fieldName)
      : undefined;
    validateOutputField({
      fieldName: raw.fieldName,
      state: raw.consolidatedState,
      value: raw.consolidatedValue,
      competingValues: raw.competingValues,
      evidence: raw.evidence
    });
    if (
      !isRecord(f) ||
      f.state !== raw.consolidatedState ||
      JSON.stringify(f.value ?? null) !== JSON.stringify(raw.consolidatedValue ?? null) ||
      JSON.stringify(f.competingValues) !== JSON.stringify(raw.competingValues) ||
      JSON.stringify(f.evidence) !== JSON.stringify(raw.evidence)
    )
      fail("CONSOLIDATION_CONTRADICTION");
    array(raw.contributingDrafts);
    array(raw.conflicts);
  }
}

/** Shared precise wire vocabulary; never asks Local to infer a kind or fix a semantic verdict. */
export function outputInstructions(stage: string): string {
  return `${OUTPUT_CONTRACT}: STRICT OUTPUT SHAPES. type must be exactly ${OUTPUT_KINDS.join("|")}; choose the classification semantically, use other explicitly only if appropriate, never free-text type. role must be ${OUTPUT_ROLES.join("|")}.
Date field names are due_date/deadline, start_date, exam_date or date, matching the existing Review/calendar contract. dueDate/startDate/examDate are explicit wire aliases only; Local never guesses date applicability.
Fields: {fieldName,state:${OUTPUT_STATES.join("|")},value:scalar|null,competingValues:[scalar],evidence:[full Evidence]}. Objects/arrays of objects are not scalar values. KNOWN needs a value and original evidence establishing its applicability to this current activity, not merely a date in metadata; EXPLICITLY_UNKNOWN needs original evidence explicitly declaring unknown, null value and no conflicts. Omit fields not mentioned. UNCERTAIN preserves competing values and both sides of original evidence. Requirements: {requirementId,content:exact authored requirement text,evidence:[full Evidence]}; content is mandatory, description is NOT a requirement key. IDs and field names unique within their owner. Do not duplicate consolidated facts as requirements unless distinct requirements actually exist.
${stage === "A" ? "A must supply fileContext and identityContext as nonempty JSON STRINGS (narrative prose, NEVER nested objects or arrays), even with 0 drafts: explain purpose/time/context and unknowns rather than omit. Source-local parentDraftId must reference a distinct supplied Draft. NO_RELEVANT_INFORMATION has no drafts or rules." : ""}
${stage === "B1" ? "Each Group must specify role and parentGroupId:null or exact other Group ID. Only B1 establishes component/series ownership; no parent cycles. Component/series_instance require a parent; assessment/series have no parent. All component Drafts retain dispositions and their Group ownership. B2 cannot infer new identities." : ""}
${stage === "B2" ? "B2 proposal.role must equal Group.payload.role; a legacy Group omitting role means assessment by the Group schema, never inferred from a title. Never set componentOfProposalId; Local binds only B1's explicit parent Group IDs. identityResolutions/structuralRelationships/courseWideConstraintProposals MUST be empty. Do not describe guidelines/schedules/links as structural identity. Relevant component details are supported fields/requirements within the assigned Group. If emitting fieldConsolidationResults use {proposalId,fieldName,consolidatedState,consolidatedValue,competingValues:[],evidence:[],contributingDrafts:[],conflicts:[]}; it must match that proposal's consolidatedFields exactly. Prefer [] when no separate audit is needed. Include unresolvedIssues with description and evidence. Never make an old Source metadata date current merely because it is literally present." : ""}`;
}
