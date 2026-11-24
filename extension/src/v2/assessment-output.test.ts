import { describe, expect, it } from "vitest";
import {
  validateOutputA,
  validateOutputB2,
  validateGroupStructure,
  validateOutputRequirement,
  validateOutputField
} from "./assessment-output";
import { validateTaskB, validateTaskC } from "./ai-contracts";
import { validateProvenance } from "./architecture-provenance";
import { materializeTaskB } from "./materialize";
import { makeCourse } from "./testing";
import { presentAssessment, competingValues } from "./assessments";
import { sessionSystem } from "./architecture-runner";
import type { RegistryRecord } from "./progressive-registry";

function required<T>(value: T | undefined): T {
  if (value === undefined) throw Error("TEST_VALUE_MISSING");
  return value;
}
const e = {
  evidenceId: "e",
  sourceId: "s",
  locator: "body",
  excerpt: "Assigned report. Dates conflict."
};
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
        structure: ["body"],
        text: e.excerpt,
        units: [{ locator: "body", text: e.excerpt, partial: false }]
      }
    }
  ],
  evidence: [],
  objects: {}
};
const group: RegistryRecord = {
  id: "g",
  revision: 1,
  kind: "group",
  payload: { memberDraftIds: ["d"], role: "assessment", parentGroupId: null }
};
const field = {
  fieldName: "deadline",
  state: "UNCERTAIN",
  value: null,
  competingValues: ["21 Oct", "22 Oct"],
  evidence: [e]
};
const proposal = () => ({
  proposalId: "p",
  canonicalName: "Report",
  type: "assignment",
  role: "assessment",
  aliases: [],
  consolidatedFields: [field],
  requirements: Array.from({ length: 11 }, (_, i) => ({
    requirementId: `r${String(i)}`,
    content: `Synthetic requirement ${String(i)}`,
    evidence: [e]
  })),
  supportingEvidence: [e],
  unresolvedIssues: []
});
const output = () => ({
  schema: "syllab.ai.task-b/1",
  upstream: { groupId: "g", revision: 1, memberDraftIds: ["d"] },
  canonicalAssessmentProposals: [proposal()],
  identityResolutions: [],
  courseWideConstraintProposals: [],
  structuralRelationships: [],
  fieldConsolidationResults: [],
  unresolvedIssues: []
});
const context = {
  strictOutput: true,
  course: makeCourse({ courseId: "c" }),
  workflowId: "synthetic",
  sources: new Map([["s", { sourceId: "s", title: "Synthetic" }]]),
  sourceRecords: scope.sources,
  exclusionKeys: new Set<string>(),
  now: "2026-10-08T00:00:00Z"
};
const check = (v: unknown) => {
  const b = validateTaskB(v, new Set(["s"]));
  validateOutputB2(v, b, group);
  validateProvenance(v, scope);
  return b;
};

