import { describe, expect, it } from "vitest";
import { runSession, type SessionPort } from "./architecture-runner";
import {
  beginRound,
  semanticRoundMaximum,
  newSession,
  applyReply,
  digest,
  SESSION_SCHEMA,
  requireValue,
  type Session,
  type PhysicalRequest
} from "./architecture-session";
import { emptyRegistry, applyOperations, validateRegistry } from "./progressive-registry";
import { bootstrap, resolveReads } from "./course-read";
import { compareNativeSignals } from "./native-signal";
import type { SourceRecord } from "./schema";

function harness(
  respond: (delivery: Record<string, unknown>, ordinal: number) => unknown,
  fits?: (text: string) => boolean
) {
  let saved: Session | undefined;
  let calls = 0;
  // Existing transport fixtures freeze the prior /3 wire; /4 dictionary has separate coverage.
  const port: SessionPort = {
    semanticPolicy: "assessment-relevance/3",
    load: () => Promise.resolve(saved && structuredClone(saved)),
    save: (s) => {
      saved = structuredClone(s);
      return Promise.resolve();
    },
    execute: (call) =>
      Promise.resolve({
        call,
        value: respond(JSON.parse(call.user) as Record<string, unknown>, calls++),
        consumesApi: false
      }),
    resolve: (reads) => Promise.resolve(reads),
    validateFinal: (output) => {
      if (!output) throw Error("INVALID_FINAL");
    },
    ...(fits ? { fits } : {})
  };
  return { port, saved: () => requireValue(saved), calls: () => calls };
}
const reply = (delivery: Record<string, unknown>, kind: string, extra = {}) => ({
  schema: SESSION_SCHEMA,
  roundId: delivery.roundId,
  segmentId: delivery.segmentId,
  kind,
  carry: { registryRef: "persistent" },
  ...extra
});

describe("new architecture transport and semantic accounting", () => {
  it("delivers all Unicode input in one semantic round and reuses FINAL without dispatch", async () => {
    const fragments: string[] = [];
    const h = harness(
      (d) => {
        fragments.push(String(d.delivery));
        return reply(
          d,
          d.lastSegment ? "ROUND_COMPLETE_FINAL" : "DELIVERY_ACK",
          d.lastSegment ? { output: { done: true } } : {}
        );
      },
      (t) => t.length <= 7
    );
    const input = { text: "a🌏bc🌏".repeat(30) };
    expect(await runSession("one", "B1", input, h.port)).toEqual({ done: true });
    expect(JSON.parse(fragments.join(""))).toEqual(input);
    expect(h.saved().effectiveRounds).toBe(1);
    expect(h.calls()).toBeGreaterThan(7);
    const calls = h.calls();
    await runSession("one", "B1", input, h.port);
    expect(h.calls()).toBe(calls);
  });
  it("charges new Evidence reads to new rounds, requires FINAL at maximum", async () => {
    const h = harness((d, n) =>
      reply(
        d,
        n < 2 ? "ROUND_COMPLETE_CONTINUE" : "ROUND_COMPLETE_FINAL",
        n < 2
          ? { requestedReads: [{ kind: "object", id: String(n) }] }
          : { output: { uncertainty: true } }
      )
    );
    await runSession("c", "C", {}, h.port);
    expect(h.saved().effectiveRounds).toBe(3);
    expect(h.saved().rounds.at(-1)?.finalizationRequired).toBe(true);
    expect(new Set(h.saved().requests.map((r) => r.roundId)).size).toBe(3);
  });
  it("assembles segmented AI JSON by bytes without new semantic rounds", async () => {
    const h = harness((d, n) =>
      reply(d, n ? "ROUND_COMPLETE_FINAL" : "ROUND_OUTPUT_SEGMENT", {
        output: n ? "true}" : '{"done":'
      })
    );
    expect(await runSession("output", "B1", {}, h.port)).toEqual({ done: true });
    expect(h.saved().effectiveRounds).toBe(1);
    expect(h.calls()).toBe(2);
  });
  it("captured response recovery dispatches nothing and applies once", async () => {
    const s = {
      ...newSession("recover", "B2", digest({})),
      semanticPolicy: "assessment-relevance/3" as const
    };
    const r = beginRound(s, {}, "INITIAL");
    const p: PhysicalRequest = {
      id: "p",
      roundId: r.id,
      segmentId: requireValue(r.segments[0]).id,
      request: "{}",
      state: "captured",
      response: reply(
        { roundId: r.id, segmentId: requireValue(r.segments[0]).id },
        "ROUND_COMPLETE_FINAL",
        {
          output: { done: true }
        }
      )
    };
    s.requests.push(p);
    const h = harness(() => {
      throw Error("NO_DISPATCH");
    });
    await h.port.save(s);
    await runSession("recover", "B2", {}, h.port);
    expect(h.calls()).toBe(0);
    expect(h.saved().effectiveRounds).toBe(1);
    expect(applyReply(h.saved(), requireValue(h.saved().requests[0]))).toBeUndefined();
  });
  it("does not redispatch ambiguous sent requests", async () => {
    const s = {
      ...newSession("sent", "B2", digest({})),
      semanticPolicy: "assessment-relevance/3" as const
    };
    const r = beginRound(s, {}, "INITIAL");
    s.requests.push({
      id: "sent",
      roundId: r.id,
      segmentId: requireValue(r.segments[0]).id,
      request: "{}",
      state: "dispatched"
    });
    const h = harness(() => {
      throw Error("NO_DISPATCH");
    });
    await h.port.save(s);
    await expect(runSession("sent", "B2", {}, h.port)).rejects.toThrow("PAID_UNVERIFIED");
    expect(h.calls()).toBe(0);
  });
  it("rejects frozen-input drift and premature semantic completion", async () => {
    const h = harness(
      (d) => reply(d, "ROUND_COMPLETE_FINAL", { output: {} }),
      (t) => t.length < 4
    );
    await expect(runSession("early", "B1", { big: "abc" }, h.port)).rejects.toThrow(
      "ROUND_BEFORE_DELIVERY_COMPLETE"
    );
    await expect(runSession("early", "B1", { big: "changed" }, h.port)).rejects.toThrow(
      "SESSION_SNAPSHOT"
    );
  });
});

