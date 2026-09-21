import { describe, expect, it } from "vitest";

import { TASK_A_SCHEMA, TASK_B_SCHEMA, TASK_C_SCHEMA } from "./ai-contracts";
import {
  MAX_TASK_B_EXPANSION_ROUNDS,
  assertNoProductInstructions,
  runTaskA,
  runTaskB,
  runTaskC,
  type AiCall,
  type AiCallOutcome,
  type AiGateway,
  type AiGatewayDeps
} from "./ai-pipeline";
import type { AiCourseIndexEntry, AiEvidence, AiSourceInput } from "./ai-context";
import { planChunks, type Chunk } from "./chunking";
import { DeepSeekFailure } from "./deepseek";
import {
  AiUnitFailure,
  completeJson,
  completeWithRepair,
  deepSeekTransport,
  readProviderCompletion,
  type AiTransport,
  type AiTransportRequest
} from "./deepseek-complete";

const API_KEY = "fixture-key";

/** One physical call per `run`, replaying recorded values and recording what was sent. */
class FakeGateway implements AiGateway {
  readonly calls: AiCall[] = [];
  readonly apiKeys: string[] = [];

  constructor(
    private readonly responses: unknown[],
    private readonly failures: Map<number, DeepSeekFailure> = new Map()
  ) {}

  run(call: AiCall, apiKey: string): Promise<AiCallOutcome> {
    this.calls.push(call);
    this.apiKeys.push(apiKey);
    const failure = this.failures.get(this.calls.length);
    if (failure) return Promise.reject(failure);
    const index = Math.min(this.calls.length, this.responses.length) - 1;
    return Promise.resolve({
      call,
      value: structuredClone(this.responses[index]),
      inputTokens: 10,
      outputTokens: 5
    });
  }
}

/** A provider-level fake: full payloads, so truncation and usage are exercised too. */
class ScriptedTransport implements AiTransport {
  readonly requests: AiTransportRequest[] = [];
  readonly apiKeys: string[] = [];

  constructor(
    private readonly payloads: unknown[],
    private readonly errors: Map<number, Error> = new Map()
  ) {}

  complete(apiKey: string, request: AiTransportRequest): Promise<unknown> {
    this.requests.push(request);
    this.apiKeys.push(apiKey);
    const failure = this.errors.get(this.requests.length);
    if (failure) return Promise.reject(failure);
    const index = Math.min(this.requests.length, this.payloads.length) - 1;
    return Promise.resolve(structuredClone(this.payloads[index]));
  }
}

function providerPayload(
  value: unknown,
  options: {
    finishReason?: string;
    inputTokens?: number;
    outputTokens?: number;
    reasoningTokens?: number;
  } = {}
): unknown {
  return {
    choices: [
      {
        message: { content: JSON.stringify(value) },
        finish_reason: options.finishReason ?? "stop"
      }
    ],
    usage: {
      prompt_tokens: options.inputTokens ?? 12,
      completion_tokens: options.outputTokens ?? 7,
      ...(options.reasoningTokens === undefined
        ? {}
        : { completion_tokens_details: { reasoning_tokens: options.reasoningTokens } })
    }
  };
}

const COURSE = { courseId: "course-1", courseCode: "SYN101", courseName: "Synthetic Course" };

const SOURCE: AiSourceInput = {
  sourceId: "src-1",
  sourceType: "attachment",
  title: "Synthetic handout",
  text: "Synthetic synthetic text for chunking.",
  structure: []
};

function chunksOf(count: number): Chunk[] {
  return Array.from({ length: count }, (_item, index) => ({
    chunkId: `chunk-${String(index)}`,
    chunkIndex: index,
    chunkCount: count,
    text: `Synthetic chunk ${String(index)}`,
    locator: "Handout",
    locators: [],
    start: index * 10,
    end: index * 10 + 10
  }));
}

function taskAResponse(sourceResult: string, drafts: unknown[] = []): Record<string, unknown> {
  return {
    schema: TASK_A_SCHEMA,
    sourceId: SOURCE.sourceId,
    sourceResult,
    assessmentDrafts: drafts,
    courseWideConstraintCandidates: [],
    unresolvedIssues: []
  };
}

