import { runtimeWait } from "../v2/runtime-metrics";
import { WorkerBrowserConverter, createWasmPaths } from "@matbee/libreoffice-converter/browser";

import type { DocumentFormat } from "../parser/domain";

let converter: WorkerBrowserConverter | undefined;
let queue: Promise<void> = Promise.resolve();

/** Terminate the isolated worker and its children without invoking LibreOffice's aborting exit. */
function release(): void {
  const current = converter as unknown as { worker?: Worker } | undefined;
  current?.worker?.terminate();
  converter = undefined;
}

/** One native office runtime at a time, with explicit operation ownership and no external resources. */
export function withOffice<T>(run: (office: WorkerBrowserConverter) => Promise<T>): Promise<T> {
  const queuedAt = performance.now();
  const operation = queue.then(async () => {
    runtimeWait("office", "shared-converter", queuedAt);
    if (!converter)
      converter = new WorkerBrowserConverter({
        ...createWasmPaths(chrome.runtime.getURL("office/")),
        browserWorkerJs: chrome.runtime.getURL("office/browser.worker.js")
      });
    const current = converter;
    try {
      await current.initialize();
      return await run(current);
    } finally {
      release();
    }
  });
  queue = operation.then(
    () => undefined,
    () => undefined
  );
  return operation;
}

export async function canonicalizeOffice(
  bytes: Uint8Array,
  format: DocumentFormat
): Promise<Uint8Array> {
  const conversion =
    format === "legacy-doc"
      ? (["doc", "docx"] as const)
      : format === "legacy-ppt"
        ? (["ppt", "pptx"] as const)
        : format === "legacy-xls"
          ? (["xls", "xlsx"] as const)
          : undefined;
  if (!conversion) return bytes;
  return withOffice(async (office) => {
    const result = await office.convert(
      bytes,
      { outputFormat: conversion[1] },
      `source.${conversion[0]}`
    );
    if (!result.data.byteLength) throw new Error("OFFICE_EMPTY_CONVERSION");
    return result.data;
  });
}
