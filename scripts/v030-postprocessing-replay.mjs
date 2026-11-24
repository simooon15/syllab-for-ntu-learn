// Zero-provider replay. Private snapshots stay local; an isolated browser owns the scratch DB.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { build } from "esbuild";
import { chromium } from "playwright";
import { createServer } from "node:http";
import { resolve } from "node:path";
const input = process.argv[2];
const containment = process.argv[3] === "containment";
if (!input?.startsWith("evidence/private/")) throw Error("PRIVATE_SNAPSHOT_REQUIRED");
const data = JSON.parse(await readFile(input, "utf8"));
const workflowId = "wf_3ee80256bee2d6d2fb0e805c";
if (!data.tables.workflows.some((w) => w.workflowId === workflowId))
  throw Error("EXPECTED_WORKFLOW_REQUIRED");
await mkdir(".tmp", { recursive: true });
await build({
  stdin: {
    contents: `export { WorkflowEngine } from './extension/src/v2/workflow';
export { LocalDatabase } from './extension/src/v2/storage';
export { LocalStore } from './extension/src/v2/store';
export { RebuildStagingStore } from './extension/src/v2/staging';
export { semanticallyProcess } from './extension/src/v2/teaching-deferral';
export { stableDigest } from './extension/src/v2/chunking';
export { DeepSeekFailure } from './extension/src/v2/deepseek';`,
    resolveDir: process.cwd(),
    loader: "ts"
  },
  bundle: true,
  format: "iife",
  globalName: "RecoveryReplay",
  outfile: ".tmp/v030-postprocessing-replay.js",
  plugins: [
    {
      name: "private-observation-disabled",
      setup(b) {
        b.onResolve({ filter: /qa-telemetry$/ }, () => ({
          path: resolve("extension/src/v2/qa-telemetry.disabled.ts")
        }));
      }
    }
  ]
});
const server = createServer((_request, response) => {
  response.setHeader("Content-Type", "text/html");
  response.end("<!doctype html><title>Isolated post-processing replay</title>");
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.addScriptTag({ path: ".tmp/v030-postprocessing-replay.js" });
  const result = await page.evaluate(
    async ({ data, workflowId, containment }) => {
      const {
        LocalDatabase,
        LocalStore,
        WorkflowEngine,
        RebuildStagingStore,
        semanticallyProcess,
        stableDigest
      } = globalThis.RecoveryReplay;
      const events = [];
      const original = IDBDatabase.prototype.transaction;
      let sequence = 0;
      IDBDatabase.prototype.transaction = function (...args) {
        const transaction = original.apply(this, args);
        const transactionId = ++sequence;
        const start = performance.now();
        const base = {
          transactionId,
          tables: [...transaction.objectStoreNames],
          mode: transaction.mode
        };
        events.push({ ...base, phase: "open", atMs: start });
        for (const phase of ["complete", "abort", "error"])
          transaction.addEventListener(
            phase,
            () =>
              events.push({
                ...base,
                phase,
                atMs: performance.now(),
                elapsedMs: performance.now() - start,
                errorName: transaction.error?.name ?? null
              }),
            { once: true }
          );
        return transaction;
      };
      const database = new LocalDatabase(indexedDB, "syllab-scratch-recovery-017");
      const store = new LocalStore(database);
      const connection = await database.open();
      const seed = connection.transaction(Object.keys(data.tables), "readwrite");
      for (const [name, records] of Object.entries(data.tables))
        for (const record of records) seed.objectStore(name).put(record);
      await new Promise((r, j) => {
        seed.oncomplete = r;
        seed.onerror = j;
      });
      const values = new Map();
      const stagingEvents = [];
      const storage = {
        get: async (keys) =>
          Object.fromEntries(
            (Array.isArray(keys) ? keys : [keys]).map((key) => [
              key,
              structuredClone(values.get(key))
            ])
          ),
        set: async (items) => {
          const started = performance.now();
          for (const [key, value] of Object.entries(items)) values.set(key, structuredClone(value));
          stagingEvents.push({
            elapsedMs: performance.now() - started,
            bytes: new TextEncoder().encode(JSON.stringify(items)).byteLength
          });
        },
        remove: async (keys) => {
          for (const key of Array.isArray(keys) ? keys : [keys]) values.delete(key);
        }
      };
      const staging = new RebuildStagingStore(storage);
      const saved = await store.readWorkflow(workflowId);
      const claimed = {
        ...saved,
        state: "working",
        lease: { token: "scratch-lease", sessionId: "scratch-only" }
      };
      await store.saveWorkflow(claimed);
      const engine = new WorkflowEngine({
        store,
        staging,
        clock: { now: () => new Date("2026-10-06T01:00:00Z") },
        ai: {
          execute: async () => {
            throw Error("PROVIDER_FORBIDDEN");
          }
        },
        machine: {}
      });
      const course = await store.readCourse(saved.courseId);
      const context = await engine.materializeContext(claimed, course);
      const eligible = context.sourceRecords.filter((source) => {
        const observation = context.observations.find(
          (o) => o.workflowId === workflowId && o.sourceId === source.sourceId
        );
        return (
          source.parsed &&
          !source.removedFromNative &&
          observation?.fetchStatus === "ok" &&
          ["ok", "partial"].includes(observation.parseStatus) &&
          semanticallyProcess(source)
        );
      });
      const runs = data.tables.aiRuns.filter(
        (r) => r.workflowId === workflowId && r.task === "task-a"
      );
      const outcomes = eligible.map((source) => ({
        source,
        run: runs.find((r) => r.sourceId === source.sourceId)
      }));
      const started = performance.now();
      const spans = [];
      let terminal;
      if (containment) {
        const packageOutcomes = outcomes.map(({ run }) =>
          run?.status === "succeeded"
            ? { ok: true, value: run.taskAPackage.result }
            : {
                ok: false,
                error:
                  run?.status === "failed"
                    ? new globalThis.RecoveryReplay.DeepSeekFailure(
                        run.errorCode,
                        false,
                        "recorded contract failure"
                      )
                    : new Error("")
              }
        );
        try {
          await engine.commitTaskAOutcomes(claimed, context, eligible, packageOutcomes);
        } catch (error) {
          terminal = await engine.fail(claimed, error);
        }
      } else {
        for (const [order, { source, run }] of outcomes.entries()) {
          const item = { sourceId: source.sourceId, order };
          const start = performance.now();
          try {
            if (run?.status === "succeeded") {
              await engine.observePostProcessing(
                claimed,
                "understanding-write",
                () => engine.recordUnderstanding(claimed, context, source, run.taskAPackage.result),
                item
              );
              await engine.observePostProcessing(
                claimed,
                "draft-staging-write",
                () => engine.persistTaskADrafts(claimed, context, source, run.taskAPackage.result),
                item
              );
              await engine.observePostProcessing(
                claimed,
                "coverage-staging-write",
                () =>
                  engine.recordTaskASuccess(
                    claimed,
                    source.sourceId,
                    run.taskAPackage.result.sourceResult !== "NO_RELEVANT_INFORMATION"
                  ),
                item
              );
            } else if (run?.status === "failed") {
              await engine.observePostProcessing(
                claimed,
                "failure-staging-write",
                () => engine.recordTaskAFailure(claimed, source.sourceId, { code: run.errorCode }),
                item
              );
            } else {
              // Original error object was not persisted. This represents, not reconstructs, its disposition.
              throw Error("");
            }
            spans.push({
              order,
              sourceRef: `s:${stableDigest(source.sourceId)}`,
              result: run.status,
              startedAtMs: start,
              endedAtMs: performance.now()
            });
          } catch (error) {
            terminal = await engine.fail(claimed, error);
            spans.push({
              order,
              sourceRef: `s:${stableDigest(source.sourceId)}`,
              result: "unverified",
              startedAtMs: start,
              endedAtMs: performance.now(),
              errorName: error.name
            });
            break;
          }
        }
      }
      const staged = await staging.read(saved.courseId, workflowId);
      const result = {
        status: containment ? "PASS_CONTAINMENT_REPLAY" : "PASS_DISPOSITION_REPLAY_ONLY",
        models: 0,
        realWorkflowWrites: 0,
        eligible: eligible.length,
        successes: runs.filter((r) => r.status === "succeeded").length,
        failures: runs.filter((r) => r.status === "failed").length,
        elapsedMs: performance.now() - started,
        staging: {
          success: staged.taskACoverage.succeededSourceIds.length,
          failed: staged.taskACoverage.failedSources.length
        },
        terminal: {
          state: terminal.state,
          errorCode: terminal.errorCode,
          lastErrorDetail: terminal.lastErrorDetail
        },
        assumption:
          "Unverified item error is an injected empty Error; original exception was not persisted. No stall causality claim.",
        stagingBackend:
          "structured-clone in-memory KV; not Chrome.storage.local quota/lifecycle validation",
        events,
        stagingEvents,
        spans
      };
      await database.close();
      return result;
    },
    { data, workflowId, containment }
  );
  if (
    result.eligible !== 109 ||
    result.successes !== 99 ||
    result.failures !== 9 ||
    result.staging.success !== (containment ? 99 : 95) ||
    result.staging.failed !== (containment ? 10 : 9) ||
    result.terminal.errorCode !== "INTERNAL"
  )
    throw Error("EXACT_DISPOSITION_REPLAY_MISMATCH");
  await writeFile(
    containment
      ? "evidence/private/v030-recovery-019/CONTAINMENT-REPLAY.json"
      : "evidence/private/v030-recovery-017/BROWSER-REPLAY.json",
    JSON.stringify(result, null, 2)
  );
  console.log(
    JSON.stringify({
      ...result,
      events: result.events.length,
      stagingEvents: result.stagingEvents.length,
      spans: result.spans.length
    })
  );
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
