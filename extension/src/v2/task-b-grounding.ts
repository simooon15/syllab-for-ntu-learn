import { AI_SCHEMAS } from "./contract-registry";
import { isRecord } from "@syllab/contracts";
import { stableDigest } from "./chunking";
import { stableStringify } from "./crypto";
import { TASK_B_SCHEMA, validateTaskB, type AiEvidence, type TaskBResult } from "./ai-contracts";
import { assertNoProductInstructions, assertSuppliedEvidence } from "./ai-pipeline";

export const GROUNDED_B_SCHEMA = AI_SCHEMAS.groundedB;
export const B_CATEGORIES = [
  "identityResolutions",
  "canonicalAssessmentProposals",
  "courseWideConstraintProposals",
  "fieldConsolidationResults",
  "structuralRelationships",
  "unresolvedIssues"
] as const;
type Category = (typeof B_CATEGORIES)[number];
export interface BItemCheckpoint {
  itemId: string;
  category: Category;
  inputRefs: string[];
  dependencies: string[];
  status: "verified" | "unresolved";
  payload?: unknown;
  error?: string;
  errorIdentity?: string;
  stage: "task-b/item-validation";
  recordedAt: string;
}
export interface BCheckpoint {
  schema: typeof GROUNDED_B_SCHEMA;
  registryHash: string;
  items: BItemCheckpoint[];
  status: "verified" | "partial";
  result: TaskBResult;
  recordedAt: string;
  pendingEvidenceRequests: number;
}
export function evidenceRegistry(evidence: AiEvidence[]): Map<string, AiEvidence> {
  const registry = new Map<string, AiEvidence>();
  for (const item of evidence) {
    if (!item.evidenceId || !item.sourceId || !item.locator || !item.excerpt)
      throw new Error("B_REGISTRY_INVALID_RECORD");
    const ref = `e:${stableDigest(item.evidenceId)}`;
    const previous = registry.get(ref);
    if (previous && stableStringify(previous) !== stableStringify(item))
      throw new Error("B_REGISTRY_COLLISION");
    registry.set(ref, item);
  }
  return registry;
}
export function emptyB(): TaskBResult {
  return {
    schema: TASK_B_SCHEMA,
    identityResolutions: [],
    canonicalAssessmentProposals: [],
    courseWideConstraintProposals: [],
    fieldConsolidationResults: [],
    structuralRelationships: [],
    unresolvedIssues: []
  };
}
/** Exact registered lookup, never a semantic substitute, inferred quote or guessed ID. */
export function resolveBRefs(value: unknown, registry: Map<string, AiEvidence>, key = ""): unknown {
  if (Array.isArray(value))
    return value.map((item) => {
      if (
        ["evidence", "supportingEvidence", "contradictoryEvidence", "relevantEvidence"].includes(
          key
        )
      ) {
        if (typeof item !== "string" || !registry.has(item))
          throw new Error("B_UNKNOWN_EVIDENCE_REF");
        return { ...registry.get(item) };
      }
      if (key === "evidenceRefs") {
        if (typeof item !== "string" || !registry.has(item))
          throw new Error("B_UNKNOWN_EVIDENCE_REF");
        return registry.get(item)?.evidenceId;
      }
      return resolveBRefs(item, registry);
    });
  if (!isRecord(value)) return value;
  if ("evidenceId" in value || "excerpt" in value)
    throw new Error("B_FREE_TEXT_EVIDENCE_FORBIDDEN");
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, resolveBRefs(v, registry, k)])
  );
}
function strings(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string" && v.length > 0))
    throw new Error("B_ITEM_REFS_SHAPE");
  return value as string[];
}
function validatePayloadShape(value: unknown): void {
  if (Array.isArray(value)) {
    for (const entry of value) validatePayloadShape(entry);
    return;
  }
  if (!isRecord(value)) return;
  if ("fieldName" in value) {
    if (
      typeof value.fieldName !== "string" ||
      !value.fieldName ||
      !["KNOWN", "EXPLICITLY_UNKNOWN", "UNCERTAIN"].includes(String(value.state)) ||
      !Array.isArray(value.evidence) ||
      !Array.isArray(value.competingValues)
    )
      throw new Error("B_FIELD_SHAPE");
  }
  if (
    "requirementId" in value &&
    (typeof value.content !== "string" || !value.content || !Array.isArray(value.evidence))
  )
    throw new Error("B_REQUIREMENT_SHAPE");
  for (const entry of Object.values(value)) validatePayloadShape(entry);
}
/** Each item is isolated before dependency closure. Failed siblings remain explicit diagnostics. */
export function checkpointTaskB(
  value: unknown,
  evidence: AiEvidence[],
  knownSources: ReadonlySet<string>,
  knownInputs: ReadonlySet<string>,
  recordedAt: string
): BCheckpoint {
  if (!isRecord(value) || value.schema !== GROUNDED_B_SCHEMA || !Array.isArray(value.items))
    throw new Error("B_ENVELOPE_SHAPE");
  const registry = evidenceRegistry(evidence);
  const seen = new Set<string>();
  const items: BItemCheckpoint[] = value.items.map((raw, index) => {
    const base: BItemCheckpoint = {
      itemId:
        isRecord(raw) && typeof raw.itemId === "string" ? raw.itemId : `invalid:${String(index)}`,
      category: "unresolvedIssues",
      inputRefs: [],
      dependencies: [],
      status: "unresolved",
      recordedAt,
      stage: "task-b/item-validation"
    };
    try {
      if (!isRecord(raw) || typeof raw.itemId !== "string" || !raw.itemId || seen.has(raw.itemId))
        throw new Error("B_ITEM_ID_INVALID");
      seen.add(raw.itemId);
      if (!B_CATEGORIES.includes(raw.category as Category)) throw new Error("B_ITEM_CATEGORY");
      base.category = raw.category as Category;
      base.inputRefs = strings(raw.inputRefs);
      base.dependencies = strings(raw.dependencies);
      if (!base.inputRefs.length || base.inputRefs.some((ref) => !knownInputs.has(ref)))
        throw new Error("B_ITEM_INPUT_UNKNOWN");
      assertNoProductInstructions(raw.payload);
      const payload = resolveBRefs(raw.payload, registry);
      if (!isRecord(payload)) throw new Error("B_ITEM_PAYLOAD_SHAPE");
      validatePayloadShape(payload);
      if (
        base.category === "canonicalAssessmentProposals" &&
        (!["assignment", "project", "quiz_test", "exam", "other"].includes(String(payload.type)) ||
          !["assessment", "component", "series", "series_instance"].includes(
            String(payload.role)
          ) ||
          ["aliases", "consolidatedFields", "requirements", "unresolvedIssues"].some(
            (key) => !Array.isArray(payload[key])
          ))
      )
        throw new Error("B_CANONICAL_SHAPE");
      if (
        base.category === "fieldConsolidationResults" &&
        (typeof payload.targetObjectId !== "string" || !Array.isArray(payload.fields))
      )
        throw new Error("B_FIELD_CONSOLIDATION_SHAPE");
      if (
        base.category === "structuralRelationships" &&
        (typeof payload.fromObjectId !== "string" ||
          typeof payload.toObjectId !== "string" ||
          typeof payload.relationship !== "string")
      )
        throw new Error("B_RELATIONSHIP_SHAPE");
      if (
        base.category === "unresolvedIssues" &&
        (typeof payload.issueId !== "string" ||
          typeof payload.description !== "string" ||
          !Array.isArray(payload.relevantEvidence))
      )
        throw new Error("B_UNRESOLVED_SHAPE");
      const one = { ...emptyB(), [base.category]: [payload] };
      validateTaskB(one, knownSources);
      assertSuppliedEvidence(payload, evidence);
      if (
        base.category === "canonicalAssessmentProposals" &&
        (typeof payload.proposalId !== "string" ||
          typeof payload.canonicalName !== "string" ||
          !payload.canonicalName ||
          !Array.isArray(payload.supportingEvidence) ||
          !payload.supportingEvidence.length)
      )
        throw new Error("B_PROPOSAL_SHAPE");
      if (
        base.category === "courseWideConstraintProposals" &&
        (typeof payload.proposalId !== "string" ||
          typeof payload.normalizedRuleContent !== "string" ||
          !payload.normalizedRuleContent ||
          !Array.isArray(payload.supportingEvidence) ||
          !payload.supportingEvidence.length)
      )
        throw new Error("B_CONSTRAINT_SHAPE");
      base.payload = payload;
      base.status = "verified";
    } catch (error) {
      base.error = error instanceof Error ? error.message : "B_ITEM_UNEXPECTED";
      base.errorIdentity = stableDigest(base.error);
    }
    return base;
  });
  const owners = new Map<string, string>();
  for (const item of items)
    if (isRecord(item.payload) && typeof item.payload.proposalId === "string")
      owners.set(item.payload.proposalId, item.itemId);
  function referencedObjects(value: unknown, key = ""): string[] {
    if (Array.isArray(value)) return value.flatMap((v) => referencedObjects(v, key));
    if (isRecord(value)) return Object.entries(value).flatMap(([k, v]) => referencedObjects(v, k));
    return typeof value === "string" &&
      [
        "involvedObjectIds",
        "componentOfProposalId",
        "parentProposalId",
        "targetObjectId",
        "fromObjectId",
        "toObjectId"
      ].includes(key)
      ? [value]
      : [];
  }
  for (const item of items)
    if (item.status === "verified")
      for (const ref of referencedObjects(item.payload)) {
        const owner = owners.get(ref);
        if (
          !knownInputs.has(ref) &&
          (!owner || (owner !== item.itemId && !item.dependencies.includes(owner)))
        ) {
          item.status = "unresolved";
          item.error = "B_UNDECLARED_OR_UNKNOWN_DEPENDENCY";
        }
      }
  // Duplicate identities make every duplicate unresolved; never accept the first by position.
  for (const item of items)
    if (items.filter((s) => s.itemId === item.itemId).length > 1) {
      item.status = "unresolved";
      item.error = "B_DUPLICATE_ITEM_ID";
    }
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of items)
      if (
        item.status === "verified" &&
        item.dependencies.some(
          (id) => !items.some((s) => s.itemId === id && s.status === "verified")
        )
      ) {
        item.status = "unresolved";
        item.error = "B_DEPENDENCY_UNRESOLVED";
        changed = true;
      }
  }
  // A dependency cycle cannot establish an independently verified dependency closure.
  function cyclic(id: string, path: Set<string>): boolean {
    if (path.has(id)) return true;
    const item = items.find((s) => s.itemId === id);
    return item?.dependencies.some((dep) => cyclic(dep, new Set([...path, id]))) ?? false;
  }
  for (const item of items)
    if (item.status === "verified" && cyclic(item.itemId, new Set())) {
      item.status = "unresolved";
      item.error = "B_DEPENDENCY_CYCLE";
    }
  // Cycle invalidation is also a dependency failure. Propagate it to every dependent,
  // regardless of response order, while leaving independent siblings untouched.
  changed = true;
  while (changed) {
    changed = false;
    for (const item of items)
      if (
        item.status === "verified" &&
        item.dependencies.some(
          (id) => !items.some((s) => s.itemId === id && s.status === "verified")
        )
      ) {
        item.status = "unresolved";
        item.error = "B_DEPENDENCY_UNRESOLVED";
        changed = true;
      }
  }
  const result = emptyB();
  for (const category of B_CATEGORIES)
    (result[category] as unknown[]).push(
      ...items
        .filter((i) => i.category === category && i.status === "verified")
        .map((i) => i.payload)
    );
  return {
    schema: GROUNDED_B_SCHEMA,
    registryHash: stableDigest(stableStringify([...registry])),
    items,
    status:
      (!Array.isArray(value.requestedEvidenceRefs) || value.requestedEvidenceRefs.length === 0) &&
      items.length > 0 &&
      items.every((i) => i.status === "verified")
        ? "verified"
        : "partial",
    result,
    recordedAt,
    pendingEvidenceRequests: Array.isArray(value.requestedEvidenceRefs)
      ? value.requestedEvidenceRefs.length
      : 0
  };
}

