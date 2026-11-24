import { materializeTaskB } from "./materialize";
import { describe, it, expect } from "vitest";
import {
  prepareDirectCourse,
  validateDirectCourse,
  materializeDirectCourse,
  DIRECT_COURSE_SCHEMA
} from "./direct-course";
import { TASK_B_SCHEMA, TASK_C_SCHEMA } from "./ai-contracts";
import type { SourceRecord } from "./schema";
const source: SourceRecord = {
  sourceId: "s",
  courseId: "c",
  nativeItemId: "n",
  title: "Synthetic material",
  kind: "attachment",
  updatedAt: "now",
  parsed: {
    text: "cover\nFinal paragraph",
    structure: [],
    units: [
      { locator: "page:1", text: "cover", partial: false },
      { locator: "page:2", text: "Final paragraph", partial: true }
    ]
  }
};
const input = { course: { courseCode: "TEST", courseName: "Synthetic" }, sources: [source] };
function first<T>(items: T[]): T {
  const item = items[0];
  if (item === undefined) throw Error("synthetic fixture missing");
  return item;
}
function result() {
  return {
    schema: DIRECT_COURSE_SCHEMA,
    snapshot: prepareDirectCourse(input, "i").snapshot,
    coverage: [
      {
        sourceId: "s",
        examinedNativeLocators: ["page:1", "page:2"],
        unresolvedNativeLocators: [],
        limitations: ["Unrendered visual content"]
      }
    ],
    output: {
      schema: TASK_B_SCHEMA,
      identityResolutions: [],
      canonicalAssessmentProposals: [],
      courseWideConstraintProposals: [],
      fieldConsolidationResults: [],
      structuralRelationships: [],
      unresolvedIssues: []
    }
  };
}
describe("direct course candidate preparation and trust boundaries", () => {
  it("blocks invalid competing-value baselines before any incremental request is prepared", () => {
    const i = {
      ...input,
      incrementalSnapshot: {
        objects: [
          { objectId: "user-choice", fact: { state: "KNOWN", value: 40, competingValues: [50] } }
        ],
        coverageSufficient: false
      }
    };
    expect(() => prepareDirectCourse(i, "invalid-baseline")).toThrow("change_conflict_state");
    first(i.incrementalSnapshot.objects).fact.state = "UNCERTAIN";
    expect(() => prepareDirectCourse(i, "valid-baseline")).not.toThrow();
  });
  it("requires source-scoped incremental targets and forbids removal under partial coverage", () => {
    const incrementalInput = {
      ...input,
      incrementalSnapshot: {
        objects: [
          {
            objectId: "user-choice",
            createdBy: "user",
            facts: [
              {
                factId: "user-fact",
                field: "weight",
                value: { state: "KNOWN", value: "User value" }
              }
            ]
          }
        ],
        coverageSufficient: false
      }
    };
    const v = {
      ...result(),
      snapshot: prepareDirectCourse(incrementalInput, "incremental").snapshot,
      incremental: {
        schema: TASK_C_SCHEMA,
        changeResults: [
          {
            changeType: "CONFLICT",
            targetObjectId: "user-choice",
            affectedFieldOrRequirement: "weight",
            currentEvidence: [],
            newEvidence: [],
            judgmentBasis: "User choice retained pending Review",
            currentValue: { state: "KNOWN", value: "User value" },
            latestValue: { state: "UNCERTAIN", competingValues: ["A", "B"] }
          }
        ],
        unresolvedIssues: []
      }
    };
    expect(
      validateDirectCourse(v, incrementalInput).incremental?.changeResults[0]?.currentValue?.value
    ).toBe("User value");
    first(v.incremental.changeResults).currentValue.value = "Invented current value";
    expect(() => validateDirectCourse(v, incrementalInput)).toThrow(
      "INCREMENTAL_CURRENT_VALUE_MISMATCH"
    );
    first(v.incremental.changeResults).currentValue.value = "User value";
    first(v.incremental.changeResults).changeType = "POSSIBLY_REMOVED";
    expect(() => validateDirectCourse(v, incrementalInput)).toThrow("removal_without_coverage");
    first(v.incremental.changeResults).changeType = "CONFLICT";
    first(v.incremental.changeResults).targetObjectId = "unprovided";
    expect(() => validateDirectCourse(v, incrementalInput)).toThrow("INCREMENTAL_TARGET");
  });
  it("cannot promote a source subset capture into a final course candidate", () => {
    const captureInput = { ...input, sourceCapture: true };
    const capture = result();
    capture.snapshot = prepareDirectCourse(captureInput, "capture").snapshot;
    expect(validateDirectCourse(capture, captureInput).coverage).toHaveLength(1);
    expect(() =>
      materializeDirectCourse(
        capture,
        captureInput,
        {} as Parameters<typeof materializeDirectCourse>[2]
      )
    ).toThrow("SOURCE_CAPTURE_NOT_FINAL");
    expect(() => validateDirectCourse(capture, input)).toThrow("SNAPSHOT");
  });
  it("keeps explicit parents and maps identity evidence onto isolated Review object IDs", () => {
    const v = result();
    const quote = { evidenceId: "e", sourceId: "s", locator: "page:2", excerpt: "Final paragraph" };
    const proposal = (id: string, role: string, parent?: string) => ({
      proposalId: id,
      canonicalName: id,
      type: "assignment",
      role,
      aliases: [],
      consolidatedFields: [],
      requirements: [],
      supportingEvidence: [quote],
      unresolvedIssues: [],
      ...(parent ? { componentOfProposalId: parent } : {})
    });
    Object.assign(v.output, {
      canonicalAssessmentProposals: [
        proposal("parent", "assessment"),
        proposal("child", "component", "parent")
      ],
      identityResolutions: [
        {
          involvedObjectIds: ["parent", "child"],
          relationship: "DIFFERENT_ASSESSMENT",
          supportingEvidence: [quote],
          contradictoryEvidence: [],
          judgmentBasis: "Synthetic relationship"
        }
      ]
    });
    const m = materializeDirectCourse(v, input, {
      course: {
        courseId: "c",
        semesterId: "synthetic",
        courseCode: "TEST",
        courseName: "Synthetic",
        curriculum: false,
        established: false,
        currentRevision: 0,
        consecutiveCheckFailures: 0,
        updatedAt: "now"
      },
      workflowId: "isolated",
      sources: new Map(),
      exclusionKeys: new Set(),
      now: "now"
    });
    expect(m.assessments[1]?.parentAssessmentId).toBe(m.assessments[0]?.assessmentId);
    expect(m.identities[0]?.involvedObjectIds).toEqual(m.assessments.map((a) => a.assessmentId));
    expect(m.identities[0]?.supportingEvidence).toEqual([quote]);
    Object.assign(v.output, {
      canonicalAssessmentProposals: [proposal("child", "component", "missing")]
    });
    expect(() => validateDirectCourse(v, input)).toThrow("PARENT_REFERENCE");
  });
  it("rejects ignored structural channels and accidental cross-course inputs", () => {
    const v = result();
    Object.assign(v.output, {
      structuralRelationships: [{ description: "would otherwise disappear" }]
    });
    expect(() => validateDirectCourse(v, input)).toThrow("UNSUPPORTED_STRUCTURE");
    expect(() =>
      prepareDirectCourse(
        { ...input, sources: [source, { ...source, sourceId: "other", courseId: "other" }] },
        "id"
      )
    ).toThrow("MIXED_COURSES");
  });
  it("delivers all native units, preserving Partial without first-page filtering", () => {
    const d = JSON.parse(prepareDirectCourse(input, "i").call.user) as {
      sources: Array<{
        nativeContent: Array<{
          locator: string;
          passages: Array<{ text: string }>;
          partial: boolean;
        }>;
      }>;
    };
    expect(
      first(d.sources).nativeContent.map(
        (u: { locator: string; passages: Array<{ text: string }>; partial: boolean }) => ({
          locator: u.locator,
          text: u.passages.map((p) => p.text).join("\n"),
          partial: u.partial
        })
      )
    ).toEqual(source.parsed?.units);
    expect(first(d.sources).nativeContent).toHaveLength(2);
  });
  it("rejects stale snapshots and missing or duplicate coverage", () => {
    const v = result();
    v.snapshot = "stale";
    expect(() => validateDirectCourse(v, input)).toThrow("STALE_SNAPSHOT");
    const missing = result();
    first(missing.coverage).examinedNativeLocators.pop();
    expect(() => validateDirectCourse(missing, input)).toThrow("COVERAGE_MISSING");
    const dup = result();
    first(dup.coverage).examinedNativeLocators.push("page:1");
    expect(() => validateDirectCourse(dup, input)).toThrow("COVERAGE_LOCATORS");
  });
  it("accepts examined-native claims without calling that semantic acceptance", () => {
    expect(validateDirectCourse(result(), input).output.canonicalAssessmentProposals).toEqual([]);
  });
  it("requires Partial limitations and rejects unavailable content marked examined", () => {
    const v = result();
    first(v.coverage).limitations = [];
    expect(() => validateDirectCourse(v, input)).toThrow("PARTIAL_LIMITATIONS_MISSING");
    const unavailableSource = { ...source };
    delete unavailableSource.parsed;
    const unavailable = { ...input, sources: [unavailableSource] };
    const v2 = result();
    v2.snapshot = prepareDirectCourse(unavailable, "i").snapshot;
    first(v2.coverage).examinedNativeLocators = ["native-text"];
    expect(() => validateDirectCourse(v2, unavailable)).toThrow("UNAVAILABLE_EXAMINED");
  });
  it("rejects invented quotation instead of accepting schema-only valid output", () => {
    const v: ReturnType<typeof result> & { output: unknown } = result();
    Object.assign(v.output as object, {
      unresolvedIssues: [
        {
          description: "uncertainty",
          evidence: [
            { evidenceId: "e", sourceId: "s", locator: "page:2", excerpt: "Invented quote" }
          ]
        }
      ]
    });
    expect(() => validateDirectCourse(v, input)).toThrow("PROVENANCE_LITERAL");
  });
  it("rejects automatic adoption directives and unsupported rules", () => {
    const v = result();
    Object.assign(v.output, { autoApply: true });
    expect(() => validateDirectCourse(v, input)).toThrow("forbidden_key");
    const rule = result();
    Object.assign(rule.output, {
      courseWideConstraintProposals: [
        {
          proposalId: "r",
          normalizedRuleContent: "Synthetic rule",
          supportingEvidence: [],
          unresolvedIssues: []
        }
      ]
    });
    expect(() => validateDirectCourse(rule, input)).toThrow("RULE_SHAPE");
  });
  it("preserves optional wording through strict isolated Review materialization", () => {
    const v = result();
    const quote = { evidenceId: "e", sourceId: "s", locator: "page:2", excerpt: "Final paragraph" };
    Object.assign(v.output, {
      canonicalAssessmentProposals: [
        {
          proposalId: "p",
          canonicalName: "Synthetic task",
          type: "assignment",
          role: "assessment",
          aliases: [],
          consolidatedFields: [],
          requirements: [
            { requirementId: "r", content: "Optional synthetic permission", evidence: [quote] }
          ],
          supportingEvidence: [quote],
          unresolvedIssues: []
        }
      ]
    });
    const parsed = validateDirectCourse(v, input);
    const m = materializeTaskB(
      parsed.output,
      {
        strictOutput: true,
        course: {
          courseId: "c",
          semesterId: "synthetic",
          courseCode: "TEST",
          courseName: "Synthetic",
          curriculum: false,
          established: false,
          currentRevision: 0,
          consecutiveCheckFailures: 0,
          updatedAt: "now"
        },
        workflowId: "isolated",
        sources: new Map([["s", { sourceId: "s", title: "Synthetic" }]]),
        sourceRecords: [source],
        exclusionKeys: new Set(),
        now: "now"
      },
      new Map(),
      new Set()
    );
    expect(m.assessments).toHaveLength(1);
    expect(JSON.stringify(m.bundle.facts)).toContain("Optional synthetic permission");
    expect(m.bundle.evidence?.every((e) => e.sourceId === "s")).toBe(true);
  });
  it("rejects ambiguous locator identity before preparing any provider call", () => {
    expect(() => prepareDirectCourse({ ...input, sources: [source, source] }, "i")).toThrow(
      "DUPLICATE_SOURCE"
    );
    const parsed = source.parsed;
    if (!parsed) throw Error("synthetic parsed missing");
    const unit = first(parsed.units ?? []);
    const bad = {
      ...source,
      parsed: { ...parsed, units: [unit, unit] }
    };
    expect(() => prepareDirectCourse({ ...input, sources: [bad] }, "i")).toThrow(
      "DUPLICATE_LOCATOR"
    );
  });
});

