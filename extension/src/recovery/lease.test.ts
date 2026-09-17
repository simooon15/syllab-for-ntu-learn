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

  it("spends the lease it acts on so a resumed scan is not interrupted again", async () => {
    const storage = memoryStorage({
      [SCAN_LEASES_KEY]: {
        expired: { scanId: "expired", expiresAt: "2026-09-16T23:59:00.000Z" }
      }
    });
    const repository = new ScanLeaseRepository(storage);

    const interrupted = await repository.interruptExpired(
      [{ scanId: "expired", courseId: "c", status: "Scanning", recoverable: true }],
      new Date("2026-09-17T00:00:00.000Z")
    );
    expect(interrupted[0]?.status).toBe("Interrupted");
    const leases = await storage.get(SCAN_LEASES_KEY);
    expect(leases[SCAN_LEASES_KEY]).toEqual({});

    // The user resumes the scan, so it is Scanning again. A later worker start must not use the
    // spent lease to interrupt it a second time, which previously locked the scan out entirely.
    const afterResume = await repository.interruptExpired(
      [{ scanId: "expired", courseId: "c", status: "Scanning", recoverable: true }],
      new Date("2026-09-17T01:00:00.000Z")
    );
    expect(afterResume[0]?.status).toBe("Scanning");
  });

  it("keeps leases that are still valid or belong to other scans", async () => {
    const storage = memoryStorage({
      [SCAN_LEASES_KEY]: {
        alive: { scanId: "alive", expiresAt: "2026-09-17T00:01:00.000Z" },
        expired: { scanId: "expired", expiresAt: "2026-09-16T23:59:00.000Z" }
      }
    });
    const repository = new ScanLeaseRepository(storage);

    await repository.interruptExpired(
      [
        { scanId: "alive", courseId: "c", status: "Scanning", recoverable: true },
        { scanId: "expired", courseId: "c", status: "Scanning", recoverable: true }
      ],
      new Date("2026-09-17T00:00:00.000Z")
    );

    const leases = await storage.get(SCAN_LEASES_KEY);
    expect(leases[SCAN_LEASES_KEY]).toEqual({
      alive: { scanId: "alive", expiresAt: "2026-09-17T00:01:00.000Z" }
    });
  });
});
