import { describe, expect, it, vi } from "vitest";

import type { ParserWorkerPort } from "./runtime";
import { parseInIsolatedWorker } from "./runtime";

class FakeWorker implements ParserWorkerPort {
  listener: ((event: MessageEvent<unknown>) => void) | undefined;
  terminated = false;
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
  addEventListener(_type: "message", listener: (event: MessageEvent<unknown>) => void): void {
    this.listener = listener;
  }
  removeEventListener(): void {
    this.listener = undefined;
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
