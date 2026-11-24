import { isRecord } from "@syllab/contracts";
import type { DocumentFormat, ParseResult } from "./domain";
import { qaTrace } from "../v2/qa-telemetry";
export interface ParserWorkerPort {
  postMessage(message: unknown, transfer: Transferable[]): void;
  addEventListener(
    type: "message" | "error" | "messageerror",
    listener: (event: MessageEvent<unknown> | Event) => void
  ): void;
  removeEventListener(
    type: "message" | "error" | "messageerror",
    listener: (event: MessageEvent<unknown> | Event) => void
  ): void;
  terminate(): void;
}
interface Options {
  timeoutMs?: number;
  signal?: AbortSignal;
}
async function isolated<T>(
  bytes: Uint8Array,
  createWorker: () => ParserWorkerPort,
  operation: string,
  validate: (value: unknown) => value is T,
  options: Options,
  extra: Record<string, unknown> = {}
): Promise<T> {
  if (options.signal?.aborted) throw new DOMException("Cancelled", "AbortError");
  const transferable = bytes.slice().buffer;
  const worker = createWorker(),
    requestId = crypto.randomUUID(),
    started = performance.now();
  return new Promise<T>((resolve, reject) => {
    let settled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const finish = (callback: () => void, status: string): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", onAbort);
      worker.removeEventListener("message", onMessage);
      worker.removeEventListener("error", onError);
      worker.removeEventListener("messageerror", onError);
      worker.terminate();
      qaTrace("qa.parser-worker", {
        operation,
        requestId,
        status,
        durationMs: performance.now() - started,
        isolated: true,
        terminated: true
      });
      callback();
    };
    const onMessage = (event: MessageEvent<unknown> | Event): void => {
      if (!("data" in event)) return;
      const data: unknown = event.data;
      if (!isRecord(data) || data.requestId !== requestId) return;
      if (data.status === "COMPLETE" && validate(data.result))
        finish(() => resolve(data.result as T), "completed");
      else
        finish(
          () =>
            reject(
              new Error(
                data.status === "FAILED" ? "PARSER_WORKER_FAILED" : "PARSER_WORKER_CONTRACT"
              )
            ),
          "failed"
        );
    };
    const onError = (): void => finish(() => reject(new Error("PARSER_WORKER_CRASH")), "crashed");
    const onAbort = (): void =>
      finish(() => reject(new DOMException("Cancelled", "AbortError")), "cancelled");
    if (options.timeoutMs !== undefined)
      timeout = setTimeout(
        () => finish(() => reject(new Error("PARSER_TIMEOUT")), "fixture-timeout"),
        options.timeoutMs
      );
    worker.addEventListener("message", onMessage);
    worker.addEventListener("error", onError);
    worker.addEventListener("messageerror", onError);
    options.signal?.addEventListener("abort", onAbort, { once: true });
    try {
      worker.postMessage({ operation, requestId, bytes: transferable, ...extra }, [transferable]);
    } catch {
      finish(() => reject(new Error("PARSER_WORKER_DISPATCH_FAILED")), "dispatch-failed");
    }
  });
}
export function parseInIsolatedWorker(
  bytes: Uint8Array,
  createWorker: () => ParserWorkerPort,
  options: Options = {}
): Promise<ParseResult> {
  return isolated(
    bytes,
    createWorker,
    "PARSE",
    (value): value is ParseResult =>
      isRecord(value) &&
      Array.isArray(value.units) &&
      typeof value.format === "string" &&
      ["parsed", "partial", "unsupported", "failed"].includes(String(value.status)),
    options
  );
}
export function inspectInIsolatedWorker(
  bytes: Uint8Array,
  createWorker: () => ParserWorkerPort,
  options: Options = {}
): Promise<DocumentFormat> {
  return isolated(
    bytes,
    createWorker,
    "DETECT",
    (value): value is DocumentFormat =>
      [
        "pdf",
        "pptx",
        "docx",
        "xlsx",
        "legacy-ppt",
        "legacy-doc",
        "legacy-xls",
        "unsupported"
      ].includes(String(value)),
    options
  );
}
export function extractInIsolatedWorker(
  bytes: Uint8Array,
  names: string[],
  createWorker: () => ParserWorkerPort,
  options: Options = {}
): Promise<Record<string, Uint8Array>> {
  return isolated(
    bytes,
    createWorker,
    "ARCHIVE_ENTRIES",
    (value): value is Record<string, Uint8Array> =>
      isRecord(value) &&
      names.every((name) => value[name] instanceof Uint8Array) &&
      Object.entries(value).every(
        ([name, data]) => names.includes(name) && data instanceof Uint8Array
      ),
    options,
    { names }
  );
}
