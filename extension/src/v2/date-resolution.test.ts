import { describe, expect, it } from "vitest";

import {
  resolveCourseDates,
  resolveDate,
  semesterContext,
  type SemesterContext
} from "./date-resolution";
import type { FactRecord } from "./schema";

/**
 * The Product Owner's cases for Semester-aware date resolution (DIRECTION_ADJUSTMENTS §2.17), plus
 * the boundaries the rule has to hold at: a month outside the term, a Semester the resolver cannot
 * read, and a value that is not a date at all.
 */

const SEMESTER_ONE: SemesterContext = { startYear: 2026, term: 1 };
const SEMESTER_TWO: SemesterContext = { startYear: 2026, term: 2 };

const labelled = (label: string) => ({ label });

describe("resolving a date against the Course's Semester", () => {
  it("completes a day and month from Semester 1's year", () => {
    expect(resolveDate("18 Oct", SEMESTER_ONE)).toEqual({
      canonicalDate: "2026-10-18",
      source: "semester"
    });
  });

  it("completes a day and month from Semester 2's year", () => {
    // Semester 2 of AY2026/27 runs Jan–May 2027, so January belongs to the following year.
    expect(resolveDate("18 Jan", SEMESTER_TWO)).toEqual({
      canonicalDate: "2027-01-18",
      source: "semester"
    });
  });

  it("leaves a complete date exactly as the Source wrote it", () => {
    expect(resolveDate("2026-11-12", SEMESTER_ONE)).toEqual({
      canonicalDate: "2026-11-12",
      source: "source"
    });
    expect(resolveDate("2026-11-12", null)).toEqual({
      canonicalDate: "2026-11-12",
      source: "source"
    });
    expect(resolveDate("19/11/2026", SEMESTER_ONE)).toEqual({
      canonicalDate: "2026-11-19",
      source: "source"
    });
    expect(resolveDate("2026-11-19T14:30", null)).toEqual({
      canonicalDate: "2026-11-19",
      source: "source",
      time: "14:30"
    });
  });

  it("reads either order, and a named year makes the Semester unnecessary", () => {
    expect(resolveDate("Oct 18", SEMESTER_ONE)).toEqual({
      canonicalDate: "2026-10-18",
      source: "semester"
    });
    expect(resolveDate("18 October", SEMESTER_ONE)).toEqual({
      canonicalDate: "2026-10-18",
      source: "semester"
    });
    expect(resolveDate("18 Oct 2026", null)).toEqual({
      canonicalDate: "2026-10-18",
      source: "source"
    });
  });

  it("never guesses a year when there is no Semester to take one from", () => {
    expect(resolveDate("18 Oct", null)).toBeNull();
    // The current system year is never a substitute, so the answer does not move with the clock.
    expect(
      resolveDate("18 Oct", semesterContext(labelled("Imported from Syllab v0.1.0")))
    ).toBeNull();
    expect(semesterContext(labelled("AY2026/27"))).toBeNull();
    expect(semesterContext(labelled("Semester 1"))).toBeNull();
  });

  it("invents no date for a value that is not one", () => {
    for (const value of ["Week 8", "mid-semester", "after recess week", "TBC", "14:30", ""]) {
      expect(resolveDate(value, SEMESTER_ONE)).toBeNull();
    }
    expect(resolveDate(8, SEMESTER_ONE)).toBeNull();
    expect(resolveDate(["2026-10-18"], SEMESTER_ONE)).toBeNull();
    // A real date is still a real date: a day that does not exist is not one.
    expect(resolveDate("31 Feb", SEMESTER_ONE)).toBeNull();
    expect(resolveDate("2026-02-30", SEMESTER_ONE)).toBeNull();
  });

  it("does not place a month the term does not cover", () => {
    // June is in neither Semester 1's Aug–Dec window nor Semester 2's Jan–May window.
    expect(resolveDate("18 Jun", SEMESTER_ONE)).toBeNull();
    expect(resolveDate("18 Jun", SEMESTER_TWO)).toBeNull();
    expect(resolveDate("18 Dec", SEMESTER_ONE)).not.toBeNull();
    expect(resolveDate("18 May", SEMESTER_TWO)).not.toBeNull();
  });

  it("reads the academic year and term from the Semester's label", () => {
    expect(semesterContext(labelled("AY2026/27 · Semester 1"))).toEqual({
      startYear: 2026,
      term: 1
    });
    expect(semesterContext(labelled("AY2026/2027 · Semester 2"))).toEqual({
      startYear: 2026,
      term: 2
    });
    // A label whose halves disagree is not this resolver's to interpret.
    expect(semesterContext(labelled("AY2026/31 · Semester 1"))).toBeNull();
    expect(semesterContext(undefined)).toBeNull();
  });

  it("resolves a Course's facts by id and omits the ones it cannot place", () => {
    const fact = (factId: string, value: unknown): FactRecord => ({
      factId,
      courseId: "course-1",
      assessmentId: "assessment-1",
      field: "deadline",
      value: { state: "KNOWN", value: value as string },
      evidenceRefs: [],
      marks: [],
      updatedAt: "2026-09-19T00:00:00.000Z"
    });
    const resolved = resolveCourseDates(
      [fact("a", "18 Oct"), fact("b", "Week 8"), fact("c", "2026-12-03")],
      labelled("AY2026/27 · Semester 1")
    );
    expect([...resolved.keys()].sort()).toEqual(["a", "c"]);
    expect(resolved.get("a")).toEqual({ canonicalDate: "2026-10-18", source: "semester" });
    expect(resolved.get("c")).toEqual({ canonicalDate: "2026-12-03", source: "source" });
  });
});
