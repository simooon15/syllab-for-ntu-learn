import type {
  AssessmentRecord,
  ChangeRecord,
  ConstraintRecord,
  EvidenceRecord,
  FactRecord,
  ReviewItemRecord
} from "./domain";
import type { TaskBResult } from "./ai-contracts";

/**
 * Rebuild staging. A Rebuild re-runs the whole course-establishment chain, and its result must be
 * complete before the user decides anything: Current Course State is not touched until the user
 * adopts the rebuilt state, and declining discards staging entirely.
 */
export interface StagedCourseState {
  courseId: string;
  workflowId: string;
  stagedAt: string;
  assessments: AssessmentRecord[];
  constraints: ConstraintRecord[];
  facts: FactRecord[];
  evidence: EvidenceRecord[];
  reviewItems: ReviewItemRecord[];
  changes: ChangeRecord[];
  taskBResult?: TaskBResult;
  taskACoverage?: {
    succeededSourceIds: string[];
    relevantSourceIds: string[];
    failedSources: Array<{ sourceId: string; errorCode: string }>;
  };
}

export interface KeyValueStorage {
  get(keys: string | string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

export const STAGING_KEY_PREFIX = "syllab.staged." as const;

export function stagingKey(courseId: string, workflowId: string): string {
  return `${STAGING_KEY_PREFIX}${courseId}.${workflowId}`;
}

export class RebuildStagingStore {
  constructor(private readonly storage: KeyValueStorage) {}

  async read(courseId: string, workflowId: string): Promise<StagedCourseState | null> {
    const key = stagingKey(courseId, workflowId);
    const result = await this.storage.get(key);
    const value = result[key];
    return isStaged(value) && value.courseId === courseId && value.workflowId === workflowId
      ? value
      : null;
  }

  async write(state: StagedCourseState): Promise<void> {
    await this.storage.set({ [stagingKey(state.courseId, state.workflowId)]: state });
  }

  async clear(courseId: string, workflowId: string): Promise<void> {
    await this.storage.remove(stagingKey(courseId, workflowId));
  }
}

function isStaged(value: unknown): value is StagedCourseState {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<StagedCourseState>;
  return (
    typeof candidate.courseId === "string" &&
    typeof candidate.workflowId === "string" &&
    Array.isArray(candidate.assessments) &&
    Array.isArray(candidate.constraints) &&
    Array.isArray(candidate.facts)
  );
}

export function emptyStaging(courseId: string, workflowId: string, now: string): StagedCourseState {
  return {
    courseId,
    workflowId,
    stagedAt: now,
    assessments: [],
    constraints: [],
    facts: [],
    evidence: [],
    reviewItems: [],
    changes: [],
    taskACoverage: {
      succeededSourceIds: [],
      relevantSourceIds: [],
      failedSources: []
    }
  };
}
