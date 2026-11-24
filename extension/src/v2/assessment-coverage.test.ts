import { describe, it, expect } from "vitest";
import {
  validateSourceCoverage,
  sourceInventory,
  registryInventory,
  validateInventoryRouting,
  groupInventory,
  validateCoverageDecisions
} from "./assessment-coverage";
import { validateTaskA, validateTaskB } from "./ai-contracts";
import { sessionSystem, runSession } from "./architecture-runner";
import { validateOutputA, validateOutputB2 } from "./assessment-output";
import { materializeTaskB } from "./materialize";
import { scopeEvidenceIds, validateProvenance } from "./architecture-provenance";
import { makeCourse } from "./testing";
import type { RegistryRecord } from "./progressive-registry";
function at<T>(xs: T[], i: number): T {
  const value = xs[i];
  if (value === undefined) throw Error("TEST_MISSING");
  return value;
}
const text = "Current report; check audio; old date is template only; shared rule.";
const e = { sourceId: "s", locator: "native-text", excerpt: text, evidenceId: "e" };
const scope = {
  sources: [
    {
      sourceId: "s",
      courseId: "c",
      nativeItemId: "s",
      kind: "content",
      title: "Synthetic",
      updatedAt: "now",
      parsed: {
        text,
        contentHash: "h",
        units: [{ locator: "native-text", text, partial: false }],
        structure: []
      }
    }
  ],
  evidence: [],
  objects: {}
};
const unit = {
  unitId: "u",
  sourceId: "s",
  kind: "requirement" as const,
  content: "Synthetic audio instruction",
  evidence: [e]
};
const a = () => ({
  schema: "syllab.ai.task-a/1",
  sourceId: "s",
  sourceResult: "RELEVANT_INFORMATION_FOUND",
  fileContext: "Synthetic current source",
  identityContext: "Synthetic report",
  assessmentDrafts: [],
  courseWideConstraintCandidates: [],
  unresolvedIssues: [],
  semanticInventory: [unit],
  sourceCoverage: [
    { locator: "native-text", status: "EXAMINED", reason: "AI synthetic review", evidence: [e] }
  ]
});
const group: RegistryRecord = {
  id: "g",
  revision: 1,
  kind: "group",
  payload: { memberDraftIds: ["d"], role: "assessment", parentGroupId: null }
};
const route = (id = "u", disposition = "GROUP"): RegistryRecord => ({
  id: "route",
  revision: 1,
  kind: "issue",
  payload: {
    semanticDisposition: {
      unitId: id,
      disposition,
      targetIds: disposition === "EXCLUDED" ? [] : ["g"],
      reason: "Synthetic AI applicability",
      evidence: [e]
    }
  }
});
const b = () => ({
  schema: "syllab.ai.task-b/1",
  upstream: { groupId: "g", revision: 1, memberDraftIds: ["d"] },
  identityResolutions: [],
  structuralRelationships: [],
  courseWideConstraintProposals: [],
  fieldConsolidationResults: [],
  unresolvedIssues: [],
  canonicalAssessmentProposals: [
    {
      proposalId: "p",
      canonicalName: "Synthetic report",
      type: "assignment",
      role: "assessment",
      aliases: [],
      consolidatedFields: [] as unknown[],
      requirements: [{ requirementId: "r", content: unit.content, evidence: [e] }],
      supportingEvidence: [e],
      unresolvedIssues: []
    }
  ],
  semanticInventory: [],
  coverageDecisions: [
    {
      unitId: "u",
      disposition: "KEEP",
      reason: "Synthetic applicable instruction",
      evidence: [e],
      targets: [{ proposalId: "p", kind: "requirement", id: "r" }]
    }
  ]
});
const check = (v: unknown, units = [unit]) =>
  validateCoverageDecisions(validateTaskB(v, new Set(["s"])), units, scope);
