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

  it("keeps an extraction-failed scan reachable from the entry route", async () => {
    const repository = new CourseIndexRepository(
      memoryStorage({
        [SCAN_SUMMARIES_KEY]: [
          {
            scanId: "scan_failed_extract",
            courseId: "course_native_id",
            status: "Failed",
            recoverable: true,
            phase: "extract"
          }
        ]
      })
    );

    expect(await repository.findEntryScan("course_native_id")).toMatchObject({
      scanId: "scan_failed_extract",
      phase: "extract",
      recoverable: true
    });
  });

  it("prefers a newer recoverable failure over a stale interrupted discovery scan", async () => {
    const repository = new CourseIndexRepository(
      memoryStorage({
        [SCAN_SUMMARIES_KEY]: [
          {
            scanId: "scan_failed_extract",
            courseId: "course_native_id",
            status: "Failed",
            recoverable: true,
            phase: "extract"
          },
          {
            scanId: "scan_stale_discovery",
            courseId: "course_native_id",
            status: "Interrupted",
            recoverable: true,
            phase: "discovery"
          }
        ]
      })
    );

    expect(await repository.findEntryScan("course_native_id")).toMatchObject({
      scanId: "scan_failed_extract",
      phase: "extract"
    });
  });

  it("resumes an extraction-failed scan from its extract checkpoint", async () => {
    const values: Record<string, unknown> = {
      [SCAN_SUMMARIES_KEY]: [
        {
          scanId: "scan_failed_extract",
          courseId: "course_native_id",
          status: "Failed",
          recoverable: true,
          phase: "extract"
        }
      ]
    };
    const repository = new CourseIndexRepository(memoryStorage(values));

    await expect(repository.resumeScan("scan_failed_extract")).resolves.toMatchObject({
      status: "Scanning",
      phase: "extract"
    });
  });

  it("still refuses to resume a scan that is not recoverable", async () => {
    const values: Record<string, unknown> = {
      [SCAN_SUMMARIES_KEY]: [
        {
          scanId: "scan_failed_unrecoverable",
          courseId: "course_native_id",
          status: "Failed",
          recoverable: false,
          phase: "discovery"
        }
      ]
    };
    const repository = new CourseIndexRepository(memoryStorage(values));

    await expect(repository.resumeScan("scan_failed_unrecoverable")).resolves.toBeNull();
    expect(await repository.findEntryScan("course_native_id")).toBeNull();
  });

  it("does not let a superseded interrupted scan shadow a newer completed scan", async () => {
    // Real MA6084 shape: a finished scan on top, with an older interrupted extract checkpoint below.
    const repository = new CourseIndexRepository(
      memoryStorage({
        [SCAN_SUMMARIES_KEY]: [
          {
            scanId: "scan_complete",
            courseId: "course_native_id",
            status: "Complete",
            recoverable: false,
            phase: "extract"
          },
          {
            scanId: "scan_superseded",
            courseId: "course_native_id",
            status: "Interrupted",
            recoverable: true,
            phase: "extract"
          },
          {
            scanId: "scan_partial",
            courseId: "course_native_id",
            status: "Partial",
            recoverable: false,
            phase: "extract"
          }
        ]
      })
    );

    expect(await repository.findEntryScan("course_native_id")).toBeNull();
  });

  it("does not let a superseded interrupted scan shadow a newer partial scan", async () => {
    // Real MA6081 shape: a partial scan on top, with older interrupted scans below it.
    const repository = new CourseIndexRepository(
      memoryStorage({
        [SCAN_SUMMARIES_KEY]: [
          {
            scanId: "scan_partial",
            courseId: "course_native_id",
            status: "Partial",
            recoverable: false,
            phase: "extract"
          },
          {
            scanId: "scan_stale_discovery",
            courseId: "course_native_id",
            status: "Interrupted",
            recoverable: true,
            phase: "discovery"
          },
          {
            scanId: "scan_stale_extract",
            courseId: "course_native_id",
            status: "Interrupted",
            recoverable: true,
            phase: "extract"
          },
          {
            scanId: "scan_stale_fetch",
            courseId: "course_native_id",
            status: "Interrupted",
            recoverable: true,
            phase: "fetch"
          }
        ]
      })
    );

    expect(await repository.findEntryScan("course_native_id")).toBeNull();
  });

  it("still surfaces a scan that is genuinely running below a newer entry", async () => {
    const repository = new CourseIndexRepository(
      memoryStorage({
        [SCAN_SUMMARIES_KEY]: [
          {
            scanId: "scan_other_course",
            courseId: "other_course",
            status: "Scanning",
            recoverable: true,
            phase: "fetch"
          },
          {
            scanId: "scan_complete",
            courseId: "course_native_id",
            status: "Complete",
            recoverable: false,
            phase: "extract"
          },
          {
            scanId: "scan_running",
            courseId: "course_native_id",
            status: "Scanning",
            recoverable: true,
            phase: "discovery"
          }
        ]
      })
    );

    expect(await repository.findEntryScan("course_native_id")).toMatchObject({
      scanId: "scan_running",
      status: "Scanning"
    });
  });
});
