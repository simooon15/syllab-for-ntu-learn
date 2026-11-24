import { requirePresent } from "./errors";
import { describe, expect, it } from "vitest";
import {
  PRODUCT_POLICY,
  PRODUCT_AUDIT,
  organizeCourseProduct,
  validateCourseProduct,
  productDependencyIssues,
  courseProductPacket,
  type CourseProduct,
  type ProductProposition
} from "./course-product";
import { SELECTIVE_COURSE_SCHEMA, compileCourseDraft, type CourseDraft } from "./selective-course";
import { directReviewItems } from "./direct-review";
import { makeCourse } from "./testing";
import { auditOwnerRecovery, planProductAudits } from "./product-audit";
const draft = (): CourseDraft => ({
  schema: SELECTIVE_COURSE_SCHEMA,
  clauses: [
    {
      clauseId: "a",
      sourceId: "source",
      kind: "field",
      field: "weight",
      content: "Quiz is worth 35% and is closed book.",
      value: { state: "KNOWN", value: "35%" },
      modality: "descriptive",
      conditions: [],
      exceptions: [],
      applicability: "CURRENT",
      context: "Current quiz",
      evidence: [
        {
          evidenceId: "e",
          sourceId: "source",
          locator: "page1",
          excerpt: "Quiz is worth 35% and is closed book."
        }
      ]
    },
    {
      clauseId: "b",
      sourceId: "source",
      kind: "requirement",
      content: "In this worked example, students must submit a model.",
      value: { state: "KNOWN", value: "In this worked example, students must submit a model." },
      modality: "must",
      conditions: [],
      exceptions: [],
      applicability: "CURRENT",
      context: "Worked example",
      evidence: [
        {
          evidenceId: "eb",
          sourceId: "source",
          locator: "page2",
          excerpt: "In this worked example, students must submit a model."
        }
      ]
    }
  ],
  entities: [
    {
      ref: "quiz",
      name: "Quiz",
      type: "quiz_test",
      role: "assessment",
      aliases: [],
      clauseRefs: ["a"]
    },
    {
      ref: "example",
      name: "Example assignment",
      type: "assignment",
      role: "assessment",
      aliases: [],
      clauseRefs: ["b"]
    }
  ],
  links: [
    {
      clauseRef: "a",
      ownerRef: "quiz",
      disposition: "CURRENT",
      state: "KNOWN",
      competingClauseRefs: [],
      resolutionClauseRefs: [],
      basis: "Quiz"
    },
    {
      clauseRef: "b",
      ownerRef: "example",
      disposition: "CURRENT",
      state: "KNOWN",
      competingClauseRefs: [],
      resolutionClauseRefs: [],
      basis: "Previously mispromoted example"
    }
  ],
  identities: [],
  inspections: [],
  deepLocators: {}
});
const proposition = (overrides: Partial<ProductProposition> = {}): ProductProposition => ({
  propositionRef: "quiz.weight",
  ownerRef: "quiz",
  predicate: "weight",
  value: { state: "KNOWN", value: "35%" },
  unit: "percent_course",
  disposition: "ACTION",
  role: "core",
  title: "Course weight",
  group: "Quiz overview",
  relation: "INDEPENDENT",
  modality: "descriptive",
  conditions: [],
  exceptions: [],
  clauseRefs: ["a"],
  support: [{ clauseRef: "a", quote: "35%" }],
  basis: "Explicit current course weight",
  independentReview: false,
  ...overrides
});
const product = (): CourseProduct => ({
  policy: PRODUCT_POLICY,
  entities: [
    { ownerRef: "quiz", disposition: "CURRENT", basis: "Explicit assessment" },
    { ownerRef: "example", disposition: "REFERENCE", basis: "Teaching example, not current work" }
  ],
  propositions: [
    proposition(),
    proposition({
      propositionRef: "quiz.mode",
      predicate: "mode",
      value: { state: "KNOWN", value: "closed book" },
      unit: "text",
      title: "Mode",
      support: [{ clauseRef: "a", quote: "closed book" }]
    })
  ],
  context: [{ clauseRefs: ["b"], disposition: "BACKGROUND", basis: "Worked example retained" }]
});

