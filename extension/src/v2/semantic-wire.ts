import { isRecord } from "@syllab/contracts";
import { digest } from "./architecture-session";

export type EvidenceCatalog = Record<string, Record<string, unknown>>;
const fullEvidence = (v: unknown): v is Record<string, unknown> =>
  isRecord(v) &&
  ["evidenceId", "sourceId", "locator", "excerpt"].every((k) => typeof v[k] === "string" && !!v[k]);
/** Exact transport dictionary. No text normalization, classification or response repair. */
export function catalogInput(input: unknown): { input: unknown; catalog: EvidenceCatalog } {
  const catalog: EvidenceCatalog = {};
  const encode = (v: unknown): unknown => {
    if (fullEvidence(v)) {
      const ref = `q:${digest([v.sourceId, v.locator, v.excerpt])}`;
      const value = { ...v, evidenceId: `wire:${ref}` };
      if (
        catalog[ref] &&
        JSON.stringify([catalog[ref].sourceId, catalog[ref].locator, catalog[ref].excerpt]) !==
          JSON.stringify([v.sourceId, v.locator, v.excerpt])
      )
        throw Error("EVIDENCE_DICTIONARY_COLLISION");
      catalog[ref] ??= value;
      return { evidenceRef: ref };
    }
    if (Array.isArray(v)) return v.map(encode);
    if (isRecord(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x)]));
    return v;
  };
  const value = encode(input);
  if (!isRecord(value)) throw Error("EVIDENCE_DICTIONARY_INPUT");
  if (Object.hasOwn(value, "evidenceCatalog")) throw Error("EVIDENCE_DICTIONARY_RESERVED_KEY");
  return { input: { ...value, evidenceCatalog: catalog }, catalog };
}
export function expandEvidenceRefs(value: unknown, catalog: EvidenceCatalog): unknown {
  if (Array.isArray(value)) return value.map((v) => expandEvidenceRefs(v, catalog));
  if (!isRecord(value)) return value;
  if (Object.hasOwn(value, "evidenceRef")) {
    if (
      Object.keys(value).length !== 1 ||
      typeof value.evidenceRef !== "string" ||
      !Object.hasOwn(catalog, value.evidenceRef)
    )
      throw Error("EVIDENCE_DICTIONARY_UNKNOWN_REF");
    return structuredClone(catalog[value.evidenceRef]);
  }
  return Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, expandEvidenceRefs(v, catalog)])
  );
}
export function evidenceWireInstructions(): string {
  return `EVIDENCE DICTIONARY /1 (negotiated transport, not repair): input.evidenceCatalog maps exact ref IDs to immutable full original Evidence. Reuse any supplied quote with the singleton object {"evidenceRef":"exact q: ref"}, without extra keys. Local dereferences exact bytes and revalidates provenance; no invented ref or Source alias is accepted. New quotes not in the dictionary must use full original Evidence. Prefer dictionary references throughout outputs, including relevance, dispositions, fields, requirements, facets and carry. Do not repeat the dictionary or source text in your response. Keep original polarity, modality, conditions and exceptions in authored content. This overrides the full-object wire requirement only for supplied dictionary quotes; internal canonical Evidence remains full objects.`;
}
