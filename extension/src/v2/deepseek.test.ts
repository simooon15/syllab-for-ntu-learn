import { afterEach, describe, expect, it, vi } from "vitest";

import { DEEPSEEK_REQUEST_TIMEOUT_MS, DeepSeekTransport } from "./deepseek";

describe("DeepSeek BYOK transport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps invalid credentials without exposing the key", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 401 }));
    const transport = new DeepSeekTransport(fetcher);
    const promise = transport.complete("private-value", { system: "s", user: "u", maxTokens: 8 });
    await expect(promise).rejects.toMatchObject({
      code: "AI_AUTH",
      retryable: false
    });
    await expect(promise).rejects.not.toThrow("private-value");
  });

  it("uses the locked model and structured JSON mode", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ choices: [{ message: { content: "{}" } }] }));
    await new DeepSeekTransport(fetcher).complete("key", {
      system: "system",
      user: "user",
      maxTokens: 16_000
    });
    const init = fetcher.mock.calls[0]?.[1];
    if (typeof init?.body !== "string") throw new Error("REQUEST_BODY_MISSING");
    const body = JSON.parse(init.body) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: "deepseek-flash",
      thinking: { type: "enabled" },
      reasoning_effort: "high",
      max_tokens: 16_000,
      response_format: { type: "json_object" }
    });
  });

  it("reassembles the QA SSE stream while preserving reasoning and visible output", async () => {
    vi.stubGlobal("__SYLLAB_E2E_FIXTURES__", true);
    const encoder = new TextEncoder();
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"choices":[{"delta":{"reasoning_content":"think "},"finish_reason":null}]}\n\n'
            )
          );
          controller.enqueue(
            encoder.encode(
              'data: {"choices":[{"delta":{"content":"{\\"ok\\":true}"},"finish_reason":"stop"}],"usage":{"prompt_tokens":4,"completion_tokens":7,"completion_tokens_details":{"reasoning_tokens":2}}}\n\ndata: [DONE]\n\n'
            )
          );
          controller.close();
        }
      }),
      { headers: { "Content-Type": "text/event-stream" } }
    );
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(response);

    const payload = await new DeepSeekTransport(fetcher).complete("key", {
      system: "system",
      user: "user",
      maxTokens: 96_000
    });

    const init = fetcher.mock.calls[0]?.[1];
    if (typeof init?.body !== "string") throw new Error("REQUEST_BODY_MISSING");
    expect(JSON.parse(init.body)).toMatchObject({
      stream: true,
      stream_options: { include_usage: true }
    });
    expect(payload).toMatchObject({
      choices: [
        {
          message: { content: '{"ok":true}', reasoning_content: "think " },
          finish_reason: "stop"
        }
      ],
      usage: {
        prompt_tokens: 4,
        completion_tokens: 7,
        completion_tokens_details: { reasoning_tokens: 2 }
      }
    });
  });

  it("calls the global fetch as itself, not as a method of the transport", async () => {
    // `fetch` is an operation on the global object: called as `this.fetcher(...)` it gets the
    // transport as `this` and the browser answers `TypeError: Illegal invocation` without opening a
    // connection. Every test here passes a plain function, which does not care — so this one stands
    // in for the browser and refuses to be called any other way. (Gate 3 finding F1.)
    const real = vi.fn(function (this: unknown) {
      if (this !== globalThis) throw new TypeError("Illegal invocation");
      return Promise.resolve(Response.json({ choices: [{ message: { content: "{}" } }] }));
    });
    vi.stubGlobal("fetch", real);

    const transport = new DeepSeekTransport();
    await expect(
      transport.complete("key", { system: "s", user: "u", maxTokens: 8 })
    ).resolves.toBeDefined();
    expect(real).toHaveBeenCalledTimes(1);
  });

  it("tells a refused request apart from an unreachable provider", async () => {
    const refused = new DeepSeekTransport(() => {
      throw new TypeError("Failed to execute 'fetch' on 'WorkerGlobalScope': Illegal invocation");
    });
    await expect(
      refused.complete("key", { system: "s", user: "u", maxTokens: 8 })
    ).rejects.toMatchObject({ code: "AI_CONTRACT", retryable: false });

    const offline = new DeepSeekTransport(() => Promise.reject(new TypeError("Failed to fetch")));
    await expect(
      offline.complete("key", { system: "s", user: "u", maxTokens: 8 })
    ).rejects.toMatchObject({ code: "NETWORK_TRANSIENT", retryable: true });
  });

  it("passes a bounded timeout and maps an aborted provider request to a retryable failure", async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_input, init) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      expect(DEEPSEEK_REQUEST_TIMEOUT_MS).toBe(300_000);
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    });
    await expect(
      new DeepSeekTransport(fetcher).complete("key", { system: "s", user: "u", maxTokens: 8 })
    ).rejects.toMatchObject({ code: "NETWORK_TRANSIENT", retryable: true });
  });

  it("checks a key against the models list, which costs nothing", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("{}", { status: 200 }));
    await new DeepSeekTransport(fetcher).verify("key");
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.deepseek.com/v1/models");

    const rejected = new DeepSeekTransport(
      vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 401 }))
    );
    await expect(rejected.verify("key")).rejects.toMatchObject({ code: "AI_AUTH" });
  });
});
