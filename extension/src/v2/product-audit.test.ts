import { requirePresent } from "./errors";
import { DEEPSEEK_FLASH_CAPABILITIES } from "./invocation-policy";
import { describe, expect, it } from "vitest";
import {
  auditCourseProduct,
  auditProductTask,
  productKnowledgeIssues,
  withNativeRiskSources,
  captureProductRepair,
  captureReviewScopeCompletion,
  partitionProductRepairIssues,
  planProductAudits,
  planOwnerAuditRecovery,
  planOwnerAuditComposition,
  auditOwnerRecovery,
  productAuditRecoveryDependencies,
  productAuditSystem,
  applyProductRepair,
  type AuditPacket,
  type ProductAuditIssue
} from "./product-audit";
import type { CourseProduct, ProductProposition } from "./course-product";
import { PRODUCT_AUDIT } from "./course-product";
import type { SourceRecord } from "./schema";
const p = (id: string, ownerRef: string, clauseRef: string): ProductProposition => ({
  propositionRef: id,
  ownerRef,
  clauseRefs: [clauseRef],
  predicate: "requirement",
  value: { state: "KNOWN", value: "Submit" },
  unit: "text",
  disposition: "ACTION",
  role: "action",
  title: "Submit",
  group: "Submission",
  relation: "INDEPENDENT",
  modality: "must",
  conditions: ["if late"],
  exceptions: ["unless approved"],
  support: [{ clauseRef, quote: "Submit" }],
  basis: "Native",
  independentReview: true
});
const product = (): CourseProduct => ({
  policy: "course-product/1",
  entities: [
    { ownerRef: "a", disposition: "CURRENT", basis: "Assigned" },
    { ownerRef: "b", disposition: "REFERENCE", basis: "Example" }
  ],
  propositions: [p("p1", "a", "c1")],
  context: [{ clauseRefs: ["c2"], disposition: "REFERENCE", basis: "Example" }]
});
const packet = (): AuditPacket => ({
  entities: [
    { ref: "a", clauseRefs: ["c1"] },
    { ref: "b", clauseRefs: ["c2"] }
  ],
  links: [],
  clauses: [
    { clauseId: "c1", sourceId: "s", evidenceRefs: ["e1"] },
    { clauseId: "c2", sourceId: "t", evidenceRefs: ["e2"] }
  ],
  retiredClauses: [],
  evidenceCatalog: [
    { ref: "e1", sourceId: "s", locator: "page1", excerpt: "Submit" },
    { ref: "e2", sourceId: "t", locator: "page2", excerpt: "Worked example" }
  ]
});
const port = () => {
  const cache = new Map<string, unknown>();
  const calls: Array<{ user: string; maxTokens: number; promptVersion: string }> = [];
  return {
    cache,
    calls,
    load: (key: string) => Promise.resolve(cache.get(key)),
    save: async (key: string, value: unknown) => {
      await Promise.resolve();
      cache.set(key, value);
    },
    capture: async (call: { user: string; maxTokens: number; promptVersion: string }) => {
      await Promise.resolve();
      calls.push(call);
      const body = JSON.parse(call.user) as { taskRef: string; checkedRefs: string[] };
      return {
        taskRef: body.taskRef,
        checkedRefs: body.checkedRefs,
        complete: true,
        valid: true,
        issues: [] as ProductAuditIssue[]
      };
    }
  };
};
describe("bounded semantic audit risk controls", () => {
  it("uses verified recovery in the complete course plan while preserving every source and bridge check", async () => {
    const input = packet(),
      pr = product();
    pr.propositions.push({ ...p("rubric", "a", "c1"), group: "Rubric" });
    const plan = planProductAudits(input, pr);
    const original = requirePresent(
      plan.find((t) => t.kind === "owner" && t.checkedRefs[0] === "a")
    );
    const io = port();
    await auditOwnerRecovery(original, io, PRODUCT_AUDIT, input);
    const result = await auditCourseProduct(input, pr, io, PRODUCT_AUDIT);
    expect(result.semanticAuditComplete).toBe(true);
    expect(result.tasks.filter((t) => t.kind === "source")).toEqual(
      plan.filter((t) => t.kind === "source")
    );
    expect(result.tasks.filter((t) => t.kind === "bridge")).toEqual(
      plan.filter((t) => t.kind === "bridge")
    );
    expect(result.tasks.some((t) => t.taskRef === original.taskRef)).toBe(false);
    expect(result.tasks.filter((t) => t.kind === "owner-composition")).toHaveLength(1);
    expect(io.calls.filter((c) => c.promptVersion.endsWith(":owner-composition"))).toHaveLength(1);
    expect(productAuditRecoveryDependencies(plan, PRODUCT_AUDIT)).toHaveLength(1);
  });

  it("does not trust a recovery index without its exact raw local and composition results", async () => {
    const input = packet(),
      pr = product();
    pr.propositions.push({ ...p("rubric", "a", "c1"), group: "Rubric" });
    const original = requirePresent(
      planProductAudits(input, pr).find((t) => t.kind === "owner" && t.checkedRefs[0] === "a")
    );
    const io = port();
    await auditOwnerRecovery(original, io, PRODUCT_AUDIT, input);
    await auditCourseProduct(input, pr, io, PRODUCT_AUDIT);
    const missing = requirePresent(planOwnerAuditRecovery(original)[0]).taskRef;
    for (const [key, raw] of io.cache) {
      if (typeof raw === "object" && raw !== null && "taskRef" in raw && raw.taskRef === missing)
        io.cache.delete(key);
    }
    io.capture = async () => {
      await Promise.resolve();
      throw Error("TEST_MISSING_RAW_REQUIRES_MODEL");
    };
    await expect(auditCourseProduct(input, pr, io, PRODUCT_AUDIT)).rejects.toThrow(
      "TEST_MISSING_RAW_REQUIRES_MODEL"
    );
  });

  it("rejects a recovery closure bound to a different original scope before dispatch", async () => {
    const input = packet(),
      pr = product();
    pr.propositions.push({ ...p("rubric", "a", "c1"), group: "Rubric" });
    const original = requirePresent(
      planProductAudits(input, pr).find((t) => t.kind === "owner" && t.checkedRefs[0] === "a")
    );
    const io = port();
    await auditOwnerRecovery(original, io, PRODUCT_AUDIT, input);
    const entry = requirePresent(
      [...io.cache.entries()].find(([key]) => key.includes(":owner-recovery-closure:"))
    );
    io.cache.set(entry[0], {
      ...(entry[1] as Record<string, unknown>),
      originalTaskRef: "wrong-scope"
    });
    const before = io.calls.length;
    await expect(auditCourseProduct(input, pr, io, PRODUCT_AUDIT)).rejects.toThrow(
      "AUDIT_RECOVERY_CLOSURE_BINDING"
    );
    expect(io.calls).toHaveLength(before);
  });

  it("closes owner recovery only after all exact local scopes and the composition verdict", async () => {
    const input = packet(),
      pr = product();
    pr.propositions.push({ ...p("rubric", "a", "c1"), group: "Rubric" });
    const original = requirePresent(
      planProductAudits(input, pr).find((t) => t.kind === "owner" && t.checkedRefs[0] === "a")
    );
    const io = port();
    const result = await auditOwnerRecovery(original, io, PRODUCT_AUDIT, input);
    expect(result.ownerComplete).toBe(true);
    expect(result.courseComplete).toBe(false);
    expect(io.calls.map((c) => c.promptVersion)).toEqual([
      "bounded-product-audit/2:owner",
      "bounded-product-audit/2:owner",
      "bounded-product-audit/2:owner-composition"
    ]);
    const composed = JSON.parse(requirePresent(io.calls[2]).user) as {
      compositionScope: { requiredLocalTaskRefs: string[] };
      nativeContext: unknown;
    };
    expect(composed.compositionScope.requiredLocalTaskRefs).toEqual(
      planOwnerAuditRecovery(original).map((p) => p.taskRef)
    );
    expect(composed.nativeContext).toEqual(
      (original.payload as { nativeContext: unknown }).nativeContext
    );
    expect(planOwnerAuditComposition(original, PRODUCT_AUDIT).propositionRefs).toEqual(
      original.propositionRefs
    );
  });

  it("keeps a cross-group defect pending after locally successful scopes", async () => {
    const input = packet(),
      pr = product();
    pr.propositions.push({ ...p("rubric", "a", "c1"), group: "Rubric" });
    const original = requirePresent(
      planProductAudits(input, pr).find((t) => t.kind === "owner" && t.checkedRefs[0] === "a")
    );
    const io = port();
    const capture = io.capture;
    io.capture = async (call) => {
      const raw = await capture(call);
      if (call.promptVersion.endsWith(":owner-composition")) {
        raw.valid = false;
        raw.issues = [
          {
            code: "CROSS_GROUP_SCOPE",
            description: "Independent exception assigned to wrong group",
            propositionRefs: ["p1", "rubric"],
            clauseRefs: ["c1"]
          }
        ];
      }
      return raw;
    };
    const result = await auditOwnerRecovery(original, io, PRODUCT_AUDIT, input);
    expect(result.ownerComplete).toBe(false);
    expect(result.issues[0]?.code).toBe("CROSS_GROUP_SCOPE");
    expect(result.courseComplete).toBe(false);
  });

  it("does not dispatch composition after a defective local scope", async () => {
    const input = packet(),
      pr = product();
    pr.propositions.push({ ...p("rubric", "a", "c1"), group: "Rubric" });
    const original = requirePresent(
      planProductAudits(input, pr).find((t) => t.kind === "owner" && t.checkedRefs[0] === "a")
    );
    const io = port();
    const capture = io.capture;
    io.capture = async (call) => {
      const raw = await capture(call);
      raw.valid = false;
      raw.issues = [
        {
          code: "LOCAL_SCOPE",
          description: "Source-backed independent action lost",
          propositionRefs: ["p1"],
          clauseRefs: ["c1"]
        }
      ];
      return raw;
    };
    const result = await auditOwnerRecovery(original, io, PRODUCT_AUDIT, input);
    expect(result.ownerComplete).toBe(false);
    expect(io.calls.some((c) => c.promptVersion.endsWith(":owner-composition"))).toBe(false);
    expect(io.calls).toHaveLength(1);
  });

  it("stops before composition when a local result is partial", async () => {
    const input = packet(),
      pr = product();
    pr.propositions.push({ ...p("rubric", "a", "c1"), group: "Rubric" });
    const original = requirePresent(
      planProductAudits(input, pr).find((t) => t.kind === "owner" && t.checkedRefs[0] === "a")
    );
    const io = port(),
      capture = io.capture;
    io.capture = async (call) => ({ ...(await capture(call)), complete: false });
    await expect(auditOwnerRecovery(original, io, PRODUCT_AUDIT, input)).rejects.toThrow(
      "AUDIT_INCOMPLETE_SCOPE"
    );
    expect(io.calls).toHaveLength(1);
  });

  it("reuses a completed local scope after a predispatch stop while keeping current contract bindings", async () => {
    const input = packet(),
      pr = product();
    pr.propositions.push({ ...p("rubric", "a", "c1"), group: "Rubric" });
    const original = requirePresent(
      planProductAudits(input, pr).find((t) => t.kind === "owner" && t.checkedRefs[0] === "a")
    );
    const io = port(),
      capture = io.capture;
    io.capture = async (call) => {
      if (io.calls.length === 1) throw Error("TEST_PREDISPATCH_STOP");
      return capture(call);
    };
    await expect(auditOwnerRecovery(original, io, PRODUCT_AUDIT, input)).rejects.toThrow(
      "TEST_PREDISPATCH_STOP"
    );
    expect(io.calls).toHaveLength(1);
    io.capture = capture;
    const recovered = await auditOwnerRecovery(original, io, PRODUCT_AUDIT, input);
    expect(recovered.ownerComplete).toBe(true);
    expect(io.calls).toHaveLength(3);
    const before = planOwnerAuditComposition(original, PRODUCT_AUDIT);
    const changed = planOwnerAuditComposition(original, PRODUCT_AUDIT + " amended local contract");
    expect(changed.taskRef).not.toBe(before.taskRef);
    expect(changed.propositionRefs).toEqual(before.propositionRefs);
  });

  it("routes recovery by saved groups while keeping cross-group parent families intact", () => {
    const pr = product();
    pr.propositions.push(
      { ...p("child", "a", "c1"), group: "Content", parentRef: "p1", relation: "SUPPLEMENT" },
      { ...p("third", "a", "c1"), group: "Rubric" }
    );
    const original = requirePresent(
      planProductAudits(packet(), pr).find((t) => t.kind === "owner" && t.checkedRefs[0] === "a")
    );
    const before = JSON.stringify(original);
    const parts = planOwnerAuditRecovery(original);
    expect(parts).toHaveLength(2);
    expect(parts.find((t) => t.propositionRefs.includes("child"))?.propositionRefs).toEqual([
      "p1",
      "child"
    ]);
    expect(parts.flatMap((t) => t.propositionRefs).sort()).toEqual(["child", "p1", "third"]);
    for (const part of parts) {
      const body = part.payload as {
        nativeContext: unknown;
        propositions: ProductProposition[];
        recoveryScope: { fullOwnerCompositionRequired: boolean };
      };
      expect(body.nativeContext).toEqual(
        (original.payload as { nativeContext: unknown }).nativeContext
      );
      expect(body.recoveryScope.fullOwnerCompositionRequired).toBe(true);
      for (const prop of body.propositions)
        expect(prop).toEqual(pr.propositions.find((p) => p.propositionRef === prop.propositionRef));
    }
    expect(JSON.stringify(original)).toBe(before);
  });

  it("does not mint a retry for an unsplittable owner or silently lose a missing parent", () => {
    const pr = product();
    const original = requirePresent(
      planProductAudits(packet(), pr).find((t) => t.kind === "owner" && t.checkedRefs[0] === "a")
    );
    expect(planOwnerAuditRecovery(original)).toEqual([]);
    requirePresent(pr.propositions[0]).parentRef = "missing";
    const invalid = requirePresent(
      planProductAudits(packet(), pr).find((t) => t.kind === "owner" && t.checkedRefs[0] === "a")
    );
    expect(() => planOwnerAuditRecovery(invalid)).toThrow("AUDIT_RECOVERY_PARENT_SCOPE");
  });

  it("executes a local recovery through the existing audit validator without certifying the owner", async () => {
    const input = packet(),
      pr = product();
    pr.propositions.push({ ...p("rubric", "a", "c1"), group: "Rubric" });
    const original = requirePresent(
      planProductAudits(input, pr).find((t) => t.kind === "owner" && t.checkedRefs[0] === "a")
    );
    const part = requirePresent(planOwnerAuditRecovery(original)[0]);
    const io = port();
    const result = await auditProductTask(input, pr, part.taskRef, io, PRODUCT_AUDIT);
    expect(result.semanticAuditComplete).toBe(true);
    expect(result.courseComplete).toBe(false);
    expect(result.task.propositionRefs).toEqual(["p1"]);
    const delivered = JSON.parse(requirePresent(io.calls[0]).user) as {
      propositions: ProductProposition[];
      relatedReadOnlyPropositions: ProductProposition[];
    };
    expect(delivered.propositions.map((p) => p.propositionRef)).toEqual(["p1"]);
    expect(delivered.relatedReadOnlyPropositions.some((p) => p.propositionRef === "rubric")).toBe(
      true
    );
    expect(planProductAudits(input, pr).some((t) => t.taskRef === original.taskRef)).toBe(true);
  });

  it("accepts completed issue reports without a redundant valid judgment and preserves defect state", async () => {
    const input = packet(),
      pr = product();
    const task = requirePresent(
      planProductAudits(input, pr).find((t) => t.kind === "owner" && t.checkedRefs[0] === "a")
    );
    const io = port();
    const result = await auditProductTask(
      input,
      pr,
      task.taskRef,
      {
        ...io,
        capture: async () => {
          await Promise.resolve();
          return {
            taskRef: task.taskRef,
            checkedRefs: task.checkedRefs,
            complete: true,
            issues: [
              {
                code: "DEFECT",
                description: "Native mismatch",
                propositionRefs: ["p1"],
                clauseRefs: ["c1"]
              }
            ]
          };
        }
      },
      PRODUCT_AUDIT
    );
    expect(result.semanticAuditComplete).toBe(true);
    expect(result.issues).toHaveLength(1);
    expect(result.courseComplete).toBe(false);
  });
  it("rejects complete audits whose valid marker contradicts reported defects without repairing model meaning", async () => {
    const input = packet(),
      pr = product(),
      before = structuredClone(pr);
    const task = requirePresent(
      planProductAudits(input, pr).find((t) => t.kind === "owner" && t.checkedRefs[0] === "a")
    );
    const io = port();
    await expect(
      auditProductTask(
        input,
        pr,
        task.taskRef,
        {
          ...io,
          capture: async () => {
            await Promise.resolve();
            return {
              taskRef: task.taskRef,
              checkedRefs: task.checkedRefs,
              complete: true,
              valid: true,
              issues: [
                {
                  code: "DEFECT",
                  description: "Concrete native discrepancy",
                  propositionRefs: ["p1"],
                  clauseRefs: ["c1"]
                }
              ]
            };
          }
        },
        PRODUCT_AUDIT
      )
    ).rejects.toThrow("AUDIT_INCOMPLETE_SCOPE");
    expect(pr).toEqual(before);
    for (const kind of ["source", "owner", "bridge"] as const) {
      expect(productAuditSystem(kind, PRODUCT_AUDIT)).toContain("Do not return valid");
      expect(productAuditSystem(kind, PRODUCT_AUDIT)).toContain(
        "complete reports whether the entire declared scope was checked, not whether it has defects"
      );
    }
  });
  it("isolates experimental low-effort owner caches from production high and never certifies a course", async () => {
    const io = port();
    const task = requirePresent(
      planProductAudits(packet(), product()).find(
        (t) => t.kind === "owner" && t.checkedRefs[0] === "a"
      )
    );
    const efforts: Array<string | undefined> = [];
    const experimental = {
      ...io,
      capture: async (call: Parameters<typeof io.capture>[0] & { reasoningEffort?: string }) => {
        efforts.push(call.reasoningEffort);
        return io.capture(call);
      }
    };
    const low = await auditProductTask(
      packet(),
      product(),
      task.taskRef,
      experimental,
      "Output JSON.",
      { reasoningEffort: "low" }
    );
    expect(low.courseComplete).toBe(false);
    await auditProductTask(packet(), product(), task.taskRef, experimental, "Output JSON.");
    await auditProductTask(packet(), product(), task.taskRef, experimental, "Output JSON.", {
      reasoningEffort: "low"
    });
    expect(efforts).toEqual(["low", undefined]);
    expect(io.calls).toHaveLength(2);
  });
  it("delivers one output contract without removing native semantic checks", () => {
    for (const kind of ["source", "owner", "bridge"] as const) {
      const system = productAuditSystem(kind, PRODUCT_AUDIT);
      expect(system.match(/Return raw JSON/g)).toHaveLength(1);
      expect(system).toContain("taskRef,checkedRefs,complete,issues");
      expect(system).not.toContain("valid:boolean,issues:");
    }
    const owner = productAuditSystem("owner", PRODUCT_AUDIT);
    expect(owner).toContain("every independent obligation, branch/OR, actor, force, exception");
    expect(owner).toContain("native evidence of ACTUAL assignment");
    expect(owner).toContain("Never accept Human trusted/user edits as source truth");
  });
  it("isolates source, owner and bridge instructions while retaining complete scope contracts", () => {
    const source = productAuditSystem("source", "Owner policy A");
    expect(source).toBe(productAuditSystem("source", "Owner policy B"));
    expect(source).toContain("check ALL delivered native text");
    expect(source).toContain("requiresRead:true");
    expect(source).not.toContain("Owner pass:");
    expect(source).not.toContain("readOnlyCourseFrame");
    const owner = productAuditSystem("owner", "Owner policy A");
    expect(owner).toContain("readOnlyCourseFrame");
    expect(owner).toContain(
      "explicit current student instructions can be important without weight/date"
    );
    expect(owner).not.toContain("Bridge pass:");
    const bridge = productAuditSystem("bridge", "Owner policy A");
    expect(bridge).toContain("cross-owner identity/duplicate claims");
    expect(bridge).not.toContain("Owner pass:");
    for (const system of [source, owner, bridge]) {
      expect(system).toContain("Echo taskRef and every checkedRef");
      expect(system).toContain("complete=false; never certify partial work");
      expect(system).toContain("No repair or prose output");
    }
  });
  it("provides native series framing without excluding an unweighted task or widening repair scope", async () => {
    const input = packet();
    input.entities = [
      ...(input.entities as unknown[]),
      { ref: "frame", role: "series", clauseRefs: ["c3"] }
    ];
    input.clauses.push({ clauseId: "c3", sourceId: "overview", evidenceRefs: ["e3"] });
    input.evidenceCatalog.push({
      ref: "e3",
      sourceId: "overview",
      locator: "page1",
      excerpt: "One graded final examination"
    });
    input.riskEvidenceCatalog = input.evidenceCatalog.map((e) => ({
      ...e,
      sourceContext: {
        title: e.ref === "e3" ? "Assessment overview" : "Teaching slides",
        kind: "attachment"
      },
      limitations: { partial: false, visualGaps: [], parseAvailable: true }
    }));
    const pr = product();
    pr.entities.push({ ownerRef: "frame", disposition: "CURRENT", basis: "Native scheme" });
    pr.propositions.push(p("scheme", "frame", "c3"));
    const before = structuredClone(pr);
    const sourceTasksBefore = planProductAudits(input, pr).filter((t) => t.kind === "source");
    const task = requirePresent(
      planProductAudits(input, pr).find((t) => t.kind === "owner" && t.checkedRefs[0] === "a")
    );
    const payload = task.payload as {
      propositions: ProductProposition[];
      nativeContext: Array<{ excerpt: string; sourceContext: { title: string } }>;
      readOnlyCourseFrame: {
        propositions: ProductProposition[];
        nativeContext: Array<{ excerpt: string }>;
      };
    };
    expect(payload.propositions.map((x) => x.propositionRef)).toEqual(["p1"]);
    expect(payload.nativeContext[0]?.excerpt).toBe("Submit");
    expect(payload.nativeContext[0]?.sourceContext.title).toBe("Teaching slides");
    expect(payload.readOnlyCourseFrame.propositions.map((x) => x.propositionRef)).toEqual([
      "scheme"
    ]);
    expect(payload.readOnlyCourseFrame.nativeContext[0]?.excerpt).toBe(
      "One graded final examination"
    );
    const io = port();
    await expect(
      captureProductRepair(
        input,
        pr,
        [{ code: "SCOPE", description: "Synthetic", propositionRefs: ["p1"], clauseRefs: ["c1"] }],
        {
          ...io,
          capture: async (call) => {
            await Promise.resolve();
            const body = JSON.parse(call.user) as {
              scope: { propositionRefs: string[] };
              readOnlyCourseFrame: { propositions: ProductProposition[] };
            };
            expect(body.scope.propositionRefs).toEqual(["p1"]);
            expect(body.readOnlyCourseFrame.propositions.map((x) => x.propositionRef)).toEqual([
              "scheme"
            ]);
            return {
              schema: "syllab.ai.course-product/1",
              propositions: [pr.propositions[1]],
              entities: [pr.entities[2]],
              context: []
            };
          }
        }
      )
    ).rejects.toThrow("LOCAL_REPAIR_SCOPE");
    expect(pr).toEqual(before);
    expect(planProductAudits(input, pr).filter((t) => t.kind === "source")).toEqual(
      sourceTasksBefore
    );
  });

  it("never labels a fragment complete using a longer risk unit's parse status", () => {
    const input = packet();
    input.riskEvidenceCatalog = [
      {
        ...requirePresent(input.evidenceCatalog[0]),
        excerpt: "Submit only if assigned; otherwise waived.",
        sourceContext: { title: "Teaching example", kind: "attachment" },
        limitations: { partial: false, visualGaps: [], parseAvailable: true }
      }
    ];
    const task = requirePresent(
      planProductAudits(input, product()).find(
        (t) => t.kind === "owner" && t.checkedRefs[0] === "a"
      )
    );
    const payload = task.payload as {
      nativeContext: Array<{
        excerpt: string;
        limitations?: unknown;
        sourceContext?: { title: string };
      }>;
    };
    expect(payload.nativeContext[0]?.excerpt).toBe("Submit");
    expect(payload.nativeContext[0]?.sourceContext?.title).toBe("Teaching example");
    expect(payload.nativeContext[0]?.limitations).toBeUndefined();
  });

  it("rejects an out-of-scope patch before dispatching missing-field completion", async () => {
    const raw = { ...p("other", "b", "c2") } as Record<string, unknown>;
    delete raw.independentReview;
    const io = port();
    let captures = 0;
    await expect(
      captureProductRepair(
        packet(),
        product(),
        [
          {
            code: "SCOPE",
            description: "Check boundary",
            propositionRefs: ["p1"],
            clauseRefs: ["c1"]
          }
        ],
        {
          ...io,
          capture: async () => {
            await Promise.resolve();
            captures++;
            return {
              schema: "syllab.ai.course-product/1",
              propositions: [raw],
              entities: [product().entities[0]],
              context: []
            };
          }
        }
      )
    ).rejects.toThrow("LOCAL_REPAIR_SCOPE");
    expect(captures).toBe(1);
  });
  it("recovers a captured missing boundary through a separate field task without replaying semantic repair", async () => {
    const candidate = product();
    requirePresent(candidate.propositions[0]).independentReview = false;
    const before = structuredClone(candidate);
    const io = port();
    const stages: string[] = [];
    const recoveryPort = {
      ...io,
      capture: async (call: { user: string; promptVersion: string }) => {
        await Promise.resolve();
        stages.push(call.promptVersion);
        if (call.promptVersion.endsWith(":local-repair")) {
          const raw = JSON.parse(JSON.stringify(candidate.propositions[0])) as Record<
            string,
            unknown
          >;
          delete raw.independentReview;
          return {
            schema: "syllab.ai.course-product/1",
            propositions: [raw],
            entities: [candidate.entities[0]],
            context: []
          };
        }
        const input = JSON.parse(call.user) as { taskRef: string };
        return {
          schema: "syllab.ai.course-product/1",
          taskRef: input.taskRef,
          complete: true,
          fields: [
            {
              propositionRef: "p1",
              independentReview: true,
              basis: "Separate high-risk conditional requirement"
            }
          ]
        };
      }
    };
    const issues = [
      {
        code: "SCOPE",
        description: "Check independent approval",
        propositionRefs: ["p1"],
        clauseRefs: ["c1"]
      }
    ];
    const repaired = await captureProductRepair(packet(), candidate, issues, recoveryPort);
    expect(repaired.propositions[0]?.independentReview).toBe(true);
    expect(repaired.propositions).toEqual([{ ...before.propositions[0], independentReview: true }]);
    expect(repaired.entities).toHaveLength(before.entities.length);
    expect(repaired.entities).toEqual(expect.arrayContaining(before.entities));
    expect(repaired.context).toEqual(before.context);
    expect(candidate).toEqual(before);
    expect(stages).toEqual([
      "bounded-product-audit/2:local-repair",
      "bounded-product-audit/2:review-scope-completion"
    ]);
    expect(await captureProductRepair(packet(), candidate, issues, recoveryPort)).toEqual(repaired);
    expect(stages).toHaveLength(2);
  });
  it("completes only a missing review boundary from an explicit cached model verdict", async () => {
    const missing = { ...p("p1", "a", "c1") } as Record<string, unknown>;
    delete missing.independentReview;
    const raw = {
      schema: "syllab.ai.course-product/1",
      propositions: [missing],
      entities: [],
      context: []
    };
    const original = structuredClone(raw);
    const io = port();
    let captures = 0;
    const completionPort = {
      ...io,
      capture: async (call: { user: string }) => {
        await Promise.resolve();
        captures++;
        const input = JSON.parse(call.user) as {
          taskRef: string;
          missingPropositionRefs: string[];
        };
        return {
          schema: raw.schema,
          taskRef: input.taskRef,
          complete: true,
          fields: [
            {
              propositionRef: input.missingPropositionRefs[0],
              independentReview: true,
              basis: "Independent high-risk condition needs its own decision"
            }
          ]
        };
      }
    };
    const context = JSON.stringify({
      nativeEvidence: [{ excerpt: "Submit if late unless approved" }]
    });
    const completed = await captureReviewScopeCompletion(raw, context, completionPort);
    expect(completed).toEqual({ ...raw, propositions: [{ ...missing, independentReview: true }] });
    expect(raw).toEqual(original);
    expect(await captureReviewScopeCompletion(raw, context, completionPort)).toEqual(completed);
    expect(captures).toBe(1);
  });

  it("refuses defaults, unresolved boundaries and changes to frozen semantic fields", async () => {
    const missing = { ...p("p1", "a", "c1") } as Record<string, unknown>;
    delete missing.independentReview;
    const raw = {
      schema: "syllab.ai.course-product/1",
      propositions: [missing],
      entities: [],
      context: []
    };
    const original = structuredClone(raw);
    for (const variant of ["unresolved", "extra", "wrong-id", "null"]) {
      const io = port();
      await expect(
        captureReviewScopeCompletion(raw, "{}", {
          ...io,
          capture: async (call) => {
            await Promise.resolve();
            const input = JSON.parse(call.user) as { taskRef: string };
            return {
              schema: raw.schema,
              taskRef: input.taskRef,
              complete: variant !== "unresolved",
              fields:
                variant === "null"
                  ? [null]
                  : [
                      {
                        propositionRef: variant === "wrong-id" ? "other" : "p1",
                        independentReview: false,
                        basis: "Native guidance",
                        ...(variant === "extra" ? { disposition: "REFERENCE" } : {})
                      }
                    ]
            };
          }
        })
      ).rejects.toThrow(variant === "unresolved" ? "COMPLETION_UNRESOLVED" : "COMPLETION_SCOPE");
      expect(raw).toEqual(original);
    }
    delete missing.modality;
    const io = port();
    await expect(captureReviewScopeCompletion(raw, "{}", io)).rejects.toThrow(
      "OTHER_MISSING_FIELDS"
    );
    expect(io.calls).toHaveLength(0);
  });
  it("exposes preserved teaching context from owned native units without widening approval", () => {
    const input = packet();
    input.clauses.push({ clauseId: "c3", sourceId: "s", evidenceRefs: ["e1"] });
    const candidate = product();
    candidate.context.push({
      clauseRefs: ["c3", "c2"],
      disposition: "REFERENCE",
      basis: "Optional writing technique, retained for on-demand reading"
    });
    const original = structuredClone(candidate);
    const owner = requirePresent(
      planProductAudits(input, candidate).find(
        (t) => t.kind === "owner" && t.checkedRefs[0] === "a"
      )
    );
    expect(owner.payload).toMatchObject({
      preservedReadOnlyContext: [{ clauseRefs: ["c3"], disposition: "REFERENCE" }]
    });
    expect(owner.propositionRefs).toEqual(["p1"]);
    expect(owner.clauseRefs).toEqual(["c1"]);
    expect(candidate).toEqual(original);
    candidate.context = [];
    const withoutContext = requirePresent(
      planProductAudits(input, candidate).find(
        (t) => t.kind === "owner" && t.checkedRefs[0] === "a"
      )
    );
    expect(withoutContext.taskRef).not.toBe(owner.taskRef);
  });
  it("rejects settled candidate alternatives before paid audits without rewriting history", async () => {
    const pr = product();
    pr.propositions[0] = {
      ...p("p1", "a", "c1"),
      value: { state: "KNOWN", value: "Submit", competingValues: ["Historical alternative"] }
    };
    const preserved = structuredClone(pr);
    const io = port();
    const result = await auditCourseProduct(packet(), pr, io, "audit");
    expect(result.issues).toEqual(productKnowledgeIssues(pr));
    expect(result.issues[0]?.code).toBe("KNOWN_WITH_COMPETING_VALUES");
    expect(io.calls).toHaveLength(0);
    const owner = planProductAudits(packet(), pr).find(
      (t) => t.kind === "owner" && t.checkedRefs[0] === "a"
    );
    expect(owner).toBeDefined();
    const scoped = await auditProductTask(packet(), pr, requirePresent(owner).taskRef, io, "audit");
    expect(scoped.courseComplete).toBe(false);
    expect(scoped.issues).toEqual(result.issues);
    expect(pr).toEqual(preserved);
    expect(io.calls).toHaveLength(0);
    requirePresent(pr.propositions[0]).value.state = "UNCERTAIN";
    expect(productKnowledgeIssues(pr)).toEqual([]);
    requirePresent(pr.propositions[0]).value = { state: "KNOWN", value: "Submit" };
    expect(productKnowledgeIssues(pr)).toEqual([]);
  });
  it("isolates native passage judgments while retaining the full cross-source owner obligation", () => {
    const input = packet();
    const pr = product();
    pr.propositions[0] = { ...p("p1", "a", "c1"), clauseRefs: ["c1", "c2"] };
    const tasks = planProductAudits(input, pr);
    const source = tasks.filter((t) => t.kind === "source");
    expect(source).toHaveLength(2);
    for (const task of source) {
      const payload = task.payload as {
        evidence: Array<{ ref: string }>;
        clauses: Array<{ clauseId: string }>;
        claims: Array<{ clauseRefs: string[]; outsideSupport: boolean; conditions: string[] }>;
      };
      expect(payload.evidence).toHaveLength(1);
      expect(payload.claims[0]?.outsideSupport).toBe(true);
      expect(payload.claims[0]?.clauseRefs).toEqual(payload.clauses.map((c) => c.clauseId));
      expect(payload.claims[0]?.conditions).toEqual(["if late"]);
    }
    const owner = tasks.find((t) => t.kind === "owner" && t.checkedRefs[0] === "a");
    expect(owner?.clauseRefs).toEqual(["c1", "c2"]);
    expect(JSON.stringify(owner?.payload)).toContain("unless approved");
  });
  it("conserves long native text and context-only examples without inherited judgments", () => {
    const input = packet();
    input.evidenceCatalog[1] = {
      ...input.evidenceCatalog[1],
      ref: "e2",
      sourceId: "t",
      locator: "page2",
      excerpt: "X".repeat(50000) + "hidden obligation"
    };
    const tasks = planProductAudits(input, product());
    const source = tasks.filter((t) => t.kind === "source");
    const spans = source
      .flatMap(
        (t) =>
          (
            t.payload as {
              evidence: Array<{ ref: string; start: number; end: number; excerpt: string }>;
            }
          ).evidence
      )
      .filter((e) => e.ref === "e2");
    expect(spans.map((s) => [s.start, s.end])).toEqual([
      [0, 24000],
      [24000, 48000],
      [48000, 50017]
    ]);
    expect(spans.at(-1)?.excerpt).toContain("hidden obligation");
    expect(tasks.every((t) => t.maxTokens === DEEPSEEK_FLASH_CAPABILITIES.providerMaxOutput)).toBe(
      true
    );
  });
  it("resumes completed scopes but never accepts an incomplete or repeated answer", async () => {
    const x = port();
    await auditCourseProduct(packet(), product(), x, "Audit");
    const count = x.calls.length;
    await auditCourseProduct(packet(), product(), x, "Audit");
    expect(x.calls.length).toBe(count);
    const key = [...x.cache.keys()][0];
    if (!key) throw Error("No key");
    x.cache.set(key, { ...(x.cache.get(key) as object), complete: false });
    await expect(auditCourseProduct(packet(), product(), x, "Audit")).rejects.toThrow(
      "AUDIT_INCOMPLETE_SCOPE"
    );
    expect(x.calls.length).toBe(count);
  });
  it("rejects missing native evidence but retains payloads above the removed owned byte ceiling", () => {
    const input = packet();
    input.clauses[0] = { clauseId: "c1", sourceId: "s", evidenceRefs: [] };
    expect(() => planProductAudits(input, product())).toThrow("AUDIT_NATIVE_COVERAGE");
    const pr = product();
    pr.propositions[0] = {
      ...p("p1", "a", "c1"),
      basis: "X".repeat(192001)
    };
    expect(
      planProductAudits(packet(), pr).some((t) =>
        JSON.stringify(t.payload).includes(pr.propositions[0]?.basis ?? "")
      )
    ).toBe(true);
  });
  it("an owner change retains unrelated owner's audit cache", () => {
    const input = packet();
    input.evidenceCatalog[0] = {
      ref: "e1",
      sourceId: "s",
      locator: "page1",
      excerpt: "Submit" + " ".repeat(24000)
    };
    const original = planProductAudits(input, product());
    const changed = product();
    changed.propositions[0] = p("p1", "a", "c1");
    changed.propositions[0].conditions = ["only after approval"];
    const after = planProductAudits(input, changed);
    expect(after.find((t) => t.kind === "owner" && t.checkedRefs[0] === "b")?.taskRef).toBe(
      original.find((t) => t.kind === "owner" && t.checkedRefs[0] === "b")?.taskRef
    );
    expect(after.find((t) => t.kind === "bridge")?.taskRef).not.toBe(
      original.find((t) => t.kind === "bridge")?.taskRef
    );
  });
  it("local repair cannot overwrite an unrelated proposition or remove context outside scope", () => {
    const original = product();
    original.propositions.push(p("p2", "b", "c2"));
    expect(() =>
      applyProductRepair(original, {
        propositionRefs: ["p1"],
        ownerRefs: [],
        contextClauseRefs: [],
        entities: [],
        context: [],
        propositions: [p("p2", "b", "c2")]
      })
    ).toThrow("LOCAL_REPAIR_SCOPE");
    const fixed = applyProductRepair(original, {
      propositionRefs: ["p1"],
      ownerRefs: [],
      contextClauseRefs: [],
      entities: [],
      context: [],
      propositions: [{ ...p("p1", "a", "c1"), conditions: ["after approval"] }]
    });
    expect(fixed.propositions.find((p) => p.propositionRef === "p2")).toBe(
      original.propositions[1]
    );
    expect(fixed.context).toEqual(original.context);
  });
});

