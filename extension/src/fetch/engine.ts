import type { DiscoveredSource } from "@syllab/contracts";

import type { AttachmentFetchResult, FetchCheckpoint } from "./domain";
import {
  addPendingOrigin,
  createFetchCheckpoint,
  exactOriginPattern,
  recordPermissionDecision
} from "./permission-planner";

export interface FetchEnginePorts {
  containsPermission(permissionPattern: string): Promise<boolean>;
  observeRedirect(requestUrl: string, approvedOrigins: ReadonlySet<string>): Promise<string | null>;
  fetchAttachment(sourceId: string, requestUrl: string): Promise<AttachmentFetchResult>;
  onCheckpoint(checkpoint: FetchCheckpoint): Promise<void>;
}

export interface FetchEngineResult {
  checkpoint: FetchCheckpoint;
  outcome: "Complete" | "Partial" | "WaitingForPermission";
}

function attachmentSources(sources: readonly DiscoveredSource[]): Array<{
  sourceId: string;
  requestUrl?: string;
}> {
  return sources.flatMap((source) =>
    source.kind === "attachment"
      ? [
          {
            sourceId: source.sourceId,
            ...(source.requestUrl ? { requestUrl: source.requestUrl } : {})
          }
        ]
      : []
  );
}

function upsertResult(checkpoint: FetchCheckpoint, result: AttachmentFetchResult): FetchCheckpoint {
  checkpoint.results = checkpoint.results.filter((entry) => entry.sourceId !== result.sourceId);
  checkpoint.results.push(result);
  return checkpoint;
}

export async function runFetch(options: {
  scanId: string;
  sources: readonly DiscoveredSource[];
  approvedOrigin: string;
  ports: FetchEnginePorts;
  checkpoint?: FetchCheckpoint;
}): Promise<FetchEngineResult> {
  const attachments = attachmentSources(options.sources);
  let checkpoint = structuredClone(
    options.checkpoint ?? createFetchCheckpoint(options.scanId, [], options.approvedOrigin)
  );
  checkpoint.results = checkpoint.results.filter(
    (result) =>
      !(
        result.status === "fetched" &&
        result.signature?.startsWith("unknown:") === true &&
        result.byteLength !== undefined &&
        result.byteLength < 8
      )
  );

  for (const pending of checkpoint.pendingOrigins) {
    if (
      pending.decision === "pending" &&
      (await options.ports.containsPermission(pending.permissionPattern))
    ) {
      checkpoint = recordPermissionDecision(checkpoint, pending.origin, true);
    }
  }

  for (const source of attachments) {
    if (checkpoint.results.some((result) => result.sourceId === source.sourceId)) continue;
    if (!source.requestUrl) {
      upsertResult(checkpoint, {
        sourceId: source.sourceId,
        status: "failed",
        errorCode: "MISSING_REQUEST_URL"
      });
      await options.ports.onCheckpoint(structuredClone(checkpoint));
      continue;
    }
    const denied = checkpoint.pendingOrigins.some(
      (origin) => origin.decision === "denied" && origin.sourceIds.includes(source.sourceId)
    );
    if (denied) {
      upsertResult(checkpoint, { sourceId: source.sourceId, status: "permission-denied" });
      await options.ports.onCheckpoint(structuredClone(checkpoint));
      continue;
    }

    let resolved = false;
    for (let hop = 0; hop < 5 && !resolved; hop += 1) {
      const approvedOrigins = new Set([
        options.approvedOrigin,
        ...checkpoint.pendingOrigins
          .filter((origin) => origin.decision === "granted")
          .map((origin) => origin.origin)
      ]);
      const redirectOrigin = await options.ports.observeRedirect(
        source.requestUrl,
        approvedOrigins
      );
      if (!redirectOrigin) {
        upsertResult(
          checkpoint,
          await options.ports.fetchAttachment(source.sourceId, source.requestUrl)
        );
        await options.ports.onCheckpoint(structuredClone(checkpoint));
        resolved = true;
        continue;
      }

      checkpoint = addPendingOrigin(checkpoint, redirectOrigin, source.sourceId);
      const pending = checkpoint.pendingOrigins.find((entry) => entry.origin === redirectOrigin);
      if (!pending) throw new Error("Observed permission origin was not checkpointed");
      if (pending.decision === "denied") {
        upsertResult(checkpoint, { sourceId: source.sourceId, status: "permission-denied" });
        await options.ports.onCheckpoint(structuredClone(checkpoint));
        resolved = true;
      } else if (
        pending.decision === "granted" ||
        (await options.ports.containsPermission(exactOriginPattern(redirectOrigin)))
      ) {
        checkpoint = recordPermissionDecision(checkpoint, redirectOrigin, true);
      } else {
        await options.ports.onCheckpoint(structuredClone(checkpoint));
        resolved = true;
      }
    }
    if (!resolved) {
      upsertResult(checkpoint, {
        sourceId: source.sourceId,
        status: "failed",
        errorCode: "REDIRECT_LIMIT"
      });
      await options.ports.onCheckpoint(structuredClone(checkpoint));
    }
  }

  const waiting = checkpoint.pendingOrigins.some((origin) => origin.decision === "pending");
  checkpoint.complete =
    !waiting &&
    attachments.every((source) => checkpoint.results.some((r) => r.sourceId === source.sourceId));
  await options.ports.onCheckpoint(structuredClone(checkpoint));
  return {
    checkpoint,
    outcome: waiting
      ? "WaitingForPermission"
      : checkpoint.results.some((result) => result.status !== "fetched")
        ? "Partial"
        : "Complete"
  };
}