describe("semantic coverage /3: mechanical contract, never model-quality claims", () => {
  it.each(["A", "B1", "B2", "C"] as const)(
    "routes inventory-first semantics through %s",
    (stage) => {
      expect(sessionSystem(stage)).toContain("SEMANTIC COVERAGE /3");
      expect(sessionSystem(stage, "assessment-relevance/2")).not.toContain("SEMANTIC COVERAGE /3");
    }
  );
  it("accepts literal nested quotes in the same native locator without rewriting Evidence", () => {
    const v = b();
    const d = at(v.coverageDecisions, 0);
    d.evidence = [{ ...e, evidenceId: "e-short", excerpt: "check audio" }];
    check(v);
    expect(d.evidence[0]?.excerpt).toBe("check audio");
  });
  it("rejects disjoint native quotes even from the same Source and locator", () => {
    const v = b();
    const d = at(v.coverageDecisions, 0);
    d.evidence = [{ ...e, evidenceId: "e-short", excerpt: "check audio" }];
    at(at(v.canonicalAssessmentProposals, 0).requirements, 0).evidence = [
      { ...e, excerpt: "shared rule" }
    ];
    expect(() => check(v)).toThrow("TARGET_SUPPORT");
  });
  it("preserves Source inventory and indexed examination through A parser", () => {
    const r = validateTaskA(a(), new Set(["s"]));
    validateOutputA(r);
    validateSourceCoverage(r, scope);
    expect(r.semanticInventory).toEqual([unit]);
  });
  it("retains zero-draft Source inventory rather than losing instructions", () => {
    const units = sourceInventory([{ sourceId: "s", result: validateTaskA(a(), new Set(["s"])) }]);
    expect(units).toHaveLength(1);
    const records = [group, route(at(units, 0).unitId)];
    validateInventoryRouting(units, records, scope);
    expect(groupInventory(units, records, "g")).toEqual(units);
  });
  it("rejects missing native locator coverage", () => {
    const r = a();
    r.sourceCoverage = [];
    expect(() => validateSourceCoverage(validateTaskA(r, new Set(["s"])), scope)).toThrow(
      "LOCATOR_MISSING"
    );
  });
  it("keeps unread Partial explicit, never claims it irrelevant", () => {
    const r = {
      ...a(),
      sourceResult: "PARTIALLY_UNDERSTOOD",
      unresolvedIssues: ["Unread page"],
      sourceCoverage: [
        { locator: "native-text", status: "UNRESOLVED", reason: "Unread", evidence: [] }
      ]
    };
    expect(() => validateSourceCoverage(validateTaskA(r, new Set(["s"])), scope)).not.toThrow();
    r.sourceResult = "NO_RELEVANT_INFORMATION";
    expect(() => validateSourceCoverage(validateTaskA(r, new Set(["s"])), scope)).toThrow(
      "UNREAD_NOT_PARTIAL"
    );
  });
  it("rejects unsupported examined page and missing A owner routing", () => {
    const r = a();
    at(r.sourceCoverage, 0).evidence = [{ ...e, locator: "other" }];
    expect(() => validateSourceCoverage(validateTaskA(r, new Set(["s"])), scope)).toThrow(
      "LOCATOR_SUPPORT"
    );
    const q = {
      ...a(),
      assessmentDrafts: [{ fields: [{ fieldName: "weight" }], requirements: [] }]
    };
    expect(() => validateSourceCoverage(validateTaskA(q, new Set(["s"])), scope)).toThrow(
      "A_NODE_ROUTING"
    );
  });
  it.each(["GROUP", "RULE", "UNCERTAIN"])("rejects dangling %s destination", (d) => {
    expect(() => validateInventoryRouting([unit], [route("u", d)], scope)).toThrow(
      "ROUTING_TARGET"
    );
  });
  it("rejects missing or duplicate B1 inventory and allows explicit exclusions", () => {
    expect(() => validateInventoryRouting([unit], [group], scope)).toThrow("ROUTING_MISSING");
    expect(() => validateInventoryRouting([unit], [group, route(), route()], scope)).toThrow(
      "ROUTING"
    );
    expect(() => validateInventoryRouting([unit], [route("u", "EXCLUDED")], scope)).not.toThrow();
  });
  it("routes real uncertain Group, and preserves discovered units with provenance", () => {
    const g = { ...group, payload: { ...group.payload, relevance: { status: "UNCERTAIN" } } };
    expect(() =>
      validateInventoryRouting([unit], [g, route("u", "UNCERTAIN")], scope)
    ).not.toThrow();
    const discovered: RegistryRecord = {
      id: "new",
      revision: 1,
      kind: "issue",
      payload: { semanticUnit: { ...unit, unitId: "extra" } }
    };
    expect(registryInventory([unit], [discovered], scope)).toHaveLength(2);
  });
  it("strict B2 content, decisions and actual materializer preserve same requirement", () => {
    const value = b();
    const r = validateTaskB(value, new Set(["s"]));
    validateOutputB2(value, r, group);
    check(value);
    const qualified = scopeEvidenceIds(r, "c", scope);
    const refs = validateProvenance(qualified, scope);
    const m = materializeTaskB(
      validateTaskB(qualified, new Set(["s"])),
      {
        strictOutput: true,
        course: makeCourse({ courseId: "c" }),
        workflowId: "test",
        sourceRecords: scope.sources,
        evidence: refs,
        sources: new Map([["s", { sourceId: "s", title: "Synthetic" }]]),
        exclusionKeys: new Set(),
        now: "now"
      },
      new Map(),
      new Set()
    );
    expect(
      (m.bundle.facts ?? []).filter((f) => f.field === "requirement").map((f) => f.value.value)
    ).toEqual([unit.content]);
  });
  it.each(["KEEP", "MERGE"])(
    "%s may consolidate two inventoried units into one supported node",
    (d) => {
      const v = b();
      v.coverageDecisions = [
        { ...at(v.coverageDecisions, 0), disposition: d },
        { ...at(v.coverageDecisions, 0), unitId: "u2", disposition: d }
      ];
      expect(() => check(v, [unit, { ...unit, unitId: "u2" }])).not.toThrow();
    }
  );
  it("rejects missing, duplicate or fabricated unit decisions", () => {
    const v = b();
    v.coverageDecisions = [];
    expect(() => check(v)).toThrow("DECISION_MISSING");
    v.coverageDecisions = [at(b().coverageDecisions, 0), at(b().coverageDecisions, 0)];
    expect(() => check(v)).toThrow("DECISION");
    at(v.coverageDecisions, 0).unitId = "fabricated";
    expect(() => check(v)).toThrow("DECISION");
  });
  it("exclusions keep explicit AI reason/Evidence without adding a requirement", () => {
    const v = b();
    at(v.canonicalAssessmentProposals, 0).requirements = [];
    at(v.coverageDecisions, 0).disposition = "EXCLUDE";
    at(v.coverageDecisions, 0).targets = [];
    expect(() => check(v)).not.toThrow();
    at(v.coverageDecisions, 0).reason = "";
    expect(() => check(v)).toThrow("DECISION");
  });
  it("Uncertain must appear as a real UNCERTAIN field, not disappear as a private issue", () => {
    const v = b();
    at(v.coverageDecisions, 0).disposition = "UNCERTAIN";
    expect(() => check(v)).toThrow("UNCERTAIN_TARGET");
    const x = {
      ...v,
      canonicalAssessmentProposals: [
        {
          ...v.canonicalAssessmentProposals[0],
          consolidatedFields: [
            {
              fieldName: "Applicability",
              state: "UNCERTAIN",
              value: "Synthetic unclear",
              competingValues: [],
              evidence: [e]
            }
          ]
        }
      ],
      coverageDecisions: [
        {
          ...v.coverageDecisions[0],
          targets: [{ proposalId: "p", kind: "field", id: "Applicability" }]
        }
      ]
    };
    expect(() => check(x)).not.toThrow();
  });
  it("rejects missing target and forged support; aliases do not infer dates", () => {
    const v = b();
    at(at(v.coverageDecisions, 0).targets, 0).id = "missing";
    expect(() => check(v)).toThrow("TARGET_MISSING");
    const q = b();
    at(q.coverageDecisions, 0).evidence = [{ ...e, excerpt: "Invented" }];
    expect(() => check(q)).toThrow();
  });
  it("session cannot reuse old snapshot/policy to silently upgrade saved results", async () => {
    await expect(
      runSession(
        "id",
        "B2",
        {},
        {
          semanticPolicy: "assessment-relevance/3",
          load: () =>
            Promise.resolve({
              id: "id",
              stage: "B2",
              snapshot: "old",
              state: "final",
              output: b()
            } as never),
          save: async () => {},
          execute: () => Promise.reject(Error("No dispatch permitted")),
          resolve: () => Promise.resolve([]),
          validateFinal: () => {}
        }
      )
    ).rejects.toThrow("SESSION_POLICY");
  });
});