it("recovers an independent owner task without reissuing a failed source or certifying the course", async () => {
  const input = packet(),
    pr = product(),
    memory = port();
  const owner = planProductAudits(input, pr).find((t) => t.kind === "owner");
  if (!owner) throw Error("OWNER_REQUIRED");
  const calls: string[] = [];
  const guarded = {
    ...memory,
    capture: async (call: Parameters<typeof memory.capture>[0]) => {
      const body = JSON.parse(call.user) as { taskRef: string };
      calls.push(body.taskRef);
      if (call.promptVersion.endsWith(":source")) throw Error("UNKNOWN_DO_NOT_REDISPATCH");
      return memory.capture(call);
    }
  };
  await expect(auditCourseProduct(input, pr, guarded, "Output JSON.")).rejects.toThrow(
    "UNKNOWN_DO_NOT_REDISPATCH"
  );
  const completed = await auditProductTask(input, pr, owner.taskRef, guarded, "Output JSON.");
  expect(completed.courseComplete).toBe(false);
  expect(completed.issues).toEqual([]);
  expect(calls).toHaveLength(2);
  await auditProductTask(input, pr, owner.taskRef, guarded, "Output JSON.");
  expect(calls).toHaveLength(2);
  await expect(auditProductTask(input, pr, "invented", guarded, "Output JSON.")).rejects.toThrow(
    "AUDIT_TASK_NOT_IN_PLAN"
  );
});

