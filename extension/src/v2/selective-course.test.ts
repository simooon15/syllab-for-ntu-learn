import { describe, expect, it } from "vitest";
import { makeCourse, makeSnapshot } from "./testing";
import type { AiCall } from "./ai-pipeline";
import type { Clause, CourseDraft, SelectivePort } from "./selective-course";
import type { SourceRecord } from "./schema";
import {
  SELECTIVE_COURSE_SCHEMA as schema,
  compileCourseDraft,
  compareCourseDraft,
  inspectionView,
  runSelectiveCourse,
  semanticSourceVersion,
  validateInspections,
  validateFullTextScreen,
  validateLinks,
  applyCourseLinkPatch,
  repairCourseEntityParents
} from "./selective-course";
import { directReviewItems } from "./direct-review";
import { materializeTaskC } from "./materialize";
import { acceptChange } from "./course-state";
import { reviewItemView } from "./view";

const now = "2026-10-10T00:00:00.000Z";
const course = makeCourse({
  courseId: "synthetic-selective",
  courseCode: "TEST",
  courseName: "Synthetic"
});
const source = (id = "s"): SourceRecord => ({
  sourceId: id,
  courseId: course.courseId,
  nativeItemId: id,
  kind: "attachment",
  title: "Lecture slides",
  updatedAt: now,
  parsed: {
    text: "",
    structure: [],
    units: [
      { locator: "page:1", text: "Theory. Examples can be useful. End.", partial: false },
      {
        locator: "page:2",
        text: "Topic. Upload your reflection by Friday. You may use a diagram if useful, except when confidential. The practice could count toward participation. End.",
        partial: false
      }
    ]
  }
});
function port(handler: (call: AiCall, input: Record<string, unknown>) => unknown) {
  const cache = new Map<string, unknown>(),
    calls: AiCall[] = [];
  const p: SelectivePort = {
    load: (key) => Promise.resolve(cache.get(key)),
    save: (key, v) => {
      cache.set(key, structuredClone(v));
      return Promise.resolve();
    },
    capture: (call) => {
      calls.push(call);
      return Promise.resolve(handler(call, JSON.parse(call.user) as Record<string, unknown>));
    }
  };
  return { p, calls };
}
function rawClause(content: string, extra: Record<string, unknown> = {}) {
  return {
    kind: "requirement",
    content,
    state: "KNOWN",
    competingValues: [],
    modality: "must",
    conditions: [],
    exceptions: [],
    applicability: "CURRENT",
    context: "Current reflection instructions",
    evidence: [{ refId: "n1.1.1" }],
    ...extra
  };
}
function link(clauses: Clause[]) {
  return {
    schema,
    entities: [
      {
        ref: "reflection",
        name: "Reflection",
        type: "assignment",
        role: "assessment",
        aliases: [],
        clauseRefs: [clauses[0]?.clauseId]
      }
    ],
    links: clauses.map((c) => ({
      clauseRef: c.clauseId,
      ownerRef: "reflection",
      disposition: c.value.state === "UNCERTAIN" ? "UNRESOLVED" : "CURRENT",
      state: c.value.state,
      competingClauseRefs: [],
      resolutionClauseRefs: [],
      basis: "Current source instructions"
    })),
    identities: [],
    reads: []
  };
}
it("binds version locally when an otherwise typed payload omits only its decorative schema", () => {
  const inspected = validateInspections(
    {
      decisions: [
        { sourceId: "s", depth: "DEEP", locators: ["page:2"], reason: "Concrete upload cue" }
      ]
    },
    [source()]
  );
  expect(inspected[0]?.depth).toBe("DEEP");
  expect(() => validateInspections({ schema: "wrong", decisions: [] }, [source()])).toThrow(
    "SCHEMA"
  );
  expect(() => validateInspections({ schema, notes: [] }, [source()])).toThrow("ARRAY");
});
it("ignores only no-op inventory rows without claiming their text was delivered or accepting an undelivered deep-read request", () => {
  const a = source("a"),
    b = source("b"),
    decision = {
      sourceId: "a",
      depth: "INSPECTED",
      locators: [],
      reason: "Actual delivered units screened"
    };
  expect(
    validateFullTextScreen(
      { decisions: [decision, { ...decision, sourceId: "b" }] },
      [a],
      [a, b]
    ).map((i) => i.sourceId)
  ).toEqual(["a"]);
  expect(() =>
    validateFullTextScreen(
      {
        decisions: [decision, { ...decision, sourceId: "b", depth: "DEEP", locators: ["page:2"] }]
      },
      [a],
      [a, b]
    )
  ).toThrow("SCREEN_UNDELIVERED_REQUEST");
  expect(() =>
    validateFullTextScreen(
      { decisions: [decision, { ...decision, sourceId: "invented" }] },
      [a],
      [a, b]
    )
  ).toThrow("SCREEN_SOURCE");
});

