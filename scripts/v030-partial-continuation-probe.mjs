// Zero-model, isolated native-IDB proof. No real workflow mutation or provider connection.
import { build } from "esbuild";
import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
const input = process.argv[2];
if (!input?.startsWith("evidence/private/")) throw Error("PRIVATE_SNAPSHOT_REQUIRED");
const data = JSON.parse(await readFile(input, "utf8"));
const workflowId = "wf_3ee80256bee2d6d2fb0e805c";
await mkdir(".tmp", { recursive: true });
await build({
  stdin: {
    contents: `export {WorkflowEngine} from './extension/src/v2/workflow';
export {LocalDatabase} from './extension/src/v2/storage';
export {LocalStore} from './extension/src/v2/store';
export {RebuildStagingStore} from './extension/src/v2/staging';`,
    resolveDir: process.cwd(),
    loader: "ts"
  },
  bundle: true,
  format: "iife",
  globalName: "PartialProbe",
  outfile: ".tmp/v030-partial-probe.js",
  plugins: [
    {
      name: "disable-observation",
      setup(b) {
        b.onResolve({ filter: /qa-telemetry$/ }, () => ({
          path: resolve("extension/src/v2/qa-telemetry.disabled.ts")
        }));
      }
    }
  ]
});
const server = createServer((_request, response) =>
  response.end("<!doctype html><title>Isolated partial continuation</title>")
);
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.addScriptTag({ path: ".tmp/v030-partial-probe.js" });
  const result = await page.evaluate(
    async ({ data, workflowId }) => {
      const { WorkflowEngine, LocalDatabase, LocalStore, RebuildStagingStore } =
        globalThis.PartialProbe;
      const database = new LocalDatabase(indexedDB, "isolated-partial-continuation");
      const store = new LocalStore(database);
      const db = await database.open();
      const seed = db.transaction(Object.keys(data.tables), "readwrite");
      for (const [name, records] of Object.entries(data.tables))
        for (const row of records) seed.objectStore(name).put(row);
      await new Promise((r, j) => {
        seed.oncomplete = r;
        seed.onerror = j;
      });
      const values = structuredClone(data.staging);
      const staging = new RebuildStagingStore({
        get: async (keys) =>
          Object.fromEntries(
            (Array.isArray(keys) ? keys : [keys]).map((k) => [k, structuredClone(values[k])])
          ),
        set: async (items) => Object.assign(values, structuredClone(items)),
        remove: async () => {
          throw Error("CLEAR_FORBIDDEN");
        }
      });
      let bInput;
      let providerCalls = 0;
      const engine = new WorkflowEngine({
        store,
        staging,
        clock: { now: () => new Date("2026-10-06T04:00:00Z") },
        machine: {},
        ai: {
          apiKey: async () => "synthetic-test-value",
          privacyAuthorized: async () => true,
          usageAuthorized: async () => true,
          execute: async () => {
            providerCalls++;
            throw Error("PROVIDER_FORBIDDEN");
          }
        },
        buildTaskBCalls: (input) => {
          bInput = input;
          throw Error("B_INPUT_CAPTURED");
        }
      });
      const failedPayloads = data.tables.aiRuns
        .filter(
          (r) =>
            r.workflowId === workflowId &&
            r.task === "task-a" &&
            r.status === "failed" &&
            r.recordedAt >= "2026-10-06T02:56:00Z"
        )
        .map((r) => ({ sourceId: r.sourceId, fullPayloadSaved: r.payload !== undefined }));
      const workflow = await engine.continueTaskAPartial(workflowId, {
        mainWaves: null,
        recoveryWaves: 1,
        paidRecoveryInvocations: 10
      });
      const prepared = await staging.read(workflow.courseId, workflowId);
      await engine.run(workflowId);
      if (!bInput || providerCalls) throw Error("ZERO_MODEL_PROBE_FAILED");
      const unresolvedIds = new Set(prepared.taskACoverage.failedSources.map((f) => f.sourceId));
      if (
        bInput.sharedWorkingContexts.some((s) => unresolvedIds.has(s.sourceId)) ||
        bInput.evidence.some((e) => unresolvedIds.has(e.sourceId)) ||
        bInput.availableEvidenceRefs.some((e) => unresolvedIds.has(e.sourceId))
      )
        throw Error("UNRESOLVED_SEMANTIC_LEAK");
      const trustedNames = [
        "courseStates",
        "assessments",
        "constraints",
        "facts",
        "evidence",
        "reviewItems",
        "reviewDecisions",
        "history",
        "changes",
        "exclusionMemory"
      ];
      const current = {};
      for (const name of [...trustedNames, "sourceObservations"])
        current[name] = await new Promise((r, j) => {
          const request = db.transaction(name).objectStore(name).getAll();
          request.onsuccess = () => r(request.result);
          request.onerror = () => j(request.error);
        });
      const normalize = (value) =>
        Array.isArray(value)
          ? value.map(normalize)
          : value && typeof value === "object"
            ? Object.fromEntries(
                Object.entries(value)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([key, v]) => [key, normalize(v)])
              )
            : value;
      const equal = (a, b) => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));
      const trustedUnchanged = Object.fromEntries(
        trustedNames.map((n) => [n, equal(current[n], data.tables[n])])
      );
      const oldObservations = data.tables.sourceObservations.filter(
        (o) => o.workflowId !== workflowId
      );
      const historicalObservationsUnchanged = equal(
        current.sourceObservations.filter((o) => o.workflowId !== workflowId),
        oldObservations
      );
      if (!Object.values(trustedUnchanged).every(Boolean) || !historicalObservationsUnchanged)
        throw Error(
          "HISTORY_MUTATION:" +
            JSON.stringify({ trustedUnchanged, historicalObservationsUnchanged })
        );
      await database.close();
      return {
        status: "PASS_PARTIAL_CONTINUATION_PROBE",
        models: providerCalls,
        realWorkflowWrites: 0,
        fullFailedPayloadsSaved: failedPayloads.filter((p) => p.fullPayloadSaved).length,
        failedPayloadCount: failedPayloads.length,
        zeroCostRepaired: 0,
        phase: workflow.phase,
        coverage: workflow.taskASemanticCoverage,
        successfulContexts: bInput.sharedWorkingContexts.length,
        unresolvedExcludedFromEvidence: true,
        unresolvedExcludedFromCatalog: true,
        trustedUnchanged,
        historicalObservationsUnchanged,
        stagingBackend: "structured-clone KV, not production Chrome.storage IPC"
      };
    },
    { data, workflowId }
  );
  await mkdir("artifacts/v0.3.0/partial-020", { recursive: true });
  await writeFile(
    "artifacts/v0.3.0/partial-020/CONTINUATION-GATE.json",
    JSON.stringify(result, null, 2) + "\n"
  );
  console.log({
    status: result.status,
    successfulContexts: result.successfulContexts,
    unresolved: result.coverage.unresolved.length,
    fullFailedPayloadsSaved: result.fullFailedPayloadsSaved,
    models: result.models
  });
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