it("supplies structural child context without widening the parent approval or defect scope", () => {
  const input = packet();
  input.entities = [
    { ref: "a", clauseRefs: ["c1"] },
    { ref: "b", parentRef: "a", clauseRefs: ["c2"] }
  ];
  const pr = product();
  pr.propositions.push({
    ...p("child-weight", "b", "c2"),
    predicate: "weight",
    role: "core",
    unit: "percent_course",
    value: { state: "KNOWN", value: 40 }
  });
  const root = planProductAudits(input, pr).find(
    (t) => t.kind === "owner" && t.checkedRefs[0] === "a"
  );
  expect(root?.propositionRefs).toEqual(["p1"]);
  expect(root?.clauseRefs).toEqual(["c1"]);
  const payload = root?.payload as {
    relatedReadOnlyPropositions: Array<{ propositionRef: string; value: { value: number } }>;
  };
  expect(payload.relatedReadOnlyPropositions).toMatchObject([
    { propositionRef: "child-weight", value: { value: 40 } }
  ]);
});

it("allows only source-observed new owners in scoped patches, never arbitrary invented owners", () => {
  const original = product();
  const patch = {
    propositionRefs: [],
    ownerRefs: ["new"],
    contextClauseRefs: ["c3"],
    propositions: [p("p3", "new", "c3")],
    entities: [{ ownerRef: "new", disposition: "CURRENT" as const, basis: "Authored new task" }],
    context: []
  };
  expect(() => applyProductRepair(original, patch)).toThrow("LOCAL_REPAIR_SCOPE");
  expect(() => applyProductRepair(original, patch, ["another"])).toThrow("LOCAL_REPAIR_SCOPE");
  const result = applyProductRepair(original, patch, ["new"]);
  expect(result.propositions.slice(0, original.propositions.length)).toEqual(original.propositions);
  expect(result.entities.find((e) => e.ownerRef === "new")?.disposition).toBe("CURRENT");
  expect(original.entities.some((e) => e.ownerRef === "new")).toBe(false);
});

