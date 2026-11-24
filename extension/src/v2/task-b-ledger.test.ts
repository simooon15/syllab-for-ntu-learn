import { describe, it, expect } from "vitest";
import {
  newBLedger,
  splitBPart,
  applyBResponse,
  completePrefixItems,
  stopBLedger,
  assertBLedgerAccounting
} from "./task-b-ledger";
import { evidenceRegistry } from "./task-b-grounding";
import { completeWithRepair, AiUnitFailure } from "./deepseek-complete";
import { DeepSeekFailure, DeepSeekTransport } from "./deepseek";
import { requestBoundary } from "./provider-request";
import type { AiCall } from "./ai-pipeline";
const at = "2026-10-06T00:00:00Z";
const evidence = [{ evidenceId: "ev", sourceId: "A", locator: "p1", excerpt: "Synthetic" }];
const alias = [...evidenceRegistry(evidence).keys()][0] ?? "";
const sources = new Set(["A", "B", "C"]);
function item(id = "a", refs = ["A"], dependencies: string[] = []) {
  return {
    itemId: id,
    inputRefs: refs,
    dependencies,
    category: "canonicalAssessmentProposals",
    payload: {
      proposalId: id,
      canonicalName: "Synthetic",
      type: "other",
      role: "assessment",
      aliases: [],
      consolidatedFields: [],
      requirements: [],
      supportingEvidence: [alias],
      unresolvedIssues: []
    }
  };
}
const envelope = (items: unknown[], closure?: unknown) => ({
  schema: "syllab.ai.task-b/2",
  items,
  ...(closure ? { closure } : {})
});
const close = (refs: string[], ids: string[]) => ({
  scopeRefs: refs,
  dispositions: refs.map((ref) => ({
    ref,
    status: "resolved",
    reason: "Model judgment",
    itemIds: ids
  }))
});
const call: AiCall = {
  task: "task-b",
  schemaVersion: "syllab.ai.task-b/2",
  promptVersion: "task-b/4",
  idempotencyKey: "p",
  maxTokens: 1,
  system: "Synthetic",
  user: "{}",
  providerRequestCompatibility: "provider-default",
  taskBPhysicalContinuation: true
};
describe("Task B logical work ledger", () => {
  it("checkpoints selected independent identity despite an invalid canonical sibling, with explicit diagnostics", () => {
    const identity = {
      itemId: "identity",
      category: "identityResolutions",
      inputRefs: ["A"],
      dependencies: [],
      payload: {
        involvedObjectIds: ["A"],
        relationship: "UNCERTAIN",
        supportingEvidence: [alias],
        contradictoryEvidence: [],
        judgmentBasis: "Synthetic supplied evidence does not settle identity"
      }
    };
    const invalid = {
      ...item("bad"),
      payload: {
        ...item("bad").payload,
        consolidatedFields: [{ fieldName: "due", value: "unsupported shape", evidence: [alias] }]
      }
    };
    const l = applyBResponse(
      newBLedger("independent", ["A"], "input", evidence, at),
      envelope([identity, invalid], close(["A"], ["identity", "bad"])),
      sources,
      at
    );
    expect(l.final.result.identityResolutions).toHaveLength(1);
    expect(l.final.result.canonicalAssessmentProposals).toHaveLength(0);
    expect(l.final.items.find((i) => i.itemId === "bad")?.error).toBe("B_FIELD_SHAPE");
    expect(l.dispositionErrors.some((i) => i.error === "B_DISPOSITION_PARTIAL_ITEM_SUPPORT")).toBe(
      true
    );
    expect(l.processedRefs).toEqual(["A"]);
    expect(l.status).toBe("partial");
    assertBLedgerAccounting(l);
    const unselected = applyBResponse(
      newBLedger("unselected", ["A"], "input", evidence, at),
      envelope([identity, invalid], close(["A"], ["bad"])),
      sources,
      at
    );
    expect(unselected.final.result.identityResolutions).toHaveLength(0);
    expect(unselected.unresolved).toHaveLength(1);
  });
  it("splits actual rejected input without dropping a Unicode byte or imposing a partition count", () => {
    let ledger = newBLedger("b", ["A", "B", "C"], "α🌏abcdef", evidence, at);
    const original = ledger.parts.map((p) => p.text).join("");
    ledger = splitBPart(ledger);
    ledger = splitBPart(ledger);
    expect(ledger.parts.map((p) => p.text).join("")).toBe(original);
    expect(ledger.requiredRefs).toEqual(["A", "B", "C"]);
    assertBLedgerAccounting(ledger);
  });
  it("does not canonicalize A/B before C can change their identity", () => {
    let l = splitBPart(newBLedger("b", ["A", "B", "C"], "ABCDEF", evidence, at));
    l = applyBResponse(
      l,
      envelope([item("ab", ["A", "B"])], close(["A", "B", "C"], ["ab"])),
      sources,
      at
    );
    expect(l.final.result.canonicalAssessmentProposals).toHaveLength(0);
    const revised = item("abc", ["A", "B", "C"]);
    l = applyBResponse(
      l,
      envelope([revised], {
        ...close(["A", "B", "C"], ["abc"]),
        discardedCandidates: [{ itemId: "ab", reason: "Model revises global identity after C" }]
      }),
      sources,
      at
    );
    expect(l.status).toBe("complete");
    expect(l.final.result.canonicalAssessmentProposals).toHaveLength(1);
    // Only the model-selected global closure becomes final; the A/B candidate remains provisional.
    assertBLedgerAccounting(l);
  });
  it("keeps complete length-prefix items provisional and excludes a half-written item", () => {
    const raw = `{"schema":"syllab.ai.task-b/2","items":[${JSON.stringify(item())},{"itemId":"half"`;
    expect(completePrefixItems(raw)).toEqual([item()]);
    expect(completePrefixItems(raw.replace("syllab.ai.task-b/2", "syllab.ai/task-b/2"))).toEqual([
      item()
    ]);
    expect(completePrefixItems(raw.replace("syllab.ai.task-b/2", "syllab.ai.task-b/1"))).toEqual(
      []
    );
    let l = newBLedger("b", ["A"], "context", evidence, at);
    l = applyBResponse(
      l,
      { ...envelope(completePrefixItems(raw)), physicalLength: true },
      sources,
      at
    );
    expect(l.candidates).toHaveLength(1);
    expect(l.final.items).toHaveLength(0);
    expect(l.pendingRefs).toEqual(["A"]);
    l = applyBResponse(l, envelope([], close(["A"], ["a"])), sources, at);
    expect(l.status).toBe("complete");
    assertBLedgerAccounting(l);
  });
  it("requires full scope and explicit input dispositions rather than all Source IDs appearing", () => {
    const l = newBLedger("b", ["A", "B"], "context", evidence, at);
    expect(() => applyBResponse(l, envelope([item()], close(["A"], ["a"])), sources, at)).toThrow(
      "B_CLOSURE_SCOPE_INCOMPLETE"
    );
    const partial = stopBLedger(l, "B_NO_PROGRESS", at);
    assertBLedgerAccounting(partial);
    expect(partial.unresolved).toHaveLength(2);
    expect(partial.status).toBe("partial");
  });
  it("preserves a verified sibling when another dependency group fails", () => {
    const bad = { ...item("bad", ["B"]), dependencies: ["missing"] };
    let l = newBLedger("b", ["A", "B"], "context", evidence, at);
    l = applyBResponse(
      l,
      envelope([item(), bad], {
        scopeRefs: ["A", "B"],
        dispositions: [
          { ref: "A", status: "resolved", itemIds: ["a"], reason: "supported" },
          { ref: "B", status: "unresolved", reason: "missing dependency" }
        ]
      }),
      sources,
      at
    );
    expect(l.final.items.filter((i) => i.status === "verified")).toHaveLength(1);
    expect(l.final.items.filter((i) => i.status === "unresolved")).toHaveLength(1);
    assertBLedgerAccounting(l);
    expect(l.status).toBe("partial");
  });
  it("stops repeated/no-progress output and never accepts an invented Evidence ref", () => {
    let l = newBLedger("b", ["A"], "context", evidence, at);
    l = applyBResponse(l, envelope([item()]), sources, at);
    l = applyBResponse(l, envelope([item()]), sources, at);
    expect(l.stopReason).toBe("B_CONTINUATION_NO_PROGRESS");
    const bad = item();
    bad.payload.supportingEvidence = ["invented"];
    const p = applyBResponse(
      newBLedger("b", ["A"], "context", evidence, at),
      envelope([bad], {
        scopeRefs: ["A"],
        dispositions: [{ ref: "A", status: "unresolved", reason: "unknown evidence" }]
      }),
      sources,
      at
    );
    expect(p.final.items[0]?.error).toBe("B_UNKNOWN_EVIDENCE_REF");
    expect(p.final.result.canonicalAssessmentProposals).toHaveLength(0);
  });
  it("serializes restart state exactly including closed refs and never permits changing a closed item", () => {
    let l = newBLedger("b", ["A", "B"], "context", evidence, at);
    l = applyBResponse(
      l,
      envelope([item()], {
        scopeRefs: ["A", "B"],
        dispositions: [{ ref: "A", status: "resolved", itemIds: ["a"], reason: "done" }]
      }),
      sources,
      at
    );
    l = JSON.parse(JSON.stringify(l)) as typeof l;
    assertBLedgerAccounting(l);
    expect(l.pendingRefs).toEqual(["B"]);
    const changed = item();
    changed.payload.canonicalName = "Different";
    expect(() => applyBResponse(l, envelope([changed]), sources, at)).toThrow(
      "B_CLOSED_ITEM_REGENERATION"
    );
  });
  it("does not reuse vision body capacity as a text-only Task B cap", () => {
    const r = {
      system: "Output JSON.",
      user: "x".repeat(48 * 1024 * 1024),
      maxTokens: 1,
      providerRequestCompatibility: "provider-default" as const
    };
    expect(requestBoundary(r).reason).toBeUndefined();
  });
  it("returns an observable length-prefix physical checkpoint rather than failing the whole logical attempt", async () => {
    const raw = `{"schema":"syllab.ai.task-b/2","items":[${JSON.stringify(item())},{"itemId":"half"`;
    const result = await completeWithRepair(call, "synthetic", {
      complete: () =>
        Promise.resolve({ choices: [{ finish_reason: "length", message: { content: raw } }] })
    });
    expect(result.value).toMatchObject({ physicalLength: true, rawPrefix: raw, items: [item()] });
  });
  it("distinguishes proven pre-generation refusal from ambiguous transport; neither automatically retries", async () => {
    let dispatches = 0;
    await expect(
      completeWithRepair(call, "synthetic", {
        complete: () => {
          dispatches++;
          return Promise.reject(
            new DeepSeekFailure("AI_CONTRACT", false, "413", 0, "provider", true)
          );
        }
      })
    ).rejects.toMatchObject({ failure: { preGenerationBoundary: true, consumesApi: false } });
    expect(dispatches).toBe(1);
    try {
      await completeWithRepair(call, "synthetic", {
        complete: () => {
          dispatches++;
          return Promise.reject(new Error("Failed to fetch"));
        }
      });
    } catch (e) {
      expect(e).toBeInstanceOf(AiUnitFailure);
      expect((e as AiUnitFailure).failure.consumesApi).toBe(true);
      expect((e as AiUnitFailure).failure.preGenerationBoundary).toBeUndefined();
    }
    expect(dispatches).toBe(2);
  });
  it("allows explicit no-output Source dispositions but cannot silently dispose an Assessment draft", () => {
    const l = newBLedger("b", ["A", "draft"], "context", evidence, at);
    l.sourceRefs = ["A"];
    const next = applyBResponse(
      l,
      envelope([], {
        scopeRefs: ["A", "draft"],
        dispositions: [
          {
            ref: "A",
            status: "resolved",
            reason: "No extra source-level output",
            itemIds: [],
            noOutputNeeded: true
          },
          {
            ref: "draft",
            status: "resolved",
            reason: "Cannot skip draft",
            itemIds: [],
            noOutputNeeded: true
          }
        ]
      }),
      sources,
      at
    );
    expect(next.processedRefs).toEqual(["A"]);
    expect(next.unresolved).toEqual([
      { ref: "draft", reason: "B_DISPOSITION_UNSUPPORTED_RESOLVED" }
    ]);
    expect(next.dispositionErrors).toHaveLength(1);
    assertBLedgerAccounting(next);
  });
  it("does not trust a model-owned physicalLength flag as a real provider boundary", async () => {
    const result = await completeWithRepair(call, "synthetic", {
      complete: () =>
        Promise.resolve({
          choices: [
            {
              finish_reason: "stop",
              message: { content: JSON.stringify({ ...envelope([]), physicalLength: true }) }
            }
          ]
        })
    });
    expect(result.value).toMatchObject({ physicalLength: false });
  });
  it("classifies actual HTTP 413 transport as pre-generation, without a second fetch", async () => {
    let requests = 0;
    const transport = new DeepSeekTransport(() => {
      requests++;
      return Promise.resolve(new Response("", { status: 413 }));
    });
    await expect(
      transport.complete("synthetic", { system: "Output JSON.", user: "u", maxTokens: 1 })
    ).rejects.toMatchObject({ preGenerationBoundary: true });
    expect(requests).toBe(1);
  });
});
