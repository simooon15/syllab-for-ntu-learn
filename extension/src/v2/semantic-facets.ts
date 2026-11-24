import { isRecord } from "@syllab/contracts";
import { AI_SCHEMAS } from "./contract-registry";
import {
  validateSemanticUnits,
  validateCoverageDecisions,
  type SemanticUnit
} from "./assessment-coverage";
import { validateProvenance } from "./architecture-provenance";
import { sourceUnits, type ReadScope } from "./course-read";
import type { TaskBResult } from "./ai-contracts";
export interface SemanticFacet extends SemanticUnit {
  parentUnitId: string | null;
  modality:
    "command" | "prohibition" | "permission" | "condition" | "exception" | "fact" | "context";
}
export interface FacetInventory {
  schema: typeof AI_SCHEMAS.facets | typeof AI_SCHEMAS.facetsLegacy;
  nativeAudit?: Array<{
    sourceId: string;
    locator: string;
    status: "EXAMINED" | "UNRESOLVED";
    facetIds: string[];
    reason: string;
    evidence: unknown[];
  }>;
  unitReviews: Array<{ unitId: string; facetIds: string[]; reason: string }>;
  facets: SemanticFacet[];
  unresolvedIssues: unknown[];
}
/** Full admitted native bytes, not an index or a Local semantic summary. */
export const nativeFacetContent = (scope: ReadScope) =>
  scope.sources.flatMap((source) =>
    sourceUnits(source).map((unit) => ({ ...unit, sourceId: source.sourceId }))
  );

