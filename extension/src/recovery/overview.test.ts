import { describe, expect, it } from "vitest";

import { scanIssues } from "./overview";

describe("scan issue overview", () => {
  it("keeps unsupported non-retryable and isolates source failures", () => {
    const issues = scanIssues({
      discoveryIssues: [],
      fetch: {
        scanId: "s",
        results: [
          { sourceId: "denied", status: "permission-denied" },
          { sourceId: "failed", status: "failed", errorCode: "HTTP_500" }
        ],
        pendingOrigins: [],
        complete: true
      },
      parsed: [
        {
          sourceId: "legacy",
          result: {
            format: "unsupported",
            status: "unsupported",
            units: [],
            diagnosticsCode: "LEGACY_OFFICE"
          }
        }
      ]
    });
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: "Permission Denied", retryable: true }),
        expect.objectContaining({ reason: "Could Not Access", retryable: true }),
        expect.objectContaining({ reason: "Unsupported", retryable: false })
      ])
    );
  });
});
