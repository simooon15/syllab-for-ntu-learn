import { isRecord } from "@syllab/contracts";

import type { ParseResult } from "./domain";

function isParseResult(value: unknown): value is ParseResult {
  if (!isRecord(value) || !Array.isArray(value.units)) return false;
  return (
    typeof value.format === "string" &&
    (value.status === "parsed" ||
      value.status === "partial" ||
      value.status === "unsupported" ||
      value.status === "failed")
  );
}

export interface ParserWorkerPort {
  postMessage(message: unknown, transfer: Transferable[]): void;
  addEventListener(type: "message", listener: (event: MessageEvent<unknown>) => void): void;
  removeEventListener(type: "message", listener: (event: MessageEvent<unknown>) => void): void;
  terminate(): void;
}

export async function parseInIsolatedWorker(
  bytes: Uint8Array,
  createWorker: () => ParserWorkerPort,
  options: { timeoutMs?: number; signal?: AbortSignal } = {}
): Promise<ParseResult> {
  const worker = createWorker();
  const requestId = crypto.randomUUID();
  const timeoutMs = options.timeoutMs ?? 30_000;
  const transferable = bytes.slice().buffer;
  return new Promise<ParseResult>((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", onAbort);
      worker.removeEventListener("message", onMessage);
      worker.terminate();
      callback();
    };
    const onMessage = (event: MessageEvent<unknown>): void => {
      const data = event.data;
      if (!isRecord(data) || data.requestId !== requestId) return;
      if (data.status === "COMPLETE" && isParseResult(data.result)) {
        const result = data.result;
        finish(() => resolve(result));
      } else if (data.status === "FAILED") {
        finish(() => reject(new Error("PARSER_WORKER_FAILED")));
      }
    };
    const onAbort = (): void => finish(() => reject(new DOMException("Cancelled", "AbortError")));
    const timeout = setTimeout(() => finish(() => reject(new Error("PARSER_TIMEOUT"))), timeoutMs);
    worker.addEventListener("message", onMessage);
    options.signal?.addEventListener("abort", onAbort, { once: true });
    worker.postMessage({ operation: "PARSE", requestId, bytes: transferable }, [transferable]);
  });
}
