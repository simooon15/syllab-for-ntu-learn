import { build } from "esbuild";
import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { resolve } from "node:path";
const data = JSON.parse(await readFile("evidence/private/v030-gate-br-028/BEFORE.json", "utf8"));
await build({
  stdin: {
    contents: `export{WorkflowEngine}from'./extension/src/v2/workflow';export{LocalDatabase}from'./extension/src/v2/storage';export{LocalStore}from'./extension/src/v2/store';export{RebuildStagingStore}from'./extension/src/v2/staging';export{buildTaskACalls,buildTaskBCalls}from'./extension/src/v2/ai-pipeline';`,
    resolveDir: process.cwd(),
    loader: "ts"
  },
  bundle: true,
  format: "iife",
  globalName: "Probe",
  outfile: ".tmp/v030-028-validation-browser.js",
  plugins: [
    {
      name: "disabled",
      setup(b) {
        b.onResolve({ filter: /qa-telemetry$/ }, () => ({
          path: resolve("extension/src/v2/qa-telemetry.disabled.ts")
        }));
      }
    }
  ]
});
const server = createServer((q, r) => r.end("<title>Isolated recovery</title>"));
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const p = await browser.newPage();
  await p.goto(`http://127.0.0.1:${server.address().port}`);
  await p.addScriptTag({ path: ".tmp/v030-028-validation-browser.js" });
  const proof = await p.evaluate(async (data) => {
    const {
      WorkflowEngine,
      LocalDatabase,
      LocalStore,
      RebuildStagingStore,
      buildTaskACalls,
      buildTaskBCalls
    } = globalThis.Probe;
    const db = new LocalDatabase(indexedDB, "isolated028"),
      store = new LocalStore(db),
      native = await db.open(),
      t = native.transaction(Object.keys(data.tables), "readwrite");
    for (const [n, rows] of Object.entries(data.tables))
      for (const row of rows) t.objectStore(n).put(row);
    await new Promise((r, j) => {
      t.oncomplete = r;
      t.onerror = j;
    });
    const values = structuredClone(data.staging);
    const staging = new RebuildStagingStore({
      get: async (keys) =>
        Object.fromEntries(
          (Array.isArray(keys) ? keys : [keys]).map((k) => [k, structuredClone(values[k])])
        ),
      set: async (items) => Object.assign(values, structuredClone(items)),
      remove: async () => {
        throw Error("REMOVE_FORBIDDEN");
      }
    });
    const wid = "wf_ebdef177ba1a33bbc520b577",
      before = JSON.stringify(
        data.tables.aiRuns.filter((r) => r.workflowId === wid && r.taskAPackage)
      );
    const all = async (name) =>
      new Promise((r, j) => {
        const q = native.transaction(name).objectStore(name).getAll();
        q.onsuccess = () => r(q.result);
        q.onerror = () => j(q.error);
      });
    const conservedNames = ["courses", "sources", "history"];
    const conservedBefore = Object.fromEntries(
      await Promise.all(conservedNames.map(async (n) => [n, JSON.stringify(await all(n))]))
    );
    const otherWorkflowsBefore = JSON.stringify(
      (await all("workflows")).filter((w) => w.workflowId !== wid)
    );
    let calls = 0,
      evidenceCount = 0,
      sourceCount = 0;
    const engine = new WorkflowEngine({
      store,
      staging,
      clock: { now: () => new Date() },
      physicalBatching: true,
      machine: {
        visualParts: async () => {
          throw Error("VISION_FORBIDDEN");
        }
      },
      ai: {
        apiKey: async () => "synthetic",
        privacyAuthorized: async () => true,
        usageAuthorized: async () => true,
        execute: async (call) => {
          if (call.task !== "task-b") throw Error("TASK_A_FORBIDDEN");
          calls++;
          if (calls > 1) throw Error("SECOND_REQUEST_FORBIDDEN");
          const b = JSON.parse(call.user);
          evidenceCount = b.suppliedEvidenceRegistry.length;
          sourceCount = JSON.parse(b.inputPart.text).sharedWorkingContexts.length;
          const draft = JSON.parse(b.inputPart.text).drafts[0];
          const alias = b.suppliedEvidenceRegistry[0].ref;
          return {
            call,
            value: {
              schema: "syllab.ai.task-b/2",
              items: [
                {
                  itemId: "synthetic",
                  inputRefs: [draft.draftId],
                  dependencies: [],
                  category: "canonicalAssessmentProposals",
                  payload: {
                    proposalId: "synthetic",
                    canonicalName: "Synthetic",
                    type: "other",
                    role: "assessment",
                    aliases: [],
                    consolidatedFields: [],
                    requirements: [],
                    supportingEvidence: [alias],
                    unresolvedIssues: []
                  }
                }
              ],
              closure: {
                scopeRefs: b.completeInputRegistry,
                dispositions: b.pendingRefs.map((ref) => ({
                  ref,
                  status: ref === draft.draftId ? "resolved" : "unresolved",
                  reason: "Synthetic regression",
                  ...(ref === draft.draftId ? { itemIds: ["synthetic"] } : {})
                })),
                finalItemIds: ["synthetic"],
                retiredItems: [],
                unresolvedCandidateIds: []
              }
            }
          };
        }
      },
      buildTaskACalls,
      buildTaskBCalls,
      planChunks: () => {
        throw Error("LEGACY_FORBIDDEN");
      }
    });
    await engine.authorizeTaskBValidation(wid);
    const result = await engine.run(wid);
    let repeatBlocked = false;
    try {
      await engine.authorizeTaskBValidation(wid);
    } catch {
      repeatBlocked = true;
    }
    const l = (await store.readMetadataValue("task-b-ledger:" + wid)).ledger;
    return {
      stateConservation: Object.fromEntries(
        await Promise.all(
          conservedNames.map(async (n) => [n, conservedBefore[n] === JSON.stringify(await all(n))])
        )
      ),
      otherWorkflowsPreserved:
        otherWorkflowsBefore ===
        JSON.stringify((await all("workflows")).filter((w) => w.workflowId !== wid)),
      calls,
      evidenceCount,
      sourceCount,
      required: l.requiredRefs.length,
      canonical: l.final.result.canonicalAssessmentProposals.length,
      state: result.state,
      phase: result.phase,
      error: result.errorCode,
      repeatBlocked,
      archivePreserved:
        JSON.stringify(
          (await store.readMetadataValue("b-validation-history:P2E-028:" + wid)).saved.ledger
        ) ===
        JSON.stringify(
          data.tables.appMetadata.find((x) => x.key === "task-b-ledger:" + wid).value.ledger
        ),
      taskAPreserved:
        before ===
        JSON.stringify(
          (
            await new Promise((r, j) => {
              const q = native.transaction("aiRuns").objectStore("aiRuns").getAll();
              q.onsuccess = () => r(q.result);
              q.onerror = () => j(q.error);
            })
          ).filter((r) => r.workflowId === wid && r.taskAPackage)
        )
    };
  }, data);
  console.log(proof);
  await writeFile(
    "artifacts/v0.3.0/gate-br-028/B2-VALIDATION-REGRESSION.json",
    JSON.stringify(proof, null, 2)
  );
  if (
    Object.values(proof.stateConservation).some((v) => !v) ||
    !proof.otherWorkflowsPreserved ||
    !proof.taskAPreserved ||
    proof.calls !== 1 ||
    (proof.evidenceCount !== 151 && proof.evidenceCount !== 155) ||
    !proof.repeatBlocked ||
    !proof.archivePreserved ||
    proof.canonical !== 1
  )
    throw Error("REGRESSION_FAILED");
} finally {
  await browser.close();
  server.close();
}
