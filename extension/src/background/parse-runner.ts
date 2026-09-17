import { CONTRACT_VERSION, isRecord, type ScanSummary } from "@syllab/contracts";

import type { ParseResult } from "../parser/domain";
import { IndexedDbParsedSourceRepository } from "../parser/repository";
import { DiscoveryRepository } from "../repository/discovery-repository";
import { FetchRepository } from "../repository/fetch-repository";

let creatingOffscreen: Promise<void> | null = null;

async function ensureOffscreenDocument(): Promise<void> {
  const url = chrome.runtime.getURL("offscreen.html");
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [url]
  });
  if (contexts.length > 0) return;
  creatingOffscreen ??= chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: [chrome.offscreen.Reason.WORKERS],
    justification: "Parse one fetched course document per isolated worker"
  });
  try {
    await creatingOffscreen;
  } finally {
    creatingOffscreen = null;
  }
}

export interface ParseRunState {
  parsed: number;
  partial: number;
  unsupported: number;
  failed: number;
  complete: boolean;
}

function summarize(results: readonly ParseResult[], expected: number): ParseRunState {
  return {
    parsed: results.filter((result) => result.status === "parsed").length,
    partial: results.filter((result) => result.status === "partial").length,
    unsupported: results.filter((result) => result.status === "unsupported").length,
    failed: results.filter((result) => result.status === "failed").length,
    complete: results.length === expected
  };
}

export async function startParse(scanId: string): Promise<ParseRunState> {
  const discoveryRepository = new DiscoveryRepository(chrome.storage.local);
  const fetchRepository = new FetchRepository(chrome.storage.local);
  const parsedRepository = new IndexedDbParsedSourceRepository();
  const [discovery, fetchCheckpoint, existing] = await Promise.all([
    discoveryRepository.getCheckpoint(scanId),
    fetchRepository.getCheckpoint(scanId),
    parsedRepository.list(scanId)
  ]);
  if (!discovery?.complete || !fetchCheckpoint?.complete) throw new Error("FETCH_NOT_COMPLETE");
  const fetchedIds = new Set(
    fetchCheckpoint.results
      .filter((result) => result.status === "fetched")
      .map((result) => result.sourceId)
  );
  const attachments = discovery.sources.filter(
    (source) => source.kind === "attachment" && source.requestUrl && fetchedIds.has(source.sourceId)
  );
  const completedRecords = existing.filter((record) => record.result.status !== "failed");
  const completedIds = new Set(completedRecords.map((record) => record.sourceId));
  const results = completedRecords.map((record) => record.result);
  if (attachments.some((source) => !completedIds.has(source.sourceId))) {
    await ensureOffscreenDocument();
  }
  for (const source of attachments) {
    if (completedIds.has(source.sourceId) || !source.requestUrl) continue;
    let result: ParseResult;
    try {
      const response: unknown = await chrome.runtime.sendMessage({
        contractVersion: CONTRACT_VERSION,
        type: "PARSE_ATTACHMENT",
        sourceId: source.sourceId,
        requestUrl: source.requestUrl
      });
      if (!isRecord(response) || response.ok !== true || !isRecord(response.result)) {
        throw new Error("PARSER_RUNTIME_FAILED");
      }
      result = response.result as unknown as ParseResult;
    } catch {
      result = {
        format: "unsupported",
        status: "failed",
        units: [],
        diagnosticsCode: "PARSER_RUNTIME_FAILED"
      };
    }
    await parsedRepository.put({
      recordId: `${scanId}:${source.sourceId}`,
      scanId,
      courseId: discovery.courseId,
      sourceId: source.sourceId,
      sourceType: source.kind,
      title: source.title,
      path: source.discoveryPath,
      result
    });
    results.push(result);
  }
  const state = summarize(results, attachments.length);
  const summary: ScanSummary = {
    scanId,
    courseId: discovery.courseId,
    status: "Scanning",
    recoverable: true,
    phase: "normalize"
  };
  if ((await discoveryRepository.getScanSummary(scanId))?.status !== "Interrupted") {
    await discoveryRepository.upsertScanSummary(summary);
  }
  await chrome.offscreen.closeDocument().catch(() => undefined);
  return state;
}

export async function getParseState(scanId: string): Promise<ParseRunState> {
  const [discovery, records] = await Promise.all([
    new DiscoveryRepository(chrome.storage.local).getCheckpoint(scanId),
    new IndexedDbParsedSourceRepository().list(scanId)
  ]);
  const expected =
    discovery?.sources.filter((source) => source.kind === "attachment" && source.requestUrl)
      .length ?? 0;
  return summarize(
    records.map((record) => record.result),
    expected
  );
}
