import { describe, expect, it } from "vitest";

import type { DiscoveryCheckpoint } from "../discovery/domain";
import { SCAN_SUMMARIES_KEY } from "./course-index-repository";
import { DISCOVERY_CHECKPOINTS_KEY, DiscoveryRepository } from "./discovery-repository";
import type { StorageArea } from "./schema-repository";

class MemoryStorage implements StorageArea {
  readonly values: Record<string, unknown> = {};

  get(keys: string | string[]): Promise<Record<string, unknown>> {
    const requested = Array.isArray(keys) ? keys : [keys];
    return Promise.resolve(Object.fromEntries(requested.map((key) => [key, this.values[key]])));
  }

  set(items: Record<string, unknown>): Promise<void> {
    Object.assign(this.values, structuredClone(items));
    return Promise.resolve();
  }
}

const checkpoint: DiscoveryCheckpoint = {
  scanId: "scan_resume",
  courseId: "course_123",
  queue: [
    {
      nativeItemId: "ROOT",
      depth: 0,
      discoveryPath: ["content-root"],
      nextPageUrl:
        "https://ntulearn.ntu.edu.sg/learn/api/v1/courses/course_123/contents/ROOT/children?page=2"
    }
  ],
  visitedContainerIds: [],
  visitedItemIds: ["item_1"],
  visitedPageUrls: [
    "https://ntulearn.ntu.edu.sg/learn/api/v1/courses/course_123/contents/ROOT/children"
  ],
  detailQueue: [],
  visitedDetailItemIds: [],
  sources: [],
  issues: [],
  pagesProcessed: 1,
  announcementsComplete: false,
  complete: false
};

describe("DiscoveryRepository", () => {
  it("persists and resolves a recoverable discovery checkpoint", async () => {
    const storage = new MemoryStorage();
    const repository = new DiscoveryRepository(storage);
    await repository.upsertScanSummary({
      scanId: checkpoint.scanId,
      courseId: checkpoint.courseId,
      status: "Scanning",
      recoverable: true,
      phase: "discovery"
    });
    await repository.saveCheckpoint(checkpoint);

    await expect(repository.getCheckpoint(checkpoint.scanId)).resolves.toEqual(checkpoint);
    await expect(repository.findRecoverableDiscovery(checkpoint.courseId)).resolves.toEqual({
      summary: (storage.values[SCAN_SUMMARIES_KEY] as unknown[])[0],
      checkpoint
    });
    expect(storage.values[DISCOVERY_CHECKPOINTS_KEY]).toEqual({ scan_resume: checkpoint });
  });

  it("does not resume a checkpoint after discovery completed", async () => {
    const storage = new MemoryStorage();
    const repository = new DiscoveryRepository(storage);
    await repository.upsertScanSummary({
      scanId: checkpoint.scanId,
      courseId: checkpoint.courseId,
      status: "Scanning",
      recoverable: true,
      phase: "discovery"
    });
    await repository.saveCheckpoint({ ...checkpoint, complete: true });

    await expect(repository.findRecoverableDiscovery(checkpoint.courseId)).resolves.toBeNull();
  });
});
