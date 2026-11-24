import { describe, expect, it } from "vitest";
import { semanticCoverage, repairTaskASchemaAlias } from "./semantic-coverage";
import { buildTaskBCalls } from "./ai-pipeline";
import { coverageFromObservations } from "./materialize";
import type { SourceRecord, SourceObservationRecord } from "./domain";

const sources = ["success", "unresolved"].map((sourceId) => ({
  sourceId,
  nativeItemId: sourceId,
  kind: "attachment",
  title: "Synthetic private title",
  parsed: {
    text: "Synthetic private text",
    structure: [],
    units: [{ locator: "p:1", text: "Synthetic" }]
  }
})) as unknown as SourceRecord[];
const observations = sources.map((source) => ({
  sourceId: source.sourceId,
  fetchStatus: "ok",
  parseStatus: "ok",
  understandingStatus: "partial"
})) as SourceObservationRecord[];
const coverage = () =>
  semanticCoverage({
    sources,
    observations,
    succeededSourceIds: ["success"],
    failedSources: [{ sourceId: "unresolved", errorCode: "AI_CONTRACT" }],
    mainWaves: null,
    recoveryWaves: 1,
    paidRecoveryInvocations: 1
  });

describe("DA-006 partial coverage and mechanical repair", () => {
  it("preserves missing-knowledge provenance without course prose or false Complete", () => {
    const result = coverage();
    expect(result.semanticCoverageRatio).toBe(0.5);
    expect(result.unresolved[0]).toMatchObject({
      status: "Unresolved / Partial",
      localParseExists: true,
      localCoverageExists: true,
      semanticResultAbsent: true,
      failureClass: "AI_CONTRACT"
    });
    expect(JSON.stringify(result)).not.toContain("Synthetic");
    expect(result.unresolved[0]?.provenance.locatorRefs).toHaveLength(1);
    expect(coverageFromObservations(observations, ["unresolved"]).partialCoverage).toBe(true);
  });
  it("rejects success identities outside the source inventory", () => {
    expect(() =>
      semanticCoverage({
        sources,
        observations,
        succeededSourceIds: ["unknown"],
        failedSources: [],
        mainWaves: null,
        recoveryWaves: 1,
        paidRecoveryInvocations: 1
      })
    ).toThrow("SOURCE_MISMATCH");
  });
  it("serializes unresolved coverage into Task B and guards missing knowledge", () => {
    const call = buildTaskBCalls({
      drafts: [],
      constraintCandidates: [],
      courseIndex: [],
      sharedWorkingContexts: [{ sourceId: "success" }],
      unresolvedCoverage: coverage()
    })[0];
    if (!call) throw new Error("TASK_B_CALL_REQUIRED");
    expect(
      (JSON.parse(call.user) as { unresolvedCoverage: { unresolved: unknown[] } })
        .unresolvedCoverage.unresolved
    ).toHaveLength(1);
    expect(call.system).toContain("Never infer absence");
  });
  it("only changes the exact schema alias and retains every semantic field", () => {
    const original = {
      schema: "syllab.ai/task-a/1",
      sourceId: "success",
      sourceResult: "NO_RELEVANT_INFORMATION",
      assessmentDrafts: [],
      courseWideConstraintCandidates: [],
      unresolvedIssues: [],
      additionalProvenance: { immutable: "synthetic" }
    };
    const repair = repairTaskASchemaAlias(original, "success");
    expect(repair?.result).toEqual({ ...original, schema: "syllab.ai.task-a/1" });
    expect(repair?.provenance.kind).toBe("deterministic_compat_repair");
    expect(original.schema).toBe("syllab.ai/task-a/1");
  });
  it("does not repair absent payload, other contract mismatches or unknown identifiers", () => {
    expect(repairTaskASchemaAlias(undefined, "success")).toBeNull();
    expect(
      repairTaskASchemaAlias({ schema: "syllab.ai/task-a/1", sourceId: "success" }, "success")
    ).toBeNull();
    expect(repairTaskASchemaAlias({ schema: "unexpected" }, "success")).toBeNull();
  });
});
