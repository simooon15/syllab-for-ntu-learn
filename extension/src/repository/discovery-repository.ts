import type { ScanSummary } from "@syllab/contracts";

import type { DiscoveryCheckpoint } from "../discovery/domain";
import { SCAN_SUMMARIES_KEY } from "./course-index-repository";
import type { StorageArea } from "./schema-repository";

export const DISCOVERY_CHECKPOINTS_KEY = "syllab.discoveryCheckpoints" as const;

export class DiscoveryRepository {
  constructor(private readonly storage: StorageArea) {}

  async getCheckpoint(scanId: string): Promise<DiscoveryCheckpoint | undefined> {
    const current = await this.storage.get(DISCOVERY_CHECKPOINTS_KEY);
    const records = current[DISCOVERY_CHECKPOINTS_KEY];
    if (typeof records !== "object" || records === null || Array.isArray(records)) return undefined;
    return (records as Record<string, DiscoveryCheckpoint>)[scanId];
  }

  async findRecoverableDiscovery(courseId: string): Promise<{
    summary: ScanSummary;
    checkpoint: DiscoveryCheckpoint;
  } | null> {
    const current = await this.storage.get([SCAN_SUMMARIES_KEY, DISCOVERY_CHECKPOINTS_KEY]);
    const scans = Array.isArray(current[SCAN_SUMMARIES_KEY])
      ? (current[SCAN_SUMMARIES_KEY] as ScanSummary[])
      : [];
    const summary = scans.find(
      (scan) =>
        scan.courseId === courseId &&
        scan.status === "Scanning" &&
        scan.recoverable &&
        scan.phase === "discovery"
    );
    if (!summary) return null;
    const records = current[DISCOVERY_CHECKPOINTS_KEY];
    if (typeof records !== "object" || records === null || Array.isArray(records)) return null;
    const checkpoint = (records as Record<string, DiscoveryCheckpoint>)[summary.scanId];
    return checkpoint && !checkpoint.complete ? { summary, checkpoint } : null;
  }

  async saveCheckpoint(checkpoint: DiscoveryCheckpoint): Promise<void> {
    const current = await this.storage.get(DISCOVERY_CHECKPOINTS_KEY);
    const records =
      typeof current[DISCOVERY_CHECKPOINTS_KEY] === "object" &&
      current[DISCOVERY_CHECKPOINTS_KEY] !== null &&
      !Array.isArray(current[DISCOVERY_CHECKPOINTS_KEY])
        ? (current[DISCOVERY_CHECKPOINTS_KEY] as Record<string, DiscoveryCheckpoint>)
        : {};
    await this.storage.set({
      [DISCOVERY_CHECKPOINTS_KEY]: { ...records, [checkpoint.scanId]: checkpoint }
    });
  }

  async upsertScanSummary(summary: ScanSummary): Promise<void> {
    const current = await this.storage.get(SCAN_SUMMARIES_KEY);
    const scans = Array.isArray(current[SCAN_SUMMARIES_KEY])
      ? (current[SCAN_SUMMARIES_KEY] as ScanSummary[])
      : [];
    const next = scans.filter((scan) => scan.scanId !== summary.scanId);
    next.unshift(summary);
    await this.storage.set({ [SCAN_SUMMARIES_KEY]: next });
  }

  async getScanSummary(scanId: string): Promise<ScanSummary | undefined> {
    const current = await this.storage.get(SCAN_SUMMARIES_KEY);
    const scans = Array.isArray(current[SCAN_SUMMARIES_KEY])
      ? (current[SCAN_SUMMARIES_KEY] as ScanSummary[])
      : [];
    return scans.find((scan) => scan.scanId === scanId);
  }
}
