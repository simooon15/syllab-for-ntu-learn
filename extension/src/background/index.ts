import { CONTRACT_VERSION, isRecord } from "@syllab/contracts";

import { summarizeDiscovery } from "../discovery/summary";
import { DiscoveryRepository } from "../repository/discovery-repository";
import { ensureStorageSchema, readStorageSchemaVersion } from "../repository/schema-repository";
import { startDiscovery } from "./discovery-runner";
import { applyPermissionDecision, getFetchState, startFetch } from "./fetch-runner";
import { getParseState, startParse } from "./parse-runner";
import { getNormalizeState, startNormalize } from "./normalize-runner";
import { startExtraction } from "./extraction-runner";
import { CourseIndexRepository } from "../repository/course-index-repository";
import { FetchRepository } from "../repository/fetch-repository";
import { IndexedDbParsedSourceRepository } from "../parser/repository";
import { ScanLeaseRepository, withScanLease } from "../recovery/lease";
import { scanIssues } from "../recovery/overview";

async function initialize(): Promise<void> {
  await ensureStorageSchema(chrome.storage.local);
  const courses = new CourseIndexRepository(chrome.storage.local);
  const scans = await courses.listScans();
  const recovered = await new ScanLeaseRepository(chrome.storage.local).interruptExpired(scans);
  if (JSON.stringify(recovered) !== JSON.stringify(scans)) await courses.replaceScans(recovered);
}

chrome.runtime.onInstalled.addListener(() => {
  void initialize();
});

chrome.runtime.onStartup.addListener(() => {
  void initialize();
});

