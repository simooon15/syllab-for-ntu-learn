import { describe, it, expect } from "vitest";
import { AI_SCHEMAS, canonicalEnvelope } from "./contract-registry";
import {
  runPhysicalWork,
  packLogicalInputs,
  newPhysicalLedger,
  assertPhysicalAccounting
} from "./physical-work";
import { AiUnitFailure, completeWithRepair } from "./deepseek-complete";
import type { AiCall } from "./ai-pipeline";
const input = (id: string, text = "Synthetic α🌏"): { id: string; call: AiCall } => ({
  id,
  call: {
    task: "task-a",
    schemaVersion: AI_SCHEMAS.a,
    promptVersion: "test",
    idempotencyKey: id,
    system: "Synthetic",
    user: text,
    maxTokens: 1
  }
});
const reply = (call: AiCall, bad?: string) => ({
  call,
  value: {
    schema: AI_SCHEMAS.physical,
    items: (
      JSON.parse(call.user) as { pending: Array<{ unitId: string; finalInputFragment: boolean }> }
    ).pending.map((p) =>
      p.finalInputFragment
        ? {
            unitId: p.unitId,
            complete: true,
            value: { schema: AI_SCHEMAS.a, sourceId: p.unitId, valid: p.unitId !== bad }
          }
        : {
            unitId: p.unitId,
            complete: false,
            continuationState: { schema: AI_SCHEMAS.a, sourceId: p.unitId, valid: true }
          }
    )
  }
});
const validate = (id: string, v: unknown) => {
  const x = v as { sourceId: string; valid: boolean };
  if (x.sourceId !== id || !x.valid) throw Error("UNIT_CONTRACT");
  return v;
};
const options = (inputs: ReturnType<typeof input>[]) => ({
  identity: "test",
  owner: "o",
  session: "s",
  inputs,
  mainWaves: 2 as const,
  recoveryWaves: 0 as const,
  concurrency: 10,
  persist: async () => {},
  dispatch: (call: AiCall) => Promise.resolve(reply(call)),
  validate
});
describe("Gate A logical/physical work", () => {
  it("balances mixed measured sizes, preserving all IDs and Unicode input", () => {
    const units = Array.from({ length: 109 }, (_, i) => input(String(i), "🌏".repeat(i + 1)));
    const bins = packLogicalInputs(units, 20);
    expect(bins).toHaveLength(20);
    expect(
      bins
        .flat()
        .map((u) => u.id)
        .sort()
    ).toEqual(units.map((u) => u.id).sort());
    expect(new Set(bins.flat().map((u) => u.id)).size).toBe(109);
  });
  it("109 Sources use 20 injected requests in two Product waves, without a per-batch Source cap", async () => {
    const l = await runPhysicalWork(
      options(Array.from({ length: 109 }, (_, i) => input(String(i))))
    );
    expect(l.units.filter((u) => u.status === "verified")).toHaveLength(109);
    expect(l.requests).toHaveLength(20);
    expect(new Set(l.requests.map((r) => r.wave)).size).toBe(2);
    expect(l.requests.some((r) => r.unitIds.length > 1)).toBe(true);
    assertPhysicalAccounting(l);
  });
  it("pre-generation request refusal partitions exact Unicode single-Source input", async () => {
    const text = "α🌏abcdefg";
    const seen: string[] = [];
    const o = options([input("A", text)]);
    o.concurrency = 1;
    let calls = 0;
    const l = await runPhysicalWork({
      ...o,
      dispatch: async (call) => {
        calls++;
        const body = JSON.parse(call.user) as { pending: Array<{ fragment: string }> };
        const p = body.pending[0];
        if (!p) throw Error("MISSING_TEST_UNIT");
        if (p.fragment === text)
          throw new AiUnitFailure({
            errorCode: "AI_PROVIDER",
            consumesApi: false,
            preGenerationBoundary: true
          });
        seen.push(p.fragment);
        return await Promise.resolve(reply(call));
      }
    });
    expect(seen.join("")).toBe(text);
    expect(calls).toBe(3);
    expect(l.units[0]?.status).toBe("verified");
  });
  it("preserves valid siblings and only retries failed units in an authorized recovery wave", async () => {
    const inputs = Array.from({ length: 30 }, (_, i) => input(String(i)));
    const l = await runPhysicalWork({
      ...options(inputs),
      recoveryWaves: 1,
      dispatch: (call) => Promise.resolve(reply(call, "0"))
    });
    expect(l.units.filter((u) => u.status === "verified")).toHaveLength(29);
    expect(l.units[0]?.status).toBe("unresolved");
    expect(
      l.requests.filter((r) => r.wave.startsWith("recovery")).every((r) => r.unitIds.join() === "0")
    ).toBe(true);
  });
  it("unknown dispatch is paid-unverified, stops admission, and never retries it", async () => {
    let paid = 0;
    const o = options(Array.from({ length: 109 }, (_, i) => input(String(i))));
    o.concurrency = 1;
    const l = await runPhysicalWork({
      ...o,
      recoveryWaves: 2,
      dispatch: async () => {
        paid++;
        await Promise.resolve();
        throw new AiUnitFailure({ errorCode: "NETWORK_TRANSIENT", consumesApi: true });
      }
    });
    expect(paid).toBe(1);
    expect(l.units.some((u) => u.status === "paid-unverified")).toBe(true);
    expect(l.units.some((u) => u.status === "pending")).toBe(false);
  });
  it("new-session restart reuses completed raw and never regenerates closed work", async () => {
    const o = options([input("A"), input("B")]);
    const l = await runPhysicalWork(o);
    let paid = 0;
    const resumed = await runPhysicalWork({
      ...o,
      existing: structuredClone(l),
      session: "new",
      dispatch: async (call) => {
        paid++;
        return await Promise.resolve(reply(call));
      }
    });
    expect(paid).toBe(0);
    expect(resumed.units.every((u) => u.status === "verified")).toBe(true);
    const uncertain = newPhysicalLedger("test", [input("A")], "old", "old");
    uncertain.requests = l.requests
      .slice(0, 1)
      .map((r) => ({ ...r, state: "dispatched" as const, raw: undefined }));
    const result = await runPhysicalWork({
      ...options([input("A")]),
      existing: uncertain,
      dispatch: async (call) => {
        paid++;
        return await Promise.resolve(reply(call));
      }
    });
    expect(result.units[0]?.status).toBe("paid-unverified");
    expect(paid).toBe(0);
  });
  it("length response keeps exact complete items; half-item is never synthesized", async () => {
    const call = {
      ...input("A").call,
      schemaVersion: AI_SCHEMAS.physical,
      physicalWorkContinuation: true,
      providerRequestCompatibility: "provider-default" as const
    };
    const raw = `{"schema":"${AI_SCHEMAS.physical}","items":[{"unitId":"A","complete":true,"value":{}},{"unitId":"B"`;
    const outcome = await completeWithRepair(call, "synthetic", {
      complete: () =>
        Promise.resolve({
          choices: [{ message: { content: raw }, finish_reason: "length" }],
          usage: { prompt_tokens: 1, completion_tokens: 1 }
        })
    });
    expect((outcome.value as { items: unknown[] }).items).toHaveLength(1);
  });
  it("a stateless intermediate fragment requires explicit model state and passes it to closure", async () => {
    const o = options([input("A", "abcdef")]);
    let first = true;
    let stateObserved = false;
    const l = await runPhysicalWork({
      ...o,
      dispatch: async (call) => {
        const body = JSON.parse(call.user) as {
          pending: Array<{
            fragment: string;
            finalInputFragment: boolean;
            continuationState?: unknown;
          }>;
        };
        if (first) {
          first = false;
          throw new AiUnitFailure({
            errorCode: "AI_PROVIDER",
            consumesApi: false,
            preGenerationBoundary: true
          });
        }
        if (body.pending[0]?.finalInputFragment)
          stateObserved = body.pending[0].continuationState !== undefined;
        return await Promise.resolve(reply(call));
      }
    });
    expect(stateObserved).toBe(true);
    expect(l.units[0]?.status).toBe("verified");
    first = true;
    const missing = await runPhysicalWork({
      ...o,
      dispatch: async (call) => {
        if (first) {
          first = false;
          throw new AiUnitFailure({
            errorCode: "AI_PROVIDER",
            consumesApi: false,
            preGenerationBoundary: true
          });
        }
        return await Promise.resolve({ call, value: { schema: AI_SCHEMAS.physical, items: [] } });
      }
    });
    expect(missing.units[0]?.status).toBe("unresolved");
    expect(missing.units[0]?.error).toBe("PHYSICAL_CONTINUATION_STATE_MISSING");
  });
  it("completed physical raw survives a post-dispatch storage fault and different restart packing", async () => {
    const o = options([input("A"), input("B"), input("C")]);
    o.concurrency = 1;
    let snapshot = newPhysicalLedger(o.identity, o.inputs, o.owner, o.session);
    let calls = 0;
    await expect(
      runPhysicalWork({
        ...o,
        persist: (l) => {
          snapshot = structuredClone(l);
          if (l.requests.some((r) => r.state === "completed"))
            return Promise.reject(Error("INJECTED_CHECKPOINT_FAULT"));
          return Promise.resolve();
        },
        dispatch: (call) => {
          calls++;
          return Promise.resolve(reply(call));
        }
      })
    ).rejects.toThrow("INJECTED_CHECKPOINT_FAULT");
    const savedId = snapshot.requests[0]?.id;
    const resumed = await runPhysicalWork({
      ...o,
      existing: snapshot,
      concurrency: 10,
      session: "new-session",
      dispatch: (call) => {
        calls++;
        return Promise.resolve(reply(call));
      }
    });
    expect(resumed.requests.find((r) => r.id === savedId)?.state).toBe("applied");
    expect(resumed.units.every((u) => u.status === "verified")).toBe(true);
    expect(calls).toBe(2);
  });
  it("unknown/closed output cannot overwrite a sibling and remains an explicit diagnostic", async () => {
    const o = options([input("A")]);
    const l = await runPhysicalWork({
      ...o,
      dispatch: (call) => {
        const response = reply(call);
        response.value.items.push({
          unitId: "foreign",
          complete: true,
          value: { schema: AI_SCHEMAS.a, sourceId: "foreign", valid: true }
        });
        return Promise.resolve(response);
      }
    });
    expect(l.units[0]?.status).toBe("verified");
    expect(l.requests[0]?.diagnostics).toContain("PHYSICAL_UNKNOWN_OR_CLOSED_OUTPUT_ID");
  });
  it("canonical registry permits only the observed unique aliases, with unchanged semantics", () => {
    for (const [from, to] of [
      ["syllab.ai/task-a/1", AI_SCHEMAS.a],
      ["syllab.ai/task-b/2", AI_SCHEMAS.groundedB],
      ["syllab.ai/task-b/1", AI_SCHEMAS.b],
      ["syllab.ai/task-c/1", AI_SCHEMAS.c]
    ]) {
      const raw = { schema: from, items: [{ evidence: "unchanged", meaning: "UNCHANGED" }] };
      const x = canonicalEnvelope(raw, to ?? "");
      expect(x.repair?.kind).toBe("deterministic_compat_repair");
      expect((x.value as typeof raw).items).toBe(raw.items);
    }
    expect(
      canonicalEnvelope({ schema: "syllab.ai/task-c/2" }, AI_SCHEMAS.c).repair
    ).toBeUndefined();
  });
});
