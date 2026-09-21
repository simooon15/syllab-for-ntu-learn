import type { FactValue, PendingChangeRecord } from "./domain";

export interface HistoryEntry {
  historyId: string;
  courseId: string;
  targetId: string;
  field?: string;
  event: "PENDING_SUPERSEDED";
  value?: FactValue;
  recordedAt: string;
}

export function upsertLatestChange(
  existing: PendingChangeRecord | undefined,
  incoming: PendingChangeRecord,
  now: string
): { pending: PendingChangeRecord; history?: HistoryEntry } {
  if (!existing) return { pending: incoming };
  if (
    existing.courseId !== incoming.courseId ||
    existing.targetId !== incoming.targetId ||
    existing.field !== incoming.field
  ) {
    throw new Error("PENDING_CHANGE_TARGET_MISMATCH");
  }
  return {
    pending: {
      ...incoming,
      changeId: existing.changeId,
      ...(existing.currentValue ? { currentValue: existing.currentValue } : {}),
      createdAt: existing.createdAt,
      updatedAt: now
    },
    history: {
      historyId: `${existing.changeId}:superseded:${now}`,
      courseId: existing.courseId,
      targetId: existing.targetId,
      ...(existing.field ? { field: existing.field } : {}),
      event: "PENDING_SUPERSEDED",
      ...(existing.latestValue ? { value: existing.latestValue } : {}),
      recordedAt: now
    }
  };
}

export function canProposePossiblyRemoved(input: {
  allRelevantSourcesFetched: boolean;
  allRelevantSourcesParsed: boolean;
  permissionDenied: boolean;
  partialCoverage: boolean;
  aiJudgment: "POSSIBLY_REMOVED" | "OTHER";
}): boolean {
  return (
    input.aiJudgment === "POSSIBLY_REMOVED" &&
    input.allRelevantSourcesFetched &&
    input.allRelevantSourcesParsed &&
    !input.permissionDenied &&
    !input.partialCoverage
  );
}
