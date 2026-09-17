import { describe, expect, it } from "vitest";

import { resolveEntryRoute, type EntryRouteInput } from "./entry-router";

const context = { courseId: "course_123", route: "/ultra/courses/course_123/outline" };
const scannedCourse = {
  courseId: "course_123",
  hasEffectiveScan: true,
  hasBrief: true,
  pendingReviewCount: 3,
  lastEffectiveScanId: "scan_effective"
};

function input(overrides: Partial<EntryRouteInput>): EntryRouteInput {
  return { context, course: null, entryScan: null, ...overrides };
}

describe("entry routing", () => {
  it("routes a non-course page to Saved Courses", () => {
    expect(resolveEntryRoute(input({ context: null }))).toEqual({ surface: "saved-courses" });
  });

  it("routes an unscanned current course to Scan Ready", () => {
    expect(resolveEntryRoute(input({}))).toEqual({
      surface: "scan",
      state: "ready",
      courseId: "course_123"
    });
  });

  it("routes a scanned course with pending candidates to Course Brief", () => {
    expect(resolveEntryRoute(input({ course: scannedCourse }))).toEqual({
      surface: "course-brief",
      courseId: "course_123"
    });
  });

  it.each([
    ["Scanning", "scanning"],
    ["WaitingForPermission", "waiting-for-permission"],
    ["Interrupted", "interrupted"]
  ] as const)("prioritizes %s over an old Course Brief", (status, state) => {
    expect(
      resolveEntryRoute(
        input({
          course: scannedCourse,
          entryScan: {
            scanId: "scan_active",
            courseId: "course_123",
            status,
            recoverable: true
          }
        })
      )
    ).toEqual({
      surface: "scan",
      state,
      courseId: "course_123",
      scanId: "scan_active"
    });
  });

  it("does not prioritize an unrecoverable interrupted scan", () => {
    expect(
      resolveEntryRoute(
        input({ course: { ...scannedCourse, pendingReviewCount: 0 }, entryScan: null })
      )
    ).toEqual({
      surface: "course-brief",
      courseId: "course_123"
    });
  });
});
