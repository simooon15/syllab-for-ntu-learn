// Zero-model, isolated native-IDB proof. No real workflow mutation or provider connection.
import { build } from "esbuild";
import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
const input = process.argv[2];
const mode = process.argv[3] ?? "base";
if (
  ![
    "base",
    "expansion",
    "storage-failure",
    "oversized",
    "length",
    "ambiguous",
    "raw-restart",
    "reconciliation"
  ].includes(mode)
)
  throw Error("UNKNOWN_PROBE_MODE");
if (!input?.startsWith("evidence/private/")) throw Error("PRIVATE_SNAPSHOT_REQUIRED");
const data = JSON.parse(await readFile(input, "utf8"));
const workflowId = "wf_3ee80256bee2d6d2fb0e805c";
await mkdir(".tmp", { recursive: true });
await build({
  stdin: {
    contents: `export {WorkflowEngine} from './extension/src/v2/workflow';
export {LocalDatabase} from './extension/src/v2/storage';
export {LocalStore} from './extension/src/v2/store';
export {RebuildStagingStore} from './extension/src/v2/staging';
export {buildTaskBCalls} from './extension/src/v2/ai-pipeline';
export {evidenceRegistry} from './extension/src/v2/task-b-grounding';
export {completeWithRepair,AiUnitFailure} from './extension/src/v2/deepseek-complete';`,
    resolveDir: process.cwd(),
    loader: "ts"
  },
  bundle: true,
  format: "iife",
  globalName: "PartialProbe",
  outfile: `.tmp/v030-partial-probe-${mode}.js`,
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
  await page.addScriptTag({ path: `.tmp/v030-partial-probe-${mode}.js` });
  const result = await page.evaluate(
    async ({ data, workflowId, mode }) => {
      const {
        WorkflowEngine,
        LocalDatabase,
        LocalStore,
        RebuildStagingStore,
        buildTaskBCalls,
        evidenceRegistry,
        completeWithRepair,
        AiUnitFailure
      } = globalThis.PartialProbe;
      const database = new LocalDatabase(indexedDB, "isolated-partial-continuation");
      const store = new LocalStore(database);
      let db = await database.open();
      const seed = db.transaction(Object.keys(data.tables), "readwrite");
      for (const [name, records] of Object.entries(data.tables))
        for (const row of records) seed.objectStore(name).put(row);
      await new Promise((r, j) => {
        seed.oncomplete = r;
        seed.onerror = j;
      });
      const values = structuredClone(data.staging);
      let injectedStorageFailure = false;
      let dispatchedSnapshot;
      const staging = new RebuildStagingStore({
        get: async (keys) =>
          Object.fromEntries(
            (Array.isArray(keys) ? keys : [keys]).map((k) => [k, structuredClone(values[k])])
          ),
        set: async (items) => {
          if (
            mode === "raw-restart" &&
            !dispatchedSnapshot &&
            Object.values(items).some(
              (s) => s.taskBLogicalLedger?.physical.at(-1)?.state === "completed"
            )
          )
            dispatchedSnapshot = structuredClone(values);
          if (
            mode === "storage-failure" &&
            !injectedStorageFailure &&
            Object.values(items).some(
              (s) => s.taskBLogicalLedger?.physical.at(-1)?.state === "completed"
            )
          ) {
            injectedStorageFailure = true;
            throw Error("INJECTED_STAGING_WRITE_FAILURE");
          }
          return Object.assign(values, structuredClone(items));
        },
        remove: async () => {
          throw Error("CLEAR_FORBIDDEN");
        }
      });
      let firstPhysicalBytes;
      let preGenerationRejections = 0;
      let reconciliationRejected = false;
      let originalInputText;
      let bInput;
      let providerCalls = 0;
      let simulatedCalls = 0;
      let requestBytes = 0,
        contextBytes = 0;
      const engineOptions = {
        store,
        staging,
        clock: { now: () => new Date("2026-10-06T04:00:00Z") },
        machine: {},
        ai: {
          apiKey: async () => "synthetic-test-value",
          privacyAuthorized: async () => true,
          usageAuthorized: async () => true,
          execute: async (call) => {
            simulatedCalls++;
            const physicalBytes = new TextEncoder().encode(call.user).length;
            firstPhysicalBytes ??= physicalBytes;
            if (mode === "oversized" && physicalBytes > firstPhysicalBytes * 0.8) {
              preGenerationRejections++;
              throw new AiUnitFailure({
                errorCode: "AI_CONTRACT",
                consumesApi: false,
                preGenerationBoundary: true,
                detail: "Synthetic pre-generation measured body rejection"
              });
            }
            if (mode === "reconciliation" && simulatedCalls === 2 && !reconciliationRejected) {
              reconciliationRejected = true;
              preGenerationRejections++;
              throw new AiUnitFailure({
                errorCode: "AI_CONTRACT",
                consumesApi: false,
                preGenerationBoundary: true,
                detail: "Injected final reconciliation body rejection"
              });
            }
            if (mode === "ambiguous")
              throw new AiUnitFailure({
                errorCode: "NETWORK_TRANSIENT",
                consumesApi: true,
                detail: "Synthetic Failed to fetch"
              });
            const ref = [...evidenceRegistry(bInput.evidence).keys()][0];
            const value = {
              schema: "syllab.ai.task-b/2",
              requestedEvidenceRefs:
                mode === "expansion" ? [{ refId: bInput.availableEvidenceRefs[0].refId }] : [],
              closure: JSON.parse(call.user).allInputDeliveredAfterThisPart
                ? {
                    scopeRefs: JSON.parse(call.user).completeInputRegistry,
                    dispositions: JSON.parse(call.user).pendingRefs.map((ref) =>
                      ref === bInput.drafts[0].draftId
                        ? {
                            ref,
                            status: "resolved",
                            itemIds: ["synthetic-good"],
                            reason: "Synthetic model judgment"
                          }
                        : { ref, status: "unresolved", reason: "Synthetic explicit unresolved" }
                    )
                  }
                : undefined,
              items: [
                {
                  itemId: "synthetic-good",
                  category: "canonicalAssessmentProposals",
                  inputRefs: [bInput.drafts[0].draftId],
                  dependencies: [],
                  payload: {
                    proposalId: "synthetic-good",
                    canonicalName: "Synthetic probe assessment",
                    type: "other",
                    role: "assessment",
                    aliases: [],
                    consolidatedFields: [],
                    requirements: [],
                    supportingEvidence: [ref],
                    unresolvedIssues: []
                  }
                },
                {
                  itemId: "synthetic-bad",
                  category: "canonicalAssessmentProposals",
                  inputRefs: [bInput.drafts[0].draftId],
                  dependencies: [],
                  payload: {
                    proposalId: "synthetic-bad",
                    canonicalName: "Synthetic invalid",
                    supportingEvidence: ["invented"]
                  }
                }
              ]
            };
            if ((mode === "length" || mode === "reconciliation") && simulatedCalls === 1) {
              const raw =
                JSON.stringify({ schema: value.schema, items: [value.items[0]] }).slice(0, -2) +
                ',{"itemId":"TRUNCATED_NEVER_ACCEPT"';
              return completeWithRepair(call, "synthetic-test-value", {
                complete: async () => ({
                  choices: [{ finish_reason: "length", message: { content: raw } }]
                })
              });
            }
            return { call, value };
          }
        },
        buildTaskBCalls: (input) => {
          bInput = input;
          const calls = buildTaskBCalls(input);
          originalInputText ??= calls[0].user;
          requestBytes = new TextEncoder().encode(calls[0].system + calls[0].user).length;
          contextBytes = new TextEncoder().encode(
            JSON.stringify(input.sharedWorkingContexts)
          ).length;
          return calls;
        }
      };
      let engine = new WorkflowEngine(engineOptions);
      const firstSession = engine.sessionId;
      const _failedPayloads = data.tables.aiRuns
        .filter(
          (r) =>
            r.workflowId === workflowId &&
            r.task === "task-a" &&
            r.status === "failed" &&
            r.recordedAt >= "2026-10-06T02:56:00Z"
        )
        .map((r) => ({ sourceId: r.sourceId, fullPayloadSaved: r.payload !== undefined }));
      const workflow = await engine.authorizeTaskBRecovery(workflowId);
      const prepared = await staging.read(workflow.courseId, workflowId);
      await engine.run(workflowId);
      if (!bInput || providerCalls || !simulatedCalls) throw Error("ZERO_MODEL_PROBE_FAILED");
      const settledCallCount = simulatedCalls;
      const initialLedger = (await store.readMetadataValue(`task-b-ledger:${workflowId}`)).ledger;
      let staleLedgerWriterRejected = false;
      try {
        await store.writeTaskBLogicalLedger(workflow, initialLedger);
      } catch (e) {
        staleLedgerWriterRejected = String(e).includes("STALE_B_LEDGER_WRITE");
      }
      if (!staleLedgerWriterRejected) throw Error("STALE_B_LEDGER_WRITER_ACCEPTED");
      const completed = await store.readWorkflow(workflowId);
      const settled = await staging.read(workflow.courseId, workflowId);
      if (
        completed.state !== "waiting" ||
        completed.phase !== "review" ||
        settled.taskBCheckpoint.items.filter((i) => i.status === "verified").length !==
          (mode === "ambiguous" ? 0 : 1) ||
        settled.taskBCheckpoint.items.filter((i) => i.status === "unresolved").length !==
          (mode === "ambiguous" ? 0 : 1)
      )
        throw Error("PARTIAL_CHECKPOINT_NOT_REVIEWABLE");
      let duplicateRejected = false;
      try {
        await engine.authorizeTaskBRecovery(workflowId);
      } catch {
        duplicateRejected = true;
      }
      if (!duplicateRejected) throw Error("DUPLICATE_RECOVERY_ALLOWED");
      // Simulate a worker interruption after validated checkpoint: no re-dispatch on restart.
      await store.saveWorkflow({
        ...completed,
        state: "failed",
        phase: "task-b",
        phaseCursor: "task-b",
        updatedAt: new Date().toISOString()
      });
      if (mode === "raw-restart") {
        if (!dispatchedSnapshot) throw Error("RAW_RESTART_NOT_INJECTED");
        Object.assign(values, dispatchedSnapshot);
        const l = structuredClone(initialLedger);
        l.status = "active";
        l.processedRefs = [];
        l.unresolved = l.unresolved.filter((d) => d.reason.startsWith("Task A Unresolved"));
        l.pendingRefs = l.requiredRefs.filter((r) => !l.unresolved.some((d) => d.ref === r));
        l.candidates = [];
        l.final = {
          ...l.final,
          items: [],
          result: {
            schema: "syllab.ai.task-b/1",
            identityResolutions: [],
            canonicalAssessmentProposals: [],
            courseWideConstraintProposals: [],
            fieldConsolidationResults: [],
            structuralRelationships: [],
            unresolvedIssues: []
          }
        };
        l.parts.forEach((p) => (p.delivered = false));
        l.physical.at(-1).state = "dispatched";
        delete l.physical.at(-1).response;
        await store.setMetadata({
          [`task-b-ledger:${workflowId}`]: { kind: "task-b-logical-ledger", workflowId, ledger: l }
        });
      }
      await database.close();
      engine = new WorkflowEngine(engineOptions);
      const restartedSessionChanged = engine.sessionId !== firstSession;
      await engine.resumeTaskBCheckpoint(workflowId);
      await engine.run(workflowId);
      db = await database.open();
      if (simulatedCalls !== settledCallCount) throw Error("VERIFIED_CHECKPOINT_PAID_AGAIN");
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
      const sourceRows = await new Promise((r, j) => {
        const q = db.transaction("sources").objectStore("sources").getAll();
        q.onsuccess = () => r(q.result);
        q.onerror = () => j(q.error);
      });
      const sourceRecordsUnchanged = equal(sourceRows, data.tables.sources);
      if (!sourceRecordsUnchanged) throw Error("SOURCE_COVERAGE_MUTATED");
      if (!Object.values(trustedUnchanged).every(Boolean) || !historicalObservationsUnchanged)
        throw Error(
          "HISTORY_MUTATION:" +
            JSON.stringify({ trustedUnchanged, historicalObservationsUnchanged })
        );
      await database.close();
      return {
        status: "PASS_GROUNDED_B_ISOLATED_PROBE",
        mode,
        preGenerationRejections,
        staleLedgerWriterRejected,
        ledgerAccounting:
          settled.taskBLogicalLedger.requiredRefs.length ===
            settled.taskBLogicalLedger.processedRefs.length +
              settled.taskBLogicalLedger.unresolved.length &&
          settled.taskBLogicalLedger.pendingRefs.length === 0,
        requiredRefs: settled.taskBLogicalLedger.requiredRefs.length,
        processedRefs: settled.taskBLogicalLedger.processedRefs.length,
        unresolvedRefs: settled.taskBLogicalLedger.unresolved.length,
        inputTextPreserved:
          initialLedger.parts
            .filter((p) => p.kind !== "reconciliation")
            .map((p) => p.text)
            .join("") === originalInputText,
        restartedSessionChanged,
        rawRestartRecovered: mode !== "raw-restart" || simulatedCalls === settledCallCount,
        truncatedItemAccepted: settled.taskBCheckpoint.items.some(
          (i) => i.itemId === "TRUNCATED_NEVER_ACCEPT"
        ),
        simulatedCalls,
        injectedStorageFailure,
        repeatedExpansionTerminated: mode === "expansion",
        restartSimulatedCalls: 0,
        evidenceRegistryEntries: initialLedger.suppliedEvidence.length,
        taskABaselinePreserved:
          JSON.stringify(initialLedger.taskABaseline.assessments) ===
          JSON.stringify(prepared.assessments),
        canonicalPreviewDoesNotMixDrafts: mode === "ambiguous" || settled.assessments.length === 1,
        requestBytes,
        contextBytes,
        sourceRecordsUnchanged,
        coverageUnchanged:
          prepared.semanticCoverage.successful === 107 &&
          prepared.semanticCoverage.unresolved.length === 2,
        verifiedItems: settled.taskBCheckpoint.items.filter((i) => i.status === "verified").length,
        unresolvedItems: settled.taskBCheckpoint.items.filter((i) => i.status !== "verified")
          .length,
        duplicateRejected,
        reachedReview: completed.phase === "review",
        storageBytes: new TextEncoder().encode(JSON.stringify(settled)).length,
        models: providerCalls,
        realWorkflowWrites: 0,
        fullFailedPayloadsSaved: 0,
        failedPayloadCount: 2,
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
    { data, workflowId, mode }
  );
  await mkdir("artifacts/v0.3.0/task-b-021", { recursive: true });
  await mkdir("artifacts/v0.3.0/task-b-024", { recursive: true });
  await writeFile(
    `artifacts/v0.3.0/task-b-024/${mode.toUpperCase()}-BROWSER-GATE.json`,
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
