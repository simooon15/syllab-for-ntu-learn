import type { CandidateCategory, ReviewCandidate, ReviewProgress } from "./domain";

function updateCandidate(
  candidates: readonly ReviewCandidate[],
  candidateId: string,
  update: (candidate: ReviewCandidate) => ReviewCandidate
): ReviewCandidate[] {
  const targetIndex = candidates.findIndex((candidate) => candidate.candidateId === candidateId);
  if (targetIndex < 0) throw new Error("REVIEW_CANDIDATE_NOT_FOUND");
  return candidates.map((candidate, index) =>
    index === targetIndex ? update(structuredClone(candidate)) : structuredClone(candidate)
  );
}

export function confirmCandidate(
  candidates: readonly ReviewCandidate[],
  candidateId: string,
  now = new Date()
): ReviewCandidate[] {
  return updateCandidate(candidates, candidateId, (candidate) => ({
    ...candidate,
    status: "Confirmed",
    confirmedValue: structuredClone(candidate.proposedValue),
    confirmedAt: now.toISOString()
  }));
}

export function editAndConfirmCandidate(
  candidates: readonly ReviewCandidate[],
  candidateId: string,
  editedValue: Record<string, unknown>,
  now = new Date()
): ReviewCandidate[] {
  return updateCandidate(candidates, candidateId, (candidate) => {
    const next = {
      ...candidate,
      status: "EditedConfirmed" as const,
      confirmedValue: structuredClone(editedValue),
      confirmedAt: now.toISOString()
    };
    delete next.unresolvedFields;
    return next;
  });
}

export function ignoreCandidate(
  candidates: readonly ReviewCandidate[],
  candidateId: string,
  now = new Date()
): ReviewCandidate[] {
  return updateCandidate(candidates, candidateId, (candidate) => ({
    ...candidate,
    status: "Ignored",
    ignoredAt: now.toISOString()
  }));
}

export function skipCandidate(candidates: readonly ReviewCandidate[]): ReviewCandidate[] {
  return [...structuredClone(candidates)];
}

export function assignCandidateRelationship(
  candidates: readonly ReviewCandidate[],
  candidateId: string,
  scope: "course" | "assessment",
  appliesToAssessmentKey?: string
): ReviewCandidate[] {
  if (scope === "assessment" && !appliesToAssessmentKey) {
    throw new Error("ASSESSMENT_RELATIONSHIP_PARENT_REQUIRED");
  }
  return updateCandidate(candidates, candidateId, (candidate) => {
    if (candidate.kind === "assessment") throw new Error("ASSESSMENT_CANNOT_BE_CHILD");
    const next = { ...candidate, scope };
    if (scope === "assessment" && appliesToAssessmentKey) {
      next.appliesToAssessmentKey = appliesToAssessmentKey;
    } else {
      delete next.appliesToAssessmentKey;
    }
    if (next.reviewReason?.includes("referenced parent Assessment was not found")) {
      delete next.reviewReason;
    }
    return next;
  });
}

export function confirmDetectedCategory(
  candidates: readonly ReviewCandidate[],
  category: CandidateCategory,
  now = new Date()
): ReviewCandidate[] {
  return candidates.map((candidate) =>
    candidate.kind === category && candidate.status === "Detected"
      ? {
          ...structuredClone(candidate),
          status: "Confirmed",
          confirmedValue: structuredClone(candidate.proposedValue),
          confirmedAt: now.toISOString()
        }
      : structuredClone(candidate)
  );
}

export function reviewProgress(
  scanId: string,
  candidates: readonly ReviewCandidate[]
): ReviewProgress {
  const detected = candidates.filter((candidate) => candidate.status === "Detected").length;
  const needsReview = candidates.filter((candidate) => candidate.status === "NeedsReview").length;
  return {
    scanId,
    total: candidates.length,
    reviewed: candidates.length - detected - needsReview,
    detected,
    needsReview,
    complete: detected === 0 && needsReview === 0
  };
}