it("lets AI find a cue-free middle instruction through complete native screening and reuses that screening and deep reading on recovery", async () => {
  const s = source();
  required(s.parsed?.units?.[1]).text =
    "Methods. Each pair will produce a one-page critique before our next meeting. Final concepts.";
  expect(inspectionView(s).units[1]?.preview.join(" ")).not.toContain("one-page critique");
  const adapter = port((call, input) => {
    if (call.promptVersion.endsWith(":inspect"))
      return {
        decisions: [
          {
            sourceId: s.sourceId,
            depth: "INSPECTED",
            locators: [],
            reason: "Initial heading-only observation"
          }
        ]
      };
    if (call.promptVersion.endsWith(":screen")) {
      const delivered = input.sources as Array<{ units: Array<{ locator: string; text: string }> }>;
      expect(delivered[0]?.units[1]?.text).toContain("one-page critique");
      return {
        decisions: [
          {
            sourceId: s.sourceId,
            depth: "DEEP",
            locators: ["page:2"],
            reason: "An actual pair critique is required before the next meeting"
          }
        ]
      };
    }
    if (call.promptVersion.endsWith(":read"))
      return {
        notes: [
          {
            sourceId: s.sourceId,
            clauses: [
              rawClause("Each pair will produce a one-page critique before our next meeting.")
            ]
          }
        ],
        reads: []
      };
    return link(input.clauses as Clause[]);
  });
  const input = { course, sources: [s], completeScreening: true };
  const first = await runSelectiveCourse(input, adapter.p);
  expect(first.clauses[0]?.content).toContain("one-page critique");
  expect(first.deepLocators[s.sourceId]).toEqual(["page:2"]);
  expect(first.screenings?.[0]?.depth).toBe("DEEP");
  const recovered = await runSelectiveCourse(input, adapter.p);
  expect(recovered.clauses).toEqual(first.clauses);
  for (const stage of [":inspect", ":screen", ":read"])
    expect(adapter.calls.filter((c) => c.promptVersion.endsWith(stage))).toHaveLength(1);
});
async function draftRun(sources: SourceRecord[] = [source()], completeScreening = false) {
  const adapter = port((call, input) => {
    if (call.promptVersion.endsWith(":screen"))
      return {
        decisions: (input.sources as Array<{ sourceId: string }>).map((s) => ({
          sourceId: s.sourceId,
          depth: "INSPECTED",
          locators: [],
          reason: "Remaining supplied native text contains teaching prose only"
        }))
      };
    if (call.promptVersion.endsWith(":inspect"))
      return {
        schema,
        decisions: (input.sources as Array<{ sourceId: string }>).map((s) => ({
          sourceId: s.sourceId,
          depth: "DEEP",
          locators: ["page:2"],
          reason: "Hidden upload instructions need full reading"
        }))
      };
    if (call.promptVersion.endsWith(":read"))
      return {
        schema,
        notes: [
          {
            sourceId: (input.sources as Array<{ index: { sourceId: string } }>)[0]?.index.sourceId,
            clauses: [
              rawClause("Reflection is the current task", {
                kind: "identity",
                modality: "descriptive"
              }),
              rawClause("Upload your reflection by Friday."),
              rawClause("You may use a diagram.", {
                modality: "may",
                conditions: ["if useful"],
                exceptions: ["except when confidential"]
              }),
              rawClause("The practice could count toward participation.", {
                state: "UNCERTAIN",
                applicability: "UNCERTAIN",
                modality: "could"
              })
            ]
          }
        ],
        reads: []
      };
    return link(input.clauses as Clause[]);
  });
  return {
    draft: await runSelectiveCourse({ course, sources, completeScreening }, adapter.p),
    ...adapter
  };
}
function compile(draft: CourseDraft, sources = [source()]) {
  return compileCourseDraft(draft, sources, {
    course,
    workflowId: "isolated",
    sources: new Map(sources.map((s) => [s.sourceId, { sourceId: s.sourceId, title: s.title }])),
    exclusionKeys: new Set(),
    now
  });
}