describe("RC2 source-preserving product contract", () => {
  it("certifies the complete scripted production path using exact owner recovery without repeating the old owner request", async () => {
    const d = { ...draft(), product: product() };
    requirePresent(d.product.propositions[1]).group = "Assessment mode";
    const packet = courseProductPacket(d);
    const original = requirePresent(
      planProductAudits(packet.auditInput, packet.encode(d.product) as CourseProduct).find(
        (t) => t.kind === "owner" && t.checkedRefs[0] === "quiz"
      )
    );
    const cache = new Map<string, unknown>(),
      stages: string[] = [];
    const port = {
      load: async (key: string) => Promise.resolve(cache.get(key)),
      save: async (key: string, value: unknown) => {
        cache.set(key, value);
        await Promise.resolve();
      },
      capture: async (call: { promptVersion: string; user: string }) => {
        const body = JSON.parse(call.user) as { taskRef: string; checkedRefs: string[] };
        if (body.taskRef === original.taskRef) throw Error("TEST_FROZEN_ORIGINAL_OWNER");
        if (!call.promptVersion.startsWith("bounded-product-audit/"))
          throw Error("TEST_REGENERATION_FORBIDDEN");
        stages.push(call.promptVersion);
        return Promise.resolve({
          schema: "syllab.ai.course-product/1",
          taskRef: body.taskRef,
          checkedRefs: body.checkedRefs,
          complete: true,
          issues: []
        });
      }
    };
    await auditOwnerRecovery(original, port, PRODUCT_AUDIT, packet.auditInput);
    const organized = await organizeCourseProduct(d, port);
    expect(organized.product).toEqual(d.product);
    expect(organized.productVerification).toBeTruthy();
    expect(stages.filter((s) => s.endsWith(":owner-composition"))).toHaveLength(1);
    expect(stages.filter((s) => s.endsWith(":source"))).toHaveLength(2);
    expect(stages.filter((s) => s.endsWith(":bridge"))).toHaveLength(1);
    const before = stages.length;
    await organizeCourseProduct(organized, port);
    const withoutCertificate = { ...organized };
    delete withoutCertificate.productVerification;
    await organizeCourseProduct(withoutCertificate, port);
    expect(stages).toHaveLength(before);
    expect(d.clauses).toEqual(draft().clauses);
  });

  it("rejects missing approval scope on a reference candidate instead of inheriting a decision", () => {
    const candidate = product();
    const first = requirePresent(candidate.propositions[0]);
    first.role = "reference";
    first.disposition = "REFERENCE";
    const wire = JSON.parse(JSON.stringify(candidate)) as {
      propositions: Array<Record<string, unknown>>;
    };
    delete requirePresent(wire.propositions[0]).independentReview;
    const before = structuredClone(wire);
    expect(() => validateCourseProduct(wire, draft())).toThrow("REVIEW_SCOPE");
    expect(wire).toEqual(before);
    expect(first.independentReview).toBe(false);
  });
  it("allows multiple accurately typed propositions from one immutable compound clause", () => {
    const d = draft(),
      before = structuredClone(d);
    const p = validateCourseProduct(product(), d);
    expect(p.propositions.map((x) => [x.predicate, x.value.value])).toEqual([
      ["weight", "35%"],
      ["mode", "closed book"]
    ]);
    expect(d).toEqual(before);
    const course = makeCourse();
    const sources = [
      {
        sourceId: "source",
        courseId: course.courseId,
        nativeItemId: "source",
        kind: "attachment",
        title: "Synthetic course brief",
        updatedAt: course.updatedAt,
        parsed: { text: d.clauses.map((c) => c.content).join("\n"), structure: [] }
      }
    ];
    const result = compileCourseDraft({ ...d, product: p }, sources, {
      course,
      now: "2026-10-11T00:00:00Z",
      workflowId: "fixture-056",
      exclusionKeys: new Set(),
      sources: new Map([["source", { sourceId: "source", title: "Synthetic course brief" }]]),
      sourceRecords: sources
    });
    expect(result.candidate.bundle.facts.map((f) => [f.field, f.value.value])).toEqual([
      ["weight", "35%"],
      ["mode", "closed book"]
    ]);
    const items = directReviewItems(result.candidate, course.courseId, "wf", "now");
    expect(result.candidate.bundle.evidence.some((e) => e.evidenceId === "eb")).toBe(true);
    expect(items).toHaveLength(1);
    expect(items[0]?.payload.scopeFactIds).toHaveLength(2);
  });
  it("rejects the original Mode=percentage defect instead of rendering it", () => {
    const p = product();
    p.propositions[1] = proposition({ propositionRef: "mode", predicate: "mode", unit: "text" });
    expect(() => validateCourseProduct(p, draft())).toThrow("MODE_PERCENT");
  });
  it("rejects silent loss of source observations and forged support", () => {
    const p = product();
    p.context = [];
    expect(() => validateCourseProduct(p, draft())).toThrow("OBSERVATION_COVERAGE");
    const bad = product();
    requirePresent(requirePresent(bad.propositions[0]).support[0]).quote = "not in source";
    expect(() => validateCourseProduct(bad, draft())).toThrow("SUPPORT_QUOTE");
  });
  it("rejects a hierarchy cycle and scope cross-contamination", () => {
    const p = product();
    requirePresent(p.propositions[0]).parentRef = "quiz.mode";
    requirePresent(p.propositions[1]).parentRef = "quiz.weight";
    expect(() => validateCourseProduct(p, draft())).toThrow("PARENT_CYCLE");
    const q = product();
    requirePresent(q.propositions[0]).ownerRef = "example";
    expect(() => validateCourseProduct(q, draft())).toThrow("OWNER_DISPOSITION");
  });
  it("never promotes retired historical evidence as a current action", () => {
    const d = draft();
    requirePresent(d.links[0]).disposition = "HISTORICAL";
    expect(() => validateCourseProduct(product(), d)).toThrow("HISTORICAL_PROMOTION");
  });
  it("cache replay is zero paid and keyed to delivered original content", async () => {
    const cache = new Map<string, unknown>();
    let calls = 0;
    const port = {
      load: async (key: string) => await Promise.resolve(cache.get(key)),
      save: async (key: string, value: unknown) => {
        await Promise.resolve();

        cache.set(key, value);
      },
      capture: async (call: { promptVersion: string; user: string }) => {
        await Promise.resolve();

        calls++;
        return call.promptVersion.startsWith("bounded-product-audit/")
          ? {
              ...(JSON.parse(call.user) as Record<string, unknown>),
              complete: true,
              valid: true,
              issues: []
            }
          : { product: product() };
      }
    };
    await organizeCourseProduct(draft(), port);
    await organizeCourseProduct(draft(), port);
    expect(calls).toBe(6);
    const changed = draft();
    requirePresent(changed.clauses[1]).context = "Changed applicability";
    await organizeCourseProduct(changed, port);
    expect(calls).toBe(6); // Derived Reader context is not new source evidence.
    requirePresent(requirePresent(changed.clauses[1]).evidence[0]).excerpt += " Extra native note.";
    await organizeCourseProduct(changed, port);
    expect(calls).toBe(9);
  });
  it("re-audits an archived candidate without paying to regenerate the whole product", async () => {
    const d = { ...draft(), product: product() };
    const stages: string[] = [];
    const saved = new Map<string, unknown>();
    const port = {
      load: async (key: string) => await Promise.resolve(saved.get(key)),
      save: async (key: string, value: unknown) => {
        saved.set(key, value);
        await Promise.resolve();
      },
      capture: async (call: { promptVersion: string; user: string }) => {
        stages.push(call.promptVersion);
        if (!call.promptVersion.startsWith("bounded-product-audit/"))
          throw Error("WHOLE_PRODUCT_REGENERATION_FORBIDDEN");
        return await Promise.resolve({
          ...(JSON.parse(call.user) as Record<string, unknown>),
          complete: true,
          valid: true,
          issues: []
        });
      }
    };
    const organized = await organizeCourseProduct(d, port);
    expect(stages).toHaveLength(5);
    expect(organized.product).toEqual(validateCourseProduct(d.product, d));
    expect(organized.productVerification).toBeTruthy();
    requirePresent(d.product.propositions[1]).value = { state: "KNOWN", value: "35%" };
    await expect(organizeCourseProduct(d, port)).rejects.toThrow("LOCAL_CONTRACT_REPAIR_REQUIRED");
    expect(stages).toHaveLength(5);
    expect([...saved.keys()].some((key) => key.endsWith(":local-repair-required"))).toBe(true);
  });
});