it("risk-screens source units with no Clause and preserves unavailable/visual limitations separately", async () => {
  const sources: SourceRecord[] = [
    {
      sourceId: "s",
      courseId: "course",
      nativeItemId: "s",
      kind: "attachment",
      title: "Guide",
      updatedAt: "2026-10-13",
      parsed: {
        text: "Submit",
        structure: [],
        units: [{ locator: "page1", text: "Submit", partial: false }]
      }
    },
    {
      sourceId: "ordinary",
      courseId: "course",
      nativeItemId: "ordinary",
      kind: "attachment",
      title: "Ordinary lecture",
      updatedAt: "2026-10-13",
      parsed: {
        text: "Theory. Upload a reflection before class.",
        structure: [],
        units: [
          {
            locator: "page2",
            text: "Theory. Upload a reflection before class.",
            partial: true,
            visualGaps: ["vector-text"]
          },
          { locator: "page3", text: "More theory.", partial: false },
          { locator: "page4", text: "", partial: true }
        ]
      }
    }
  ];
  const original = packet(),
    preserved = structuredClone(original);
  const full = withNativeRiskSources(original, sources);
  expect(full.riskInventory?.map((s) => s.sourceId)).toEqual(["s", "ordinary"]);
  expect(full.riskInventory?.[1]?.units[2]?.available).toBe(false);
  expect(original).toEqual(preserved);
  const tasks = planProductAudits(full, product());
  const ordinary = tasks.filter(
    (t) => t.kind === "source" && JSON.stringify(t.payload).includes("Upload a reflection")
  );
  expect(ordinary).toHaveLength(1);
  expect(ordinary[0]?.clauseRefs).toEqual([]);
  expect(ordinary[0]?.checkedRefs).toHaveLength(2);
  const x = port();
  x.capture = async (call) => {
    await Promise.resolve();
    const body = JSON.parse(call.user) as { taskRef: string; checkedRefs: string[] };
    const missing = call.user.includes("Upload a reflection");
    return {
      taskRef: body.taskRef,
      checkedRefs: body.checkedRefs,
      complete: true,
      valid: !missing,
      issues: missing
        ? [
            {
              code: "MISSING_NATIVE_TASK",
              description: "Independent upload obligation in ordinary source has no Clause",
              propositionRefs: [],
              clauseRefs: []
            }
          ]
        : []
    };
  };
  const result = await auditCourseProduct(full, product(), x, "audit");
  expect(result.issues[0]?.auditTaskRef).toBe(ordinary[0]?.taskRef);
  await expect(captureProductRepair(full, product(), result.issues, x)).rejects.toThrow(
    "AUDIT_NATIVE_READER_RECOVERY_REQUIRED"
  );
});

