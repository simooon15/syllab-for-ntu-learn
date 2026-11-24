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
globalThis.__syllab037Context = context;
const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
const page = await context.newPage();
await page.goto(`chrome-extension://${new URL(worker.url()).host}/manifest.json`);
const hold = await page.evaluate(() => chrome.runtime.sendMessage({ type: "E2E_RECOVERY_HOLD" }));
assert.equal(hold.held, true, "RECOVERY_DISPATCH_HOLD_REQUIRED");
const revision = await page.evaluate(() =>
  chrome.runtime.sendMessage({ type: "E2E_PERMISSION_RECOVERY_REVISION" })
);
assert.equal(revision.revision, "permission-recovery/036");
const data = await page.evaluate(async () => {
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
assert.equal(data["syllab-local"].workflows.length, 1);
assert.equal(data["syllab-local"].workflows[0].workflowId, "wf_ffd850a9f186233026338f6f");
const directory = "evidence/private/v030-recovery-037";
await mkdir(directory, { recursive: true });
await writeFile(
  `${directory}/RECOVERED-CAPTURE.json`,
  JSON.stringify({ at: new Date().toISOString(), data })
);
console.log(
  JSON.stringify({
    status: "HELD_INSPECTION_READY",
    revision: revision.revision,
    dispatchHeld: true,
    counts: Object.fromEntries(Object.entries(data["syllab-local"]).map(([k, v]) => [k, v.length])),
    archivedStreams: data["syllab.qa.private-streams"].streams?.length
  })
);
setInterval(() => {}, 10000);