// Parser geometry is not native prose; keep text/table structure and explicit visual gaps.
it("packs complete native content without repeating geometry or machine-local image paths", () => {
  const original: SourceRecord = structuredClone(source);
  const units = original.parsed?.units;
  if (!units) throw Error("SYNTHETIC_UNITS_MISSING");
  units[0] = {
    locator: "page:1",
    text: "cover",
    partial: true,
    kind: "table",
    section: "Synthetic",
    cells: [{ reference: "A1", value: "cover", formula: "=A2" }],
    mergedRanges: ["A1:B1"],
    visualGaps: ["unrendered-diagram"],
    embeddedImagePaths: ["private-local-path"],
    textRanges: [{ start: 0, end: 5, x: 1, y: 2, width: 3, height: 4 }]
  };
  const before = structuredClone(original);
  const delivered = JSON.parse(
    prepareDirectCourse({ ...input, sources: [original] }, "synthetic").call.user
  ) as { sources: Array<{ nativeContent: unknown[]; index: Record<string, unknown> }> };
  expect(first(first(delivered.sources).nativeContent)).toEqual({
    locator: "page:1",
    passages: [{ refId: "n1.1.1", text: "cover" }],
    partial: true,
    kind: "table",
    section: "Synthetic",
    cells: [{ reference: "A1", value: "cover", formula: "=A2" }],
    mergedRanges: ["A1:B1"],
    visualGaps: ["unrendered-diagram"]
  });
  expect(first(delivered.sources).index).not.toHaveProperty("units");
  expect(original).toEqual(before);
});

