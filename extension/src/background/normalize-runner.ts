import type { ScanSummary } from "@syllab/contracts";

import type { RawSourceUnit } from "../normalize/domain";
import { normalizeSourceUnits } from "../normalize/normalizer";
import { IndexedDbNormalizedUnitRepository } from "../normalize/repository";
import { IndexedDbParsedSourceRepository } from "../parser/repository";
import { DiscoveryRepository } from "../repository/discovery-repository";

export interface NormalizeRunState {
  unitCount: number;
  duplicateCount: number;
  sourceCount: number;
  complete: boolean;
}

export async function startNormalize(scanId: string): Promise<NormalizeRunState> {
  const discoveryRepository = new DiscoveryRepository(chrome.storage.local);
  const normalizedRepository = new IndexedDbNormalizedUnitRepository();
  const [discovery, parsed] = await Promise.all([
    discoveryRepository.getCheckpoint(scanId),
    new IndexedDbParsedSourceRepository().list(scanId)
  ]);
  if (!discovery?.complete) throw new Error("DISCOVERY_NOT_COMPLETE");
  const raw: RawSourceUnit[] = [];
  for (const source of discovery.sources) {
    if (source.kind === "attachment" || !source.rawText) continue;
    raw.push({
      courseId: source.courseId,
      scanId,
      sourceId: source.sourceId,
      sourceType: source.kind,
      title: source.title,
      path: source.discoveryPath,
      locator: "item",
      text: source.rawText
    });
  }
  for (const record of parsed) {
    for (const unit of record.result.units) {
      raw.push({
        courseId: record.courseId,
        scanId,
        sourceId: record.sourceId,
        sourceType: record.sourceType,
        title: record.title,
        path: record.path,
        locator: unit.locator,
        text: unit.text
      });
    }
  }
  const units = await normalizeSourceUnits(raw);
  await normalizedRepository.replace(scanId, units);
  const summary: ScanSummary = {
    scanId,
    courseId: discovery.courseId,
    status: "Scanning",
    recoverable: true,
    phase: "extract"
  };
  if ((await discoveryRepository.getScanSummary(scanId))?.status !== "Interrupted") {
    await discoveryRepository.upsertScanSummary(summary);
  }
  return {
    unitCount: units.length,
    duplicateCount: units.filter((unit) => unit.duplicateOfUnitId).length,
    sourceCount: new Set(units.map((unit) => unit.sourceId)).size,
    complete: true
  };
}

export async function getNormalizeState(scanId: string): Promise<NormalizeRunState> {
  const units = await new IndexedDbNormalizedUnitRepository().list(scanId);
  return {
    unitCount: units.length,
    duplicateCount: units.filter((unit) => unit.duplicateOfUnitId).length,
    sourceCount: new Set(units.map((unit) => unit.sourceId)).size,
    complete: units.length > 0
  };
}
