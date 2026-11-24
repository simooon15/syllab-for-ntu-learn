import { waitNativeCondition } from "./qa-native-wait.mjs";
/** Real captured model decisions through the production engine, IDB, staging and Review. No network/model dispatch. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import { build } from "esbuild";
import { chromium } from "playwright";
const root = resolve(process.cwd()),
  priv = join(root, "evidence/private/goal-driven-052/continuation-054"),
  pub = join(root, "artifacts/v0.3.0/goal-driven-054");
const prior = join(root, "evidence/private/goal-driven-052/continuation-053/selective-real-1"),
  runs = join(priv, "selective-real-1");
const sha = (v) => createHash("sha256").update(v).digest("hex"),
  read = async (p) => JSON.parse(await fs.readFile(p, "utf8"));
const saved = await read(join(runs, "candidate.json")),
  records = new Map(),
  caches = new Map(),
  replayed = [];
for (const dir of [prior, runs])
  for (const name of await fs.readdir(dir)) {
    if (!/^[a-f0-9]{64}\.json$/.test(name)) continue;
    const r = await read(join(dir, name));
    if (r.state !== "captured") continue;
    assert.equal(r.bodySHA256, name.slice(0, -5));
    assert.equal(r.finishReason, "stop");
    assert.equal(r.streamDone, true);
    assert.equal(r.usage.usageKnown, true);
    records.set(r.bodySHA256, r);
  }
await build({
  stdin: {
    contents:
      'export * from "./extension/src/v2/selective-course";export {serializeProviderRequest} from "./extension/src/v2/provider-request";',
    resolveDir: root
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: join(priv, "engine-index-runtime.mjs"),
  logLevel: "silent"
});
const R = await import(pathToFileURL(join(priv, "engine-index-runtime.mjs")));
await R.runSelectiveCourse(
  {
    course: { courseCode: saved.course.courseCode, courseName: saved.course.courseName },
    sources: saved.sources
  },
  {
    load: async (key) => {
      for (const dir of [runs, prior]) {
        try {
          const v = await read(join(dir, "cache-" + sha(key) + ".json"));
          caches.set(key, v);
          return v;
        } catch (e) {
          if (e.code !== "ENOENT") throw e;
        }
      }
      throw Error("EXPECTED_VALIDATED_SOURCE_CACHE_MISSING");
    },
    save: async (key, value) => {
      caches.set(key, value);
    },
    capture: async (call) => {
      const r = records.get(sha(R.serializeProviderRequest(call)));
      assert(r, "PRODUCTION_REQUEST_NOT_CAPTURED");
      return JSON.parse(r.raw);
    }
  }
);
const extension = join(priv, "unpacked-054-engine"),
  profile = await fs.mkdtemp(join(tmpdir(), "syllab054-engine-"));
await fs.cp(join(root, "extension/dist"), extension, { recursive: true });
await fs.writeFile(
  join(extension, "control.html"),
  '<html><script src="control.js"></script></html>'
);
await build({
  stdin: {
    contents: `
import {LocalStore} from "./extension/src/v2/store";
import {LocalDatabase} from "./extension/src/v2/storage";
import {WorkflowEngine} from "./extension/src/v2/workflow";
import {RebuildStagingStore} from "./extension/src/v2/staging";
import {completeWithRepair} from "./extension/src/v2/deepseek-complete";
import {serializeProviderRequest} from "./extension/src/v2/provider-request";
import {editFact} from "./extension/src/v2/course-state";
import {coverageFromObservations} from "./extension/src/v2/materialize";
const store = new LocalStore(new LocalDatabase(indexedDB)), staging = new RebuildStagingStore(chrome.storage.local);
const forbidden = () => {throw Error("LEGACY_OR_NETWORK_PATH_FORBIDDEN");};
let frozenSources=[];
const machine={missingPermissionOrigins:async()=>[],discover:async()=>({coverage:{status:"Complete",pagesProcessed:1,issueCodes:[]},sources:frozenSources.map(({sourceId,nativeItemId,title,kind,parentSourceId,discovery})=>({sourceId,nativeItemId,title,kind,parentSourceId,discovery}))}),fetchAndParse:async source=>{const s=frozenSources.find(s=>s.sourceId===source.sourceId);if(!s?.parsed)throw Error("FROZEN_PARSE_MISSING");return {sourceId:s.sourceId,nativeItemId:s.nativeItemId,parentSourceId:s.parentSourceId,kind:s.kind,title:s.title,text:s.parsed.text,structure:s.parsed.structure,units:s.parsed.units,contentHash:s.parsed.contentHash,canonicalization:s.parsed.canonicalization,pageLocators:s.parsed.pageLocators,fetchStatus:"ok",parseStatus:"ok"};}};
const ai = { apiKey: async () => "saved-evidence-only", privacyAuthorized: async () => true, usageAuthorized: async () => true,
  execute: async call => ({...await completeWithRepair(call,"saved-evidence-only",{complete: async (_key,request) => window.captured054(serializeProviderRequest(request))}),consumesApi:false}) };
const engine = new WorkflowEngine({store,staging,ai,clock:{now:()=>new Date()},directCourse:true,selectiveCourse:true,
  machine,
  buildTaskACalls:forbidden,buildTaskAConsolidationCall:forbidden,buildTaskBCalls:forbidden,buildTaskBExpansionCall:forbidden,buildTaskCCalls:forbidden,planChunks:forbidden});
window.initial054 = async x => {
  await store.initialize(); await store.upsertCourse(x.course); frozenSources=x.sources;
  const workflow = await engine.start(x.course,"initial");
  await store.writeDraft({sources:x.sources});
  await store.setMetadata(Object.fromEntries(x.caches.map(([key,value])=>[key,{kind:"physical-work-ledger",workflowId:workflow.workflowId,courseId:x.course.courseId,ledger:{value}}])));
  await store.saveWorkflow({...workflow,phase:"task-b",phaseCursor:"start",state:"working"});
  const result = await engine.run(workflow.workflowId);
  return {workflow:result,snapshot:await store.readSnapshot(x.course.courseId),trusted:await store.readTrustedSnapshot(x.course.courseId),staged:await staging.read(x.course.courseId,workflow.workflowId)};
};
window.inspect054 = async id => ({snapshot:await store.readSnapshot(id),trusted:await store.readTrustedSnapshot(id),decisions:await store.readDecisions(id)});
window.noChange054 = async id => {const course=await store.readCourse(id);const w=await engine.start(course,"check");return await engine.run(w.workflowId);};
window.prepareUpdate054 = async ({courseId:id,scenario}) => {
  let snapshot=await store.readSnapshot(id);
  const fact=snapshot.facts.find(f=>f.assessmentId===scenario.editedOwnerId&&f.field===scenario.editedField&&f.value.state==="KNOWN");
  if(!fact)throw Error("CONTROLLED_PART1_WEIGHT_MISSING");
  await store.commitMutation(id,editFact(snapshot,{factId:fact.factId,value:{state:"KNOWN",value:"41%"},expectedRevision:snapshot.course.currentRevision,now:new Date().toISOString()}));
  const text=scenario.text;
  const target=scenario.controlledSourceId;
  frozenSources=frozenSources.map(s=>s.sourceId!==target?s:{...s,title:"Course assessment update",parsed:{...s.parsed,text,structure:["Assessment update"],units:[{locator:"native-text",kind:"native",text,partial:false}],contentHash:undefined}});
  const trusted=await store.readTrustedSnapshot(id);let workflow=await engine.start(trusted.course,"check");
  while(workflow.phase!=="task-b") {if(!["working","queued","saved"].includes(workflow.state))throw Error("CONTROLLED_INGEST_NOT_WORKING:"+JSON.stringify(workflow));workflow=(await engine.step(workflow)).workflow;}
  const native=await store.readAllSourceStates(id), metadata=await store.readMetadataValue("direct-course-checkpoint:"+id);
  return {scenarioLabel:"CONTROLLED_SOURCE_CHANGE_NOT_OBSERVED_NTU_UPDATE",workflow,localCourse:trusted.course,course:{courseCode:trusted.course.courseCode,courseName:trusted.course.courseName},sources:native.sources,previous:metadata.ledger.draft,currentContext:{assessments:trusted.assessments,constraints:trusted.constraints,facts:trusted.facts.filter(f=>!f.superseded),decisions:await store.readDecisions(id)},currentEvidence:await store.readEvidence([...new Set(trusted.facts.flatMap(f=>f.evidenceRefs.map(e=>e.evidenceId).filter(Boolean)))]),coverage:coverageFromObservations(native.observations.filter(o=>o.workflowId===workflow.workflowId),native.sources.map(s=>s.sourceId)),editedFactId:fact.factId,controlledSourceId:target};
};

`,
    resolveDir: root,
    loader: "ts"
  },
  bundle: true,
  platform: "browser",
  format: "iife",
  outfile: join(extension, "control.js"),
  define: { __SYLLAB_QA_TELEMETRY__: "false" },
  logLevel: "silent"
});
const context = await chromium.launchPersistentContext(profile, {
  channel: "chromium",
  headless: true,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
});
try {
  const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker", { timeout: 30000 })),
    origin = `chrome-extension://${new URL(worker.url()).host}`;
  const control = await context.newPage();
  await control.exposeFunction("captured054", (body) => {
    const hash = sha(body),
      r = records.get(hash);
    assert(r, "ENGINE_TRANSPORT_REQUEST_NOT_CAPTURED");
    replayed.push({ hash, stage: r.call?.promptVersion ?? r.stage });
    return {
      choices: [{ message: { content: r.raw }, finish_reason: r.finishReason }],
      usage: {
        prompt_tokens: r.usage.inputTokens,
        completion_tokens: r.usage.outputTokens,
        prompt_cache_hit_tokens: r.usage.cacheHitTokens,
        prompt_cache_miss_tokens: r.usage.cacheMissTokens,
        completion_tokens_details: { reasoning_tokens: r.usage.reasoningTokens }
      }
    };
  });
  await control.goto(origin + "/control.html");
  const result = await control.evaluate((x) => window.initial054(x), {
    course: saved.course,
    sources: saved.sources,
    caches: [...caches]
  });
  await fs.writeFile(
    join(priv, "engine-initial-result.json"),
    JSON.stringify(result, null, 2) + "\n"
  );
  assert.equal(result.workflow.phase, "review");
  assert.equal(result.workflow.state, "waiting");
  assert.equal(result.trusted.facts.length, 0);
  assert.equal(result.staged.courseDraft.clauses.length, saved.draft.clauses.length);
  assert.deepEqual(result.staged.courseDraft.links, saved.draft.links);
  const app = await context.newPage();
  app.setDefaultTimeout(30000);
  const response = await control.evaluate(
    (courseId) =>
      chrome.runtime.sendMessage({
        contract: 2,
        type: "OPEN_SCREEN",
        surface: "full-page",
        courseId,
        screen: "IRV-01"
      }),
    saved.course.courseId
  );
  assert(response?.ok);
  await app.goto(origin + "/app.html");
  let cards = 0,
    bodies = 0,
    qualifiers = 0;
  while (cards < result.snapshot.reviewItems.length) {
    await app.getByRole("button", { name: "Confirm", exact: true }).waitFor();
    const state = await control.evaluate((id) => window.inspect054(id), saved.course.courseId),
      item = state.snapshot.reviewItems[0];
    assert(item);
    let more = app.getByRole("button", { name: "Show more", exact: true });
    while (await more.count()) {
      await more.first().click();
      more = app.getByRole("button", { name: "Show more", exact: true });
    }
    const text = await app.locator("body").textContent();
    for (const f of state.snapshot.facts.filter(
      (f) => f.assessmentId === item.targetId && f.field === "requirement"
    )) {
      assert(text.includes(f.semanticClause.content), "REAL_CLAUSE_MISSING_FROM_REVIEW");
      bodies++;
      for (const q of [...f.semanticClause.conditions, ...f.semanticClause.exceptions]) {
        assert(text.includes(q), "REAL_QUALIFIER_MISSING_FROM_REVIEW");
        qualifiers++;
      }
    }
    const rule = state.snapshot.constraints.find((c) => c.constraintId === item.targetId);
    if (rule) assert(text.includes(rule.content), "REAL_RULE_MISSING_FROM_REVIEW");
    for (const q of item.payload.unresolvedQuestions ?? [])
      assert(
        (await app.locator(".fact-question").allTextContents()).includes(q),
        "SCOPED_QUESTION_MISSING_FROM_REVIEW"
      );
    if (cards === 0)
      await app.screenshot({ path: join(priv, "engine-initial-review.png"), fullPage: true });
    // Automated acceptance only in this disposable profile; never Human semantic PASS.
    await app.getByRole("button", { name: "Confirm", exact: true }).click();
    await app.waitForFunction(() => !document.querySelector(".is-mutation-busy"));
    await waitNativeCondition(
      control,
      async ({ id, target }) =>
        !(await window.inspect054(id)).snapshot.reviewItems.some((i) => i.targetId === target),
      { id: saved.course.courseId, target: item.targetId }
    );
    cards++;
    if (cards < result.snapshot.reviewItems.length) await app.reload();
  }
  const after = await control.evaluate((id) => window.inspect054(id), saved.course.courseId);
  assert.equal(after.snapshot.reviewItems.length, 0);
  assert.equal(after.trusted.facts.length, result.snapshot.facts.length);
  for (const fact of result.snapshot.facts)
    assert.deepEqual(
      after.trusted.facts.find((f) => f.factId === fact.factId)?.semanticClause,
      fact.semanticClause
    );
  await fs.writeFile(
    join(priv, "engine-after-automated-confirm.json"),
    JSON.stringify(after, null, 2) + "\n"
  );
  const beforeCheckCalls = replayed.length;
  const checks = [];
  for (let i = 0; i < 2; i++) {
    const check = await control.evaluate((id) => window.noChange054(id), saved.course.courseId);
    await fs.writeFile(
      join(priv, `engine-no-change-${i + 1}.json`),
      JSON.stringify(check, null, 2) + "\n"
    );
    assert.equal(check.state, "complete");
    checks.push(check);
  }
  assert.equal(replayed.length, beforeCheckCalls, "UNCHANGED_CHECK_REQUESTED_MODEL");
  if (process.argv.includes("--prepare-incremental")) {
    const input = await control.evaluate(
      ({ id, scenario }) => window.prepareUpdate054({ courseId: id, scenario }),
      { id: saved.course.courseId, scenario: await read(join(priv, "controlled-scenario.json")) }
    );
    assert.equal(input.workflow.phase, "task-b");
    assert.equal(replayed.length, beforeCheckCalls, "INGEST_REQUESTED_MODEL");
    await fs.writeFile(
      join(priv, "engine-incremental-input.json"),
      JSON.stringify(input, null, 2) + "\n"
    );
  }
  const report = {
    schema: "syllab.real-engine-review/1",
    status: "AUTOMATED_PASS_HUMAN_PENDING",
    sourcePhase: "RESUME_EXISTING_REAL_NATIVE_SOURCES_AT_TASK_B",
    realModelDecisionReplay: true,
    providerBoundaryChecked: true,
    nativeEngine: true,
    nativeIDB: true,
    nativeStaging: true,
    initialTrustedFacts: 0,
    reviewCards: cards,
    independentRequirementDOMChecks: bodies,
    qualifierDOMChecks: qualifiers,
    transportReplayCount: replayed.length,
    paidDispatches: 0,
    unchangedFullEngineChecks: checks.length,
    unchangedCheckTransportRequests: replayed.length - beforeCheckCalls,
    originalProfileOpened: false,
    originalCourseRescans: 0,
    humanAcceptance: false
  };
  await fs.writeFile(join(pub, "REAL_ENGINE_REVIEW.json"), JSON.stringify(report, null, 2) + "\n");
  await fs.writeFile(
    join(priv, "engine-browser-profile.json"),
    JSON.stringify({ profile, extension, origin, replayed }, null, 2) + "\n"
  );
  console.log(JSON.stringify(report));
} finally {
  await context.close();
}
