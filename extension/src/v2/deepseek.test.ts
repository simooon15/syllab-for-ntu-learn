import { afterEach, describe, expect, it, vi } from "vitest";

import { DeepSeekTransport } from "./deepseek";

describe("DeepSeek BYOK transport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps invalid credentials without exposing the key", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 401 }));
    const transport = new DeepSeekTransport(fetcher);
    const promise = transport.complete("private-value", {
      system: "Output JSON.",
      user: "u",
      maxTokens: 8
    });
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
      system: "Output JSON.",
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

  it("reassembles SSE output without retaining provider reasoning", async () => {
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
      system: "Output JSON.",
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
          message: { content: '{"ok":true}' },
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
      transport.complete("key", { system: "Output JSON.", user: "u", maxTokens: 8 })
    ).resolves.toBeDefined();
    expect(real).toHaveBeenCalledTimes(1);
  });

  it("tells a refused request apart from an unreachable provider", async () => {
    const refused = new DeepSeekTransport(() => {
      throw new TypeError("Failed to execute 'fetch' on 'WorkerGlobalScope': Illegal invocation");
    });
    await expect(
      refused.complete("key", { system: "Output JSON.", user: "u", maxTokens: 8 })
    ).rejects.toMatchObject({ code: "AI_CONTRACT", retryable: false });

    const offline = new DeepSeekTransport(() => Promise.reject(new TypeError("Failed to fetch")));
    await expect(
      offline.complete("key", { system: "Output JSON.", user: "u", maxTokens: 8 })
    ).rejects.toMatchObject({ code: "NETWORK_TRANSIENT", retryable: true });
  });

  it("uses ownership cancellation without an absolute normal-request deadline", async () => {
    const controller = new AbortController();
    const fetcher = vi.fn<typeof fetch>().mockImplementation((_input, init) => {
      expect(init?.signal).toBe(controller.signal);
      controller.abort();
      throw new DOMException("Cancelled", "AbortError");
    });
    await expect(
      new DeepSeekTransport(fetcher).complete("key", {
        system: "Output JSON.",
        user: "u",
        maxTokens: 8,
        signal: controller.signal
      })
    ).rejects.toMatchObject({ layer: "abort" });
    const normal = vi.fn<typeof fetch>().mockImplementation((_input, init) => {
      expect(init?.signal).toBeUndefined();
      return Promise.resolve(new Response(JSON.stringify({ choices: [] })));
    });
    await expect(
      new DeepSeekTransport(normal).complete("key", {
        system: "Output JSON.",
        user: "u",
        maxTokens: 8
      })
    ).resolves.toBeDefined();
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

it("rejects oversized visual input before sending any provider request", async () => {
  const fetcher = vi.fn<typeof fetch>();
  const transport = new DeepSeekTransport(fetcher);
  await expect(
    transport.complete("synthetic-credential", {
      system: "Output JSON.",
      user: "u",
      maxTokens: 1,
      visualParts: Array.from({ length: 601 }, () => ({
        locator: "page:1",
        dataUrl: "data:image/png;base64,AA=="
      }))
    })
  ).rejects.toMatchObject({ code: "AI_CONTRACT", retryable: false });
  expect(fetcher).not.toHaveBeenCalled();
});

it("forwards cancellation and respects the provider Retry-After without shortening it", async () => {
  const controller = new AbortController();
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response("", { status: 429, headers: { "Retry-After": "120" } }));
  const request = new DeepSeekTransport(fetcher).complete("synthetic-credential", {
    system: "Output JSON.",
    user: "u",
    maxTokens: 1,
    signal: controller.signal
  });
  await expect(request).rejects.toMatchObject({ code: "AI_RATE_LIMIT", retryAfterMs: 120_000 });
  controller.abort();
  expect(fetcher.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
});

it("classifies a body-stream disconnect after HTTP success as a network failure", async () => {
  const body = new ReadableStream({
    start(controller) {
      setTimeout(() => controller.error(new TypeError("Failed to fetch")), 0);
    }
  });
  const transport = new DeepSeekTransport(() =>
    Promise.resolve(new Response(body, { headers: { "content-type": "text/event-stream" } }))
  );
  await expect(
    transport.complete("synthetic", { system: "Output JSON.", user: "u", maxTokens: 8 })
  ).rejects.toMatchObject({ code: "NETWORK_TRANSIENT", layer: "network", retryable: true });
});
it("rejects premature stream EOF even if a valid JSON prefix has already arrived", async () => {
  const text = 'data: {"choices":[{"delta":{"content":"{}"},"finish_reason":null}]}\n\n';
  const transport = new DeepSeekTransport(() =>
    Promise.resolve(new Response(text, { headers: { "content-type": "text/event-stream" } }))
  );
  await expect(
    transport.complete("synthetic", { system: "Output JSON.", user: "u", maxTokens: 8 })
  ).rejects.toMatchObject({ code: "NETWORK_TRANSIENT", layer: "network", retryable: true });
});

it("rejects missing JSON-mode instructions before fetching or consuming API credit", async () => {
  const fetcher = vi.fn<typeof fetch>();
  await expect(
    new DeepSeekTransport(fetcher).complete("synthetic", {
      system: "Inspect one native passage",
      user: "Synthetic text",
      maxTokens: 8192
    })
  ).rejects.toMatchObject({ code: "AI_CONTRACT", message: "provider-json-directive" });
  expect(fetcher).not.toHaveBeenCalled();
});

it("cancels a stalled audit stream before an answer, without retry or claiming a pre-generation rejection", async () => {
  let cancelled = false;
  const checkpoint =
    "Check independent deadline A.\nCheck authored submission B.\nCheck exception evidence C.\n";
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(
        new TextEncoder().encode(
          "data: " +
            JSON.stringify({ choices: [{ delta: { reasoning_content: checkpoint.repeat(3) } }] }) +
            "\n\n"
        )
      );
    },
    cancel() {
      cancelled = true;
    }
  });
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValue(new Response(body, { headers: { "content-type": "text/event-stream" } }));
  await expect(
    new DeepSeekTransport(fetcher).complete("synthetic", {
      system: "Output JSON.",
      user: "Audit",
      maxTokens: 384000,
      reasoningCycleGuard: true
    })
  ).rejects.toMatchObject({
    message: "PROVIDER_REASONING_CYCLE",
    code: "AI_PROVIDER",
    retryable: false,
    preGenerationBoundary: false
  });
  expect(cancelled).toBe(true);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it("does not cancel delivered answer progress merely because earlier reasoning repeats", async () => {
  const checkpoint =
    "Check independent deadline A.\nCheck authored submission B.\nCheck exception evidence C.\n";
  const frames =
    [
      { choices: [{ delta: { content: "{}" } }] },
      { choices: [{ delta: { reasoning_content: checkpoint.repeat(4) }, finish_reason: "stop" }] }
    ]
      .map((x) => "data: " + JSON.stringify(x) + "\n\n")
      .join("") + "data: [DONE]\n\n";
  const transport = new DeepSeekTransport(() =>
    Promise.resolve(new Response(frames, { headers: { "content-type": "text/event-stream" } }))
  );
  const result = await transport.complete("synthetic", {
    system: "Output JSON.",
    user: "Audit",
    maxTokens: 384000,
    reasoningCycleGuard: true
  });
  expect(result).toMatchObject({
    choices: [{ message: { content: "{}" }, finish_reason: "stop" }]
  });
});
