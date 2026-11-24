/** Physical packing only. Every whole Source occurs once; no relevance, dates or name rules. */
import { directEvidenceCatalog, resolveDirectEvidence } from "./direct-evidence";
import { isRecord } from "@syllab/contracts";
import type { SourceRecord } from "./schema";
export function directNativeBatches(
  sources: SourceRecord[],
  targetBytes = 128 * 1024
): SourceRecord[][] {
  if (!Number.isSafeInteger(targetBytes) || targetBytes < 1) throw Error("DIRECT_BATCH_BOUNDARY");
  const batches: SourceRecord[][] = [];
  let current: SourceRecord[] = [],
    bytes = 0;
  for (const source of sources) {
    const measured = new TextEncoder().encode(
      JSON.stringify(directEvidenceCatalog([source]).delivered)
    ).byteLength;
    if (current.length && bytes + measured > targetBytes) {
      batches.push(current);
      current = [];
      bytes = 0;
    }
    current.push(source);
    bytes += measured;
  }
  if (current.length) batches.push(current);
  return batches;
}
export function remapDirectNativeEvidence(
  value: unknown,
  from: SourceRecord[],
  to: SourceRecord[]
): unknown {
  const full = directEvidenceCatalog(to);
  const byTriple = new Map(
    [...full.references].map(([id, e]) => [JSON.stringify([e.sourceId, e.locator, e.excerpt]), id])
  );
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!isRecord(node)) return node;
    if (
      typeof node.sourceId === "string" &&
      typeof node.locator === "string" &&
      typeof node.excerpt === "string" &&
      typeof node.evidenceId === "string"
    ) {
      const refId = byTriple.get(JSON.stringify([node.sourceId, node.locator, node.excerpt]));
      if (!refId) throw Error("DIRECT_NATIVE_REMAP_MISSING");
      return { refId };
    }
    return Object.fromEntries(Object.entries(node).map(([k, v]) => [k, walk(v)]));
  };
  return walk(resolveDirectEvidence(value, from));
}
