/** Synthetic-only same-profile restart proof; never opens the live QA profile. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { mkdtemp, mkdir, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
const profile = await mkdtemp(join(tmpdir(), "syllab-zero-037-"));
const extension = resolve("extension/dist-qa");
const options = {
  headless: false,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
};
async function launch() {
  const context = await chromium.launchPersistentContext(profile, options);
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  const page = await context.newPage();
  await page.goto(`chrome-extension://${new URL(worker.url()).host}/manifest.json`);
  assert.equal(
    (await page.evaluate(() => chrome.runtime.sendMessage({ type: "E2E_RECOVERY_HOLD" }))).held,
    true
  );
  assert.equal(
    (
      await page.evaluate(() =>
        chrome.runtime.sendMessage({ type: "E2E_PERMISSION_RECOVERY_REVISION" })
      )
    ).revision,
    "permission-recovery/036"
  );
  return { context, page };
}
async function snapshot(page) {
  return page.evaluate(async () => {
    const db = await new Promise((r, j) => {
      const q = indexedDB.open("syllab-local");
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
    return tables;
  });
}
const hash = (v) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
let active = await launch();
try {
  const seeded = await active.page.evaluate(() =>
    chrome.runtime.sendMessage({
      contract: "syllab.e2e/1",
      type: "E2E_SEED",
      scenario: "scan-waiting-permission"
    })
  );
  assert.equal(seeded.ok, true);
  const before = await snapshot(active.page);
  assert.equal(before.workflows.length, 1);
  assert.equal(before.aiRuns.length, 0);
  await active.context.close();
  // Quarantine executable cache only; persistent IDB and permissions remain intact.
  await rename(
    join(profile, "Default/Service Worker"),
    join(profile, "Default/Service Worker.037-preserved")
  );
  active = await launch();
  const after = await snapshot(active.page);
  assert.equal(hash(after), hash(before));
  const result = {
    status: "PASS",
    syntheticOnly: true,
    checkpointSHA256: hash(after),
    sameProfile: true,
    workerRevision: "permission-recovery/036",
    dispatchHeld: true,
    paidCalls: 0,
    newRealWorkflows: 0
  };
  await mkdir("artifacts/v0.3.0/recovery-037", { recursive: true });
  await writeFile(
    "artifacts/v0.3.0/recovery-037/ZERO-RECOVERY.json",
    JSON.stringify(result, null, 2) + "\n"
  );
  console.log(JSON.stringify(result));
} finally {
  await active.context.close();
}