it("binds a Reader recovery quote to its declared native evidence instead of another page", async () => {
  const input = withNativeRiskSources(packet(), [
    {
      sourceId: "lecture",
      courseId: "course",
      nativeItemId: "lecture",
      kind: "attachment",
      title: "Methods",
      updatedAt: "2026-10-13",
      parsed: {
        text: "",
        structure: [],
        units: [
          { locator: "page:1", text: "Teaching examples only.", partial: false },
          { locator: "page:2", text: "Upload a memo before class.", partial: false }
        ]
      }
    }
  ]);
  const task = requirePresent(
    planProductAudits(input, product()).find(
      (t) =>
        t.kind === "source" &&
        (t.payload as { evidence: Array<{ sourceId: string }> }).evidence.some(
          (e) => e.sourceId === "lecture"
        )
    )
  );
  const refs = (task.payload as { evidence: Array<{ ref: string }> }).evidence.map((e) => e.ref);
  for (const [ref, valid] of [
    [refs[0], false],
    [refs[1], true]
  ] as const) {
    const x = port();
    x.capture = () =>
      Promise.resolve({
        taskRef: task.taskRef,
        checkedRefs: task.checkedRefs,
        complete: true,
        valid: false,
        issues: [
          {
            code: "MISSING_NATIVE_TASK",
            description: "Authored upload instruction lacks Reader observations.",
            propositionRefs: [],
            clauseRefs: [],
            requiresRead: true,
            nativeRefs: [requirePresent(ref)],
            nativeQuote: "Upload a memo before class."
          }
        ]
      });
    const result = auditProductTask(input, product(), task.taskRef, x, "Output JSON.");
    if (valid) expect((await result).semanticAuditComplete).toBe(false);
    else await expect(result).rejects.toThrow("AUDIT_SCOPE");
  }
});

