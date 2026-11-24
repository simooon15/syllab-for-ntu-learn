import { describe, it, expect } from "vitest";
import {
  validateFacetInventory,
  validateFacetSynthesis,
  nativeFacetContent
} from "./semantic-facets";
import { AI_SCHEMAS } from "./contract-registry";
import { validateTaskB } from "./ai-contracts";
const text = "Use portal for the report; no hand delivery; pre-approved exceptions only.";
const e = { evidenceId: "e", sourceId: "s", locator: "native-text", excerpt: text };
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
const parent = {
  unitId: "u",
  sourceId: "s",
  kind: "requirement" as const,
  content: text,
  evidence: [e]
};
const inventory = () => ({
  schema: AI_SCHEMAS.facets,
  nativeAudit: [
    {
      sourceId: "s",
      locator: "native-text",
      status: "EXAMINED",
      facetIds: ["f1", "f2", "f3"],
      reason: "Synthetic original source audited",
      evidence: [e]
    }
  ],
  unitReviews: [
    {
      unitId: "u",
      facetIds: ["f1", "f2", "f3"],
      reason: "Synthetic AI independently decomposed command, prohibition and exception"
    }
  ],
  facets: [
    { ...parent, unitId: "f1", parentUnitId: "u", modality: "command", content: "Use portal" },
    {
      ...parent,
      unitId: "f2",
      parentUnitId: "u",
      modality: "prohibition",
      content: "No hand delivery"
    },
    {
      ...parent,
      unitId: "f3",
      parentUnitId: "u",
      modality: "exception",
      content: "Pre-approved exceptions only"
    }
  ],
  unresolvedIssues: []
});
const b = () =>
  validateTaskB(
    {
      schema: AI_SCHEMAS.b,
      identityResolutions: [],
      structuralRelationships: [],
      fieldConsolidationResults: [],
      courseWideConstraintProposals: [],
      unresolvedIssues: [],
      canonicalAssessmentProposals: [
        {
          proposalId: "p",
          canonicalName: "Synthetic report",
          type: "assignment",
          role: "assessment",
          aliases: [],
          supportingEvidence: [e],
          consolidatedFields: [],
          requirements: [{ requirementId: "r", content: text, evidence: [e] }]
        }
      ],
      coverageDecisions: ["f1", "f2", "f3"].map((unitId) => ({
        unitId,
        disposition: "MERGE",
        reason: "Synthetic all facets preserved",
        evidence: [e],
        targets: [{ proposalId: "p", kind: "requirement", id: "r" }]
      }))
    },
    new Set(["s"])
  );
