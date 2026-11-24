import { isRecord } from "@syllab/contracts";
import { validateProvenance } from "./architecture-provenance";
import { nativeDeliverySource } from "./native-delivery";
import { resolveDirectEvidence } from "./direct-evidence";
import type { SourceRecord } from "./schema";
import { ArchitectureError } from "./architecture-session";

/** Explicit model-selected wire references. No clause selection, rewriting or relevance inference. */
export function decodeDirectClaims(
  value: Record<string, unknown>,
  claims:
    | Array<{
        claimId: string;
        content: string;
        kind?: "requirement" | "field" | "rule";
        fieldDescriptor?: Record<string, unknown>;
      }>
    | undefined,
  enabled: boolean | undefined,
  exact?: boolean
): unknown {
  const known = new Map(claims?.map((c) => [c.claimId, c.content]));
  const kinds = new Map(claims?.map((c) => [c.claimId, c.kind]));
  const descriptors = new Map(claims?.map((c) => [c.claimId, c.fieldDescriptor]));
  const output = structuredClone(value.output);
  const walk = (node: unknown, path: string[]): void => {
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, [...path, String(i)]));
      return;
    }
    if (!isRecord(node)) return;
    const requirement =
      path.length === 4 && path[0] === "canonicalAssessmentProposals" && path[2] === "requirements";
    const rule = path.length === 2 && path[0] === "courseWideConstraintProposals";
    if (exact && (requirement || rule) && !("contentRef" in node) && !("contentRefs" in node)) {
      if (
        !Array.isArray(node.reconciledClaimIds) ||
        node.reconciledClaimIds.length ||
        typeof node.newClauseReason !== "string" ||
        !node.newClauseReason.trim()
      )
        throw new ArchitectureError("DIRECT_COURSE:CLAUSE_SELECTION_REQUIRED");
    }
    if ("fieldRef" in node) {
      const descriptor =
        typeof node.fieldRef === "string" ? descriptors.get(node.fieldRef) : undefined;
      if (
        !enabled ||
        value.contentEncoding !== "upstream-claim/1" ||
        path.length !== 4 ||
        path[0] !== "canonicalAssessmentProposals" ||
        path[2] !== "consolidatedFields" ||
        !descriptor ||
        ["fieldName", "state", "value", "competingValues", "evidence"].some((key) => key in node)
      )
        throw new ArchitectureError("DIRECT_COURSE:FIELD_REF");
      delete node.fieldRef;
      Object.assign(node, structuredClone(descriptor));
    }
    if (exact && (requirement || rule) && Array.isArray(node.reconciledClaimIds)) {
      const selected = "contentRefs" in node ? node.contentRefs : [node.contentRef];
      if (
        node.reconciledClaimIds.length &&
        (!Array.isArray(selected) ||
          selected.length !== node.reconciledClaimIds.length ||
          node.reconciledClaimIds.some((id) => !selected.includes(id)))
      )
        throw new ArchitectureError("DIRECT_COURSE:CLAUSE_ALIAS_LOSS");
    }
    if ("contentRefs" in node) {
      const field = requirement ? "content" : "normalizedRuleContent";
      const selected = node.contentRefs;
      if (
        !enabled ||
        value.contentEncoding !== "upstream-claim/1" ||
        (!requirement && !rule) ||
        !Array.isArray(selected) ||
        !selected.length ||
        new Set(selected).size !== selected.length ||
        "contentRef" in node ||
        field in node ||
        selected.some(
          (id) =>
            typeof id !== "string" ||
            !known.has(id) ||
            (kinds.get(id) !== undefined &&
              kinds.get(id) !== (requirement ? "requirement" : "rule"))
        )
      )
        throw new ArchitectureError("DIRECT_COURSE:DIRECT_CLAIM_REF");
      // Decode only the explicitly selected model references. No local relevance inference,
      // paraphrase or repair of an earlier single-reference answer.
      node[field] = [...new Set(selected.map((id: unknown) => known.get(String(id))))].join("\n\n");
      delete node.contentRefs;
    }
    if ("contentRef" in node) {
      const field = requirement ? "content" : "normalizedRuleContent";
      if (
        !enabled ||
        value.contentEncoding !== "upstream-claim/1" ||
        (!requirement && !rule) ||
        typeof node.contentRef !== "string" ||
        !known.has(node.contentRef) ||
        field in node ||
        (kinds.get(node.contentRef) !== undefined &&
          kinds.get(node.contentRef) !== (requirement ? "requirement" : "rule"))
      )
        throw new ArchitectureError("DIRECT_COURSE:DIRECT_CLAIM_REF");
      node[field] = known.get(node.contentRef);
      delete node.contentRef;
    }
    Object.entries(node).forEach(([key, item]) => walk(item, [...path, key]));
  };
  walk(output, []);
  return output;
}

