import { describe, expect, it } from "vitest";

import {
  ENROLLMENT_PATHS,
  EnrollmentUnavailable,
  academicTermNow,
  applyDiscovery,
  currentTermId,
  displayName,
  readDiscovery,
  semesterLabel,
  semesterName,
  type DiscoveredTerm,
  type EnrollmentApiPort,
  type EnrollmentStorePort
} from "./enrollment";
import type { CourseRecord, SemesterRecord } from "./schema";

/**
 * The discovery path PRD §5.1.5 locks: Blackboard term → Semester, curriculum Course → Course in
 * that Semester, nothing auto-scanned, and no Course ever dropped because it stopped being listed.
 *
 * The payloads below are trimmed copies of what a signed-in NTU Learn actually returned, which is
 * how the two paths were settled: `/learn/api/public/v1/users/me` answers 200, the memberships read
 * on that same surface answers 404, and the enrollment list under `/learn/api/v1/` answers 200 with
 * each Course's term inline. An earlier version of this file asserted the documented Blackboard
 * shape instead, and discovery failed against the real site with `HTTP 404`.
 */

const NOW = new Date("2026-10-05T00:00:00.000Z");

/** One enrollment, as NTU Learn returns it. */
function membership(overrides: { courseId: string; termId?: string; termName?: string }): unknown {
  const display = overrides.termName ? `${overrides.termName}-MA6081-B` : "26S1-MA6081-B";
  return {
    userHasHidden: false,
    courseCardColorIndex: 39,
    role: "S",
    courseId: overrides.courseId,
    isAvailable: true,
    modifiedDate: "2026-09-17T07:06:38.558Z",
    course: {
      displayId: display,
      courseId: display,
      name: "26S1-MAE-MSc-MA6081-FUNDAMENTALS OF PROJECT MANAGEMENT - B",
      isAvailable: true,
      ...(overrides.termId
        ? {
            termId: overrides.termId,
            term: {
              id: overrides.termId,
              name: overrides.termName ?? overrides.termId,
              durationType: "CONTINUOUS",
              startDate: null,
              endDate: null
            }
          }
        : {})
    }
  };
}

interface RecordingApi extends EnrollmentApiPort {
  calls: string[];
}

function api(routes: Record<string, unknown>): RecordingApi {
  const calls: string[] = [];
  return {
    calls,
    get(path: string) {
      calls.push(path);
      const key = Object.keys(routes)
        .filter((route) => path.startsWith(route))
        .sort((left, right) => right.length - left.length)[0];
      if (key === undefined) throw new Error(`unexpected path ${path}`);
      return Promise.resolve(routes[key]);
    }
  };
}

interface MemoryStore extends EnrollmentStorePort {
  semesters: Map<string, SemesterRecord>;
  courses: Map<string, CourseRecord>;
}

/** A store that only records what was written, so the merge rules can be read off the assertions. */
function store(seed: { semesters?: SemesterRecord[]; courses?: CourseRecord[] } = {}): MemoryStore {
  const semesters = new Map((seed.semesters ?? []).map((item) => [item.semesterId, item]));
  const courses = new Map((seed.courses ?? []).map((item) => [item.courseId, item]));
  return {
    semesters,
    courses,
    readSemesters: () => Promise.resolve([...semesters.values()]),
    readCourses: () => Promise.resolve([...courses.values()]),
    saveSemester: (semester) => {
      semesters.set(semester.semesterId, semester);
      return Promise.resolve();
    },
    upsertCourse: (course) => {
      courses.set(course.courseId, course);
      return Promise.resolve();
    }
  };
}

function courseRecord(overrides: Partial<CourseRecord> = {}): CourseRecord {
  return {
    courseId: "_2707107_1",
    semesterId: "_321_1",
    courseCode: "MA6081",
    courseName: "Fundamentals of Project Management",
    curriculum: true,
    established: true,
    currentRevision: 4,
    consecutiveCheckFailures: 0,
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides
  };
}