it("expands explicit Source refs/ALL without inventing coverage or support", () => {
  const v = result();
  Object.assign(v.coverage[0] ?? {}, { sourceRef: "s1", examinedNativeLocators: "ALL" });
  expect(validateDirectCourse(v, input).coverage[0]?.examinedNativeLocators).toEqual([
    "page:1",
    "page:2"
  ]);
  Object.assign(v.coverage[0] ?? {}, { sourceRef: "s999" });
  expect(() => validateDirectCourse(v, input)).toThrow("COVERAGE_SOURCE");
});

it("never counts empty native text examined in available-only declaration", () => {
  const s: SourceRecord = {
    ...source,
    parsed: { text: "", structure: [], units: [{ locator: "blank", text: "", partial: true }] }
  };
  const i = { ...input, sources: [s] };
  const v = result();
  v.snapshot = prepareDirectCourse(i, "synthetic").snapshot;
  Object.assign(v.coverage[0] ?? {}, {
    sourceRef: "s1",
    examinedNativeLocators: "ALL_AVAILABLE_NATIVE"
  });
  expect(validateDirectCourse(v, i).coverage[0]?.examinedNativeLocators).toEqual([]);
  expect(validateDirectCourse(v, i).coverage[0]?.unresolvedNativeLocators[0]?.locator).toBe(
    "blank"
  );
  Object.assign(v.coverage[0] ?? {}, { unresolvedNativeLocators: ["blank"] });
  expect(validateDirectCourse(v, i).coverage[0]?.examinedNativeLocators).toEqual([]);
  Object.assign(v.coverage[0] ?? {}, { unresolvedNativeLocators: ["not-a-native-locator"] });
  expect(() => validateDirectCourse(v, i)).toThrow("COVERAGE_LOCATORS");
  Object.assign(v.coverage[0] ?? {}, { unresolvedNativeLocators: [] });
  Object.assign(v.coverage[0] ?? {}, { examinedNativeLocators: "ALL" });
  expect(() => validateDirectCourse(v, i)).toThrow("UNAVAILABLE_EXAMINED");
});