it("reuses only a complete clean audit after structural alias changes and rechecks changed semantic context", async () => {
  const first = packet();
  first.clauseIdentities = { c1: "original-a", c2: "original-b" };
  const second: AuditPacket = {
    ...packet(),
    clauseIdentities: { c9: "original-a", c8: "original-b" },
    clauses: first.clauses.map((c) => ({
      ...c,
      clauseId: c.clauseId === "c1" ? "c9" : "c8",
      evidenceRefs: c.evidenceRefs.map((e) => (e === "e1" ? "e9" : "e8"))
    })),
    evidenceCatalog: first.evidenceCatalog.map((e) => ({
      ...e,
      ref: e.ref === "e1" ? "e9" : "e8"
    })),
    entities: [
      { ref: "a", clauseRefs: ["c9"] },
      { ref: "b", clauseRefs: ["c8"] }
    ]
  };
  const pr = product(),
    next = product();
  next.propositions[0] = { ...p("p1", "a", "c9") };
  next.context = [{ ...requirePresent(pr.context[0]), clauseRefs: ["c8"] }];
  const select = (input: AuditPacket, value: CourseProduct) =>
    requirePresent(
      planProductAudits(input, value).find((t) => t.kind === "owner" && t.checkedRefs[0] === "a")
    );
  const x = port();
  const before = select(first, pr),
    after = select(second, next);
  expect(after.taskRef).not.toBe(before.taskRef);
  await auditProductTask(first, pr, before.taskRef, x, "Output JSON.");
  expect(x.calls).toHaveLength(1);
  const reused = await auditProductTask(second, next, after.taskRef, x, "Output JSON.");
  expect(reused.issues).toEqual([]);
  expect(reused.courseComplete).toBe(false);
  expect(x.calls).toHaveLength(1);
  requirePresent(next.propositions[0]).conditions = ["if registration is late"];
  await auditProductTask(second, next, select(second, next).taskRef, x, "Output JSON.");
  expect(x.calls).toHaveLength(2);
  requirePresent(second.evidenceCatalog[0]).excerpt += " Unless approved.";
  await auditProductTask(second, next, select(second, next).taskRef, x, "Output JSON.");
  expect(x.calls).toHaveLength(3);
  const changedOriginal = {
    ...second,
    clauseIdentities: { c9: "different-original", c8: "original-b" }
  };
  // Exact wire payload cache remains legitimate; a new scope must not conflate different originals.
  requirePresent(next.propositions[0]).conditions = [];
  await auditProductTask(
    changedOriginal,
    next,
    select(changedOriginal, next).taskRef,
    x,
    "Output JSON."
  );
  expect(x.calls).toHaveLength(4);
});

