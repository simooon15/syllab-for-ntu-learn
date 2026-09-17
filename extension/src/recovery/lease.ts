import type { ScanSummary } from "@syllab/contracts";

import type { StorageArea } from "../repository/schema-repository";

export const SCAN_LEASES_KEY = "syllab.scanLeases" as const;
export const SCAN_LEASE_DURATION_MS = 45_000;

export interface ScanLease {
  scanId: string;
  expiresAt: string;
}

function leasesFrom(value: unknown): Record<string, ScanLease> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, ScanLease>)
    : {};
}

export class ScanLeaseRepository {
  constructor(private readonly storage: StorageArea) {}

  async renew(scanId: string, now = new Date()): Promise<void> {
    const current = await this.storage.get(SCAN_LEASES_KEY);
    const leases = leasesFrom(current[SCAN_LEASES_KEY]);
    await this.storage.set({
      [SCAN_LEASES_KEY]: {
        ...leases,
        [scanId]: {
          scanId,
          expiresAt: new Date(now.getTime() + SCAN_LEASE_DURATION_MS).toISOString()
        }
      }
    });
  }

  async clear(scanId: string): Promise<void> {
    const current = await this.storage.get(SCAN_LEASES_KEY);
    const leases = leasesFrom(current[SCAN_LEASES_KEY]);
    const next = Object.fromEntries(Object.entries(leases).filter(([key]) => key !== scanId));
    await this.storage.set({ [SCAN_LEASES_KEY]: next });
  }

  async interruptExpired(scans: readonly ScanSummary[], now = new Date()): Promise<ScanSummary[]> {
    const current = await this.storage.get(SCAN_LEASES_KEY);
    const leases = leasesFrom(current[SCAN_LEASES_KEY]);
    return scans.map((scan) => {
      if (scan.status !== "Scanning") return structuredClone(scan);
      const lease = leases[scan.scanId];
      if (!lease || Date.parse(lease.expiresAt) > now.getTime()) return structuredClone(scan);
      return { ...structuredClone(scan), status: "Interrupted", recoverable: true };
    });
  }
}

export async function withScanLease<T>(
  storage: StorageArea,
  scanId: string,
  work: () => Promise<T>
): Promise<T> {
  const repository = new ScanLeaseRepository(storage);
  await repository.renew(scanId);
  const heartbeat = setInterval(() => void repository.renew(scanId), SCAN_LEASE_DURATION_MS / 3);
  try {
    return await work();
  } finally {
    clearInterval(heartbeat);
    await repository.clear(scanId);
  }
}
