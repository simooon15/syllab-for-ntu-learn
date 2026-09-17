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
  }
});