it("stops repeated unresolved defect scopes even when a patch changes wording, without a guessed retry count", async () => {
  const saved = new Map<string, unknown>();
  let patches = 0;
  const d = { ...draft(), product: product() };
  const port = {
    load: async (key: string) => await Promise.resolve(saved.get(key)),
    save: async (key: string, value: unknown) => {
      saved.set(key, value);
      await Promise.resolve();
    },
    capture: async (call: { promptVersion: string; user: string }) => {
      const body = JSON.parse(call.user) as Record<string, unknown>;
      if (call.promptVersion.endsWith(":local-repair")) {
        patches++;
        return await Promise.resolve({
          propositions: (body.propositions as ProductProposition[]).map((p) => ({
            ...p,
            basis: "Changed wording but defect not resolved"
          })),
          entities: body.entities,
          context: body.context
        });
      }
      const props = body.propositions as ProductProposition[] | undefined;
      const first = props?.find((p) => p.predicate === "weight");
      return await Promise.resolve({
        taskRef: body.taskRef,
        checkedRefs: body.checkedRefs,
        complete: true,
        valid: !first,
        issues: first
          ? [
              {
                code: "UNRESOLVED_WEIGHT",
                description: "Native support is still disputed",
                propositionRefs: [first.propositionRef],
                clauseRefs: first.clauseRefs
              }
            ]
          : []
      });
    }
  };
  await expect(organizeCourseProduct(d, port)).rejects.toThrow("LOCAL_SEMANTIC_REPAIR_NO_PROGRESS");
  expect(patches).toBe(1);
  expect([...saved.keys()].some((k) => k.endsWith(":bounded-audit"))).toBe(true);
});

