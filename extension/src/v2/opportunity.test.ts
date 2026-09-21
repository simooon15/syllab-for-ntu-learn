import { describe, expect, it } from "vitest";

import type { CourseRecord } from "./domain";
import {
  afterTransientFailure,
  needsFreshnessAttention,
  nextOpportunityAt,
  startMaintenanceCheck
} from "./opportunity";

describe("Opportunity Checking throttle", () => {
  const now = new Date("2026-09-19T12:00:00.000Z");

  it("does not schedule historical or unestablished courses", () => {
    expect(
      nextOpportunityAt(
        {
          unchangedStreak: 0,
          consecutiveFailures: 0,
          currentSemester: false,
          established: true
        },
        now
      )
    ).toBeNull();
  });

  it("backs unchanged checks off from six to twelve to twenty-four hours", () => {
    const base = {
      lastSuccessfulCheckAt: "2026-09-19T00:00:00.000Z",
      consecutiveFailures: 0,
      currentSemester: true,
      established: true
    };
    expect(nextOpportunityAt({ ...base, unchangedStreak: 0 }, now)?.toISOString()).toBe(
      "2026-09-19T06:00:00.000Z"
    );
    expect(nextOpportunityAt({ ...base, unchangedStreak: 1 }, now)?.toISOString()).toBe(
      "2026-09-19T12:00:00.000Z"
    );
    expect(nextOpportunityAt({ ...base, unchangedStreak: 2 }, now)?.toISOString()).toBe(
      "2026-09-20T00:00:00.000Z"
    );
  });

  it("retries quietly and escalates only after repeated failure", () => {
    const initial = {
      unchangedStreak: 0,
      consecutiveFailures: 0,
      currentSemester: true,
      established: true
    };
    const one = afterTransientFailure(initial, now);
    const two = afterTransientFailure(one, now);
    const three = afterTransientFailure(two, now);
    expect(one.nextAttemptAt).toBe("2026-09-19T12:05:00.000Z");
    expect(needsFreshnessAttention(two, now)).toBe(false);
    expect(needsFreshnessAttention(three, now)).toBe(true);
  });

  it("does not create a background workflow when no NTU Learn tab is readable", async () => {
    const starts: unknown[] = [];
    const course = { courseId: "course-1" } as CourseRecord;
    const result = await startMaintenanceCheck(
      course,
      {
        start: (...args) => {
          starts.push(args);
          throw new Error("must not start");
        }
      },
      () => Promise.resolve(undefined)
    );
    expect(result).toBeNull();
    expect(starts).toHaveLength(0);
  });

  it("passes live NTU Learn tab context into a manual maintenance workflow", async () => {
    const course = { courseId: "course-1" } as CourseRecord;
    const contexts: Array<{ tabId: number }> = [];
    const workflow = { workflowId: "wf-1" } as Awaited<
      ReturnType<Parameters<typeof startMaintenanceCheck>[1]["start"]>
    >;
    const result = await startMaintenanceCheck(
      course,
      {
        start: (_course, _kind, context) => {
          contexts.push(context);
          return Promise.resolve(workflow);
        }
      },
      () => Promise.resolve(42)
    );
    expect(result).toBe(workflow);
    expect(contexts).toEqual([{ tabId: 42 }]);
  });
});
