import { describe, expect, it } from "vitest";

import { detectCourseContext, extractDisplayCourseCode, validateDiscoveryEndpoint } from "./index";

describe("course route foundation", () => {
  it("uses the native Ultra course id", () => {
    expect(
      detectCourseContext(new URL("https://ntulearn.ntu.edu.sg/ultra/courses/course_123/outline"))
    ).toEqual({ courseId: "course_123", route: "/ultra/courses/course_123/outline" });
  });

  it("does not infer course identity from unrelated routes", () => {
    expect(detectCourseContext(new URL("https://ntulearn.ntu.edu.sg/ultra/stream"))).toBeNull();
  });

  it("derives display-only course code from a visible Blackboard heading", () => {
    expect(
      extractDisplayCourseCode("26S1-MAE-MSc-MA6083-PROJECT BUDGET & COST MANAGEMENT - A and F")
    ).toBe("MA6083");
  });

  it("allows only the current course read-only discovery endpoints", () => {
    expect(
      validateDiscoveryEndpoint(
        "_2707107_1",
        "https://ntulearn.ntu.edu.sg/learn/api/v1/courses/_2707107_1/contents/ROOT/children?page=2",
        "https://ntulearn.ntu.edu.sg"
      ).pathname
    ).toBe("/learn/api/v1/courses/_2707107_1/contents/ROOT/children");
    expect(
      validateDiscoveryEndpoint(
        "_2707107_1",
        "https://ntulearn.ntu.edu.sg/learn/api/v1/courses/_2707107_1/announcements",
        "https://ntulearn.ntu.edu.sg"
      ).pathname
    ).toBe("/learn/api/v1/courses/_2707107_1/announcements");
    expect(
      validateDiscoveryEndpoint(
        "_2707107_1",
        "https://ntulearn.ntu.edu.sg/learn/api/v1/courses/_2707107_1/contents/_123_1",
        "https://ntulearn.ntu.edu.sg"
      ).pathname
    ).toBe("/learn/api/v1/courses/_2707107_1/contents/_123_1");
  });

  it("rejects another course, origin, or write-shaped endpoint", () => {
    for (const endpoint of [
      "https://ntulearn.ntu.edu.sg/learn/api/v1/courses/_other_1/announcements",
      "https://files.example.test/learn/api/v1/courses/_2707107_1/announcements",
      "https://ntulearn.ntu.edu.sg/learn/api/v1/courses/_2707107_1/contents/ROOT/delete"
    ]) {
      expect(() =>
        validateDiscoveryEndpoint("_2707107_1", endpoint, "https://ntulearn.ntu.edu.sg")
      ).toThrow("outside the approved read-only course API scope");
    }
  });
});