describe("reading a discovery", () => {
  it("reads the signed-in user and their enrollments in two requests", async () => {
    const port = api({
      "/learn/api/public/v1/users/me": { id: "_2348553_1", userName: "xinyu067" },
      "/learn/api/v1/users/me/memberships": {
        paging: { nextPage: "", limit: 1000, offset: 0 },
        results: [
          membership({ courseId: "_2707107_1", termId: "_321_1", termName: "26S1" }),
          // An organization carries no term, which is what makes it non-curriculum.
          membership({ courseId: "05000250_bbtestorga" })
        ]
      }
    });

    const discovery = await readDiscovery(port);

    expect(port.calls).toEqual([
      "/learn/api/public/v1/users/me",
      "/learn/api/v1/users/me/memberships?expand=course&limit=200"
    ]);
    expect(discovery.terms).toEqual([{ nativeTermId: "_321_1", label: "AY2026/27 · Semester 1" }]);
    expect(discovery.courses).toEqual([
      {
        nativeCourseId: "_2707107_1",
        courseCode: "MA6081",
        courseName: "MA6081 Fundamentals of Project Management - B",
        nativeTermId: "_321_1"
      }
    ]);
  });

  it("writes the name the way English writes a title, not in the capitals it arrived in", () => {
    // The real names, trimmed and re-cased. `AI` stays an acronym; `OF` and `FOR` are the words a
    // title leaves down; `MA6081` is a code and keeps its shape.
    expect(
      displayName("26S1-MAE-MSc-MA6081-FUNDAMENTALS OF PROJECT MANAGEMENT - B", "MA6081")
    ).toBe("MA6081 Fundamentals of Project Management - B");
    expect(
      displayName("26S1-MAE-MSc-MA6083-PROJECT BUDGET & COST MANAGEMENT - A and F", "MA6083")
    ).toBe("MA6083 Project Budget & Cost Management - A and F");
    expect(displayName("26S1-MAE-MSc-MA6094-AGENTIC AI FOR PROJECT MANAGEMENT-A", "MA6094")).toBe(
      "MA6094 Agentic AI for Project Management-A"
    );
  });

  it("leaves a name that carries no code alone apart from its case", () => {
    expect(displayName("SYSTEMS ENGINEERING FUNDAMENTALS", "MA6086")).toBe(
      "Systems Engineering Fundamentals"
    );
    // A title never ends on a lower-case word.
    expect(displayName("INTRODUCTION TO THE", "MA6086")).toBe("Introduction to The");
  });

  it("leaves a non-curriculum term and its Courses out", async () => {
    // Both entries below are real: NTU Learn serves a term called `Non-curriculum` holding short
    // courses like `26S1_YLGC01`. PRD §5.1.5 excludes non-curriculum by default, and the term's own
    // name is the only signal the API gives. (Gate 3 finding F9.)
    const port = api({
      "/learn/api/public/v1/users/me": { id: "user_1" },
      "/learn/api/v1/users/me/memberships": {
        results: [
          membership({ courseId: "_2707107_1", termId: "_321_1", termName: "26S1" }),
          {
            role: "S",
            courseId: "_11_1_course",
            course: {
              displayId: "26S1_YLGC01",
              name: "26S1_YLGC01",
              termId: "_11_1",
              term: { id: "_11_1", name: "Non-curriculum" }
            }
          }
        ]
      }
    });

    const discovery = await readDiscovery(port);

    expect(discovery.courses.map((course) => course.nativeCourseId)).toEqual(["_2707107_1"]);
    expect(discovery.terms.map((term) => term.nativeTermId)).toEqual(["_321_1"]);
  });

  it("keys the Course on the native id, not the term-and-code label beside it", async () => {
    // `course.courseId` repeats `displayId` and changes every semester; the Ultra routes use the
    // outer id. Keying on the wrong one would re-create every Course on rollover.
    const port = api({
      "/learn/api/public/v1/users/me": { id: "user_1" },
      "/learn/api/v1/users/me/memberships": {
        results: [membership({ courseId: "_2707107_1", termId: "_321_1", termName: "26S1" })]
      }
    });
    const discovery = await readDiscovery(port);
    expect(discovery.courses[0]?.nativeCourseId).toBe("_2707107_1");
  });

  it("follows paging, and keeps every request on the one path the content script serves", async () => {
    const second = "/learn/api/v1/users/me/memberships?expand=course&limit=200&offset=200";
    const port = api({
      "/learn/api/public/v1/users/me": { id: "user_1" },
      "/learn/api/v1/users/me/memberships": {
        results: [membership({ courseId: "_2707107_1", termId: "_321_1", termName: "26S1" })],
        paging: { nextPage: second }
      },
      [second]: {
        results: [membership({ courseId: "_2707108_1", termId: "_322_1", termName: "26S2" })]
      }
    });

    const discovery = await readDiscovery(port);

    expect(port.calls).toContain(second);
    expect(port.calls.every((path) => path.startsWith("/learn/api/"))).toBe(true);
    expect(discovery.courses).toHaveLength(2);
  });

  it("says so plainly when the session cannot be read", async () => {
    const port = api({ "/learn/api/public/v1/users/me": { message: "not authenticated" } });
    await expect(readDiscovery(port)).rejects.toBeInstanceOf(EnrollmentUnavailable);
  });

  it("reads the paths it says it reads", () => {
    expect(ENROLLMENT_PATHS.me).toBe("/learn/api/public/v1/users/me");
    expect(ENROLLMENT_PATHS.memberships).toBe(
      "/learn/api/v1/users/me/memberships?expand=course&limit=200"
    );
  });
});

