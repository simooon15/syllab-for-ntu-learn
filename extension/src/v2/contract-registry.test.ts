import { describe, it, expect } from "vitest";
import { AI_SCHEMAS, canonicalEnvelope } from "./contract-registry";
import { completeWithRepair, AiUnitFailure } from "./deepseek-complete";
import { TASK_A_SCHEMA, TASK_B_SCHEMA, TASK_C_SCHEMA } from "./ai-contracts";
import { GROUNDED_B_SCHEMA } from "./task-b-grounding";
import { DEFERRAL_SCHEMA } from "./teaching-deferral";
import { ROUTING_SCHEMA } from "./exhaustive-routing";
import type { AiCall } from "./ai-pipeline";

describe("canonical AI contract identity", () => {
  it("accepts an omitted CourseDraft tag through the production provider boundary without skipping typed validation", async () => {
    const call: AiCall = {
      task: "task-b",
      schemaVersion: AI_SCHEMAS.courseDraft,
      promptVersion: "selective-draft/1:link",
      idempotencyKey: "synthetic",
      system: "synthetic",
      user: "synthetic",
      maxTokens: 8
    };
    const body = { entities: [], links: [], identities: [], reads: [] };
    let physical = 0,
      checks = 0;
    const transport = (content: unknown, finish = "stop") => ({
      complete: () => {
        physical++;
        return Promise.resolve({
          choices: [{ message: { content: JSON.stringify(content) }, finish_reason: finish }],
          usage: { prompt_tokens: 1, completion_tokens: 1 }
        });
      }
    });
    await completeWithRepair(call, "synthetic", transport(body), (result) => {
      checks++;
      expect(result).toEqual(body);
    });
    expect(checks).toBe(1);
    for (const [request, content, finish] of [
      [call, { ...body, schema: AI_SCHEMAS.b }, "stop"],
      [{ ...call, schemaVersion: AI_SCHEMAS.b }, body, "stop"],
      [call, body, "length"]
    ] as const)
      await expect(
        completeWithRepair(request, "synthetic", transport(content, finish), () => {
          checks++;
        })
      ).rejects.toBeInstanceOf(AiUnitFailure);
    expect(physical).toBe(4);
    expect(checks).toBe(1);
  });
  it("all registered exact envelopes preserve every field", () => {
    for (const schema of Object.values(AI_SCHEMAS)) {
      const original = { schema, pending: ["a"], evidence: { locator: "exact" } };
      expect(canonicalEnvelope(original, schema)).toEqual({ value: original });
    }
    expect([
      TASK_A_SCHEMA,
      TASK_B_SCHEMA,
      GROUNDED_B_SCHEMA,
      TASK_C_SCHEMA,
      DEFERRAL_SCHEMA,
      ROUTING_SCHEMA
    ]).toEqual([
      AI_SCHEMAS.a,
      AI_SCHEMAS.b,
      AI_SCHEMAS.groundedB,
      AI_SCHEMAS.c,
      AI_SCHEMAS.teaching,
      AI_SCHEMAS.routing
    ]);
  });
  it("never repairs versions, enums, fields, guessed aliases or task identity", () => {
    for (const schema of ["syllab.ai/task-c/1", "syllab.ai/task-b/3", AI_SCHEMAS.a])
      expect(
        canonicalEnvelope({ schema, sourceResult: "unsupported" }, AI_SCHEMAS.groundedB).repair
      ).toBeUndefined();
    const original = {
      schema: "syllab.ai/task-a/1",
      sourceResult: "unsupported",
      evidence: { locator: "exact" }
    };
    const repaired = canonicalEnvelope(original, AI_SCHEMAS.a);
    expect(repaired.value).toEqual({ ...original, schema: AI_SCHEMAS.a });
    expect(original.schema).toBe("syllab.ai/task-a/1");
  });
  it("the shared provider boundary repairs the observed identity and still runs item validation", async () => {
    const call: AiCall = {
      task: "task-b",
      schemaVersion: AI_SCHEMAS.groundedB,
      promptVersion: "synthetic",
      idempotencyKey: "synthetic",
      system: "synthetic",
      user: "synthetic",
      maxTokens: 1
    };
    let calls = 0,
      checks = 0;
    const transport = {
      complete: () => {
        calls++;
        return Promise.resolve({
          choices: [
            {
              message: { content: JSON.stringify({ schema: "syllab.ai/task-b/2", items: [] }) },
              finish_reason: "stop"
            }
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1 }
        });
      }
    };
    const result = await completeWithRepair(call, "synthetic", transport, () => {
      checks++;
    });
    expect(result.compatibilityRepair?.kind).toBe("deterministic_compat_repair");
    expect(checks).toBe(1);
    await expect(
      completeWithRepair(call, "synthetic", transport, () => {
        throw Error("UNSUPPORTED_DEPENDENCY");
      })
    ).rejects.toBeInstanceOf(AiUnitFailure);
    expect(calls).toBe(2); // One per separately injected physical request; no automatic semantic repair.
  });
});

it("repairs the observed B2 schema alias without changing payload fields or task versions", () => {
  const original = {
    schema: "syllab.ai/task-b/1",
    upstream: { groupId: "g" },
    canonicalAssessmentProposals: [{ proposalId: "p" }]
  };
  const normalized = canonicalEnvelope(original, AI_SCHEMAS.b);
  expect(normalized.value).toEqual({ ...original, schema: AI_SCHEMAS.b });
  expect(normalized.repair?.kind).toBe("deterministic_compat_repair");
  expect(canonicalEnvelope(original, AI_SCHEMAS.groundedB).repair).toBeUndefined();
});

it("repairs only the observed exact C schema alias without changing Evidence", () => {
  const value = {
    schema: "syllab.ai/task-c/1",
    changeResults: [{ currentEvidence: ["old"], newEvidence: ["new"] }]
  };
  expect(canonicalEnvelope(value, AI_SCHEMAS.c).value).toEqual({ ...value, schema: AI_SCHEMAS.c });
  expect(canonicalEnvelope(value, AI_SCHEMAS.b).repair).toBeUndefined();
});
