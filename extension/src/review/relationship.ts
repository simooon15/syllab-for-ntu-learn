import type { ReviewCandidate } from "./domain";

function assessmentLabel(candidate: ReviewCandidate): string | null {
  const value = candidate.proposedValue;
  for (const key of ["identifier", "name", "title", "label"] as const) {
    if (typeof value[key] === "string" && value[key].trim().length > 0) return value[key].trim();
  }
  return null;
}

export function candidateRelationshipLabel(
  candidate: ReviewCandidate,
  candidates: readonly ReviewCandidate[]
): string | null {
  if (candidate.scope === "course") return "Course-level";
  if (candidate.scope !== "assessment" || !candidate.appliesToAssessmentKey) return null;
  const parent = candidates.find(
    (item) => item.kind === "assessment" && item.semanticKey === candidate.appliesToAssessmentKey
  );
  const label = parent ? assessmentLabel(parent) : null;
  const fallback = candidate.appliesToAssessmentKey
    .replace(/^assessment:/, "")
    .replace(/-/g, " ")
    .toUpperCase();
  return `Applies to ${label ?? fallback}`;
}