function draftWithEvidence(evidenceId: string): Record<string, unknown> {
  return {
    draftId: `draft-${evidenceId}`,
    name: "Synthetic draft",
    fields: [
      {
        fieldName: "weight",
        state: "KNOWN",
        value: "30%",
        evidence: [
          {
            evidenceId,
            sourceId: SOURCE.sourceId,
            locator: "body",
            excerpt: "Synthetic excerpt."
          }
        ]
      }
    ]
  };
}

const DRAFT_EVIDENCE: AiEvidence = {
  evidenceId: "ev-draft",
  sourceId: "src-1",
  locator: "body",
  excerpt: "Synthetic excerpt."
};

const OBJECT_EVIDENCE: AiEvidence = {
  evidenceId: "ev-object-1",
  sourceId: "src-earlier",
  locator: "page 2",
  excerpt: "Synthetic earlier excerpt.",
  objectId: "assessment-1"
};

const OBJECT_EVIDENCE_TWO: AiEvidence = {
  evidenceId: "ev-object-2",
  sourceId: "src-earlier",
  locator: "page 3",
  excerpt: "Synthetic earlier excerpt two.",
  objectId: "assessment-2"
};

const INDEX: AiCourseIndexEntry[] = ["assessment-1", "assessment-2", "assessment-3"].map(
  (objectId) => ({
    objectId,
    kind: "assessment" as const,
    name: `Synthetic object ${objectId}`,
    aliases: [],
    fields: [],
    flags: []
  })
);

function identityResponse(
  involvedObjectIds: string[],
  relationship: string,
  supportingEvidence: unknown[] = [DRAFT_EVIDENCE]
): Record<string, unknown> {
  return {
    schema: TASK_B_SCHEMA,
    identityResolutions: [
      {
        involvedObjectIds,
        relationship,
        supportingEvidence,
        contradictoryEvidence: [],
        judgmentBasis: "Synthetic judgment basis for the fixture."
      }
    ],
    canonicalAssessmentProposals: [],
    courseWideConstraintProposals: [],
    fieldConsolidationResults: [],
    structuralRelationships: [],
    unresolvedIssues: []
  };
}

const TARGET: AiCourseIndexEntry = {
  objectId: "assessment-1",
  kind: "assessment",
  name: "Group Project Report",
  aliases: [],
  fields: [{ fieldName: "weight", display: "30%" }],
  flags: []
};

function changeResponse(
  changeType: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    schema: TASK_C_SCHEMA,
    changeResults: [
      {
        changeType,
        targetObjectId: TARGET.objectId,
        judgmentBasis: "Synthetic judgment basis for the fixture.",
        currentEvidence: [OBJECT_EVIDENCE],
        newEvidence: [DRAFT_EVIDENCE],
        ...overrides
      }
    ],
    unresolvedIssues: []
  };
}

function taskADeps(gateway: AiGateway): AiGatewayDeps {
  return { gateway, apiKey: API_KEY };
}

