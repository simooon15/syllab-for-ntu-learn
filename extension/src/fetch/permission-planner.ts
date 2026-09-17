import type { FetchCheckpoint, PendingOrigin, PermissionSource } from "./domain";

export function exactOriginPattern(origin: string): string {
  const url = new URL(origin);
  if (url.protocol !== "https:" || url.origin !== origin || url.hostname.includes("*")) {
    throw new Error("Permission origin must be an exact HTTPS origin");
  }
  return `${url.origin}/*`;
}

export function createFetchCheckpoint(
  scanId: string,
  sources: readonly PermissionSource[],
  approvedOrigin: string
): FetchCheckpoint {
  const byOrigin = new Map<string, string[]>();
  for (const source of sources) {
    const url = new URL(source.requestUrl);
    if (url.protocol !== "https:" || url.origin === approvedOrigin) continue;
    const sourceIds = byOrigin.get(url.origin) ?? [];
    if (!sourceIds.includes(source.sourceId)) sourceIds.push(source.sourceId);
    byOrigin.set(url.origin, sourceIds);
  }
  const pendingOrigins: PendingOrigin[] = [...byOrigin]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([origin, sourceIds]) => ({
      origin,
      permissionPattern: exactOriginPattern(origin),
      sourceIds,
      decision: "pending",
      requested: false
    }));
  return { scanId, pendingOrigins, results: [], complete: false };
}

export function addPendingOrigin(
  checkpoint: FetchCheckpoint,
  origin: string,
  sourceId: string
): FetchCheckpoint {
  const permissionPattern = exactOriginPattern(origin);
  const existing = checkpoint.pendingOrigins.find((entry) => entry.origin === origin);
  if (existing) {
    if (!existing.sourceIds.includes(sourceId)) existing.sourceIds.push(sourceId);
  } else {
    checkpoint.pendingOrigins.push({
      origin,
      permissionPattern,
      sourceIds: [sourceId],
      decision: "pending",
      requested: false
    });
  }
  return structuredClone(checkpoint);
}

export function recordPermissionDecision(
  checkpoint: FetchCheckpoint,
  origin: string,
  granted: boolean
): FetchCheckpoint {
  const target = checkpoint.pendingOrigins.find((entry) => entry.origin === origin);
  if (!target) throw new Error("Permission origin is not pending for this scan");
  if (target.decision !== "pending") return structuredClone(checkpoint);
  target.requested = true;
  target.decision = granted ? "granted" : "denied";
  return structuredClone(checkpoint);
}

export function nextPendingOrigin(checkpoint: FetchCheckpoint): PendingOrigin | null {
  return checkpoint.pendingOrigins.find((entry) => entry.decision === "pending") ?? null;
}
