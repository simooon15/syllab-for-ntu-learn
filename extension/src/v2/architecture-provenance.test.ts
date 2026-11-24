import { describe, expect, it } from "vitest";
import { validateProvenance, scopeEvidenceIds } from "./architecture-provenance";
import { compareNativeSignals, type NativeSignal } from "./native-signal";
import type { SourceRecord } from "./schema";
import { emptyRegistry, applyOperations, validateRegistry } from "./progressive-registry";

const source = (id: string): SourceRecord => ({
  sourceId: id,
  nativeItemId: id,
  courseId: "c",
  kind: "announcement",
  title: "Synthetic",
  updatedAt: "now",
  parsed: {
    text: "Exact native statement",
    structure: ["body"],
    units: [{ locator: "body", text: "Exact native statement", partial: false }]
  }
});
const evidence = (sourceId = "s") => ({
  evidenceId: "request-local-e1",
  sourceId,
  locator: "body",
  excerpt: "Exact native statement"
});
const scope = { sources: [source("s"), source("other")], evidence: [], objects: {} };
describe("new-policy provenance qualification", () => {
  it("separates provider-local aliases across Sources while preserving exact support", () => {
    const first = scopeEvidenceIds({ evidence: [evidence()] }, "c", scope);
    const second = scopeEvidenceIds({ evidence: [evidence("other")] }, "c", scope);
    const refs = validateProvenance([first, second], scope);
    expect(refs).toHaveLength(2);
    expect(refs[0]?.evidenceId).not.toBe(refs[1]?.evidenceId);
    expect(refs.map((e) => e.excerpt)).toEqual([
      "Exact native statement",
      "Exact native statement"
    ]);
    expect(scopeEvidenceIds(first, "c", scope)).toEqual(first);
  });
  it("rejects guessed quotes, stale aliases and unknown native locators", () => {
    expect(() =>
      validateProvenance({ evidence: [{ ...evidence(), excerpt: "Invented fact" }] }, scope)
    ).toThrow("PROVENANCE_LITERAL");
    expect(() =>
      validateProvenance({ evidence: [{ ...evidence(), locator: "missing" }] }, scope)
    ).toThrow("PROVENANCE_LITERAL");
    expect(() =>
      validateProvenance(
        { evidence: [{ ...evidence(), excerpt: "native" }] },
        { ...scope, evidence: [evidence()] }
      )
    ).toThrow("PROVENANCE_ALIAS_COLLISION");
  });
  it("requires support or explicit uncertainty and never fills evidence locally", () => {
    expect(() =>
      validateProvenance({ fieldName: "weight", state: "KNOWN", value: 20, evidence: [] }, scope)
    ).toThrow("PROVENANCE_SUPPORT_MISSING");
    const uncertain = { fieldName: "weight", state: "UNCERTAIN", evidence: [] };
    expect(validateProvenance(uncertain, scope)).toEqual([]);
    expect(uncertain.evidence).toEqual([]);
    expect(() => validateProvenance({ ...uncertain, evidence: ["guessed-ref"] }, scope)).toThrow(
      "PROVENANCE_SUPPORT_SHAPE"
    );
  });
  it("accepts visual quotes only after the exact scoped native page was rendered", () => {
    const visual = { ...evidence(), locator: "image-page", excerpt: "Visual-only quote" };
    expect(() => validateProvenance(visual, scope)).toThrow("PROVENANCE_LITERAL");
    expect(validateProvenance(visual, { ...scope, rendered: new Set(["s:image-page"]) })).toEqual([
      visual
    ]);
    expect(() =>
      validateProvenance(
        { ...visual, sourceId: "outside" },
        { ...scope, rendered: new Set(["s:image-page"]) }
      )
    ).toThrow("PROVENANCE_LITERAL");
  });
});
describe("native change signals and Registry conservation", () => {
  const signal: NativeSignal = {
    courseId: "c",
    kind: "attachment",
    nativeId: "n",
    resourceIds: ["a", "b"],
    version: "v1",
    adapterVersion: "qualified-fixture/1",
    reliableForContent: true,
    completeResourceInventory: true
  };
  const machine = {
    sourceId: "s",
    canonicalMetadataHash: "m",
    contentHash: "h",
    structureHash: "st",
    representationVersion: 1
  };
  it("qualified native equality requires the complete resource inventory", () => {
    expect(
      compareNativeSignals(signal, { ...signal, resourceIds: ["b", "a"] }, machine, machine, true)
    ).toBe("unchanged");
    expect(
      compareNativeSignals(
        signal,
        { ...signal, resourceIds: ["a", "replacement"] },
        machine,
        machine,
        true
      )
    ).toBe("machine-different");
    expect(compareNativeSignals(signal, { ...signal, version: "v2" }, machine, machine, true)).toBe(
      "machine-different"
    );
    expect(
      compareNativeSignals(
        signal,
        { ...signal, reliableForContent: false },
        machine,
        { ...machine, contentHash: "changed" },
        true
      )
    ).toBe("machine-different");
  });
  it("does not reconnect a different native identity or cross-course tuple using equal hashes", () => {
    expect(
      compareNativeSignals(signal, { ...signal, nativeId: "replacement" }, machine, machine, true)
    ).toBe("new-source");
    expect(
      compareNativeSignals(signal, { ...signal, courseId: "other-course" }, machine, machine, true)
    ).toBe("incomparable");
    expect(compareNativeSignals(signal, signal, machine, machine, false)).toBe("incomparable");
  });
  it("missing modified/version never makes identity-only data a reliable unchanged proof", () => {
    const { version: _version, ...identityOnly } = signal;
    expect(
      compareNativeSignals(
        identityOnly,
        identityOnly,
        machine,
        { ...machine, contentHash: "changed" },
        true
      )
    ).toBe("machine-different");
  });
  it("cannot lose grouped Drafts through an unresolved disposition", () => {
    const registry = applyOperations(emptyRegistry(), [
      {
        id: "group",
        recordId: "g",
        expectedRevision: 0,
        kind: "put",
        record: { id: "g", revision: 1, kind: "group", payload: { memberDraftIds: ["d"] } }
      },
      {
        id: "disposition",
        recordId: "dd",
        expectedRevision: 0,
        kind: "put",
        record: {
          id: "dd",
          revision: 1,
          kind: "draft-disposition",
          payload: { inputId: "d", disposition: "unresolved", reason: "AI declared uncertainty" }
        }
      }
    ]);
    expect(() => validateRegistry(registry, ["d"], [])).toThrow("GROUP_DISPOSITION_CONTRADICTION");
  });
  it("requires each aggregated Rule candidate to appear in the referenced Rule upstream set", () => {
    const registry = applyOperations(emptyRegistry(), [
      {
        id: "rule",
        recordId: "r",
        expectedRevision: 0,
        kind: "put",
        record: { id: "r", revision: 1, kind: "rule", payload: { candidateRefs: ["other"] } }
      },
      {
        id: "rd",
        recordId: "rd",
        expectedRevision: 0,
        kind: "put",
        record: {
          id: "rd",
          revision: 1,
          kind: "rule-disposition",
          payload: { inputId: "input", disposition: "aggregated", targetId: "r" }
        }
      }
    ]);
    expect(() => validateRegistry(registry, [], ["input"])).toThrow("DISPOSITION_RULE");
  });
});

