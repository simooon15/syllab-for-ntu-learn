import { canonicalInlineText, canonicalText, sha256, stableStringify } from "./crypto";
import type { MachineComparison, SourceMachineRepresentation } from "./domain";

export interface SourceRepresentationInput {
  sourceId: string;
  title: string;
  sourceType: string;
  parentSourceId?: string;
  text: string;
  structure: string[];
}

/**
 * Signed attachment URLs, transport timestamps and whitespace noise are volatile and must not
 * make an unchanged Source look machine-different. Native IDs and parent relationships are
 * identity, so they stay in the metadata hash.
 */
export async function sourceMachineRepresentation(
  input: SourceRepresentationInput
): Promise<SourceMachineRepresentation> {
  const metadata = stableStringify({
    title: canonicalText(input.title),
    sourceType: input.sourceType,
    parentSourceId: input.parentSourceId ?? null
  });
  return {
    sourceId: input.sourceId,
    canonicalMetadataHash: await sha256(metadata),
    contentHash: await sha256(canonicalInlineText(input.text)),
    structureHash: await sha256(stableStringify(input.structure.map(canonicalText))),
    representationVersion: 1
  };
}

export function compareMachineRepresentations(
  previous: SourceMachineRepresentation | undefined,
  next: SourceMachineRepresentation | undefined,
  successfulCoverage: boolean
): MachineComparison {
  if (!previous && next) return "new-source";
  if (previous && !next) {
    return successfulCoverage ? "missing-after-successful-coverage" : "incomparable";
  }
  if (!previous || !next) return "incomparable";
  return previous.canonicalMetadataHash === next.canonicalMetadataHash &&
    previous.contentHash === next.contentHash &&
    previous.structureHash === next.structureHash
    ? "unchanged"
    : "machine-different";
}

/** Only a real machine difference or a brand new Source may trigger a paid semantic call. */
export function requiresSemanticProcessing(comparison: MachineComparison): boolean {
  return comparison === "machine-different" || comparison === "new-source";
}
