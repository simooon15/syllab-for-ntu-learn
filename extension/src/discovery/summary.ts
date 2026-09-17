import type { DiscoveryCheckpoint } from "./domain";

export interface DiscoveryAggregateSummary {
  detailCoverageComplete: boolean;
  complete: boolean;
  sourceCount: number;
  issueCount: number;
  contentPageCount: number;
  contentDetailCount: number;
  announcementPageCount: number;
  paginationDetected: boolean;
  contentMaxDepth: number;
  contentItemCount: number;
  assignmentCount: number;
  announcementCount: number;
  attachmentCount: number;
  attachmentOrigins: string[];
  attachmentsMissingRequestUrl: number;
}

export function summarizeDiscovery(checkpoint: DiscoveryCheckpoint): DiscoveryAggregateSummary {
  const contentPages = checkpoint.visitedPageUrls.filter((value) =>
    new URL(value).pathname.endsWith("/children")
  );
  const announcementPages = checkpoint.visitedPageUrls.filter((value) =>
    new URL(value).pathname.endsWith("/announcements")
  );
  const contentDetails = checkpoint.visitedPageUrls.filter((value) =>
    /\/contents\/[^/]+$/.test(new URL(value).pathname)
  );
  const pagePathCounts = new Map<string, number>();
  for (const value of checkpoint.visitedPageUrls) {
    const pathname = new URL(value).pathname;
    pagePathCounts.set(pathname, (pagePathCounts.get(pathname) ?? 0) + 1);
  }
  const contentSources = checkpoint.sources.filter(
    (source) => source.kind === "course-content-item" || source.kind === "assignment"
  );
  const attachmentSources = checkpoint.sources.filter((source) => source.kind === "attachment");
  const attachmentOrigins = [
    ...new Set(
      attachmentSources.flatMap((source) =>
        source.requestUrl ? [new URL(source.requestUrl).origin] : []
      )
    )
  ].sort();
  return {
    detailCoverageComplete: Array.isArray(checkpoint.visitedDetailItemIds),
    complete: checkpoint.complete,
    sourceCount: checkpoint.sources.length,
    issueCount: checkpoint.issues.length,
    contentPageCount: contentPages.length,
    contentDetailCount: contentDetails.length,
    announcementPageCount: announcementPages.length,
    paginationDetected: [...pagePathCounts.values()].some((count) => count > 1),
    contentMaxDepth: contentSources.reduce((maximum, source) => Math.max(maximum, source.depth), 0),
    contentItemCount: contentSources.length,
    assignmentCount: checkpoint.sources.filter((source) => source.kind === "assignment").length,
    announcementCount: checkpoint.sources.filter((source) => source.kind === "announcement").length,
    attachmentCount: attachmentSources.length,
    attachmentOrigins,
    attachmentsMissingRequestUrl: attachmentSources.filter((source) => !source.requestUrl).length
  };
}
