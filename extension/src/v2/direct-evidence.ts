/** Native-reference wire encoding: AI selects passages, Local only resolves exact saved text. */
import { isRecord } from "@syllab/contracts";
import { sourceUnits } from "./course-read";
import { nativeDeliverySource } from "./native-delivery";
import type { SourceRecord } from "./schema";
import { ArchitectureError } from "./architecture-session";
export function directBodyReadScope(sources: SourceRecord[]) {
  return sources.map(nativeDeliverySource).map((source, i) => {
    const fields = sourceUnits(source)
      .flatMap((u) => u.text.split("\n"))
      .filter((line) => /^\s*body\.(?:displayText|rawText)\s*:/u.test(line));
    return {
      sourceRef: `s${String(i + 1)}`,
      suppliedBodyFieldLines: fields.length,
      maskedBodyFieldLines: fields.filter((line) => line.includes("[REDACTED_ACCESS_SECRET]"))
        .length
    };
  });
}

export const DIRECT_EVIDENCE_ENCODING = "native-ref/1";

function safeSegments(text: string): string[] {
  const parts: string[] = [];
  for (const line of text.split("\n")) {
    const last = parts[parts.length - 1];
    if (
      last !== undefined &&
      !last.includes("[REDACTED_ACCESS_SECRET]") &&
      !line.includes("[REDACTED_ACCESS_SECRET]")
    )
      parts[parts.length - 1] = last + "\n" + line;
    else parts.push(line);
  }
  return parts;
}
export function directEvidenceCatalog(sources: SourceRecord[]) {
  const references = new Map<
    string,
    { evidenceId: string; sourceId: string; locator: string; excerpt: string }
  >();
  const delivered = sources.map(nativeDeliverySource).map((source, si) => ({
    index: {
      sourceRef: `s${String(si + 1)}`,
      sourceId: source.sourceId,
      nativeItemId: source.nativeItemId,
      kind: source.kind,
      title: source.title,
      parentSourceId: source.parentSourceId ?? null,
      unavailableNativeLocators: sourceUnits(source)
        .filter((u) => !source.parsed || !u.text)
        .map((u) => u.locator)
    },
    parseAvailable: source.parsed !== undefined,
    nativeContent: sourceUnits(source).map(
      ({ text, textRanges: _geometry, embeddedImagePaths: _paths, ...unit }, ui) => ({
        ...unit,
        passages: safeSegments(text).map((excerpt, li) => {
          const refId = `n${String(si + 1)}.${String(ui + 1)}.${String(li + 1)}`;
          if (excerpt.trim() && !excerpt.includes("[REDACTED_ACCESS_SECRET]")) {
            references.set(refId, {
              evidenceId: `direct:${refId}`,
              sourceId: source.sourceId,
              locator: unit.locator,
              excerpt
            });
            return { refId, text: excerpt };
          }
          return { text: excerpt };
        })
      })
    )
  }));
  return { delivered, references };
}
/** No fuzzy matching, quote rewriting, inferred support, or semantic selection. Unknown IDs fail. */
export function resolveDirectEvidence(value: unknown, sources: SourceRecord[]) {
  const { references } = directEvidenceCatalog(sources);
  const walk = (node: unknown, evidenceList = false): unknown => {
    if (evidenceList && typeof node === "string") {
      const reference = references.get(node);
      if (!reference) throw new ArchitectureError("DIRECT_REF_UNKNOWN");
      return { ...reference };
    }
    if (Array.isArray(node)) return node.map((item) => walk(item, evidenceList));
    if (!isRecord(node)) return node;
    if ("refId" in node) {
      if (Object.keys(node).length !== 1 || typeof node.refId !== "string")
        throw new ArchitectureError("DIRECT_REF_SHAPE");
      const ref = references.get(node.refId);
      if (!ref) throw new ArchitectureError("DIRECT_REF_UNKNOWN");
      return { ...ref };
    }
    return Object.fromEntries(
      Object.entries(node).map(([k, v]) => [
        k,
        walk(
          v,
          [
            "evidence",
            "supportingEvidence",
            "contradictoryEvidence",
            "currentEvidence",
            "newEvidence"
          ].includes(k)
        )
      ])
    );
  };
  return walk(value);
}
