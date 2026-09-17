import { describe, expect, it } from "vitest";

import type { StorageArea } from "../repository/schema-repository";
import { SCAN_LEASES_KEY, ScanLeaseRepository } from "./lease";

function memoryStorage(initial: Record<string, unknown>): StorageArea {
  const values = { ...initial };
  return {
    get(keys) {
      const requested = Array.isArray(keys) ? keys : [keys];
      return Promise.resolve(Object.fromEntries(requested.map((key) => [key, values[key]])));
    },
    set(next) {
      Object.assign(values, next);
      return Promise.resolve();
    }
  };
}

describe("scan lease recovery", () => {
  it("marks only scanning work with an expired active lease as Interrupted", async () => {
    const repository = new ScanLeaseRepository(
      memoryStorage({
        [SCAN_LEASES_KEY]: {
          alive: { scanId: "alive", expiresAt: "2026-09-17T00:01:00.000Z" },
          expired: { scanId: "expired", expiresAt: "2026-09-16T23:59:00.000Z" }
        }
      })
    );
    const result = await repository.interruptExpired(
      [
        { scanId: "alive", courseId: "c", status: "Scanning", recoverable: true },
        { scanId: "expired", courseId: "c", status: "Scanning", recoverable: true },
        { scanId: "missing", courseId: "c", status: "Scanning", recoverable: true },
        { scanId: "done", courseId: "c", status: "Complete", recoverable: false }
      ],
      new Date("2026-09-17T00:00:00.000Z")
    );
    expect(result.map((scan) => scan.status)).toEqual([
      "Scanning",
      "Interrupted",
      "Scanning",
      "Complete"
    ]);
  });
});