describe("selective CourseDraft semantic and cost boundaries", () => {
  it("reuses a validated source interpretation for an unchanged Rebuild while retaining changed Human values locally", async () => {
    const { draft } = await draftRun([source()], true);
    let calls = 0;
    const unchanged = await runSelectiveCourse(
      {
        course,
        sources: [source()],
        previous: draft,
        currentContext: { userEditedWeight: "41%" },
        completeScreening: true
      },
      {
        load: () => Promise.resolve(undefined),
        save: async () => {},
        capture: () => {
          calls++;
          throw Error("UNCHANGED_SOURCE_REGENERATION");
        }
      }
    );
    expect(calls).toBe(0);
    expect(unchanged).toEqual(draft);
    required(unchanged.clauses[0]).content = "QA-only modification";
    expect(draft.clauses[0]?.content).not.toBe("QA-only modification");
    const changed = source();
    required(changed.parsed?.units?.[1]).text += " A new deadline is announced.";
    await expect(
      runSelectiveCourse(
        { course, sources: [changed], previous: draft, completeScreening: true },
        {
          load: () => Promise.resolve(undefined),
          save: async () => {},
          capture: () => {
            calls++;
            throw Error("SOURCE_CHANGE_REQUIRES_NEW_JUDGMENT");
          }
        }
      )
    ).rejects.toThrow("SOURCE_CHANGE_REQUIRES_NEW_JUDGMENT");
    expect(calls).toBe(1);
  });
  it("reuses trusted Assessment and Rule IDs without needing an earlier CourseDraft checkpoint", async () => {
    const { draft } = await draftRun();
    draft.entities[0] = { ...required(draft.entities[0]), ref: "trusted-assessment" };
    draft.links = draft.links.map((l) => ({ ...l, ownerRef: "trusted-assessment" }));
    const ruleClause = {
      ...required(draft.clauses[1]),
      clauseId: "rule-clause",
      kind: "rule" as const,
      content: "Retain a copy",
      value: { state: "KNOWN" as const, value: "Retain a copy" }
    };
    draft.clauses.push(ruleClause);
    draft.entities.push({
      ref: "trusted-rule",
      name: "Retention",
      type: "rule",
      role: "assessment",
      aliases: [],
      clauseRefs: ["rule-clause"]
    });
    draft.links.push({
      clauseRef: "rule-clause",
      ownerRef: "trusted-rule",
      disposition: "CURRENT",
      state: "KNOWN",
      competingClauseRefs: [],
      resolutionClauseRefs: [],
      basis: "Current evidenced Rule"
    });
    const c = compileCourseDraft(
      draft,
      [source()],
      {
        course,
        workflowId: "isolated",
        sources: new Map([["s", { sourceId: "s", title: "Synthetic" }]]),
        exclusionKeys: new Set(),
        now
      },
      new Set(["trusted-assessment"]),
      new Set(["trusted-rule"])
    ).candidate;
    expect(c.assessments[0]?.assessmentId).toBe("trusted-assessment");
    expect(c.constraints[0]?.constraintId).toBe("trusted-rule");
    expect(
      c.bundle.facts.find((f) => f.semanticClause?.clauseId === "rule-clause")?.constraintId
    ).toBe("trusted-rule");
  });
  it("renders distinct change items on the same owner using each exact change ID", async () => {
    const { draft } = await draftRun(),
      candidate = compile(draft).candidate;
    const facts = candidate.bundle.facts,
      assessment = required(candidate.assessments[0]);
    const changes = facts.slice(1, 3).map((f, i) => ({
      changeId: `change-${String(i)}`,
      courseId: course.courseId,
      workflowId: "isolated",
      targetId: assessment.assessmentId,
      field: f.factId,
      changeType: "CHANGED" as const,
      currentValue: f.value,
      latestValue: { state: "KNOWN" as const, value: `Latest ${String(i)}` },
      currentEvidenceIds: [],
      newEvidenceIds: [],
      createdAt: now,
      updatedAt: now
    }));
    const views = changes.map((c) =>
      reviewItemView(
        {
          reviewItemId: c.changeId,
          courseId: course.courseId,
          workflowId: "isolated",
          targetId: c.targetId,
          kind: "change",
          changeType: "CHANGED",
          payload: { changeId: c.changeId },
          createdAt: now,
          updatedAt: now
        },
        { assessments: candidate.assessments, constraints: [], facts, changes },
        () => [],
        { index: 1, total: 2 }
      )
    );
    expect(views.map((v) => v.latest?.values[0]?.display)).toEqual(["Latest 0", "Latest 1"]);
  });
  it("uses native PDF layout for a cheap observation while retaining a hidden middle-line action", () => {
    const lines = [
        "Lecture heading",
        "Concepts can be useful",
        "Upload the reflection by Friday",
        "A large amount of teaching prose about ordinary conceptual examples",
        "End"
      ],
      text = lines.join(" ");
    let offset = 0;
    const ranges = lines.map((line, i) => {
      const start = offset;
      offset += line.length + 1;
      return {
        start,
        end: start + line.length,
        x: 0,
        y: 100 - i * 15,
        width: line.length,
        height: i === 0 ? 18 : 12
      };
    });
    const s = source();
    s.parsed = {
      text,
      structure: [],
      units: [{ locator: "page:1", text, textRanges: ranges, partial: false }]
    };
    const view = required(inspectionView(s).units[0]);
    expect(view.preview.join(" ")).toContain("Upload the reflection by Friday");
    expect(view.omittedCharacters).toBeGreaterThan(0);
    const moved = structuredClone(s);
    required(required(moved.parsed).units)[0] = {
      ...required(required(moved.parsed).units?.[0]),
      textRanges: ranges.map((r) => ({ ...r, height: 22 }))
    };
    expect(semanticSourceVersion(moved)).not.toBe(semanticSourceVersion(s));
  });
  it("permits an explicit source check during linking without discarding or rewriting reader carry", async () => {
    const first = await draftRun();
    let linked = 0;
    const adapter = port((call, input) => {
      if (call.promptVersion.endsWith(":inspect"))
        return {
          schema,
          decisions: [
            { sourceId: "s", depth: "DEEP", locators: ["page:2"], reason: "Instructions" }
          ]
        };
      if (call.promptVersion.endsWith(":read"))
        return {
          schema,
          notes: [{ sourceId: "s", clauses: [rawClause("Upload your reflection by Friday.")] }],
          reads: []
        };
      linked++;
      if (linked === 1)
        return {
          schema,
          reads: [{ sourceId: "s", locators: ["page:2"], reason: "Verify exact original context" }]
        };
      expect(input.verificationSources).toHaveLength(1);
      expect(JSON.stringify(input.verificationSources)).toContain(
        "Upload your reflection by Friday"
      );
      return link(input.clauses as Clause[]);
    });
    const checked = await runSelectiveCourse(
      { course, sources: [source()], previous: first.draft },
      adapter.p
    );
    expect(checked.clauses).toHaveLength(1);
    expect(adapter.calls.filter((c) => c.promptVersion.endsWith(":read"))).toHaveLength(1);
    expect(linked).toBe(2);
  });
  it("retains global decisions through an ALL verification and applies only explicit link deltas", async () => {
    let original: ReturnType<typeof link> | undefined;
    const adapter = port((call, input) => {
      if (call.promptVersion.endsWith(":inspect"))
        return {
          schema,
          decisions: [
            { sourceId: "s", depth: "DEEP", locators: ["page:2"], reason: "Instructions" }
          ]
        };
      if (call.promptVersion.endsWith(":read"))
        return {
          schema,
          notes: [
            {
              sourceId: "s",
              clauses: JSON.stringify(input.sources).includes("page:1")
                ? []
                : [rawClause("Upload your reflection by Friday.")],
              noneReason: "This delivered unit contains only descriptive examples"
            }
          ],
          reads: []
        };
      if (call.promptVersion.endsWith(":link")) {
        original = link(input.clauses as Clause[]);
        return {
          ...original,
          reads: [{ sourceId: "s", locators: ["ALL"], reason: "Check entire source" }]
        };
      }
      expect(input.previousLink).toEqual({
        entities: original?.entities,
        links: original?.links,
        identities: original?.identities
      });
      return { schema, patch: { links: [] }, reads: [] };
    });
    const result = await runSelectiveCourse({ course, sources: [source()] }, adapter.p);
    expect(result.links).toEqual(original?.links);
    expect(result.deepLocators.s).toEqual(["page:2", "page:1"]);
    expect(adapter.calls.filter((c) => c.promptVersion.endsWith(":link"))).toHaveLength(1);
    expect(adapter.calls.filter((c) => c.promptVersion.endsWith(":link-patch"))).toHaveLength(1);
  });
  it("keeps the exact global request stable when a leading source inspection misses cache and the run resumes", async () => {
    const sources = [source("a"), source("b")],
      adapter = port((call, input) => {
        if (call.promptVersion.endsWith(":inspect"))
          return {
            decisions: (input.sources as Array<{ sourceId: string }>).map((s) => ({
              sourceId: s.sourceId,
              depth: "DEEP",
              locators: ["page:2"],
              reason: "Required instruction"
            }))
          };
        if (call.promptVersion.endsWith(":read"))
          return {
            notes: [
              {
                sourceId: (input.sourceContext as { sourceId: string }).sourceId,
                clauses: [rawClause("Upload your reflection by Friday.")]
              }
            ],
            reads: []
          };
        return link(input.clauses as Clause[]);
      });
    await runSelectiveCourse({ course, sources }, adapter.p);
    const first = required(adapter.calls.find((c) => c.promptVersion.endsWith(":link")));
    const missing = {
      ...adapter.p,
      load: async (key: string) => {
        const v = await adapter.p.load(key);
        return v && typeof v === "object" && "depth" in v && "sourceId" in v && v.sourceId === "a"
          ? undefined
          : v;
      }
    };
    await runSelectiveCourse({ course, sources }, missing);
    const second = required(adapter.calls.filter((c) => c.promptVersion.endsWith(":link")).at(-1));
    expect(second.user).toBe(first.user);
    await runSelectiveCourse({ course, sources }, adapter.p);
    expect(adapter.calls.at(-1)?.user).toBe(first.user);
  });
  it("rejects delta omissions, implicit clause rewriting and dangling entity removal", async () => {
    const { draft } = await draftRun(),
      prior = link(draft.clauses);
    const empty = { patch: { links: [] } };
    expect(applyCourseLinkPatch(prior, empty, draft.clauses)).toEqual(
      validateLinks(prior, draft.clauses)
    );
    expect(() =>
      applyCourseLinkPatch(prior, empty, [
        ...draft.clauses,
        { ...required(draft.clauses[0]), clauseId: "new-clause" }
      ])
    ).toThrow("LINK_MISSING");
    expect(() =>
      applyCourseLinkPatch(
        prior,
        { patch: { links: [{ ...required(prior.links[0]), content: "rewritten" }] } },
        draft.clauses
      )
    ).toThrow("LINK_REWRITE");
    expect(() =>
      applyCourseLinkPatch(
        prior,
        { patch: { removeEntityRefs: [required(prior.entities[0]).ref] } },
        draft.clauses
      )
    ).toThrow("LINK_OWNER");
  });
  it("keeps retired source-version meaning and Evidence as history, rejects Current promotion and unknown IDs", async () => {
    const { draft } = await draftRun(),
      original = structuredClone(required(draft.clauses[1])),
      retired = { ...original, clauseId: "retired-source-clause" };
    const historical = {
      clauseRef: retired.clauseId,
      disposition: "HISTORICAL" as const,
      state: retired.value.state,
      competingClauseRefs: [],
      resolutionClauseRefs: [required(draft.clauses[1]).clauseId],
      basis: "Earlier source version is retained; current source version differs"
    };
    draft.retiredClauses = [retired];
    draft.links.push(historical);
    expect(validateLinks(draft, draft.clauses, draft.retiredClauses).links).toHaveLength(
      draft.clauses.length + 1
    );
    const candidate = compile(draft).candidate;
    expect(
      candidate.bundle.facts.some((f) => f.semanticClause?.clauseId === retired.clauseId)
    ).toBe(false);
    expect(candidate.unresolvedIssues.some((i) => i.description.includes("HISTORICAL"))).toBe(
      false
    );
    expect(candidate.bundle.evidence.some((e) => e.excerpt === retired.evidence[0]?.excerpt)).toBe(
      true
    );
    expect(draft.retiredClauses[0]).toEqual(retired);
    expect(() =>
      validateLinks(
        {
          ...draft,
          links: draft.links.map((l) =>
            l.clauseRef === retired.clauseId
              ? { ...l, ownerRef: required(draft.entities[0]).ref, disposition: "CURRENT" }
              : l
          )
        },
        draft.clauses,
        draft.retiredClauses
      )
    ).toThrow("SOURCE_VERSION_CURRENT");
    expect(() =>
      validateLinks(
        { ...draft, links: [...draft.links, { ...historical, clauseRef: "unprovided-clause" }] },
        draft.clauses,
        draft.retiredClauses
      )
    ).toThrow("LINK_COVERAGE");
  });
  it("retains historical entities and their Evidence without projecting them as current assessments or losing cross-period questions", async () => {
    const { draft } = await draftRun(),
      c = {
        ...required(draft.clauses[0]),
        clauseId: "old-quiz",
        applicability: "HISTORICAL" as const
      };
    draft.clauses.push(c);
    draft.entities.push({
      ...required(draft.entities[0]),
      ref: "historical-quiz",
      name: "Prior semester quiz",
      clauseRefs: [c.clauseId]
    });
    draft.links.push({
      ...required(draft.links[0]),
      clauseRef: c.clauseId,
      ownerRef: "historical-quiz",
      disposition: "HISTORICAL",
      basis: "Prior semester evidence"
    });
    draft.identities.push({
      entityRefs: [required(draft.entities[0]).ref, "historical-quiz"],
      relationship: "UNCERTAIN",
      clauseRefs: [c.clauseId, required(draft.clauses[0]).clauseId],
      basis: "Cross-period relationship requires review"
    });
    expect(validateLinks(draft, draft.clauses).entities).toHaveLength(2);
    const candidate = compile(draft).candidate;
    expect(candidate.assessments).toHaveLength(1);
    expect(candidate.bundle.facts.some((f) => f.semanticClause?.clauseId === c.clauseId)).toBe(
      false
    );
    const review = directReviewItems(candidate, course.courseId, "isolated", now);
    expect(JSON.stringify(review)).toContain("Cross-period relationship requires review");
    expect(JSON.stringify(review)).toContain("Prior semester evidence");
    expect(draft.entities).toHaveLength(2);
  });
  it("observes every unit and exposes a hidden action, without calling cue absence irrelevant", async () => {
    const observation = inspectionView(source());
    expect(observation.units).toHaveLength(2);
    expect(observation.units[1]?.preview.join(" ")).toContain("Upload your reflection by Friday");
    expect(observation.units[0]?.omittedCharacters).toBeGreaterThan(0);
    const { draft, calls } = await draftRun();
    expect(draft.deepLocators).toEqual({ s: ["page:2"] });
    const read = calls.find((c) => c.promptVersion.endsWith(":read"));
    expect(read?.user).toContain("Upload your reflection");
    expect(read?.user).not.toContain("Examples can be useful");
    const c = compile(draft).candidate;
    expect(c.coverage[0]?.unresolvedNativeLocators).toHaveLength(1);
    expect(c.readingSummary.join(" ")).toContain("not claimed irrelevant or understood");
    expect(calls.at(-1)?.user).not.toContain('"excerpt"');
  });
  it("keeps saved visual gaps and later unresolved signal checks visible in the course reading scope", async () => {
    const s = source();
    required(required(s.parsed).units?.[0]).partial = true;
    required(required(s.parsed).units?.[0]).visualGaps = ["unresolved-vector-region"];
    const { draft } = await draftRun([s]);
    draft.screenings = [
      {
        sourceId: s.sourceId,
        depth: "UNRESOLVED",
        locators: [],
        reason: "A diagram contains unread instructions"
      }
    ];
    const candidate = compile(draft, [s]).candidate;
    expect(candidate.readingSummary.join(" ")).toContain("1 sources, 1 units");
    expect(candidate.readingSummary.join(" ")).toContain("A diagram contains unread instructions");
    expect(candidate.coverage[0]?.limitations).toHaveLength(1);
  });
  it("requires complete inspection accounting and exposes unavailable material", () => {
    expect(() => validateInspections({ schema, decisions: [] }, [source()])).toThrow(
      "INSPECTION_MISSING"
    );
    const unavailable = { ...source(), parsed: undefined } as unknown as SourceRecord;
    expect(() =>
      validateInspections(
        {
          schema,
          decisions: [{ sourceId: "s", depth: "INSPECTED", locators: [], reason: "Title only" }]
        },
        [unavailable]
      )
    ).toThrow("UNAVAILABLE_INSPECTED");
  });
  it("keeps independent clauses, optionality, conditions, exceptions and uncertainty in actual Review records", async () => {
    const { draft } = await draftRun(),
      c = compile(draft).candidate;
    const facts = c.bundle.facts;
    expect(facts).toHaveLength(4);
    expect(facts.filter((f) => f.field === "requirement")).toHaveLength(3);
    expect(facts[2]?.value.value).toBe(
      "You may use a diagram.\nif useful\nexcept when confidential"
    );
    expect(facts[2]?.semanticClause?.modality).toBe("may");
    expect(facts[3]?.value.state).toBe("UNCERTAIN");
    const review = directReviewItems(c, course.courseId, "isolated", now);
    expect(JSON.stringify(review)).toContain("The practice could count toward participation");
    expect(review[0]?.payload.issueEvidenceIds).toEqual(
      (review[0]?.payload.evidence as Array<{ evidenceId: string }>).map((e) => e.evidenceId)
    );
  });
  it("rejects lost clauses, alias rewrites, duplicates and unsupported promotion to KNOWN", async () => {
    const { draft } = await draftRun(),
      raw = link(draft.clauses);
    expect(() => validateLinks({ ...raw, links: raw.links.slice(0, -1) }, draft.clauses)).toThrow(
      "LINK_MISSING"
    );
    expect(() =>
      validateLinks({ ...raw, links: [...raw.links, raw.links[0]] }, draft.clauses)
    ).toThrow("LINK_COVERAGE");
    expect(() =>
      validateLinks(
        {
          ...raw,
          links: raw.links.map((l, i) => (i === 1 ? { ...l, content: "Submission heading" } : l))
        },
        draft.clauses
      )
    ).toThrow("LINK_REWRITE");
    expect(() =>
      validateLinks(
        {
          ...raw,
          links: raw.links.map((l, i) =>
            i === 3 ? { ...l, disposition: "CURRENT", state: "KNOWN" } : l
          )
        },
        draft.clauses
      )
    ).toThrow("UNRESOLVED_PROMOTED");
  });
  it("does not invalidate unchanged readings when fetch clocks move; reads only changed source content", async () => {
    const first = await draftRun([source("s"), source("t")]);
    const before = first.calls.length;
    const refreshed = [source("s"), { ...source("t"), updatedAt: "2027-01-01T00:00:00Z" }];
    expect(semanticSourceVersion(refreshed[1] as SourceRecord)).toBe(
      semanticSourceVersion(source("t"))
    );
    const second = await runSelectiveCourse({ course, sources: refreshed }, first.p);
    expect(second.clauses).toEqual(first.draft.clauses);
    expect(first.calls.slice(before).map((c) => c.promptVersion)).toEqual([
      "selective-draft/1:link"
    ]);
    const t = refreshed[1] as SourceRecord;
    required(required(required(t.parsed).units)[1]).text += " Submit a second reflection.";
    const again = first.calls.length;
    await runSelectiveCourse({ course, sources: refreshed }, first.p);
    const freshCalls = first.calls.slice(again);
    expect(freshCalls.map((c) => c.promptVersion)).toEqual([
      "selective-draft/1:inspect",
      "selective-draft/1:read",
      "selective-draft/1:link"
    ]);
    expect(
      (
        JSON.parse(required(freshCalls[0]).user) as { sources: Array<{ sourceId: string }> }
      ).sources.map((s) => s.sourceId)
    ).toEqual(["t"]);
    expect(
      (JSON.parse(required(freshCalls[0]).user) as { inventory: unknown[] }).inventory
    ).toHaveLength(2);
  });
  it("retains carry during whole-unit expansion and stops a no-progress read loop", async () => {
    let deep = 0;
    const adapter = port((call, input) => {
      if (call.promptVersion.endsWith(":inspect"))
        return {
          schema,
          decisions: [{ sourceId: "s", depth: "DEEP", locators: ["page:1"], reason: "Context" }]
        };
      if (call.promptVersion.endsWith(":read")) {
        deep++;
        if (deep === 2)
          expect((input.previousClauses as Clause[])[0]?.content).toBe("First independent action");
        return {
          schema,
          notes: [
            {
              sourceId: "s",
              clauses: [
                rawClause(deep === 1 ? "First independent action" : "Second independent action")
              ]
            }
          ],
          reads:
            deep === 1
              ? [{ sourceId: "s", locators: ["page:2"], reason: "Continue full slide" }]
              : []
        };
      }
      return link(input.clauses as Clause[]);
    });
    expect(
      (await runSelectiveCourse({ course, sources: [source()] }, adapter.p)).clauses.map(
        (c) => c.content
      )
    ).toEqual(["First independent action", "Second independent action"]);
    const stuck = port((call) =>
      call.promptVersion.endsWith(":inspect")
        ? {
            schema,
            decisions: [{ sourceId: "s", depth: "DEEP", locators: ["page:1"], reason: "Context" }]
          }
        : {
            schema,
            notes: [{ sourceId: "s", clauses: [], noneReason: "No task" }],
            reads: [{ sourceId: "s", locators: ["page:1"], reason: "Repeat" }]
          }
    );
    await expect(runSelectiveCourse({ course, sources: [source()] }, stuck.p)).rejects.toThrow(
      "READ_NO_PROGRESS"
    );
  });
  it("preserves supported KNOWN clauses when an empty conflict list is omitted and reads echo delivered units", async () => {
    const run = (state: "KNOWN" | "UNCERTAIN") => {
      const adapter = port((call, input) => {
        if (call.promptVersion.endsWith(":inspect"))
          return {
            decisions: [{ sourceId: "s", depth: "DEEP", locators: ["page:2"], reason: "Upload" }]
          };
        if (call.promptVersion.endsWith(":read")) {
          const clause = rawClause("You may use a diagram.", {
            state,
            modality: "may",
            conditions: ["if useful"],
            exceptions: ["except when confidential"]
          });
          delete (clause as Record<string, unknown>).competingValues;
          return {
            notes: [{ sourceId: "s", clauses: [clause] }],
            reads: [{ sourceId: "s", locators: ["page:2"], reason: "Read page" }]
          };
        }
        return link(input.clauses as Clause[]);
      });
      return { adapter, result: runSelectiveCourse({ course, sources: [source()] }, adapter.p) };
    };
    const known = run("KNOWN");
    const draft = await known.result;
    expect(known.adapter.calls).toHaveLength(3);
    expect(draft.clauses[0]).toMatchObject({
      content: "You may use a diagram.",
      modality: "may",
      conditions: ["if useful"],
      exceptions: ["except when confidential"],
      value: { state: "KNOWN", competingValues: [] }
    });
    await expect(run("UNCERTAIN").result).rejects.toThrow("ARRAY");
  });
  it("asks the model once to correct contradictory state metadata without rewriting independent meaning", async () => {
    const run = (rewrite: boolean) => {
      const adapter = port((call, input) => {
        if (call.promptVersion.endsWith(":inspect"))
          return {
            decisions: [{ sourceId: "s", depth: "DEEP", locators: ["page:2"], reason: "Upload" }]
          };
        if (input.correction) {
          return {
            patches: [
              {
                sourceId: "s",
                clauseIndex: 0,
                state: "UNCERTAIN",
                ...(rewrite ? { content: "Only a topic heading" } : {})
              }
            ]
          };
        }
        if (call.promptVersion.endsWith(":read"))
          return {
            notes: [
              {
                sourceId: "s",
                clauses: [
                  rawClause("You may use a diagram.", {
                    competingValues: ["The source also restricts diagrams"],
                    modality: "may",
                    conditions: ["if useful"],
                    exceptions: ["except when confidential"]
                  })
                ]
              }
            ],
            reads: []
          };
        return link(input.clauses as Clause[]);
      });
      return { adapter, result: runSelectiveCourse({ course, sources: [source()] }, adapter.p) };
    };
    const valid = run(false);
    expect((await valid.result).clauses[0]).toMatchObject({
      content: "You may use a diagram.",
      modality: "may",
      conditions: ["if useful"],
      exceptions: ["except when confidential"],
      value: { state: "UNCERTAIN", competingValues: ["The source also restricts diagrams"] }
    });
    expect(valid.adapter.calls).toHaveLength(4);
    expect(valid.adapter.calls.find((c) => c.promptVersion.endsWith(":read"))?.maxTokens).toBe(
      384000
    );
    expect(valid.adapter.calls.find((c) => c.promptVersion.endsWith(":correct"))?.maxTokens).toBe(
      384000
    );
    await expect(run(true).result).rejects.toThrow("CORRECTION_REWRITE");
  });
  it("lets the model reclassify an instruction mislabeled as a KNOWN scalar without inventing its value", async () => {
    const adapter = port((call, input) => {
      if (call.promptVersion.endsWith(":inspect"))
        return {
          decisions: [{ sourceId: "s", depth: "DEEP", locators: ["page:2"], reason: "Upload" }]
        };
      if (input.correction) {
        return { patches: [{ sourceId: "s", clauseIndex: 0, kind: "requirement" }] };
      }
      if (call.promptVersion.endsWith(":read"))
        return {
          notes: [
            {
              sourceId: "s",
              clauses: [rawClause("Sign the declaration.", { kind: "field", field: "signature" })]
            }
          ],
          reads: []
        };
      return link(input.clauses as Clause[]);
    });
    const result = await runSelectiveCourse({ course, sources: [source()] }, adapter.p);
    expect(result.clauses[0]).toMatchObject({
      kind: "requirement",
      content: "Sign the declaration.",
      value: { state: "KNOWN", value: "Sign the declaration." }
    });
    expect(result.clauses[0]?.field).toBeUndefined();
    expect(adapter.calls).toHaveLength(4);
  });
  it("preserves an explicitly typed prohibition through the existing requirement projection", async () => {
    const adapter = port((call, input) => {
      if (call.promptVersion.endsWith(":inspect"))
        return {
          decisions: [{ sourceId: "s", depth: "DEEP", locators: ["page:2"], reason: "Submission" }]
        };
      if (call.promptVersion.endsWith(":read"))
        return {
          notes: [
            {
              sourceId: "s",
              clauses: [
                rawClause("No email submission.", { kind: "prohibition", modality: "prohibition" })
              ]
            }
          ],
          reads: []
        };
      return link(input.clauses as Clause[]);
    });
    const draft = await runSelectiveCourse({ course, sources: [source()] }, adapter.p);
    expect(draft.clauses[0]?.kind).toBe("prohibition");
    const fact = compile(draft).candidate.bundle.facts[0];
    expect(fact).toMatchObject({
      field: "requirement",
      value: { state: "KNOWN", value: "No email submission." },
      semanticClause: { content: "No email submission.", modality: "prohibition" }
    });
  });
  it("keeps authored current values and local user provenance across comparison and Human acceptance", async () => {
    const { draft } = await draftRun(),
      c = compile(draft).candidate,
      next = {
        ...required(c.bundle.facts[1]),
        field: "weight",
        value: { state: "KNOWN" as const, value: "40%" }
      };
    const old = {
      ...next,
      factId: "local-edited",
      value: { state: "KNOWN" as const, value: "41%" },
      userEdited: true
    };
    const adapter = port(() => ({
      schema,
      changes: [
        {
          changeType: "CHANGED",
          currentFactRef: old.factId,
          latestFactRef: next.factId,
          judgmentBasis: "Source differs from user edit"
        }
      ]
    }));
    const result = await compareCourseDraft(
      [old],
      [next],
      c.bundle.evidence,
      [source()],
      draft,
      adapter.p
    );
    expect(result.changeResults[0]?.currentValue?.value).toBe("41%");
    expect(result.changeResults[0]?.currentEvidence).toEqual([]);
    const context = {
      course,
      workflowId: "isolated",
      sources: new Map([["s", { sourceId: "s", title: "Synthetic" }]]),
      exclusionKeys: new Set<string>(),
      now
    };
    const m = materializeTaskC(
      result,
      context,
      new Map([[required(old.assessmentId), required(old.assessmentId)]]),
      {
        scopeComplete: true,
        partialCoverage: false,
        permissionDenied: false,
        failedSourceIds: [],
        checkedSourceIds: ["s"],
        succeededSourceIds: ["s"],
        missingAfterCoverageSourceIds: []
      }
    );
    const accepted = acceptChange(
      makeSnapshot({ course, assessments: c.assessments, facts: [old], changes: m.changes }),
      {
        changeId: required(m.changes[0]).changeId,
        expectedRevision: 0,
        now,
        evidenceRefs: next.evidenceRefs
      }
    );
    expect(accepted.snapshot.facts[0]?.semanticClause).toEqual(next.semanticClause);
    expect(accepted.snapshot.facts[0]?.value.value).toBe("40%");
    const rewrite = port(() => ({
      schema,
      changes: [
        {
          changeType: "CHANGED",
          currentFactRef: old.factId,
          latestFactRef: next.factId,
          currentValue: { state: "KNOWN", value: "40%" },
          judgmentBasis: "Echo"
        }
      ]
    }));
    await expect(
      compareCourseDraft([old], [next], c.bundle.evidence, [source()], draft, rewrite.p)
    ).rejects.toThrow("COMPARE_REWRITE");
  });
  it("repairs only invalid comparison references through AI and rejects a stalled phantom current fact", async () => {
    const { draft } = await draftRun();
    const candidate = compile(draft).candidate;
    const latest = [
      required(candidate.bundle.facts[0]),
      required(candidate.bundle.facts[1])
    ] as const;
    const valid = {
      changeType: "NEW",
      latestFactRef: latest[1].factId,
      judgmentBasis: "Independent new fact"
    };
    const invalid = {
      changeType: "NO_MEANINGFUL_CHANGE",
      currentFactRef: latest[0].factId,
      latestFactRef: latest[0].factId,
      judgmentBasis: "Invented existing reference"
    };
    for (const stall of [false, true]) {
      let calls = 0;
      const adapter = port((call, input) => {
        calls++;
        if (!call.promptVersion.endsWith(":compare-reference-patch"))
          return { changes: [invalid, valid] };
        expect(call.task).toBe("task-c");
        expect(input.invalidComparisons).toEqual([{ rowIndex: 0, comparison: invalid }]);
        expect(input.retainedComparisons).toEqual([valid]);
        return {
          repairs: [
            {
              rowIndex: 0,
              comparison: stall
                ? invalid
                : {
                    changeType: "NEW",
                    latestFactRef: latest[0].factId,
                    judgmentBasis: "No authoritative existing current fact"
                  }
            }
          ]
        };
      });
      const pending = compareCourseDraft(
        [],
        [...latest],
        candidate.bundle.evidence,
        [source()],
        draft,
        adapter.p
      );
      if (stall) await expect(pending).rejects.toThrow("COMPARE_REFERENCE_REPAIR_STALLED");
      else {
        const result = await pending;
        expect(result.changeResults).toHaveLength(2);
        expect(result.changeResults.every((c) => c.currentValue === undefined)).toBe(true);
      }
      expect(calls).toBe(2);
    }
  });
  it("reuses byte-identical meanings and Evidence locally while sending changed qualifiers and user values to comparison", async () => {
    const { draft } = await draftRun(),
      candidate = compile(draft).candidate,
      current = candidate.bundle.facts;
    const adapter = port((_call, input) => {
      const olds = input.currentFacts as typeof current,
        next = input.latestFacts as typeof current;
      expect(olds).toHaveLength(1);
      expect(next).toHaveLength(1);
      expect(olds[0]).not.toHaveProperty("updatedAt");
      expect(next[0]).not.toHaveProperty("updatedAt");
      return {
        changes: [
          {
            changeType: "CHANGED",
            currentFactRef: olds[0]?.factId,
            latestFactRef: next[0]?.factId,
            judgmentBasis: "Changed exception remains independent meaning"
          }
        ]
      };
    });
    const same = current.map((f) => ({ ...f, updatedAt: "2026-10-11T00:00:00.000Z" }));
    const unchanged = await compareCourseDraft(
      current,
      same,
      candidate.bundle.evidence,
      [source()],
      draft,
      adapter.p
    );
    expect(adapter.calls).toHaveLength(0);
    expect(unchanged.changeResults).toHaveLength(current.length);
    const changed = structuredClone(same);
    required(required(changed[1]).semanticClause).exceptions.push("except new restricted material");
    const result = await compareCourseDraft(
      current,
      changed,
      candidate.bundle.evidence,
      [source()],
      draft,
      adapter.p
    );
    expect(adapter.calls).toHaveLength(1);
    expect(
      result.changeResults.filter((c) => c.changeType !== "NO_MEANINGFUL_CHANGE")
    ).toHaveLength(1);
  });
  it("retains independent witness evidence without reusing a proposal value or consuming it twice", async () => {
    const { draft } = await draftRun(),
      candidate = compile(draft).candidate;
    const old = {
      ...required(candidate.bundle.facts[0]),
      factId: "old-withdrawn",
      value: { state: "KNOWN" as const, value: "Old registration" }
    };
    const next = { ...required(candidate.bundle.facts[1]), factId: "withdrawal-support" };
    const adapter = port(() => ({
      changes: [
        {
          changeType: "CONFLICT",
          currentFactRef: old.factId,
          witnessFactRefs: [next.factId],
          judgmentBasis: "New source contradicts old registration, without a replacement scalar"
        },
        {
          changeType: "CHANGED",
          latestFactRef: next.factId,
          judgmentBasis: "New separate withdrawal instruction"
        }
      ]
    }));
    const result = await compareCourseDraft(
      [old],
      [next],
      candidate.bundle.evidence,
      [source()],
      draft,
      adapter.p
    );
    expect(result.changeResults[0]?.newEvidence).toHaveLength(1);
    expect(result.changeResults[0]?.latestValue).toBeUndefined();
    expect(result.changeResults[0]?.proposedFact).toBeUndefined();
    expect(result.changeResults[1]?.proposedFact?.factId).toBe(next.factId);
    for (const witnessFactRefs of [[], ["invented"]]) {
      const invalid = port(() => ({
        changes: [
          {
            changeType: "CONFLICT",
            currentFactRef: old.factId,
            witnessFactRefs,
            judgmentBasis: "Unsupported"
          },
          { changeType: "CHANGED", latestFactRef: next.factId, judgmentBasis: "Instruction" }
        ]
      }));
      await expect(
        compareCourseDraft([old], [next], candidate.bundle.evidence, [source()], draft, invalid.p)
      ).rejects.toThrow(
        witnessFactRefs.length ? "COMPARE_WITNESS_REFERENCE" : "COMPARE_WITNESS_MISSING"
      );
    }
  });
  it("requires every fact accounted for and blocks absence claims from preview-only/visual units", async () => {
    const { draft } = await draftRun(),
      c = compile(draft).candidate,
      old = required(c.bundle.facts[1]);
    const missing = port(() => ({ schema, changes: [] }));
    await expect(
      compareCourseDraft([old], [], c.bundle.evidence, [source()], draft, missing.p)
    ).rejects.toThrow("COMPARE_MISSING");
    const remove = port(() => ({
      schema,
      changes: [
        { changeType: "POSSIBLY_REMOVED", currentFactRef: old.factId, judgmentBasis: "Not found" }
      ]
    }));
    await expect(
      compareCourseDraft(
        [old],
        [],
        c.bundle.evidence,
        [source()],
        draft,
        remove.p,
        undefined,
        undefined,
        {
          scopeComplete: true,
          partialCoverage: false,
          permissionDenied: false,
          failedSourceIds: [],
          checkedSourceIds: ["s"],
          succeededSourceIds: ["s"],
          missingAfterCoverageSourceIds: []
        }
      )
    ).rejects.toThrow("REMOVAL_UNREAD");
  });
});

