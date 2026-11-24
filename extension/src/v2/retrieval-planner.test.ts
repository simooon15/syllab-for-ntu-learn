import { describe, expect, it } from "vitest";
import type { SourceRecord, AiRunRecord } from "./domain";
import {
  planRetrieval,
  restorePlannerAcquisition,
  restorePlannerProgress,
  selectedSourceView,
  contentIndex,
  expandRef,
  plannerCall,
  validatePlanner,
  PLANNER_SCHEMA,
  type NativeExpansion
} from "./retrieval-planner";
function required<T>(value: T | undefined): T {
  if (value === undefined) throw new Error("fixture missing");
  return value;
}
const file = (): SourceRecord => ({
  sourceId: "a",
  courseId: "c",
  nativeItemId: "a",
  kind: "attachment",
  title: "Lecture",
  updatedAt: "now",
  parsed: {
    text: "Title\nHidden assignment",
    structure: [],
    units: [
      {
        locator: "page:1",
        text: "Title\nHidden assignment",
        partial: true,
        visualGaps: ["image"],
        textRanges: [{ start: 0, end: 5, x: 0, y: 0, width: 1, height: 1 }]
      }
    ]
  }
});
const reply = (status: "CONTINUE" | "COMPLETE", requestRefs: string[] = []) => ({
  schema: PLANNER_SCHEMA,
  status,
  requestRefs,
  selectedEvidenceRefs: [] as string[],
  removedSelectedRefs: [],
  visualRequestRefs: [] as string[],
  uncertainRefs: [] as string[]
});
describe("DA-002 acquisition / selection / visual protocol", () => {
  it("indexes every unit without sending full bodies and expands exact native", () => {
    const s = file();
    required(required(s.parsed).units).push({
      ...required(required(s.parsed).units?.[0]),
      locator: "page:2"
    });
    const index = contentIndex([s]);
    expect(index.units).toHaveLength(2);
    expect(plannerCall(index, [], "test").user).not.toContain("Hidden assignment");
    expect(expandRef(index, [s], required(index.sources[0]).ref).text).toBe("");
    expect(expandRef(index, [s], required(index.units[1])[0]).text).toBe(required(s.parsed).text);
  });
  it("reports unread selection and directory selection together for a single repair", () => {
    const source = file(),
      index = contentIndex([source]);
    const unit = required(index.units[0])[0],
      directory = required(index.sources[0]).ref;
    const read = [expandRef(index, [source], directory)];
    const bad = { ...reply("COMPLETE"), selectedEvidenceRefs: [unit, directory] };
    expect(() => validatePlanner(bad, index, read)).toThrow("SELECTION_NOT_READ");
    expect(() => validatePlanner(bad, index, read)).toThrow("DIRECTORY_NOT_EVIDENCE");
    expect(
      (JSON.parse(plannerCall(index, read, "test").user) as { readEvidenceRefs: string[] })
        .readEvidenceRefs
    ).toEqual([]);
    expect(
      (
        JSON.parse(
          plannerCall(index, [...read, expandRef(index, [source], unit)], "test").user
        ) as { readEvidenceRefs: string[] }
      ).readEvidenceRefs
    ).toEqual([unit]);
  });
  it("restores only exact same-workflow acquisition across prompt updates, never final semantic scope", () => {
    const source = file(),
      index = contentIndex([source]),
      unit = required(index.units[0])[0];
    const payload = reply("CONTINUE", [unit]);
    const run: AiRunRecord = {
      aiRunId: "old-acquisition",
      workflowId: "fresh",
      courseId: "c",
      task: "retrieval-planner",
      status: "succeeded",
      schemaVersion: PLANNER_SCHEMA,
      promptVersion: "retrieval-planner/4",
      idempotencyKey: plannerCall(index, [], "planner:fresh").idempotencyKey,
      payload,
      attempt: 1,
      recordedAt: "now"
    };
    const recovered = restorePlannerAcquisition(index, [source], "fresh", [run]);
    expect(recovered).toEqual([expandRef(index, [source], unit)]);
    expect(restorePlannerProgress(index, [source], "fresh", [run]).result).toBeUndefined();
    expect(restorePlannerAcquisition(index, [source], "other", [run])).toEqual([]);
    required(required(source.parsed).units?.[0]).text += "new";
    expect(restorePlannerAcquisition(contentIndex([source]), [source], "fresh", [run])).toEqual([]);
    expect(
      restorePlannerAcquisition(index, [file()], "fresh", [{ ...run, status: "failed" }])
    ).toEqual([]);
  });

  it("keeps stable identity but invalidates changed native content", () => {
    const s = file(),
      before = contentIndex([s]);
    required(required(s.parsed).units?.[0]).text += "changed";
    const after = contentIndex([s]);
    expect(before.units[0]?.[0]).toBe(after.units[0]?.[0]);
    expect(before.fingerprint).not.toBe(after.fingerprint);
  });
  it("rejects collisions and invalid provenance", () => {
    const s = file();
    required(required(s.parsed).units).push({ ...required(required(s.parsed).units?.[0]) });
    expect(() => contentIndex([s])).toThrow("COLLISION");
    required(required(s.parsed).units).pop();
    s.parentSourceId = "missing";
    expect(() => contentIndex([s])).toThrow("PARENT_MISSING");
    s.parentSourceId = s.sourceId;
    expect(() => contentIndex([s])).toThrow("PARENT_CYCLE");
  });
  it("rejects unknown acquisition and detects no progress without a round cap", () => {
    const s = file(),
      index = contentIndex([s]),
      ref = required(index.units[0])[0],
      e = expandRef(index, [s], ref);
    expect(() => validatePlanner(reply("CONTINUE", ["invented"]), index, [])).toThrow(
      "UNKNOWN_REFS"
    );
    expect(() => validatePlanner(reply("CONTINUE", [ref]), index, [e])).toThrow("NO_PROGRESS");
  });
  it("deduplicates exact request/selection/visual refs without semantic inference", () => {
    const s = file(),
      index = contentIndex([s]),
      ref = required(index.units[0])[0],
      e = expandRef(index, [s], ref);
    expect(validatePlanner(reply("CONTINUE", [ref, ref]), index, []).requestRefs).toEqual([ref]);
    expect(
      validatePlanner(
        {
          ...reply("COMPLETE", [ref, ref]),
          selectedEvidenceRefs: [ref, ref],
          visualRequestRefs: [ref, ref]
        },
        index,
        [e]
      )
    ).toMatchObject({ requestRefs: [ref], selectedEvidenceRefs: [ref], visualRequestRefs: [ref] });
  });
  it("forbids unread selection and keeps acquisition independent", () => {
    const s = file(),
      index = contentIndex([s]),
      ref = required(index.units[0])[0];
    expect(() =>
      validatePlanner({ ...reply("CONTINUE", [ref]), selectedEvidenceRefs: [ref] }, index, [])
    ).toThrow("SELECTION_NOT_READ");
    expect(validatePlanner(reply("CONTINUE", [ref]), index, []).selectedEvidenceRefs).toEqual([]);
    expect(() => validatePlanner(reply("COMPLETE", [ref]), index, [])).toThrow(
      "COMPLETE_PENDING_REQUESTS"
    );
  });
  it("can finish acquisition with retained read selection or explicitly no selection", () => {
    const s = file(),
      index = contentIndex([s]),
      ref = required(index.units[0])[0],
      read = [expandRef(index, [s], ref)];
    expect(
      validatePlanner({ ...reply("COMPLETE"), selectedEvidenceRefs: [ref] }, index, read)
        .selectedEvidenceRefs
    ).toEqual([ref]);
    expect(validatePlanner(reply("COMPLETE"), index, read).selectedEvidenceRefs).toEqual([]);
    expect(() =>
      validatePlanner(
        { ...reply("COMPLETE"), sources: [{ decision: "NO_FURTHER_EXPANSION" }] },
        index,
        read
      )
    ).toThrow("LEGACY_AMBIGUOUS_PROTOCOL");
  });
  it("requires read, selection and unresolved Unit coverage for visual intent", () => {
    const s = file(),
      index = contentIndex([s]),
      ref = required(index.units[0])[0],
      read = [expandRef(index, [s], ref)];
    expect(() =>
      validatePlanner({ ...reply("COMPLETE"), visualRequestRefs: [ref] }, index, read)
    ).toThrow("VISUAL_NATIVE_SELECTION_COVERAGE");
    expect(
      validatePlanner(
        { ...reply("COMPLETE"), selectedEvidenceRefs: [ref], visualRequestRefs: [ref] },
        index,
        read
      ).visualRequestRefs
    ).toEqual([ref]);
    required(required(s.parsed).units?.[0]).partial = false;
    expect(() =>
      validatePlanner(
        { ...reply("COMPLETE"), selectedEvidenceRefs: [ref], visualRequestRefs: [ref] },
        contentIndex([s]),
        read
      )
    ).toThrow("VISUAL_NATIVE_SELECTION_COVERAGE");
  });
  it("expands complete captured native metadata and not only body preview", () => {
    const s = file();
    required(s.parsed).units = [];
    required(s.parsed).text = "First.\nFull hidden text.\nnative dueDate: date";
    s.discovery = { rawText: "<p>content.body: &lt;p&gt;First.&lt;/p&gt;</p>" } as NonNullable<
      SourceRecord["discovery"]
    >;
    const index = contentIndex([s]);
    expect(index.sources[0]?.anchors[0]?.text).toBe("First.");
    expect(expandRef(index, [s], required(index.sources[0]).ref).text).toBe(
      required(s.parsed).text
    );
  });
  it("rejects directory refs as Task A evidence", () => {
    const s = file(),
      index = contentIndex([s]),
      ref = required(index.sources[0]).ref;
    expect(() =>
      validatePlanner({ ...reply("COMPLETE"), selectedEvidenceRefs: [ref] }, index, [
        expandRef(index, [s], ref)
      ])
    ).toThrow("DIRECTORY_NOT_EVIDENCE");
  });
  it("keeps selected native input separate from render admission without overwriting inventory", () => {
    const s = file();
    required(required(s.parsed).units).push({
      ...required(required(s.parsed).units?.[0]),
      locator: "page:2",
      text: "Unexpanded original text"
    });
    const original = structuredClone(s),
      index = contentIndex([s]),
      ref = required(index.units[0])[0];
    const result = validatePlanner({ ...reply("COMPLETE"), selectedEvidenceRefs: [ref] }, index, [
        expandRef(index, [s], ref)
      ]),
      view = required(selectedSourceView(s, index, result) ?? undefined);
    expect(view.processing.parsed?.units).toHaveLength(1);
    expect(view.processing.parsed?.units?.[0]?.partial).toBe(true);
    expect(view.rendering.parsed?.units?.[0]?.partial).toBe(false);
    expect(view.processing.parsed?.text).not.toContain("Unexpanded original text");
    expect(s).toEqual(original);
  });
  it("allows a read blank native unit to request visual completion explicitly", () => {
    const s = file();
    required(required(s.parsed).units?.[0]).text = "";
    const index = contentIndex([s]),
      ref = required(index.units[0])[0];
    const result = validatePlanner(
      { ...reply("COMPLETE"), selectedEvidenceRefs: [ref], visualRequestRefs: [ref] },
      index,
      [expandRef(index, [s], ref)]
    );
    expect(selectedSourceView(s, index, result)?.rendering.parsed?.units?.[0]?.partial).toBe(true);
  });
  it("preserves explicit uncertainty instead of calling an unselected Source irrelevant", () => {
    const s = file(),
      index = contentIndex([s]),
      ref = required(index.sources[0]).ref;
    const result = validatePlanner({ ...reply("COMPLETE"), uncertainRefs: [ref] }, index, []);
    expect(() => selectedSourceView(s, index, result)).toThrow("PLANNER_UNCERTAIN_SCOPE");
  });
  it("retains AI uncertainty in unselected units of a selected Source without adding evidence or rendering", () => {
    const s = file();
    required(required(s.parsed).units).push({
      ...required(required(s.parsed).units?.[0]),
      locator: "page:2",
      text: ""
    });
    const index = contentIndex([s]),
      first = required(index.units[0])[0],
      second = required(index.units[1])[0];
    const result = validatePlanner(
      { ...reply("COMPLETE"), selectedEvidenceRefs: [first], uncertainRefs: [second] },
      index,
      [expandRef(index, [s], first)]
    );
    const view = required(selectedSourceView(s, index, result) ?? undefined);
    expect(view.processing.parsed?.units).toHaveLength(1);
    expect(view.uncertainLocators).toEqual(["page:2"]);
    const sourceUncertain = validatePlanner(
      {
        ...reply("COMPLETE"),
        selectedEvidenceRefs: [first],
        uncertainRefs: [required(index.sources[0]).ref]
      },
      index,
      [expandRef(index, [s], first)]
    );
    expect(selectedSourceView(s, index, sourceUncertain)?.uncertainLocators).toEqual(["source"]);
    expect(view.rendering.parsed?.units?.some((u) => u.partial)).toBe(false);
  });
  it("allows selected read evidence with explicit uncertainty without forcing a visual request", () => {
    const s = file(),
      index = contentIndex([s]),
      ref = required(index.units[0])[0];
    const result = validatePlanner(
      { ...reply("COMPLETE"), selectedEvidenceRefs: [ref], uncertainRefs: [ref] },
      index,
      [expandRef(index, [s], ref)]
    );
    expect(result.visualRequestRefs).toEqual([]);
    expect(selectedSourceView(s, index, result)?.uncertainLocators).toEqual(["page:1"]);
  });
  it("continues exact acquisition and only accepts selection after returned native read", async () => {
    const s = file(),
      index = contentIndex([s]),
      ref = required(index.units[0])[0];
    let calls = 0;
    const states: string[] = [];
    const result = await planRetrieval({
      index,
      inventory: [s],
      key: "probe",
      execute: (call) => {
        calls++;
        const input = JSON.parse(call.user) as { expanded: unknown[] };
        expect(input.expanded).toHaveLength(calls === 1 ? 0 : 1);
        return Promise.resolve({
          value:
            calls === 1
              ? reply("CONTINUE", [ref, ref])
              : { ...reply("COMPLETE"), selectedEvidenceRefs: [ref] }
        });
      },
      onRound: (round) => {
        states.push(round.runtimeState);
        return Promise.resolve();
      }
    });
    expect(calls).toBe(2);
    expect(states).toEqual(["CONTINUE", "COMPLETE"]);
    expect(result.expanded).toHaveLength(1);
  });
});

