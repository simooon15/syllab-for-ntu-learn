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
const input = await read(join(priv, "engine-incremental-input.json")),
  checkpoint = await read(join(priv, "incremental-profile-1.json"));
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
      'export * from "./extension/src/v2/selective-course";export {serializeProviderRequest} from "./extension/src/v2/provider-request";',
    resolveDir: root
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: join(priv, "incremental-index-runtime.mjs"),
  logLevel: "silent"
});
const R = await import(pathToFileURL(join(priv, "incremental-index-runtime.mjs")));
await R.runSelectiveCourse(input, {
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
});
// Keep the paused recovery profile unchanged. This copy retains actual workflow/current/decisions.
const profile = await fs.mkdtemp(join(tmpdir(), "syllab054-incremental-"));
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
const store=new LocalStore(new LocalDatabase(indexedDB)),staging=new RebuildStagingStore(chrome.storage.local);
const forbidden=()=>{throw Error("NETWORK_OR_LEGACY_PATH_FORBIDDEN");};
const ai={apiKey:async()=>"saved-evidence-only",privacyAuthorized:async()=>true,usageAuthorized:async()=>true,execute:async call=>({...await completeWithRepair(call,"saved-evidence-only",{complete:async(_key,request)=>window.captured054(serializeProviderRequest(request))}),consumesApi:false})};
const engine=new WorkflowEngine({store,staging,ai,clock:{now:()=>new Date()},directCourse:true,selectiveCourse:true,machine:{missingPermissionOrigins:async()=>[],discover:forbidden,fetchAndParse:forbidden},buildTaskACalls:forbidden,buildTaskAConsolidationCall:forbidden,buildTaskBCalls:forbidden,buildTaskBExpansionCall:forbidden,buildTaskCCalls:forbidden,planChunks:forbidden});
window.resume054=async x=>{await store.initialize();const before=await store.readTrustedSnapshot(x.input.localCourse.courseId);await store.setMetadata(Object.fromEntries(x.caches.map(([key,value])=>[key,{kind:"physical-work-ledger",workflowId:x.input.workflow.workflowId,courseId:x.input.localCourse.courseId,ledger:{value}}])));await store.saveWorkflow(x.input.workflow);const workflow=await engine.run(x.input.workflow.workflowId);return {before,workflow,snapshot:await store.readSnapshot(x.input.localCourse.courseId),trusted:await store.readTrustedSnapshot(x.input.localCourse.courseId),staged:await staging.read(x.input.localCourse.courseId,x.input.workflow.workflowId)};};
window.inspect054=async id=>{const snapshot=await store.readSnapshot(id);return {snapshot,trusted:await store.readTrustedSnapshot(id),decisions:await store.readDecisions(id),evidence:await store.readEvidence(snapshot.changes.flatMap(c=>[...c.currentEvidenceIds,...c.newEvidenceIds]))};};
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
    if (!r) fs.writeFile(join(priv, "incremental-unmatched-request.json"), body);
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
    join(priv, "engine-incremental-result.json"),
    JSON.stringify(result, null, 2) + "\n"
  );
  await fs.writeFile(
    join(priv, "incremental-native-evidence-before-review.json"),
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
  await app.screenshot({ path: join(priv, "engine-incremental-review.png"), fullPage: true });
  await fs.writeFile(
    join(priv, "engine-incremental-review-text.txt"),
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
        if (f.field === "requirement")
          assert(text.includes(f.semanticClause.content), "NEW_INDEPENDENT_REQUIREMENT_MISSING");
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
    join(priv, "engine-incremental-after-qa-actions.json"),
    JSON.stringify({ audited, afterActions }, null, 2) + "\n"
  );
  assert.equal(afterActions.snapshot.reviewItems.length, 0);
  assert.equal(afterActions.snapshot.changes.length, 0);
  assert.equal(
    afterActions.trusted.facts.find((f) => f.factId === input.editedFactId)?.value.value,
    "41%"
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
    originalProfileOpened: false
  };
  await fs.writeFile(
    join(priv, "incremental-replay-profile.json"),
    JSON.stringify({ profile, extension, origin }, null, 2) + "\n"
  );
  console.log(JSON.stringify(report));
} finally {
  await context.close();
}
