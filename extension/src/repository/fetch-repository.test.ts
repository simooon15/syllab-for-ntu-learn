import { describe, expect, it } from "vitest";

import type { FetchCheckpoint } from "../fetch/domain";
import { FETCH_CHECKPOINTS_KEY, FetchRepository } from "./fetch-repository";
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

describe("FetchRepository", () => {
  it("persists a waiting permission checkpoint across worker restarts", async () => {
    const storage = new MemoryStorage();
    const repository = new FetchRepository(storage);
    const checkpoint: FetchCheckpoint = {
      scanId: "scan_1",
      pendingOrigins: [
        {
          origin: "https://files.blackboard.com",
          permissionPattern: "https://files.blackboard.com/*",
          sourceIds: ["attachment:1"],
          decision: "pending",
          requested: false
        }
      ],
      results: [],
      complete: false
    };
    await repository.saveCheckpoint(checkpoint);
    await expect(repository.getCheckpoint("scan_1")).resolves.toEqual(checkpoint);
    expect(storage.values[FETCH_CHECKPOINTS_KEY]).toEqual({ scan_1: checkpoint });
  });
});