it("never promotes a defect audit or UNKNOWN into clean alias reuse", async () => {
  const first = packet();
  first.clauseIdentities = { c1: "original-a", c2: "original-b" };
  const second = structuredClone(first);
  second.clauseIdentities = { c9: "original-a", c2: "original-b" };
  requirePresent(second.clauses[0]).clauseId = "c9";
  second.entities = [
    { ref: "a", clauseRefs: ["c9"] },
    { ref: "b", clauseRefs: ["c2"] }
  ];
  const pr = product(),
    next = product();
  next.propositions[0] = p("p1", "a", "c9");
  const owner = (input: AuditPacket, value: CourseProduct) =>
    requirePresent(
      planProductAudits(input, value).find((t) => t.kind === "owner" && t.checkedRefs[0] === "a")
    );
  let captures = 0;
  const x = port();
  x.capture = (call) => {
    captures++;
    const body = JSON.parse(call.user) as {
      taskRef: string;
      checkedRefs: string[];
      propositions: ProductProposition[];
    };
    return Promise.resolve({
      taskRef: body.taskRef,
      checkedRefs: body.checkedRefs,
      complete: true,
      valid: false,
      issues: [
        {
          code: "SCOPE_DEFECT",
          description: "Condition needs semantic repair",
          propositionRefs: ["p1"],
          clauseRefs: requirePresent(body.propositions[0]).clauseRefs
        }
      ]
    });
  };
  await auditProductTask(first, pr, owner(first, pr).taskRef, x, "Output JSON.");
  await auditProductTask(second, next, owner(second, next).taskRef, x, "Output JSON.");
  expect(captures).toBe(2);
  expect([...x.cache.keys()].some((k) => k.includes(":verified-alias-reuse:"))).toBe(false);
  x.capture = () => {
    throw Error("PAID_UNKNOWN_FROZEN");
  };
  await expect(
    auditProductTask(second, next, owner(second, next).taskRef, x, "Different audit JSON.")
  ).rejects.toThrow("PAID_UNKNOWN_FROZEN");
  expect([...x.cache.keys()].some((k) => k.includes(":verified-alias-reuse:"))).toBe(false);
});

it("uses low reasoning only for complete local Source checks while retaining owner and bridge reasoning", async () => {
  const captured: Array<{ promptVersion: string; reasoningEffort?: string; maxTokens: number }> =
    [];
  const x = port();
  const result = await auditCourseProduct(
    packet(),
    product(),
    {
      ...x,
      capture: (call) => {
        captured.push(call);
        return x.capture(call);
      }
    },
    "Output JSON."
  );
  expect(result.semanticAuditComplete).toBe(true);
  expect(
    captured
      .filter((c) => c.promptVersion.endsWith(":source"))
      .every((c) => c.reasoningEffort === "low")
  ).toBe(true);
  expect(
    captured
      .filter((c) => !c.promptVersion.endsWith(":source"))
      .every((c) => c.reasoningEffort === undefined)
  ).toBe(true);
  expect(captured.every((c) => c.maxTokens === DEEPSEEK_FLASH_CAPABILITIES.providerMaxOutput)).toBe(
    true
  );
});