function required<T>(value: T | undefined | null): T {
  if (value == null) throw Error("SYNTHETIC_EXPECTED_VALUE_MISSING");
  return value;
}

describe("source-grounded entity hierarchy correction", () => {
  it.each([
    { label: "Portfolio", role: "assessment", parentRef: null },
    { label: "Laboratory practical", role: "component", parentRef: "assessment-set" }
  ])(
    "lets AI choose the $label hierarchy without local flattening or forced attachment",
    async ({ label, role, parentRef }) => {
      const { draft } = await draftRun();
      const original = {
        entities: [
          {
            ref: "assessment-set",
            name: "Course assessment set",
            role: "series",
            type: "other",
            aliases: [],
            clauseRefs: [required(draft.clauses[0]).clauseId]
          },
          {
            ref: "activity",
            name: label,
            role: "assessment",
            parentRef: "assessment-set",
            type: "assignment",
            aliases: [],
            clauseRefs: [required(draft.clauses[1]).clauseId]
          }
        ],
        links: draft.links,
        identities: draft.identities
      };
      const before = structuredClone(original);
      const adapter = port((call, input) => {
        expect(call.promptVersion).toContain("entity-parent-patch");
        expect(input.metadataViolations).toHaveLength(1);
        expect(input.nativePassages).not.toEqual([]);
        return { entityParentRepairs: [{ entityRef: "activity", role, parentRef }] };
      });
      const result = await repairCourseEntityParents(
        original,
        draft.clauses,
        [source()],
        adapter.p
      );
      const expectedActivity = { ...required(before.entities[1]), role };
      if (parentRef === null) delete expectedActivity.parentRef;
      else expectedActivity.parentRef = parentRef;
      expect(result.entities).toEqual([required(before.entities[0]), expectedActivity]);
      expect(result.links).toEqual(before.links);
      expect(result.identities).toEqual(before.identities);
      expect(original).toEqual(before);
      expect(adapter.calls).toHaveLength(1);
      expect(
        await repairCourseEntityParents(original, draft.clauses, [source()], adapter.p)
      ).toEqual(result);
      expect(adapter.calls).toHaveLength(1);
      const altered = structuredClone(draft.clauses);
      required(altered[0]).context = "An independently changed source context";
      await repairCourseEntityParents(original, altered, [source()], adapter.p);
      expect(adapter.calls).toHaveLength(2);
      const noChange = port(() => {
        throw Error("VALID_PARENT_MUST_NOT_REDISPATCH");
      });
      expect(
        await repairCourseEntityParents(result, draft.clauses, [source()], noChange.p)
      ).toEqual(result);
      expect(noChange.calls).toHaveLength(0);
      const stalled = port(() => ({
        entityParentRepairs: [
          { entityRef: "activity", role: "assessment", parentRef: "assessment-set" }
        ]
      }));
      await expect(
        repairCourseEntityParents(original, draft.clauses, [source()], stalled.p)
      ).rejects.toThrow("ENTITY_PARENT_REPAIR_STALLED");
      const outside = port(() => ({
        entityParentRepairs: [
          { entityRef: "assessment-set", role: "component", parentRef: "activity" }
        ]
      }));
      await expect(
        repairCourseEntityParents(original, draft.clauses, [source()], outside.p)
      ).rejects.toThrow("ENTITY_PARENT_PATCH_SCOPE");
    }
  );
});

