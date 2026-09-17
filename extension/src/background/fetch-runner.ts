import type { ScanSummary } from "@syllab/contracts";

import { fetchAttachment } from "../fetch/attachment-fetcher";
import type { FetchCheckpoint } from "../fetch/domain";
import { runFetch, type FetchEngineResult } from "../fetch/engine";
import { recordPermissionDecision } from "../fetch/permission-planner";
import {
  observeFirstUnapprovedRedirectOrigin,
  type RedirectDetails,
  type RedirectEventPort
} from "../fetch/redirect-observer";
import { DiscoveryRepository } from "../repository/discovery-repository";
import { FetchRepository } from "../repository/fetch-repository";

const NTU_LEARN_ORIGIN = "https://ntulearn.ntu.edu.sg";

const redirectEvent: RedirectEventPort = {
  addListener(listener, filter) {
    chrome.webRequest.onBeforeRedirect.addListener(listener, filter);
  },
  removeListener(listener) {
    chrome.webRequest.onBeforeRedirect.removeListener(listener);
  }
};

function publicState(checkpoint: FetchCheckpoint | undefined): {
  pendingOrigin: { origin: string; permissionPattern: string; sourceCount: number } | null;
  fetchedCount: number;
  deniedCount: number;
  failedCount: number;
  signatureCounts: Record<string, number>;
  finalOrigins: string[];
  grantedOrigins: string[];
  deniedOrigins: string[];
  suspiciousCount: number;
  complete: boolean;
} {
  const pending = checkpoint?.pendingOrigins.find((origin) => origin.decision === "pending");
  const fetched = checkpoint?.results.filter((result) => result.status === "fetched") ?? [];
  const signatureCounts: Record<string, number> = {};
  for (const result of fetched) {
    const signature = result.signature ?? "unknown";
    signatureCounts[signature] = (signatureCounts[signature] ?? 0) + 1;
  }
  return {
    pendingOrigin: pending
      ? {
          origin: pending.origin,
          permissionPattern: pending.permissionPattern,
          sourceCount: pending.sourceIds.length
        }
      : null,
    fetchedCount: fetched.length,
    deniedCount:
      checkpoint?.results.filter((result) => result.status === "permission-denied").length ?? 0,
    failedCount: checkpoint?.results.filter((result) => result.status === "failed").length ?? 0,
    signatureCounts,
    finalOrigins: [
      ...new Set(fetched.flatMap((result) => (result.finalOrigin ? [result.finalOrigin] : [])))
    ].sort(),
    grantedOrigins:
      checkpoint?.pendingOrigins
        .filter((origin) => origin.decision === "granted")
        .map((origin) => origin.origin)
        .sort() ?? [],
    deniedOrigins:
      checkpoint?.pendingOrigins
        .filter((origin) => origin.decision === "denied")
        .map((origin) => origin.origin)
        .sort() ?? [],
    suspiciousCount: fetched.filter(
      (result) =>
        result.signature?.startsWith("unknown:") === true &&
        result.byteLength !== undefined &&
        result.byteLength < 8
    ).length,
    complete: checkpoint?.complete ?? false
  };
}

async function persistScanStatus(
  discoveryRepository: DiscoveryRepository,
  courseId: string,
  scanId: string,
  result: FetchEngineResult
): Promise<void> {
  const latest = await discoveryRepository.getScanSummary(scanId);
  if (latest?.status === "Interrupted") return;
  const summary: ScanSummary =
    result.outcome === "WaitingForPermission"
      ? {
          scanId,
          courseId,
          status: "WaitingForPermission",
          recoverable: true,
          phase: "fetch"
        }
      : {
          scanId,
          courseId,
          status: "Scanning",
          recoverable: true,
          phase: "parse"
        };
  await discoveryRepository.upsertScanSummary(summary);
}

export async function startFetch(scanId: string): Promise<{
  outcome: FetchEngineResult["outcome"];
  state: ReturnType<typeof publicState>;
}> {
  const discoveryRepository = new DiscoveryRepository(chrome.storage.local);
  const fetchRepository = new FetchRepository(chrome.storage.local);
  const discovery = await discoveryRepository.getCheckpoint(scanId);
  if (!discovery?.complete) throw new Error("DISCOVERY_NOT_COMPLETE");
  const checkpoint = await fetchRepository.getCheckpoint(scanId);
  const result = await runFetch({
    scanId,
    sources: discovery.sources,
    approvedOrigin: NTU_LEARN_ORIGIN,
    ...(checkpoint ? { checkpoint } : {}),
    ports: {
      containsPermission: (permissionPattern) =>
        chrome.permissions.contains({ origins: [permissionPattern] }),
      observeRedirect: (requestUrl, approvedOrigins) =>
        observeFirstUnapprovedRedirectOrigin(requestUrl, approvedOrigins, redirectEvent, fetch),
      fetchAttachment: (sourceId, requestUrl) => fetchAttachment(sourceId, requestUrl),
      onCheckpoint: (value) => fetchRepository.saveCheckpoint(value)
    }
  });
  await persistScanStatus(discoveryRepository, discovery.courseId, scanId, result);
  return { outcome: result.outcome, state: publicState(result.checkpoint) };
}

export async function getFetchState(scanId: string): Promise<ReturnType<typeof publicState>> {
  return publicState(await new FetchRepository(chrome.storage.local).getCheckpoint(scanId));
}

export async function applyPermissionDecision(
  scanId: string,
  origin: string,
  granted: boolean
): Promise<{ outcome: FetchEngineResult["outcome"]; state: ReturnType<typeof publicState> }> {
  const repository = new FetchRepository(chrome.storage.local);
  const checkpoint = await repository.getCheckpoint(scanId);
  if (!checkpoint) throw new Error("FETCH_CHECKPOINT_NOT_FOUND");
  const pending = checkpoint.pendingOrigins.find((entry) => entry.origin === origin);
  if (!pending || pending.decision !== "pending") {
    throw new Error("PERMISSION_ORIGIN_NOT_PENDING");
  }
  if (granted) {
    const currentlyGranted = await chrome.permissions.contains({
      origins: [pending.permissionPattern]
    });
    if (!currentlyGranted) throw new Error("PERMISSION_NOT_GRANTED");
  }
  await repository.saveCheckpoint(recordPermissionDecision(checkpoint, origin, granted));
  return startFetch(scanId);
}

export type { RedirectDetails };
