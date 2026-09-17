import type { CandidateRecord } from "../ai/domain";
import type { BriefItem } from "../brief/domain";
import type { ReviewCandidate } from "../review/domain";

function inferredSemanticKey(
  item: BriefItem,
  prior: readonly ReviewCandidate[]
): string | undefined {
  return (
    item.semanticKey ??
    prior.find((candidate) => item.sourceCandidateRefs.includes(candidate.candidateId))?.semanticKey
  );
}

function inferredParentKey(
  item: BriefItem,
  items: readonly BriefItem[],
  prior: readonly ReviewCandidate[]
): string | undefined {
  if (item.parentSemanticKey) return item.parentSemanticKey;
  const parent = item.parentBriefItemId
    ? items.find((candidate) => candidate.briefItemId === item.parentBriefItemId)
    : undefined;
  return parent ? inferredSemanticKey(parent, prior) : undefined;
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function reconcileScanAgain(
  candidates: readonly CandidateRecord[],
  briefItems: readonly BriefItem[],
  priorCandidates: readonly ReviewCandidate[]
): { candidates: CandidateRecord[]; briefItems: BriefItem[]; linkedCount: number } {
  const brief: BriefItem[] = briefItems.map((item) => structuredClone(item));
  const remaining: CandidateRecord[] = [];
  let linkedCount = 0;
  for (const candidate of candidates) {
    const match = brief.find(
      (item) =>
        item.origin === "candidate" &&
        item.status === "Confirmed" &&
        item.kind === candidate.kind &&
        inferredSemanticKey(item, priorCandidates) === candidate.semanticKey &&
        sameValue(item.currentValue, candidate.proposedValue) &&
        (item.scope ?? undefined) === (candidate.scope ?? undefined) &&
        inferredParentKey(item, brief, priorCandidates) ===
          (candidate.appliesToAssessmentKey ?? undefined)
    );
    if (!match) {
      remaining.push(structuredClone(candidate));
      continue;
    }
    linkedCount += 1;
    if (!match.sourceCandidateRefs.includes(candidate.candidateId)) {
      match.sourceCandidateRefs.push(candidate.candidateId);
    }
    for (const evidence of candidate.evidenceRefs) {
      if (
        !match.evidenceRefs.some(
          (existing) =>
            existing.sourceId === evidence.sourceId && existing.locator === evidence.locator
        )
      ) {
        match.evidenceRefs.push(structuredClone(evidence));
      }
    }
  }
  return { candidates: remaining, briefItems: brief, linkedCount };
}
