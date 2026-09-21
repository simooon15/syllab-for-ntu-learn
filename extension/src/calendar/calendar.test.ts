import { describe, expect, it } from "vitest";

import type { BriefItem } from "../brief/domain";
import { serializeCalendar } from "./ics";
import { calendarEventsFromBrief } from "./query";

function item(overrides: Partial<BriefItem>): BriefItem {
  return {
    briefItemId: "item",
    courseId: "course",
    kind: "important_date",
    scope: "course",
    origin: "candidate",
    status: "Confirmed",
    currentValue: { title: "Final, Exam", date: "2026-11-18" },
    fieldStates: {},
    sourceCandidateRefs: ["candidate"],
    evidenceRefs: [],
    updatedAt: "2026-09-17T00:00:00.000Z",
    ...overrides
  };
}

describe("calendar export", () => {
  it("exports confirmed edited and user-added dates once", () => {
    const events = calendarEventsFromBrief([
      item({ briefItemId: "one" }),
      item({ briefItemId: "duplicate" }),
      item({
        briefItemId: "other",
        currentValue: { name: "Presentation", dueDate: "19/11/2026", time: "14:30" }
      })
    ]);
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({ date: "2026-11-19", time: "14:30" });
  });

  it("excludes unresolved dates", () => {
    expect(
      calendarEventsFromBrief([
        item({
          fieldStates: {
            date: { status: "Unresolved", candidateValues: ["2026-11-18"], evidenceRefs: [] }
          }
        })
      ])
    ).toEqual([]);
  });

  it("does not let an unparseable prose when field hide a valid structured date", () => {
    expect(
      calendarEventsFromBrief([
        item({
          currentValue: {
            what: "CA1 Batch 1",
            when: "23 October 2026, 3.30 pm to 6.20 pm",
            date: "2026-10-23"
          }
        })
      ])
    ).toMatchObject([{ title: "CA1 Batch 1", date: "2026-10-23" }]);
  });

  it("writes RFC 5545 CRLF, escaping, all-day end, stable UID and folded lines", () => {
    const event = calendarEventsFromBrief([
      item({ currentValue: { title: `Final, Exam; ${"x".repeat(90)}`, date: "2026-11-18" } })
    ]);
    const first = serializeCalendar("course", event, new Date("2026-09-17T00:00:00.000Z"));
    const second = serializeCalendar("course", event, new Date("2026-09-18T00:00:00.000Z"));
    expect(first).toContain("DTSTART;VALUE=DATE:20261118\r\nDTEND;VALUE=DATE:20261119");
    expect(first).toContain("Final\\, Exam\\;");
    expect(first).toContain("\r\n ");
    expect(first.match(/UID:[^\r]+/)?.[0]).toBe(second.match(/UID:[^\r]+/)?.[0]);
    expect(first).not.toMatch(/(?<!\r)\n/);
  });
});
