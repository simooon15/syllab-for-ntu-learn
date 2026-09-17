import type { ScanSummary } from "@syllab/contracts";

import { extractCandidateBatches } from "../ai/client";
import {
  ChromeInstallationCredentialRepository,
  HttpAiBackendTransport
} from "../ai/http-transport";
import { createNormalizedBatches } from "../normalize/normalizer";
import { IndexedDbNormalizedUnitRepository } from "../normalize/repository";
import { CourseIndexRepository } from "../repository/course-index-repository";
import { DiscoveryRepository } from "../repository/discovery-repository";
import { reviewProgress } from "../review/state";
import { IndexedDbReviewRepository } from "../review/repository";
import { IndexedDbBriefRepository } from "../brief/repository";
import { reconcileScanAgain } from "../scan-again/reconcile";
import { FetchRepository } from "../repository/fetch-repository";
import { IndexedDbParsedSourceRepository } from "../parser/repository";

export interface ExtractionRunState {
  candidateCount: number;
  needsReviewCount: number;
  detectedCount: number;
  failedBatchCount: number;
  failureCodes: string[];
  outcome: "Complete" | "Partial" | "Failed";
}

export async function startExtraction(scanId: string): Promise<ExtractionRunState> {
  const discoveryRepository = new DiscoveryRepository(chrome.storage.local);
  const reviewRepository = new IndexedDbReviewRepository();
  const courseRepository = new CourseIndexRepository(chrome.storage.local);
  const briefRepository = new IndexedDbBriefRepository();
  const [discovery, units, existingReview, existingCourse, existingBrief, fetchState, parsed] =
    await Promise.all([
      discoveryRepository.getCheckpoint(scanId),
      new IndexedDbNormalizedUnitRepository().list(scanId),
      reviewRepository.load(scanId),
      courseRepository.findCourseByScanFallback(scanId),
      briefRepository.listAllItems(),
      new FetchRepository(chrome.storage.local).getCheckpoint(scanId),
      new IndexedDbParsedSourceRepository().list(scanId)
    ]);
  if (!discovery?.complete) throw new Error("DISCOVERY_NOT_COMPLETE");
  if (existingReview.progress && existingReview.progress.reviewed > 0) {
    throw new Error("REVIEW_ALREADY_STARTED");
  }
  const batches = createNormalizedBatches(units);
  const extraction = await extractCandidateBatches({
    courseId: discovery.courseId,
    scanId,
    batches,
    credentials: new ChromeInstallationCredentialRepository(),
    transport: new HttpAiBackendTransport()
  });
  if ((await discoveryRepository.getScanSummary(scanId))?.status === "Interrupted") {
    throw new Error("SCAN_INTERRUPTED");
  }
  let candidates = extraction.candidates;
  if (existingCourse?.lastEffectiveScanId && existingCourse.lastEffectiveScanId !== scanId) {
    const prior = await reviewRepository.load(existingCourse.lastEffectiveScanId);
    const currentBrief = existingBrief.filter((item) => item.courseId === discovery.courseId);
    const reconciled = reconcileScanAgain(candidates, currentBrief, prior.candidates);
    candidates = reconciled.candidates;
    if (reconciled.linkedCount > 0) await briefRepository.upsertCourseItems(reconciled.briefItems);
  }
  const progress = reviewProgress(scanId, candidates);
  await reviewRepository.save(scanId, candidates, progress);
  const upstreamIssueCount =
    discovery.issues.length +
    (fetchState?.results.filter(
      (result) => result.status === "permission-denied" || result.status === "failed"
    ).length ?? 0) +
    parsed.filter(
      (record) => record.result.status === "unsupported" || record.result.status === "failed"
    ).length;
  const outcome =
    (extraction.failures.length === batches.length && candidates.length === 0) ||
    (units.length === 0 && upstreamIssueCount > 0)
      ? "Failed"
      : extraction.failures.length > 0 || upstreamIssueCount > 0
        ? "Partial"
        : "Complete";
  const scanSummary: ScanSummary = {
    scanId,
    courseId: discovery.courseId,
    status: outcome,
    recoverable: outcome === "Failed",
    phase: "extract"
  };
  await discoveryRepository.upsertScanSummary(scanSummary);
  const existing = await courseRepository.findCourse(discovery.courseId);
  await courseRepository.upsertCourse({
    courseId: discovery.courseId,
    ...(existing?.courseCode ? { courseCode: existing.courseCode } : {}),
    ...(existing?.courseName ? { courseName: existing.courseName } : {}),
    hasEffectiveScan: outcome === "Failed" ? (existing?.hasEffectiveScan ?? false) : true,
    hasBrief: (existing?.hasBrief ?? false) || (outcome !== "Failed" && progress.complete),
    pendingReviewCount: progress.detected + progress.needsReview,
    ...(outcome === "Failed"
      ? existing?.lastEffectiveScanId
        ? { lastEffectiveScanId: existing.lastEffectiveScanId }
        : {}
      : { lastEffectiveScanId: scanId })
  });
  return {
    candidateCount: candidates.length,
    needsReviewCount: progress.needsReview,
    detectedCount: progress.detected,
    failedBatchCount: extraction.failures.length,
    failureCodes: [...new Set(extraction.failures.map((failure) => failure.code))],
    outcome
  };
}
