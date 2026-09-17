import { CONTRACT_VERSION, isRecord } from "@syllab/contracts";

import { fetchAttachmentPayload } from "../fetch/attachment-fetcher";
import { parseInIsolatedWorker } from "../parser/runtime";

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse: (response: unknown) => void) => {
    if (
      !isRecord(message) ||
      message.contractVersion !== CONTRACT_VERSION ||
      message.type !== "PARSE_ATTACHMENT" ||
      typeof message.sourceId !== "string" ||
      typeof message.requestUrl !== "string"
    ) {
      return false;
    }
    void fetchAttachmentPayload(message.sourceId, message.requestUrl).then(
      async (payload) => {
        if (payload.result.status !== "fetched" || !payload.bytes) {
          sendResponse({ ok: false, errorCode: payload.result.errorCode ?? "FETCH_FAILED" });
          return;
        }
        try {
          const result = await parseInIsolatedWorker(
            payload.bytes,
            () => new Worker(chrome.runtime.getURL("parser-worker.js"))
          );
          sendResponse({ ok: true, result });
        } catch {
          sendResponse({ ok: false, errorCode: "PARSER_RUNTIME_FAILED" });
        }
      },
      () => sendResponse({ ok: false, errorCode: "PARSER_RUNTIME_FAILED" })
    );
    return true;
  }
);
