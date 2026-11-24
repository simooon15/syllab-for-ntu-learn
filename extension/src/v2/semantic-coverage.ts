import { canonicalEnvelope } from "./contract-registry";
import type { SourceRecord, SourceObservationRecord } from "./domain";
import { stableDigest } from "./chunking";
import { stableStringify } from "./crypto";
import { validateTaskA, TASK_A_SCHEMA, type TaskAResult } from "./ai-contracts";

export interface UnresolvedSemanticSource {
  sourceRef: string;
  fingerprint: string;
  status: "Unresolved / Partial";
  failureClass: string;
  stage: "task-a";
  localParseExists: boolean;
  localCoverageExists: boolean;
  semanticResultAbsent: true;
  provenance: { kind: string; parentRef?: string; nativeItemRef: string; locatorRefs: string[] };
}
export interface TaskASemanticCoverage {
  policy: "bounded_partial_da006_v1";
  eligible: number;
  successful: number;
  zeroCostRepaired: number;
  mainWaves: number | null;
  recoveryWaves: number;
  paidRecoveryInvocations: number;
  semanticCoverageRatio: number;
  unresolved: UnresolvedSemanticSource[];
}

/** Coverage describes missing knowledge; it never infers absent product facts. */
export function semanticCoverage(input: {
  sources: SourceRecord[];
  observations: SourceObservationRecord[];
  succeededSourceIds: string[];
  failedSources: Array<{ sourceId: string; errorCode: string }>;
  mainWaves: number | null;
  recoveryWaves: number;
  paidRecoveryInvocations: number;
  zeroCostRepaired?: number;
}): TaskASemanticCoverage {
  const success = new Set(input.succeededSourceIds);
  const ids = new Set(input.sources.map((source) => source.sourceId));
  if (success.size !== input.succeededSourceIds.length || [...success].some((id) => !ids.has(id)))
    throw new Error("SEMANTIC_COVERAGE_SOURCE_MISMATCH");
  const unresolved = input.sources
    .filter((source) => !success.has(source.sourceId))
    .map((source) => {
      const observation = input.observations.find((o) => o.sourceId === source.sourceId);
      return {
        sourceRef: "s:" + stableDigest(source.sourceId),
        fingerprint: stableDigest(
          stableStringify({
            identity: source.sourceId,
            contentHash: source.parsed?.contentHash,
            machine: source.machine?.contentHash
          })
        ),
        status: "Unresolved / Partial" as const,
        failureClass:
          input.failedSources.find((f) => f.sourceId === source.sourceId)?.errorCode ??
          "RESULT_ABSENT",
        stage: "task-a" as const,
        localParseExists: source.parsed !== undefined,
        localCoverageExists:
          observation?.fetchStatus === "ok" &&
          (observation.parseStatus === "ok" || observation.parseStatus === "partial"),
        semanticResultAbsent: true as const,
        provenance: {
          kind: source.kind,
          nativeItemRef: stableDigest(source.nativeItemId),
          ...(source.parentSourceId
            ? { parentRef: "s:" + stableDigest(source.parentSourceId) }
            : {}),
          locatorRefs: (source.parsed?.units ?? []).map((u) => stableDigest(u.locator))
        }
      };
    });
  return {
    policy: "bounded_partial_da006_v1",
    eligible: ids.size,
    successful: success.size,
    zeroCostRepaired: input.zeroCostRepaired ?? 0,
    mainWaves: input.mainWaves,
    recoveryWaves: input.recoveryWaves,
    paidRecoveryInvocations: input.paidRecoveryInvocations,
    semanticCoverageRatio: ids.size ? success.size / ids.size : 1,
    unresolved
  };
}

/** Only the authorized exact schema alias may change; all semantic fields remain identical. */
export function repairTaskASchemaAlias(
  payload: unknown,
  sourceId: string
): {
  result: TaskAResult;
  provenance: {
    kind: "deterministic_compat_repair";
    originalFingerprint: string;
    repairedFingerprint: string;
  };
} | null {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return null;
  const original = payload as Record<string, unknown>;
  const normalized = canonicalEnvelope(original, TASK_A_SCHEMA);
  if (!normalized.repair) return null;
  const repaired = normalized.value as Record<string, unknown>;
  try {
    validateTaskA(repaired, new Set([sourceId]));
    const result = repaired as unknown as TaskAResult;
    return {
      result,
      provenance: {
        kind: "deterministic_compat_repair",
        originalFingerprint: stableDigest(stableStringify(original)),
        repairedFingerprint: stableDigest(stableStringify(repaired))
      }
    };
  } catch {
    return null;
  }
}
