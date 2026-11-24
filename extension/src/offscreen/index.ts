import { isParsedTextUnit, type ParsedTextUnit } from "../parser/domain";
import { CONTRACT_VERSION, isRecord } from "@syllab/contracts";

import { fetchAttachmentPayload } from "../fetch/attachment-fetcher";

import { visualCompletion } from "./visual-completion";
import { canonicalizeOffice } from "./office-runtime";
import { parseInIsolatedWorker, inspectInIsolatedWorker } from "../parser/runtime";

chrome.runtime.onMessage.addListener(
  (message: unknown, sender, sendResponse: (response: unknown) => void) => {
    if (
      sender.id !== chrome.runtime.id ||
      (sender.url !== undefined && !sender.url.startsWith(chrome.runtime.getURL("")))
    ) {
      return false;
    }
    if (
      !isRecord(message) ||
      message.contractVersion !== CONTRACT_VERSION ||
      (message.type !== "PARSE_ATTACHMENT" && message.type !== "VISUAL_ATTACHMENT") ||
      typeof message.sourceId !== "string" ||
      typeof message.requestUrl !== "string"
    ) {
      return false;
    }
    void fetchAttachmentPayload(message.sourceId, message.requestUrl, {}).then(
      async (payload) => {
        if (payload.result.status !== "fetched" || !payload.bytes) {
          sendResponse({ ok: false, errorCode: payload.result.errorCode ?? "FETCH_FAILED" });
          return;
        }
        try {
          const contentHash =
            payload.result.sha256 ??
            [...new Uint8Array(await crypto.subtle.digest("SHA-256", payload.bytes.slice().buffer))]
              .map((byte) => byte.toString(16).padStart(2, "0"))
              .join("");
          let visualUnits: ParsedTextUnit[] | undefined;
          if (message.type === "VISUAL_ATTACHMENT") {
            if (
              typeof message.contentHash !== "string" ||
              message.contentHash !== contentHash ||
              !Array.isArray(message.units) ||
              !message.units.every(isParsedTextUnit)
            ) {
              sendResponse({ ok: false, errorCode: "VISUAL_SOURCE_CHANGED" });
              return;
            }
            visualUnits = message.units;
          }
          const originalFormat = await inspectInIsolatedWorker(
            payload.bytes,
            () => new Worker(chrome.runtime.getURL("parser-worker.js"))
          );
          const canonical = await canonicalizeOffice(payload.bytes, originalFormat);
          if (visualUnits !== undefined) {
            const format =
              canonical === payload.bytes
                ? originalFormat
                : await inspectInIsolatedWorker(
                    canonical,
                    () => new Worker(chrome.runtime.getURL("parser-worker.js"))
                  );
            const result = await visualCompletion(canonical, format, visualUnits);
            sendResponse({ ok: true, ...result });
            return;
          }
          const result = await parseInIsolatedWorker(
            canonical,
            () => new Worker(chrome.runtime.getURL("parser-worker.js"))
          );
          sendResponse({
            ok: true,
            result: {
              ...result,
              contentHash,
              ...(canonical === payload.bytes
                ? {}
                : {
                    format: originalFormat,
                    canonicalization: {
                      originalFormat,
                      canonicalFormat: result.format,
                      tool: "LibreOffice WASM / @matbee/libreoffice-converter@2.7.2",
                      canonicalHash: [
                        ...new Uint8Array(
                          await crypto.subtle.digest("SHA-256", canonical.slice().buffer)
                        )
                      ]
                        .map((byte) => byte.toString(16).padStart(2, "0"))
                        .join("")
                    }
                  })
            }
          });
        } catch {
          sendResponse({ ok: false, errorCode: "PARSER_RUNTIME_FAILED" });
        }
      },
      () => sendResponse({ ok: false, errorCode: "PARSER_RUNTIME_FAILED" })
    );
    return true;
  }
);