describe("Registry accounting and scoped reads", () => {
  it("persists idempotent AI operations and rejects alias/CAS collisions or lost input", () => {
    const op = {
      id: "o",
      recordId: "g",
      expectedRevision: 0,
      kind: "put",
      record: { id: "g", revision: 1, kind: "group", payload: { memberDraftIds: ["d"] } }
    };
    const registry = applyOperations(emptyRegistry(), [op]);
    expect(applyOperations(registry, [op])).toEqual(registry);
    expect(() => applyOperations(registry, [{ ...op, recordId: "other" }])).toThrow(
      "OPERATION_COLLISION"
    );
    expect(() => validateRegistry(registry, ["d"], [])).toThrow("DISPOSITION_MISSING");
    expect(emptyRegistry().records).toEqual([]);
  });
  const source: SourceRecord = {
    sourceId: "s",
    courseId: "c",
    nativeItemId: "n",
    kind: "attachment",
    title: "Synthetic",
    updatedAt: "now",
    parsed: {
      text: "abc🌏xyz",
      structure: [],
      units: [
        { locator: "p1", text: "abc🌏xyz", partial: false },
        { locator: "p2", text: "later", partial: false }
      ]
    }
  };
  it("bootstraps native order and exposes omitted locators without relevance selection", () => {
    expect(bootstrap(source).initialContent.map((u) => u.locator)).toEqual(["p1"]);
    expect(bootstrap(source).omittedLocators).toEqual(["p2"]);
    expect(bootstrap({ ...source, kind: "announcement" }).initialContent).toHaveLength(2);
  });
  it("protects source scope, snapshot and Unicode range", () => {
    const scope = { sources: [source], evidence: [], objects: {} };
    expect(
      resolveReads([{ kind: "range", sourceId: "s", locator: "p1", start: 4, end: 5 }], scope)[0]
    ).toMatchObject({ text: "🌏", start: 3, end: 5 });
    expect(() =>
      resolveReads([{ kind: "range", sourceId: "other", locator: "p1" }], scope)
    ).toThrow("READ_UNAUTHORIZED_SOURCE");
    expect(() =>
      resolveReads([{ kind: "metadata", sourceId: "s", snapshot: "stale" }], scope)
    ).toThrow("READ_STALE_SNAPSHOT");
  });
  it("unqualified native identity falls back to hashes; partial/version drift stays incomparable", () => {
    const machine = {
      sourceId: "s",
      canonicalMetadataHash: "m",
      contentHash: "a",
      structureHash: "s",
      representationVersion: 1
    };
    expect(
      compareNativeSignals(undefined, undefined, machine, { ...machine, contentHash: "b" }, true)
    ).toBe("machine-different");
    expect(compareNativeSignals(undefined, undefined, machine, machine, false)).toBe(
      "incomparable"
    );
    expect(
      compareNativeSignals(
        undefined,
        undefined,
        machine,
        { ...machine, representationVersion: 2 },
        true
      )
    ).toBe("incomparable");
  });
});

