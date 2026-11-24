import { isRecord } from "@syllab/contracts";
import { ArchitectureError, digest } from "./architecture-session";
import { sourceUnits, type ReadScope } from "./course-read";
import { evidenceStorageId } from "./materialize";
import type { AiEvidence } from "./ai-contracts";

/** Verifies storage/locator identity and literal quotation only, never semantic sufficiency. */
export function validateProvenance(value: unknown, scope: ReadScope): AiEvidence[] {
  const evidence: AiEvidence[] = [];
  const aliases = new Map<string, string>();
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (!isRecord(node)) return;
    if ("evidenceId" in node || "excerpt" in node) {
      if (
        typeof node.evidenceId !== "string" ||
        !node.evidenceId ||
        typeof node.sourceId !== "string" ||
        typeof node.locator !== "string" ||
        typeof node.excerpt !== "string" ||
        !node.excerpt
      )
        throw new ArchitectureError("PROVENANCE_SHAPE");
      const known = scope.evidence.find((e) => e.evidenceId === node.evidenceId);
      const source = scope.sources.find((s) => s.sourceId === node.sourceId);
      const unit = source && sourceUnits(source).find((u) => u.locator === node.locator);
      if (known) {
        if (
          known.sourceId !== node.sourceId ||
          known.locator !== node.locator ||
          known.excerpt !== node.excerpt
        )
          throw new ArchitectureError("PROVENANCE_ALIAS_COLLISION");
      } else if (
        (!unit || !unit.text.includes(node.excerpt)) &&
        !scope.rendered?.has(`${node.sourceId}:${node.locator}`)
      ) {
        throw new ArchitectureError("PROVENANCE_LITERAL");
      }
      const fp = digest([node.sourceId, node.locator, node.excerpt]);
      if (aliases.has(node.evidenceId) && aliases.get(node.evidenceId) !== fp)
        throw new ArchitectureError("PROVENANCE_ALIAS_COLLISION");
      aliases.set(node.evidenceId, fp);
      evidence.push(node as unknown as AiEvidence);
    }
    // Consolidation audit nodes have their own state key; they are not fields.
    if ("fieldName" in node || "requirementId" in node) {
      const state = "consolidatedState" in node ? node.consolidatedState : node.state;
      if (
        "fieldName" in node &&
        (!["KNOWN", "UNCERTAIN", "EXPLICITLY_UNKNOWN"].includes(String(state)) ||
          typeof node.fieldName !== "string")
      )
        throw new ArchitectureError("PROVENANCE_FIELD_SHAPE");
      if (!Array.isArray(node.evidence) || node.evidence.some((e) => !isRecord(e)))
        throw new ArchitectureError("PROVENANCE_SUPPORT_SHAPE");
      // A reason alone never substitutes for evidence of a known fact or requirement.
      if (!node.evidence.length && ("requirementId" in node || state !== "UNCERTAIN"))
        throw new ArchitectureError("PROVENANCE_SUPPORT_MISSING");
    }
    Object.values(node).forEach(walk);
  };
  walk(value);
  return evidence;
}

/** Deterministic provider-alias scoping; no semantic content or support is added. */
export function scopeEvidenceIds(value: unknown, courseId: string, scope: ReadScope): unknown {
  if (Array.isArray(value)) return value.map((v) => scopeEvidenceIds(v, courseId, scope));
  if (!isRecord(value)) return value;
  const mapped = Object.fromEntries(
    Object.entries(value).map(([k, v]) => [k, scopeEvidenceIds(v, courseId, scope)])
  );
  if (
    typeof value.evidenceId === "string" &&
    typeof value.sourceId === "string" &&
    typeof value.locator === "string" &&
    typeof value.excerpt === "string"
  ) {
    const source = scope.sources.find((s) => s.sourceId === value.sourceId);
    const hash = source?.parsed?.contentHash ?? source?.machine?.contentHash;
    if (hash) mapped.representationHash = hash;
    if (source)
      mapped.origin = sourceUnits(source).some(
        (unit) => unit.locator === value.locator && unit.text.includes(value.excerpt as string)
      )
        ? "native"
        : scope.rendered?.has(`${value.sourceId}:${value.locator}`)
          ? "visual"
          : "unverified";
    if (source?.lastParsedAt ?? source?.lastFetchedAt)
      mapped.capturedAt = source.lastParsedAt ?? source.lastFetchedAt;
    mapped.evidenceId = evidenceStorageId(courseId, {
      evidenceId: value.evidenceId,
      sourceId: value.sourceId,
      locator: value.locator,
      excerpt: value.excerpt,
      ...(hash ? { representationHash: hash } : {})
    });
  }
  return mapped;
}