it("preserves explicit unresolved text when expanding available-only coverage", () => {
  const v = result();
  Object.assign(v.coverage[0] ?? {}, {
    sourceRef: "s1",
    examinedNativeLocators: "ALL_AVAILABLE_NATIVE",
    unresolvedNativeLocators: [{ locator: "page:2", reason: "Not understood" }]
  });
  const coverage = validateDirectCourse(v, input).coverage[0];
  expect(coverage?.examinedNativeLocators).toEqual(["page:1"]);
  expect(coverage?.unresolvedNativeLocators).toEqual([
    { locator: "page:2", reason: "Not understood" }
  ]);
  Object.assign(v.coverage[0] ?? {}, {
    unresolvedNativeLocators: [{ locator: "unknown", reason: "Not understood" }]
  });
  expect(() => validateDirectCourse(v, input)).toThrow("COVERAGE_LOCATORS");
});

it("resolves explicit clause wire content before auditing pointers, while rejecting nonexistent output references", () => {
  const i = {
    ...input,
    losslessClaimEncoding: true,
    claimAudit: [
      {
        claimId: "c1",
        kind: "requirement" as const,
        content: "Final paragraph",
        evidence: ["n1.2.1"]
      }
    ]
  };
  const v = {
    ...result(),
    snapshot: prepareDirectCourse(i, "wire").snapshot,
    evidenceEncoding: "native-ref/1",
    contentEncoding: "upstream-claim/1",
    claimDispositions: [
      {
        claimId: "c1",
        disposition: "PRESERVED",
        reason: "Exact selected clause",
        evidence: ["n1.2.1"],
        outputRefs: ["/output/canonicalAssessmentProposals/0/requirements/0/content"]
      }
    ]
  };
  Object.assign(v.output, {
    canonicalAssessmentProposals: [
      {
        proposalId: "p",
        canonicalName: "Synthetic",
        type: "assignment",
        role: "assessment",
        aliases: [],
        consolidatedFields: [],
        requirements: [{ requirementId: "r", contentRef: "c1", evidence: ["n1.2.1"] }],
        supportingEvidence: ["n1.2.1"],
        unresolvedIssues: []
      }
    ]
  });
  expect(JSON.stringify(validateDirectCourse(v, i).output)).toContain(
    '"content":"Final paragraph"'
  );
  const row = v.claimDispositions[0];
  if (!row) throw Error("fixture");
  row.outputRefs = ["/output/canonicalAssessmentProposals/0/requirements/20"];
  expect(() => validateDirectCourse(v, i)).toThrow("CLAIM_AUDIT_REFERENCE");
});

