/** Read-only activation of the existing Review; never Scan, Retry, Confirm or adopt. */
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
const profile = process.env.SYLLAB_EXISTING_QA_PROFILE;
assert(profile?.endsWith("syllab-acceptance-MFP6nM"), "ORIGINAL_PROFILE_REQUIRED");
const extension = resolve("extension/dist-qa");
const context = await chromium.launchPersistentContext(profile, {
  headless: false,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
});
const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
const page = await context.newPage();
await page.goto(`chrome-extension://${new URL(worker.url()).host}/manifest.json`);
const capture = () =>
  page.evaluate(async () => {
    const db = await new Promise((r, j) => {
      const q = indexedDB.open("syllab-local");
      q.onsuccess = () => r(q.result);
      q.onerror = () => j(q.error);
    });
    const result = {};
    for (const name of db.objectStoreNames)
      result[name] = await new Promise((r, j) => {
        const q = db.transaction(name).objectStore(name).getAll();
        q.onsuccess = () => r(q.result);
        q.onerror = () => j(q.error);
      });
    db.close();
    return result;
  });
const before = await capture();
const original = JSON.parse(
  await readFile("evidence/private/v030-recovery-039/FINAL-ACTIVATION.json", "utf8")
).data["syllab-local"];
assert(
  JSON.stringify(before) === JSON.stringify(original),
  "EXISTING_REVIEW_CHANGED_DO_NOT_OVERWRITE"
);
const run = before.workflows[0];
assert.equal(run.waitingReason, "review");
const active = await page.evaluate(() =>
  chrome.runtime.sendMessage({ type: "E2E_PROVIDER_PROGRESS" })
);
assert.equal(active.active.length, 0);
const loaded = await page.evaluate(async () =>
  (await fetch(chrome.runtime.getURL("background.js"))).text()
);
assert(loaded.includes("assessment-relevance/1"), "NEW_BUNDLE_REQUIRED");
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
const ntuTabs = context.pages().filter((p) => p.url().startsWith("https://ntulearn.ntu.edu.sg/"));
for (const tab of ntuTabs) await tab.reload();
const after = await capture();
assert(JSON.stringify(before) === JSON.stringify(after), "REVIEW_ACTIVATION_MUTATED_DATABASE");
const directory = "artifacts/v0.3.0/semantic-040";
await mkdir(directory, { recursive: true });
await writeFile(
  `${directory}/RUNTIME.json`,
  JSON.stringify(
    {
      sameWorkflow: true,
      oldReviewPreserved: true,
      tablesEqual: Object.keys(after).length,
      activeProviderCalls: 0,
      loadedPolicyMarker: true,
      refreshedNtuTabs: ntuTabs.length,
      noAdoption: true,
      note: "Existing paid results are deliberately not replaced; no claim that old candidates are reclassified."
    },
    null,
    2
  ) + "\n"
);
console.log("040_REVIEW_ACTIVATION_PASS_NO_PAID_CALL_NO_ADOPTION");
globalThis.__syllab040Context = context;
setInterval(() => {}, 60000);