it("recovers only an audit-selected native unit with no repeat inspection or loss of existing clauses", async () => {
  const sources = [source()];
  const unit = sources[0]?.parsed?.units?.[0];
  if (!unit) throw Error("SYNTHETIC_UNIT_MISSING");
  unit.text = "Ordinary methods. Upload a short memo before next class.";
  const baseline = await draftRun(sources, true);
  const original = structuredClone(baseline.draft);
  const adapter = port((call, input) => {
    if (call.promptVersion.endsWith(":read"))
      return {
        schema,
        notes: [{ sourceId: "s", clauses: [rawClause("Upload a short memo before next class.")] }],
        reads: []
      };
    if (call.promptVersion.endsWith(":link-patch")) {
      const added = (input.clauses as Clause[]).filter(
        (c) => !original.clauses.some((old) => old.clauseId === c.clauseId)
      );
      return {
        schema,
        patch: {
          entities: [
            {
              ref: "memo",
              name: "Memo",
              type: "assignment",
              role: "assessment",
              aliases: [],
              clauseRefs: added.map((c) => c.clauseId)
            }
          ],
          links: added.map((c) => ({
            clauseRef: c.clauseId,
            ownerRef: "memo",
            disposition: "CURRENT",
            state: "KNOWN",
            competingClauseRefs: [],
            resolutionClauseRefs: [],
            basis: "Authored upload instruction"
          })),
          identities: []
        },
        reads: []
      };
    }
    throw Error("RECOVERY_MUST_NOT_RESTART_INSPECTION_OR_OTHER_READS");
  });
  const riskReads = [
    {
      sourceId: "s",
      locators: ["page:1"],
      scope: "native-risk-anchor",
      reason: "Independent upload instruction omitted"
    }
  ];
  const recovered = await runSelectiveCourse(
    { course, sources, previous: baseline.draft, completeScreening: true, riskReads },
    adapter.p
  );
  expect(adapter.calls.filter((c) => c.promptVersion.endsWith(":read"))).toHaveLength(1);
  const read = JSON.parse(adapter.calls[0]?.user ?? "{}") as {
    sources: Array<{ nativeContent: Array<{ locator: string }> }>;
  };
  expect(read.sources[0]?.nativeContent.map((u) => u.locator)).toEqual(["page:1"]);
  for (const clause of original.clauses)
    expect(recovered.clauses.find((c) => c.clauseId === clause.clauseId)).toEqual(clause);
  expect(recovered.entities.map((e) => e.ref)).toEqual(
    expect.arrayContaining(["reflection", "memo"])
  );
  expect(recovered.deepLocators.s).toEqual(expect.arrayContaining(["page:1", "page:2"]));
  const count = adapter.calls.filter((c) => c.promptVersion.endsWith(":read")).length;
  await runSelectiveCourse(
    { course, sources, previous: baseline.draft, completeScreening: true, riskReads },
    adapter.p
  );
  expect(adapter.calls.filter((c) => c.promptVersion.endsWith(":read")).length).toBe(count);
  await expect(
    runSelectiveCourse(
      {
        course,
        sources,
        previous: baseline.draft,
        completeScreening: true,
        riskReads: [
          {
            ...riskReads[0],
            sourceId: "s",
            locators: ["not-supplied"],
            scope: "invalid",
            reason: "invalid"
          }
        ]
      },
      adapter.p
    )
  ).rejects.toThrow("RISK_READ_LOCATOR_SCOPE");
  expect(baseline.draft).toEqual(original);
});
