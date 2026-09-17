import { describe, expect, it } from "vitest";

import { CONTRACT_VERSION, isAiExtractRequest, isRegisterInstallationRequest } from "./index.js";

describe("contract validators", () => {
  it("accepts a minimal anonymous installation registration", () => {
    expect(
      isRegisterInstallationRequest({
        contractVersion: CONTRACT_VERSION,
        installationId: "019d0000-0000-7000-8000-000000000000",
        clientVersion: "0.1.0"
      })
    ).toBe(true);
  });

  it("rejects an extraction request without source units", () => {
    expect(
      isAiExtractRequest({
        contractVersion: CONTRACT_VERSION,
        requestId: "req_fixture",
        courseId: "course_fixture",
        units: []
      })
    ).toBe(false);
  });
});