describe("Task A orchestration", () => {
  it("runs one call per chunk and reports the single relevant result", async () => {
    const gateway = new FakeGateway([taskAResponse("RELEVANT_INFORMATION_FOUND")]);
    const outcome = await runTaskA(taskADeps(gateway), {
      source: SOURCE,
      course: COURSE,
      chunks: chunksOf(1)
    });
    expect(outcome.status).toBe("succeeded");
    if (outcome.status !== "succeeded") return;
    expect(outcome.value.sourceResult).toBe("RELEVANT_INFORMATION_FOUND");
    expect(outcome.value.chunkResults).toHaveLength(1);
    expect(outcome.value.consolidated).toBeUndefined();
    expect(gateway.calls.map((call) => call.task)).toEqual(["task-a"]);
    expect(gateway.calls[0]?.schemaVersion).toBe(TASK_A_SCHEMA);
    expect(outcome.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
    expect(outcome.calls[0]).toMatchObject({
      status: "succeeded",
      attempts: 1,
      consumesApi: true,
      chunkIndex: 0,
      sourceId: SOURCE.sourceId
    });
  });

  it("does not consolidate when only one chunk carries relevant information", async () => {
    const gateway = new FakeGateway([
      taskAResponse("NO_RELEVANT_INFORMATION"),
      taskAResponse("PARTIALLY_UNDERSTOOD")
    ]);
    const outcome = await runTaskA(taskADeps(gateway), {
      source: SOURCE,
      course: COURSE,
      chunks: chunksOf(2)
    });
    expect(outcome.status).toBe("succeeded");
    if (outcome.status !== "succeeded") return;
    expect(outcome.value.sourceResult).toBe("PARTIALLY_UNDERSTOOD");
    expect(outcome.value.chunkResults).toHaveLength(2);
    expect(gateway.calls.map((call) => call.task)).toEqual(["task-a", "task-a"]);
  });

  it("consolidates when more than one chunk carries relevant information", async () => {
    const gateway = new FakeGateway([
      taskAResponse("RELEVANT_INFORMATION_FOUND", [draftWithEvidence("ev-1")]),
      taskAResponse("RELEVANT_INFORMATION_FOUND", [draftWithEvidence("ev-2")]),
      taskAResponse("PARTIALLY_UNDERSTOOD", [draftWithEvidence("ev-1")])
    ]);
    const outcome = await runTaskA(taskADeps(gateway), {
      source: SOURCE,
      course: COURSE,
      chunks: chunksOf(2)
    });
    expect(outcome.status).toBe("succeeded");
    if (outcome.status !== "succeeded") return;
    expect(gateway.calls.map((call) => call.task)).toEqual([
      "task-a",
      "task-a",
      "task-a-consolidate"
    ]);
    expect(outcome.value.sourceResult).toBe("PARTIALLY_UNDERSTOOD");
    expect(outcome.value.consolidated?.sourceResult).toBe("PARTIALLY_UNDERSTOOD");
    expect(outcome.usage).toEqual({ inputTokens: 30, outputTokens: 15 });
  });

  it("reports no relevant information without paying for a consolidation", async () => {
    const gateway = new FakeGateway([
      taskAResponse("NO_RELEVANT_INFORMATION"),
      taskAResponse("NO_RELEVANT_INFORMATION")
    ]);
    const outcome = await runTaskA(taskADeps(gateway), {
      source: SOURCE,
      course: COURSE,
      chunks: chunksOf(2)
    });
    expect(outcome.status).toBe("succeeded");
    if (outcome.status !== "succeeded") return;
    expect(outcome.value.sourceResult).toBe("NO_RELEVANT_INFORMATION");
    expect(gateway.calls).toHaveLength(2);
  });

  it("rejects a consolidation that introduces Evidence the chunks never had", async () => {
    const gateway = new FakeGateway([
      taskAResponse("RELEVANT_INFORMATION_FOUND", [draftWithEvidence("ev-1")]),
      taskAResponse("RELEVANT_INFORMATION_FOUND", [draftWithEvidence("ev-2")]),
      taskAResponse("RELEVANT_INFORMATION_FOUND", [draftWithEvidence("ev-invented")])
    ]);
    const outcome = await runTaskA(taskADeps(gateway), {
      source: SOURCE,
      course: COURSE,
      chunks: chunksOf(2)
    });
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.failure.errorCode).toBe("AI_CONTRACT");
    expect(outcome.failure.detail).toContain("consolidation_evidence:ev-invented");
    expect(outcome.failure.consumesApi).toBe(true);
    expect(outcome.calls).toHaveLength(3);
  });

  it("reports a credential failure without claiming API consumption", async () => {
    const gateway = new FakeGateway(
      [taskAResponse("RELEVANT_INFORMATION_FOUND")],
      new Map([[2, new DeepSeekFailure("AI_AUTH", false, "This API key is not working")]])
    );
    const outcome = await runTaskA(taskADeps(gateway), {
      source: SOURCE,
      course: COURSE,
      chunks: chunksOf(2)
    });
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.failure.errorCode).toBe("AI_AUTH");
    expect(outcome.failure.consumesApi).toBe(false);
    expect(outcome.calls).toHaveLength(2);
    expect(outcome.calls[0]?.status).toBe("succeeded");
    expect(outcome.calls[1]).toMatchObject({
      status: "failed",
      errorCode: "AI_AUTH",
      consumesApi: false
    });
    expect(outcome.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
  });

  it("repairs an unusable response once with the same idempotency key", async () => {
    const gateway = new FakeGateway([
      { schema: TASK_A_SCHEMA, sourceId: SOURCE.sourceId, sourceResult: "MAYBE" },
      taskAResponse("RELEVANT_INFORMATION_FOUND")
    ]);
    const outcome = await runTaskA(taskADeps(gateway), {
      source: SOURCE,
      course: COURSE,
      chunks: chunksOf(1)
    });
    expect(outcome.status).toBe("succeeded");
    if (outcome.status !== "succeeded") return;
    expect(gateway.calls).toHaveLength(2);
    expect(gateway.calls[0]?.idempotencyKey).toBe(gateway.calls[1]?.idempotencyKey);
    expect(gateway.calls[0]?.user).not.toBe(gateway.calls[1]?.user);
    expect(gateway.calls[1]?.user).toContain("--- REPAIR REQUEST ---");
    expect(gateway.calls[1]?.user).toContain("sourceResult");
    expect(outcome.calls[0]).toMatchObject({ attempts: 2, status: "succeeded" });
    expect(outcome.calls[0]?.maxTokens).toBe(gateway.calls[0]?.maxTokens);
  });

  it("gives up after one targeted schema repair", async () => {
    const gateway = new FakeGateway([{ schema: TASK_A_SCHEMA, sourceId: SOURCE.sourceId }]);
    const outcome = await runTaskA(taskADeps(gateway), {
      source: SOURCE,
      course: COURSE,
      chunks: chunksOf(1)
    });
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(gateway.calls).toHaveLength(2);
    expect(gateway.calls.map((call) => call.maxTokens)).toEqual([96_000, 96_000]);
    expect(new Set(gateway.calls.map((call) => call.idempotencyKey)).size).toBe(1);
    expect(outcome.failure.errorCode).toBe("AI_CONTRACT");
    expect(outcome.calls).toHaveLength(1);
    expect(outcome.calls[0]?.attempts).toBe(2);
  });
});