it("invalidates replaced source dependencies without treating preserved history as a new change", () => {
  const d = draft(),
    prior = product(),
    original = structuredClone(d.clauses);
  d.retiredClauses = [{ ...requirePresent(d.clauses[0]), clauseId: "historical" }];
  requirePresent(prior.propositions[0]).clauseRefs.push("historical");
  expect(productDependencyIssues(prior, d)).toEqual([]);
  d.retiredClauses = original;
  d.clauses = original.map((c) => ({ ...c, clauseId: c.clauseId + "-new" }));
  const preserved = structuredClone(prior);
  const issues = productDependencyIssues(prior, d);
  expect(issues.some((i) => i.code === "SOURCE_DEPENDENCY_CHANGED")).toBe(true);
  expect(issues.find((i) => i.code === "SOURCE_DEPENDENCY_CHANGED")?.clauseRefs).toEqual(
    expect.arrayContaining(["a", "a-new", "b-new"])
  );
  expect(prior).toEqual(preserved);
});

it("adds a scoped new task without dates or weight while preserving existing owners and evidence", async () => {
  const d = draft(),
    prior = product();
  d.product = prior;
  const original = structuredClone(prior);
  const source = requirePresent(d.clauses[1]);
  d.clauses.push({
    ...source,
    clauseId: "new-action",
    sourceId: "ordinary-slide",
    content: "Upload a reflection before the next tutorial.",
    value: { state: "KNOWN", value: "Upload a reflection before the next tutorial." },
    evidence: [
      {
        evidenceId: "new-evidence",
        sourceId: "ordinary-slide",
        locator: "page5",
        excerpt: "Upload a reflection before the next tutorial."
      }
    ]
  });
  d.entities.push({
    ref: "reflection",
    name: "Reflection",
    type: "assignment",
    role: "assessment",
    aliases: [],
    clauseRefs: ["new-action"]
  });
  d.links.push({
    clauseRef: "new-action",
    ownerRef: "reflection",
    disposition: "CURRENT",
    state: "KNOWN",
    competingClauseRefs: [],
    resolutionClauseRefs: [],
    basis: "New authored instruction in ordinary slide"
  });
  const requests: Array<{ promptVersion: string; user: string }> = [];
  const organized = await organizeCourseProduct(d, {
    load: () => Promise.resolve(undefined),
    save: async () => {},
    capture: async (call) => {
      await Promise.resolve();
      requests.push(call);
      const input = JSON.parse(call.user) as {
        scope?: { ownerRefs: string[] };
        clauses?: Array<{ clauseId: string }>;
        taskRef?: string;
        checkedRefs?: string[];
      };
      if (call.promptVersion.endsWith(":local-repair")) {
        expect(input.scope?.ownerRefs).toEqual(["reflection"]);
        const ref = requirePresent(input.clauses?.[0]).clauseId;
        return {
          schema: "syllab.ai.course-product/1",
          entities: [
            {
              ownerRef: "reflection",
              disposition: "CURRENT",
              basis: "Explicit authored upload requirement"
            }
          ],
          propositions: [
            proposition({
              propositionRef: "reflection.upload",
              ownerRef: "reflection",
              predicate: "requirement",
              value: { state: "KNOWN", value: "Upload a reflection before the next tutorial." },
              unit: "text",
              role: "action",
              modality: "must",
              clauseRefs: [ref],
              support: [{ clauseRef: ref, quote: "Upload a reflection before the next tutorial." }],
              independentReview: true
            })
          ],
          context: []
        };
      }
      if (call.promptVersion.startsWith("bounded-product-audit/2:"))
        return {
          schema: "syllab.ai.course-product/1",
          taskRef: input.taskRef,
          checkedRefs: input.checkedRefs,
          complete: true,
          valid: true,
          issues: []
        };
      throw Error("NEW_TASK_WHOLE_PRODUCT_REGENERATION_FORBIDDEN");
    }
  });
  expect(requests.filter((c) => c.promptVersion.endsWith(":local-repair"))).toHaveLength(1);
  expect(organized.product?.entities.find((e) => e.ownerRef === "reflection")?.disposition).toBe(
    "CURRENT"
  );
  expect(organized.product?.propositions.filter((p) => p.ownerRef !== "reflection")).toEqual(
    original.propositions
  );
  expect(organized.clauses).toEqual(d.clauses);
  expect(prior).toEqual(original);
});

