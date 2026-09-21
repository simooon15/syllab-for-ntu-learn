export const CONTRACT_VERSION = 1 as const;
export const MODEL_PROVIDER = "deepseek" as const;
export const MODEL_NAME = "deepseek-flash" as const;

export type MainSurface = "saved-courses" | "scan" | "review" | "course-brief";

export type ScanStatus =
  "Ready" | "Scanning" | "WaitingForPermission" | "Complete" | "Partial" | "Failed" | "Interrupted";

export type CandidateKind = "assessment" | "important_date" | "important_rule";

export type CandidateScope = "course" | "assessment";

export type CandidateStatus =
  "Detected" | "NeedsReview" | "Confirmed" | "EditedConfirmed" | "Ignored";

export interface RegisterInstallationRequest {
  contractVersion: typeof CONTRACT_VERSION;
  installationId: string;
  clientVersion: string;
}

export interface RegisterInstallationResponse {
  contractVersion: typeof CONTRACT_VERSION;
  installationToken: string;
  tokenType: "Bearer";
}

export interface EvidenceReference {
  sourceId: string;
  locator: string;
  /** v0.2.0 field-level evidence row. Absent on records written by v0.1.0. */
  evidenceId?: string;
}

export interface ExtractionUnit {
  sourceId: string;
  sourceType: string;
  title: string;
  locator: string;
  text: string;
  contentHash: string;
}

export interface AiExtractRequest {
  contractVersion: typeof CONTRACT_VERSION;
  requestId: string;
  courseId: string;
  units: ExtractionUnit[];
}

export interface ExtractedCandidate {
  kind: CandidateKind;
  scope?: CandidateScope;
  appliesToAssessmentKey?: string;
  proposedValue: Record<string, unknown>;
  evidenceRefs: EvidenceReference[];
  reviewReason?: string;
}

export interface AiExtractResponse {
  contractVersion: typeof CONTRACT_VERSION;
  requestId: string;
  provider: typeof MODEL_PROVIDER;
  model: typeof MODEL_NAME;
  candidates: ExtractedCandidate[];
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "UNAUTHORIZED"
  | "INSTALLATION_DISABLED"
  | "RATE_LIMITED"
  | "USAGE_CAP_REACHED"
  | "GLOBAL_BUDGET_GUARD"
  | "PROVIDER_UNAVAILABLE"
  | "PHASE_NOT_IMPLEMENTED";

export interface ApiErrorResponse {
  contractVersion: typeof CONTRACT_VERSION;
  error: {
    code: ApiErrorCode;
    message: string;
    requestId?: string;
  };
}

export type ExtensionMessage =
  | { contractVersion: typeof CONTRACT_VERSION; type: "GET_SCHEMA_VERSION" }
  | { contractVersion: typeof CONTRACT_VERSION; type: "GET_COURSE_CONTEXT" }
  | {
      contractVersion: typeof CONTRACT_VERSION;
      type: "GET_DISCOVERY_SUMMARY";
      scanId: string;
    }
  | {
      contractVersion: typeof CONTRACT_VERSION;
      type: "DISCOVERY_API_GET";
      courseId: string;
      endpoint: string;
    }
  | {
      contractVersion: typeof CONTRACT_VERSION;
      type: "START_DISCOVERY";
      courseId: string;
      tabId: number;
      restartScanId?: string;
    }
  | {
      contractVersion: typeof CONTRACT_VERSION;
      type: "START_FETCH";
      scanId: string;
    }
  | {
      contractVersion: typeof CONTRACT_VERSION;
      type: "GET_FETCH_STATE";
      scanId: string;
    }
  | {
      contractVersion: typeof CONTRACT_VERSION;
      type: "APPLY_PERMISSION_DECISION";
      scanId: string;
      origin: string;
      granted: boolean;
    }
  | {
      contractVersion: typeof CONTRACT_VERSION;
      type: "START_PARSE";
      scanId: string;
    }
  | {
      contractVersion: typeof CONTRACT_VERSION;
      type: "GET_PARSE_STATE";
      scanId: string;
    }
  | {
      contractVersion: typeof CONTRACT_VERSION;
      type: "START_NORMALIZE";
      scanId: string;
    }
  | {
      contractVersion: typeof CONTRACT_VERSION;
      type: "GET_NORMALIZE_STATE";
      scanId: string;
    }
  | {
      contractVersion: typeof CONTRACT_VERSION;
      type: "START_EXTRACTION";
      scanId: string;
    }
  | {
      contractVersion: typeof CONTRACT_VERSION;
      type: "RESUME_SCAN";
      scanId: string;
    }
  | {
      contractVersion: typeof CONTRACT_VERSION;
      type: "CANCEL_SCAN";
      scanId: string;
    }
  | {
      contractVersion: typeof CONTRACT_VERSION;
      type: "GET_SCAN_OVERVIEW";
      scanId: string;
    };

export type SourceKind = "course-content-item" | "assignment" | "announcement" | "attachment";

export type SourceDiscoveryStatus = "discovered" | "issue";

export interface DiscoveredSource {
  sourceId: string;
  courseId: string;
  scanId: string;
  nativeItemId: string;
  parentSourceId?: string;
  kind: SourceKind;
  nativeTypeHint?: string;
  title: string;
  canonicalUrl?: string;
  requestUrl?: string;
  rawText?: string;
  discoveryPath: string[];
  depth: number;
  status: SourceDiscoveryStatus;
}

export interface DiscoveryIssue {
  sourceId?: string;
  code:
    | "API_REQUEST_FAILED"
    | "INVALID_COLLECTION"
    | "INVALID_ITEM_ID"
    | "PAGINATION_LOOP"
    | "PAGE_LIMIT_REACHED"
    | "UNRESOLVED_PAGINATION"
    | "DETAIL_REQUEST_FAILED"
    | "DETAIL_IDENTITY_MISMATCH"
    | "OUT_OF_SCOPE_PAGINATION";
  retryable: boolean;
  detail: string;
}

export interface CourseContext {
  courseId: string;
  courseCode?: string;
  courseName?: string;
  route: string;
}

export interface CourseSummary {
  courseId: string;
  courseCode?: string;
  courseName?: string;
  hasEffectiveScan: boolean;
  hasBrief: boolean;
  pendingReviewCount: number;
  lastEffectiveScanId?: string;
}

export interface ScanSummary {
  scanId: string;
  courseId: string;
  status: ScanStatus;
  recoverable: boolean;
  phase?: "discovery" | "fetch" | "parse" | "normalize" | "extract";
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isRegisterInstallationRequest(
  value: unknown
): value is RegisterInstallationRequest {
  if (!isRecord(value)) return false;
  return (
    value.contractVersion === CONTRACT_VERSION &&
    typeof value.installationId === "string" &&
    value.installationId.length >= 16 &&
    typeof value.clientVersion === "string" &&
    value.clientVersion.length > 0
  );
}

export function isAiExtractRequest(value: unknown): value is AiExtractRequest {
  if (!isRecord(value) || value.contractVersion !== CONTRACT_VERSION) return false;
  if (
    typeof value.requestId !== "string" ||
    typeof value.courseId !== "string" ||
    !Array.isArray(value.units) ||
    value.units.length === 0
  ) {
    return false;
  }
  return value.units.every(
    (unit) =>
      isRecord(unit) &&
      typeof unit.sourceId === "string" &&
      typeof unit.sourceType === "string" &&
      typeof unit.title === "string" &&
      typeof unit.locator === "string" &&
      typeof unit.text === "string" &&
      typeof unit.contentHash === "string"
  );
}
