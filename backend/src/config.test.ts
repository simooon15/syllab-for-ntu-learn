import { describe, expect, it } from "vitest";

import { loadDeepSeekSecret, loadServerConfig } from "./config";

describe("server-side configuration", () => {
  it("loads a fake DeepSeek value only through the secret boundary", () => {
    const secret = loadDeepSeekSecret({ DEEPSEEK_API_KEY: "test-only-provider-secret" });
    expect(secret.apiKey).toBe("test-only-provider-secret");
  });

  it("rejects missing provider secrets", () => {
    expect(() => loadDeepSeekSecret({})).toThrow("DEEPSEEK_API_KEY");
  });

  it("keeps all usage protection limits configurable", () => {
    expect(
      loadServerConfig({
        PORT: "9000",
        RATE_LIMIT_REQUESTS_PER_MINUTE: "11",
        INSTALLATION_USAGE_CAP_UNITS: "22",
        GLOBAL_BUDGET_CAP_UNITS: "33",
        REGISTRATION_LIMIT_PER_HOUR: "4"
      })
    ).toEqual({
      port: 9000,
      usageProtection: {
        rateLimitRequestsPerMinute: 11,
        installationUsageCapUnits: 22,
        globalBudgetCapUnits: 33,
        registrationLimitPerHour: 4
      }
    });
  });
});