it("supplies same-owner historical native context without allowing repair to mutate it", async () => {
  const input = packet();
  input.links = [
    { clauseRef: "c1", ownerHint: "a" },
    { clauseRef: "old", ownerHint: "a", historical: true }
  ];
  input.retiredClauses = [{ clauseId: "old", sourceId: "historical", evidenceRefs: ["old-e"] }];
  input.evidenceCatalog.push({
    ref: "old-e",
    sourceId: "historical",
    locator: "page1",
    excerpt: "Earlier instruction: submit two files."
  });
  const pr = product();
  const issue = {
    code: "CONFLICT",
    description: "Resolve current instructions",
    propositionRefs: ["p1"],
    clauseRefs: ["c1"]
  };
  const io = {
    ...port(),
    capture: async (call: { user: string }) => {
      await Promise.resolve();
      const body = JSON.parse(call.user) as {
        scope: { contextClauseRefs: string[] };
        readOnlyOwnerContext: {
          clauses: Array<{ clauseId: string }>;
          nativeEvidence: Array<{ excerpt: string }>;
        };
      };
      expect(body.scope.contextClauseRefs).toEqual(["c1"]);
      expect(
        body.readOnlyOwnerContext.clauses.map((c: { clauseId: string }) => c.clauseId)
      ).toEqual(["old"]);
      expect(requirePresent(body.readOnlyOwnerContext.nativeEvidence[0]).excerpt).toBe(
        "Earlier instruction: submit two files."
      );
      expect(JSON.stringify(body.readOnlyOwnerContext)).not.toContain("Worked example");
      return {
        propositions: [p("p1", "a", "old")],
        entities: pr.entities.filter((e) => e.ownerRef === "a"),
        context: []
      };
    }
  };
  const before = structuredClone(pr);
  await expect(captureProductRepair(input, pr, [issue], io)).rejects.toThrow("LOCAL_REPAIR_SCOPE");
  expect(pr).toEqual(before);
});

it("keeps connected repair defects joint while separating independent business owners", () => {
  const pr = product();
  pr.propositions.push(p("p2", "b", "c2"), p("p3", "a", "c3"));
  const issue = (ref: string, clause: string): ProductAuditIssue => ({
    code: "DEFECT",
    description: "Synthetic",
    propositionRefs: [ref],
    clauseRefs: [clause]
  });
  const issues = [issue("p1", "c1"), issue("p2", "c2"), issue("p3", "c3")];
  const groups = partitionProductRepairIssues(packet(), pr, issues);
  expect(groups.map((g) => g.map((i) => i.propositionRefs[0]).sort()).sort()).toEqual([
    ["p1", "p3"],
    ["p2"]
  ]);
  const joint = {
    code: "CROSS_OWNER",
    description: "Same conflict",
    propositionRefs: ["p1", "p2"],
    clauseRefs: ["c1", "c2"]
  };
  expect(partitionProductRepairIssues(packet(), pr, [...issues, joint])).toHaveLength(1);
  expect(
    partitionProductRepairIssues(packet(), pr, [
      ...issues,
      { code: "NATIVE_READ", description: "Unknown ownership", propositionRefs: [], clauseRefs: [] }
    ])
  ).toHaveLength(1);
});

it("owner audits include linked contrary statements and distant native qualifiers beyond selected quotes", () => {
  const input = packet();
  input.links = [
    { clauseRef: "c1", ownerHint: "a" },
    { clauseRef: "old", ownerHint: "a", historical: true }
  ];
  input.retiredClauses.push({ clauseId: "old", sourceId: "old-source", evidenceRefs: ["old-e"] });
  input.evidenceCatalog.push({
    ref: "old-e",
    sourceId: "old-source",
    locator: "page3",
    excerpt: "Previous table: use two files."
  });
  const wholeUnit =
    "Submit " + "Teaching context. ".repeat(80) + "Only if assigned; otherwise waived.";
  requirePresent(input.evidenceCatalog[0]).excerpt = wholeUnit;
  const task = requirePresent(
    planProductAudits(input, product()).find((t) => t.kind === "owner" && t.checkedRefs[0] === "a")
  );
  const payload = task.payload as { nativeContext: Array<{ ref: string; excerpt: string }> };
  expect(payload.nativeContext.find((e) => e.ref === "e1")?.excerpt).toBe(wholeUnit);
  expect(payload.nativeContext.find((e) => e.ref === "old-e")?.excerpt).toBe(
    "Previous table: use two files."
  );
  expect(payload.nativeContext.some((e) => e.ref === "e2")).toBe(false);
});

it("exposes cross-owner rules sharing native evidence without widening approval or repair scope", async () => {
  const input = packet();
  input.clauses.push({ clauseId: "c-rule", sourceId: "s", evidenceRefs: ["e1"] });
  const pr = product();
  pr.propositions.push(p("attendance", "b", "c-rule"));
  const task = requirePresent(
    planProductAudits(input, pr).find((t) => t.kind === "owner" && t.checkedRefs[0] === "a")
  );
  const payload = task.payload as {
    relatedReadOnlyPropositions: ProductProposition[];
    propositions: ProductProposition[];
  };
  expect(payload.relatedReadOnlyPropositions.map((p) => p.propositionRef)).toContain("attendance");
  expect(payload.propositions.map((p) => p.propositionRef)).toEqual(["p1"]);
  const io = {
    ...port(),
    capture: async (call: { user: string }) => {
      const body = JSON.parse(call.user) as {
        scope: { ownerRefs: string[]; propositionRefs: string[] };
        relatedPropositions: ProductProposition[];
        propositions: ProductProposition[];
        entities: CourseProduct["entities"];
        context: CourseProduct["context"];
      };
      expect(body.scope.ownerRefs).toEqual(["a"]);
      expect(body.scope.propositionRefs).toEqual(["p1"]);
      expect(body.relatedPropositions.map((p) => p.propositionRef)).toContain("attendance");
      return await Promise.resolve({
        propositions: [...body.propositions, p("attendance", "b", "c-rule")],
        entities: body.entities,
        context: body.context
      });
    }
  };
  await expect(
    captureProductRepair(
      input,
      pr,
      [
        {
          code: "DEFECT",
          description: "Resolve current owner",
          propositionRefs: ["p1"],
          clauseRefs: ["c1"]
        }
      ],
      io
    )
  ).rejects.toThrow("LOCAL_REPAIR_SCOPE");
});

it("PR-01: saves invalid audit candidates only under :diagnostic without polluting the main cache key", async () => {
  const saved = new Map<string, unknown>();
  const io = {
    load: (key: string) => Promise.resolve(saved.get(key)),
    save: (key: string, value: unknown) => {
      saved.set(key, value);
      return Promise.resolve();
    },
    capture: () =>
      Promise.resolve({
        taskRef: "wrong-ref",
        complete: false,
        checkedRefs: [],
        issues: []
      })
  };
  await expect(auditCourseProduct(packet(), product(), io, "audit system")).rejects.toThrow(
    "AUDIT_INCOMPLETE_SCOPE"
  );
  const keys = [...saved.keys()];
  expect(keys.length).toBeGreaterThan(0);
  expect(keys.every((k) => k.endsWith(":diagnostic"))).toBe(true);
});
