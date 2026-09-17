import type { SourceKind } from "@syllab/contracts";

export interface RawSourceUnit {
  courseId: string;
  scanId: string;
  sourceId: string;
  sourceType: SourceKind;
  title: string;
  path: string[];
  locator: string;
  text: string;
}

export interface NormalizedUnit extends RawSourceUnit {
  unitId: string;
  contentHash: string;
  duplicateOfUnitId?: string;
}

export interface NormalizedBatch {
  batchId: string;
  sourceId: string;
  units: NormalizedUnit[];
  characterCount: number;
}
