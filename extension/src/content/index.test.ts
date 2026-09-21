import { describe, expect, it } from "vitest";

import {
  detectCourseContext,
  extractDisplayCourseCode,
  validateDiscoveryEndpoint,
  validateEnrollmentEndpoint
} from "./index";

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

  it("allows only the enrollment reads Semester discovery performs", () => {
    const origin = "https://ntulearn.ntu.edu.sg";
    expect(validateEnrollmentEndpoint("/learn/api/public/v1/users/me", origin).pathname).toBe(
      "/learn/api/public/v1/users/me"
    );
    // A reply body may hand back an absolute URL; only its path may be replayed.
    // The enrollment list lives on the Ultra surface, not the public REST one; the signed-in
    // instance serves it and 404s the `public/v1` equivalent.
    expect(
      validateEnrollmentEndpoint(
        `${origin}/learn/api/v1/users/me/memberships?expand=course&limit=200&offset=200`,
        origin
      ).pathname
    ).toBe("/learn/api/v1/users/me/memberships");
  });

  it("rejects an enrollment read that reaches past that scope", () => {
    const origin = "https://ntulearn.ntu.edu.sg";
    for (const endpoint of [
      // The course scope is not reachable through the enrollment one, or the two would be one.
      "/learn/api/v1/courses/_2707107_1/contents/ROOT/children",
      "/learn/api/v1/users/me/memberships/extra",
      "/learn/api/v1/users/someone-else/memberships",
      "/learn/api/v1/terms",
      "https://files.example.test/learn/api/public/v1/users/me"
    ]) {
      expect(() => validateEnrollmentEndpoint(endpoint, origin)).toThrow("Enrollment read refused");
    }
  });
});
