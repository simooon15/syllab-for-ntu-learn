import type { CandidateRecord } from "../ai/domain";

export interface ReviewCandidate extends CandidateRecord {
  confirmedValue?: Record<string, unknown>;
  ignoredAt?: string;
  confirmedAt?: string;
}

export interface ReviewProgress {
  scanId: string;
  total: number;
  reviewed: number;
  detected: number;
  needsReview: number;
  complete: boolean;
}

export type CandidateCategory = ReviewCandidate["kind"];
