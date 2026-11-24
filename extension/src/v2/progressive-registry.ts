import { isRecord } from "@syllab/contracts";
import { ArchitectureError, digest } from "./architecture-session";
export interface RegistryRecord {
  id: string;
  revision: number;
  kind: "group" | "rule" | "draft-disposition" | "rule-disposition" | "identity" | "issue";
  payload: Record<string, unknown>;
}
export interface RegistryOperation {
  id: string;
  recordId: string;
  expectedRevision: number;
  kind: "put" | "retire";
  record?: RegistryRecord;
  replacementRefs?: string[];
  reason?: string;
}
export interface Registry {
  revision: number;
  records: RegistryRecord[];
  retired: Array<{ id: string; reason: string; replacementRefs: string[] }>;
  applied: Record<string, string>;
  versions: RegistryRecord[];
}
export const emptyRegistry = (): Registry => ({
  revision: 0,
  records: [],
  retired: [],
  applied: {},
  versions: []
});
export function applyOperations(base: Registry, operations: unknown[]): Registry {
  const next = structuredClone(base);
  for (const raw of operations) {
    if (
      !isRecord(raw) ||
      typeof raw.id !== "string" ||
      typeof raw.recordId !== "string" ||
      !Number.isSafeInteger(raw.expectedRevision) ||
      !["put", "retire"].includes(String(raw.kind))
    )
      throw new ArchitectureError("REGISTRY_OPERATION");
    const op = raw as unknown as RegistryOperation;
    if (next.applied[op.id]) {
      if (next.applied[op.id] !== digest(op)) throw new ArchitectureError("OPERATION_COLLISION");
      continue;
    }
    if (next.retired.some((r) => r.id === op.recordId))
      throw new ArchitectureError("RETIRED_ALIAS_REUSE");
    const prior = next.records.find((r) => r.id === op.recordId);
    if ((prior?.revision ?? 0) !== op.expectedRevision) throw new ArchitectureError("REGISTRY_CAS");
    if (op.kind === "put") {
      const record = op.record;
      if (
        !record ||
        record.id !== op.recordId ||
        record.revision !== op.expectedRevision + 1 ||
        !["group", "rule", "draft-disposition", "rule-disposition", "identity", "issue"].includes(
          record.kind
        ) ||
        !isRecord(record.payload)
      )
        throw new ArchitectureError("REGISTRY_RECORD");
      if (prior && prior.kind !== record.kind) throw new ArchitectureError("RECORD_KIND_COLLISION");
      next.versions.push(structuredClone(record));
      next.records = [...next.records.filter((r) => r.id !== op.recordId), record];
    } else {
      if (!prior || !op.reason || !Array.isArray(op.replacementRefs))
        throw new ArchitectureError("REGISTRY_RETIREMENT");
      next.records = next.records.filter((r) => r.id !== op.recordId);
      next.retired.push({
        id: op.recordId,
        reason: op.reason,
        replacementRefs: op.replacementRefs
      });
    }
    next.applied[op.id] = digest(op);
    next.revision++;
  }
  return next;
}
export function validateRegistry(registry: Registry, drafts: string[], rules: string[]): void {
  const groups = registry.records.filter((r) => r.kind === "group");
  const groupIds = new Set(groups.map((g) => g.id));
  const draftSet = new Set(drafts),
    ruleSet = new Set(rules),
    members = new Set<string>();
  for (const group of groups) {
    const ids = group.payload.memberDraftIds;
    if (!Array.isArray(ids) || !ids.length) throw new ArchitectureError("GROUP_MEMBERS");
    for (const id of ids) {
      if (typeof id !== "string" || !draftSet.has(id) || members.has(id))
        throw new ArchitectureError("GROUP_UNKNOWN_OR_DUPLICATE_MEMBER");
      members.add(id);
    }
  }
  const account = (kind: RegistryRecord["kind"], required: Set<string>) => {
    const seen = new Set<string>();
    for (const row of registry.records.filter((r) => r.kind === kind)) {
      const { inputId, disposition, targetId } = row.payload;
      if (
        typeof inputId !== "string" ||
        !required.has(inputId) ||
        seen.has(inputId) ||
        ![
          "assigned",
          "standalone",
          "identity-uncertain",
          "excluded-invalid",
          "unresolved",
          "aggregated"
        ].includes(String(disposition))
      )
        throw new ArchitectureError("DISPOSITION_INVALID");
      if (
        (disposition === "assigned" || disposition === "standalone") &&
        (typeof targetId !== "string" ||
          !groupIds.has(targetId) ||
          !groups.find((g) => g.id === targetId)?.payload.memberDraftIds ||
          !(groups.find((g) => g.id === targetId)?.payload.memberDraftIds as unknown[]).includes(
            inputId
          ))
      )
        throw new ArchitectureError("DISPOSITION_GROUP");
      if (
        disposition === "aggregated" &&
        !registry.records.some(
          (r) =>
            r.kind === "rule" &&
            r.id === targetId &&
            Array.isArray(r.payload.candidateRefs) &&
            r.payload.candidateRefs.includes(inputId)
        )
      )
        throw new ArchitectureError("DISPOSITION_RULE");
      if (kind === "draft-disposition" && disposition === "aggregated")
        throw new ArchitectureError("DRAFT_RULE_DISPOSITION");
      if (
        kind === "rule-disposition" &&
        (disposition === "assigned" ||
          disposition === "standalone" ||
          disposition === "identity-uncertain")
      )
        throw new ArchitectureError("RULE_GROUP_DISPOSITION");
      if (
        kind === "draft-disposition" &&
        members.has(inputId) &&
        disposition !== "assigned" &&
        disposition !== "standalone"
      )
        throw new ArchitectureError("GROUP_DISPOSITION_CONTRADICTION");
      if (
        (disposition === "excluded-invalid" ||
          disposition === "unresolved" ||
          disposition === "identity-uncertain") &&
        (typeof row.payload.reason !== "string" || !row.payload.reason.trim())
      )
        throw new ArchitectureError("DISPOSITION_REASON");
      seen.add(inputId);
    }
    if (seen.size !== required.size) throw new ArchitectureError("DISPOSITION_MISSING");
  };
  account("draft-disposition", draftSet);
  account("rule-disposition", ruleSet);
  for (const retired of registry.retired)
    if (
      retired.replacementRefs.some(
        (id) =>
          !registry.records.some((r) => r.id === id) && !registry.retired.some((r) => r.id === id)
      )
    )
      throw new ArchitectureError("RETIREMENT_UNKNOWN_REF");
}