/** Preserve verified checkpoints across progress-driven expansion; conflicting revisions stay explicit. */
export function mergeBCheckpoints(
  previous: BCheckpoint | undefined,
  next: BCheckpoint
): BCheckpoint {
  if (!previous) return next;
  const items = [...next.items];
  for (const old of previous.items.filter((i) => i.status === "verified")) {
    const index = items.findIndex((i) => i.itemId === old.itemId);
    if (index < 0) items.push(old);
    else {
      const replacement = items[index];
      if (
        replacement?.status !== "verified" ||
        stableStringify(replacement.payload) !== stableStringify(old.payload)
      ) {
        items[index] = old;
        items.push({
          ...old,
          itemId: `conflict:${old.itemId}`,
          status: "unresolved",
          payload: undefined,
          error: "B_VERIFIED_CHECKPOINT_REVISION_CONFLICT",
          recordedAt: next.recordedAt
        });
      }
    }
  }
  const result = emptyB();
  for (const category of B_CATEGORIES)
    (result[category] as unknown[]).push(
      ...items
        .filter((i) => i.category === category && i.status === "verified")
        .map((i) => i.payload)
    );
  return {
    ...next,
    items,
    result,
    status:
      items.every((i) => i.status === "verified") && !next.pendingEvidenceRequests
        ? "verified"
        : "partial"
  };
}