describe("Task B orchestration", () => {
  const input = {
    drafts: [{ draftId: "draft-1" }],
    constraintCandidates: [],
    courseIndex: INDEX,
    evidence: [DRAFT_EVIDENCE, OBJECT_EVIDENCE, OBJECT_EVIDENCE_TWO]
  };

  it("expands Evidence for exactly the objects the model named", async () => {
    const gateway = new FakeGateway([
      identityResponse(["draft-1", "assessment-1"], "UNCERTAIN"),
      identityResponse(["draft-1", "assessment-1"], "SAME_ASSESSMENT", [
        OBJECT_EVIDENCE,
        DRAFT_EVIDENCE
      ])
    ]);
    const outcome = await runTaskB(taskADeps(gateway), input);
    expect(outcome.status).toBe("succeeded");
    if (outcome.status !== "succeeded") return;
    expect(gateway.calls.map((call) => call.task)).toEqual(["task-b", "task-b-expand"]);
    const expansion: unknown = JSON.parse(gateway.calls[1]?.user ?? "{}");
    expect(expansion).toMatchObject({
      requestedObjectIds: ["assessment-1"],
      objectEvidence: [{ evidenceId: "ev-object-1", objectId: "assessment-1" }]
    });
    expect(outcome.value.expansionRounds).toBe(1);
    expect(outcome.value.result.identityResolutions[0]?.relationship).toBe("SAME_ASSESSMENT");
    expect(outcome.usage).toEqual({ inputTokens: 20, outputTokens: 10 });
  });

  it("never spends more than two expansion rounds", async () => {
    const gateway = new FakeGateway([
      identityResponse(["draft-1", "assessment-1"], "UNCERTAIN"),
      identityResponse(["draft-1", "assessment-1", "assessment-2"], "UNCERTAIN"),
      identityResponse(["draft-1", "assessment-1", "assessment-2", "assessment-3"], "UNCERTAIN"),
      identityResponse(["draft-1"], "UNCERTAIN")
    ]);
    const outcome = await runTaskB(taskADeps(gateway), input);
    expect(outcome.status).toBe("succeeded");
    if (outcome.status !== "succeeded") return;
    expect(MAX_TASK_B_EXPANSION_ROUNDS).toBe(2);
    expect(gateway.calls).toHaveLength(1 + MAX_TASK_B_EXPANSION_ROUNDS);
    expect(outcome.value.expansionRounds).toBe(MAX_TASK_B_EXPANSION_ROUNDS);
  });

  it("stops expanding once the named objects have already been supplied", async () => {
    const gateway = new FakeGateway([
      identityResponse(["assessment-1"], "UNCERTAIN"),
      identityResponse(["assessment-1"], "UNCERTAIN")
    ]);
    const outcome = await runTaskB(taskADeps(gateway), input);
    expect(outcome.status).toBe("succeeded");
    if (outcome.status !== "succeeded") return;
    expect(gateway.calls).toHaveLength(2);
    expect(outcome.value.expansionRounds).toBe(1);
  });

  it("rejects an object id the call never received", async () => {
    const gateway = new FakeGateway([identityResponse(["assessment-unknown"], "UNCERTAIN")]);
    const outcome = await runTaskB(taskADeps(gateway), input);
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.failure.detail).toContain("unknown_object_id:assessment-unknown");
  });

  it("rejects Evidence that was never supplied", async () => {
    const gateway = new FakeGateway([
      identityResponse(["draft-1"], "SAME_ASSESSMENT", [
        { evidenceId: "ev-invented", sourceId: "src-1", locator: "body", excerpt: "Invented." }
      ])
    ]);
    const outcome = await runTaskB(taskADeps(gateway), input);
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.failure.detail).toContain("evidence_not_supplied:ev-invented");
  });

  it("rejects a Same Assessment judgment with no supporting Evidence", async () => {
    const gateway = new FakeGateway([identityResponse(["draft-1"], "SAME_ASSESSMENT", [])]);
    const outcome = await runTaskB(taskADeps(gateway), input);
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.failure.detail).toContain("same_assessment_without_evidence");
  });

  it("rejects auto-merge and confidence instructions", async () => {
    const gateway = new FakeGateway([
      { ...identityResponse(["draft-1"], "UNCERTAIN"), auto_merge: true, confidence: 0.9 }
    ]);
    const outcome = await runTaskB(taskADeps(gateway), input);
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.failure.detail).toContain("forbidden_key");
  });
});

