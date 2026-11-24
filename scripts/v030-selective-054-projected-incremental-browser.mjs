import { waitNativeCondition } from "./qa-native-wait.mjs";
/** Resume a clone of the actual paused Check with exact saved provider responses. No API. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";
const root = resolve(process.cwd()),
  priv = join(root, "evidence/private/goal-driven-052/continuation-054");
const runs = join(priv, "selective-real-1"),
  prior = join(root, "evidence/private/goal-driven-052/continuation-053/selective-real-1");
const read = async (p) => JSON.parse(await fs.readFile(p, "utf8")),
  sha = (v) => createHash("sha256").update(v).digest("hex");
const variantArg = process.argv.find((a) => a.startsWith("--incremental-variant="));
const incrementalVariant = variantArg ? variantArg.slice("--incremental-variant=".length) : "";
assert(["", "current-auto"].includes(incrementalVariant));
const incrementalSuffix = incrementalVariant ? "-" + incrementalVariant : "";
const input = await read(
    join(priv, "engine-projected-incremental" + incrementalSuffix + "-input.json")
  ),
  checkpoint = await read(
    join(priv, "incremental-projected" + incrementalSuffix + "-profile.json")
  );
const records = new Map(),
  awaitBody = new Map(),
  caches = new Map(),
  replayed = [];
for (const dir of [prior, runs])
  for (const name of await fs.readdir(dir)) {
    if (!/^[a-f0-9]{64}\.json$/.test(name)) continue;
    const r = await read(join(dir, name));
    if (r.state !== "captured") continue;
    assert.equal(r.finishReason, "stop");
    assert.equal(r.streamDone, true);
    assert.equal(r.usage.usageKnown, true);
    records.set(r.bodySHA256, r);
    awaitBody.set(
      r.bodySHA256,
      await fs.readFile(join(dir, name.slice(0, -5) + ".request.json"), "utf8")
    );
  }
await build({
  stdin: {
    contents:
      'export * from "./extension/src/v2/selective-course";export * from "./extension/src/v2/course-projection";export {serializeProviderRequest} from "./extension/src/v2/provider-request";',
    resolveDir: root
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: join(priv, "incremental-projected-index-runtime.mjs"),
  logLevel: "silent"
});
const R = await import(pathToFileURL(join(priv, "incremental-projected-index-runtime.mjs")));
const semanticPort = {
  load: async (key) => {
    for (const dir of [runs, prior])
      try {
        const v = await read(join(dir, "cache-" + sha(key) + ".json"));
        caches.set(key, v);
        return v;
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
    throw Error("VALIDATED_SOURCE_CACHE_MISSING");
  },
  save: async (key, value) => {
    caches.set(key, value);
  },
  capture: async (call) => {
    const hash = sha(R.serializeProviderRequest(call)),
      r = records.get(hash);
    assert(r, "INDEX_REQUEST_NOT_CAPTURED:" + hash);
    return JSON.parse(r.raw);
  }
};
const draft = await R.runSelectiveCourse({ ...input, completeScreening: true }, semanticPort);
await R.projectCourseDraft(
  draft,
  semanticPort,
  input.previous.projection,
  {
    assessments: input.currentContext.assessments,
    constraints: input.currentContext.constraints,
    decisions: input.currentContext.decisions
  },
  undefined,
  undefined,
  input.previous
);
// Keep the paused recovery profile unchanged. This copy retains actual workflow/current/decisions.
const profile = await fs.mkdtemp(join(tmpdir(), "syllab054-projected-incremental-"));
await fs.cp(checkpoint.profile, profile, { recursive: true });
// Reset executable caches only in this disposable clone; preserve native IndexedDB/recovery.
for (const directory of ["Service Worker", "Code Cache"])
  await fs.rm(join(profile, "Default", directory), { recursive: true, force: true });
const extension = checkpoint.extension;
await fs.cp(join(root, "extension/dist"), extension, { recursive: true });
await fs.writeFile(
  join(extension, "incremental-control.html"),
  '<html><script src="incremental-control.js"></script></html>'
);
await build({
  stdin: {
    resolveDir: root,
    loader: "ts",
    contents: `
import {LocalStore} from "./extension/src/v2/store";
import {LocalDatabase} from "./extension/src/v2/storage";
import {WorkflowEngine} from "./extension/src/v2/workflow";
import {RebuildStagingStore} from "./extension/src/v2/staging";
import {completeWithRepair} from "./extension/src/v2/deepseek-complete";
import {serializeProviderRequest} from "./extension/src/v2/provider-request";
import {createBackup,validateBackup} from "./extension/src/v2/backup";
import {prepareRestore,applyRestore} from "./extension/src/v2/restore";
import {projectCourseDraft,courseProjectionCacheKey} from "./extension/src/v2/course-projection";
import {digest} from "./extension/src/v2/architecture-session";
const database=new LocalDatabase(indexedDB),store=new LocalStore(database),staging=new RebuildStagingStore(chrome.storage.local);
const forbidden=()=>{throw Error("NETWORK_OR_LEGACY_PATH_FORBIDDEN");};
let frozenSources=[];
const machine={missingPermissionOrigins:async()=>[],discover:async()=>({coverage:{status:"Complete",pagesProcessed:1,issueCodes:[]},sources:frozenSources.map(({sourceId,nativeItemId,title,kind,parentSourceId,discovery})=>({sourceId,nativeItemId,title,kind,parentSourceId,discovery}))}),fetchAndParse:async source=>{const s=frozenSources.find(s=>s.sourceId===source.sourceId);if(!s?.parsed)throw Error("FROZEN_PARSE_MISSING");return {sourceId:s.sourceId,nativeItemId:s.nativeItemId,parentSourceId:s.parentSourceId,kind:s.kind,title:s.title,text:s.parsed.text,structure:s.parsed.structure,units:s.parsed.units,contentHash:s.parsed.contentHash,canonicalization:s.parsed.canonicalization,pageLocators:s.parsed.pageLocators,fetchStatus:"ok",parseStatus:"ok"};}};
const ai={apiKey:async()=>"saved-evidence-only",privacyAuthorized:async()=>true,usageAuthorized:async()=>true,execute:async call=>({...await completeWithRepair(call,"saved-evidence-only",{complete:async(_key,request)=>window.captured054(serializeProviderRequest(request))}),consumesApi:false})};
const engineOptions={store,staging,ai,clock:{now:()=>new Date()},directCourse:true,selectiveCourse:true,projectedCourse:true,machine,buildTaskACalls:forbidden,buildTaskAConsolidationCall:forbidden,buildTaskBCalls:forbidden,buildTaskBExpansionCall:forbidden,buildTaskCCalls:forbidden,planChunks:forbidden};
const engine=new WorkflowEngine(engineOptions);
window.resume054=async x=>{await store.initialize();if(!(await store.readSemesters()).some(s=>s.semesterId===x.input.localCourse.semesterId))await store.saveSemester({semesterId:x.input.localCourse.semesterId,nativeSemesterId:x.input.localCourse.semesterId,label:"Isolated QA snapshot",status:"Current",discoveredAt:new Date().toISOString(),updatedAt:new Date().toISOString()});const before=await store.readTrustedSnapshot(x.input.localCourse.courseId);await store.setMetadata(Object.fromEntries(x.caches.map(([key,value])=>[key,{kind:"physical-work-ledger",workflowId:x.input.workflow.workflowId,courseId:x.input.localCourse.courseId,ledger:{value}}])));await store.saveWorkflow(x.input.workflow);const workflow=await engine.run(x.input.workflow.workflowId);return {before,workflow,snapshot:await store.readSnapshot(x.input.localCourse.courseId),trusted:await store.readTrustedSnapshot(x.input.localCourse.courseId),staged:await staging.read(x.input.localCourse.courseId,x.input.workflow.workflowId)};};
window.inspect054=async id=>{const snapshot=await store.readSnapshot(id);return {snapshot,trusted:await store.readTrustedSnapshot(id),decisions:await store.readDecisions(id),evidence:await store.readEvidence(snapshot.changes.flatMap(c=>[...c.currentEvidenceIds,...c.newEvidenceIds]))};};
window.rebuild054=async x=>{frozenSources=x.sources;const course=await store.readCourse(x.id);const before=await store.readTrustedSnapshot(x.id);const started=await engine.start(course,"rebuild");const workflow=await engine.run(started.workflowId);return {workflow,before,trusted:await store.readTrustedSnapshot(x.id),staged:await staging.read(x.id,workflow.workflowId)};};
window.staged054=async x=>staging.read(x.id,x.workflowId);
window.backup054=async()=>createBackup(await store.readDurableTables(),new Date().toISOString());
window.restore054=async backup=>{await validateBackup(backup);return applyRestore(database,await prepareRestore(backup));};
window.storeCount054=async()=>[...(await database.open()).objectStoreNames];
window.unknown054=async id=>{
 const checkpointKey="direct-course-checkpoint:"+id;
 const checkpoint=await store.readMetadataValue(checkpointKey);
 const draft=structuredClone(checkpoint.ledger.draft);delete draft.projection;delete draft.projectionVerification;
 const trusted=await store.readTrustedSnapshot(id);
 const current={assessments:trusted.assessments,constraints:trusted.constraints,decisions:await store.readDecisions(id)};
 let call;
 try{await projectCourseDraft(draft,{load:async()=>undefined,save:async()=>{},capture:async x=>{call=x;throw Error("PREPARED_NO_DISPATCH");}},undefined,current,undefined,undefined,draft);}catch(e){if(e.message!=="PREPARED_NO_DISPATCH")throw e;}
 if(!call)throw Error("UNKNOWN_PROBE_CALL_NOT_PREPARED");
 const key="course-draft-call:"+digest({system:call.system,user:call.user,maxTokens:call.maxTokens});
 const started=await engine.start(trusted.course,"rebuild");
 await store.setMetadata({[checkpointKey]:{...checkpoint,ledger:{...checkpoint.ledger,draft}},[courseProjectionCacheKey(draft,undefined,current)]:{kind:"physical-work-ledger",ledger:{}},[key]:{kind:"physical-work-ledger",workflowId:started.workflowId,courseId:id,ledger:{status:"dispatching"}}});
 await store.saveWorkflow({...started,phase:"task-b",phaseCursor:"start",state:"queued"});
 const first=await engine.run(started.workflowId);
 await store.saveWorkflow({...first,state:"queued",userRetryAuthorized:true});
 const restarted=await new WorkflowEngine(engineOptions).run(started.workflowId);
 return {first,restarted,physicalRequestKey:key,unknown:await store.readMetadataValue(key),trusted:await store.readTrustedSnapshot(id)};
};
`
  },
  bundle: true,
  platform: "browser",
  format: "iife",
  outfile: join(extension, "incremental-control.js"),
  define: { __SYLLAB_QA_TELEMETRY__: "false" },
  logLevel: "silent"
});
const context = await chromium.launchPersistentContext(profile, {
  channel: "chromium",
  headless: true,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
});
try {
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker")),
    origin = `chrome-extension://${new URL(worker.url()).host}`;
  // This fresh worker loads the current unpacked files after the clone's code-cache reset.
  const control = await context.newPage();
  await control.exposeFunction("captured054", (body) => {
    const hash = sha(body);
    let r = records.get(hash);
    if (!r) {
      const normalize = (v) => {
        const x = JSON.parse(v);
        const u = JSON.parse(x.messages[1].content);
        if (!u.currentFacts || !u.latestFacts) return undefined;
        for (const f of [...u.currentFacts, ...u.latestFacts]) delete f.updatedAt;
        x.messages[1].content = JSON.stringify(u);
        return JSON.stringify(x);
      };
      const normalized = normalize(body);
      if (normalized)
        for (const [savedHash, saved] of records) {
          const capturedBody = awaitBody.get(savedHash);
          if (capturedBody && normalize(capturedBody) === normalized) {
            r = saved;
            replayed.push({
              clockOnlyReplay: {
                actualSHA: hash,
                capturedSHA: savedHash,
                ignoredFields: ["currentFacts.updatedAt", "latestFacts.updatedAt"]
              }
            });
            break;
          }
        }
    }
    if (!r) fs.writeFile(join(priv, "projected-incremental-unmatched-request.json"), body);
    assert(r, "ENGINE_REQUEST_NOT_CAPTURED:" + hash);
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
  await control.goto(origin + "/incremental-control.html");
  assert(
    (
      await control.evaluate(() =>
        chrome.runtime.sendMessage({ contract: 2, type: "GET_VIEW", surface: "full-page" })
      )
    )?.ok,
    "RELOADED_BACKGROUND_NOT_RESPONDING"
  );
  const result = await control.evaluate((x) => window.resume054(x), { input, caches: [...caches] });
  await fs.writeFile(
    join(priv, "engine-projected-incremental-result.json"),
    JSON.stringify(result, null, 2) + "\n"
  );
  await fs.writeFile(
    join(priv, "projected-incremental-native-evidence-before-review.json"),
    JSON.stringify(
      await control.evaluate((id) => window.inspect054(id), input.localCourse.courseId),
      null,
      2
    ) + "\n"
  );
  assert.equal(result.workflow.phase, "review");
  assert.equal(result.workflow.state, "waiting");
  assert.deepEqual(result.trusted.facts, result.before.facts, "CHECK_AUTOMATICALLY_ADOPTED");
  const edited = result.trusted.facts.find((f) => f.factId === input.editedFactId);
  assert.equal(edited.value.value, "41%");
  assert.equal(edited.userEdited, true);
  const app = await context.newPage();
  assert(
    (
      await control.evaluate(
        (courseId) =>
          chrome.runtime.sendMessage({
            contract: 2,
            type: "OPEN_SCREEN",
            surface: "full-page",
            courseId,
            screen: "IRV-01"
          }),
        input.localCourse.courseId
      )
    )?.ok
  );
  await app.goto(origin + "/app.html");
  await app.locator(".review-screen").waitFor({ timeout: 30000 });
  await app.screenshot({
    path: join(priv, "engine-projected-incremental-review.png"),
    fullPage: true
  });
  await fs.writeFile(
    join(priv, "engine-projected-incremental-review-text.txt"),
    (await app.locator("body").textContent()) ?? ""
  );
  const audited = [];
  while (audited.length < result.snapshot.reviewItems.length) {
    const response = await control.evaluate(() =>
      chrome.runtime.sendMessage({ contract: 2, type: "GET_VIEW", surface: "full-page" })
    );
    assert(response?.ok);
    const review = response.view.review;
    if (!review) break;
    const current = await control.evaluate(
      (id) => window.inspect054(id),
      input.localCourse.courseId
    );
    const item = current.snapshot.reviewItems.find((i) => i.reviewItemId === review.reviewItemId);
    assert(item, "VIEW_SELECTED_NONEXISTENT_REVIEW_ITEM");
    let text = (await app.locator("body").textContent()) ?? "";
    for (const q of review.unresolvedQuestions)
      assert(text.includes(q), "SCOPED_JUDGMENT_OR_QUALIFIER_NOT_VISIBLE");
    if (review.issueEvidence?.length) {
      await app
        .getByRole("button", { name: "Show evidence for Course source", exact: true })
        .click();
      text = (await app.locator("body").textContent()) ?? "";
      for (const e of review.issueEvidence)
        assert(text.includes(e.excerpt), "EXACT_NEW_WITNESS_NOT_VISIBLE");
    }
    if (review.changeType === "NEW") {
      let more = app.getByRole("button", { name: "Show more", exact: true });
      while (await more.count()) {
        await more.first().click();
        more = app.getByRole("button", { name: "Show more", exact: true });
      }
      text = (await app.locator("body").textContent()) ?? "";
      for (const f of item.payload.facts ?? [])
        if (
          (f.field === "requirement" || f.constraintId) &&
          !result.before.facts.some((current) => current.factId === f.factId)
        )
          if (!text.includes(f.semanticClause.content)) {
            await fs.writeFile(
              join(priv, "new-requirement-display-failure.json"),
              JSON.stringify({ review, item, missingFact: f, text }, null, 2)
            );
            assert.fail("NEW_INDEPENDENT_REQUIREMENT_MISSING:" + f.factId);
          }
    }
    const change = current.snapshot.changes.find((c) => c.changeId === review.reviewItemId);
    if (change?.field === input.editedFactId) {
      assert(review.current.values.some((v) => v.display === "41%"));
      assert(review.current.values.every((v) => !v.evidence.length));
    }
    audited.push({
      reviewItemId: review.reviewItemId,
      type: review.changeType,
      questions: review.unresolvedQuestions.length,
      witnesses: review.issueEvidence?.length ?? 0
    });
    const action =
      review.changeType === "NEW"
        ? "Confirm"
        : review.changeType === "POSSIBLY_REMOVED"
          ? "Keep"
          : "Keep current";
    await app.getByRole("button", { name: action, exact: true }).click();
    await app.waitForFunction(() => !document.querySelector(".is-mutation-busy"));
    await waitNativeCondition(
      control,
      async ({ id, itemId }) => {
        const state = await window.inspect054(id);
        return !state.snapshot.reviewItems.some((i) => i.reviewItemId === itemId);
      },
      { id: input.localCourse.courseId, itemId: review.reviewItemId },
      { timeout: 30000 }
    );
    await app.reload();
    if (audited.length < result.snapshot.reviewItems.length)
      await app.locator(".review-screen").waitFor();
  }
  const afterActions = await control.evaluate(
    (id) => window.inspect054(id),
    input.localCourse.courseId
  );
  await fs.writeFile(
    join(priv, "engine-projected-incremental-after-qa-actions.json"),
    JSON.stringify({ audited, afterActions }, null, 2) + "\n"
  );
  const originalIds = new Set(result.before.facts.map((f) => f.factId));
  for (const item of result.snapshot.reviewItems.filter((i) => i.changeType === "NEW")) {
    for (const proposed of item.payload.facts ?? []) {
      if (!originalIds.has(proposed.factId)) {
        const actual = afterActions.trusted.facts.find((f) => f.factId === proposed.factId);
        assert(actual, "CONFIRMED_NEW_FACT_NOT_STORED:" + proposed.factId);
        assert.deepEqual(actual.value, proposed.value, "CONFIRMED_NEW_FACT_MEANING_CHANGED");
      }
    }
  }
  assert.equal(afterActions.snapshot.reviewItems.length, 0);
  assert.equal(afterActions.snapshot.changes.length, 0);
  assert.equal(
    afterActions.trusted.facts.find((f) => f.factId === input.editedFactId)?.value.value,
    "41%"
  );
  const backup = await control.evaluate(() => window.backup054());
  assert.equal(Object.keys(backup.payload).length, 13);
  assert.equal((await control.evaluate(() => window.storeCount054())).length, 22);
  assert(backup.payload.sources.every((s) => !s.parsed && !s.retrieval));
  await fs.writeFile(join(priv, "projected-qa-pre-rebuild-backup.json"), JSON.stringify(backup));
  const rebuilds = [];
  for (const adopt of [false, true]) {
    const countBefore = replayed.length;
    const rebuilt = await control.evaluate((x) => window.rebuild054(x), {
      id: input.localCourse.courseId,
      sources: input.sources
    });
    await fs.writeFile(
      join(priv, `projected-rebuild-${adopt ? "adopt" : "keep"}.json`),
      JSON.stringify(rebuilt, null, 2)
    );
    assert.equal(rebuilt.workflow.phase, "review");
    assert.equal(rebuilt.workflow.state, "waiting");
    assert.deepEqual(rebuilt.trusted.facts, rebuilt.before.facts, "REBUILD_AUTO_ADOPTED");
    assert.equal(replayed.length, countBefore, "UNCHANGED_REBUILD_REPEATED_MODEL_WORK");
    assert(rebuilt.staged?.facts.length);
    assert(
      (
        await control.evaluate(
          (courseId) =>
            chrome.runtime.sendMessage({
              contract: 2,
              type: "OPEN_SCREEN",
              surface: "full-page",
              courseId,
              screen: "RBL-03"
            }),
          input.localCourse.courseId
        )
      )?.ok
    );
    await app.reload();
    await app.locator(".rebuild-screen").waitFor();
    assert((await app.locator("body").textContent()).includes("Team Progress Checklist"));
    await app.screenshot({
      path: join(priv, `projected-rebuild-${adopt ? "adopt" : "keep"}.png`),
      fullPage: true
    });
    await app
      .getByRole("button", {
        name: adopt ? "Use rebuilt course" : "Keep current course",
        exact: true
      })
      .click();
    await app.waitForFunction(() => !document.querySelector(".is-mutation-busy"));
    await waitNativeCondition(control, async (x) => (await window.staged054(x)) === null, {
      id: input.localCourse.courseId,
      workflowId: rebuilt.workflow.workflowId
    });
    if (adopt)
      await waitNativeCondition(
        control,
        async (id) => {
          const state = await window.inspect054(id);
          return state.trusted.facts.some((f) => f.field === "weight" && f.value.value === "45%");
        },
        input.localCourse.courseId
      );
    const state = await control.evaluate((id) => window.inspect054(id), input.localCourse.courseId);
    await fs.writeFile(
      join(priv, `projected-rebuild-${adopt ? "adopt" : "keep"}-after-decision.json`),
      JSON.stringify(state, null, 2)
    );
    if (!adopt) assert.deepEqual(state.trusted.facts, rebuilt.before.facts);
    else {
      assert(state.trusted.facts.some((f) => f.field === "weight" && f.value.value === "45%"));
      assert(!state.trusted.facts.some((f) => f.factId === input.editedFactId && f.userEdited));
      assert.equal(
        state.trusted.facts.length,
        rebuilt.staged.facts.length,
        "OMITTED_OLD_FACTS_SURVIVED_REBUILD"
      );
    }
    rebuilds.push({
      adoptedInDisposableQaOnly: adopt,
      workflowId: rebuilt.workflow.workflowId,
      modelCalls: replayed.length - countBefore,
      stagingCleared: true
    });
  }
  const corrupted = structuredClone(backup);
  const callsBeforeUnknown = replayed.length;
  const beforeUnknown = await control.evaluate(
    (id) => window.inspect054(id),
    input.localCourse.courseId
  );
  const unknown = await control.evaluate((id) => window.unknown054(id), input.localCourse.courseId);
  assert.equal(unknown.first.state, "failed");
  assert.equal(unknown.restarted.state, "failed");
  assert(unknown.first.lastErrorDetail.includes("PAID_UNVERIFIED"));
  assert(unknown.restarted.lastErrorDetail.includes("PAID_UNVERIFIED"));
  assert.equal(replayed.length, callsBeforeUnknown, "UNKNOWN_REDISPATCHED");
  assert.deepEqual(unknown.trusted.facts, beforeUnknown.trusted.facts);
  await fs.writeFile(
    join(priv, "projected-native-unknown-no-redispatch.json"),
    JSON.stringify(unknown, null, 2)
  );
  corrupted.digest = "invalid";
  await assert.rejects(
    control.evaluate((x) => window.restore054(x), corrupted),
    /BACKUP_DIGEST_MISMATCH/
  );
  await control.evaluate((x) => window.restore054(x), backup);
  const restored = await control.evaluate(
    (id) => window.inspect054(id),
    input.localCourse.courseId
  );
  assert.deepEqual(restored.trusted.facts, afterActions.trusted.facts);
  assert.deepEqual(restored.decisions, afterActions.decisions);
  await fs.writeFile(
    join(priv, "projected-qa-restored-state.json"),
    JSON.stringify(restored, null, 2)
  );
  const report = {
    status: "NATIVE_CHECK_REVIEW_DOM_AUTOMATED_PASS_HUMAN_PENDING",
    scenario: input.scenarioLabel,
    workflowId: result.workflow.workflowId,
    nativeReviewItems: result.snapshot.reviewItems.length,
    nativeChanges: result.snapshot.changes.length,
    edited41Protected: true,
    automaticTrustedAdoptions: 0,
    qaOnlyManualActions: audited,
    humanAcceptance: false,
    replayed,
    paidCalls: 0,
    extensionActuallyReloaded: true,
    originalProfileOpened: false,
    rebuilds,
    unknownRecovery: {
      nativePersistedDispatchingFault: true,
      newSessionRetryBlocked: true,
      providerRequests: 0,
      trustedFactsUnchanged: true
    },
    backupRestore: {
      durableTables: 13,
      nativeObjectStores: 22,
      corruptDigestRejected: true,
      user41AndDecisionsRestored: true,
      parsedCachesExcluded: true
    }
  };
  await fs.writeFile(
    join(priv, "projected-incremental-recovery-report.json"),
    JSON.stringify(report, null, 2)
  );
  await fs.writeFile(
    join(priv, "projected-incremental-replay-profile.json"),
    JSON.stringify({ profile, extension, origin }, null, 2) + "\n"
  );
  console.log(JSON.stringify(report));
} finally {
  await context.close();
}
