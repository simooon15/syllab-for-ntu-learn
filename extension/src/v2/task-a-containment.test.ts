import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { WorkflowEngine, type EngineOptions, type RunContext } from "./workflow";
import { LocalDatabase } from "./storage";
import { LocalStore } from "./store";
import { RebuildStagingStore } from "./staging";
import { DeepSeekFailure } from "./deepseek";
import type { WorkflowRecord, SourceRecord } from "./domain";
import type { TaskAResult } from "./ai-contracts";
import type { PackageOutcome } from "./package-scheduler";
import { stableDigest } from "./chunking";

type Commit = {
  commitTaskAOutcomes(
    w: WorkflowRecord,
    c: RunContext,
    s: SourceRecord[],
    o: PackageOutcome<TaskAResult>[]
  ): Promise<void>;
};

async function fixture(name: string) {
  const db = new LocalDatabase(indexedDB, name);
  const store = new LocalStore(db);
  const values: Record<string, unknown> = {};
  const staging = new RebuildStagingStore({
    get: (keys) =>
      Promise.resolve(
        Object.fromEntries(
          (Array.isArray(keys) ? keys : [keys]).map((k) => [k, structuredClone(values[k])])
        )
      ),
    set: (items) => {
      Object.assign(values, structuredClone(items));
      return Promise.resolve();
    },
    remove: () => Promise.resolve()
  });
  const workflow = {
    workflowId: name,
    courseId: "synthetic-course",
    kind: "rebuild",
    phase: "task-a",
    state: "working",
    attempt: 0,
    lease: { token: "fixture-owner", sessionId: "fixture" }
  } as WorkflowRecord;
  await store.saveWorkflow(workflow);
  const engine = new WorkflowEngine({
    store,
    staging,
    clock: { now: () => new Date("2026-10-06T00:00:00Z") }
  } as EngineOptions) as unknown as Commit;
  const context = {
    course: { courseId: workflow.courseId },
    workflowId: name,
    sourceRecords: [],
    observations: [],
    sources: new Map(),
    exclusionKeys: new Set(),
    evidence: [],
    now: "2026-10-06T00:00:00Z"
  } as unknown as RunContext;
  return { db, store, staging, workflow, engine, context };
}

function success(sourceId: string): PackageOutcome<TaskAResult> {
  return {
    ok: true,
    value: {
      schema: "syllab.ai.task-a/1",
      sourceId,
      sourceResult: "NO_RELEVANT_INFORMATION",
      assessmentDrafts: [],
      courseWideConstraintCandidates: [],
      unresolvedIssues: []
    }
  };
}

describe("Task A local commit containment", () => {
  it("does not let an older owner overwrite a newer terminal diagnostic at the same attempt", async () => {
    const f = await fixture("fixture-terminal-owner");
    const key = "fixture-terminal-key";
    const start = { stage: "terminal-state-write", phase: "start" };
    await f.store.writePostProcessingDiagnostic(f.workflow, key, start);
    const newer = { ...f.workflow, lease: { token: "newer-owner", sessionId: "newer" } };
    await f.store.saveWorkflow(newer);
    await f.store.writePostProcessingDiagnostic(newer, key, start);
    const { lease: _lease, ...carried } = newer;
    await f.store.saveWorkflow({ ...carried, state: "failed", attempt: 1 });
    await expect(
      f.store.writePostProcessingDiagnostic(f.workflow, key, { ...start, phase: "end" })
    ).rejects.toThrow("STALE_DIAGNOSTIC_WRITE");
    await f.store.writePostProcessingDiagnostic(newer, key, { ...start, phase: "end" });
    expect(((await f.store.readMetadataValue(key)) as Record<string, unknown>).phase).toBe("end");
    await f.db.close();
  });
  it("commits all 99 successes across the real109-position 99/9/1 distribution", async () => {
    const f = await fixture("fixture109-containment");
    const sources = Array.from(
      { length: 109 },
      (_, i) =>
        ({ sourceId: `fixture-${String(i)}`, courseId: f.workflow.courseId }) as SourceRecord
    );
    const unknown = new Error("");
    const failures = new Set([2, 12, 22, 32, 42, 52, 62, 72, 102]);
    const outcomes = sources.map((source, i) =>
      i === 104
        ? { ok: false as const, error: unknown }
        : failures.has(i)
          ? {
              ok: false as const,
              error: new DeepSeekFailure("AI_CONTRACT", false, "synthetic schema")
            }
          : success(source.sourceId)
    );
    await expect(
      f.engine.commitTaskAOutcomes(f.workflow, f.context, sources, outcomes)
    ).rejects.toBe(unknown);
    const staged = await f.staging.read(f.workflow.courseId, f.workflow.workflowId);
    expect(staged?.taskACoverage?.succeededSourceIds).toHaveLength(99);
    expect(staged?.taskACoverage?.failedSources).toHaveLength(10);
    for (const i of [105, 106, 107, 108])
      expect(staged?.taskACoverage?.succeededSourceIds).toContain(`fixture-${String(i)}`);
    const diagnostic = (await f.store.readMetadataValue(
      `runtime.task-a:${f.workflow.workflowId}:1:104:unexpected-outcome`
    )) as Record<string, unknown>;
    expect(diagnostic.phase).toBe("error");
    expect(diagnostic.detailEmpty).toBe(true);
    expect(diagnostic.sourceRef).toBe(stableDigest("fixture-104"));
    expect(typeof diagnostic.stackFrames).toBe("string");
    await f.db.close();
  });

  it("never commits past ownership loss", async () => {
    const f = await fixture("fixture-stale-containment");
    await f.store.saveWorkflow({
      ...f.workflow,
      lease: { token: "different-owner", sessionId: "different" }
    });
    await expect(
      f.engine.commitTaskAOutcomes(
        f.workflow,
        f.context,
        [{ sourceId: "fixture-source" } as SourceRecord],
        [success("fixture-source")]
      )
    ).rejects.toThrow("Stale workflow completion");
    expect(await f.staging.read(f.workflow.courseId, f.workflow.workflowId)).toBeNull();
    await f.db.close();
  });
});
