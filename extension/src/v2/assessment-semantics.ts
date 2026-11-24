import { isRecord } from "@syllab/contracts";
import type { Stage } from "./architecture-session";
import type { RegistryRecord } from "./progressive-registry";
import { validateProvenance } from "./architecture-provenance";
import { sourceIndex, type ReadScope } from "./course-read";
import type { TaskAResult } from "./ai-contracts";

export const ASSESSMENT_SEMANTIC_POLICY = "assessment-relevance/4" as const;

/** Product semantics travel with the session protocol, not only the legacy prompts. */
export function assessmentSemantics(
  stage: Stage,
  policy: string = ASSESSMENT_SEMANTIC_POLICY
): string {
  return `SYLLAB PRODUCT PURPOSE AND SEMANTIC AUTHORITY (${policy})
Identify activities this course's students actually need to complete, submit, attend or be evaluated on, and their supported dates, requirements and grade weights. An Assessment is a relatively independent evaluated activity. A question, rubric row, example or subsection is not automatically an independent Assessment. Preserve Components under their actual activity rather than promoting them merely because they have marks.
A Source's presence in the course, an imperative question, a mark allocation, a familiar title, or its file name/year does not establish a current obligation. Historical papers, optional practice, teaching examples, journal articles and reference materials may describe assessed activities without assigning them to these students. Conversely a current instruction may explicitly assign or grade work using any of those materials. Never blacklist by words, filename, year or format. Evaluate source purpose, course context, assignment/submission/evaluation instructions, and contradictory evidence. Same title is not same identity: separate different activities, offerings, instances and components unless evidence links them. Do not invent dates, weights or current relevance. Missing/Partial/failed evidence is not evidence of absence.
Local validates shape, references and quotations only. You make semantic judgments. The user alone confirms trusted state.
${stage === "A" ? `A: understand this Source only. Preserve fileContext (purpose/audience/time/reference role with uncertainty), identityContext and unresolvedIssues alongside drafts; these travel to B1. Emit 0 drafts when the material only explains or exemplifies a topic. If a potential activity cannot be judged in this Source alone, retain its context and uncertainty for cross-Source B1. Describe parent activity/components and cite evidence; do not independently settle cross-Source relevance. Do not convert article abstracts, exam commands or consultation preparation into current Assessments. Course-wide constraints must actually apply across this course's assessments, not generic advice or one event's housekeeping.` : ""}
${
  stage === "B1"
    ? `B1: explicitly judge relevance BEFORE grouping, using all supplied drafts, sourceContexts and course context. SourceContexts include Sources with zero drafts and failed/partial terminals; inspect indexed original ranges when a related assignment instruction may establish or contradict relevance. A drafts and names are hypotheses, not proof. Preserve every draft disposition. Exclude clearly non-assigned reference/example material via excluded-invalid with a reason and nonempty supportingEvidence containing full original Evidence objects. Do not discard ambiguous plausible tasks: retain a standalone Group with UNCERTAIN relevance, its missing context and contradictory evidence. Do not force SAME from common vocabulary; use existing Different/Uncertain identity semantics.
Each Group payload MUST include relevance:{status:"CURRENT"|"UNCERTAIN",basis:"your evidence-grounded reasoning",supportingEvidence:[full Evidence objects],contradictoryEvidence:[full Evidence objects]}. CURRENT requires nonempty original Evidence supporting an actual course obligation (including explicit reassignment of old material); quotation of the question alone is insufficient. UNCERTAIN requires a concrete reason and preserves any available evidence; absence of an instruction is not proof of exclusion. Keep identity and relevance uncertainty distinct. Evidence for relevance may come from a different supplied Source than a member draft. B2 receives that evidence and those Source indexes. Rule relevance must also follow actual course scope, not generic academic advice.`
    : ""
}
${stage === "B2" ? `B2: preserve the supplied Group's identity AND relevance judgment. Do not upgrade UNCERTAIN to CURRENT, recreate excluded drafts, or turn an example question into a newly assigned task. Synthesize only supported fields and requirements; carry conflicting evidence and unresolvedIssues. A date/weight belonging to an old exam/example is not a current due date/course weight. Reference/source context is supplied alongside members. Existing final proposal schema and one-Group cardinality remain unchanged.` : ""}
${stage === "C" ? `C: compare only supplied objects, preserving relevance uncertainty and coverage gaps. An excluded reference item or unavailable Source alone does not prove removal of a trusted task. Never infer a new obligation from a quote or normalize away conflicting relevance evidence.` : ""}`;
}

/** Lossless context routing, not a local classification of any Source. */
export function assessmentSourceContexts(
  rows: Array<{ sourceId: string; result?: TaskAResult; error?: string }>,
  scope: ReadScope
) {
  return rows.map((row) => {
    const source = scope.sources.find((s) => s.sourceId === row.sourceId);
    return {
      sourceId: row.sourceId,
      index: source ? sourceIndex(source) : null,
      sourceResult: row.result?.sourceResult ?? null,
      error: row.error ?? null,
      fileContext: row.result?.fileContext ?? null,
      identityContext: row.result?.identityContext ?? null,
      structuralRelationships: row.result?.structuralRelationships ?? [],
      semanticInventory: row.result?.semanticInventory ?? [],
      sourceCoverage: row.result?.sourceCoverage ?? null,
      unresolvedIssues: row.result?.unresolvedIssues ?? []
    };
  });
}

/** Enforces an explicit AI decision + valid references; never tests keywords or meaning. */
export function validateAssessmentRelevance(group: RegistryRecord, scope: ReadScope): void {
  const r = group.payload.relevance;
  if (
    !isRecord(r) ||
    !["CURRENT", "UNCERTAIN"].includes(String(r.status)) ||
    typeof r.basis !== "string" ||
    !r.basis.trim() ||
    !Array.isArray(r.supportingEvidence) ||
    !Array.isArray(r.contradictoryEvidence)
  )
    throw Error("ASSESSMENT_RELEVANCE_REQUIRED");
  if (r.status === "CURRENT" && !r.supportingEvidence.length)
    throw Error("ASSESSMENT_RELEVANCE_SUPPORT_REQUIRED");
  validateProvenance(r, scope);
}

/** Cross-source obligation evidence stays readable by synthesis without broadening identity. */
export function relevanceSourceIds(group: RegistryRecord): string[] {
  const r = group.payload.relevance;
  if (!isRecord(r)) return [];
  return [r.supportingEvidence, r.contradictoryEvidence].flatMap((list) =>
    Array.isArray(list)
      ? list.flatMap((e) => (isRecord(e) && typeof e.sourceId === "string" ? [e.sourceId] : []))
      : []
  );
}

/** Mechanical projection of the AI judgment through the existing fact-state Review UI. */
export function relevanceFields(group: RegistryRecord): unknown[] {
  const r = group.payload.relevance;
  if (!isRecord(r)) return [];
  return [
    {
      fieldName: "Assessment relevance",
      state: r.status === "CURRENT" ? "KNOWN" : "UNCERTAIN",
      value: r.basis,
      competingValues: [],
      evidence: [...(r.supportingEvidence as unknown[]), ...(r.contradictoryEvidence as unknown[])]
    }
  ];
}

/** Excluded candidates remain auditable AI decisions, not silent dropped inputs. */
export function validateExcludedAssessment(record: RegistryRecord, scope: ReadScope): void {
  if (record.kind !== "draft-disposition" || record.payload.disposition !== "excluded-invalid")
    return;
  if (
    !Array.isArray(record.payload.supportingEvidence) ||
    !record.payload.supportingEvidence.length
  )
    throw Error("ASSESSMENT_EXCLUSION_SUPPORT_REQUIRED");
  validateProvenance(record.payload, scope);
}
