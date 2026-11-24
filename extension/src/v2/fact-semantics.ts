import type { FactRecord, FactSemantics } from "./schema";

/** Human interpretation overrides operative facets, never the captured model/source provenance. */
export function operativeSemantics(fact: FactRecord | undefined): FactSemantics | undefined {
  if (!fact) return undefined;
  const semantics = fact.humanSemantics ?? fact.product ?? fact.semanticClause;
  return semantics
    ? {
        modality: semantics.modality,
        conditions: semantics.conditions,
        exceptions: semantics.exceptions
      }
    : undefined;
}
export function withHumanSemantics(fact: FactRecord, semantics?: FactSemantics): FactRecord {
  if (!semantics) return fact;
  if (
    typeof semantics.modality !== "string" ||
    !semantics.modality.trim() ||
    !Array.isArray(semantics.conditions) ||
    !Array.isArray(semantics.exceptions) ||
    [...semantics.conditions, ...semantics.exceptions].some((s) => typeof s !== "string")
  )
    throw Error("INVALID_HUMAN_SEMANTICS");
  return { ...fact, humanSemantics: structuredClone(semantics), userEdited: true };
}