describe("selection continuity", () => {
  it("retains omitted selected evidence without selecting other acquired units", async () => {
    const source = file();
    required(required(source.parsed).units).push({
      ...required(required(source.parsed).units?.[0]),
      locator: "page:2"
    });
    const index = contentIndex([source]);
    const a = required(index.units[0])[0],
      b = required(index.units[1])[0];
    let round = 0;
    const result = await planRetrieval({
      index,
      inventory: [source],
      key: "continuity",
      expanded: [expandRef(index, [source], a)],
      execute: (call) => {
        const context = JSON.parse(call.user) as { previousSelectedEvidenceRefs: string[] };
        if (++round === 1)
          return Promise.resolve({
            value: { ...reply("CONTINUE", [b]), selectedEvidenceRefs: [a] }
          });
        expect(context.previousSelectedEvidenceRefs).toEqual([a]);
        return Promise.resolve({ value: reply("COMPLETE") });
      }
    });
    expect(result.result.selectedEvidenceRefs).toEqual([a]);
    expect(result.expanded.map((row) => row.ref)).toEqual([a, b]);
  });
  it("permits evidence-backed correction but rejects unselected, unread, ambiguous removals", () => {
    const source = file(),
      index = contentIndex([source]),
      ref = required(index.units[0])[0];
    const read = [expandRef(index, [source], ref)];
    const removal = {
      ref,
      reason: "Native text establishes an illustrative exercise, with no course requirement",
      evidenceRefs: [ref]
    };
    const value = { ...reply("COMPLETE"), removedSelectedRefs: [removal] };
    expect(validatePlanner(value, index, read, [ref]).selectedEvidenceRefs).toEqual([]);
    expect(() => validatePlanner(value, index, read)).toThrow("REMOVAL_EVIDENCE");
    expect(() =>
      validatePlanner(
        { ...value, removedSelectedRefs: [{ ...removal, evidenceRefs: ["unknown"] }] },
        index,
        read,
        [ref]
      )
    ).toThrow("REMOVAL_EVIDENCE");
    expect(() =>
      validatePlanner({ ...value, selectedEvidenceRefs: [ref] }, index, read, [ref])
    ).toThrow("REMOVAL_EVIDENCE");
    expect(() =>
      validatePlanner(
        { ...value, removedSelectedRefs: [{ ...removal, reason: "" }] },
        index,
        read,
        [ref]
      )
    ).toThrow("REMOVAL_EVIDENCE");
  });
});

