import type { CalendarExportInput } from "./calendar-export";
import type { CourseSnapshot } from "./course-state";
import { resolveCourseDates } from "./date-resolution";
import type { CourseRecord, SemesterRecord } from "./schema";

/**
 * The one place "what would this Course export" is composed.
 *
 * The screen that previews the export and the action that performs it both build their input here,
 * so the list a user is shown and the file they receive are the same answer twice rather than two
 * answers that happen to agree. `exportCalendar` derives its content and its counts from one
 * `calendarSummary` call for the same reason.
 *
 * The Semester is read in `date-resolution.ts` and nowhere else: by the time the exporter sees a
 * fact, the question of which year its date belongs to has already been settled.
 */
export function calendarExportInput(input: {
  course: CourseRecord;
  /** Absent for a Course that has never been scanned; it simply has nothing to export. */
  snapshot: CourseSnapshot | null;
  semester: Pick<SemesterRecord, "label"> | undefined;
}): CalendarExportInput {
  const facts = input.snapshot?.facts ?? [];
  return {
    course: input.course,
    assessments: input.snapshot?.assessments ?? [],
    facts,
    constraints: input.snapshot?.constraints ?? [],
    changes: input.snapshot?.changes ?? [],
    dates: resolveCourseDates(facts, input.semester)
  };
}
