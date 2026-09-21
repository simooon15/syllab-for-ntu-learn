import type { CalendarExportInput } from "./calendar-export";
import type { CourseSnapshot } from "./course-state";
import { resolveCourseDates } from "./date-resolution";
import type { CourseRecord } from "./domain";

export { type CourseSnapshot } from "./course-state";
export type {
  AssessmentRecord,
  ChangeRecord,
  ConstraintRecord,
  CourseRecord,
  FactRecord,
  HistoryRecord,
  ReviewDecisionRecord,
  ReviewItemRecord,
  WorkflowRecord
} from "./domain";

export function makeCourse(overrides: Partial<CourseRecord> = {}): CourseRecord {
  return {
    courseId: "course-1",
    semesterId: "semester-1",
    courseCode: "MA6081",
    courseName: "Fundamentals of Project Management",
    curriculum: true,
    established: true,
    currentRevision: 0,
    consecutiveCheckFailures: 0,
    updatedAt: "2026-09-19T00:00:00.000Z",
    ...overrides
  };
}

/** An empty Course snapshot; tests override only the tables they care about. */
export function makeSnapshot(overrides: Partial<CourseSnapshot> = {}): CourseSnapshot {
  return {
    course: makeCourse(),
    assessments: [],
    constraints: [],
    facts: [],
    changes: [],
    reviewItems: [],
    history: [],
    ...overrides
  };
}

/**
 * An export input whose dates resolve from their own values, with no Semester to supply a year —
 * the shape a Course has when every Source wrote a complete date. Tests that exercise the
 * Semester-aware path build the map with `resolveCourseDates` and a real Semester instead.
 */
export function withDates(input: Omit<CalendarExportInput, "dates">): CalendarExportInput {
  return { ...input, dates: resolveCourseDates(input.facts, undefined) };
}
