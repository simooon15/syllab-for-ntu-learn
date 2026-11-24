import { describe, expect, it } from "vitest";
import type { SourceRecord } from "./domain";
import {
  contentIndex,
  expandRef,
  PLANNER_SCHEMA,
  plannerCall,
  type PlannerResult,
  restorePlannerProgress
} from "./retrieval-planner";
import {
  AUDIT_SCHEMA,
  coverageAuditInput,
  validateCoverageAudit,
  coverageAuditCall,
  auditProof
} from "./coverage-audit";
import { planRetrievalWithAudit } from "./retrieval-completion";
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("Missing fixture");
  return value;
}
function fixture() {
  const source: SourceRecord = {
    sourceId: "a",
    courseId: "c",
    nativeItemId: "a",
    kind: "attachment",
    title: "Ordinary deck",
    updatedAt: "now",
    parsed: {
      text: "",
      structure: [],
      units: [1, 2, 3, 4].map((n) => ({
        locator: `page:${String(n)}`,
        text: `native body ${String(n)}`,
        partial: true,
        visualGaps: ["image"]
      }))
    }
  };
  const index = contentIndex([source]);
  const refs = index.units.map((row) => row[0]);
  const expanded = [expandRef(index, [source], required(refs[0]))];
  const proposal: PlannerResult = {
    schema: PLANNER_SCHEMA,
    status: "COMPLETE",
    requestRefs: [],
    selectedEvidenceRefs: [required(refs[0])],
    removedSelectedRefs: [],
    visualRequestRefs: [],
    uncertainRefs: []
  };
  const input = coverageAuditInput(index, expanded, proposal);
  const complete = {
    schema: AUDIT_SCHEMA,
    status: "COVERAGE_COMPLETE",
    requestRefs: [],
    coveredWithoutExpansion: [
      { refs: input.unreadRefs, reason: "Index indicates no additional course-management evidence" }
    ],
    uncertainRefs: []
  };
  return { source, index, refs, expanded, proposal, input, complete };
}
describe("Independent coverage accounting", () => {
  it("includes every unread native unit and never acquired bodies", () => {
    const f = fixture();
    expect(f.input.unreadRefs).toEqual(f.refs.slice(1));
    expect(JSON.stringify(f.input)).not.toContain("native body 1");
    const accepted = validateCoverageAudit(f.complete, f.input);
    expect(auditProof(f.input, accepted).unreadFingerprint).toBe(
      auditProof(f.input, accepted).coveredFingerprint
    );
  });
  it("rejects forged unread input before the provider call", () => {
    const f = fixture();
    expect(() =>
      coverageAuditCall({ ...f.input, unreadRefs: f.input.unreadRefs.slice(1) }, "test")
    ).toThrow("INPUT_UNREAD_ACCOUNTING");
  });
  it("rejects missing coverage in COMPLETE and MORE_EVIDENCE without filling holes", () => {
    const f = fixture();
    for (const status of ["COVERAGE_COMPLETE", "MORE_EVIDENCE"]) {
      expect(() =>
        validateCoverageAudit(
          {
            ...f.complete,
            status,
            requestRefs: status === "MORE_EVIDENCE" ? [f.refs[1]] : [],
            coveredWithoutExpansion: []
          },
          f.input
        )
      ).toThrow("COVERAGE_HOLE");
    }
  });
  it("validates inclusive native-order ranges and detects crossing read/request holes", () => {
    const f = fixture();
    const range = {
      sourceRef: required(f.index.sources[0]).ref,
      fromRef: f.refs[1],
      toRef: f.refs[3]
    };
    expect(
      validateCoverageAudit(
        { ...f.complete, coveredWithoutExpansion: [{ range, reason: "Teaching continuity" }] },
        f.input
      ).coveredRefs
    ).toEqual(f.refs.slice(1));
    expect(() =>
      validateCoverageAudit(
        {
          ...f.complete,
          coveredWithoutExpansion: [{ range: { ...range, fromRef: f.refs[0] }, reason: "x" }]
        },
        f.input
      )
    ).toThrow("COVERED_NOT_UNREAD");
    expect(() =>
      validateCoverageAudit(
        {
          ...f.complete,
          status: "MORE_EVIDENCE",
          requestRefs: [f.refs[2]],
          coveredWithoutExpansion: [{ range, reason: "x" }]
        },
        f.input
      )
    ).toThrow("REQUEST_COVERED_OVERLAP");
    expect(() =>
      validateCoverageAudit(
        {
          ...f.complete,
          coveredWithoutExpansion: [{ range: { ...range, toRef: f.refs[0] }, reason: "x" }]
        },
        f.input
      )
    ).toThrow("RANGE_OR_EXACT_REFS");
  });
  it("rejects unknown refs, duplicates and uncertainty covered without acquisition", () => {
    const f = fixture();
    expect(() =>
      validateCoverageAudit({ ...f.complete, requestRefs: ["unknown"] }, f.input)
    ).toThrow("UNREAD_REFS");
    expect(() =>
      validateCoverageAudit(
        {
          ...f.complete,
          coveredWithoutExpansion: [
            ...f.complete.coveredWithoutExpansion,
            ...f.complete.coveredWithoutExpansion
          ]
        },
        f.input
      )
    ).toThrow("DUPLICATE_COVERAGE");
    expect(() =>
      validateCoverageAudit({ ...f.complete, uncertainRefs: [f.refs[1]] }, f.input)
    ).toThrow("UNCERTAIN_MUST_REQUEST");
    expect(() =>
      validateCoverageAudit(f.complete, { ...f.input, uncertainRefs: [required(f.refs[1])] })
    ).toThrow("UNCERTAIN_MUST_REQUEST");
  });
  it("never accepts Primary COMPLETE until independent audit succeeds", async () => {
    const f = fixture();
    let primaryCalls = 0,
      audits = 0;
    const requests: string[][] = [];
    const result = await planRetrievalWithAudit({
      index: f.index,
      inventory: [f.source],
      expanded: f.expanded,
      initialProposal: f.proposal,
      key: "probe",
      execute: async (call) => {
        await Promise.resolve();
        primaryCalls++;
        const request = JSON.parse(call.user) as {
          expanded: unknown[];
          previousSelectedEvidenceRefs: string[];
        };
        expect(request.previousSelectedEvidenceRefs).toEqual(f.proposal.selectedEvidenceRefs);
        expect(request.expanded).toHaveLength(2);
        return { call, value: { ...f.proposal, selectedEvidenceRefs: [f.refs[0], f.refs[1]] } };
      },
      executeAudit: async (call) => {
        await Promise.resolve();
        const input = JSON.parse(call.user) as typeof f.input;
        audits++;
        expect(JSON.stringify(input)).not.toContain("native body 1");
        requests.push(input.unreadRefs);
        return {
          call,
          value:
            audits === 1
              ? {
                  ...f.complete,
                  status: "MORE_EVIDENCE",
                  requestRefs: [f.refs[1]],
                  coveredWithoutExpansion: [{ refs: f.refs.slice(2), reason: "Index sufficient" }]
                }
              : {
                  ...f.complete,
                  coveredWithoutExpansion: [{ refs: input.unreadRefs, reason: "Index sufficient" }]
                }
        };
      }
    });
    expect(primaryCalls).toBe(1);
    expect(audits).toBe(2);
    expect(requests[1]).toEqual(f.refs.slice(2));
    expect(result.expanded).toHaveLength(2);
    expect(result.result.selectedEvidenceRefs).toContain(f.refs[1]);
  });
  it("restores same-workflow audit acquisitions and requires a new Primary update", () => {
    const f = fixture();
    const empty = { ...f.proposal, selectedEvidenceRefs: [] };
    const primary = plannerCall(f.index, [], "planner:wf");
    const context = coverageAuditInput(f.index, [], empty);
    const audit = coverageAuditCall(context, "planner:wf");
    const runs = [
      {
        aiRunId: "primary",
        workflowId: "wf",
        courseId: "c",
        task: "retrieval-planner" as const,
        status: "succeeded" as const,
        schemaVersion: primary.schemaVersion,
        promptVersion: primary.promptVersion,
        idempotencyKey: primary.idempotencyKey,
        attempt: 1,
        recordedAt: "2026-10-05T00:00:00Z",
        payload: empty
      },
      {
        aiRunId: "audit",
        workflowId: "wf",
        courseId: "c",
        task: "coverage-audit" as const,
        status: "succeeded" as const,
        schemaVersion: AUDIT_SCHEMA,
        promptVersion: audit.promptVersion,
        idempotencyKey: audit.idempotencyKey,
        attempt: 1,
        recordedAt: "2026-10-05T00:01:00Z",
        payload: {
          ...f.complete,
          status: "MORE_EVIDENCE",
          requestRefs: [f.refs[0]],
          coveredWithoutExpansion: [{ refs: f.refs.slice(1), reason: "Index sufficient" }]
        }
      }
    ];
    const restored = restorePlannerProgress(f.index, [f.source], "wf", runs);
    expect(restored.expanded.map((row) => row.ref)).toEqual([f.refs[0]]);
    expect(restored.result?.status).toBe("CONTINUE");
    expect(restorePlannerProgress(f.index, [f.source], "other", runs).expanded).toEqual([]);
    expect(restorePlannerProgress(f.index, [f.source], "wf", runs.slice(1)).expanded).toEqual([]);
  });
});