it("restores same-workflow accepted selection after an interruption, never cross-workflow", async () => {
  const source = file(),
    index = contentIndex([source]),
    ref = required(index.units[0])[0];
  required(required(source.parsed).units).push({
    ...required(required(source.parsed).units?.[0]),
    locator: "page:2"
  });
  const full = contentIndex([source]),
    b = required(full.units[1])[0];
  const first = { ...reply("CONTINUE", [ref]) };
  const read = [expandRef(full, [source], ref)];
  const second = { ...reply("CONTINUE", [b]), selectedEvidenceRefs: [ref] };
  const run = (payload: unknown, expanded: NativeExpansion[], at: string): AiRunRecord => ({
    aiRunId: at,
    workflowId: "w",
    courseId: "c",
    task: "retrieval-planner",
    status: "succeeded",
    schemaVersion: PLANNER_SCHEMA,
    promptVersion: "retrieval-planner/6",
    idempotencyKey: plannerCall(full, expanded, "planner:w").idempotencyKey,
    payload,
    attempt: 1,
    recordedAt: at
  });
  const runs = [run(first, [], "1"), run(second, read, "2")];
  const progress = restorePlannerProgress(full, [source], "w", runs);
  expect(progress.result?.selectedEvidenceRefs).toEqual([ref]);
  expect(restorePlannerProgress(full, [source], "other", runs).result).toBeUndefined();
  expect(restorePlannerProgress(index, [source], "w", runs).result).toBeUndefined();
  const resumed = await planRetrieval({
    index: full,
    inventory: [source],
    key: "planner:w",
    expanded: progress.expanded,
    previousSelectedEvidenceRefs: progress.result?.selectedEvidenceRefs ?? [],
    execute: (call) => {
      expect(
        (JSON.parse(call.user) as { previousSelectedEvidenceRefs: string[] })
          .previousSelectedEvidenceRefs
      ).toEqual([ref]);
      return Promise.resolve({ value: reply("COMPLETE") });
    }
  });
  expect(resumed.result.selectedEvidenceRefs).toEqual([ref]);
});
