import { CONTRACT_VERSION, MODEL_NAME, MODEL_PROVIDER } from "@syllab/contracts";
import { describe, expect, it, vi } from "vitest";

import type { NormalizedBatch, NormalizedUnit } from "../normalize/domain";
import { extractCandidateBatches, mergeCandidateRecords } from "./client";
import type { AiBackendTransport, CandidateRecord, InstallationCredentials } from "./domain";

function unit(sourceId: string, text: string): NormalizedUnit {
  return {
    unitId: `${sourceId}:page:1`,
    courseId: "course_1",
    scanId: "scan_1",
    sourceId,
    sourceType: "attachment",
    title: "Guide",
    path: ["Course content"],
    locator: "page:1",
    text,
    contentHash: "a".repeat(64)
  };
}

function batch(id: string, sourceId: string, text: string): NormalizedBatch {
  return { batchId: id, sourceId, units: [unit(sourceId, text)], characterCount: text.length };
}

function candidate(
  id: string,
  kind: CandidateRecord["kind"],
  proposedValue: Record<string, unknown>,
  status: CandidateRecord["status"] = "Detected"
): CandidateRecord {
  return {
    candidateId: id,
    courseId: "course_1",
    scanId: "scan_1",
    kind,
    proposedValue,
    status,
    semanticKey: `legacy:${id}`,
    evidenceRefs: [{ sourceId: `source_${id}`, locator: "page:1" }],
    createdAt: "2026-09-16T00:00:00.000Z",
    providerResponse: { provider: MODEL_PROVIDER, model: MODEL_NAME, requestId: `req_${id}` }
  };
}