/** Full syntactic accounting, not a semantic completeness verdict or gold endorsement. */
export function validateInlineClaimAudit(
  value: Record<string, unknown>,
  claims: Array<{ claimId: string }>,
  sources: SourceRecord[],
  includeFields = false
): void {
  if (
    value.claimAuditEncoding !== "inline/1" ||
    !isRecord(value.output) ||
    !Array.isArray(value.unmappedClaims)
  )
    throw new ArchitectureError("DIRECT_COURSE:DIRECT_INLINE_CLAIM_SHAPE");
  const known = new Set(claims.map((c) => c.claimId)),
    seen = new Set<string>();
  const account = (id: unknown) => {
    if (typeof id !== "string" || !known.has(id) || seen.has(id))
      throw new ArchitectureError("DIRECT_COURSE:DIRECT_INLINE_CLAIM_ID");
    seen.add(id);
  };
  const proposals = value.output.canonicalAssessmentProposals;
  const rules = value.output.courseWideConstraintProposals;
  if (!Array.isArray(proposals) || !Array.isArray(rules))
    throw new ArchitectureError("DIRECT_COURSE:DIRECT_INLINE_CLAIM_SHAPE");
  const asUnknowns = (v: unknown): unknown[] => (Array.isArray(v) ? (v as unknown[]) : []);
  const nodes: unknown[] = [
    ...asUnknowns(proposals).flatMap((p): unknown[] =>
      isRecord(p)
        ? [
            ...asUnknowns(p.requirements),
            ...(includeFields ? asUnknowns(p.consolidatedFields) : [])
          ]
        : []
    ),
    ...asUnknowns(rules)
  ];
  for (const node of nodes) {
    if (!isRecord(node) || !Array.isArray(node.reconciledClaimIds))
      throw new ArchitectureError("DIRECT_COURSE:DIRECT_INLINE_CLAIM_SHAPE");
    node.reconciledClaimIds.forEach(account);
    if (node.fieldRef !== undefined && !node.reconciledClaimIds.includes(node.fieldRef))
      throw new ArchitectureError("DIRECT_COURSE:DIRECT_INLINE_CLAIM_REFERENCE");
    if (node.contentRef !== undefined && !node.reconciledClaimIds.includes(node.contentRef))
      throw new ArchitectureError("DIRECT_COURSE:DIRECT_INLINE_CLAIM_REFERENCE");
  }
  for (const row of value.unmappedClaims) {
    if (
      !isRecord(row) ||
      !["NOT_APPLICABLE", "UNRESOLVED"].includes(String(row.disposition)) ||
      typeof row.reason !== "string" ||
      !row.reason.trim() ||
      !Array.isArray(row.evidence) ||
      !row.evidence.length ||
      !Array.isArray(row.outputRefs)
    )
      throw new ArchitectureError("DIRECT_COURSE:DIRECT_INLINE_CLAIM_UNMAPPED");
    account(row.claimId);
    const evidence = resolveDirectEvidence(row.evidence, sources);
    validateProvenance(
      { evidence },
      { sources: sources.map(nativeDeliverySource), evidence: [], objects: {} }
    );
    if (row.disposition === "UNRESOLVED" && !row.outputRefs.length)
      throw new ArchitectureError("DIRECT_COURSE:DIRECT_INLINE_CLAIM_REFERENCE");
    for (const ref of row.outputRefs) {
      if (
        typeof ref !== "string" ||
        !/^\/output\/(?:unresolvedIssues\/\d+|(?:canonicalAssessmentProposals|courseWideConstraintProposals)\/\d+\/unresolvedIssues\/\d+)$/u.test(
          ref
        )
      )
        throw new ArchitectureError("DIRECT_COURSE:DIRECT_INLINE_CLAIM_REFERENCE");
      let issue: unknown = value;
      for (const key of ref.slice(1).split("/")) {
        if (!isRecord(issue) && !Array.isArray(issue))
          throw new ArchitectureError("DIRECT_COURSE:DIRECT_INLINE_CLAIM_REFERENCE");
        issue = (issue as Record<string, unknown>)[key];
      }
      if (!isRecord(issue) || !Array.isArray(issue.evidence) || !issue.evidence.length)
        throw new ArchitectureError("DIRECT_COURSE:DIRECT_INLINE_CLAIM_REFERENCE");
    }
  }
  if (seen.size !== known.size)
    throw new ArchitectureError("DIRECT_COURSE:DIRECT_INLINE_CLAIM_COVERAGE");
}