describe("Task C orchestration", () => {
  const input = {
    target: TARGET,
    currentFacts: [{ field: "weight", state: "KNOWN", value: "30%" }],
    currentEvidence: [OBJECT_EVIDENCE],
    newEvidence: [DRAFT_EVIDENCE],
    identity: { relationship: "SAME_ASSESSMENT" },
    userState: { marks: [] },
    coverageFacts: { checked: 1, succeeded: 1, failed: 0, partialCoverage: false },
    coverageSufficient: true
  };

  it("returns the validated change result with its call record", async () => {
    const gateway = new FakeGateway([changeResponse("CHANGED")]);
    const outcome = await runTaskC(taskADeps(gateway), input);
    expect(outcome.status).toBe("succeeded");
    if (outcome.status !== "succeeded") return;
    expect(outcome.value.result.changeResults[0]?.changeType).toBe("CHANGED");
    expect(gateway.calls[0]?.task).toBe("task-c");
    expect(gateway.calls[0]?.schemaVersion).toBe(TASK_C_SCHEMA);
    expect(outcome.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
  });

  it("rejects a removal proposal unless coverage is sufficient", async () => {
    const gateway = new FakeGateway([changeResponse("POSSIBLY_REMOVED")]);
    const outcome = await runTaskC(taskADeps(gateway), { ...input, coverageSufficient: false });
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.failure.detail).toContain("removal_without_coverage");
  });

  it("rejects a change that targets an object this call never received", async () => {
    const gateway = new FakeGateway([
      changeResponse("CHANGED", { targetObjectId: "assessment-other" })
    ]);
    const outcome = await runTaskC(taskADeps(gateway), input);
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.failure.detail).toContain("unknown_object_id:assessment-other");
  });

  it("rejects Evidence this call never received", async () => {
    const gateway = new FakeGateway([
      changeResponse("CHANGED", {
        currentEvidence: [
          { evidenceId: "ev-invented", sourceId: "src-1", locator: "body", excerpt: "Invented." }
        ]
      })
    ]);
    const outcome = await runTaskC(taskADeps(gateway), input);
    expect(outcome.status).toBe("failed");
    if (outcome.status !== "failed") return;
    expect(outcome.failure.detail).toContain("evidence_not_supplied:ev-invented");
  });
});

