import { describe, it, expect } from "vitest";
import {
  assessmentSourceContexts,
  validateAssessmentRelevance,
  relevanceFields,
  relevanceSourceIds,
  validateExcludedAssessment
} from "./assessment-semantics";
import { sessionSystem, runSession, type SessionPort } from "./architecture-runner";
import { newSession, beginRound, digest, SESSION_SCHEMA } from "./architecture-session";
import type { RegistryRecord } from "./progressive-registry";
import { emptyRegistry, applyOperations, validateRegistry } from "./progressive-registry";
import type { ReadScope } from "./course-read";
import type { SourceRecord } from "./schema";
import type { TaskAResult } from "./ai-contracts";

const texts = {
  assignment: "This term submit Report 1 on 21 October; it contributes 20% of the course grade.",
  archive: "Past examination for revision. Question 1: Explain the design (10 marks).",
  practice: "Optional practice: answer Question 1. No submission or marks for this course.",
  example:
    "Worked teaching example: submit a report by Friday, worth 20%, in this fictional scenario.",
  reassignment:
    "For this term's Assignment 2, submit answers to Question 1 in the archived paper on 28 October.",
  uncertain:
    "Report 1 details will follow; its relationship to the earlier project is not yet clear."
};
const sources = Object.entries(texts).map(([sourceId, text]) => ({
  sourceId,
  title: "Report 1",
  kind: "file",
  parsed: { text, contentHash: sourceId }
})) as SourceRecord[];
const scope: ReadScope = { sources, evidence: [], objects: {} };
const ev = (id: keyof typeof texts) => ({
  evidenceId: id,
  sourceId: id,
  locator: "native-text",
  excerpt: texts[id]
});
const group = (status: string, ids: Array<keyof typeof texts>): RegistryRecord => ({
  id: "g",
  revision: 1,
  kind: "group",
  payload: {
    memberDraftIds: ["d"],
    relevance: {
      status,
      basis: "AI-authored contextual decision",
      supportingEvidence: ids.map(ev),
      contradictoryEvidence: []
    }
  }
});