describe("continuation safety qualification", () => {
  it("retrieves oversized authored carry by resumable transport in the same round", async () => {
    const received: string[] = [];
    let initial = true;
    let awaitingRead = false;
    const h = harness(
      (d) => {
        if (initial) {
          initial = false;
          awaitingRead = true;
          return reply(d, "TRANSPORT_CONTINUE", { carry: { authored: "🌏".repeat(200) } });
        }
        if (awaitingRead) {
          awaitingRead = false;
          const ref = d.carryRef as { id: string };
          return reply(d, "TRANSPORT_CONTINUE", {
            requestedTransportReads: [{ kind: "object", id: ref.id }]
          });
        }
        received.push(String(d.delivery));
        return reply(
          d,
          d.lastSegment ? "ROUND_COMPLETE_FINAL" : "DELIVERY_ACK",
          d.lastSegment ? { output: { done: true } } : {}
        );
      },
      (text) => text.length < 30
    );
    h.port.resolveTransport = () => Promise.reject(Error("EXTERNAL_READ_FORBIDDEN"));
    await runSession("carry", "B1", {}, h.port);
    expect(JSON.parse(received.join(""))).toMatchObject([
      { payload: { authored: "🌏".repeat(200) } }
    ]);
    expect(h.saved().effectiveRounds).toBe(1);
    expect(h.saved().requests.every((r) => !r.request.includes("🌏".repeat(200)))).toBe(true);
  });
  it("renders visual descriptors before dispatch, keeps binary out of the ledger", async () => {
    const h = harness((d, n) =>
      reply(
        d,
        n ? "ROUND_COMPLETE_FINAL" : "ROUND_COMPLETE_CONTINUE",
        n
          ? { output: { done: true } }
          : { requestedReads: [{ kind: "visual", sourceId: "s", locator: "p1" }] }
      )
    );
    h.port.prepareVisuals = (refs) =>
      Promise.resolve(
        refs.map((r) => ({ locator: r.locator, dataUrl: "data:image/png;base64,SYNTHETIC" }))
      );
    const original = h.port.execute.bind(h.port);
    h.port.execute = (call) => {
      if (call.visualParts?.length) expect(call.visualParts[0]?.dataUrl).toContain("SYNTHETIC");
      return original(call);
    };
    await runSession("visual", "A", {}, h.port);
    expect(h.saved().renderedRefs).toEqual(["s:p1"]);
    expect(JSON.stringify(h.saved())).not.toContain("base64");
  });
  it("empty renderer is a technical failure, never an extra provider dispatch", async () => {
    const h = harness((d) =>
      reply(d, "ROUND_COMPLETE_CONTINUE", {
        requestedReads: [{ kind: "visual", sourceId: "s", locator: "p1" }]
      })
    );
    h.port.prepareVisuals = () => Promise.resolve([]);
    await expect(runSession("empty-visual", "A", {}, h.port)).rejects.toThrow(
      "VISUAL_RENDER_INCOMPLETE"
    );
    expect(h.calls()).toBe(1);
    expect(h.saved().state).toBe("failed");
  });
  it("out-of-order response cannot advance cursor or consume semantic budget", () => {
    const s = newSession("order", "B1", digest({}));
    const r = beginRound(s, { text: "large" }, "INITIAL", (t) => t.length < 5);
    expect(() =>
      applyReply(s, {
        id: "x",
        roundId: r.id,
        segmentId: requireValue(r.segments[1]).id,
        state: "captured",
        request: "",
        response: {}
      })
    ).toThrow("DELIVERY_ORDER");
    expect(s.effectiveRounds).toBe(0);
    expect(r.cursor).toBe(0);
  });
  it("Registry revisions retain prior provenance and retirement cannot silently reuse an alias", () => {
    const record = { id: "g", revision: 1, kind: "group", payload: { memberDraftIds: ["early"] } };
    const first = applyOperations(emptyRegistry(), [
      { id: "a", recordId: "g", expectedRevision: 0, kind: "put", record }
    ]);
    const second = applyOperations(first, [
      {
        id: "b",
        recordId: "g",
        expectedRevision: 1,
        kind: "put",
        record: { ...record, revision: 2, payload: { memberDraftIds: ["early", "late"] } }
      }
    ]);
    expect(second.versions[0]?.payload.memberDraftIds).toEqual(["early"]);
    expect(second.versions[1]?.payload.memberDraftIds).toEqual(["early", "late"]);
    const retired = applyOperations(second, [
      {
        id: "r",
        recordId: "g",
        expectedRevision: 2,
        kind: "retire",
        reason: "AI split",
        replacementRefs: []
      }
    ]);
    expect(() =>
      applyOperations(retired, [
        { id: "c", recordId: "g", expectedRevision: 0, kind: "put", record }
      ])
    ).toThrow("RETIRED_ALIAS_REUSE");
  });
});