it("compares an immutable validated B candidate without regenerating B or claiming new coverage", () => {
  const preceding = validateDirectCourse(result(), input);
  const i = {
    ...input,
    comparisonOnly: true,
    candidateUnderReview: preceding,
    incrementalSnapshot: {
      objects: [
        {
          objectId: "user-object",
          facts: [
            {
              factId: "user-fact",
              field: "weight",
              userEdited: true,
              value: { state: "KNOWN", value: "41%", competingValues: [] }
            }
          ]
        }
      ],
      coverageSufficient: false
    }
  };
  const prepared = prepareDirectCourse(i, "thin-c");
  expect(prepared.call.task).toBe("task-c");
  const v = {
    schema: DIRECT_COURSE_SCHEMA,
    snapshot: prepared.snapshot,
    evidenceEncoding: "native-ref/1",
    incremental: {
      schema: TASK_C_SCHEMA,
      changeResults: [
        {
          changeType: "NO_MEANINGFUL_CHANGE",
          targetObjectId: "user-object",
          currentEvidence: [],
          newEvidence: [],
          judgmentBasis: "Current source unchanged; preserve explicit user choice"
        }
      ],
      unresolvedIssues: []
    }
  };
  const parsed = validateDirectCourse(v, i);
  expect(parsed.output).toEqual(preceding.output);
  expect(parsed.coverage).toEqual(preceding.coverage);
  expect(parsed.incremental?.changeResults).toHaveLength(1);
  expect(() => validateDirectCourse({ ...v, output: result().output }, i)).toThrow(
    "COMPARISON_SHAPE"
  );
  expect(v).not.toHaveProperty("output");
});
