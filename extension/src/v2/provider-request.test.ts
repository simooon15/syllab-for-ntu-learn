import { expect, it } from "vitest";
import { buildTaskACalls } from "./ai-pipeline";
import { planChunks } from "./chunking";
import { INLINE_BODY_BYTES, requestBoundary, serializeProviderRequest } from "./provider-request";

it("sends more than twenty small images in one request and conserves every visual locator", () => {
  const parts = Array.from({ length: 35 }, (_, i) => ({
    locator: `page:${String(i + 1)}`,
    dataUrl: "data:image/png;base64,AAAA"
  }));
  const source = {
    sourceId: "synthetic",
    sourceType: "attachment",
    title: "probe",
    text: parts.map((part) => `${part.locator}\nnative`).join("\n"),
    structure: parts.map((part) => part.locator),
    pageImages: parts
  };
  const calls = buildTaskACalls({
    source,
    course: { courseCode: "TEST", courseName: "Probe" },
    chunks: planChunks({ sourceId: "synthetic", text: source.text, structure: source.structure })
  });
  expect(calls).toHaveLength(1);
  expect(calls[0]?.visualParts).toEqual(parts);
});
// Finite CPU stress probe: elapsed time is not a provider contract. A host-load-dependent
// framework deadline must not turn exact byte/locator conservation into a spurious failure.
it(
  "splits only when the actual UTF8 JSON envelope exceeds the provider inline boundary",
  { timeout: 0 },
  () => {
    const dataUrl = `data:image/png;base64,${"A".repeat(25 * 1024 * 1024)}`;
    const parts = [
      { locator: "page:1", dataUrl },
      { locator: "page:2", dataUrl }
    ];
    const source = {
      sourceId: "synthetic",
      sourceType: "attachment",
      title: "probe",
      text: parts.map((part) => `${part.locator}\n原始文本`).join("\n"),
      structure: parts.map((part) => part.locator),
      pageImages: parts
    };
    const calls = buildTaskACalls({
      source,
      course: { courseCode: "TEST", courseName: "Probe" },
      chunks: planChunks({ sourceId: "synthetic", text: source.text, structure: source.structure })
    });
    expect(calls).toHaveLength(2);
    expect(calls.flatMap((call) => call.visualParts)).toEqual(parts);
    for (const call of calls) {
      expect(requestBoundary(call).reason).toBeUndefined();
      expect(
        new TextEncoder().encode(serializeProviderRequest(call)).byteLength
      ).toBeLessThanOrEqual(INLINE_BODY_BYTES);
      expect((JSON.parse(call.user) as { content: string }).content).toBe(source.text);
    }
  }
);

it("rejects a nested unknown evidence source before it can become a cached success", async () => {
  const { validateTaskA } = await import("./ai-contracts");
  expect(() =>
    validateTaskA(
      {
        schema: "syllab.ai.task-a/1",
        sourceId: "known",
        sourceResult: "RELEVANT_INFORMATION_FOUND",
        assessmentDrafts: [
          {
            facts: [
              { evidenceRefs: [{ sourceId: "invented", locator: "page:1", excerpt: "Synthetic" }] }
            ]
          }
        ],
        courseWideConstraintCandidates: [],
        unresolvedIssues: []
      },
      new Set(["known"])
    )
  ).toThrow("AI_CONTRACT:unknown_source_evidence");
});

it("keeps task output and reasoning controls distinct from provider maxima", () => {
  const request = {
    system: "Check one contract",
    user: "Synthetic",
    maxTokens: 8192,
    reasoningEffort: "low" as const
  };
  const wire = JSON.parse(serializeProviderRequest(request)) as {
    max_tokens: number;
    reasoning_effort: string;
  };
  expect(wire.max_tokens).toBe(8192);
  expect(wire.reasoning_effort).toBe("low");
  const semantic = JSON.parse(
    serializeProviderRequest({ ...request, reasoningEffort: "high" })
  ) as { reasoning_effort: string };
  expect(semantic.reasoning_effort).toBe("high");
});