describe("B1 discovered-unit wire enums", () => {
  it("explicitly instructs legal discovered kinds and still rejects unmodified invalid output", () => {
    expect(sessionSystem("B1", "assessment-relevance/4")).toContain(
      "kind:obligation|requirement|fact|rule|context"
    );
    const record: RegistryRecord = {
      id: "issue",
      kind: "issue",
      revision: 1,
      payload: { semanticUnit: { ...unit, unitId: "new", kind: "instruction" } }
    };
    expect(() => registryInventory([unit], [record], scope)).toThrow("SEMANTIC_COVERAGE:UNIT");
  });
});

describe("version4 collective target linkage", () => {
  it("retains a facet quote in one destination while allowing a separately supported related field", () => {
    const facet = { ...unit, evidence: [{ ...e, excerpt: "Current report" }] };
    const v = b(),
      proposal = at(v.canonicalAssessmentProposals, 0);
    proposal.consolidatedFields = [
      {
        fieldName: "Related",
        state: "KNOWN",
        value: "Synthetic separate fact",
        competingValues: [],
        evidence: [{ ...e, evidenceId: "e2", excerpt: "shared rule" }]
      }
    ];
    at(v.coverageDecisions, 0).evidence = facet.evidence;
    at(v.coverageDecisions, 0).targets.push({ proposalId: "p", kind: "field", id: "Related" });
    const r = validateTaskB(v, new Set(["s"]));
    expect(() => validateCoverageDecisions(r, [facet], scope)).toThrow("TARGET_SUPPORT");
    expect(() =>
      validateCoverageDecisions(r, [facet], scope, { collectiveTargets: true })
    ).not.toThrow();
    proposal.requirements = [];
    at(v.coverageDecisions, 0).targets.shift();
    expect(() =>
      validateCoverageDecisions(validateTaskB(v, new Set(["s"])), [facet], scope, {
        collectiveTargets: true
      })
    ).toThrow("TARGET_SUPPORT");
  });
});
