import type { CourseRecord, WorkflowRecord } from "./domain";

const HOUR = 60 * 60 * 1000;

export interface MaintenanceCheckEngine {
  start(course: CourseRecord, kind: "check", context: { tabId: number }): Promise<WorkflowRecord>;
}

/** A check without a readable NTU Learn tab ends before it can spend or mutate anything. */
export async function startMaintenanceCheck(
  course: CourseRecord,
  engine: MaintenanceCheckEngine,
  resolveTab: () => Promise<number | undefined>
): Promise<WorkflowRecord | null> {
  const tabId = await resolveTab();
  if (tabId === undefined) return null;
  return engine.start(course, "check", { tabId });
}

export interface CheckSchedule {
  lastSuccessfulCheckAt?: string;
  nextAttemptAt?: string;
  unchangedStreak: number;
  consecutiveFailures: number;
  currentSemester: boolean;
  established: boolean;
}

export function nextOpportunityAt(schedule: CheckSchedule, now: Date): Date | null {
  if (!schedule.currentSemester || !schedule.established) return null;
  if (schedule.nextAttemptAt) return new Date(schedule.nextAttemptAt);
  const last = schedule.lastSuccessfulCheckAt
    ? Date.parse(schedule.lastSuccessfulCheckAt)
    : now.getTime() - 6 * HOUR;
  const interval = schedule.unchangedStreak <= 0 ? 6 : schedule.unchangedStreak === 1 ? 12 : 24;
  return new Date(last + interval * HOUR);
}

export function afterTransientFailure(schedule: CheckSchedule, now: Date): CheckSchedule {
  const delays = [5 * 60 * 1000, 30 * 60 * 1000, 2 * HOUR];
  const failures = schedule.consecutiveFailures + 1;
  const delay = delays[Math.min(failures - 1, delays.length - 1)] ?? 2 * HOUR;
  return {
    ...schedule,
    consecutiveFailures: failures,
    nextAttemptAt: new Date(now.getTime() + delay).toISOString()
  };
}

export function needsFreshnessAttention(schedule: CheckSchedule, now: Date): boolean {
  if (schedule.consecutiveFailures >= 3) return true;
  if (!schedule.lastSuccessfulCheckAt) return false;
  return now.getTime() - Date.parse(schedule.lastSuccessfulCheckAt) >= 72 * HOUR;
}
