/** P2E-056 RC2 production engine replay in new profiles. No network or model redispatch. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";
const root = resolve(process.cwd()),
  priv = resolve(
    process.argv.find((arg) => arg.startsWith("--output-dir="))?.slice("--output-dir=".length) ??
      join(root, "evidence/private/gate5-remediation-056")
  ),
  prev = join(root, "evidence/private/goal-driven-052/continuation-054/selective-real-1"),
  prior = join(root, "evidence/private/goal-driven-052/continuation-053/selective-real-1"),
  runs = join(root, "evidence/private/gate5-remediation-056/product-real-1");
await fs.mkdir(priv, { recursive: true });
const sha = (x) => createHash("sha256").update(x).digest("hex"),
  read = async (p) => JSON.parse(await fs.readFile(p, "utf8"));
const diagnostic = process.argv.includes("--diagnostic-ui");
const productPreview = process.argv.includes("--product-preview");
const gate5 = process.argv.includes("--human-gate5");
assert(
  !gate5 || (diagnostic && productPreview && candidateRepairAuthorization()),
  "GATE5_REQUIRES_AUTHORIZED_CANDIDATE"
);
function candidateRepairAuthorization() {
  return process.argv.some((x) => x.startsWith("--candidate-repair="));
}
assert(!productPreview || diagnostic, "PREVIEW_MUST_BE_UNVERIFIED_DIAGNOSTIC");
const candidateRepairHash = process.argv
  .find((x) => x.startsWith("--candidate-repair="))
  ?.slice("--candidate-repair=".length);
assert(
  !candidateRepairHash || (diagnostic && /^[a-f0-9]{64}$/.test(candidateRepairHash)),
  "REPAIRED_CANDIDATE_DIAGNOSTIC_ENTRY_ONLY"
);
const original = await read(join(prev, "candidate-projected.json"));
let saved = diagnostic ? undefined : await read(join(runs, "candidate.json"));
const records = new Map(),
  caches = new Map(),
  replayed = [];
for (const dir of [prior, prev, runs])
  for (const name of await fs.readdir(dir)) {
    if (/^[a-f0-9]{64}\.json$/.test(name)) {
      const r = await read(join(dir, name));
      if (r.state !== "captured") continue;
      assert.equal(r.bodySHA256, name.slice(0, -5));
      if (r.finishReason !== "stop" || !r.streamDone || !r.usage.usageKnown) continue; // Preserve failed captures; never replay them as a final semantic result.
      records.set(r.bodySHA256, r);
    }
  }
await build({
  stdin: {
    contents:
      'export * from "./extension/src/v2/selective-course";export * from "./extension/src/v2/course-product";export {directReviewItems} from "./extension/src/v2/direct-review";',
    resolveDir: root
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: join(priv, "browser-replay-runtime.mjs"),
  logLevel: "silent"
});
const R = await import(pathToFileURL(join(priv, "browser-replay-runtime.mjs")));
const port = {
  load: async (key) => {
    for (const dir of [runs, prev, prior]) {
      try {
        const v = await read(join(dir, "cache-" + sha(key) + ".json"));
        caches.set(key, v);
        return v;
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
    }
    throw Error("SAVED_CACHE_REQUIRED");
  },
  save: async (key, v) => caches.set(key, v),
  capture: async () => {
    throw Error("NO_PAID_REDISPATCH");
  }
};
if (diagnostic) {
  const raw = await read(
    join(runs, "7435eb3ffabe86b94a927ed42e6335c06d35aa459a6283017f3ed0f0d57fe4d2.json")
  );
  let product = R.validateCourseProduct(
    R.courseProductPacket(original.draft).decode(JSON.parse(raw.raw)),
    original.draft
  );
  if (candidateRepairHash) {
    const receipt = await read(join(runs, "knowledge-repaired-" + candidateRepairHash + ".json"));
    assert.equal(receipt.resumeProductHash, raw.bodySHA256, "CANDIDATE_BASE_MISMATCH");
    assert.equal(
      sha(JSON.stringify(receipt.product)),
      candidateRepairHash,
      "CANDIDATE_CONTENT_MISMATCH"
    );
    assert.equal(
      receipt.semanticAcceptance,
      false,
      "DIAGNOSTIC_CANNOT_PROMOTE_SEMANTIC_ACCEPTANCE"
    );
    if (gate5) assert.equal(receipt.authorization, "P2E-v0.3.0-2026-11-02-063");
    product = R.validateCourseProduct(receipt.product, original.draft);
  }
  const draft = { ...original.draft, product };
  delete draft.productVerification;
  const now = new Date().toISOString();
  const course = {
    ...original.course,
    semesterId: "isolated-056",
    established: false,
    currentRevision: 0,
    updatedAt: now,
    consecutiveCheckFailures: 0
  };
  const { candidate, output } = R.compileCourseDraft(draft, original.sources, {
    course,
    workflowId: "diagnostic-ui-056",
    exclusionKeys: new Set(),
    now,
    sources: new Map(
      original.sources.map((s) => [s.sourceId, { sourceId: s.sourceId, title: s.title }])
    ),
    sourceRecords: original.sources
  });
  saved = {
    course,
    sources: original.sources,
    draft,
    candidate,
    output,
    reviewItems: R.directReviewItems(candidate, course.courseId, "diagnostic-ui-056", now)
  };
} else {
  const d = await R.runSelectiveCourse(
    { course: original.course, sources: original.sources, completeScreening: true },
    port
  );
  await R.organizeCourseProduct(d, port, undefined, original.sources, (previous, riskReads) =>
    R.runSelectiveCourse(
      {
        course: { courseCode: original.course.courseCode, courseName: original.course.courseName },
        sources: original.sources,
        previous,
        completeScreening: true,
        riskReads
      },
      port
    )
  );
}
const extension = await fs.mkdtemp(join(priv, "qa-extension-")),
  profile = await fs.mkdtemp(join(priv, "qa-profile-"));
await fs.cp(join(root, "extension/dist"), extension, { recursive: true });
if (productPreview) {
  const { buildProductPreview } = await import("./lib/v030-product-preview.mjs");
  await buildProductPreview(root, extension, saved.course.courseId, gate5);
}
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
import {PRODUCT_COURSE_POLICY} from "./extension/src/v2/course-projection";
import {archiveCourseDraft} from "./extension/src/v2/course-draft-archive";
import {createBackup} from "./extension/src/v2/backup";
import {coverageFromObservations} from "./extension/src/v2/materialize";
const database = new LocalDatabase(indexedDB), store = new LocalStore(database), staging = new RebuildStagingStore(chrome.storage.local);
const forbidden = () => {throw Error("LEGACY_OR_NETWORK_PATH_FORBIDDEN");};
let frozenSources=[];
const machine={missingPermissionOrigins:async()=>[],discover:async()=>({coverage:{status:"Complete",pagesProcessed:1,issueCodes:[]},sources:frozenSources.map(({sourceId,nativeItemId,title,kind,parentSourceId,discovery})=>({sourceId,nativeItemId,title,kind,parentSourceId,discovery}))}),fetchAndParse:async source=>{const s=frozenSources.find(s=>s.sourceId===source.sourceId);if(!s?.parsed)throw Error("FROZEN_PARSE_MISSING");return {sourceId:s.sourceId,nativeItemId:s.nativeItemId,parentSourceId:s.parentSourceId,kind:s.kind,title:s.title,text:s.parsed.text,structure:s.parsed.structure,units:s.parsed.units,contentHash:s.parsed.contentHash,canonicalization:s.parsed.canonicalization,pageLocators:s.parsed.pageLocators,fetchStatus:"ok",parseStatus:"ok"};}};
const ai = { apiKey: async () => "saved-evidence-only", privacyAuthorized: async () => true, usageAuthorized: async () => true,
  execute: async call => ({...await completeWithRepair(call,"saved-evidence-only",{complete: async (_key,request) => window.captured054(serializeProviderRequest(request))}),consumesApi:false}) };
const engine = new WorkflowEngine({store,staging,ai,clock:{now:()=>new Date()},directCourse:true,selectiveCourse:true,projectedCourse:true,
  machine,
  buildTaskACalls:forbidden,buildTaskAConsolidationCall:forbidden,buildTaskBCalls:forbidden,buildTaskBExpansionCall:forbidden,buildTaskCCalls:forbidden,planChunks:forbidden});
window.initial054 = async x => {
  await store.initialize(); await store.saveSemester({semesterId:x.course.semesterId,nativeSemesterId:x.course.semesterId,label:"Isolated QA snapshot",status:"Current",discoveredAt:new Date().toISOString(),updatedAt:new Date().toISOString()}); await store.upsertCourse(x.course); frozenSources=x.sources;
  const workflow = await engine.start(x.course,"initial");
  if (x.diagnostic) {
    await store.writeDraft({ ...x.candidate.bundle, assessments:x.candidate.assessments, constraints:x.candidate.constraints, sources:x.sources, reviewItems:x.reviewItems });
    await store.writeCourseDraftArchive(x.course.courseId,archiveCourseDraft(x.draft,workflow.workflowId,new Date().toISOString()));
    await store.setMetadata({["direct-course-checkpoint:"+x.course.courseId]:{ledger:{draft:x.draft,readingSummary:["DIAGNOSTIC UI ONLY: real saved model candidate has not passed semantic audit."]}}});
    const waiting = { ...workflow, phase:"review",phaseCursor:"complete",state:"waiting",waitingReason:"review" }; await store.saveWorkflow(waiting);
    return {workflow:waiting,snapshot:await store.readSnapshot(x.course.courseId),trusted:await store.readTrustedSnapshot(x.course.courseId)};
  }
  await store.writeDraft({sources:x.sources});
  await store.setMetadata(Object.fromEntries(x.caches.map(([key,value])=>[key,{kind:"physical-work-ledger",workflowId:workflow.workflowId,courseId:x.course.courseId,ledger:{value}}])));
  await store.saveWorkflow({...workflow,phase:"task-b",phaseCursor:"start",state:"working"});
  const result = await engine.run(workflow.workflowId);
  return {workflow:result,snapshot:await store.readSnapshot(x.course.courseId),trusted:await store.readTrustedSnapshot(x.course.courseId),staged:await staging.read(x.course.courseId,workflow.workflowId)};
};
window.inspect054 = async id => ({snapshot:await store.readSnapshot(id),trusted:await store.readTrustedSnapshot(id),decisions:await store.readDecisions(id)});
window.backup056 = async () => createBackup(await store.readDurableTables(),new Date().toISOString());
window.archive056 = async id => store.readCourseDraftArchive(id);
window.clearInterpretationCache056 = async () => database.write(["appMetadata"], async transaction=>{const metadata=await transaction.metadata();for(const key of Object.keys(metadata))if(key.startsWith("direct-course-checkpoint:"))await transaction.delete("appMetadata",key);});
window.prepareRebuild056 = async ({courseId:id,editedFactId,originalReviews}) => {
 const snapshot=await store.readSnapshot(id);const beforeDraft=(await store.readCourseDraftArchive(id))?.draft; if(!snapshot||!beforeDraft?.product)throw Error("DIAGNOSTIC_PRODUCT_REQUIRED");
 const now=new Date().toISOString(),workflowId="diagnostic-rebuild-"+Date.now();
 const facts=snapshot.facts.map(f=>f.factId===editedFactId?{...f,value:{state:"KNOWN",value:"DIAGNOSTIC_REBUILT_VALUE"},userEdited:false,updatedAt:now}:f);
 await staging.write({courseId:id,workflowId,stagedAt:now,assessments:snapshot.assessments,constraints:snapshot.constraints,facts,evidence:await store.readEvidence([...new Set(facts.flatMap(f=>f.evidenceRefs.map(e=>e.evidenceId).filter(Boolean)))]),reviewItems:originalReviews.map(r=>({...r,workflowId})),changes:[],courseDraft:beforeDraft,taskACoverage:{failedSources:[],succeededSourceIds:[],relevantSourceIds:[]}});
 await store.saveWorkflow({workflowId,courseId:id,kind:"rebuild",state:"waiting",waitingReason:"review",phase:"review",phaseCursor:"start",attempt:0,createdAt:now,updatedAt:now,directCoursePolicy:PRODUCT_COURSE_POLICY});
 return {workflowId,editedFactId};
};
window.prepareIdentity056 = async id => {
 const snapshot=await store.readSnapshot(id),now=new Date().toISOString();const owner=snapshot.assessments[0];if(!owner)throw Error("OWNER_REQUIRED");
 const changeId="diagnostic-identity-"+Date.now();const owned=snapshot.facts.filter(f=>f.assessmentId===owner.assessmentId);const evidenceIds=[...new Set(owned.flatMap(f=>f.evidenceRefs.map(e=>e.evidenceId).filter(Boolean)))];const sources=(await store.readAllSourceStates(id)).sources;
 const dependencies=[...new Set(owned.flatMap(f=>f.evidenceRefs.map(e=>e.sourceId)))].map(sourceId=>{const source=sources.find(s=>s.sourceId===sourceId);return {sourceId,present:Boolean(source),contentHash:source?.machine?.contentHash??null};});
 const change={changeId,courseId:id,workflowId:"diagnostic-identity",targetId:owner.assessmentId,changeType:"IDENTITY_UNCERTAIN",currentValue:{state:"KNOWN",value:"DIAGNOSTIC_IDENTITY_A"},latestValue:{state:"KNOWN",value:"DIAGNOSTIC_IDENTITY_B"},currentEvidenceIds:evidenceIds,newEvidenceIds:evidenceIds,reviewSourceDependencies:dependencies,createdAt:now,updatedAt:now};
 await store.writeDraft({changes:[change],reviewItems:[{reviewItemId:changeId,courseId:id,workflowId:change.workflowId,kind:"identity",targetId:owner.assessmentId,payload:{changeId},createdAt:now,updatedAt:now}]});return change;
};
window.noChange054 = async id => {frozenSources=(await store.readAllSourceStates(id)).sources;const course=await store.readCourse(id);const w=await engine.start(course,"check");return await engine.run(w.workflowId);};
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
  await context.route("https://**/*", (r) => r.abort());
  const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker", { timeout: 30000 })),
    origin = `chrome-extension://${new URL(worker.url()).host}`;
  const control = await context.newPage();
  await control.exposeFunction("captured054", (body) => {
    const hash = sha(body),
      r = records.get(hash);
    assert(r, "UNSAVED_MODEL_REQUEST_FORBIDDEN");
    replayed.push({ hash, stage: r.stage });
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
    caches: [...caches],
    diagnostic,
    candidate: saved.candidate,
    reviewItems: saved.reviewItems,
    draft: saved.draft
  });
  await fs.writeFile(
    join(priv, diagnostic ? "diagnostic-ui-initial.json" : "engine-initial.json"),
    JSON.stringify(result, null, 2) + "\n"
  );
  assert.equal(result.workflow.phase, "review");
  assert.equal(result.workflow.state, "waiting");
  assert.equal(result.trusted.facts.length, 0);
  if (!diagnostic) assert.deepEqual(result.staged.courseDraft.clauses, original.draft.clauses);
  const entry = {
    profile,
    extension,
    origin,
    url: origin + "/app.html",
    ...(productPreview
      ? {
          previewUrl: origin + "/preview.html",
          productPreview: "UNVERIFIED / NOT RC2 / NOT TRUSTED"
        }
      : {}),
    courseId: saved.course.courseId,
    workflowId: result.workflow.workflowId,
    pendingReviewItems: result.snapshot.reviewItems.length,
    initialTrustedFacts: 0,
    paidCalls: 0,
    humanAcceptance: false,
    semanticAcceptance: false,
    diagnosticUIOnly: diagnostic,
    candidateRepairHash: candidateRepairHash ?? null,
    candidateBaseHash: diagnostic
      ? "7435eb3ffabe86b94a927ed42e6335c06d35aa459a6283017f3ed0f0d57fe4d2"
      : null
  };
  await fs.writeFile(
    join(priv, diagnostic ? "DIAGNOSTIC_QA_ENTRY.json" : "QA_ENTRY.json"),
    JSON.stringify(entry, null, 2) + "\n"
  );
  console.log(
    JSON.stringify({
      status: diagnostic
        ? "DIAGNOSTIC_UNVERIFIED_SEMANTICS_UI_ONLY"
        : "UNCONFIRMED_PRODUCTION_CANDIDATE_STAGED",
      pending: entry.pendingReviewItems,
      replayedPhysicalRequests: replayed.length,
      paidCalls: 0
    })
  );
} finally {
  await context.close();
}
