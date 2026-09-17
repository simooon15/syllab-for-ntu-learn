import { describe, expect, it } from "vitest";

import {
  COURSE_INDEX_KEY,
  CourseIndexRepository,
  SCAN_SUMMARIES_KEY
} from "./course-index-repository";
import type { StorageArea } from "./schema-repository";

function memoryStorage(values: Record<string, unknown>): StorageArea {
  return {
    get(keys) {
      const requested = Array.isArray(keys) ? keys : [keys];
      return Promise.resolve(
        Object.fromEntries(
          requested.filter((key) => key in values).map((key) => [key, values[key]])
        )
      );
    },
    set(items) {
      Object.assign(values, items);
      return Promise.resolve();
    }
  };
}

describe("course index repository", () => {
  it("reads the current course without using its title as identity", async () => {
    const repository = new CourseIndexRepository(
      memoryStorage({
        [COURSE_INDEX_KEY]: [
          {
            courseId: "course_native_id",
            courseName: "Renamed Course",
            hasEffectiveScan: true,
            hasBrief: true,
            pendingReviewCount: 0
          }
        ]
      })
    );
    expect(await repository.findCourse("course_native_id")).toMatchObject({
      courseId: "course_native_id",
      courseName: "Renamed Course"
    });
  });

  it("returns only active or recoverable scans for entry priority", async () => {
    const repository = new CourseIndexRepository(
      memoryStorage({
        [SCAN_SUMMARIES_KEY]: [
          {
            scanId: "scan_old",
            courseId: "course_native_id",
            status: "Interrupted",
            recoverable: false
          },
          {
            scanId: "scan_active",
            courseId: "course_native_id",
            status: "WaitingForPermission",
            recoverable: true
          }
        ]
      })
    );
    expect(await repository.findEntryScan("course_native_id")).toMatchObject({
      scanId: "scan_active",
      status: "WaitingForPermission"
    });
  });

  it("persists an explicit resume before work continues", async () => {
    const values: Record<string, unknown> = {
      [SCAN_SUMMARIES_KEY]: [
        {
          scanId: "scan_interrupted",
          courseId: "course_native_id",
          status: "Interrupted",
          recoverable: true,
          phase: "extract"
        }
      ]
    };
    const repository = new CourseIndexRepository(memoryStorage(values));

    await expect(repository.resumeScan("scan_interrupted")).resolves.toMatchObject({
      status: "Scanning",
      phase: "extract"
    });
    await expect(repository.listScans()).resolves.toEqual([
      expect.objectContaining({ scanId: "scan_interrupted", status: "Scanning" })
    ]);
  });
});