it("normalizes only the registered nested Task A schema alias and preserves captured response", async () => {
  const h = harness((d) =>
    reply(d, "ROUND_COMPLETE_FINAL", { output: { schema: "syllab.ai/task-a/1", done: true } })
  );
  h.port.validateFinal = (output) => {
    expect((output as { schema: string }).schema).toBe("syllab.ai.task-a/1");
  };
  expect(await runSession("nested-alias", "A", {}, h.port)).toEqual({
    schema: "syllab.ai.task-a/1",
    done: true
  });
  expect(h.calls()).toBe(1);
  expect((h.saved().requests[0]?.response as { output: { schema: string } }).output.schema).toBe(
    "syllab.ai/task-a/1"
  );
  expect(h.saved().compatibilityRepairs).toHaveLength(1);
  await runSession("nested-alias", "A", {}, h.port);
  expect(h.calls()).toBe(1);
});

describe("one B2 Group shared semantic budget across phases", () => {
  it("reserves synthesis and never doubles the Product maximum4", () => {
    const facets: Session = {
      ...newSession("facet-budget", "B2", "s"),
      semanticPolicy: "assessment-relevance/4",
      b2Phase: "facets",
      precedingSemanticRounds: 0
    };
    expect(semanticRoundMaximum(facets)).toBe(3);
    const synthesis: Session = {
      ...newSession("synthesis-budget", "B2", "s"),
      semanticPolicy: "assessment-relevance/4",
      b2Phase: "synthesis",
      precedingSemanticRounds: 3
    };
    const r = beginRound(synthesis, {}, "INITIAL");
    expect(r.finalizationRequired).toBe(true);
    r.complete = true;
    synthesis.effectiveRounds = 1;
    expect(() => beginRound(synthesis, {}, "AI_REQUESTED_READ")).toThrow("SEMANTIC_BUDGET");
    expect(() => semanticRoundMaximum({ ...synthesis, precedingSemanticRounds: 4 })).toThrow(
      "B2_PHASE_BUDGET"
    );
  });
  it("does not reset the carried phase count on saved FINAL reuse", async () => {
    const snapshot = digest({ evidenceCatalog: {}, semanticPhase: "standard" });
    const saved: Session = {
      ...newSession("budget-drift", "B2", snapshot),
      semanticPolicy: "assessment-relevance/4",
      b2Phase: "synthesis",
      precedingSemanticRounds: 1,
      state: "final",
      output: {}
    };
    await expect(
      runSession(
        "budget-drift",
        "B2",
        {},
        {
          semanticPolicy: "assessment-relevance/4",
          precedingSemanticRounds: 2,
          load: () => Promise.resolve(saved),
          save: () => Promise.resolve(),
          resolve: () => Promise.resolve([]),
          execute: () => Promise.reject(Error("NO_DISPATCH")),
          validateFinal: () => {}
        }
      )
    ).rejects.toThrow("B2_PHASE_BUDGET_DRIFT");
  });
});
