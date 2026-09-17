import type { DiscoveryIssue } from "@syllab/contracts";

import type { ParseResult } from "../parser/domain";
import type { FetchCheckpoint } from "../fetch/domain";

export interface ScanIssue {
  sourceId?: string;
  reason:
    | "Permission Denied"
    | "Unsupported"
    | "Parsing Failed"
    | "Could Not Access"
    | "Interrupted Processing";
  retryable: boolean;
  detail: string;
}

export function scanIssues(options: {
  discoveryIssues: readonly DiscoveryIssue[];
  fetch?: FetchCheckpoint;
  parsed: readonly { sourceId: string; result: ParseResult }[];
  interrupted?: boolean;
}): ScanIssue[] {
  const issues: ScanIssue[] = options.discoveryIssues.map((issue) => ({
    ...(issue.sourceId ? { sourceId: issue.sourceId } : {}),
    reason: "Could Not Access",
    retryable: issue.retryable,
    detail: issue.detail
  }));
  for (const result of options.fetch?.results ?? []) {
    if (result.status === "permission-denied") {
      issues.push({
        sourceId: result.sourceId,
        reason: "Permission Denied",
        retryable: true,
        detail: "The exact attachment host permission was declined."
      });
    } else if (result.status === "failed") {
      issues.push({
        sourceId: result.sourceId,
        reason: "Could Not Access",
        retryable: true,
        detail: result.errorCode ?? "The source could not be fetched."
      });
    }
  }
  for (const record of options.parsed) {
    if (record.result.status === "unsupported") {
      issues.push({
        sourceId: record.sourceId,
        reason: "Unsupported",
        retryable: false,
        detail: record.result.diagnosticsCode ?? "This file format is not supported in the MVP."
      });
    } else if (record.result.status === "failed") {
      issues.push({
        sourceId: record.sourceId,
        reason: "Parsing Failed",
        retryable: true,
        detail: record.result.diagnosticsCode ?? "The supported file could not be parsed."
      });
    }
  }
  if (options.interrupted) {
    issues.push({
      reason: "Interrupted Processing",
      retryable: true,
      detail: "Processing stopped before this scan reached a normal result."
    });
  }
  return issues;
}
