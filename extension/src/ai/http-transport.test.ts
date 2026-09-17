import { describe, expect, it } from "vitest";

import { CONTRACT_VERSION } from "@syllab/contracts";

import { HttpAiBackendTransport } from "./http-transport";

describe("HttpAiBackendTransport", () => {
  it("calls a native-style fetch with the global receiver", async () => {
    const fetchImpl = function (this: unknown): Promise<Response> {
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      return Promise.resolve(
        new Response(
          JSON.stringify({
            contractVersion: CONTRACT_VERSION,
            requestId: "request-1",
            provider: "deepseek",
            model: "deepseek-flash",
            candidates: [],
            usage: { inputTokens: 1, outputTokens: 1 }
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        )
      );
    } as typeof fetch;
    const transport = new HttpAiBackendTransport("http://127.0.0.1:8787", fetchImpl);

    await expect(
      transport.extract("token", {
        contractVersion: CONTRACT_VERSION,
        requestId: "request-1",
        courseId: "course-1",
        units: []
      })
    ).resolves.toMatchObject({ requestId: "request-1" });
  });
});