describe("stage-owned Assessment output contract", () => {
  it("conserves all requirements, exact evidence, conflict and kind into existing Review presentation", () => {
    const raw = output(),
      before = JSON.stringify(raw),
      b = check(raw);
    const m = materializeTaskB(b, context, new Map(), new Set());
    const a = required(m.assessments[0]);
    const facts = required(m.bundle.facts);
    const card = presentAssessment(a, facts, [], () => []);
    expect(card.requirements).toHaveLength(11);
    expect(a.kind).toBe("assignment");
    expect(facts.filter((f) => f.field === "requirement").map((f) => f.value.value)).toEqual(
      required(raw.canonicalAssessmentProposals[0]).requirements.map((r) => r.content)
    );
    expect(facts.every((f) => f.evidenceRefs.length === 1)).toBe(true);
    expect(competingValues(required(facts.find((f) => f.field === "deadline")).value)).toEqual([
      "21 Oct",
      "22 Oct"
    ]);
    expect(m.bundle.evidence?.map((v) => v.excerpt)).toEqual([e.excerpt]);
    expect(JSON.stringify(raw)).toBe(before);
  });
  it.each(["description", "type", "relationship", "upstream", "missingFields"])(
    "rejects %s instead of fixing or losing content",
    (key) => {
      const v = output() as unknown as Record<string, unknown>;
      const p = required((v.canonicalAssessmentProposals as Record<string, unknown>[])[0]);
      if (key === "description")
        p.requirements = [{ requirementId: "r", description: "Instruction", evidence: [e] }];
      if (key === "type") p.type = "group presentation";
      if (key === "relationship")
        v.structuralRelationships = [{ relationshipType: "guidelines-for" }];
      if (key === "upstream") v.upstream = { groupId: "other", revision: 1, memberDraftIds: ["d"] };
      if (key === "missingFields") delete p.consolidatedFields;
      const before = JSON.stringify(v);
      expect(() => check(v)).toThrow();
      expect(JSON.stringify(v)).toBe(before);
    }
  );
  it("rejects missing/duplicate requirement IDs, object scalar coercion and missing explicit-unknown evidence", () => {
    expect(() =>
      validateOutputRequirement({ requirementId: "r", content: "X", evidence: [] })
    ).toThrow("REQUIREMENT_SUPPORT");
    const v = output();
    required(required(v.canonicalAssessmentProposals[0]).requirements[1]).requirementId = "r0";
    expect(() => check(v)).toThrow("DUPLICATE");
    expect(() => validateOutputField({ ...field, value: { guessed: "date" } })).toThrow(
      "FIELD_VALUE"
    );
    expect(() =>
      validateOutputField({
        ...field,
        state: "EXPLICITLY_UNKNOWN",
        evidence: [],
        competingValues: []
      })
    ).toThrow("FIELD_SUPPORT");
    expect(() =>
      validateProvenance(
        { fieldName: "weight", state: "KNOWN", evidence: [], uncertaintyReason: "a reason" },
        scope
      )
    ).toThrow("SUPPORT_MISSING");
  });
  it("distinguishes consolidation audit nodes and rejects inconsistent duplicates", () => {
    const v = output() as unknown as Record<string, unknown>;
    v.fieldConsolidationResults = [
      {
        proposalId: "p",
        fieldName: "deadline",
        consolidatedState: "UNCERTAIN",
        consolidatedValue: null,
        competingValues: field.competingValues,
        evidence: [e],
        contributingDrafts: ["d"],
        conflicts: []
      }
    ];
    expect(() => check(v)).not.toThrow();
    required((v.fieldConsolidationResults as Record<string, unknown>[])[0]).consolidatedValue =
      "chosen";
    expect(() => check(v)).toThrow("CONSOLIDATION_CONTRADICTION");
  });
  it("preserves separate same-name activities and binds nested components only to B1's parent IDs", () => {
    const parent = {
      ...proposal(),
      proposalId: "parent",
      role: "component",
      componentOfProposalId: "p"
    };
    const child = {
      ...proposal(),
      proposalId: "child",
      role: "component",
      componentOfProposalId: "parent"
    };
    const result = validateTaskB(
      { ...output(), canonicalAssessmentProposals: [proposal(), parent, child] },
      new Set(["s"])
    );
    const m = materializeTaskB(result, context, new Map(), new Set());
    expect(m.assessments.map((x) => x.name)).toEqual(["Report", "Report", "Report"]);
    expect(m.assessments[2]?.parentAssessmentId).toBe("component_parent");
    expect(() =>
      materializeTaskB(
        { ...result, canonicalAssessmentProposals: [child] },
        context,
        new Map(),
        new Set()
      )
    ).toThrow("PARENT_PROPOSAL_MISSING");
  });
  it("rejects cycles, missing parents and B2 independently changing a component identity", () => {
    const child: RegistryRecord = {
      ...group,
      id: "child",
      payload: { memberDraftIds: ["d2"], role: "component", parentGroupId: "g" }
    };
    expect(() => validateGroupStructure([group, child])).not.toThrow();
    expect(() => validateGroupStructure([child])).toThrow("GROUP_PARENT");
    expect(() =>
      validateGroupStructure([
        { ...group, payload: { ...group.payload, role: "component", parentGroupId: "child" } },
        child
      ])
    ).toThrow("CYCLE");
    const v = output();
    required(v.canonicalAssessmentProposals[0]).role = "component";
    expect(() => check(v)).toThrow("B2_STRUCTURE");
  });
  it("requires A context, excludes NO_INFORMATION contradictions, and leaves missing fields absent", () => {
    const a = {
      schema: "syllab.ai.task-a/1" as const,
      sourceId: "s",
      sourceResult: "NO_RELEVANT_INFORMATION" as const,
      assessmentDrafts: [],
      courseWideConstraintCandidates: [],
      unresolvedIssues: [],
      fileContext: "Reference only; no assignment",
      identityContext: "No activity assigned"
    };
    expect(() => validateOutputA(a)).not.toThrow();
    expect(() => validateOutputA({ ...a, fileContext: "" })).toThrow("SOURCE_CONTEXT");
    expect(() =>
      validateOutputA({
        ...a,
        assessmentDrafts: [{ ...proposal(), draftId: "d", name: "Report", fields: [] }]
      })
    ).toThrow("NO_INFORMATION_WITH_OUTPUT");
  });
  it("conserves declared date-wire aliases without inferring dates or losing conflicts", () => {
    const raw = output();
    required(raw.canonicalAssessmentProposals[0]).consolidatedFields = [
      { ...field, fieldName: "dueDate" }
    ];
    const m = materializeTaskB(check(raw), context, new Map(), new Set());
    expect(required(m.bundle.facts).find((f) => f.field === "due_date")?.value).toMatchObject({
      state: "UNCERTAIN",
      competingValues: ["21 Oct", "22 Oct"]
    });
    required(raw.canonicalAssessmentProposals[0]).consolidatedFields.push({
      ...field,
      fieldName: "due_date"
    });
    expect(() => check(raw)).toThrow("DUPLICATE");
  });
  it("rejects malformed or nonliteral requirement evidence before producing trusted-looking facts", () => {
    expect(() =>
      validateOutputRequirement({ requirementId: "r", content: "X", evidence: [{}] })
    ).toThrow("EVIDENCE_SHAPE");
    const raw = output();
    required(required(raw.canonicalAssessmentProposals[0]).requirements[0]).evidence = [
      { ...e, excerpt: "invented" }
    ];
    expect(() =>
      materializeTaskB(validateTaskB(raw, new Set(["s"])), context, new Map(), new Set())
    ).toThrow("EVIDENCE_UNVERIFIED");
  });
  it("makes the versioned prompt enumerate the same strict output vocabulary, leaving saved /1 prompts on /1", () => {
    for (const stage of ["A", "B1", "B2", "C"] as const)
      expect(sessionSystem(stage)).toContain("assessment-output/2");
    expect(sessionSystem("B2", "assessment-relevance/1")).not.toContain("assessment-output/2");
  });
  it("does not discard Task C values at validation before materialization", () => {
    const c = validateTaskC(
      {
        schema: "syllab.ai.task-c/1",
        changeResults: [
          {
            changeType: "CHANGED",
            targetObjectId: "a",
            currentEvidence: [e],
            newEvidence: [e],
            currentValue: { state: "KNOWN", value: "old" },
            latestValue: { state: "UNCERTAIN", competingValues: ["x", "y"] },
            judgmentBasis: "Conflicting source",
            relevantUserState: "unchanged"
          }
        ],
        unresolvedIssues: []
      },
      new Set(["s"]),
      true
    );
    expect(c.changeResults[0]).toMatchObject({
      currentValue: { state: "KNOWN", value: "old" },
      latestValue: { state: "UNCERTAIN", competingValues: ["x", "y"] },
      relevantUserState: "unchanged"
    });
  });
});