describe("the Semester label", () => {
  it("translates the term names NTU Learn actually uses", () => {
    expect(semesterLabel("26S1")).toBe("AY2026/27 · Semester 1");
    expect(semesterLabel("19S1")).toBe("AY2019/20 · Semester 1");
    expect(semesterLabel("26S2")).toBe("AY2026/27 · Semester 2");
    expect(semesterLabel("26S1 Term")).toBe("AY2026/27 · Semester 1");
    // The acronym shape the Product Owner writes is understood as it stands.
    expect(semesterLabel("AY2026/27 · Semester 1")).toBe("AY2026/27 · Semester 1");
  });

  it("leaves a name it cannot read alone rather than inventing a year", () => {
    expect(semesterLabel("Continuing Education")).toBe("Continuing Education");
    expect(semesterName("Continuing Education")).toBeNull();
  });
});

describe("which term is Current", () => {
  const terms: DiscoveredTerm[] = [
    { nativeTermId: "_321_1", label: "AY2026/27 · Semester 1" },
    { nativeTermId: "_322_1", label: "AY2026/27 · Semester 2" }
  ];

  it("is the term the calendar says now falls in", () => {
    expect(currentTermId(terms, NOW)).toBe("_321_1");
    expect(currentTermId(terms, new Date("2027-03-01T00:00:00.000Z"))).toBe("_322_1");
    // January to May is the second term of the academic year that began last August.
    expect(academicTermNow(new Date("2027-01-10T00:00:00.000Z"))).toEqual({
      startYear: 2026,
      term: 2
    });
  });

  it("still names one when the calendar matches nothing", () => {
    // A student enrolled only in a past term sees that term, not an empty dashboard.
    const past: DiscoveredTerm[] = [{ nativeTermId: "_141_1", label: "AY2019/20 · Semester 1" }];
    expect(currentTermId(past, NOW)).toBe("_141_1");
    expect(currentTermId([], NOW)).toBeNull();
  });
});

describe("writing a discovery", () => {
  const discovery = {
    terms: [
      { nativeTermId: "_321_1", label: "AY2026/27 · Semester 1" },
      { nativeTermId: "_322_1", label: "AY2025/26 · Semester 2" }
    ],
    courses: [
      {
        nativeCourseId: "_2707107_1",
        courseCode: "MA6081",
        courseName: "Fundamentals of Project Management",
        nativeTermId: "_321_1"
      },
      {
        nativeCourseId: "_2707108_1",
        courseCode: "MA6083",
        courseName: "Statistics",
        nativeTermId: "_322_1"
      }
    ]
  };

  it("creates the Semester and Course records that were never created at runtime", async () => {
    const target = store();
    const applied = await applyDiscovery(target, discovery, NOW);

    expect(applied).toEqual({ semesters: 2, courses: 2, currentSemesterId: "_321_1" });
    expect(target.semesters.get("_321_1")?.status).toBe("Current");
    expect(target.semesters.get("_322_1")?.status).toBe("Historical");
    // Auto-discovery is not auto-scan: a discovered Course arrives Not Established.
    expect(target.courses.get("_2707107_1")).toMatchObject({
      semesterId: "_321_1",
      established: false,
      curriculum: true
    });
  });

  it("leaves everything the product already learned about a Course alone", async () => {
    const target = store({ courses: [courseRecord()] });
    await applyDiscovery(target, discovery, NOW);

    expect(target.courses.get("_2707107_1")).toMatchObject({
      established: true,
      currentRevision: 4,
      courseCode: "MA6081"
    });
  });

  it("marks a Course the native side stopped listing instead of deleting it", async () => {
    const target = store({ courses: [courseRecord({ courseId: "_dropped_1" })] });
    await applyDiscovery(target, discovery, NOW);

    expect(target.courses.get("_dropped_1")).toMatchObject({
      missingFromNative: true,
      established: true,
      currentRevision: 4
    });
  });

  it("clears the mark when the Course comes back", async () => {
    const target = store({ courses: [courseRecord({ missingFromNative: true })] });
    await applyDiscovery(target, discovery, NOW);

    expect(target.courses.get("_2707107_1")?.missingFromNative).toBe(false);
  });

  it("keeps a Semester's own first-seen time across rediscovery", async () => {
    const target = store({
      semesters: [
        {
          semesterId: "_321_1",
          nativeSemesterId: "_321_1",
          label: "AY2026/27 · Semester 1",
          status: "Current",
          discoveredAt: "2026-08-01T00:00:00.000Z",
          updatedAt: "2026-08-01T00:00:00.000Z"
        }
      ]
    });
    await applyDiscovery(target, discovery, NOW);

    const semester = target.semesters.get("_321_1");
    expect(semester?.discoveredAt).toBe("2026-08-01T00:00:00.000Z");
    expect(semester?.updatedAt).toBe(NOW.toISOString());
  });
});
