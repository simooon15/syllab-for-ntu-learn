import { describe, it, expect } from "vitest";
import {
  checkpointTaskB,
  evidenceRegistry,
  GROUNDED_B_SCHEMA,
  resolveBRefs,
  mergeBCheckpoints
} from "./task-b-grounding";
const evidence = [
  {
    evidenceId: "original",
    sourceId: "s",
    locator: "page:1",
    excerpt: "Synthetic quoted requirement."
  }
];
const ref = [...evidenceRegistry(evidence).keys()][0] as string;
const proposal = (id: string, refs = [ref], dependencies: string[] = []) => ({
  itemId: id,
  category: "canonicalAssessmentProposals",
  inputRefs: ["draft"],
  dependencies,
  payload: {
    proposalId: id,
    canonicalName: "Synthetic assessment",
    type: "other",
    role: "assessment",
    aliases: [],
    consolidatedFields: [],
    requirements: [],
    supportingEvidence: refs,
    unresolvedIssues: []
  }
});
const check = (items: unknown[]) =>
  checkpointTaskB(
    { schema: GROUNDED_B_SCHEMA, items },
    evidence,
    new Set(["s"]),
    new Set(["draft"]),
    "2026-10-06T00:00:00Z"
  );
describe("grounded Task B item contract", () => {
  it("rejects cyclic groups and their dependents in either order without blocking independent siblings", () => {
    for (const reverse of [false, true]) {
      const group = [
        proposal("dependent", [ref], ["a"]),
        proposal("a", [ref], ["b"]),
        proposal("b", [ref], ["a"])
      ];
      const c = check([...(reverse ? group.reverse() : group), proposal("independent")]);
      expect(c.result.canonicalAssessmentProposals).toHaveLength(1);
      expect(c.items.find((i) => i.itemId === "independent")?.status).toBe("verified");
      expect(
        c.items.filter((i) => i.itemId !== "independent").every((i) => i.status === "unresolved")
      ).toBe(true);
    }
  });
  it("preserves uncertain fields with missing optional value and rejects invented field states", () => {
    const p = proposal("uncertain");
    const field = { fieldName: "due", state: "UNCERTAIN", competingValues: [], evidence: [ref] };
    expect(
      check([{ ...p, payload: { ...p.payload, consolidatedFields: [field] } }]).items[0]?.status
    ).toBe("verified");
    expect(
      check([
        { ...p, payload: { ...p.payload, consolidatedFields: [{ ...field, state: "CONFLICT" }] } }
      ]).items[0]?.error
    ).toBe("B_FIELD_SHAPE");
  });
  it("retains immutable verified checkpoints across expansion and records conflicting revisions", () => {
    const previous = check([proposal("good")]);
    const next = check([proposal("other")]);
    expect(mergeBCheckpoints(previous, next).result.canonicalAssessmentProposals).toHaveLength(2);
    const changed = {
      ...proposal("good"),
      payload: { ...proposal("good").payload, canonicalName: "Different synthetic name" }
    };
    const conflict = mergeBCheckpoints(previous, check([changed]));
    expect(conflict.status).toBe("partial");
    expect(conflict.items.some((i) => i.error === "B_VERIFIED_CHECKPOINT_REVISION_CONFLICT")).toBe(
      true
    );
  });
  it("reverses registered refs exactly without generating excerpts or semantic replacements", () => {
    expect(resolveBRefs({ evidence: [ref] }, evidenceRegistry(evidence))).toEqual({ evidence });
    expect([...evidenceRegistry([...evidence, ...evidence])]).toHaveLength(1);
    expect(check([proposal("one")]).items[0]?.status).toBe("verified");
  });
  it("keeps independent verified siblings while retaining unknown-ref failures", () => {
    const c = check([proposal("bad", ["invented"]), proposal("good")]);
    expect(c.status).toBe("partial");
    expect(c.result.canonicalAssessmentProposals).toHaveLength(1);
    expect(c.items[0]?.error).toBe("B_UNKNOWN_EVIDENCE_REF");
  });
  it("propagates dependency failure without discarding independent groups", () => {
    const c = check([
      proposal("bad", ["invented"]),
      proposal("dependent", [ref], ["bad"]),
      proposal("good")
    ]);
    expect(c.items.map((i) => i.status)).toEqual(["unresolved", "unresolved", "verified"]);
  });
  it("rejects missing input identities, cyclic and duplicate item identities", () => {
    expect(check([{ ...proposal("missing"), inputRefs: ["unknown"] }]).items[0]?.error).toBe(
      "B_ITEM_INPUT_UNKNOWN"
    );
    expect(
      check([proposal("a", [ref], ["b"]), proposal("b", [ref], ["a"])]).items.every(
        (i) => i.status === "unresolved"
      )
    ).toBe(true);
    expect(check([proposal("a"), proposal("a")]).result.canonicalAssessmentProposals).toHaveLength(
      0
    );
  });
  it("does not accept legacy invented IDs or missing shape and does not repair semantic fields", () => {
    expect(() => resolveBRefs({ evidence: [evidence[0]] }, evidenceRegistry(evidence))).toThrow(
      "B_UNKNOWN_EVIDENCE_REF"
    );
    const bad = {
      ...proposal("bad"),
      payload: {
        ...proposal("bad").payload,
        consolidatedFields: [
          { fieldName: "due", state: "KNOWN", value: "synthetic", competingValues: [] }
        ]
      }
    };
    expect(check([bad, proposal("good")]).items[0]?.error).toBe("B_FIELD_SHAPE");
    expect(check([]).status).toBe("partial");
  });
});
