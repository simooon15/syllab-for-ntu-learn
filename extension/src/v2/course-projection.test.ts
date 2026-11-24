import { describe, it, expect } from "vitest";
import {
  validateCourseProjection,
  projectCourseDraft,
  isSelectiveCoursePolicy,
  applyCourseProjectionPatch,
  reviewCourseProjectionGroups,
  type CourseProjection
} from "./course-projection";
import {
  compileCourseDraft,
  SELECTIVE_COURSE_SCHEMA,
  type CourseDraft,
  type Clause
} from "./selective-course";
import { makeCourse } from "./testing";
import type { SourceRecord } from "./schema";
const clause = (id: string, field: string, value: string): Clause => ({
  clauseId: id,
  sourceId: id,
  kind: "field",
  field,
  content: field + " " + value,
  value: { state: "KNOWN", value },
  modality: "descriptive",
  conditions: [],
  exceptions: [],
  applicability: "CURRENT",
  context: "Synthetic assessed reflection",
  evidence: [
    { evidenceId: "e-" + id, sourceId: id, locator: "native-text", excerpt: field + " " + value }
  ]
});
const draft = (): CourseDraft => {
  const clauses = [
    clause("a", "assessment percentage", "25%"),
    clause("b", "weight", "25%"),
    clause("c", "visibility", "visible")
  ];
  return {
    schema: SELECTIVE_COURSE_SCHEMA,
    clauses,
    entities: [
      {
        ref: "reflection",
        name: "Reflection",
        type: "assignment",
        role: "assessment",
        aliases: [],
        clauseRefs: ["a"]
      }
    ],
    links: clauses.map((c) => ({
      clauseRef: c.clauseId,
      ownerRef: "reflection",
      disposition: "CURRENT",
      state: "KNOWN" as const,
      competingClauseRefs: [],
      resolutionClauseRefs: [],
      basis: "Current source"
    })),
    identities: [],
    inspections: [],
    deepLocators: {}
  };
};
const projection = (): CourseProjection => ({
  assertions: [
    {
      assertionRef: "reflection-weight",
      ownerRef: "reflection",
      field: "weight",
      representativeClauseRef: "a",
      clauseRefs: ["a", "b"],
      state: "KNOWN" as const,
      competingClauseRefs: [],
      resolutionClauseRefs: [],
      basis: "Same assessed weight in two independent saved sources"
    }
  ],
  context: [
    {
      clauseRefs: ["c"],
      basis: "Visibility is platform metadata rather than an assessed requirement",
      meaningDisposition: "BACKGROUND"
    }
  ]
});
function unchangedMeaningResponse(call: { user: string }) {
  const input = JSON.parse(call.user) as {
    contextProbes?: Array<{ assertionRef: string; clauseRefs: string[]; basis: string }>;
  };
  return {
    replaceAssertionRefs: (input.contextProbes ?? []).map((a) => a.assertionRef),
    projection: {
      assertions: [],
      context: (input.contextProbes ?? []).map((a) => ({
        clauseRefs: a.clauseRefs,
        basis: a.basis,
        meaningDisposition: "BACKGROUND" as const
      }))
    }
  };
}
describe("canonical Course Brief projection", () => {
  it.each([
    {
      sourceField: "cohort clusters",
      value: "9 teams",
      proposed: "group_size",
      corrected: "cohort_count"
    },
    {
      sourceField: "participants per project team",
      value: "4 students",
      proposed: "group_size",
      corrected: "group_size"
    },
    {
      sourceField: "oral delivery rubric allocation",
      value: "15%",
      proposed: "weight",
      corrected: "oral_delivery_rubric_weight"
    },
    {
      sourceField: "overall course contribution",
      value: "15%",
      proposed: "weight",
      corrected: "weight"
    },
    {
      sourceField: "report page ceiling",
      value: "6 pages",
      proposed: "duration",
      corrected: "page_limit"
    }
  ])(
    "audits singleton $sourceField against native meaning without local relabeling",
    async ({ sourceField, value, proposed, corrected }) => {
      const d = draft();
      d.clauses = [clause("a", sourceField, value)];
      required(d.clauses[0]).context = sourceField;
      d.links = d.links.filter((l) => l.clauseRef === "a");
      const original = structuredClone(d.clauses);
      const wrong = {
        assertions: [
          { ...required(projection().assertions[0]), field: proposed, clauseRefs: ["a"] }
        ],
        context: []
      };
      let audited = 0;
      const result = await projectCourseDraft(
        d,
        {
          load: () => Promise.resolve(undefined),
          save: async () => {},
          capture: (call) => {
            expect(call.promptVersion).toContain("project-verify");
            expect(call.system).toContain("single-member assertions");
            const input = JSON.parse(call.user) as {
              auditedGroups: unknown[];
              clauses: Array<{ field: string }>;
              evidenceCatalog: Array<{ excerpt: string }>;
            };
            expect(input.auditedGroups).toHaveLength(1);
            expect(input.clauses[0]?.field).toBe(sourceField);
            expect(input.evidenceCatalog[0]?.excerpt).toBe(sourceField + " " + value);
            audited++;
            return Promise.resolve({
              replaceAssertionRefs: corrected === proposed ? [] : ["reflection-weight"],
              projection: {
                assertions:
                  corrected === proposed
                    ? []
                    : [
                        {
                          ...wrong.assertions[0],
                          field: corrected,
                          basis: "Source-supported scalar scope correction"
                        }
                      ],
                context: []
              }
            });
          }
        },
        undefined,
        undefined,
        undefined,
        { projection: wrong }
      );
      expect(audited).toBe(1);
      expect(result.projection?.assertions[0]?.field).toBe(corrected);
      expect(result.clauses).toEqual(original);
    }
  );
  it("normalizes an unambiguous singleton context reference without changing raw output, and rejects collisions", () => {
    const raw = {
      assertions: projection().assertions,
      context: [{ clauseRef: "c", basis: "Platform metadata" }]
    };
    const before = structuredClone(raw);
    expect(validateCourseProjection(raw, draft()).context).toEqual([
      { clauseRefs: ["c"], basis: "Platform metadata" }
    ]);
    expect(raw).toEqual(before);
    expect(() =>
      validateCourseProjection(
        { ...raw, context: [{ ...raw.context[0], clauseRefs: ["a"] }] },
        draft()
      )
    ).toThrow("CONTEXT_ALIAS_COLLISION");
    expect(() =>
      validateCourseProjection(
        { ...raw, context: [{ clauseRef: "unknown", basis: "Not provided" }] },
        draft()
      )
    ).toThrow("COVERAGE");
  });
  it("reuses unchanged retired-source context on Rebuild without dropping history or calling AI", async () => {
    const initial = draft();
    initial.retiredClauses = [required(initial.clauses.pop())];
    initial.links = initial.links.filter((l) => l.clauseRef !== "c");
    const first = await projectCourseDraft(initial, {
      load: () => Promise.resolve(undefined),
      save: async () => {},
      capture: (call) =>
        Promise.resolve(
          call.promptVersion.endsWith(":project-verify")
            ? unchangedMeaningResponse(call)
            : { projection: projection() }
        )
    });
    const rebuilt = await projectCourseDraft(
      structuredClone(first),
      {
        load: () => Promise.resolve(undefined),
        save: async () => {},
        capture: () => Promise.reject(Error("UNCHANGED_HISTORY_MUST_NOT_REDISPATCH"))
      },
      first.projection,
      undefined,
      undefined,
      undefined,
      first
    );
    expect(rebuilt.projection).toEqual(first.projection);
    expect(rebuilt.retiredClauses).toEqual(first.retiredClauses);
  });
  it("compiles AI-evidenced partial supersession while retaining the original instruction and replacement evidence", () => {
    const d = draft();
    const action = required(d.clauses[0]);
    action.kind = "requirement";
    action.content = "One representative must submit the group PDF by the former Friday deadline.";
    action.modality = "must";
    required(action.evidence[0]).excerpt = action.content;
    const replacement = required(d.clauses[1]);
    replacement.field = "deadline";
    replacement.content =
      "The current update extends the group submission deadline from Friday to Tuesday.";
    replacement.value.value = "Tuesday";
    required(replacement.evidence[0]).excerpt = replacement.content;
    const p: CourseProjection = {
      assertions: [
        {
          ...required(projection().assertions[0]),
          field: "requirement",
          clauseRefs: ["a"],
          resolutionClauseRefs: ["b"],
          statement: {
            content: "One designated representative must submit the group PDF.",
            modality: "must",
            conditions: [],
            exceptions: [],
            context: "Group submission; the separate deadline is superseded by the current update."
          }
        },
        {
          ...required(projection().assertions[0]),
          assertionRef: "separate-field",
          field: "deadline",
          representativeClauseRef: "b",
          clauseRefs: ["b"]
        }
      ],
      context: projection().context
    };
    d.projection = validateCourseProjection(p, d);
    const before = structuredClone(d.clauses);
    const course = makeCourse();
    const sources: SourceRecord[] = d.clauses.map((c) => ({
      sourceId: c.sourceId,
      courseId: course.courseId,
      nativeItemId: c.sourceId,
      kind: "attachment",
      title: c.sourceId,
      updatedAt: course.updatedAt,
      parsed: { text: required(c.evidence[0]).excerpt, structure: [] }
    }));
    const result = compileCourseDraft(d, sources, {
      course,
      workflowId: "partial-supersession-test",
      sources: new Map(sources.map((s) => [s.sourceId, { sourceId: s.sourceId, title: s.title }])),
      exclusionKeys: new Set(),
      now: course.updatedAt
    }).candidate;
    const current = required(result.bundle.facts.find((f) => f.field === "requirement"));
    expect(current.value.value).toBe(p.assertions[0]?.statement?.content);
    expect(current.semanticClause).toMatchObject({
      originalContent: action.content,
      canonicalStatement: true,
      modality: "must"
    });
    expect(current.evidenceRefs.map((e) => e.sourceId)).toEqual(["a", "b"]);
    expect(d.clauses).toEqual(before);
    const unsupported = structuredClone(p);
    required(unsupported.assertions[0]).resolutionClauseRefs = [];
    expect(() => validateCourseProjection(unsupported, d)).toThrow("STATEMENT_SUPPORT");
    const scalarRewrite = structuredClone(p);
    required(scalarRewrite.assertions[1]).statement = required(required(p.assertions[0]).statement);
    expect(() => validateCourseProjection(scalarRewrite, d)).toThrow("STATEMENT_SUPPORT");
  });
  it("actually audits an explicitly requested single-member assertion against native source evidence", async () => {
    const current = draft();
    current.projection = {
      assertions: [
        ...projection().assertions,
        {
          ...required(projection().assertions[0]),
          assertionRef: "visibility",
          field: "visibility",
          representativeClauseRef: "c",
          clauseRefs: ["c"]
        }
      ],
      context: []
    };
    let calls = 0;
    const checked = await reviewCourseProjectionGroups(
      current,
      {
        load: () => Promise.resolve(undefined),
        save: async () => {},
        capture: (call) => {
          calls++;
          const input = JSON.parse(call.user) as {
            auditedGroups: Array<{ assertionRef: string }>;
            evidenceCatalog: Array<{ excerpt: string }>;
          };
          expect(input.auditedGroups.map((a) => a.assertionRef)).toEqual(["visibility"]);
          expect(input.evidenceCatalog.map((e) => e.excerpt)).toEqual(["visibility visible"]);
          return Promise.resolve(unchangedMeaningResponse(call));
        }
      },
      ["visibility"]
    );
    expect(calls).toBe(1);
    expect(checked.projection).toEqual(current.projection);
  });
  it("keeps immutable historical support visible without promoting it or relaxing current coverage", () => {
    const current = draft();
    current.retiredClauses = [clause("old", "weight", "20%")];
    const withHistory = {
      ...projection(),
      context: [
        ...projection().context,
        { clauseRefs: ["old"], basis: "Superseded source weight" },
        { clauseRefs: ["old"], basis: "Original evidence for the former grading summary" }
      ]
    };
    expect(validateCourseProjection(withHistory, current).context).toHaveLength(3);
    expect(() =>
      validateCourseProjection(
        {
          ...withHistory,
          context: [...withHistory.context, { clauseRefs: ["a"], basis: "Duplicate current" }]
        },
        current
      )
    ).toThrow("COVERAGE");
    expect(() =>
      validateCourseProjection(
        {
          ...withHistory,
          assertions: [
            ...withHistory.assertions,
            { ...required(withHistory.assertions[0]), assertionRef: "old", clauseRefs: ["old"] }
          ]
        },
        current
      )
    ).toThrow("COVERAGE");
  });
  it("preserves AI-resolved historical counter-evidence without accepting an unresolved current conflict", () => {
    const d = draft(),
      p = projection();
    const historical = { ...clause("h", "weight", "50%"), applicability: "HISTORICAL" as const };
    d.clauses.push(historical);
    d.links.push({ ...required(d.links[0]), clauseRef: "h", disposition: "HISTORICAL" });
    required(p.assertions[0]).competingClauseRefs = ["h"];
    required(p.assertions[0]).resolutionClauseRefs = ["a"];
    const result = validateCourseProjection(p, d);
    expect(result.assertions[0]?.state).toBe("KNOWN");
    expect(result.assertions[0]?.competingClauseRefs).toEqual(["h"]);
    expect(
      validateCourseProjection({ assertions: p.assertions, context: [] }, d, new Set(["a", "b"]))
        .assertions
    ).toEqual(result.assertions);
    required(p.assertions[0]).resolutionClauseRefs = [];
    expect(() => validateCourseProjection(p, d)).toThrow("CONFLICT");
    required(p.assertions[0]).resolutionClauseRefs = ["a"];
    required(d.links.at(-1)).disposition = "CURRENT";
    expect(() => validateCourseProjection(p, d)).toThrow("CONFLICT");
  });
  it("maintains exact unchanged assertions during an incremental source dependency update", async () => {
    const first = await projectCourseDraft(draft(), {
      load: () => Promise.resolve(undefined),
      save: async () => {},
      capture: (call) =>
        Promise.resolve(
          call.promptVersion.endsWith(":project-verify")
            ? unchangedMeaningResponse(call)
            : { projection: projection() }
        )
    });
    const changed = structuredClone(first);
    required(changed.clauses[2]).content = "Visibility changed in this source";
    const calls: string[] = [];
    const updated = await projectCourseDraft(
      changed,
      {
        load: () => Promise.resolve(undefined),
        save: async () => {},
        capture: (call) => {
          calls.push(call.promptVersion);
          if (call.promptVersion.endsWith(":project-verify"))
            return Promise.resolve(unchangedMeaningResponse(call));
          const payload = JSON.parse(call.user) as {
            allowedClauseRefs: string[];
            clauses: Array<{ clauseId: string }>;
          };
          expect(payload.allowedClauseRefs).toEqual(["c"]);
          expect(payload.clauses.map((c) => c.clauseId)).toEqual(["c"]);
          return Promise.resolve({ projection: { assertions: [], context: projection().context } });
        }
      },
      first.projection,
      undefined,
      undefined,
      undefined,
      first
    );
    expect(calls).toEqual(["selective-draft/2:project-update", "selective-draft/2:project-verify"]);
    expect(updated.projection?.assertions).toEqual(first.projection?.assertions);
    expect(first.clauses[2]?.content).toBe("visibility visible");
  });
  it("invalidates an assertion when its separately bound support source changes, retaining verified unrelated context", async () => {
    const d = draft(),
      p = projection();
    required(p.assertions[0]).clauseRefs = ["a"];
    p.context.unshift({
      clauseRefs: ["b"],
      basis: "Equivalent authored weight",
      meaningDisposition: "SUPPORT",
      representedByAssertionRefs: ["reflection-weight"]
    });
    const first = await projectCourseDraft(
      d,
      {
        load: () => Promise.resolve(undefined),
        save: () => Promise.resolve(),
        capture: (call) => {
          const input = JSON.parse(call.user) as {
            contextProbes: Array<{ assertionRef: string; clauseRefs: string[] }>;
          };
          return Promise.resolve({
            replaceAssertionRefs: input.contextProbes.map((x) => x.assertionRef),
            projection: { assertions: [], context: p.context }
          });
        }
      },
      undefined,
      undefined,
      undefined,
      { projection: p }
    );
    const changed = structuredClone(first);
    required(changed.clauses[1]).value.value = "35%";
    required(changed.clauses[1]).content = "Updated weight 35%";
    required(required(changed.clauses[1]).evidence[0]).excerpt = "Updated weight 35%";
    const calls: string[] = [];
    const updated = await projectCourseDraft(
      changed,
      {
        load: () => Promise.resolve(undefined),
        save: () => Promise.resolve(),
        capture: (call) => {
          calls.push(call.promptVersion);
          if (call.promptVersion.endsWith(":project-update")) {
            const input = JSON.parse(call.user) as { allowedClauseRefs: string[] };
            expect(new Set(input.allowedClauseRefs)).toEqual(new Set(["a", "b"]));
            return Promise.resolve({
              projection: {
                assertions: [
                  {
                    ...required(p.assertions[0]),
                    clauseRefs: ["a", "b"],
                    state: "UNCERTAIN",
                    competingClauseRefs: ["b"]
                  }
                ],
                context: []
              }
            });
          }
          const input = JSON.parse(call.user) as { contextProbes: unknown[] };
          expect(input.contextProbes).toEqual([]);
          return Promise.resolve(unchangedMeaningResponse(call));
        }
      },
      first.projection,
      undefined,
      undefined,
      undefined,
      first
    );
    expect(calls).toEqual(["selective-draft/2:project-update", "selective-draft/2:project-verify"]);
    expect(updated.projection?.assertions[0]?.state).toBe("UNCERTAIN");
    expect(updated.projection?.context).toEqual([required(p.context[1])]);
    expect(first.clauses[1]?.value.value).toBe("25%");
  });
  it("lets AI expand a retained semantic group when new evidence changes its meaning, without regenerating the whole course", async () => {
    const first = await projectCourseDraft(draft(), {
      load: () => Promise.resolve(undefined),
      save: async () => {},
      capture: (call) =>
        Promise.resolve(
          call.promptVersion.endsWith(":project-verify")
            ? unchangedMeaningResponse(call)
            : { projection: projection() }
        )
    });
    const changed = structuredClone(first),
      d = {
        ...clause("d", "instruction", "Upload a report if assigned"),
        kind: "requirement" as const
      };
    changed.clauses.push(d);
    changed.links.push({ ...required(changed.links[0]), clauseRef: "d" });
    let updates = 0;
    const result = await projectCourseDraft(
      changed,
      {
        load: () => Promise.resolve(undefined),
        save: async () => {},
        capture: (call) => {
          if (call.promptVersion.endsWith(":project-verify"))
            return Promise.resolve(unchangedMeaningResponse(call));
          updates++;
          const payload = JSON.parse(call.user) as { allowedClauseRefs: string[] };
          if (updates === 1) {
            expect(payload.allowedClauseRefs).toEqual(["d"]);
            return Promise.resolve({ expandAssertionRefs: ["reflection-weight"] });
          }
          expect(payload.allowedClauseRefs).toEqual(["a", "b", "d"]);
          return Promise.resolve({
            projection: {
              assertions: [
                ...projection().assertions,
                {
                  ...required(projection().assertions[0]),
                  assertionRef: "conditional-upload",
                  field: "requirement",
                  representativeClauseRef: "d",
                  clauseRefs: ["d"]
                }
              ],
              context: []
            }
          });
        }
      },
      first.projection,
      undefined,
      undefined,
      undefined,
      first
    );
    expect(updates).toBe(2);
    expect(result.projection?.assertions).toHaveLength(2);
    expect(result.projection?.context).toEqual(first.projection?.context);
  });
  it("delivers a retired context as readonly original evidence and never permits current promotion", async () => {
    const first = await projectCourseDraft(draft(), {
      load: () => Promise.resolve(undefined),
      save: async () => {},
      capture: (call) =>
        Promise.resolve(
          call.promptVersion.endsWith(":project-verify")
            ? unchangedMeaningResponse(call)
            : { projection: projection() }
        )
    });
    for (const promote of [false, true]) {
      const changed = structuredClone(first);
      changed.retiredClauses = changed.clauses.filter((c) => c.clauseId === "c");
      changed.clauses = changed.clauses.filter((c) => c.clauseId !== "c");
      changed.links = changed.links.map((l) =>
        l.clauseRef !== "c" ? l : { ...l, disposition: "HISTORICAL" }
      );
      changed.clauses.push({
        ...clause("d", "instruction", "Submit a report"),
        kind: "requirement"
      });
      changed.links.push({ ...required(changed.links[0]), clauseRef: "d" });
      const instruction = {
        ...required(projection().assertions[0]),
        assertionRef: "report",
        field: "requirement",
        representativeClauseRef: "d",
        clauseRefs: ["d"]
      };
      const pending = projectCourseDraft(
        changed,
        {
          load: () => Promise.resolve(undefined),
          save: async () => {},
          capture: (call) => {
            const user = JSON.parse(call.user) as {
              supportingOriginalClauses: Clause[];
              eligibleClauseRefs: string[];
            };
            expect(user.supportingOriginalClauses.map((c) => c.clauseId)).toContain("c");
            expect(user.eligibleClauseRefs).toEqual(["d"]);
            return Promise.resolve({
              projection: {
                assertions: promote
                  ? [
                      instruction,
                      {
                        ...instruction,
                        assertionRef: "retired",
                        representativeClauseRef: "c",
                        clauseRefs: ["c"]
                      }
                    ]
                  : [instruction],
                context: promote
                  ? []
                  : [
                      {
                        clauseRefs: ["c"],
                        basis: "Original retired metadata",
                        meaningDisposition: "BACKGROUND"
                      }
                    ]
              }
            });
          }
        },
        first.projection,
        undefined,
        undefined,
        undefined,
        first
      );
      if (promote) await expect(pending).rejects.toThrow("UPDATE_SCOPE");
      else {
        const result = await pending;
        expect(result.projection?.context[0]?.clauseRefs).toEqual(["c"]);
        expect(result.projection?.assertions.every((a) => !a.clauseRefs.includes("c"))).toBe(true);
      }
    }
  });
  it("expands a copied retained context to its original source and independently rechecks its disposition", async () => {
    const first = await projectCourseDraft(draft(), {
      load: () => Promise.resolve(undefined),
      save: async () => {},
      capture: (call) =>
        Promise.resolve(
          call.promptVersion.endsWith(":project-verify")
            ? unchangedMeaningResponse(call)
            : { projection: projection() }
        )
    });
    const changed = structuredClone(first);
    changed.clauses.push({ ...clause("d", "instruction", "Submit a report"), kind: "requirement" });
    changed.links.push({ ...required(changed.links[0]), clauseRef: "d" });
    const instruction = {
      ...required(projection().assertions[0]),
      assertionRef: "report",
      field: "requirement",
      representativeClauseRef: "d",
      clauseRefs: ["d"]
    };
    let updates = 0;
    let audits = 0;
    const result = await projectCourseDraft(
      changed,
      {
        load: () => Promise.resolve(undefined),
        save: async () => {},
        capture: (call) => {
          if (call.promptVersion.endsWith(":project-verify")) {
            audits++;
            return Promise.resolve(unchangedMeaningResponse(call));
          }
          updates++;
          const user = JSON.parse(call.user) as {
            allowedClauseRefs: string[];
            contextToRecheck: unknown[];
          };
          expect(new Set(user.allowedClauseRefs)).toEqual(
            new Set(updates === 1 ? ["d"] : ["c", "d"])
          );
          if (updates === 2) expect(user.contextToRecheck).toEqual(first.projection?.context);
          return Promise.resolve({
            projection: { assertions: [instruction], context: projection().context }
          });
        }
      },
      first.projection,
      undefined,
      undefined,
      undefined,
      first
    );
    expect(updates).toBe(2);
    expect(audits).toBe(1);
    expect(result.projection?.assertions).toHaveLength(2);
    expect(result.projection?.context).toEqual(first.projection?.context);
  });
  it("expands a reused retained ID for original-source judgment instead of merging or dropping either meaning", async () => {
    const first = await projectCourseDraft(draft(), {
      load: () => Promise.resolve(undefined),
      save: async () => {},
      capture: (call) =>
        Promise.resolve(
          call.promptVersion.endsWith(":project-verify")
            ? unchangedMeaningResponse(call)
            : { projection: projection() }
        )
    });
    const changed = structuredClone(first),
      d = {
        ...clause("d", "instruction", "Upload a report if assigned"),
        kind: "requirement" as const
      };
    changed.clauses.push(d);
    changed.links.push({ ...required(changed.links[0]), clauseRef: "d" });
    let updates = 0;
    const result = await projectCourseDraft(
      changed,
      {
        load: () => Promise.resolve(undefined),
        save: async () => {},
        capture: (call) => {
          if (call.promptVersion.endsWith(":project-verify"))
            return Promise.resolve(unchangedMeaningResponse(call));
          updates++;
          const payload = JSON.parse(call.user) as { allowedClauseRefs: string[] };
          if (updates === 1) {
            expect(payload.allowedClauseRefs).toEqual(["d"]);
            return Promise.resolve({
              projection: {
                assertions: [
                  {
                    ...required(projection().assertions[0]),
                    assertionRef: "reflection-weight",
                    field: "requirement",
                    representativeClauseRef: "d",
                    clauseRefs: ["d"]
                  }
                ],
                context: []
              }
            });
          }
          expect(payload.allowedClauseRefs).toEqual(["a", "b", "d"]);
          return Promise.resolve({
            projection: {
              assertions: [
                ...projection().assertions,
                {
                  ...required(projection().assertions[0]),
                  assertionRef: "conditional-upload",
                  field: "requirement",
                  representativeClauseRef: "d",
                  clauseRefs: ["d"]
                }
              ],
              context: []
            }
          });
        }
      },
      first.projection,
      undefined,
      undefined,
      undefined,
      first
    );
    expect(updates).toBe(2);
    expect(result.projection?.assertions).toHaveLength(2);
    expect(result.projection?.context).toEqual(first.projection?.context);
  });
  it("normalizes normative display slots without changing AI meaning or making a repair call", async () => {
    const d = draft();
    const c = required(d.clauses[0]);
    c.kind = "requirement";
    c.content = "If assigned, submit the checklist";
    c.modality = "must";
    c.conditions = ["If assigned"];
    d.links = d.links.filter((l) => l.clauseRef === "a");
    const a = {
      ...required(projection().assertions[0]),
      clauseRefs: ["a"],
      field: "submission_instruction"
    };
    const input = { assertions: [a], context: [] };
    let calls = 0;
    const result = await projectCourseDraft(
      d,
      {
        load: () => Promise.resolve(undefined),
        save: () => Promise.resolve(),
        capture: () => {
          calls++;
          return Promise.reject(Error("UNNECESSARY_LABEL_REPAIR"));
        }
      },
      undefined,
      undefined,
      undefined,
      { projection: input }
    );
    expect(calls).toBe(0);
    expect(result.projection?.assertions[0]?.field).toBe("requirement");
    expect(d.clauses[0]?.content).toBe(c.content);
    expect(input.assertions[0]?.field).toBe("submission_instruction");
  });
  it("repairs a global duplicate in owned assertions and context instead of preserving an impossible accounting scope", async () => {
    const p = projection();
    p.context.push({ clauseRefs: ["a"], basis: "Repeated annotation" });
    let repairs = 0;
    const result = await projectCourseDraft(
      draft(),
      {
        load: () => Promise.resolve(undefined),
        save: () => Promise.resolve(),
        capture: (call) => {
          if (call.promptVersion.endsWith(":project-verify"))
            return Promise.resolve(unchangedMeaningResponse(call));
          repairs++;
          const user = JSON.parse(call.user) as {
            metadataViolations: Array<{ code: string }>;
            allowedClauseRefs: string[];
          };
          expect(user.metadataViolations[0]?.code).toBe("COURSE_PROJECTION:DUPLICATE_ACCOUNTING");
          expect(new Set(user.allowedClauseRefs)).toEqual(new Set(["a", "b"]));
          return Promise.resolve({
            projection: { assertions: projection().assertions, context: [] }
          });
        }
      },
      undefined,
      undefined,
      undefined,
      { projection: p }
    );
    expect(repairs).toBe(1);
    expect(result.projection).toEqual(projection());
  });
  it("closes a missing audited member and independently rechecks repair-created context before saving", async () => {
    const d = draft();
    d.links = d.links.filter((l) => l.clauseRef !== "c");
    const weight = required(projection().assertions[0]);
    let audits = 0;
    let repairs = 0;
    let saves = 0;
    const result = await projectCourseDraft(
      d,
      {
        load: () => Promise.resolve(undefined),
        save: () => {
          saves++;
          return Promise.resolve();
        },
        capture: (call) => {
          expect(saves).toBe(0);
          if (call.promptVersion.endsWith(":project-patch")) {
            repairs++;
            const user = JSON.parse(call.user) as { missingClauseRefs: string[] };
            expect(user.missingClauseRefs).toEqual(["b"]);
            return Promise.resolve({
              projection: {
                assertions: [],
                context: [
                  {
                    clauseRefs: ["b"],
                    basis: "Unverified duplicate weight",
                    meaningDisposition: "BACKGROUND"
                  }
                ]
              }
            });
          }
          audits++;
          if (audits === 1)
            return Promise.resolve({
              replaceAssertionRefs: [weight.assertionRef],
              projection: { assertions: [{ ...weight, clauseRefs: ["a"] }], context: [] }
            });
          const user = JSON.parse(call.user) as {
            contextProbes: Array<{ assertionRef: string; clauseRefs: string[] }>;
          };
          expect(user.contextProbes.map((c) => c.clauseRefs)).toEqual([["b"]]);
          return Promise.resolve({
            replaceAssertionRefs: user.contextProbes.map((c) => c.assertionRef),
            projection: {
              assertions: [],
              context: [
                {
                  clauseRefs: ["b"],
                  basis: "Original weight supports the same existing assertion",
                  meaningDisposition: "SUPPORT",
                  representedByAssertionRefs: [weight.assertionRef]
                }
              ]
            }
          });
        }
      },
      undefined,
      undefined,
      undefined,
      { projection: { assertions: [weight], context: [] } }
    );
    expect(audits).toBe(2);
    expect(repairs).toBe(1);
    expect(saves).toBe(1);
    expect(result.projection?.assertions[0]?.clauseRefs).toEqual(["a"]);
    expect(result.projection?.context[0]?.representedByAssertionRefs).toEqual([
      weight.assertionRef
    ]);
  });
  it("preserves delivered historical counter-evidence as optional context while refusing outside current members", async () => {
    for (const historical of [true, false]) {
      const d = draft();
      d.clauses.push(clause("h", "weight", "Previous weight"));
      const { ownerRef: _owner, ...linkWithoutOwner } = required(d.links[0]);
      d.links.push({
        ...linkWithoutOwner,
        clauseRef: "h",
        disposition: historical ? "HISTORICAL" : "UNRESOLVED"
      });
      const weight = { ...required(projection().assertions[0]), resolutionClauseRefs: ["h"] };
      const pending = projectCourseDraft(
        d,
        {
          load: () => Promise.resolve(undefined),
          save: async () => {},
          capture: (call) => {
            if (call.promptVersion.endsWith(":project-verify"))
              return Promise.resolve(unchangedMeaningResponse(call));
            const user = JSON.parse(call.user) as { supportingOriginalClauses: Clause[] };
            expect(user.supportingOriginalClauses.map((c) => c.clauseId)).toEqual(["h"]);
            return Promise.resolve({
              projection: {
                assertions: [weight],
                context: [{ clauseRefs: ["h"], basis: "Delivered historical counter-evidence" }]
              }
            });
          }
        },
        undefined,
        undefined,
        undefined,
        { projection: { ...projection(), assertions: [{ ...weight, field: "requirement" }] } }
      );
      if (historical) {
        const result = await pending;
        expect(result.projection?.assertions).toEqual([weight]);
        expect(result.projection?.context.some((c) => c.clauseRefs.includes("h"))).toBe(true);
      } else await expect(pending).rejects.toThrow("PATCH_SCOPE");
    }
  });
  it("expands a metadata repair collision to both original groups without merging their meanings", async () => {
    const weight = required(projection().assertions[0]);
    const visibility = {
      ...weight,
      assertionRef: "visibility",
      representativeClauseRef: "c",
      clauseRefs: ["c"],
      field: "visibility"
    };
    let repairs = 0;
    const result = await projectCourseDraft(
      draft(),
      {
        load: () => Promise.resolve(undefined),
        save: async () => {},
        capture: (call) => {
          if (call.promptVersion.endsWith(":project-verify"))
            return Promise.resolve(unchangedMeaningResponse(call));
          repairs++;
          const user = JSON.parse(call.user) as {
            metadataViolations: Array<{ code: string }>;
            allowedClauseRefs: string[];
          };
          if (repairs === 1) {
            expect(new Set(user.allowedClauseRefs)).toEqual(new Set(["a", "b"]));
            return Promise.resolve({
              projection: { assertions: [{ ...weight, assertionRef: "visibility" }], context: [] }
            });
          }
          expect(new Set(user.allowedClauseRefs)).toEqual(new Set(["a", "b", "c"]));
          expect(user.metadataViolations).toHaveLength(2);
          expect(
            user.metadataViolations.every((v) => v.code === "COURSE_PROJECTION:DUPLICATE_IDENTITY")
          ).toBe(true);
          return Promise.resolve({ projection: { assertions: [weight, visibility], context: [] } });
        }
      },
      undefined,
      undefined,
      undefined,
      { projection: { assertions: [{ ...weight, field: "requirement" }, visibility], context: [] } }
    );
    expect(repairs).toBe(2);
    expect(result.projection?.assertions).toEqual([weight, visibility]);
    expect(result.projection?.context).toEqual([]);
  });
  it("continues only shrinking metadata failures and stops a repair that makes no progress", async () => {
    const weight = projection().assertions[0];
    if (!weight) throw Error("TEST_ASSERTION_MISSING");
    const visibility = {
      ...weight,
      assertionRef: "visibility",
      representativeClauseRef: "c",
      clauseRefs: ["c"],
      field: "requirement"
    };
    const invalid = { assertions: [{ ...weight, field: "requirement" }, visibility], context: [] };
    for (const stalled of [false, true]) {
      let repairs = 0;
      const promise = projectCourseDraft(
        draft(),
        {
          load: () => Promise.resolve(undefined),
          save: () => Promise.resolve(),
          capture: (call) => {
            if (call.promptVersion.endsWith(":project-verify"))
              return Promise.resolve(unchangedMeaningResponse(call));
            repairs++;
            const payload = JSON.parse(call.user) as { allowedClauseRefs: string[] };
            if (stalled) return Promise.resolve({ projection: invalid });
            if (repairs === 1)
              return Promise.resolve({
                projection: { assertions: [weight, visibility], context: [] }
              });
            expect(payload.allowedClauseRefs).toEqual(["c"]);
            return Promise.resolve({
              projection: { assertions: [{ ...visibility, field: "visibility" }], context: [] }
            });
          }
        },
        undefined,
        undefined,
        undefined,
        { projection: invalid }
      );
      if (stalled) {
        await expect(promise).rejects.toThrow("METADATA_REPAIR_STALLED");
        expect(repairs).toBe(1);
      } else {
        const result = await promise;
        expect(repairs).toBe(2);
        expect(result.projection?.assertions.map((a) => a.field)).toEqual(["weight", "visibility"]);
      }
    }
  });
  it("keeps a complete JSON repair with missing current IDs provisional and asks AI to close only the omission", async () => {
    const weight = required(projection().assertions[0]);
    const visibility = {
      ...weight,
      assertionRef: "visibility",
      representativeClauseRef: "c",
      clauseRefs: ["c"],
      field: "visibility"
    };
    const invalid = {
      assertions: [
        { ...weight, field: "requirement" },
        { ...visibility, field: "requirement" }
      ],
      context: []
    };
    let repairs = 0,
      saved = 0;
    const result = await projectCourseDraft(
      draft(),
      {
        load: () => Promise.resolve(undefined),
        save: () => {
          saved++;
          return Promise.resolve();
        },
        capture: (call) => {
          if (call.promptVersion.endsWith(":project-verify"))
            return Promise.resolve(unchangedMeaningResponse(call));
          repairs++;
          if (repairs === 1)
            return Promise.resolve({ projection: { assertions: [weight], context: [] } });
          expect(saved).toBe(0);
          const input = JSON.parse(call.user) as {
            missingClauseRefs: string[];
            allowedClauseRefs: string[];
          };
          expect(input.missingClauseRefs).toEqual(["c"]);
          expect(input.allowedClauseRefs).toEqual(["c"]);
          return Promise.resolve({ projection: { assertions: [visibility], context: [] } });
        }
      },
      undefined,
      undefined,
      undefined,
      { projection: invalid }
    );
    expect(repairs).toBe(2);
    expect(saved).toBe(1);
    expect(result.projection).toEqual({ assertions: [weight, visibility], context: [] });
    expect(() =>
      applyCourseProjectionPatch(invalid, { assertions: [weight], context: [] }, draft(), [
        "reflection-weight",
        "visibility"
      ])
    ).toThrow("PATCH_SCOPE");
  });
  it("keeps unrelated contexts out of metadata repair while still auditing their source meaning", async () => {
    const p = projection();
    let repairs = 0,
      audits = 0;
    const result = await projectCourseDraft(
      draft(),
      {
        load: () => Promise.resolve(undefined),
        save: () => Promise.resolve(),
        capture: (call) => {
          if (call.promptVersion.endsWith(":project-verify")) {
            audits++;
            return Promise.resolve(unchangedMeaningResponse(call));
          }
          repairs++;
          const input = JSON.parse(call.user) as {
            contextToRecheck: unknown[];
            allowedClauseRefs: string[];
          };
          expect(input.contextToRecheck).toEqual([]);
          expect(input.allowedClauseRefs).toEqual(["a", "b"]);
          return Promise.resolve({ projection: { assertions: p.assertions, context: [] } });
        }
      },
      undefined,
      undefined,
      undefined,
      {
        projection: {
          assertions: [{ ...required(p.assertions[0]), field: "requirement" }],
          context: p.context
        }
      }
    );
    expect(result.projection).toEqual(p);
    expect(repairs).toBe(1);
    expect(audits).toBe(1);
  });
  it("repairs omitted observations explicitly without replacing already complete assertions", async () => {
    const incomplete = projection();
    incomplete.context = [];
    let captures = 0;
    const result = await projectCourseDraft(draft(), {
      load: () => Promise.resolve(undefined),
      save: async () => {},
      capture: (call) => {
        if (call.promptVersion.endsWith(":project-verify"))
          return Promise.resolve(unchangedMeaningResponse(call));
        captures++;
        if (captures === 1) return Promise.resolve({ projection: incomplete });
        const payload = JSON.parse(call.user) as {
          missingClauseRefs: string[];
          allowedClauseRefs: string[];
        };
        expect(payload.missingClauseRefs).toEqual(["c"]);
        expect(payload.allowedClauseRefs).toEqual(["c"]);
        return Promise.resolve({ projection: { assertions: [], context: projection().context } });
      }
    });
    expect(captures).toBe(2);
    expect(result.projection?.assertions).toEqual(incomplete.assertions);
    expect(result.projection?.context).toEqual(projection().context);
  });
  it("reuses validated semantic work on recovery and invalidates it when source meaning changes", async () => {
    const cache = new Map<string, unknown>();
    let captures = 0;
    const port = {
      load: (key: string) => Promise.resolve(cache.get(key)),
      save: (key: string, value: unknown) => {
        cache.set(key, value);
        return Promise.resolve();
      },
      capture: (call: { promptVersion: string; user: string }) => {
        if (call.promptVersion.endsWith(":project-verify"))
          return Promise.resolve(unchangedMeaningResponse(call));
        captures++;
        return Promise.resolve({ projection: projection() });
      }
    };
    const first = await projectCourseDraft(draft(), port);
    expect((await projectCourseDraft(draft(), port)).projection).toEqual(first.projection);
    expect(captures).toBe(1);
    const changed = draft();
    required(changed.clauses[0]).conditions.push("only for the assigned group");
    await projectCourseDraft(changed, port);
    expect(captures).toBe(2);
    const key = [...cache.keys()][0];
    if (!key) throw Error("SYNTHETIC_CACHE_MISSING");
    const corrupt = projection();
    required(corrupt.assertions[0]).clauseRefs.push("unknown-native-clause");
    cache.set(key, { projection: corrupt });
    await expect(projectCourseDraft(draft(), port)).rejects.toThrow("COVERAGE");
    expect(captures).toBe(2);
  });
  it("keeps owner-unresolved and historical observations as evidenced context without promoting them to an owned assertion", () => {
    const d = draft(),
      p = projection();
    const { ownerRef: _owner, ...unownedLink } = required(d.links[0]);
    d.clauses.push(clause("u", "requirement", "Prepare slides if this assignment applies"));
    d.links.push({
      ...unownedLink,
      clauseRef: "u",
      disposition: "UNRESOLVED",
      state: "UNCERTAIN"
    });
    d.clauses.push(clause("h", "deadline", "Old deadline"));
    d.links.push({ ...required(d.links[0]), clauseRef: "h", disposition: "HISTORICAL" });
    p.context.push({
      clauseRefs: ["u", "h"],
      basis: "Ownership unresolved; old deadline historical. Native passages remain available."
    });
    expect(validateCourseProjection(p, d).context).toHaveLength(2);
    p.assertions.push({
      ...required(p.assertions[0]),
      assertionRef: "unresolved-promoted",
      clauseRefs: ["u"],
      representativeClauseRef: "u"
    });
    expect(() => validateCourseProjection(p, d)).toThrow("COVERAGE");
  });
  it("allows source-local normative labels to differ while preserving the prohibition body and its exception", () => {
    const d = draft(),
      p = projection();
    for (const [i, kind] of [
      [0, "rule"],
      [1, "prohibition"]
    ] as const) {
      const c = required(d.clauses[i]);
      c.kind = kind;
      c.content = "Do not email the report unless the instructor explicitly requests it";
      c.modality = "must_not";
      c.exceptions = ["unless the instructor explicitly requests it"];
    }
    required(p.assertions[0]).field = "requirement";
    expect(validateCourseProjection(p, d).assertions).toHaveLength(1);
    expect(d.clauses[0]?.exceptions).toEqual(["unless the instructor explicitly requests it"]);
    required(d.clauses[1]).kind = "field";
    expect(() => validateCourseProjection(p, d)).toThrow("KIND");
  });
  it("compiles one semantic field with both exact source witnesses while retaining all original observations and context", () => {
    const d = draft(),
      before = structuredClone(d.clauses);
    d.projection = validateCourseProjection(projection(), d);
    const course = makeCourse();
    const sources: SourceRecord[] = d.clauses.map((c) => ({
      sourceId: c.sourceId,
      courseId: course.courseId,
      nativeItemId: c.sourceId,
      kind: "content",
      title: c.sourceId,
      updatedAt: course.updatedAt,
      parsed: {
        text: required(c.evidence[0]).excerpt,
        structure: [],
        units: [{ locator: "native-text", text: required(c.evidence[0]).excerpt, partial: false }]
      }
    }));
    const result = compileCourseDraft(d, sources, {
      course,
      workflowId: "projection-test",
      sources: new Map(
        d.clauses.map((c) => [c.sourceId, { sourceId: c.sourceId, title: c.sourceId }])
      ),
      exclusionKeys: new Set(),
      now: course.updatedAt
    }).candidate;
    expect(result.bundle.facts).toHaveLength(1);
    expect(result.bundle.facts[0]).toMatchObject({
      field: "weight",
      value: { state: "KNOWN", value: "25%" }
    });
    expect(result.bundle.facts[0]?.evidenceRefs.map((e) => e.sourceId)).toEqual(["a", "b"]);
    expect(d.clauses).toEqual(before);
    const bound = projection();
    required(bound.assertions[0]).clauseRefs = ["a"];
    bound.context.unshift({
      clauseRefs: ["b"],
      basis: "Same authored weight",
      meaningDisposition: "SUPPORT",
      representedByAssertionRefs: ["reflection-weight"]
    });
    d.projection = validateCourseProjection(bound, d);
    const supported = compileCourseDraft(d, sources, {
      course,
      workflowId: "support-test",
      sources: new Map(
        d.clauses.map((c) => [c.sourceId, { sourceId: c.sourceId, title: c.sourceId }])
      ),
      exclusionKeys: new Set(),
      now: course.updatedAt
    }).candidate;
    expect(supported.bundle.facts).toHaveLength(1);
    expect(supported.bundle.facts[0]?.evidenceRefs.map((e) => e.sourceId)).toEqual(["a", "b"]);
    required(bound.context[0]).representedByAssertionRefs = ["unknown-fact"];
    expect(() => validateCourseProjection(bound, d)).toThrow("CONTEXT_SUPPORT");
    expect(result.objectIssues.flatMap((i) => i.unresolvedIssues)).toHaveLength(0);
  });
  it("rejects silent omissions, duplicate coverage, cross-owner grouping and ungrounded resolution", () => {
    const d = draft();
    const missing = projection();
    missing.context = [];
    expect(() => validateCourseProjection(missing, d)).toThrow("MISSING");
    const dup = projection();
    required(dup.context[0]).clauseRefs.push("a");
    expect(() => validateCourseProjection(dup, d)).toThrow("COVERAGE");
    const differentOwner = structuredClone(d);
    required(differentOwner.links[1]).ownerRef = "other";
    expect(() => validateCourseProjection(projection(), differentOwner)).toThrow("OWNER");
    const conflict = structuredClone(d);
    required(conflict.clauses[1]).value.value = "45%";
    expect(() => validateCourseProjection(projection(), conflict)).toThrow("CONFLICT_PROMOTED");
    const uncertain = structuredClone(d);
    required(uncertain.links[0]).state = "UNCERTAIN";
    expect(() => validateCourseProjection(projection(), uncertain)).toThrow("UNRESOLVED_PROMOTED");
  });
  it("passes exact native context to AI without rewriting the observations and preserves legacy workflow policies", async () => {
    const d = draft(),
      before = structuredClone(d);
    const result = await projectCourseDraft(d, {
      load: () => Promise.resolve(undefined),
      save: async () => {},
      capture: (call) => {
        if (call.promptVersion.endsWith(":project-verify"))
          return Promise.resolve(unchangedMeaningResponse(call));
        const payload = JSON.parse(call.user) as {
          evidenceCatalog: Array<{ excerpt: string }>;
          clauses: Array<{ evidenceRefs: string[] }>;
        };
        expect(required(payload.evidenceCatalog[0]).excerpt).toBe(
          d.clauses[0]?.evidence[0]?.excerpt
        );
        expect(required(payload.clauses[0]).evidenceRefs).toEqual(["e-a"]);
        return Promise.resolve({ projection: projection() });
      }
    });
    expect(d).toEqual(before);
    expect(result.projection?.assertions).toHaveLength(1);
    expect(isSelectiveCoursePolicy("selective-draft/1")).toBe(true);
    expect(isSelectiveCoursePolicy("selective-draft/2")).toBe(true);
    expect(isSelectiveCoursePolicy("native-global/1")).toBe(false);
  });
  it("repairs only affected observation groups and retains a separate conditional instruction without rewriting either body", () => {
    const d = draft(),
      p = projection(),
      independent = {
        ...clause("d", "instruction", "Upload a report if assigned"),
        kind: "requirement" as const,
        conditions: ["if assigned"]
      };
    d.clauses.push(independent);
    d.links.push({ ...required(d.links[0]), clauseRef: "d" });
    const prior = {
      ...p,
      assertions: [
        ...p.assertions,
        {
          ...required(p.assertions[0]),
          assertionRef: "conditional-report",
          field: "requirement",
          representativeClauseRef: "d",
          clauseRefs: ["d"]
        }
      ]
    };
    const repaired = applyCourseProjectionPatch(prior, p, d, ["reflection-weight"]);
    expect(repaired.assertions[0]).toEqual(prior.assertions[1]);
    expect(d.clauses[3]?.conditions).toEqual(["if assigned"]);
    const outside = structuredClone(p);
    required(outside.assertions[0]).clauseRefs.push("d");
    expect(() => applyCourseProjectionPatch(prior, outside, d, ["reflection-weight"])).toThrow(
      "PATCH_SCOPE"
    );
    const rewrite = {
      ...p,
      assertions: [{ ...required(p.assertions[0]), content: "Invented new body" }]
    };
    expect(() => validateCourseProjection(rewrite, d)).toThrow("REWRITE");
  });
});

function required<T>(value: T | undefined): T {
  if (value === undefined) throw Error("SYNTHETIC_EXPECTED_VALUE_MISSING");
  return value;
}