describe("provider response handling", () => {
  it("reads content, finish reason and usage from a provider payload", () => {
    const completion = readProviderCompletion(
      providerPayload({ ok: true }, { inputTokens: 30, outputTokens: 12, reasoningTokens: 5 })
    );
    expect(completion.ok).toBe(true);
    if (!completion.ok) return;
    expect(completion.value).toEqual({ ok: true });
    expect(completion.truncated).toBe(false);
    expect(completion.usage).toEqual({
      inputTokens: 30,
      outputTokens: 12,
      reasoningTokens: 5
    });
  });

  it("flags truncation, missing content and unusable JSON", () => {
    expect(
      readProviderCompletion(providerPayload({ ok: true }, { finishReason: "length" }))
    ).toMatchObject({
      ok: true,
      truncated: true
    });
    const missing = readProviderCompletion({ choices: [{ message: {}, finish_reason: "stop" }] });
    expect(missing.ok).toBe(false);
    if (missing.ok) return;
    expect(missing.problem).toContain("no message content");
    const invalid = readProviderCompletion({
      choices: [{ message: { content: "{not json" }, finish_reason: "stop" }]
    });
    expect(invalid.ok).toBe(false);
    if (invalid.ok) return;
    expect(invalid.raw).toBe("{not json");
    expect(invalid.problem).toContain("not valid JSON");
    // A cut-off answer is reported as cut off, even though it is also unparseable. The two failures
    // reach the reader through the same door — the JSON did not parse — and saying "not valid JSON"
    // about a response that simply ran out of room names the wrong problem. Every failed unit
    // measured on MA6083 / MA6084 was exactly this. (Gate 3 finding F35.)
    const cutOff = readProviderCompletion({
      choices: [
        { message: { content: '{"schema":"syllab.ai/task-a/1","assess' }, finish_reason: "length" }
      ]
    });
    expect(cutOff.ok).toBe(false);
    if (cutOff.ok) return;
    expect(cutOff.problem).toContain("cut off");
    expect(cutOff.problem).not.toContain("not valid JSON");
    expect(readProviderCompletion({}).ok).toBe(false);
  });

  it("parses valid JSON and surfaces the validated value", async () => {
    const transport = new ScriptedTransport([providerPayload({ value: 1 })]);
    const completion = await completeJson({
      transport,
      apiKey: API_KEY,
      request: { system: "s", user: "u", maxTokens: 8_000 },
      idempotencyKey: "key-1",
      budget: 8_000,
      task: "task-a",
      validate: (value) => value
    });
    expect(completion.status).toBe("succeeded");
    if (completion.status !== "succeeded") return;
    expect(completion.value).toEqual({ value: 1 });
    expect(completion.attempts).toBe(1);
    expect(completion.usage).toEqual({ inputTokens: 12, outputTokens: 7 });
    expect(completion.idempotencyKey).toBe("key-1");
  });

  it("fresh-retries a truncated response without same-ceiling repair", async () => {
    const transport = new ScriptedTransport([
      providerPayload({ value: "cut off" }, { finishReason: "length" }),
      providerPayload({ value: "complete" })
    ]);
    const completion = await completeJson({
      transport,
      apiKey: API_KEY,
      request: { system: "s", user: "u", maxTokens: 8_000 },
      idempotencyKey: "key-2",
      budget: 8_000,
      task: "task-a",
      validate: (value) => value
    });
    expect(completion.status).toBe("succeeded");
    if (completion.status !== "succeeded") return;
    expect(completion.value).toEqual({ value: "complete" });
    expect(completion.attempts).toBe(2);
    expect(completion.usage).toEqual({ inputTokens: 24, outputTokens: 14 });
    const repairRequest = transport.requests[1];
    expect(repairRequest?.user).toBe("u");
    expect(repairRequest?.maxTokens).toBe(96_000);
  });

  it("fresh-retries an empty non-truncated response without JSON repair", async () => {
    const transport = new ScriptedTransport([
      {
        choices: [{ message: {}, finish_reason: "stop" }],
        usage: { prompt_tokens: 3, completion_tokens: 0 }
      },
      providerPayload({ value: "complete" })
    ]);
    const completion = await completeJson({
      transport,
      apiKey: API_KEY,
      request: { system: "s", user: "u", maxTokens: 8_000 },
      idempotencyKey: "key-empty",
      budget: 8_000,
      task: "task-a",
      validate: (value) => value
    });
    expect(completion.status).toBe("succeeded");
    expect(transport.requests).toHaveLength(2);
    expect(transport.requests[1]?.user).toBe("u");
    expect(transport.requests[1]?.maxTokens).toBe(96_000);
  });

  it("does not retry a second time after one schema repair", async () => {
    const transport = new ScriptedTransport([
      providerPayload({ value: "bad" }),
      providerPayload({ value: "still bad" }),
      providerPayload({ value: "good" })
    ]);
    const completion = await completeJson({
      transport,
      apiKey: API_KEY,
      request: { system: "s", user: "u", maxTokens: 8_000 },
      idempotencyKey: "key-3",
      budget: 8_000,
      task: "task-a",
      validate: (value) => {
        const record = value as { value?: string };
        if (record.value !== "good") throw new Error("AI_CONTRACT:value");
        return record.value;
      }
    });
    expect(completion.status).toBe("failed");
    expect(transport.requests).toHaveLength(2);
    expect(transport.requests.map((request) => request.maxTokens)).toEqual([8_000, 8_000]);
  });

  it("returns a structured failure with the API-consumption flag", async () => {
    const transport = new ScriptedTransport([providerPayload({ value: "bad" })]);
    const completion = await completeJson({
      transport,
      apiKey: API_KEY,
      request: { system: "s", user: "u", maxTokens: 16_000 },
      idempotencyKey: "key-4",
      budget: 16_000,
      task: "task-a",
      validate: () => {
        throw new Error("AI_CONTRACT:value");
      }
    });
    expect(completion.status).toBe("failed");
    if (completion.status !== "failed") return;
    expect(completion.failure).toMatchObject({ errorCode: "AI_CONTRACT", consumesApi: true });
    expect(completion.failure.detail).toBe("AI_CONTRACT:value");
    expect(completion.attempts).toBe(2);
    expect(transport.requests).toHaveLength(2);
    expect(transport.requests.map((request) => request.maxTokens)).toEqual([16_000, 16_000]);
  });

  it("does not repair an authentication failure", async () => {
    const transport = new ScriptedTransport(
      [],
      new Map([[1, new DeepSeekFailure("AI_AUTH", false, "This API key is not working")]])
    );
    const completion = await completeJson({
      transport,
      apiKey: API_KEY,
      request: { system: "s", user: "u", maxTokens: 8_000 },
      idempotencyKey: "key-5",
      budget: 8_000,
      task: "task-a",
      validate: (value) => value
    });
    expect(completion.status).toBe("failed");
    if (completion.status !== "failed") return;
    expect(completion.failure).toMatchObject({ errorCode: "AI_AUTH", consumesApi: false });
    expect(transport.requests).toHaveLength(1);
  });

  it("refuses to send a request that needs page images", async () => {
    const transport = deepSeekTransport();
    await expect(
      transport.complete(API_KEY, {
        system: "s",
        user: "u",
        maxTokens: 8_000,
        visualParts: [{ locator: "Page 1", dataUrl: "data:image/png;base64,AAAA" }]
      })
    ).rejects.toMatchObject({ code: "AI_CONTRACT" });
  });

  it("completes a workflow call through the envelope check", async () => {
    const call: AiCall = {
      task: "task-c",
      schemaVersion: TASK_C_SCHEMA,
      promptVersion: "task-c/1",
      idempotencyKey: "key-6",
      maxTokens: 8_000,
      system: "system",
      user: "user"
    };
    const transport = new ScriptedTransport([providerPayload(changeResponse("NEW"))]);
    const outcome = await completeWithRepair(call, API_KEY, transport);
    expect(outcome.call).toBe(call);
    expect(outcome.inputTokens).toBe(12);
    expect(outcome.outputTokens).toBe(7);

    const wrongEnvelope = new ScriptedTransport([providerPayload({ schema: TASK_A_SCHEMA })]);
    await expect(completeWithRepair(call, API_KEY, wrongEnvelope)).rejects.toBeInstanceOf(
      AiUnitFailure
    );
    await expect(completeWithRepair(call, API_KEY, wrongEnvelope)).rejects.toMatchObject({
      code: "AI_CONTRACT",
      retryable: true
    });
  });
});

describe("deterministic output guards", () => {
  it("rejects apply, notify and score instructions anywhere in a response", () => {
    expect(() => {
      assertNoProductInstructions({ changeResults: [{ auto_apply: true }] });
    }).toThrow(/forbidden_key/);
    expect(() => {
      assertNoProductInstructions({ nested: { list: [{ nextTask: "task-b" }] } });
    }).toThrow(/forbidden_key/);
    expect(() => {
      assertNoProductInstructions({ canonicalAssessmentProposals: [{ confidenceScore: 2 }] });
    }).toThrow(/forbidden_key/);
    expect(() => {
      assertNoProductInstructions({ changeResults: [{ changeType: "NEW" }] });
    }).not.toThrow();
  });

  it("chunks a short Source into exactly one unit of context", () => {
    const chunks = planChunks({ sourceId: SOURCE.sourceId, text: SOURCE.text, structure: [] });
    expect(chunks).toHaveLength(1);
  });
});
