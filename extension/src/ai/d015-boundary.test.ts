import { CONTRACT_VERSION, MODEL_NAME, MODEL_PROVIDER } from "@syllab/contracts";
import { describe, expect, it } from "vitest";

import type { NormalizedBatch, NormalizedUnit } from "../normalize/domain";
import { extractCandidateBatches } from "./client";
import type { AiBackendTransport } from "./domain";

function unit(text: string): NormalizedUnit {
  return {
    unitId: "source_1:page:1",
    courseId: "course_1",
    scanId: "scan_1",
    sourceId: "source_1",
    sourceType: "attachment",
    title: "Course policy",
    path: ["Course content"],
    locator: "page:1",
    text,
    contentHash: "a".repeat(64)
  };
}

function batch(text: string): NormalizedBatch {
  return {
    batchId: "batch_1",
    sourceId: "source_1",
    units: [unit(text)],
    characterCount: text.length
  };
}

async function extractRule(
  sourceText: string,
  proposedRule: string,
  relationship: Record<string, string> = { scope: "course" }
) {
  const transport: AiBackendTransport = {
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
            ...relationship,
            proposedValue: { rule: proposedRule },
            evidenceRefs: [{ sourceId: "source_1", locator: "page:1" }]
          }
        ],
        usage: { inputTokens: 1, outputTokens: 1 }
      })
  };

  return extractCandidateBatches({
    courseId: "course_1",
    scanId: "scan_1",
    batches: [batch(sourceText)],
    credentials: {
      get: () => Promise.resolve({ installationId: "id", installationToken: "token" }),
      save: () => Promise.resolve()
    },
    transport
  });
}

describe("D-015 Important Rule boundary", () => {
  it.each([
    [
      "mandatory Turnitin / NTULearn submission channel",
      "All written assignments must be submitted via Turnitin/NTULearn.",
      "All written assignments must be submitted via Turnitin/NTULearn."
    ],
    [
      "late penalty",
      "Late submissions incur a 10% late penalty.",
      "Late submissions incur a 10% late penalty."
    ],
    [
      "attendance tied to participation marks",
      "Attendance below 80% results in loss of participation marks.",
      "Attendance below 80% results in loss of participation marks."
    ]
  ])("includes %s", async (_name, sourceText, proposedRule) => {
    const result = await extractRule(sourceText, proposedRule);
    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({ kind: "important_rule", scope: "course" });
  });

  it.each([
    [
      "ordinary attendance expectation",
      "Students are expected to attend all tutorials.",
      "Students are expected to attend all tutorials."
    ],
    [
      "copyright / redistribution / recording prohibition",
      "All course materials are for students' own educational purposes only; reproducing, redistributing, or recording them is not permitted.",
      "All course materials may not be reproduced, redistributed, or recorded."
    ],
    [
      "general conduct / privacy / acceptable-use policy",
      "Students must comply with the university privacy, campus conduct, and acceptable-use policies.",
      "Students must comply with university privacy, campus conduct, and acceptable-use policies."
    ],
    [
      "generic academic integrity policy link",
      "Students must follow the university academic integrity policy; see the linked policy for details.",
      "Students must follow the university academic integrity policy."
    ]
  ])("excludes %s", async (_name, sourceText, proposedRule) => {
    const result = await extractRule(sourceText, proposedRule);
    expect(result.candidates).toEqual([]);
  });

  it("includes an academic-integrity rule with explicit Assessment zero-marks consequence under that Assessment", async () => {
    const result = await extractRule(
      "Academic misconduct in CA1 results in 0 marks for the CA1 assignment.",
      "Academic misconduct in CA1 results in 0 marks for the CA1 assignment.",
      { scope: "assessment", appliesToAssessmentKey: "assessment:ca1" }
    );

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      kind: "important_rule",
      scope: "assessment",
      appliesToAssessmentKey: "assessment:ca1"
    });
  });
});
