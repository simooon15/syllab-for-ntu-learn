export type PermissionDecision = "pending" | "granted" | "denied";

export interface PendingOrigin {
  origin: string;
  permissionPattern: string;
  sourceIds: string[];
  decision: PermissionDecision;
  requested: boolean;
}

export interface AttachmentFetchResult {
  sourceId: string;
  status: "fetched" | "waiting-permission" | "permission-denied" | "failed";
  finalOrigin?: string;
  httpStatus?: number;
  contentType?: string;
  contentDisposition?: string;
  byteLength?: number;
  signature?: string;
  sha256?: string;
  errorCode?: string;
}

export interface FetchCheckpoint {
  scanId: string;
  pendingOrigins: PendingOrigin[];
  results: AttachmentFetchResult[];
  complete: boolean;
}

export interface PermissionSource {
  sourceId: string;
  requestUrl: string;
}