it("stops repeated native recovery on the same exact missing instruction without issuing a whole-course repair", async () => {
  const d = { ...draft(), product: product() };
  const sources = [
    {
      sourceId: "ordinary",
      courseId: "course",
      nativeItemId: "ordinary",
      kind: "attachment" as const,
      title: "Methods",
      updatedAt: "2026-10-13",
      parsed: {
        text: "",
        structure: [],
        units: [{ locator: "page:1", text: "Upload a memo before class.", partial: false }]
      }
    }
  ];
  const saved = new Map<string, unknown>();
  let recoveries = 0;
  const before = structuredClone(d);
  await expect(
    organizeCourseProduct(
      d,
      {
        load: (key) => Promise.resolve(saved.get(key)),
        save: (key, value) => {
          saved.set(key, value);
          return Promise.resolve();
        },
        capture: (call) => {
          if (!call.promptVersion.startsWith("bounded-product-audit/"))
            throw Error("WHOLE_PRODUCT_REPAIR_FORBIDDEN");
          const body = JSON.parse(call.user) as {
            taskRef: string;
            checkedRefs: string[];
            evidence?: Array<{ ref: string; sourceId: string }>;
          };
          const native = body.evidence?.find((e) => e.sourceId === "ordinary");
          return Promise.resolve({
            ...body,
            complete: true,
            valid: !native,
            issues: native
              ? [
                  {
                    code: "MISSING_NATIVE_TASK",
                    description: "Missing authored instruction",
                    propositionRefs: [],
                    clauseRefs: [],
                    requiresRead: true,
                    nativeRefs: [native.ref],
                    nativeQuote: "Upload a memo before class."
                  }
                ]
              : []
          });
        }
      },
      undefined,
      sources,
      (current, reads) => {
        recoveries++;
        expect(reads).toMatchObject([{ sourceId: "ordinary", locators: ["page:1"] }]);
        return Promise.resolve(current);
      }
    )
  ).rejects.toThrow("RISK_READ_NO_PROGRESS");
  expect(recoveries).toBe(1);
  expect(d).toEqual(before);
  expect([...saved.keys()].some((k) => k.endsWith(":native-read-recovery"))).toBe(true);
});

