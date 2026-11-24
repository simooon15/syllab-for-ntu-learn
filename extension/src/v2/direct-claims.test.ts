import { it, expect } from "vitest";
import { decodeDirectClaims, validateInlineClaimAudit } from "./direct-claims";
const claims = [
  {
    claimId: "c1",
    content:
      "Describe the selected project briefly; highlight constraints, excluding optional appendices."
  }
];
const wire = () => ({
  contentEncoding: "upstream-claim/1",
  output: {
    canonicalAssessmentProposals: [
      { requirements: [{ requirementId: "r", contentRef: "c1", evidence: ["n1.1.1"] }] }
    ]
  }
});
it("copies every selected action and exception exactly without mutating the saved model response", () => {
  const raw = wire();
  expect(decodeDirectClaims(raw, claims, true)).toEqual({
    canonicalAssessmentProposals: [
      { requirements: [{ requirementId: "r", content: claims[0]?.content, evidence: ["n1.1.1"] }] }
    ]
  });
  expect(raw.output.canonicalAssessmentProposals[0]?.requirements[0]?.contentRef).toBe("c1");
});
it("rejects unknown, conflicting and misplaced references instead of manufacturing missing clauses", () => {
  expect(() => decodeDirectClaims(wire(), [], true)).toThrow("DIRECT_CLAIM_REF");
  expect(() => decodeDirectClaims(wire(), claims, false)).toThrow("DIRECT_CLAIM_REF");
  expect(() => decodeDirectClaims({ ...wire(), contentEncoding: "other" }, claims, true)).toThrow(
    "DIRECT_CLAIM_REF"
  );
  expect(() =>
    decodeDirectClaims({ ...wire(), output: { contentRef: "c1" } }, claims, true)
  ).toThrow("DIRECT_CLAIM_REF");
  expect(() =>
    decodeDirectClaims(
      {
        ...wire(),
        output: {
          courseWideConstraintProposals: [{ contentRef: "c1", normalizedRuleContent: "edited" }]
        }
      },
      claims,
      true
    )
  ).toThrow("DIRECT_CLAIM_REF");
});
it("supports explicitly selected Rule content while leaving unselected ordinary clauses unchanged", () => {
  expect(
    decodeDirectClaims(
      {
        ...wire(),
        output: {
          courseWideConstraintProposals: [
            { contentRef: "c1" },
            { normalizedRuleContent: "Source-authored new clause" }
          ]
        }
      },
      claims,
      true
    )
  ).toEqual({
    courseWideConstraintProposals: [
      { normalizedRuleContent: claims[0]?.content },
      { normalizedRuleContent: "Source-authored new clause" }
    ]
  });
});
it("refuses to render an upstream field audit as a student requirement", () => {
  expect(() =>
    decodeDirectClaims(
      wire(),
      [{ claimId: "c1", content: "field; state KNOWN; value 25", kind: "field" }],
      true
    )
  ).toThrow("DIRECT_CLAIM_REF");
});

it("requires every inline clause exactly once and rejects forged, omitted or duplicated accounting", () => {
  const value = {
    claimAuditEncoding: "inline/1",
    unmappedClaims: [],
    output: {
      canonicalAssessmentProposals: [
        { requirements: [{ contentRef: "c1", reconciledClaimIds: ["c1", "c2"] }] }
      ],
      courseWideConstraintProposals: [],
      unresolvedIssues: []
    }
  };
  const audit = [{ claimId: "c1" }, { claimId: "c2" }];
  expect(() => validateInlineClaimAudit(value, audit, [])).not.toThrow();
  expect(() => validateInlineClaimAudit(value, [...audit, { claimId: "missing" }], [])).toThrow(
    "COVERAGE"
  );
  expect(() => validateInlineClaimAudit(value, [{ claimId: "c1" }], [])).toThrow("CLAIM_ID");
  expect(() =>
    validateInlineClaimAudit(
      {
        ...value,
        unmappedClaims: [
          {
            claimId: "c1",
            disposition: "UNRESOLVED",
            reason: "Unknown",
            evidence: ["bad"],
            outputRefs: []
          }
        ]
      },
      audit,
      []
    )
  ).toThrow();
});
it("preserves exact selected field tables and blocks silent clause summaries under the final policy", () => {
  const descriptor = {
    fieldName: "presentation_slots",
    state: "KNOWN",
    value: ["G1 09:00-09:20", "G2 09:20-09:40"],
    competingValues: [],
    evidence: ["n1.1.1"]
  };
  const value = {
    contentEncoding: "upstream-claim/1",
    output: {
      canonicalAssessmentProposals: [
        {
          consolidatedFields: [{ fieldRef: "slots", reconciledClaimIds: ["slots"] }],
          requirements: [{ contentRef: "c1", reconciledClaimIds: ["c1"] }]
        }
      ],
      courseWideConstraintProposals: []
    }
  };
  const selected = [
    ...claims,
    { claimId: "slots", content: "Slots", kind: "field" as const, fieldDescriptor: descriptor }
  ];
  expect(JSON.stringify(decodeDirectClaims(value, selected, true, true))).toContain(
    '"value":["G1 09:00-09:20","G2 09:20-09:40"]'
  );
  expect(() =>
    decodeDirectClaims(
      {
        ...wire(),
        output: {
          canonicalAssessmentProposals: [
            { requirements: [{ content: "Topic summary", reconciledClaimIds: ["c1"] }] }
          ]
        }
      },
      selected,
      true,
      true
    )
  ).toThrow("CLAUSE_SELECTION_REQUIRED");
  expect(() =>
    decodeDirectClaims(
      {
        ...wire(),
        output: {
          canonicalAssessmentProposals: [
            {
              requirements: [
                {
                  content: "New native clause",
                  reconciledClaimIds: [],
                  newClauseReason: "Source-authored clause newly discovered"
                }
              ]
            }
          ]
        }
      },
      selected,
      true,
      true
    )
  ).not.toThrow();
});

it("refuses a heading that falsely claims fuller clauses and decodes only explicit plural selections", () => {
  const all = [
    { claimId: "heading", content: "Schedule management", kind: "requirement" as const },
    {
      claimId: "actions",
      content:
        "Present the Gantt chart with tasks, durations and dependencies; identify milestones and their significance.",
      kind: "requirement" as const
    }
  ];
  const node = {
    requirementId: "r",
    contentRef: "heading",
    reconciledClaimIds: ["heading", "actions"]
  };
  const raw = {
    contentEncoding: "upstream-claim/1",
    output: { canonicalAssessmentProposals: [{ requirements: [node] }] }
  };
  expect(() => decodeDirectClaims(raw, all, true, true)).toThrow("CLAUSE_ALIAS_LOSS");
  const plural = {
    ...raw,
    output: {
      canonicalAssessmentProposals: [
        {
          requirements: [
            {
              requirementId: "r",
              contentRefs: ["heading", "actions"],
              reconciledClaimIds: ["heading", "actions"]
            }
          ]
        }
      ]
    }
  };
  expect(JSON.stringify(decodeDirectClaims(plural, all, true, true))).toContain(
    "tasks, durations and dependencies"
  );
  expect(plural.output.canonicalAssessmentProposals[0]?.requirements[0]?.contentRefs).toEqual([
    "heading",
    "actions"
  ]);
});