describe("extension AI client", () => {
  it("registers anonymously once and sends only normalized minimum fields", async () => {
    let saved: InstallationCredentials | null = null;
    const register = vi.fn(() => Promise.resolve("installation-token"));
    const extract = vi.fn<AiBackendTransport["extract"]>((_token, request) =>
      Promise.resolve({
        contractVersion: CONTRACT_VERSION,
        requestId: request.requestId,
        provider: MODEL_PROVIDER,
        model: MODEL_NAME,
        candidates: [
          {
            kind: "important_rule",
            scope: "course",
            proposedValue: { rule: "All written assignments must be submitted via NTULearn." },
            evidenceRefs: [{ sourceId: "source_1", locator: "page:1" }]
          }
        ],
        usage: { inputTokens: 10, outputTokens: 3 }
      })
    );
    const result = await extractCandidateBatches({
      courseId: "course_1",
      scanId: "scan_1",
      batches: [
        batch("batch_1", "source_1", "All written assignments must be submitted via NTULearn.")
      ],
      credentials: {
        get: () => Promise.resolve(saved),
        save: (value) => {
          saved = value;
          return Promise.resolve();
        }
      },
      transport: { register, extract },
      now: () => new Date("2026-09-16T00:00:00.000Z")
    });
    expect(register).toHaveBeenCalledOnce();
    expect(saved).toMatchObject({ installationToken: "installation-token" });
    expect(extract.mock.calls[0]?.[0]).toBe("installation-token");
    expect(extract.mock.calls[0]?.[1].units[0]).toEqual({
      sourceId: "source_1",
      sourceType: "attachment",
      title: "Guide",
      locator: "page:1",
      text: "All written assignments must be submitted via NTULearn.",
      contentHash: "a".repeat(64)
    });
    expect(result.candidates[0]).toMatchObject({
      status: "Detected",
      semanticKey: "important_rule:all assignments must be submitted via ntulearn:course"
    });
  });

  it("isolates a failed batch and rejects an unknown evidence source", async () => {
    const batches = [batch("batch_1", "source_1", "First"), batch("batch_2", "source_2", "Second")];
    const result = await extractCandidateBatches({
      courseId: "course_1",
      scanId: "scan_1",
      batches,
      credentials: {
        get: () => Promise.resolve({ installationId: "id", installationToken: "token" }),
        save: () => Promise.resolve()
      },
      transport: {
        register: () => Promise.reject(new Error("should not register")),
        extract: (_token, request) =>
          request.units[0]?.sourceId === "source_1"
            ? Promise.reject(new Error("PROVIDER_UNAVAILABLE"))
            : Promise.resolve({
                contractVersion: CONTRACT_VERSION,
                requestId: request.requestId,
                provider: MODEL_PROVIDER,
                model: MODEL_NAME,
                candidates: [
                  {
                    kind: "important_date",
                    scope: "course",
                    proposedValue: { label: "Date" },
                    evidenceRefs: [{ sourceId: "invented", locator: "page:1" }]
                  }
                ],
                usage: { inputTokens: 1, outputTokens: 1 }
              })
      }
    });
    expect(result.candidates).toEqual([]);
    expect(result.failures).toEqual([
      { batchId: "batch_1", code: "PROVIDER_UNAVAILABLE" },
      { batchId: "batch_2", code: "AI_EVIDENCE_INVALID" }
    ]);
  });

  it("does not turn Week 7 into a confirmed calendar date without a mapping", async () => {
    const result = await extractCandidateBatches({
      courseId: "course_1",
      scanId: "scan_1",
      batches: [batch("batch_1", "source_1", "Presentation in Week 7")],
      credentials: {
        get: () => Promise.resolve({ installationId: "id", installationToken: "token" }),
        save: () => Promise.resolve()
      },
      transport: {
        register: () => Promise.reject(new Error("unused")),
        extract: (_token, request) =>
          Promise.resolve({
            contractVersion: CONTRACT_VERSION,
            requestId: request.requestId,
            provider: MODEL_PROVIDER,
            model: MODEL_NAME,
            candidates: [
              {
                kind: "important_date",
                scope: "course",
                proposedValue: { label: "Presentation", dueDate: "2026-10-01" },
                evidenceRefs: [{ sourceId: "source_1", locator: "page:1" }]
              }
            ],
            usage: { inputTokens: 1, outputTokens: 1 }
          })
      }
    });
    expect(result.candidates[0]).toMatchObject({
      status: "NeedsReview",
      proposedValue: { label: "Presentation" }
    });
    expect(result.candidates[0]?.proposedValue).not.toHaveProperty("dueDate");
  });

  it("does not spread practice wording from another locator to a graded assessment", async () => {
    const assessmentUnit = {
      ...unit("outline", "Final Examination — 40 marks (40%)."),
      locator: "assessment-table"
    };
    const practiceUnit = {
      ...unit("outline", "Optional practice case study, not graded."),
      locator: "practice-section"
    };
    const result = await extractCandidateBatches({
      courseId: "course",
      scanId: "scan",
      batches: [
        {
          batchId: "outline:batch",
          sourceId: "outline",
          units: [assessmentUnit, practiceUnit],
          characterCount: assessmentUnit.text.length + practiceUnit.text.length
        }
      ],
      credentials: {
        get: () => Promise.resolve({ installationId: "id", installationToken: "token" }),
        save: () => Promise.resolve()
      },
      transport: {
        register: () => Promise.reject(new Error("unused")),
        extract: (_token, request) =>
          Promise.resolve({
            contractVersion: CONTRACT_VERSION,
            requestId: request.requestId,
            provider: MODEL_PROVIDER,
            model: MODEL_NAME,
            candidates: [
              {
                kind: "assessment",
                proposedValue: { name: "Final Examination", weight: "40%", marks: "40" },
                evidenceRefs: [{ sourceId: "outline", locator: "assessment-table" }]
              }
            ],
            usage: { inputTokens: 1, outputTokens: 1 }
          })
      }
    });
    expect(result.candidates[0]).toMatchObject({ status: "Detected" });
    expect(result.candidates[0]?.reviewReason).toBeUndefined();
  });

  it("re-registers once when a restarted backend rejects the stored token", async () => {
    let saved: InstallationCredentials | null = {
      installationId: "stable-installation-id",
      installationToken: "stale-token"
    };
    const register = vi.fn(() => Promise.resolve("fresh-token"));
    const extract = vi.fn<AiBackendTransport["extract"]>((token, request) => {
      if (token === "stale-token") return Promise.reject(new Error("UNAUTHORIZED"));
      return Promise.resolve({
        contractVersion: CONTRACT_VERSION,
        requestId: request.requestId,
        provider: MODEL_PROVIDER,
        model: MODEL_NAME,
        candidates: [],
        usage: { inputTokens: 1, outputTokens: 1 }
      });
    });

    const result = await extractCandidateBatches({
      courseId: "course_1",
      scanId: "scan_1",
      batches: [batch("batch_1", "source_1", "Assessment")],
      credentials: {
        get: () => Promise.resolve(saved),
        save: (value) => {
          saved = value;
          return Promise.resolve();
        }
      },
      transport: { register, extract }
    });

    expect(result.failures).toEqual([]);
    expect(register).toHaveBeenCalledOnce();
    expect(extract).toHaveBeenCalledTimes(2);
    expect(saved).toMatchObject({ installationToken: "fresh-token" });
  });

  it("drops lecture knowledge while retaining actionable course rules", async () => {
    const result = await extractCandidateBatches({
      courseId: "course_1",
      scanId: "scan_1",
      batches: [batch("batch_1", "source_1", "Course rules and SLA lecture content")],
      credentials: {
        get: () => Promise.resolve({ installationId: "id", installationToken: "token" }),
        save: () => Promise.resolve()
      },
      transport: {
        register: () => Promise.reject(new Error("unused")),
        extract: (_token, request) =>
          Promise.resolve({
            contractVersion: CONTRACT_VERSION,
            requestId: request.requestId,
            provider: MODEL_PROVIDER,
            model: MODEL_NAME,
            candidates: [
              {
                kind: "important_rule",
                scope: "course",
                proposedValue: { rule: "An SLA defines service commitments and metrics." },
                evidenceRefs: [{ sourceId: "source_1", locator: "page:1" }]
              },
              {
                kind: "important_rule",
                scope: "course",
                proposedValue: { rule: "All assignments must be submitted via NTULearn." },
                evidenceRefs: [{ sourceId: "source_1", locator: "page:1" }]
              }
            ],
            usage: { inputTokens: 1, outputTokens: 1 }
          })
      }
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.proposedValue).toMatchObject({
      rule: "All assignments must be submitted via NTULearn."
    });
  });

  it("merges obvious duplicate dates and preserves both evidence references", async () => {
    const result = await extractCandidateBatches({
      courseId: "course_1",
      scanId: "scan_1",
      batches: [
        batch("batch_1", "source_1", "Final Written Exam Monday, November 30, 2026"),
        batch("batch_2", "source_2", "Final Written Examination 2026-11-30")
      ],
      credentials: {
        get: () => Promise.resolve({ installationId: "id", installationToken: "token" }),
        save: () => Promise.resolve()
      },
      transport: {
        register: () => Promise.reject(new Error("unused")),
        extract: (_token, request) => {
          const first = request.units[0]?.sourceId === "source_1";
          return Promise.resolve({
            contractVersion: CONTRACT_VERSION,
            requestId: request.requestId,
            provider: MODEL_PROVIDER,
            model: MODEL_NAME,
            candidates: [
              {
                kind: "important_date",
                scope: "assessment",
                appliesToAssessmentKey: "assessment:final-exam",
                proposedValue: first
                  ? { event: "Final Written Exam", date: "Monday, November 30, 2026" }
                  : { label: "Final Written Examination", date: "2026-11-30" },
                evidenceRefs: [
                  {
                    sourceId: first ? "source_1" : "source_2",
                    locator: "page:1"
                  }
                ]
              }
            ],
            usage: { inputTokens: 1, outputTokens: 1 }
          });
        }
      }
    });

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]?.evidenceRefs).toHaveLength(2);
  });

  it("merges CA1 naming variants into one assessment with all evidence", () => {
    const merged = mergeCandidateRecords([
      candidate("1", "assessment", {
        name: "Continuous Assessment 1 (CA1): Group Assignment",
        identifier: "CA1"
      }),
      candidate("2", "assessment", {
        name: "CA1: Contract Negotiation Plan and Negotiation Tactics",
        weight: "30%"
      }),
      candidate("3", "assessment", {
        name: "Group Assignment: In-Class Presentation/Role Play (CA1)",
        components: ["Presentation", "Role Play", "Peer Evaluation"]
      })
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.semanticKey).toBe("assessment:ca1");
    expect(merged[0]?.evidenceRefs).toHaveLength(3);
    expect(merged[0]?.proposedValue).toMatchObject({ identifier: "CA1", weight: "30%" });
  });

  it("keeps CA2 and CA3 separate when they occur on the same date", () => {
    const merged = mergeCandidateRecords([
      candidate("1", "important_date", { label: "CA2 MCQ Test", date: "2026-11-13" }),
      candidate("2", "important_date", {
        label: "CA3 In-Class Case Study",
        date: "2026-11-13"
      })
    ]);

    expect(merged).toHaveLength(2);
    expect(merged.map((item) => item.semanticKey)).toEqual([
      "important_date:ca2-test:2026-11-13:assessment:ca2",
      "important_date:ca3-case-study:2026-11-13:assessment:ca3"
    ]);
  });

  it("merges natural when and ISO date values for the same CA1 batch", () => {
    const merged = mergeCandidateRecords([
      candidate("1", "important_date", {
        what: "CA1 Batch 1 in-class presentation and role play",
        when: "23 October 2026, 3.30 pm to 6.20 pm"
      }),
      candidate("2", "important_date", {
        label: "CA1 Presentation sessions",
        date: "2026-10-23",
        note: "Batch 1"
      })
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.semanticKey).toBe(
      "important_date:ca1-presentation-batch1:2026-10-23:assessment:ca1"
    );
    expect(merged[0]?.evidenceRefs).toHaveLength(2);
  });

  it("normalizes NTU day-month dates without interpreting them as US dates", () => {
    const merged = mergeCandidateRecords([
      candidate("1", "important_date", {
        name: "Project Background & Procurement Scenario Submission Deadline",
        date: "11/09/2026"
      }),
      candidate("2", "important_date", {
        label: "Procurement scenario form deadline",
        when: "11 September 2026"
      })
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.semanticKey).toBe("important_date:scenario-form:2026-09-11:course");
  });

  it("keeps the richer value, fills missing fields, and routes conflicts to review", () => {
    const merged = mergeCandidateRecords([
      candidate("1", "assessment", {
        name: "CA2 MCQ Test",
        identifier: "CA2",
        weight: "20%"
      }),
      candidate("2", "assessment", {
        name: "Continuous Assessment 2 (CA2): In-class MCQ Test",
        weight: "25%",
        format: "20-minute in-class MCQ test on NTULearn"
      })
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.proposedValue).toMatchObject({
      identifier: "CA2",
      format: "20-minute in-class MCQ test on NTULearn"
    });
    expect(merged[0]).toMatchObject({
      status: "NeedsReview",
      reviewReason: "Conflicting values were found for the same course fact."
    });
    expect(new Set(merged[0]?.unresolvedFields?.weight)).toEqual(new Set(["20%", "25%"]));
  });

  it("adds a stable parent relationship to an explicit Assessment rule", () => {
    const merged = mergeCandidateRecords([
      candidate("parent", "assessment", { identifier: "CA1", name: "Group Assignment" }),
      candidate("child", "important_rule", {
        scope: "CA1 Presentation",
        rule: "Number of slides must not exceed 8."
      })
    ]);

    expect(merged[1]).toMatchObject({
      scope: "assessment",
      appliesToAssessmentKey: "assessment:ca1",
      status: "Detected"
    });
  });

  it("remaps a model-supplied parent alias to the canonical Assessment key", () => {
    const parent = candidate("parent", "assessment", {
      name: "Part 3: In-Class Scenario-Based Case Study (Closed Book)"
    });
    const child = candidate("child", "important_date", {
      label: "Part 3 In-Class Case Study session",
      date: "2026-11-14"
    });
    child.scope = "assessment";
    child.appliesToAssessmentKey = "assessment:part-3-in-class-case-study";

    const merged = mergeCandidateRecords([parent, child]);

    expect(merged[1]).toMatchObject({
      status: "Detected",
      scope: "assessment",
      appliesToAssessmentKey: "assessment:part 3 in class scenario based case study closed book"
    });
  });

  it("routes a model-supplied missing parent to Needs Review instead of dropping it from Brief", () => {
    const parent = candidate("parent", "assessment", {
      name: "Part 1: Group Presentation"
    });
    const child = candidate("child", "important_date", {
      label: "Unknown assessment session",
      date: "2026-11-14"
    });
    child.scope = "assessment";
    child.appliesToAssessmentKey = "assessment:unknown-assessment";

    const merged = mergeCandidateRecords([parent, child]).find(
      (candidate) => candidate.candidateId === "child"
    );

    expect(merged).toMatchObject({
      status: "NeedsReview",
      reviewReason:
        "The referenced parent Assessment was not found. Choose the correct Assessment before confirming."
    });
    expect(merged).not.toHaveProperty("scope");
    expect(merged).toHaveProperty("appliesToAssessmentKey", "assessment:unknown-assessment");
  });

  it("keeps a clearly course-level rule without a parent", () => {
    const merged = mergeCandidateRecords([
      candidate("rule", "important_rule", {
        rule: "All written assignments must be submitted via NTULearn."
      })
    ]);

    expect(merged[0]).toMatchObject({ scope: "course", status: "Detected" });
    expect(merged[0]).not.toHaveProperty("appliesToAssessmentKey");
  });

  it("routes ambiguous rule ownership to Needs Review", () => {
    const merged = mergeCandidateRecords([
      candidate("rule", "important_rule", {
        rule: "Only one representative should submit this form."
      })
    ]);

    expect(merged[0]).toMatchObject({ status: "NeedsReview" });
    expect(merged[0]).not.toHaveProperty("scope");
  });

  it("does not merge the same child fact when its parent changes", () => {
    const base = candidate("one", "important_rule", { rule: "Maximum 8 slides" });
    const changed = candidate("two", "important_rule", { rule: "Maximum 8 slides" });
    const merged = mergeCandidateRecords([
      { ...base, scope: "assessment", appliesToAssessmentKey: "assessment:ca1" },
      { ...changed, scope: "assessment", appliesToAssessmentKey: "assessment:ca2" }
    ]);

    expect(merged).toHaveLength(2);
  });

  it("merges the same child fact when its stable parent is unchanged", () => {
    const first = candidate("one", "important_rule", { rule: "Maximum 8 slides" });
    const second = candidate("two", "important_rule", { rule: "Maximum 8 slides" });
    const merged = mergeCandidateRecords([
      { ...first, scope: "assessment", appliesToAssessmentKey: "assessment:ca1" },
      { ...second, scope: "assessment", appliesToAssessmentKey: "assessment:ca1" }
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.evidenceRefs).toHaveLength(2);
  });

  it("does not migrate or overwrite already reviewed candidates", () => {
    for (const status of ["Confirmed", "EditedConfirmed", "Ignored"] as const) {
      const reviewed = candidate(status, "important_rule", { rule: "Maximum 8 slides" }, status);
      const merged = mergeCandidateRecords([reviewed]);
      expect(merged[0]).toEqual(reviewed);
    }
  });

  it("migrates an unreviewed assessment with explicit grading fields out of the false ungraded risk", () => {
    const old = candidate("assessment", "assessment", {
      name: "Final Examination",
      weight: "40%",
      marks: "40"
    });
    old.status = "NeedsReview";
    old.reviewReason = "The source does not clearly establish that this item is graded.";
    const [migrated] = mergeCandidateRecords([old]);
    expect(migrated).toMatchObject({ status: "Detected" });
    expect(migrated?.reviewReason).toBeUndefined();
  });
});
