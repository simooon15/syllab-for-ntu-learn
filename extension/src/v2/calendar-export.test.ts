import { describe, expect, it } from "vitest";

import type { EvidenceReference } from "@syllab/contracts";

import { exportCalendar, calendarEvents, calendarFileName } from "./calendar-export";
import type { AssessmentRecord, ChangeRecord, ConstraintRecord, FactRecord } from "./domain";
import { makeCourse, withDates } from "./testing";

const NOW = "2026-09-19T00:00:00.000Z";

function assessment(overrides: Partial<AssessmentRecord> = {}): AssessmentRecord {
  return {
    assessmentId: "assessment-1",
    courseId: "course-1",
    role: "assessment",
    kind: "assignment",
    name: "Individual Assignment",
    aliases: [],
    marks: [],
    createdBy: "ai",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides
  };
}

function fact(overrides: Partial<FactRecord> = {}): FactRecord {
  return {
    factId: "fact-1",
    courseId: "course-1",
    assessmentId: "assessment-1",
    field: "date",
    value: { state: "KNOWN", value: "2026-10-18" },
    evidenceRefs: [],
    marks: [],
    updatedAt: NOW,
    ...overrides
  };
}

function reference(locator: string, evidenceId?: string): EvidenceReference {
  const linked = { sourceId: "content:item-1", locator };
  return evidenceId === undefined ? linked : { ...linked, evidenceId };
}

/** A date that belongs to the course itself rather than to one of its assessments. */
function courseFact(overrides: Partial<FactRecord> = {}): FactRecord {
  const row = fact(overrides);
  delete row.assessmentId;
  return row;
}

function change(overrides: Partial<ChangeRecord> = {}): ChangeRecord {
  return {
    changeId: "change-1",
    courseId: "course-1",
    workflowId: "workflow-1",
    targetId: "assessment-1",
    changeType: "CONFLICT",
    currentEvidenceIds: [],
    newEvidenceIds: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides
  };
}

function constraint(overrides: Partial<ConstraintRecord> = {}): ConstraintRecord {
  return {
    constraintId: "constraint-1",
    courseId: "course-1",
    content: "Attendance is compulsory.",
    evidenceRefs: [],
    marks: [],
    createdBy: "ai",
    updatedAt: NOW,
    ...overrides
  };
}

/** Every line clients see, with the byte length clients enforce. */
function linesOf(content: string): { text: string; bytes: number }[] {
  return content
    .split("\r\n")
    .map((text) => ({ text, bytes: new TextEncoder().encode(text).length }));
}

function veventCount(content: string): number {
  return content.match(/BEGIN:VEVENT\r\n/g)?.length ?? 0;
}