it("keeps Current Evidence IDs, snapshot hash and capture time when Source has a newer representation", async () => {
  const { materializeTaskC } = await import("./materialize");
  const { makeCourse } = await import("./testing");
  const current = {
    ...evidence(),
    evidenceId: "persistent-old",
    excerpt: "Old trusted quote",
    representationHash: "old-snapshot",
    origin: "native" as const,
    capturedAt: "2026-01-01T00:00:00.000Z"
  };
  const latestSource = source("s");
  if (latestSource.parsed) latestSource.parsed.contentHash = "new-snapshot";
  const materialized = materializeTaskC(
    {
      schema: "syllab.ai.task-c/1",
      changeResults: [
        {
          changeType: "CHANGED",
          targetObjectId: "a",
          currentEvidence: [current],
          newEvidence: [evidence()],
          judgmentBasis: "Synthetic change"
        }
      ],
      unresolvedIssues: []
    },
    {
      course: makeCourse({ courseId: "c" }),
      workflowId: "w",
      sourceRecords: [latestSource],
      sources: new Map([["s", { sourceId: "s", title: "Synthetic" }]]),
      exclusionKeys: new Set(),
      now: "2026-10-08T00:00:00.000Z",
      evidence: [current]
    },
    new Map([["a", "a"]]),
    {
      checkedSourceIds: ["s"],
      succeededSourceIds: ["s"],
      failedSourceIds: [],
      permissionDenied: false,
      partialCoverage: false,
      scopeComplete: true,
      missingAfterCoverageSourceIds: []
    }
  );
  expect(materialized.changes[0]?.currentEvidenceIds).toEqual(["persistent-old"]);
  expect(materialized.bundle.evidence?.find((e) => e.evidenceId === "persistent-old")).toEqual({
    ...current,
    courseId: "c"
  });
});
