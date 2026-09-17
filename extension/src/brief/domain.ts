import type { CandidateKind, CandidateScope, EvidenceReference } from "@syllab/contracts";

export interface BriefFieldState {
  status: "Confirmed" | "Unresolved";
  value?: unknown;
  candidateValues?: unknown[];
  evidenceRefs: EvidenceReference[];
}

export interface BriefItem {
  briefItemId: string;
  courseId: string;
  kind: CandidateKind;
  scope?: CandidateScope;
  parentBriefItemId?: string;
  origin: "candidate" | "user_added";
  status: "Confirmed" | "EditedConfirmed" | "UserAddedConfirmed";
  currentValue: Record<string, unknown>;
  fieldStates: Record<string, BriefFieldState>;
  sourceCandidateRefs: string[];
  evidenceRefs: EvidenceReference[];
  semanticKey?: string;
  parentSemanticKey?: string;
  updatedAt: string;
}
