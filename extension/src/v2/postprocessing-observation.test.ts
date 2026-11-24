import "fake-indexeddb/auto";
import { describe, expect, it, vi } from "vitest";
import { WorkflowEngine, type EngineOptions } from "./workflow";
import { LocalDatabase, setTransactionObservation } from "./storage";
import type { WorkflowRecord } from "./domain";

const trace = vi.hoisted(() => vi.fn<(name: string, fields: Record<string, unknown>) => void>());
vi.mock("./qa-telemetry", () => ({ qaTrace: trace }));

type Observer = {
  observePostProcessing<T>(
    workflow: WorkflowRecord,
    stage: string,
    body: () => Promise<T>,
    item?: { sourceId: string; order: number }
  ): Promise<T>;
};
const workflow = { workflowId: "fixture-workflow" } as WorkflowRecord;

describe("post-processing observation has no workflow authority", () => {
  it("observes completion and preserves the exact failure without retry or substitution", async () => {
    trace.mockClear();
    const engine = new WorkflowEngine({
      clock: { now: () => new Date("2026-10-06T00:00:00Z") },
      store: { writePostProcessingDiagnostic: () => Promise.resolve() }
    } as unknown as EngineOptions) as unknown as Observer;
    const value = { meaning: "unchanged" };
    const completed = vi.fn(() => Promise.resolve(value));
    expect(await engine.observePostProcessing(workflow, "staging", completed)).toBe(value);
    expect(completed).toHaveBeenCalledTimes(1);
    const error = new Error("private fixture detail");
    const failed = vi.fn(() => Promise.reject(error));
    await expect(engine.observePostProcessing(workflow, "staging", failed)).rejects.toBe(error);
    expect(failed).toHaveBeenCalledTimes(1);
    expect(trace.mock.calls.map(([, fields]) => fields.phase)).toEqual([
      "start",
      "end",
      "start",
      "error"
    ]);
    expect(JSON.stringify(trace.mock.calls)).not.toContain("private fixture detail");
  });

  it("reports native transaction completion and abort as distinct events", async () => {
    trace.mockClear();
    const db = new LocalDatabase(indexedDB, "fixture-observation-transactions");
    setTransactionObservation(true);
    await db.ensureGeneration();
    await db.write(["appMetadata"], async (transaction) => {
      await transaction.setMetadata({ fixture: true });
    });
    const original = new Error("fixture-body-failure");
    await expect(
      db.write(["appMetadata"], () =>
        Promise.resolve().then(() => {
          throw original;
        })
      )
    ).rejects.toBe(original);
    // Abort event dispatch is asynchronous; wait for an independent IDB task rather than a timer.
    await db.read(["appMetadata"], (transaction) => transaction.get("appMetadata", "fixture"));
    const events = trace.mock.calls.filter(([name]) => name === "qa.idb-transaction");
    expect(events.some(([, event]) => event.phase === "abort")).toBe(true);
    expect(events.some(([, event]) => event.phase === "complete")).toBe(true);
    const opened = new Set(
      events.filter(([, event]) => event.phase === "open").map(([, event]) => event.transactionId)
    );
    expect(
      events
        .filter(([, event]) => event.phase === "complete" || event.phase === "abort")
        .every(([, event]) => opened.has(event.transactionId))
    ).toBe(true);
    await db.close();
    setTransactionObservation(false);
  });
});