describe("Assessment relevance contract: deterministic checks, not a simulated model-quality score", () => {
  it.each(["A", "B1", "B2", "C"] as const)(
    "ships Product semantics with actual %s transport prompt",
    (stage) => {
      const system = sessionSystem(stage);
      expect(system).toContain("assessment-relevance/4");
      expect(system).toContain("Never blacklist by words, filename, year or format");
      expect(system).toContain(
        "A question, rubric row, example or subsection is not automatically"
      );
      expect(system).toContain("The user alone confirms trusted state");
      expect(system).toContain(SESSION_SCHEMA);
    }
  );
  it("routes zero-draft context and explicit Partial/error without local source classification", () => {
    const result: TaskAResult = {
      schema: "syllab.ai.task-a/1",
      sourceId: "reassignment",
      sourceResult: "PARTIALLY_UNDERSTOOD",
      fileContext: "Current reassignment instruction",
      identityContext: "Connects archive and assignment",
      structuralRelationships: [{ target: "archive" }],
      assessmentDrafts: [],
      courseWideConstraintCandidates: [],
      unresolvedIssues: ["Missing attachment page"]
    };
    const contexts = assessmentSourceContexts(
      [
        { sourceId: "reassignment", result },
        { sourceId: "missing", error: "FETCH_FAILED" }
      ],
      scope
    );
    expect(contexts[0]).toMatchObject({
      fileContext: result.fileContext,
      identityContext: result.identityContext,
      structuralRelationships: result.structuralRelationships,
      unresolvedIssues: result.unresolvedIssues,
      sourceResult: "PARTIALLY_UNDERSTOOD"
    });
    expect(contexts[1]).toMatchObject({ error: "FETCH_FAILED", sourceResult: null });
  });
  it("requires a decision and literal evidence for CURRENT; never infers relevance from names", () => {
    expect(() =>
      validateAssessmentRelevance(
        { ...group("CURRENT", []), payload: { memberDraftIds: ["d"] } },
        scope
      )
    ).toThrow("ASSESSMENT_RELEVANCE_REQUIRED");
    expect(() => validateAssessmentRelevance(group("CURRENT", []), scope)).toThrow(
      "ASSESSMENT_RELEVANCE_SUPPORT_REQUIRED"
    );
    expect(() =>
      validateAssessmentRelevance(group("CURRENT", ["assignment"]), scope)
    ).not.toThrow();
    const fabricated = group("CURRENT", ["assignment"]);
    (fabricated.payload.relevance as { supportingEvidence: unknown[] }).supportingEvidence = [
      { ...ev("assignment"), excerpt: "Due tomorrow" }
    ];
    expect(() => validateAssessmentRelevance(fabricated, scope)).toThrow("PROVENANCE_LITERAL");
  });
  it("accepts AI exclusion of reference/practice/example with conserved dispositions; preserves reassigned old material", () => {
    const required = ["archive", "practice", "example", "reassignment"];
    const records: RegistryRecord[] = [
      {
        ...group("CURRENT", ["reassignment", "archive"]),
        payload: {
          ...group("CURRENT", ["reassignment", "archive"]).payload,
          memberDraftIds: ["reassignment"]
        }
      },
      ...required.map((id) => ({
        id: `disp:${id}`,
        revision: 1,
        kind: "draft-disposition" as const,
        payload: {
          inputId: id,
          disposition: id === "reassignment" ? "standalone" : "excluded-invalid",
          targetId: id === "reassignment" ? "g" : null,
          reason:
            id === "reassignment" ? "Explicit current assignment" : "AI judged reference use only",
          supportingEvidence: [ev(id as keyof typeof texts)]
        }
      }))
    ];
    const registry = applyOperations(
      emptyRegistry(),
      records.map((r) => ({
        id: r.id,
        recordId: r.id,
        expectedRevision: 0,
        kind: "put",
        record: r
      }))
    );
    validateRegistry(registry, required, []);
    registry.records.forEach((r) => validateExcludedAssessment(r, scope));
    validateAssessmentRelevance(records[0] as RegistryRecord, scope);
    expect(relevanceSourceIds(records[0] as RegistryRecord)).toEqual(["reassignment", "archive"]);
    expect(registry.records.filter((r) => r.kind === "draft-disposition")).toHaveLength(4);
  });
  it("preserves uncertainty and its evidence in existing Review fact state instead of silent exclusion", () => {
    const g = group("UNCERTAIN", ["uncertain"]);
    validateAssessmentRelevance(g, scope);
    expect(relevanceFields(g)).toEqual([
      {
        fieldName: "Assessment relevance",
        state: "UNCERTAIN",
        value: "AI-authored contextual decision",
        competingValues: [],
        evidence: [ev("uncertain")]
      }
    ]);
    expect(JSON.stringify(relevanceFields(g))).not.toContain("dueDate");
  });
  it("leaves distinct similarly named activities in separate AI groups and conserves all members", () => {
    const reg = emptyRegistry();
    for (const id of ["assignment", "reassignment"]) {
      reg.records.push(
        {
          ...group("CURRENT", [id as keyof typeof texts]),
          id,
          payload: { ...group("CURRENT", [id as keyof typeof texts]).payload, memberDraftIds: [id] }
        },
        {
          id: `disp:${id}`,
          revision: 1,
          kind: "draft-disposition",
          payload: { inputId: id, disposition: "standalone", targetId: id }
        }
      );
    }
    validateRegistry(reg, ["assignment", "reassignment"], []);
    expect(reg.records.filter((r) => r.kind === "group")).toHaveLength(2);
  });
  it("reuses a legacy FINAL without dispatch or rewriting its semantic policy", async () => {
    const old = newSession("old", "B1", digest({}));
    beginRound(old, {}, "INITIAL");
    old.state = "final";
    old.output = { operations: [] };
    let calls = 0;
    const port: SessionPort = {
      load: () => Promise.resolve(old),
      save: async () => {},
      execute: () => {
        calls++;
        return Promise.reject(Error("must not dispatch"));
      },
      resolve: () => Promise.resolve([]),
      validateFinal: () => {}
    };
    expect(await runSession("old", "B1", {}, port)).toEqual(old.output);
    expect(calls).toBe(0);
    expect(old.semanticPolicy).toBeUndefined();
  });
});
