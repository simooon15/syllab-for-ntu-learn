/** Held inspection of the one authorized private profile. No Scan, Retry or model dispatch. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
const profile = process.env.SYLLAB_EXISTING_QA_PROFILE;
assert(profile?.endsWith("syllab-acceptance-MFP6nM"), "ORIGINAL_PROFILE_REQUIRED");
const extension = resolve("extension/dist-qa");
const context = await chromium.launchPersistentContext(profile, {
  headless: false,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
});
globalThis.__syllab039Context = context;
const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
const page = await context.newPage();
await page.goto(`chrome-extension://${new URL(worker.url()).host}/manifest.json`);
const hold = await page.evaluate(() => chrome.runtime.sendMessage({ type: "E2E_RECOVERY_HOLD" }));
const inspectionHeld = process.env.SYLLAB_INSPECTION_HOLD === "1";
assert.equal(hold.held, inspectionHeld, "RECOVERY_HOLD_MODE_REQUIRED");
const revision = await page.evaluate(() =>
  chrome.runtime.sendMessage({ type: "E2E_PERMISSION_RECOVERY_REVISION" })
);
assert.equal(revision.revision, "permission-recovery/036");
async function capture() {
  return page.evaluate(async () => {
    const result = {};
    for (const name of ["syllab-local", "syllab.qa.private-streams"]) {
      const db = await new Promise((r, j) => {
        const q = indexedDB.open(name);
        q.onsuccess = () => r(q.result);
        q.onerror = () => j(q.error);
      });
      const tables = {};
      for (const n of db.objectStoreNames)
        tables[n] = await new Promise((r, j) => {
          const q = db.transaction(n).objectStore(n).getAll();
          q.onsuccess = () => r(q.result);
          q.onerror = () => j(q.error);
        });
      db.close();
      result[name] = tables;
    }
    return result;
  });
}
const data = await capture();
assert.equal(data["syllab-local"].workflows.length, 1);
assert.equal(data["syllab-local"].workflows[0].workflowId, "wf_ffd850a9f186233026338f6f");
const directory = "evidence/private/v030-recovery-039";
await mkdir(directory, { recursive: true });
await writeFile(
  `${directory}/RECOVERED-CAPTURE.json`,
  JSON.stringify({ at: new Date().toISOString(), data })
);
console.log(
  JSON.stringify({
    status: "HELD_INSPECTION_READY",
    revision: revision.revision,
    dispatchHeld: inspectionHeld,
    counts: Object.fromEntries(Object.entries(data["syllab-local"]).map(([k, v]) => [k, v.length])),
    archivedStreams: data["syllab.qa.private-streams"].streams?.length
  })
);
const finalReviewOnly = process.env.SYLLAB_FINAL_REVIEW_ONLY === "1";
if (!inspectionHeld && !finalReviewOnly) {
  const run = data["syllab-local"].workflows[0];
  assert.equal(run.state, "failed", "INTERRUPTED_SAME_WORKFLOW_REQUIRED");
  const progress = await page.evaluate(() =>
    chrome.runtime.sendMessage({ type: "E2E_PROVIDER_PROGRESS" })
  );
  assert.equal(progress.active.length, 0);
  const opened = await page.evaluate(
    (courseId) =>
      chrome.runtime.sendMessage({
        contract: 2,
        type: "OPEN_SCREEN",
        surface: "full-page",
        screen: "ISC-02",
        courseId
      }),
    run.courseId
  );
  assert.equal(opened.ok, true);
  const course = data["syllab-local"].courses.find((c) => c.courseId === run.courseId);
  const resumed = await page.evaluate(
    ({ courseId, revision, workflowId }) =>
      chrome.runtime.sendMessage({
        contract: 2,
        type: "MUTATE",
        surface: "full-page",
        courseId,
        expectedRevision: revision,
        mutation: { kind: "RetryTask", workflowId }
      }),
    { courseId: run.courseId, revision: course.revision, workflowId: run.workflowId }
  );
  console.log(JSON.stringify({ resumed: resumed.ok, workflowId: run.workflowId }));
  for (;;) {
    const latest = await capture();
    await writeFile(
      `${directory}/LATEST.json`,
      JSON.stringify({ at: new Date().toISOString(), data: latest })
    );
    const current = latest["syllab-local"].workflows[0];
    console.log(
      JSON.stringify({
        state: current.state,
        phase: current.phase,
        waitingReason: current.waitingReason,
        aiRuns: latest["syllab-local"].aiRuns.length
      })
    );
    if (current.state === "waiting" && current.waitingReason === "review") {
      const result = await page.evaluate(
        (courseId) =>
          chrome.runtime.sendMessage({
            contract: 2,
            type: "OPEN_SCREEN",
            surface: "full-page",
            screen: "IRV-01",
            courseId
          }),
        current.courseId
      );
      assert.equal(result.ok, true);
      const review = await context.newPage();
      await review.goto(`chrome-extension://${new URL(worker.url()).host}/app.html`);
      await review.waitForSelector("#app > *");
      await writeFile(
        `${directory}/INITIAL-REVIEW.json`,
        JSON.stringify({ at: new Date().toISOString(), data: latest, routeOpened: true })
      );
      console.log("INITIAL_REVIEW_REACHED_NO_ADOPTION");
      break;
    }
    if (current.state === "failed") {
      console.log(JSON.stringify({ failure: current.errorCode, detail: current.lastErrorDetail }));
      break;
    }
    await new Promise((r) => setTimeout(r, 10000));
  }
}
if (finalReviewOnly) {
  const run = data["syllab-local"].workflows[0];
  assert.equal(run.waitingReason, "review");
  const opened = await page.evaluate(
    (courseId) =>
      chrome.runtime.sendMessage({
        contract: 2,
        type: "OPEN_SCREEN",
        surface: "full-page",
        screen: "IRV-01",
        courseId
      }),
    run.courseId
  );
  assert.equal(opened.ok, true);
  const review = await context.newPage();
  await review.goto(`chrome-extension://${new URL(worker.url()).host}/app.html`);
  await review.waitForSelector("#app > *");
  await writeFile(
    `${directory}/FINAL-ACTIVATION.json`,
    JSON.stringify({
      at: new Date().toISOString(),
      data,
      routeOpened: true,
      version: "0.3.0",
      noRetry: true
    })
  );
  console.log("FINAL_V030_REVIEW_ACTIVATED_NO_ADOPTION");
}
setInterval(() => {}, 10000);