describe("Calendar export", () => {
  it("exports every typed date fact, not only the first field it recognises", () => {
    const events = calendarEvents(
      withDates({
        course: makeCourse(),
        assessments: [assessment()],
        facts: [
          fact({
            factId: "fact-start",
            field: "start_date",
            value: { state: "KNOWN", value: "2026-10-01" }
          }),
          fact({
            factId: "fact-due",
            field: "due_date",
            value: { state: "KNOWN", value: "2026-10-18" }
          })
        ]
      })
    );
    // v0.1.0 stopped at the first matching field name and silently lost the other date.
    expect(events.map((event) => event.date)).toEqual(["2026-10-01", "2026-10-18"]);
  });

  it("never treats a date-shaped string in an untyped field as a date", () => {
    const events = calendarEvents(
      withDates({
        course: makeCourse(),
        assessments: [assessment()],
        facts: [
          fact({
            factId: "fact-method",
            field: "submission_method",
            value: { state: "KNOWN", value: "2026-10-18 via Turnitin" }
          }),
          fact({
            factId: "fact-venue",
            field: "venue",
            value: { state: "KNOWN", value: "17/11/2026" }
          })
        ]
      })
    );
    expect(events).toEqual([]);
  });

  it("consolidates equivalent facts into one event with their evidence merged", () => {
    const events = calendarEvents(
      withDates({
        course: makeCourse(),
        assessments: [assessment()],
        facts: [
          fact({
            factId: "fact-date",
            field: "date",
            value: { state: "KNOWN", value: "2026-10-18" },
            evidenceRefs: [reference("page-1", "evidence-1")]
          }),
          fact({
            factId: "fact-deadline",
            field: "deadline",
            value: { state: "KNOWN", value: "18/10/2026" },
            evidenceRefs: [reference("page-2", "evidence-2"), reference("page-3", "evidence-3")]
          })
        ]
      })
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      date: "2026-10-18",
      title: "Individual Assignment",
      // The one event says which fields it stands for, not which of them it came from first.
      description: "MA6081 - Date, Deadline",
      factIds: ["fact-date", "fact-deadline"],
      evidenceIds: ["evidence-1", "evidence-2", "evidence-3"]
    });
    // Identity comes from the owning object and the real event, never from the evidence count.
    expect(events[0]?.eventKey).toBe("assessment-1|2026-10-18|");
  });

  it("keeps one real deadline as one VEVENT when more evidence arrives", () => {
    const course = makeCourse();
    const only = exportCalendar(
      withDates({
        course,
        assessments: [assessment()],
        facts: [fact({ evidenceRefs: [reference("page-1")] })]
      }),
      new Date(NOW)
    );
    const withMore = exportCalendar(
      withDates({
        course,
        assessments: [assessment()],
        facts: [
          fact({
            evidenceRefs: [reference("page-1"), reference("page-2"), reference("page-3")]
          }),
          fact({
            factId: "fact-deadline",
            field: "deadline",
            value: { state: "KNOWN", value: "2026-10-18" }
          })
        ]
      }),
      new Date(NOW)
    );
    expect(veventCount(only.content)).toBe(1);
    expect(veventCount(withMore.content)).toBe(1);
    expect(withMore.content.match(/UID:[^\r]+/)?.[0]).toBe(only.content.match(/UID:[^\r]+/)?.[0]);
  });

  it("never exports a date that is still in conflict", () => {
    const base = { course: makeCourse(), assessments: [assessment()] };
    expect(
      calendarEvents(
        withDates({
          ...base,
          facts: [fact()],
          changes: [change({ field: "date", changeType: "CONFLICT" })]
        })
      )
    ).toEqual([]);
    // An object-wide conflict blocks every field, including the dates.
    expect(
      calendarEvents(
        withDates({ ...base, facts: [fact()], changes: [change({ changeType: "CONFLICT" })] })
      )
    ).toEqual([]);
    // A conflict on an unrelated field is not a reason to hide a settled date.
    expect(
      calendarEvents(
        withDates({
          ...base,
          facts: [fact()],
          changes: [change({ field: "weight", changeType: "CONFLICT" })]
        })
      )
    ).toHaveLength(1);
    // A pending change that is not a conflict leaves the current value settled.
    expect(
      calendarEvents(
        withDates({
          ...base,
          facts: [fact()],
          changes: [change({ field: "date", changeType: "CHANGED" })]
        })
      )
    ).toHaveLength(1);
  });

  it("keeps a confirmed date that the user kept as Possibly Removed", () => {
    const events = calendarEvents(
      withDates({
        course: makeCourse(),
        assessments: [assessment({ marks: ["PossiblyRemoved"] })],
        facts: [fact({ marks: ["PossiblyRemoved"] })]
      })
    );
    expect(events).toHaveLength(1);
  });

  it("exports a component that is its own real event as its own event", () => {
    const events = calendarEvents(
      withDates({
        course: makeCourse(),
        assessments: [
          assessment(),
          assessment({
            assessmentId: "assessment-2",
            parentAssessmentId: "assessment-1",
            role: "component",
            name: "Presentation"
          })
        ],
        facts: [
          fact(),
          fact({
            factId: "fact-presentation",
            assessmentId: "assessment-2",
            field: "date",
            value: { state: "KNOWN", value: "2026-11-05" }
          })
        ]
      })
    );
    expect(events.map((event) => [event.title, event.date])).toEqual([
      ["Individual Assignment", "2026-10-18"],
      ["Presentation", "2026-11-05"]
    ]);
  });

  it("exports a course-level date and a constraint date, and skips what is no longer live", () => {
    const events = calendarEvents(
      withDates({
        course: makeCourse(),
        assessments: [
          assessment({ supersededBy: "removed" }),
          assessment({ assessmentId: "assessment-2", name: "Live assessment" })
        ],
        constraints: [constraint()],
        facts: [
          fact({ factId: "fact-gone", value: { state: "KNOWN", value: "2026-10-18" } }),
          fact({
            factId: "fact-superseded",
            assessmentId: "assessment-2",
            superseded: true,
            value: { state: "KNOWN", value: "2026-10-19" }
          }),
          fact({
            factId: "fact-live",
            assessmentId: "assessment-2",
            value: { state: "KNOWN", value: "2026-10-20" }
          }),
          courseFact({
            factId: "fact-course",
            field: "deadline",
            value: { state: "KNOWN", value: "2026-12-03" }
          }),
          courseFact({
            factId: "fact-constraint",
            constraintId: "constraint-1",
            field: "date",
            value: { state: "KNOWN", value: "2026-11-30" }
          })
        ]
      })
    );
    expect(events.map((event) => [event.title, event.date])).toEqual([
      ["Live assessment", "2026-10-20"],
      ["Attendance is compulsory.", "2026-11-30"],
      ["MA6081 - Deadline", "2026-12-03"]
    ]);
  });

  it("leaves unresolved and unreadable values out instead of settling them", () => {
    const events = calendarEvents(
      withDates({
        course: makeCourse(),
        assessments: [assessment()],
        facts: [
          fact({ factId: "uncertain", value: { state: "UNCERTAIN", value: "2026-10-18" } }),
          fact({ factId: "unknown", value: { state: "EXPLICITLY_UNKNOWN" } }),
          fact({
            factId: "competing",
            value: { state: "KNOWN", value: "2026-10-18", competingValues: ["2026-10-19"] }
          }),
          fact({ factId: "prose", value: { state: "KNOWN", value: "sometime in October" } }),
          fact({ factId: "impossible", value: { state: "KNOWN", value: "2026-02-30" } }),
          fact({ factId: "list", value: { state: "KNOWN", value: ["2026-10-18", "2026-10-19"] } })
        ]
      })
    );
    expect(events).toEqual([]);
  });

  it("writes RFC 5545 content that common calendar clients import", () => {
    const result = exportCalendar(
      withDates({
        course: makeCourse(),
        facts: [
          fact({ value: { state: "KNOWN", value: "2026-11-18" } }),
          fact({
            factId: "fact-presentation",
            assessmentId: "assessment-2",
            field: "start_date",
            value: { state: "KNOWN", value: "2026-11-19T14:30" }
          }),
          fact({
            factId: "fact-time",
            assessmentId: "assessment-2",
            field: "start_time",
            value: { state: "KNOWN", value: "14:30" }
          }),
          fact({
            factId: "fact-long",
            assessmentId: "assessment-3",
            field: "exam_date",
            value: { state: "KNOWN", value: "2026-12-03" }
          })
        ],
        assessments: [
          assessment({ name: "Final, Exam; Part 1" }),
          assessment({ assessmentId: "assessment-2", role: "component", name: "Presentation" }),
          assessment({
            assessmentId: "assessment-3",
            name: `Weekly ${"Review ".repeat(20)}`
          })
        ]
      }),
      new Date(NOW)
    );

    // Apple Calendar and Outlook require both, and the calendar must be a single block.
    expect(result.content.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(result.content.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(result.content).toContain("VERSION:2.0\r\n");
    expect(result.content).toContain("PRODID:");
    // Clients enforce CRLF line endings and unfold nothing longer than 75 octets.
    expect(result.content).not.toMatch(/(?<!\r)\n/);
    for (const line of linesOf(result.content)) expect(line.bytes).toBeLessThanOrEqual(75);
    // Google Calendar reads an all-day event from DATE values with an exclusive end date, and
    // refuses an event without a UID or a DTSTAMP.
    expect(result.content).toContain("DTSTART;VALUE=DATE:20261118\r\nDTEND;VALUE=DATE:20261119");
    expect(result.content).toContain("DTSTART;TZID=Asia/Singapore:20261119T143000");
    const events = result.content.split("BEGIN:VEVENT").slice(1);
    expect(events).toHaveLength(3);
    for (const event of events) {
      expect(event).toMatch(/\r\nUID:[^\r\n]+@syllab\.local/);
      expect(event).toMatch(/\r\nDTSTAMP:\d{8}T\d{6}Z/);
      expect(event).toMatch(/\r\nDTSTART[;:]/);
      expect(event).toContain("END:VEVENT");
    }
    // Text values are escaped, never emitted raw.
    expect(result.content).toContain("SUMMARY:Final\\, Exam\\; Part 1");
    expect(result.events).toHaveLength(3);
  });

  it("names the file after the course the user recognises, never after an internal id", () => {
    expect(calendarFileName({ courseCode: "MA6081", courseName: "Fundamentals of PM" })).toBe(
      "MA6081.ics"
    );
    expect(calendarFileName({ courseCode: "_24680_1", courseName: "Fundamentals of PM" })).toBe(
      "Fundamentals of PM.ics"
    );
    expect(calendarFileName({ courseCode: "bb-9f8e7d6c5b4a3210", courseName: "12" })).toBe(
      "Syllab calendar.ics"
    );
    // A separator that a file name cannot carry becomes a space, not a lost character.
    expect(calendarFileName({ courseCode: "", courseName: "MA6081/CS6082: Project" })).toBe(
      "MA6081 CS6082 Project.ics"
    );
    expect(
      calendarFileName({ courseCode: "", courseName: `Long ${"Name ".repeat(30)}` }).length
    ).toBeLessThanOrEqual(70);
  });

  it("reports one preview entry per real event", () => {
    const result = exportCalendar(
      withDates({
        course: makeCourse(),
        assessments: [assessment()],
        facts: [
          fact(),
          fact({
            factId: "fact-deadline",
            field: "deadline",
            value: { state: "KNOWN", value: "2026-10-18" }
          })
        ]
      })
    );
    expect(result.events.map((event) => ({ title: event.title, date: event.date }))).toEqual([
      { title: "Individual Assignment", date: "2026-10-18" }
    ]);
    expect(result.fileName).toBe("MA6081.ics");
  });
});
