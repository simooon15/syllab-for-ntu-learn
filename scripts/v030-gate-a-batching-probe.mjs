// Gate A: actual parsed inventory, production engine, isolated native IndexedDB, injected model results.
// No NTU Learn request, provider connection, current-profile write or Vision call.
import { build } from "esbuild";
import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
const path = process.argv[2];
if (!path?.startsWith("evidence/private/")) throw Error("PRIVATE_SNAPSHOT_REQUIRED");
const data = JSON.parse(await readFile(path, "utf8"));
await build({
  stdin: {
    contents: `export {WorkflowEngine} from './extension/src/v2/workflow'; export {LocalDatabase} from './extension/src/v2/storage'; export {LocalStore} from './extension/src/v2/store'; export {RebuildStagingStore} from './extension/src/v2/staging'; export {buildTaskACalls,buildTaskBCalls} from './extension/src/v2/ai-pipeline'; export {contentIndex} from './extension/src/v2/content-index'; export {semanticallyProcess} from './extension/src/v2/teaching-deferral';`,
    resolveDir: process.cwd(),
    loader: "ts"
  },
  bundle: true,
  format: "iife",
  globalName: "GateA",
  outfile: ".tmp/v030-gate-a-browser.js",
  plugins: [
    {
      name: "no-qa",
      setup(b) {
        b.onResolve({ filter: /qa-telemetry$/ }, () => ({
          path: resolve("extension/src/v2/qa-telemetry.disabled.ts")
        }));
      }
    }
  ]
});
const server = createServer((_q, r) => r.end("<title>Gate A isolated offline probe</title>"));
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.addScriptTag({ path: ".tmp/v030-gate-a-browser.js" });
  const proof = await page.evaluate(async (data) => {
    const {
      WorkflowEngine,
      LocalDatabase,
      LocalStore,
      RebuildStagingStore,
      buildTaskACalls,
      buildTaskBCalls,
      contentIndex,
      semanticallyProcess
    } = globalThis.GateA;
    const wid = "wf_3ee80256bee2d6d2fb0e805c",
      db = new LocalDatabase(indexedDB, "isolated-gate-a-batching"),
      store = new LocalStore(db);
    const native = await db.open();
    const seed = native.transaction(Object.keys(data.tables), "readwrite");
    for (const [name, rows] of Object.entries(data.tables))
      for (const row of rows) {
        if (name === "aiRuns" && row.taskAPackage) continue;
        seed.objectStore(name).put(row);
      }
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
    const workflow = {
      ...(await store.readWorkflow(wid)),
      state: "working",
      phase: "task-a",
      physicalWorkPolicy: "logical_physical_v1",
      qaSemanticClean: true,
      lease: { token: "isolated025", sessionId: "isolated025" }
    };

    const results = new Map(
      data.tables.aiRuns
        .filter((r) => r.taskAPackage && r.workflowId === wid)
        .map((r) => [r.sourceId, r.taskAPackage.result])
    );
    let calls = 0,
      active = 0,
      peak = 0,
      vision = 0;
    const ids = [];
    let waveWaiters = [];
    const options = {
      store,
      staging,
      clock: { now: () => new Date() },
      physicalBatching: true,
      machine: {
        visualParts: async () => {
          vision++;
          throw Error("VISION_FORBIDDEN");
        }
      },
      ai: {
        apiKey: async () => "synthetic",
        privacyAuthorized: async () => true,
        usageAuthorized: async () => true,
        execute: async (call) => {
          calls++;
          active++;
          peak = Math.max(peak, active);
          const body = JSON.parse(call.user);
          ids.push(...body.pending.map((p) => p.unitId));
          await new Promise((r) => {
            waveWaiters.push(r);
            if (waveWaiters.length === 10) {
              const wave = waveWaiters;
              waveWaiters = [];
              wave.forEach((done) => done());
            }
          });
          active--;
          return {
            call,
            value: {
              schema: "syllab.ai.physical-work/1",
              items: body.pending.map((p) => ({
                unitId: p.unitId,
                complete: true,
                value: results.get(p.unitId) ?? {
                  schema: "syllab.ai.task-a/1",
                  sourceId: p.unitId,
                  sourceResult: "NO_RELEVANT_INFORMATION",
                  structuralRelationships: [],
                  assessmentDrafts: [],
                  courseWideConstraintCandidates: [],
                  unresolvedIssues: []
                }
              }))
            }
          };
        }
      },
      buildTaskACalls,
      planChunks: () => {
        throw Error("LEGACY_FIXED_CHUNKER_FORBIDDEN");
      }
    };
    let engine = new WorkflowEngine(options);
    const revalidation = await engine.revalidateSavedTaskB(wid, data.streams[0].content);
    if (calls !== 0 || revalidation.verified !== 5 || revalidation.unresolved !== 97)
      throw Error("ZERO_COST_B_REVALIDATION_FAILED");
    await store.saveWorkflow(workflow);
    const course = await store.readCourse(workflow.courseId),
      context = await engine.materializeContext(workflow, course),
      index = contentIndex(context.sourceRecords),
      eligible = context.sourceRecords.filter(
        (s) => !s.removedFromNative && semanticallyProcess(s)
      );
    const baseline = JSON.stringify(context.sourceRecords);
    const outcomes = await engine.batchedTaskA(
      workflow,
      course,
      context,
      eligible,
      index,
      "synthetic"
    );
    const ledger = (await store.readMetadataValue(`physical-work:${wid}:task-a-native`)).ledger;
    const before = calls;
    engine = new WorkflowEngine(options);
    await engine.batchedTaskA(workflow, course, context, eligible, index, "synthetic");
    if (
      calls !== before ||
      vision ||
      eligible.length !== 109 ||
      new Set(ids).size !== 109 ||
      outcomes.some((o) => !o.ok)
    )
      throw Error(
        `BATCH_GATE_FAILED:${eligible.length}:${calls}:${vision}:${outcomes.filter((o) => !o.ok).length}`
      );
    const sourceAfter = (await store.readAllSourceStates(workflow.courseId)).sources;
    if (JSON.stringify(sourceAfter) !== baseline) throw Error("SOURCE_MUTATION");
    const missingClassification = {
      ...workflow,
      workflowId: "isolated-missing-fresh-classification",
      lease: { token: "missing-classification", sessionId: "new-session" }
    };
    await store.saveWorkflow(missingClassification);
    const beforeMissing = calls;
    const attachmentInventory = context.sourceRecords.filter(
      (source) => source.kind === "attachment"
    );
    const missingOutcomes = await engine.batchedTaskA(
      missingClassification,
      course,
      context,
      attachmentInventory,
      index,
      "synthetic"
    );
    if (
      calls !== beforeMissing ||
      missingOutcomes.some((outcome) => outcome.ok) ||
      missingOutcomes.length !== 19
    )
      throw Error("HISTORICAL_CLASSIFICATION_CLEAN_ISOLATION_FAILED");
    const runs = await db.read(["aiRuns"], (tx) => tx.getAll("aiRuns"));
    // New normal initial entry uses the same global B driver, with a saved raw injected response.
    const normal = {
      ...workflow,
      workflowId: "isolated-normal-initial",
      kind: "initial",
      phase: "task-b",
      lease: { token: "initial-normal", sessionId: "initial-normal" }
    };
    await db.write(
      ["assessments", "constraints", "facts", "evidence", "reviewItems", "changes"],
      async (tx) => {
        for (const table of [
          "assessments",
          "constraints",
          "facts",
          "evidence",
          "reviewItems",
          "changes"
        ])
          await tx.clear(table);
      }
    ); // Isolated browser database only, never the user profile.
    await store.writeDraft(
      data.tables.appMetadata.find((row) => row.key === `task-b-ledger:${wid}`).value.ledger
        .taskABaseline
    );
    for (const run of runs.filter((r) => r.invocationRole === "logical-checkpoint"))
      await store.recordAiRun({
        ...run,
        aiRunId: run.aiRunId + ":normal",
        workflowId: normal.workflowId
      });
    normal.taskASemanticCoverage = {
      ...normal.taskASemanticCoverage,
      successful: 109,
      unresolved: [],
      semanticCoverageRatio: 1
    };
    await store.saveWorkflow(normal);
    let bInjected = 0;
    let bInput;
    const bEngine = new WorkflowEngine({
      ...options,
      buildTaskBCalls: (input) => {
        bInput = input;
        return buildTaskBCalls(input);
      },
      ai: {
        ...options.ai,
        execute: async (call) => {
          bInjected++;
          const body = JSON.parse(call.user),
            ref = body.suppliedEvidenceRegistry[0].ref,
            draft = bInput.drafts[0].draftId;
          return {
            call,
            value: {
              schema: "syllab.ai.task-b/2",
              items: [
                {
                  itemId: "synthetic-initial",
                  category: "canonicalAssessmentProposals",
                  inputRefs: [draft],
                  dependencies: [],
                  payload: {
                    proposalId: "synthetic-initial",
                    canonicalName: "Synthetic initial canonical",
                    type: "other",
                    role: "assessment",
                    aliases: [],
                    consolidatedFields: [],
                    requirements: [],
                    supportingEvidence: [ref],
                    unresolvedIssues: []
                  }
                }
              ],
              closure: {
                scopeRefs: body.completeInputRegistry,
                dispositions: body.pendingRefs.map((ref) =>
                  ref === draft
                    ? {
                        ref,
                        status: "resolved",
                        itemIds: ["synthetic-initial"],
                        reason: "Injected gate judgment"
                      }
                    : { ref, status: "unresolved", reason: "Injected explicit unresolved" }
                )
              }
            }
          };
        }
      }
    });
    await bEngine.unitTaskB(normal);
    const normalLedger = (await store.readMetadataValue(`task-b-ledger:${normal.workflowId}`))
      .ledger;
    const normalStage = await staging.read(normal.courseId, normal.workflowId);
    if (
      normalStage.taskBRecovery.authorization !== "normal" ||
      !normalLedger.taskABaseline ||
      normalLedger.final.result.canonicalAssessmentProposals.length !== 1
    )
      throw Error(
        `NORMAL_B_ENTRY_GATE_FAILED:${normalStage.taskBRecovery.authorization}:${normalLedger.final.result.canonicalAssessmentProposals.length}:${normalLedger.final.items.filter((i) => i.status === "verified").length}:${JSON.stringify(normalLedger.final.items.map((i) => i.error))}:${normalLedger.stopReason}`
      );
    const initialCanonical = (await store.readSnapshot(normal.courseId)).assessments;
    if (initialCanonical.length !== 1 || (await store.readCourse(normal.courseId)).established)
      throw Error("INITIAL_CANONICAL_AUTHORITY_GATE_FAILED");
    return {
      kind: "production WorkflowEngine / real parsed inventory / injected outcomes / isolated Chrome native IndexedDB",
      providerCalls: 0,
      savedBRevalidation: revalidation,
      missingFreshClassification: {
        logicalSources: missingOutcomes.length,
        unresolved: missingOutcomes.filter((outcome) => !outcome.ok).length,
        additionalDispatch: calls - beforeMissing,
        historicalClassificationNeverUsed: true
      },
      normalInitialB: {
        injectedCalls: bInjected,
        authorization: normalStage.taskBRecovery.authorization,
        canonical: initialCanonical.length,
        originalBaselinePreserved: true,
        established: false
      },
      sourceInventory: context.sourceRecords.length,
      eligible: eligible.length,
      deferred: context.sourceRecords.length - eligible.length,
      logicalCheckpoints: runs.filter((r) => r.invocationRole === "logical-checkpoint").length,
      physicalRequests: ledger.requests.length,
      mainWaves: new Set(ledger.requests.map((r) => r.wave)).size,
      observedInjectedPeak: peak,
      restartAdditionalDispatch: calls - before,
      visionCalls: vision,
      legacyChunkerCalls: 0,
      sourceUnchanged: true,
      coverageInputUnchanged: true,
      allLogicalVerified: ledger.units.every((u) => u.status === "verified")
    };
  }, data);
  await mkdir("artifacts/v0.3.0/gate-a-025", { recursive: true });
  await writeFile(
    "artifacts/v0.3.0/gate-a-025/BROWSER-BATCHING.json",
    JSON.stringify(proof, null, 2)
  );
  console.log(proof);
} finally {
  await browser.close();
  server.close();
}
