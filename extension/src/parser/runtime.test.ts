import { describe, expect, it, vi } from "vitest";

import type { ParserWorkerPort } from "./runtime";
import { parseInIsolatedWorker } from "./runtime";

class FakeWorker implements ParserWorkerPort {
  listener: ((event: MessageEvent<unknown> | Event) => void) | undefined;
  terminated = false;
  events = new Map<string, (event: MessageEvent<unknown> | Event) => void>();
  constructor(private readonly respond: boolean) {}
  postMessage(message: unknown): void {
    if (!this.respond || typeof message !== "object" || message === null) return;
    const requestId = (message as { requestId: string }).requestId;
    queueMicrotask(() =>
      this.listener?.(
        new MessageEvent("message", {
          data: {
            requestId,
            status: "COMPLETE",
            result: { format: "pdf", status: "parsed", units: [] }
          }
        })
      )
    );
  }
  addEventListener(
    _type: "message" | "error" | "messageerror",
    listener: (event: MessageEvent<unknown> | Event) => void
  ): void {
    this.events.set(_type, listener);
    if (_type === "message") this.listener = listener;
  }
  removeEventListener(): void {
    this.listener = undefined;
    this.events.clear();
  }
  terminate(): void {
    this.terminated = true;
  }
}

describe("isolated parser worker runtime", () => {
  it("transfers one file and terminates its worker after success", async () => {
    const worker = new FakeWorker(true);
    await expect(parseInIsolatedWorker(new Uint8Array([1]), () => worker)).resolves.toMatchObject({
      format: "pdf",
      status: "parsed"
    });
    expect(worker.terminated).toBe(true);
  });

  it("terminates on timeout so one parser cannot block other files", async () => {
    vi.useFakeTimers();
    const worker = new FakeWorker(false);
    const result = parseInIsolatedWorker(new Uint8Array([1]), () => worker, { timeoutMs: 10 });
    const assertion = expect(result).rejects.toThrow("PARSER_TIMEOUT");
    await vi.advanceTimersByTimeAsync(11);
    await assertion;
    expect(worker.terminated).toBe(true);
    vi.useRealTimers();
  });
});

it.each(["error", "messageerror"])(
  "isolates %s and permits another file to finish",
  async (event) => {
    const failed = new FakeWorker(false);
    const promise = parseInIsolatedWorker(new Uint8Array([1]), () => failed);
    const rejection = expect(promise).rejects.toThrow("PARSER_WORKER_CRASH");
    failed.events.get(event)?.(new Event(event));
    await rejection;
    expect(failed.terminated).toBe(true);
    expect(failed.events.size).toBe(0);
    await expect(
      parseInIsolatedWorker(new Uint8Array([2]), () => new FakeWorker(true))
    ).resolves.toMatchObject({ status: "parsed" });
  }
);
it("cancels a worker without abandoning other files and never creates one for a cancelled input", async () => {
  const controller = new AbortController();
  const worker = new FakeWorker(false);
  const promise = parseInIsolatedWorker(new Uint8Array([1]), () => worker, {
    signal: controller.signal
  });
  const rejection = expect(promise).rejects.toThrow("Cancelled");
  controller.abort();
  await rejection;
  expect(worker.terminated).toBe(true);
  const create = vi.fn(() => worker);
  await expect(
    parseInIsolatedWorker(new Uint8Array([1]), create, { signal: controller.signal })
  ).rejects.toThrow("Cancelled");
  expect(create).not.toHaveBeenCalled();
});
