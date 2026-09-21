import { nextOpportunityAt, type CheckSchedule } from "./opportunity";

export interface OpportunityCandidate {
  courseId: string;
  currentSemester: boolean;
  established: boolean;
  schedule: CheckSchedule;
}

/**
 * Single-flight ordering for Opportunity Checking: at most one Course is checked at a time and
 * a Course is only picked when its own interval has elapsed. Historical semesters are never
 * candidates, and an unestablished Course has nothing to maintain yet.
 */
export function checkSchedule(candidates: OpportunityCandidate[], now: Date): string[] {
  const due = candidates
    .filter((candidate) => candidate.currentSemester && candidate.established)
    .flatMap((candidate) => {
      const at = nextOpportunityAt(candidate.schedule, now);
      if (!at || at.getTime() > now.getTime()) return [];
      return [{ courseId: candidate.courseId, at: at.getTime() }];
    })
    .sort((left, right) => left.at - right.at);
  return due.map((entry) => entry.courseId);
}
