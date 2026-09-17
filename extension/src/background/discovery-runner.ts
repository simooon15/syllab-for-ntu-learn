import { CONTRACT_VERSION, isRecord, type ScanSummary } from "@syllab/contracts";

import { DiscoveryApiError, type DiscoveryApiPort } from "../discovery/domain";
import { runDiscovery } from "../discovery/engine";
import { DiscoveryRepository } from "../repository/discovery-repository";
import { withScanLease } from "../recovery/lease";

class ChromeTabDiscoveryApi implements DiscoveryApiPort {
  constructor(
    private readonly tabId: number,
    private readonly courseId: string
  ) {}

  async get(endpoint: string): Promise<unknown> {
    const response: unknown = await chrome.tabs.sendMessage(this.tabId, {
      contractVersion: CONTRACT_VERSION,
      type: "DISCOVERY_API_GET",
      courseId: this.courseId,
      endpoint
    });
    if (!isRecord(response) || response.ok !== true) {
      throw new DiscoveryApiError(
        isRecord(response) && typeof response.message === "string"
          ? response.message
          : "Course API bridge returned an invalid response",
        isRecord(response) && typeof response.status === "number" ? response.status : undefined
      );
    }
    return response.payload;
  }
}

export interface DiscoveryRunSummary {
  scanId: string;
  discoveryStatus: "Complete" | "Partial" | "Failed";
  sourceCount: number;
  issueCount: number;
  pagesProcessed: number;
  resumed: boolean;
}

export async function startDiscovery(
  courseId: string,
  tabId: number,
  restartScanId?: string
): Promise<DiscoveryRunSummary> {
  const repository = new DiscoveryRepository(chrome.storage.local);
  const recoverable = restartScanId ? null : await repository.findRecoverableDiscovery(courseId);
  const scanId = restartScanId ?? recoverable?.summary.scanId ?? crypto.randomUUID();
  const summary: ScanSummary = recoverable?.summary ?? {
    scanId,
    courseId,
    status: "Scanning",
    recoverable: true,
    phase: "discovery"
  };
  await repository.upsertScanSummary(summary);

  const result = await withScanLease(chrome.storage.local, scanId, () =>
    runDiscovery({
      scanId,
      courseId,
      origin: "https://ntulearn.ntu.edu.sg",
      api: new ChromeTabDiscoveryApi(tabId, courseId),
      ...(recoverable ? { checkpoint: recoverable.checkpoint } : {}),
      onCheckpoint: (value) => repository.saveCheckpoint(value)
    })
  );

  const latest = await repository.getScanSummary(scanId);
  if (latest?.status !== "Interrupted") {
    await repository.upsertScanSummary(
      result.status === "Failed"
        ? { ...summary, status: "Failed", recoverable: false, phase: "discovery" }
        : { ...summary, phase: "fetch" }
    );
  }
  return {
    scanId,
    discoveryStatus: result.status,
    sourceCount: result.checkpoint.sources.length,
    issueCount: result.checkpoint.issues.length,
    pagesProcessed: result.checkpoint.pagesProcessed,
    resumed: recoverable !== null
  };
}
