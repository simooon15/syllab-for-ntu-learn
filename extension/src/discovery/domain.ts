import type { DiscoveredSource, DiscoveryIssue } from "@syllab/contracts";

export interface DiscoveryApiPort {
  get(endpoint: string): Promise<unknown>;
}

export interface DiscoveryQueueItem {
  nativeItemId: string;
  parentSourceId?: string;
  depth: number;
  discoveryPath: string[];
  nextPageUrl?: string;
  itemsSeen?: number;
}

export interface DiscoveryDetailQueueItem {
  nativeItemId: string;
  sourceId: string;
}

export interface DiscoveryCheckpoint {
  scanId: string;
  courseId: string;
  queue: DiscoveryQueueItem[];
  visitedContainerIds: string[];
  visitedItemIds: string[];
  visitedPageUrls: string[];
  detailQueue: DiscoveryDetailQueueItem[];
  visitedDetailItemIds: string[];
  sources: DiscoveredSource[];
  issues: DiscoveryIssue[];
  pagesProcessed: number;
  announcementsNextPageUrl?: string;
  announcementsComplete: boolean;
  complete: boolean;
}

export interface DiscoveryOptions {
  scanId: string;
  courseId: string;
  origin: string;
  api: DiscoveryApiPort;
  checkpoint?: DiscoveryCheckpoint;
  onCheckpoint?(checkpoint: DiscoveryCheckpoint): Promise<void>;
  maxDepth?: number;
  maxPages?: number;
}

export interface DiscoveryResult {
  checkpoint: DiscoveryCheckpoint;
  status: "Complete" | "Partial" | "Failed";
}

export class DiscoveryApiError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "DiscoveryApiError";
  }
}
