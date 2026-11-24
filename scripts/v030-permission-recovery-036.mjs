import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { launchExtension } from "./lib/browser-harness.mjs";
const app = await launchExtension();
const context = app.fullPage.context();
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function snapshot() {
  return app.fullPage.evaluate(async () => {
    const db = await new Promise((resolve, reject) => {
      const q = indexedDB.open("syllab-local");
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => reject(q.error);
    });
    const tables = {};
    for (const name of db.objectStoreNames) {
      tables[name] = await new Promise((resolve, reject) => {
        const q = db.transaction(name).objectStore(name).getAll();
        q.onsuccess = () => resolve(q.result);
        q.onerror = () => reject(q.error);
      });
    }
    db.close();
    return tables;
  });
}
try {
  const revision = await app.fullPage.evaluate(() =>
    chrome.runtime.sendMessage({ type: "E2E_PERMISSION_RECOVERY_REVISION" })
  );
  assert.equal(revision?.revision, "permission-recovery/036", "ACTIVE_WORKER_REVISION_REQUIRED");
  await app.seed("scan-waiting-permission", "ISC-02");
  await app.fullPage.evaluate(() =>
    chrome.storage.local.set({
      "syllab.permissionOrigins": ["https://fixture.blackboard.com"]
    })
  );
  const before = await snapshot();
  assert.equal(before.workflows.length, 1);
  assert.equal(before.workflows[0].waitingReason, "host-permission");
  const opened = await app.fullPage.evaluate(
    async (courseId) =>
      chrome.runtime.sendMessage({
        contract: 2,
        type: "OPEN_SCREEN",
        surface: "full-page",
        screen: "ISC-02",
        courseId
      }),
    before.workflows[0].courseId
  );
  assert.equal(opened.ok, true);
  await app.fullPage.reload();
  assert.equal(
    await app.fullPage.getByRole("button", { name: "Grant permission", exact: true }).count(),
    1
  );
  const extensions = await context.newPage();
  await extensions.goto("chrome://extensions/");
  const developerMode = extensions.locator("extensions-toolbar").locator("#devMode");
  if (!(await developerMode.getAttribute("checked"))) await developerMode.click();
  await extensions
    .locator("extensions-item")
    .getByText("Syllab for NTU Learn", { exact: true })
    .waitFor();
  await extensions.locator("extensions-item").locator("#dev-reload-button").click();
  app.fullPage = await context.newPage();
  const deadline = Date.now() + 10000;
  for (;;) {
    try {
      await app.fullPage.goto(`chrome-extension://${app.extensionId}/app.html`);
      break;
    } catch (error) {
      if (Date.now() >= deadline) {
        console.log(
          JSON.stringify(
            await extensions.locator("extensions-item").evaluateAll((items) =>
              items.map((i) => ({
                id: i.data?.id,
                state: i.data?.state,
                disableReasons: i.data?.disableReasons,
                errors: i.data?.runtimeErrors?.map((e) => e.message),
                manifestErrors: i.data?.manifestErrors?.map((e) => e.message)
              }))
            )
          )
        );
        throw error;
      }
      await extensions.waitForTimeout(100);
    }
  }
  await app.fullPage.waitForSelector("#app > *");
  const active = await app.fullPage.evaluate(() =>
    chrome.runtime.sendMessage({ type: "E2E_PERMISSION_RECOVERY_REVISION" })
  );
  assert.equal(active?.revision, "permission-recovery/036", "RELOADED_WORKER_REVISION_REQUIRED");
  const after = await snapshot();
  assert.equal(hash(after), hash(before), "RELOAD_CHANGED_SYNTHETIC_CHECKPOINT");
  const restored = await app.fullPage.evaluate(
    async (courseId) =>
      chrome.runtime.sendMessage({
        contract: 2,
        type: "OPEN_SCREEN",
        surface: "full-page",
        screen: "ISC-02",
        courseId
      }),
    before.workflows[0].courseId
  );
  assert.equal(restored.ok, true);
  await app.fullPage.reload();
  await app.fullPage.getByRole("button", { name: "Grant permission", exact: true }).waitFor();
  assert.equal(hash(await snapshot()), hash(before), "ROUTE_RESTORE_CHANGED_CHECKPOINT");
  const result = {
    status: "PASS",
    fixtureOnly: true,
    newRealWorkflows: 0,
    paidCalls: 0,
    sameCheckpointSHA256: hash(before),
    scanRouteRestored: true,
    permissionButtonVisibleAfterReload: true,
    permissionGrantPerformed: false,
    activeWorkerRevisionVerified: "permission-recovery/036"
  };
  await mkdir("artifacts/v0.3.0/permission-036", { recursive: true });
  await writeFile(
    "artifacts/v0.3.0/permission-036/ZERO-RELOAD.json",
    JSON.stringify(result, null, 2) + "\n"
  );
  console.log(JSON.stringify(result));
} finally {
  await app.close();
}
