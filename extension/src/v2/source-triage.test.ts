import { describe, expect, it } from "vitest";
import type { SourceRecord } from "./domain";
import {
  sourceProfile,
  coarseProfile,
  validateCoarse,
  COARSE_SCHEMA,
  profileFingerprint,
  reusableTriage,
  entersUnderstanding,
  triageBatches,
  validateTriage,
  TRIAGE_SCHEMA,
  TRIAGE_POLICY,
  TRIAGE_PROMPT,
  type TriageResult
} from "./source-triage";
const source = (id = "source-one"): SourceRecord => ({
  sourceId: id,
  courseId: "course",
  nativeItemId: id,
  title: "Lecture Assignment",
  kind: "attachment",
  updatedAt: "now",
  parsed: {
    text: "First sentence. Middle secret. Last sentence.",
    structure: [],
    units: [
      {
        locator: "page:1",
        text: "First sentence. Middle secret. Last sentence.",
        partial: true,
        visualGaps: ["unknown"]
      }
    ]
  }
});
function parsed(s: SourceRecord): NonNullable<SourceRecord["parsed"]> {
  if (!s.parsed) throw new Error("FIXTURE_PARSE_MISSING");
  return s.parsed;
}
const result = (
  classification: TriageResult["classification"] = "TEACHING_ONLY",
  confidence: TriageResult["confidence"] = "HIGH"
): TriageResult => ({
  sourceId: "source-one",
  classification,
  productRelevantEvidence: "ABSENT",
  profileCoverage: "SUFFICIENT",
  confidence,
  reasonCode: "ONLY_TEACHING",
  evidenceUsed: ["samples", "hierarchy"],
  rationale: "Consistent teaching-only evidence"
});
describe("AI Source Triage", () => {
  it("skips only the explicit three-field safe contract, independently of confidence", () => {
    for (const confidence of ["HIGH", "MODERATE", "LOW"] as const)
      expect(entersUnderstanding(result("TEACHING_ONLY", confidence))).toBe(false);
    for (const classification of ["PRODUCT_RELEVANT", "UNCERTAIN"] as const)
      expect(entersUnderstanding(result(classification))).toBe(true);
    for (const productRelevantEvidence of ["PRESENT", "UNCERTAIN"] as const)
      expect(entersUnderstanding({ ...result(), productRelevantEvidence })).toBe(true);
    expect(entersUnderstanding({ ...result(), profileCoverage: "INSUFFICIENT" })).toBe(true);
  });
  it("coarse never skips and rejects deep/skip output contracts", () => {
    const profile = sourceProfile(source(), [source()]);
    const projected = coarseProfile(profile);
    expect(projected).not.toHaveProperty("nativeOutline");
    expect(projected).not.toHaveProperty("surroundingSamples");
    for (const decision of ["PROCESS", "DEEP_TRIAGE_CANDIDATE"] as const) {
      const coarse = {
        sourceId: profile.sourceId,
        decision,
        reasonCode: "COARSE",
        evidenceUsed: ["samples"],
        rationale: "Need routing"
      };
      expect(entersUnderstanding(coarse)).toBe(true);
      expect(validateCoarse({ schema: COARSE_SCHEMA, results: [coarse] }, [profile])).toEqual([
        coarse
      ]);
    }
    expect(() =>
      validateCoarse(
        { schema: COARSE_SCHEMA, results: [{ ...result(), decision: "SAFE_TO_SKIP_TASK_A" }] },
        [profile]
      )
    ).toThrow();
  });
  it("prepares samples and provenance without deciding semantics or sending a file/image/full text", () => {
    const s = source(),
      p = sourceProfile(s, [s]);
    expect(p.samples[0]).toMatchObject({
      excerpts: ["First sentence.", "Last sentence."],
      omittedCharacters: 16
    });
    const call = triageBatches([p], "run")[0];
    expect(call?.visualParts).toBeUndefined();
    expect(call?.user).not.toContain("Middle secret");
    expect(call?.user).not.toContain('"classification"');
    expect(s.parsed?.text).toContain("Middle secret");
  });
  it("samples native Blackboard body fields instead of metadata wrappers and keeps structure omission explicit", () => {
    const s = source();
    delete parsed(s).units;
    parsed(s).structure = Array.from({ length: 716 }, (_, i) => `native structure ${String(i)}`);
    s.discovery = {
      sourceId: s.sourceId,
      courseId: s.courseId,
      scanId: "scan",
      nativeItemId: s.nativeItemId,
      kind: "announcement",
      title: s.title,
      discoveryPath: [],
      depth: 0,
      status: "discovered",
      rawText:
        "<p>Blackboard announcement metadata</p><p>body.displayText: &lt;p&gt;Please submit Friday.&lt;/p&gt;&lt;p&gt;Middle guidance.&lt;/p&gt;&lt;p&gt;Use the Assignment portal.&lt;/p&gt;</p>"
    };
    const p = sourceProfile(s, [s]);
    expect(p.samples[0]?.excerpts).toEqual(["Please submit Friday.", "Use the Assignment portal."]);
    expect(p.structureEntryCount).toBe(716);
    expect(p.structure).toEqual(["native structure 0", "native structure 715"]);
    expect(JSON.stringify(p)).not.toContain("Blackboard announcement metadata");
  });

  it("keeps every native page in the outline even when its full text is not a bookend sample", () => {
    const s = source();
    const native = parsed(s);
    native.units = [
      { locator: "page:1", text: "Introduction", partial: false },
      {
        locator: "page:2",
        text: "Assignment rules. Detailed middle body.",
        partial: true,
        textRanges: [{ start: 0, end: 16, x: 0, y: 0, width: 1, height: 1 }]
      },
      { locator: "page:3", text: "Discussion", partial: false }
    ];
    const profile = sourceProfile(s, [s]);
    expect(profile.nativeUnits).toBe(3);
    expect(profile.omittedSampleUnits).toBe(1);
    expect(profile.samples.map((sample) => sample.locator)).toEqual(["page:1", "page:3"]);
    expect(profile.nativeOutline).toEqual([{ locator: "page:2", text: "Assignment rules" }]);
    expect(JSON.stringify(profile)).not.toContain("Detailed middle body");
    expect(native.units).toHaveLength(3);
  });

  it("requires exact one result per supplied source and exact field references", () => {
    const p = sourceProfile(source(), [source()]);
    const validate = (results: unknown[]) =>
      validateTriage({ schema: TRIAGE_SCHEMA, results }, [p]);
    expect(validate([result()])).toEqual([result()]);
    expect(() => validate([])).toThrow("MISSING_SOURCE");
    expect(() => validate([result(), result()])).toThrow("DUPLICATE_SOURCE");
    expect(() => validate([{ ...result(), sourceId: "invented" }])).toThrow("UNKNOWN");
    expect(() => validate([{ ...result(), evidenceUsed: ["unsupplied"] }])).toThrow("CONTRACT");
    expect(() => validate([{ ...result(), confidence: 0.9 }])).toThrow("CONTRACT");
    expect(() => validate([{ ...result(), autoApply: true }])).toThrow("EXTRA");
  });
  it("invalidates cached classifications on content, policy, prompt and provenance changes", () => {
    const parent = source("parent"),
      s = source();
    s.parentSourceId = parent.sourceId;
    s.triage = {
      profileFingerprint: profileFingerprint(sourceProfile(s, [s, parent])),
      policyVersion: TRIAGE_POLICY,
      promptVersion: TRIAGE_PROMPT,
      result: result()
    };
    expect(reusableTriage(s, [s, parent])).toBe(true);
    parent.title = "Changed location meaning";
    expect(reusableTriage(s, [s, parent])).toBe(false);
    parent.title = "Lecture Assignment";
    parsed(s).text = "First sentence. New middle. Last sentence.";
    expect(reusableTriage(s, [s, parent])).toBe(false);
    parsed(s).text = parsed(source()).text;
    s.triage.policyVersion = "old";
    expect(reusableTriage(s, [s, parent])).toBe(false);
    s.triage.policyVersion = TRIAGE_POLICY;
    s.triage.promptVersion = "old";
    expect(reusableTriage(s, [s, parent])).toBe(false);
    s.triage.promptVersion = TRIAGE_PROMPT;
    s.triage.result.sourceId = "other";
    expect(reusableTriage(s, [s, parent])).toBe(false);
  });
  it("does not split a course by a guessed Source count", () => {
    const inventory = Array.from({ length: 117 }, (_, i) => source(`source-${String(i)}`));
    const calls = triageBatches(
      inventory.map((s) => sourceProfile(s, inventory)),
      "run"
    );
    expect(calls).toHaveLength(1);
    const first = calls[0];
    if (!first) throw new Error("CALL_MISSING");
    expect((JSON.parse(first.user) as { profiles: unknown[] }).profiles).toHaveLength(117);
  });
  it("reports malformed hierarchy instead of silently dropping provenance", () => {
    const s = source();
    s.parentSourceId = s.sourceId;
    expect(() => sourceProfile(s, [s])).toThrow("PROVENANCE_CYCLE");
  });
});
