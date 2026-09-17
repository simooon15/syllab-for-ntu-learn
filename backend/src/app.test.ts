import {
  CONTRACT_VERSION,
  MODEL_NAME,
  MODEL_PROVIDER,
  type AiExtractRequest
} from "@syllab/contracts";
import { describe, expect, it, vi } from "vitest";

import { createApp } from "./app";
import {
  hashInstallationToken,
  InMemoryInstallationRepository
} from "./domain/in-memory-installations";
import type { ExtractionGuard } from "./domain/usage-guards";

const request: AiExtractRequest = {
  contractVersion: CONTRACT_VERSION,
  requestId: "request_1",
  courseId: "course_1",
  units: [
    {
      sourceId: "source_1",
      sourceType: "attachment",
      title: "Guide",
      locator: "page:1",
      text: "Final assessment due 12 Sep 2026",
      contentHash: "a".repeat(64)
    }
  ]
};

function guards(rejectAt?: ExtractionGuard["name"]): ExtractionGuard[] {
  return (["installation-enabled", "rate-limit", "usage-cap", "global-budget"] as const).map(
    (name) => ({
      name,
      assertAllowed: () =>
        rejectAt === name ? Promise.reject(new Error("blocked")) : Promise.resolve()
    })
  );
}

async function setup(rejectAt?: ExtractionGuard["name"]) {
  const installations = new InMemoryInstallationRepository();
  const provider = {
    provider: MODEL_PROVIDER,
    model: MODEL_NAME,
    extract: vi.fn(() =>
      Promise.resolve({
        contractVersion: CONTRACT_VERSION,
        requestId: request.requestId,
        provider: MODEL_PROVIDER,
        model: MODEL_NAME,
        candidates: [],
        usage: { inputTokens: 10, outputTokens: 2 }
      })
    )
  };
  const app = createApp({
    installations,
    tokenIssuer: {
      issue: () =>
        Promise.resolve({ token: "test-token", tokenHash: hashInstallationToken("test-token") })
    },
    registrationGuard: { assertRegistrationAllowed: () => Promise.resolve() },
    extractionGuards: guards(rejectAt),
    provider,
    now: () => new Date("2026-09-16T00:00:00.000Z")
  });
  await installations.create({
    installationId: "installation_1",
    tokenHash: hashInstallationToken("test-token"),
    enabled: true,
    usageUnits: 0,
    createdAt: "2026-09-16T00:00:00.000Z"
  });
  return { app, provider };
}

describe("backend AI proxy", () => {
  it("starts with a vendor-neutral health boundary", async () => {
    const { app } = await setup();
    await expect(app({ method: "GET", url: "/health", headers: {} })).resolves.toMatchObject({
      status: 200,
      body: { status: "ok", phase: "ai-proxy" }
    });
  });

  it("registers an anonymous installation without an account", async () => {
    const { app } = await setup();
    const response = await app({
      method: "POST",
      url: "/installation/register",
      headers: {},
      networkKey: "fixture-network",
      body: {
        contractVersion: CONTRACT_VERSION,
        installationId: "019d0000-0000-7000-8000-000000000000",
        clientVersion: "0.1.0"
      }
    });
    expect(response).toMatchObject({
      status: 201,
      body: { installationToken: "test-token", tokenType: "Bearer" }
    });
  });

  it("never calls the provider for missing or invalid authentication", async () => {
    const { app, provider } = await setup();
    await expect(
      app({ method: "POST", url: "/ai/extract", headers: {}, body: request })
    ).resolves.toMatchObject({ status: 401 });
    await expect(
      app({
        method: "POST",
        url: "/ai/extract",
        headers: { authorization: "Bearer wrong" },
        body: request
      })
    ).resolves.toMatchObject({ status: 401 });
    expect(provider.extract).not.toHaveBeenCalled();
  });

  it.each(["installation-enabled", "rate-limit", "usage-cap", "global-budget"] as const)(
    "does not call DeepSeek when the %s guard blocks",
    async (guard) => {
      const { app, provider } = await setup(guard);
      const response = await app({
        method: "POST",
        url: "/ai/extract",
        headers: { authorization: "Bearer test-token" },
        body: request
      });
      expect(response.status).toBe(503);
      expect(provider.extract).not.toHaveBeenCalled();
    }
  );

  it("calls the fixed provider only after all checks pass", async () => {
    const { app, provider } = await setup();
    const response = await app({
      method: "POST",
      url: "/ai/extract",
      headers: { authorization: "Bearer test-token" },
      body: request
    });
    expect(response).toMatchObject({ status: 200, body: { model: "deepseek-flash" } });
    expect(provider.extract).toHaveBeenCalledOnce();
  });
});
