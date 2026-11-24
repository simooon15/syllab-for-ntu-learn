import { unzipSync } from "fflate";
import { detectDocumentFormat } from "../parser/format-detector";
import { isRecord } from "@syllab/contracts";

import { parseDocument } from "../parser";
import { configurePdfWorker } from "../parser/pdf-parser";

configurePdfWorker(new URL("pdf.worker.mjs", self.location.href).href);

self.addEventListener("message", (event: MessageEvent<unknown>) => {
  if (
    isRecord(event.data) &&
    event.data.operation === "PING" &&
    typeof event.data.requestId === "string"
  ) {
    self.postMessage({ requestId: event.data.requestId, status: "READY" });
    return;
  }
  if (
    isRecord(event.data) &&
    typeof event.data.requestId === "string" &&
    event.data.bytes instanceof ArrayBuffer &&
    ["DETECT", "ARCHIVE_ENTRIES"].includes(String(event.data.operation))
  ) {
    const requestId = event.data.requestId;
    try {
      const bytes = new Uint8Array(event.data.bytes);
      const names = Array.isArray(event.data.names)
        ? event.data.names.filter((name): name is string => typeof name === "string")
        : [];
      const wanted = new Set(names);
      if (event.data.operation === "DETECT") {
        self.postMessage({ requestId, status: "COMPLETE", result: detectDocumentFormat(bytes) });
      } else {
        const result = unzipSync(bytes, { filter: (entry) => wanted.has(entry.name) });
        const buffers = Object.values(result).map((entry) => entry.buffer);
        self.postMessage({ requestId, status: "COMPLETE", result }, buffers);
      }
    } catch {
      self.postMessage({ requestId, status: "FAILED", errorCode: "ARCHIVE_DECODE_FAILED" });
    }
    return;
  }
  if (
    isRecord(event.data) &&
    event.data.operation === "PARSE" &&
    typeof event.data.requestId === "string" &&
    event.data.bytes instanceof ArrayBuffer
  ) {
    const requestId = event.data.requestId;
    void parseDocument(new Uint8Array(event.data.bytes)).then(
      (result) => self.postMessage({ requestId, status: "COMPLETE", result }),
      () =>
        self.postMessage({
          requestId,
          status: "FAILED",
          errorCode: "PARSER_WORKER_FAILED"
        })
    );
    return;
  }
  if (isRecord(event.data) && typeof event.data.requestId === "string") {
    self.postMessage({
      requestId: event.data.requestId,
      status: "FAILED",
      errorCode: "PARSER_WORKER_INVALID_MESSAGE"
    });
  }
});