describe("independent facet manifest, no Local semantics", () => {
  it("accounts for every independently decomposed facet", () => {
    const i = validateFacetInventory(inventory(), [parent], scope);
    expect(i.facets).toHaveLength(3);
    expect(() => validateFacetSynthesis(b(), i, scope)).not.toThrow();
  });
  it("rejects only parent ID coverage as a substitute for facet decisions", () => {
    const i = validateFacetInventory(inventory(), [parent], scope),
      result = b();
    result.coverageDecisions = [{ ...(result.coverageDecisions?.[0] as object), unitId: "u" }];
    expect(() => validateFacetSynthesis(result, i, scope)).toThrow("DECISION");
  });
  it("rejects missing facet even when another facet shares the same Evidence", () => {
    const i = validateFacetInventory(inventory(), [parent], scope),
      result = b();
    result.coverageDecisions?.pop();
    expect(() => validateFacetSynthesis(result, i, scope)).toThrow("DECISION_MISSING");
  });
  it("rejects unused inventory facet", () => {
    const v = inventory();
    v.unitReviews[0]?.facetIds.pop();
    expect(() => validateFacetInventory(v, [parent], scope)).toThrow("MISSING");
  });
  it("rejects an unreviewed parent", () =>
    expect(() =>
      validateFacetInventory(inventory(), [parent, { ...parent, unitId: "u2" }], scope)
    ).toThrow("MISSING"));
  it("rejects invented modality", () => {
    const v = inventory();
    if (v.facets[0]) v.facets[0].modality = "mustProbably";
    expect(() => validateFacetInventory(v, [parent], scope)).toThrow("MEMBER");
  });
  it("rejects unreviewed discoveries during synthesis", () => {
    const i = validateFacetInventory(inventory(), [parent], scope),
      result = b();
    result.semanticInventory = [parent];
    expect(() => validateFacetSynthesis(result, i, scope)).toThrow("UNREVIEWED_DISCOVERY");
  });
  it("permits cross-source evidence to resolve a parent hypothesis, with correct native source identity", () => {
    const v = inventory();
    const evidence = { ...e, evidenceId: "e2", sourceId: "s2" };
    const baseSource = scope.sources[0];
    if (!baseSource) throw Error("SYNTHETIC_SOURCE_REQUIRED");
    const otherScope = {
      ...scope,
      sources: [...scope.sources, { ...baseSource, sourceId: "s2" }]
    };
    if (v.facets[0]) {
      v.facets[0].sourceId = "s2";
      v.facets[0].evidence = [evidence];
    }
    const audit = v.nativeAudit[0];
    if (audit) audit.facetIds = ["f2", "f3"];
    v.nativeAudit.push({
      sourceId: "s2",
      locator: "native-text",
      status: "EXAMINED",
      facetIds: ["f1"],
      reason: "Synthetic other source",
      evidence: [evidence]
    });
    expect(() => validateFacetInventory(v, [parent], otherScope)).not.toThrow();
    if (v.facets[0]) v.facets[0].sourceId = "s";
    expect(() => validateFacetInventory(v, [parent], otherScope)).toThrow("UNIT_SOURCE");
  });
  it("delivers complete original native units including previously unrepresented clauses", () => {
    const first = scope.sources[0];
    if (!first) throw Error("SYNTHETIC_SOURCE_REQUIRED");
    const original = text + " Keep a backup copy.";
    const fullScope = {
      ...scope,
      sources: [
        {
          ...first,
          parsed: {
            ...first.parsed,
            text: original,
            units: [{ locator: "native-text", text: original, partial: false }]
          }
        }
      ]
    };
    expect(nativeFacetContent(fullScope)).toEqual([
      { sourceId: "s", locator: "native-text", text: original, partial: false }
    ]);
  });
  it("accepts an AI native discovery absent from every parent", () => {
    const base = inventory();
    const v = {
      ...base,
      facets: [
        ...base.facets,
        {
          ...parent,
          unitId: "native-extra",
          parentUnitId: null,
          modality: "fact",
          content: "Synthetic native instruction missed upstream"
        }
      ]
    };
    v.nativeAudit[0]?.facetIds.push("native-extra");
    expect(() => validateFacetInventory(v, [parent], scope)).not.toThrow();
  });
  it("rejects missing native audit even if every parent/facet ID has a destination", () => {
    const v = { ...inventory(), nativeAudit: [] };
    expect(() => validateFacetInventory(v, [parent], scope)).toThrow("NATIVE_MISSING");
  });
  it("refuses native audit references to an invented facet", () => {
    const v = inventory();
    v.nativeAudit[0]?.facetIds.push("not-produced");
    expect(() => validateFacetInventory(v, [parent], scope)).toThrow("NATIVE_FACET");
  });
  it("keeps unread Partial ranges unresolved and never calls their absence complete", () => {
    const first = scope.sources[0];
    if (!first) throw Error("SYNTHETIC_SOURCE_REQUIRED");
    const partialScope = {
      ...scope,
      sources: [
        {
          ...first,
          parsed: {
            ...first.parsed,
            units: [{ ...first.parsed.units[0], locator: "native-text", text, partial: true }]
          }
        }
      ]
    };
    const v = inventory();
    expect(() => validateFacetInventory(v, [parent], partialScope)).toThrow("NATIVE_SUPPORT");
    const a = v.nativeAudit[0];
    if (a) a.status = "UNRESOLVED";
    expect(() => validateFacetInventory(v, [parent], partialScope)).toThrow("NATIVE_GAP");
    const unresolved = { ...v, unresolvedIssues: [{ reason: "Synthetic unread visual gap" }] };
    expect(() => validateFacetInventory(unresolved, [parent], partialScope)).not.toThrow();
  });
  it("requires explicit legacy replay and never promotes parent-only /1 to /2", () => {
    const v = { ...inventory(), schema: AI_SCHEMAS.facetsLegacy, nativeAudit: undefined };
    expect(() => validateFacetInventory(v, [parent], scope)).toThrow("SHAPE");
    expect(() => validateFacetInventory(v, [parent], scope, { allowLegacy: true })).not.toThrow();
  });
  it("native range accounting still cannot prove every clause was interpreted correctly", () => {
    const first = scope.sources[0];
    if (!first) throw Error("SYNTHETIC_SOURCE_REQUIRED");
    const extraText = text + " Keep a backup copy.";
    const other = {
      ...scope,
      sources: [
        {
          ...first,
          parsed: {
            ...first.parsed,
            text: extraText,
            units: [{ locator: "native-text", text: extraText, partial: false }]
          }
        }
      ]
    };
    expect(() => validateFacetInventory(inventory(), [parent], other)).not.toThrow();
  });
  it("cannot judge whether prose silently lost polarity; explicitly separates this limitation", () => {
    const i = validateFacetInventory(inventory(), [parent], scope),
      result = b();
    const p = result.canonicalAssessmentProposals[0] as {
      requirements: Array<{ content: string }>;
    };
    if (p.requirements[0]) p.requirements[0].content = "Use portal only";
    expect(() => validateFacetSynthesis(result, i, scope)).not.toThrow();
  });
});