chrome.runtime.onMessage.addListener(
  (message: unknown, _sender, sendResponse: (response: unknown) => void) => {
    if (
      !isRecord(message) ||
      message.contractVersion !== CONTRACT_VERSION ||
      (message.type !== "GET_SCHEMA_VERSION" &&
        message.type !== "GET_DISCOVERY_SUMMARY" &&
        message.type !== "START_DISCOVERY" &&
        message.type !== "START_FETCH" &&
        message.type !== "GET_FETCH_STATE" &&
        message.type !== "APPLY_PERMISSION_DECISION" &&
        message.type !== "START_PARSE" &&
        message.type !== "GET_PARSE_STATE" &&
        message.type !== "START_NORMALIZE" &&
        message.type !== "GET_NORMALIZE_STATE" &&
        message.type !== "START_EXTRACTION" &&
        message.type !== "RESUME_SCAN" &&
        message.type !== "CANCEL_SCAN" &&
        message.type !== "GET_SCAN_OVERVIEW")
    ) {
      return false;
    }
    if (message.type === "GET_SCHEMA_VERSION") {
      void readStorageSchemaVersion(chrome.storage.local).then(
        (schemaVersion) => sendResponse({ contractVersion: CONTRACT_VERSION, schemaVersion }),
        () => sendResponse({ contractVersion: CONTRACT_VERSION, error: "STORAGE_UNAVAILABLE" })
      );
      return true;
    }
    if (message.type === "GET_DISCOVERY_SUMMARY") {
      if (typeof message.scanId !== "string") return false;
      const repository = new DiscoveryRepository(chrome.storage.local);
      void repository.getCheckpoint(message.scanId).then(
        (checkpoint) =>
          sendResponse({
            contractVersion: CONTRACT_VERSION,
            ...(checkpoint
              ? { summary: summarizeDiscovery(checkpoint) }
              : { error: "DISCOVERY_CHECKPOINT_NOT_FOUND" })
          }),
        () => sendResponse({ contractVersion: CONTRACT_VERSION, error: "STORAGE_UNAVAILABLE" })
      );
      return true;
    }
    if (message.type === "GET_FETCH_STATE") {
      if (typeof message.scanId !== "string") return false;
      void getFetchState(message.scanId).then(
        (state) => sendResponse({ contractVersion: CONTRACT_VERSION, state }),
        () => sendResponse({ contractVersion: CONTRACT_VERSION, error: "STORAGE_UNAVAILABLE" })
      );
      return true;
    }
    if (message.type === "START_FETCH") {
      if (typeof message.scanId !== "string") return false;
      const scanId = message.scanId;
      void withScanLease(chrome.storage.local, scanId, () => startFetch(scanId)).then(
        (result) => sendResponse({ contractVersion: CONTRACT_VERSION, ...result }),
        (error: unknown) =>
          sendResponse({
            contractVersion: CONTRACT_VERSION,
            error: error instanceof Error ? error.message : "Fetch failed"
          })
      );
      return true;
    }
    if (message.type === "APPLY_PERMISSION_DECISION") {
      if (
        typeof message.scanId !== "string" ||
        typeof message.origin !== "string" ||
        typeof message.granted !== "boolean"
      ) {
        return false;
      }
      const scanId = message.scanId;
      const origin = message.origin;
      const granted = message.granted;
      void withScanLease(chrome.storage.local, scanId, () =>
        applyPermissionDecision(scanId, origin, granted)
      ).then(
        (result) => sendResponse({ contractVersion: CONTRACT_VERSION, ...result }),
        (error: unknown) =>
          sendResponse({
            contractVersion: CONTRACT_VERSION,
            error: error instanceof Error ? error.message : "Permission decision failed"
          })
      );
      return true;
    }
    if (message.type === "GET_PARSE_STATE") {
      if (typeof message.scanId !== "string") return false;
      void getParseState(message.scanId).then(
        (state) => sendResponse({ contractVersion: CONTRACT_VERSION, state }),
        () => sendResponse({ contractVersion: CONTRACT_VERSION, error: "STORAGE_UNAVAILABLE" })
      );
      return true;
    }
    if (message.type === "START_PARSE") {
      if (typeof message.scanId !== "string") return false;
      const scanId = message.scanId;
      void withScanLease(chrome.storage.local, scanId, () => startParse(scanId)).then(
        (state) => sendResponse({ contractVersion: CONTRACT_VERSION, state }),
        (error: unknown) =>
          sendResponse({
            contractVersion: CONTRACT_VERSION,
            error: error instanceof Error ? error.message : "Parse failed"
          })
      );
      return true;
    }
    if (message.type === "GET_NORMALIZE_STATE") {
      if (typeof message.scanId !== "string") return false;
      void getNormalizeState(message.scanId).then(
        (state) => sendResponse({ contractVersion: CONTRACT_VERSION, state }),
        () => sendResponse({ contractVersion: CONTRACT_VERSION, error: "STORAGE_UNAVAILABLE" })
      );
      return true;
    }
    if (message.type === "START_NORMALIZE") {
      if (typeof message.scanId !== "string") return false;
      const scanId = message.scanId;
      void withScanLease(chrome.storage.local, scanId, () => startNormalize(scanId)).then(
        (state) => sendResponse({ contractVersion: CONTRACT_VERSION, state }),
        (error: unknown) =>
          sendResponse({
            contractVersion: CONTRACT_VERSION,
            error: error instanceof Error ? error.message : "Normalize failed"
          })
      );
      return true;
    }
    if (message.type === "START_EXTRACTION") {
      if (typeof message.scanId !== "string") return false;
      const scanId = message.scanId;
      void withScanLease(chrome.storage.local, scanId, () => startExtraction(scanId)).then(
        (state) => sendResponse({ contractVersion: CONTRACT_VERSION, state }),
        (error: unknown) =>
          sendResponse({
            contractVersion: CONTRACT_VERSION,
            error: error instanceof Error ? error.message : "Extraction failed"
          })
      );
      return true;
    }
    if (message.type === "RESUME_SCAN") {
      if (typeof message.scanId !== "string") return false;
      void new CourseIndexRepository(chrome.storage.local).resumeScan(message.scanId).then(
        (scan) =>
          sendResponse(
            scan
              ? { contractVersion: CONTRACT_VERSION, status: scan.status }
              : { contractVersion: CONTRACT_VERSION, error: "SCAN_NOT_RECOVERABLE" }
          ),
        () => sendResponse({ contractVersion: CONTRACT_VERSION, error: "STORAGE_UNAVAILABLE" })
      );
      return true;
    }
    if (message.type === "CANCEL_SCAN") {
      if (typeof message.scanId !== "string") return false;
      const scanId = message.scanId;
      const courses = new CourseIndexRepository(chrome.storage.local);
      void courses.listScans().then(async (scans) => {
        const target = scans.find((scan) => scan.scanId === scanId);
        if (!target) {
          sendResponse({ contractVersion: CONTRACT_VERSION, error: "SCAN_NOT_FOUND" });
          return;
        }
        await courses.replaceScans(
          scans.map((scan) =>
            scan.scanId === scanId
              ? { ...scan, status: "Interrupted" as const, recoverable: true }
              : scan
          )
        );
        await new ScanLeaseRepository(chrome.storage.local).clear(scanId);
        sendResponse({ contractVersion: CONTRACT_VERSION, status: "Interrupted" });
      });
      return true;
    }
    if (message.type === "GET_SCAN_OVERVIEW") {
      if (typeof message.scanId !== "string") return false;
      const discoveryRepository = new DiscoveryRepository(chrome.storage.local);
      const courseRepository = new CourseIndexRepository(chrome.storage.local);
      void Promise.all([
        discoveryRepository.getCheckpoint(message.scanId),
        new FetchRepository(chrome.storage.local).getCheckpoint(message.scanId),
        new IndexedDbParsedSourceRepository().list(message.scanId),
        courseRepository.listScans()
      ]).then(([discovery, fetch, parsed, scans]) => {
        const summary = scans.find((scan) => scan.scanId === message.scanId);
        sendResponse({
          contractVersion: CONTRACT_VERSION,
          issues: scanIssues({
            discoveryIssues: discovery?.issues ?? [],
            ...(fetch ? { fetch } : {}),
            parsed,
            interrupted: summary?.status === "Interrupted"
          })
        });
      });
      return true;
    }
    if (typeof message.courseId !== "string" || typeof message.tabId !== "number") return false;
    void startDiscovery(
      message.courseId,
      message.tabId,
      typeof message.restartScanId === "string" ? message.restartScanId : undefined
    ).then(
      (result) => sendResponse({ contractVersion: CONTRACT_VERSION, ...result }),
      (error: unknown) =>
        sendResponse({
          contractVersion: CONTRACT_VERSION,
          error: error instanceof Error ? error.message : "Discovery failed"
        })
    );
    return true;
  }
);

void initialize();
