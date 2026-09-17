import { isRecord } from "@syllab/contracts";

// Background failures surface as short internal codes. A user cannot act on "SCAN_INTERRUPTED",
// so the codes that have a real next step get readable copy; anything else is passed through
// unchanged so a failure is never swallowed or invented.
const scanErrorCopy: Record<string, string> = {
  SCAN_INTERRUPTED:
    "This scan was interrupted while it was running. Open the scan again and use Continue scan to resume from the saved checkpoint.",
  SCAN_NOT_RECOVERABLE:
    "This scan can no longer be resumed from its checkpoint. Open the course again to start a fresh scan.",
  SCAN_NOT_FOUND: "That scan record no longer exists. Open the course again to start a fresh scan.",
  REVIEW_ALREADY_STARTED:
    "This scan has already been reviewed. Use Scan again if you want Syllab to check the course for changes.",
  DISCOVERY_NOT_COMPLETE:
    "Discovery did not finish for this scan. Continue discovery before moving to the next stage.",
  DISCOVERY_CHECKPOINT_NOT_FOUND:
    "The saved discovery checkpoint for this scan is missing. Start a new scan for this course.",
  STORAGE_UNAVAILABLE:
    "Syllab could not read its local storage. Reload the extension, then try again."
};

export function describeScanError(message: string): string {
  return scanErrorCopy[message] ?? message;
}

export function scanErrorFrom(response: unknown, fallback: string): Error {
  const message =
    isRecord(response) && typeof response.error === "string" ? response.error : fallback;
  return new Error(describeScanError(message));
}