/** Independent AI decomposition; Local accounts for every parent and every facet, not their meaning. */
export function validateFacetInventory(
  value: unknown,
  upstream: SemanticUnit[],
  scope: ReadScope,
  options: { allowLegacy?: boolean } = {}
): FacetInventory {
  if (
    !isRecord(value) ||
    (value.schema !== AI_SCHEMAS.facets &&
      !(options.allowLegacy && value.schema === AI_SCHEMAS.facetsLegacy)) ||
    !Array.isArray(value.unitReviews) ||
    !Array.isArray(value.facets) ||
    !Array.isArray(value.unresolvedIssues)
  )
    throw Error("SEMANTIC_FACETS:SHAPE");
  const facets = validateSemanticUnits(
    value.facets,
    new Set(scope.sources.map((s) => s.sourceId))
  ) as SemanticFacet[];
  const seen = new Set<string>(),
    used = new Set<string>();
  for (const row of value.unitReviews as unknown[]) {
    if (
      !isRecord(row) ||
      typeof row.unitId !== "string" ||
      seen.has(row.unitId) ||
      !upstream.some((u) => u.unitId === row.unitId) ||
      typeof row.reason !== "string" ||
      !row.reason.trim() ||
      !Array.isArray(row.facetIds) ||
      !row.facetIds.length
    )
      throw Error("SEMANTIC_FACETS:PARENT");
    seen.add(row.unitId);
    for (const id of row.facetIds) {
      const f = facets.find((f) => f.unitId === id);
      const parent = upstream.find((u) => u.unitId === row.unitId);
      if (
        !f ||
        !parent ||
        f.parentUnitId !== row.unitId ||
        used.has(String(id)) ||
        ![
          "command",
          "prohibition",
          "permission",
          "condition",
          "exception",
          "fact",
          "context"
        ].includes(f.modality)
      )
        throw Error("SEMANTIC_FACETS:MEMBER");
      used.add(String(id));
    }
  }
  const nativeDiscoveries = facets.filter((f) => f.parentUnitId === null);
  if (
    seen.size !== upstream.length ||
    used.size + nativeDiscoveries.length !== facets.length ||
    (value.schema === AI_SCHEMAS.facetsLegacy && nativeDiscoveries.length)
  )
    throw Error("SEMANTIC_FACETS:MISSING");
  if (
    nativeDiscoveries.some(
      (f) =>
        ![
          "command",
          "prohibition",
          "permission",
          "condition",
          "exception",
          "fact",
          "context"
        ].includes(f.modality)
    )
  )
    throw Error("SEMANTIC_FACETS:MEMBER");
  if (value.schema === AI_SCHEMAS.facets) {
    if (!Array.isArray(value.nativeAudit)) throw Error("SEMANTIC_FACETS:NATIVE_AUDIT");
    const expected = new Map(
      scope.sources.flatMap((source) =>
        sourceUnits(source).map((u) => [JSON.stringify([source.sourceId, u.locator]), u] as const)
      )
    );
    const audited = new Set<string>(),
      accounted = new Set<string>();
    for (const row of value.nativeAudit as unknown[]) {
      if (
        !isRecord(row) ||
        typeof row.sourceId !== "string" ||
        typeof row.locator !== "string" ||
        typeof row.reason !== "string" ||
        !row.reason.trim() ||
        !Array.isArray(row.facetIds) ||
        !Array.isArray(row.evidence)
      )
        throw Error("SEMANTIC_FACETS:NATIVE_AUDIT");
      const key = JSON.stringify([row.sourceId, row.locator]),
        unit = expected.get(key);
      if (!unit || audited.has(key) || !["EXAMINED", "UNRESOLVED"].includes(String(row.status)))
        throw Error("SEMANTIC_FACETS:NATIVE_RANGE");
      audited.add(key);
      if (row.status === "UNRESOLVED") {
        if (!(value.unresolvedIssues as unknown[]).length)
          throw Error("SEMANTIC_FACETS:NATIVE_GAP");
      } else if (
        !row.evidence.length ||
        row.evidence.some(
          (e) => !isRecord(e) || e.sourceId !== row.sourceId || e.locator !== row.locator
        ) ||
        (unit.partial && !scope.rendered?.has(`${row.sourceId}:${row.locator}`))
      )
        throw Error("SEMANTIC_FACETS:NATIVE_SUPPORT");
      const listed = new Set<string>();
      for (const id of row.facetIds) {
        const f = facets.find((f) => f.unitId === id);
        if (
          typeof id !== "string" ||
          listed.has(id) ||
          !f ||
          !f.evidence.some(
            (e) => isRecord(e) && e.sourceId === row.sourceId && e.locator === row.locator
          )
        )
          throw Error("SEMANTIC_FACETS:NATIVE_FACET");
        listed.add(id);
        accounted.add(id);
      }
    }
    if (audited.size !== expected.size || accounted.size !== facets.length)
      throw Error("SEMANTIC_FACETS:NATIVE_MISSING");
  }
  validateProvenance(value, scope);
  return value as unknown as FacetInventory;
}
export function validateFacetSynthesis(
  result: TaskBResult,
  inventory: FacetInventory,
  scope: ReadScope
): void {
  if ((result.semanticInventory?.length ?? 0) > 0)
    throw Error("SEMANTIC_FACETS:UNREVIEWED_DISCOVERY");
  validateCoverageDecisions(result, inventory.facets, scope, { collectiveTargets: true });
  validateProvenance(result, scope);
}
export function facetInstructions(phase: "facets" | "synthesis"): string {
  return phase === "facets"
    ? `B2 INVENTORY PHASE: do not synthesize a canonical proposal yet. Output ONLY {schema:"${AI_SCHEMAS.facets}",unitReviews:[{unitId:exact input semanticInventory parent ID,facetIds:[exact facet IDs],reason:explain decomposition and all meaningful clauses}],facets:[{unitId:new unique facet ID,parentUnitId:exact parent ID or null for a native discovery absent from all supplied parents,sourceId:exact Source ID of at least one supporting Evidence quote,kind:obligation|requirement|fact|rule|context,modality:command|prohibition|permission|condition|exception|fact|context,content,evidence:[original Evidence or negotiated reference]}],nativeAudit:[{sourceId,locator,status:EXAMINED|UNRESOLVED,facetIds:[exact supported facet IDs,possibly empty for scoped background content],reason,evidence:[original quotes from this range]}],unresolvedIssues:[]}. Inspect ORIGINAL native content first, not only the supplied parent inventory. Review EVERY indexed native locator in scope exactly once; retrieve indexed ranges with requestedReads when text is not supplied. An index or a prior hypothesis is not proof of examined content. EXAMINED requires native quoted support; Partial/unread ranges remain UNRESOLVED with an issue unless the missing native visual has actually been rendered. Enumerate all applicable independent commands, prohibitions, permissions, conditions, exceptions and important facts from original ranges. A meaningful native clause missing from parents has a new facet with parentUnitId:null; list it in its supported nativeAudit range. Do not force a discovery under an unrelated parent or silently omit it. NativeAudit dispositions and reasons concern this fixed Group; unrelated activities/course-wide Rules requiring A/B1 authority remain explicit issues, never new Groups or B2 Rule proposals. Review EVERY supplied parent, including prior hypotheses and source-local context. A facet sourceId is the native Source supporting its meaning, not automatically the parent sourceId. A facet may use another supplied Source to resolve or contrast a parent hypothesis, but its sourceId MUST exactly match at least one quoted Evidence.sourceId. Never copy a parent sourceId while all your citations are from another Source. Split independent obligations, negation/prohibition, conditions and exceptions; keep permission optional and facts distinct. Classify normative force from original Evidence, never from the inherited requirement label. Each facet is single independently judged meaning with original quoted support. Split distinct commands even when they share one bullet or quote; do not put both a prohibition and a retention command in one facet. Never drop a clause because another clause has the same evidence. A context unit can have context facets. If native source exposes an unrepresented meaningful instruction, add a native-discovery facet with parentUnitId:null or preserve an unresolvedIssue; never claim that absent native content was examined. This first phase makes semantics explicit before aggregation; does not fix current relevance locally. Your final outer session envelope is still required. No TaskB proposals in this phase.`
    : `B2 SYNTHESIS PHASE: facetInventory is an independently authored decomposition, whose IDs and source lineage are fixed for this synthesis; its prose and modality are still hypotheses. Re-evaluate normative force against ORIGINAL quoted Evidence before authoring each target. If an inherited command label overstates an offer, permission or recommendation, correct the target to preserve the source meaning and explicitly explain the discrepancy in the decision reason. If force cannot be established, retain a visible UNCERTAIN field and issue rather than emitting a stronger obligation. Use its facets as semanticInventory input; exactly one coverageDecision per facet ID. Preserve each facet's FULL meaning and original polarity, condition, exception and optional permission. A MERGE reason must state why the target content retains that exact facet, not just "same requirement". Evidence sharing and a target ID alone are insufficient. A permission belongs in a Fact or optional instruction, never strengthened to obligation. Judge applicability from source/course context; EXCLUDE needs specific evidence and rationale, UNCERTAIN needs a visible UNCERTAIN field. Do not invent new facet IDs at synthesis; record unresolved discoveries for a subsequent explicit inventory revision instead. Output the exact TaskB schema/proposal, membership and authority already supplied. No Local-generated contents are added to your proposal.`;
}
