/** Zero-paid native extension DOM test in a fresh profile. Saved counterfactual, not AI acceptance. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import { build } from "esbuild";
import { chromium } from "playwright";
const root = resolve(process.argv[2] ?? process.cwd()),
  priv = join(root, "evidence/private/goal-driven-052/continuation-053"),
  out = join(root, "artifacts/v0.3.0/goal-driven-053");
const readerReplay = process.argv.includes("--reader-transport");
const saved = JSON.parse(
  await fs.readFile(
    join(priv, readerReplay ? "reader-transport-candidate.json" : "real-replay-candidate.json"),
    "utf8"
  )
);
const extension = join(priv, "unpacked-053"),
  profile = await fs.mkdtemp(join(tmpdir(), "syllab053-isolated-"));
await fs.cp(join(root, "extension/dist"), extension, { recursive: true });
await fs.writeFile(
  join(extension, "control.html"),
  '<html><script src="control.js"></script></html>'
);
await build({
  stdin: {
    contents: `import {LocalStore} from "./extension/src/v2/store";import {LocalDatabase} from "./extension/src/v2/storage";import {createInitialWorkflow,editFact} from "./extension/src/v2/course-state";import {RebuildStagingStore} from "./extension/src/v2/staging";
const store=new LocalStore(new LocalDatabase(indexedDB));
window.seed053=async(x)=>{await store.initialize();await store.upsertCourse(x.course);await store.writeDraft(x);await store.saveWorkflow({...createInitialWorkflow("isolated-053-real-replay",x.course,x.course.updatedAt,"initial"),directCoursePolicy:"selective-draft/1",state:"waiting",phase:"review",waitingReason:"review"});};
window.inspect053=async(id)=>({snapshot:await store.readSnapshot(id),trusted:await store.readTrustedSnapshot(id)});
window.check053=async(id)=>{let snapshot=await store.readSnapshot(id);const first=snapshot.facts.find(f=>f.assessmentId&&f.field==="weight");if(!first)throw Error("NO_REPLAY_WEIGHT");const second=snapshot.facts.find(f=>f.assessmentId===first.assessmentId&&f.factId!==first.factId&&f.field==="requirement");if(!second)throw Error("NO_SECOND_REPLAY_FACT");await store.commitMutation(id,editFact(snapshot,{factId:first.factId,value:{state:"KNOWN",value:"41%"},expectedRevision:snapshot.course.currentRevision,now:snapshot.course.updatedAt}));snapshot=await store.readSnapshot(id);const workflow=createInitialWorkflow("isolated-053-check-dom",snapshot.course,snapshot.course.updatedAt,"check");const changes=[first,second].map((f,i)=>{const current=snapshot.facts.find(x=>x.factId===f.factId),latest={...f,value:{state:"KNOWN",value:i===0?"45%":"Synthetic conditional latest clause"},semanticClause:{...f.semanticClause,content:i===0?"Synthetic weight 45%":"Synthetic conditional latest clause",modality:i===0?"descriptive":"may",conditions:["if requested"],exceptions:["except private material"]}};return{changeId:"isolated-change-"+i,courseId:id,workflowId:workflow.workflowId,targetId:first.assessmentId,field:f.factId,changeType:"CHANGED",currentValue:current.value,latestValue:latest.value,currentEvidenceIds:current.userEdited?[]:current.evidenceRefs,newEvidenceIds:latest.evidenceRefs,proposedFact:latest,createdAt:snapshot.course.updatedAt,updatedAt:snapshot.course.updatedAt};});await store.writeDraft({changes,reviewItems:changes.map(c=>({reviewItemId:c.changeId,courseId:id,workflowId:workflow.workflowId,targetId:c.targetId,kind:"change",changeType:"CHANGED",payload:{changeId:c.changeId},createdAt:c.createdAt,updatedAt:c.updatedAt}))});await store.saveWorkflow({...workflow,directCoursePolicy:"selective-draft/1",state:"waiting",phase:"review",waitingReason:"review"});return changes;};
window.rebuild053=async(x)=>{const course=await store.readCourse(x.course.courseId);const workflow=createInitialWorkflow("isolated-053-rebuild",course,course.updatedAt,"rebuild");await new RebuildStagingStore(chrome.storage.local).write({...x,changes:[],courseId:course.courseId,workflowId:workflow.workflowId,stagedAt:course.updatedAt,courseDraft:x.draft,taskACoverage:{succeededSourceIds:x.sources.map(s=>s.sourceId),relevantSourceIds:x.sources.map(s=>s.sourceId),failedSources:[]}});await store.saveWorkflow({...workflow,directCoursePolicy:"selective-draft/1",state:"waiting",phase:"review",waitingReason:"review"});};`,
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
  await control.goto(origin + "/control.html");
  await control.evaluate((x) => window.seed053(x), saved);
  const before = await control.evaluate((id) => window.inspect053(id), saved.course.courseId);
  assert.equal(before.trusted.facts.length, 0);
  const app = await context.newPage();
  app.setDefaultTimeout(30000);
  const errors = [];
  app.on("pageerror", (e) => errors.push(e.name));
  const open = async (screen) => {
    const response = await control.evaluate(
      ({ courseId, screen }) =>
        chrome.runtime.sendMessage({
          contract: 2,
          type: "OPEN_SCREEN",
          surface: "full-page",
          courseId,
          screen
        }),
      { courseId: saved.course.courseId, screen }
    );
    assert(response?.ok, JSON.stringify({ screen, response }));
    await app.goto(origin + "/app.html");
  };
  await open("IRV-01");
  let checked = 0,
    bodyCount = 0,
    issueCount = 0;
  while (checked < saved.reviewItems.length) {
    await app.getByRole("button", { name: "Confirm", exact: true }).waitFor();
    const state = await control.evaluate((id) => window.inspect053(id), saved.course.courseId),
      item = state.snapshot.reviewItems[0];
    assert(item);
    let more = app.getByRole("button", { name: "Show more", exact: true });
    while (await more.count()) {
      await more.first().click();
      more = app.getByRole("button", { name: "Show more", exact: true });
    }
    const text = await app.locator("body").innerText();
    for (const fact of saved.facts.filter(
      (f) => f.assessmentId === item.targetId && f.field === "requirement"
    )) {
      assert(text.includes(fact.semanticClause.content), "INDEPENDENT_CLAUSE_MISSING_FROM_DOM");
      bodyCount++;
    }
    const rule = saved.constraints.find((c) => c.constraintId === item.targetId);
    if (rule)
      assert(
        (await app.locator(".constraint").allTextContents()).some((body) =>
          body.includes(rule.content)
        ),
        "RULE_BODY_MISSING_FROM_DOM"
      );
    if (checked === 0) {
      const questions = await app.locator(".fact-question").allTextContents();
      for (const q of item.payload.unresolvedQuestions ?? [])
        assert(questions.includes(q), "UNRESOLVED_QUESTION_MISSING_FROM_DOM");
      issueCount = item.payload.unresolvedQuestions.length;
      await app.screenshot({
        path: join(priv, readerReplay ? "reader-initial-review.png" : "initial-review.png"),
        fullPage: true
      });
    }
    await app.getByRole("button", { name: "Confirm", exact: true }).click();
    await app.waitForFunction(() => !document.querySelector(".is-mutation-busy"));
    await control.waitForFunction(
      async ({ id, target }) =>
        !(await window.inspect053(id)).snapshot.reviewItems.some((i) => i.targetId === target),
      { id: saved.course.courseId, target: item.targetId }
    );
    checked++;
    if (checked < saved.reviewItems.length) await app.reload();
  }
  const admitted = await control.evaluate((id) => window.inspect053(id), saved.course.courseId);
  assert.equal(admitted.trusted.facts.length, saved.facts.length);
  for (const fact of saved.facts)
    assert.deepEqual(
      admitted.trusted.facts.find((f) => f.factId === fact.factId)?.semanticClause,
      fact.semanticClause
    );
  // Explicit synthetic Check proposals verify native DOM and decisions, not model judgments.
  const changes = await control.evaluate((id) => window.check053(id), saved.course.courseId);
  assert.equal(changes[0].targetId, changes[1].targetId);
  let checkCards = 0;
  for (const change of changes) {
    await open("CRV-01");
    await app.getByRole("button", { name: "Accept change", exact: true }).waitFor();
    const current = await app.locator('[data-side="current"]').innerText(),
      latest = await app.locator('[data-side="latest"]').innerText();
    assert(current.includes(String(change.currentValue.value)), "WRONG_NATIVE_CURRENT");
    assert(latest.includes(String(change.latestValue.value)), "WRONG_NATIVE_LATEST");
    if (checkCards === 0) {
      assert(current.includes("41%"));
      assert.equal(await app.locator('[data-side="current"] .is-swappable').count(), 0);
      const unchanged = await control.evaluate(
        (id) => window.inspect053(id),
        saved.course.courseId
      );
      assert.equal(
        unchanged.trusted.facts.find((f) => f.factId === change.field).value.value,
        "41%"
      );
    } else assert(latest.includes("may"));
    await app.getByRole("button", { name: "Accept change", exact: true }).click();
    await control.waitForFunction(
      async ({ id, changeId }) =>
        !(await window.inspect053(id)).snapshot.changes.some((c) => c.changeId === changeId),
      { id: saved.course.courseId, changeId: change.changeId }
    );
    const changed = await control.evaluate((id) => window.inspect053(id), saved.course.courseId);
    const fact = changed.trusted.facts.find((f) => f.factId === change.field);
    assert.deepEqual(fact.value, change.latestValue);
    assert.deepEqual(fact.semanticClause, change.proposedFact.semanticClause);
    checkCards++;
  }
  const checkedState = await control.evaluate((id) => window.inspect053(id), saved.course.courseId);
  const trustedBody = JSON.stringify({
    facts: checkedState.trusted.facts,
    assessments: checkedState.trusted.assessments,
    constraints: checkedState.trusted.constraints,
    revision: checkedState.trusted.course.currentRevision
  });
  await control.evaluate((x) => window.rebuild053(x), saved);
  await open("RBL-03");
  await app.getByRole("button", { name: "Use rebuilt course", exact: true }).waitFor();
  let more = app.getByRole("button", { name: "Show more", exact: true });
  while (await more.count()) {
    await more.first().click();
    more = app.getByRole("button", { name: "Show more", exact: true });
  }
  const rebuiltQuestions = await app.locator(".fact-question").allTextContents();
  for (const item of saved.reviewItems)
    for (const q of item.payload.unresolvedQuestions ?? [])
      assert(rebuiltQuestions.includes(q), "REBUILD_ISSUE_MISSING_FROM_DOM");
  await app.screenshot({
    path: join(priv, readerReplay ? "reader-rebuild-preview.png" : "rebuild-preview.png"),
    fullPage: true
  });
  const after = await control.evaluate((id) => window.inspect053(id), saved.course.courseId);
  assert.equal(
    JSON.stringify({
      facts: after.trusted.facts,
      assessments: after.trusted.assessments,
      constraints: after.trusted.constraints,
      revision: after.trusted.course.currentRevision
    }),
    trustedBody
  );
  assert.deepEqual(errors, []);
  const proof = {
    schema: "syllab.selective-native-dom/1",
    actualProductionAppAndBackground: true,
    readerTransportReplay: readerReplay,
    syntheticOwnership: readerReplay,
    freshIsolatedProfile: true,
    privateControlPageOnly: true,
    initialReviewCardsChecked: checked,
    independentRequirementBodiesInDOM: bodyCount,
    firstCardUnresolvedQuestions: issueCount,
    acceptedFactMetadataRoundtrip: saved.facts.length,
    syntheticCheckCardsSameOwner: checkCards,
    userEdited41PreservedBeforeAcceptance: true,
    userEditedCurrentHasNoSourceEvidence: true,
    syntheticChangesAcceptedWithExactClauseMetadata: true,
    rebuildIssuesInDOM: true,
    rebuildDidNotMutateTrustedBody: true,
    originalProfileTouched: false,
    newPaidDispatches: 0,
    courseRescans: 0,
    newModelSemanticAcceptance: false,
    humanProductAcceptance: false,
    limitation:
      (readerReplay
        ? "New real reader clauses with synthetic ownership; no real Link or course acceptance. "
        : "") +
      "Automated Confirm and synthetic Check Accept act only inside disposable QA state. Real v8 is not admitted; Check tests native display/state only, not changed-source model semantics or new selective routing."
  };
  await fs.writeFile(
    join(out, readerReplay ? "REAL_READER_DOM.json" : "UNPACKED_EXTENSION.json"),
    JSON.stringify(proof, null, 2) + "\n"
  );
  console.log(JSON.stringify(proof));
} finally {
  await context.close();
}