it("persists a validated owner repair before a later scope fails and resumes without repeating it", async () => {
  const d = draft();
  const candidate = product();
  requirePresent(candidate.entities.find((e) => e.ownerRef === "example")).disposition = "CURRENT";
  candidate.context = [];
  requirePresent(candidate.propositions[0]).value.competingValues = ["Earlier weight"];
  candidate.propositions.push(
    proposition({
      propositionRef: "example.action",
      ownerRef: "example",
      predicate: "requirement",
      unit: "text",
      value: { state: "KNOWN", value: "Submit a model", competingValues: ["Earlier action"] },
      role: "action",
      modality: "must",
      clauseRefs: ["b"],
      support: [{ clauseRef: "b", quote: "submit a model" }]
    })
  );
  d.product = candidate;
  const before = structuredClone(d);
  const cache = new Map<string, unknown>();
  const repairedOwners: string[] = [];
  let failSecond = true;
  const port = {
    load: async (key: string) => await Promise.resolve(cache.get(key)),
    save: async (key: string, value: unknown) => {
      cache.set(key, structuredClone(value));
      await Promise.resolve();
    },
    capture: async (call: { user: string; promptVersion: string }) => {
      const body = JSON.parse(call.user) as {
        scope: { ownerRefs: string[] };
        propositions: ProductProposition[];
        entities: CourseProduct["entities"];
        context: CourseProduct["context"];
        taskRef: string;
        checkedRefs: string[];
      };
      if (call.promptVersion.endsWith(":local-repair")) {
        const owner = requirePresent(body.scope.ownerRefs[0]);
        repairedOwners.push(owner);
        if (owner === "example" && failSecond) throw Error("SYNTHETIC_SECOND_OWNER_FAILED");
        return await Promise.resolve({
          propositions: body.propositions.map((p) => ({
            ...p,
            value: { state: "KNOWN", value: p.value.value }
          })),
          entities: body.entities,
          context: body.context
        });
      }
      if (!call.promptVersion.startsWith("bounded-product-audit/"))
        throw Error("WHOLE_PRODUCT_REGENERATION_FORBIDDEN");
      return await Promise.resolve({
        taskRef: body.taskRef,
        checkedRefs: body.checkedRefs,
        complete: true,
        valid: true,
        issues: []
      });
    }
  };
  await expect(organizeCourseProduct(d, port)).rejects.toThrow("SYNTHETIC_SECOND_OWNER_FAILED");
  expect(repairedOwners).toEqual(["quiz", "example"]);
  expect(d).toEqual(before);
  failSecond = false;
  const result = await organizeCourseProduct(d, port);
  expect(repairedOwners).toEqual(["quiz", "example", "example"]);
  expect(result.product?.propositions.every((p) => !p.value.competingValues?.length)).toBe(true);
  expect(result.productVerification).toBeTruthy(); // Scripted full audit, never a real-model claim.
  expect(d).toEqual(before);
});
