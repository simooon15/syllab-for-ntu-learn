/** P2E-036: recover the existing private profile; never discover or start another workflow. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
const profile = process.env.SYLLAB_EXISTING_QA_PROFILE;
assert(profile, "EXISTING_PROFILE_PATH_REQUIRED");
const workflowId = "wf_ffd850a9f186233026338f6f";
const privateDir = "evidence/private/v030-recovery-036";
const checkpoint = JSON.parse(await readFile(`${privateDir}/PRE-ACTIVATION.json`, "utf8"));
assert.equal(checkpoint.run.workflowId, workflowId);
assert.equal(checkpoint.tables.aiRuns.length, 0);
const extensionPath = resolve("extension/dist-qa");
const context = await chromium.launchPersistentContext(profile, {
  executablePath:
    "/Users/simonluo/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing",
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    "--no-first-run",
    "--no-default-browser-check"
  ]
});
const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
const extensionId = new URL(worker.url()).host;
assert.equal(extensionId, "jinfkigclgmeopkpkgfegnhgehaefibj");
const page = await context.newPage();
await page.goto(`chrome-extension://${extensionId}/app.html`);
// Reject a cached old Worker before exposing any recovery/permission route.
const activeRevision = await page.evaluate(() =>
  chrome.runtime.sendMessage({ type: "E2E_PERMISSION_RECOVERY_REVISION" })
);
if (activeRevision?.revision !== "permission-recovery/036") {
  await writeFile(
    `${privateDir}/ACTIVE-WORKER-GATE.json`,
    JSON.stringify({
      status: "ACTIVE_WORKER_REVISION_MISMATCH",
      workflowId,
      grantRouteOpened: false,
      forceClose: false
    })
  );
  console.log("ACTIVE_WORKER_REVISION_MISMATCH_PRESERVE_BROWSER");
  await new Promise(() => {});
}
async function snapshot() {
  return page.evaluate(async () => {
    const db = await new Promise((r, j) => {
      const q = indexedDB.open("syllab-local");
      q.onsuccess = () => r(q.result);
      q.onerror = () => j(q.error);
    });
    const tables = {};
    for (const name of [
      "workflows",
      "sources",
      "sourceObservations",
      "aiRuns",
      "assessments",
      "constraints",
      "facts",
      "evidence",
      "history",
      "courseStates"
    ]) {
      tables[name] = await new Promise((r, j) => {
        const q = db.transaction(name).objectStore(name).getAll();
        q.onsuccess = () => r(q.result);
        q.onerror = () => j(q.error);
      });
    }
    db.close();
    return tables;
  });
}
const hash = (v) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const before = await snapshot();
for (const name of Object.keys(before))
  assert.equal(hash(before[name]), hash(checkpoint.tables[name]), `CHECKPOINT_MISMATCH_${name}`);
assert.equal(before.workflows.length, 1);
const run = before.workflows[0];
assert.equal(run.workflowId, workflowId);
assert.equal(run.state, "waiting");
assert.equal(run.waitingReason, "host-permission");
const opened = await page.evaluate(
  async (courseId) =>
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
await page.reload();
await page.getByRole("button", { name: "Grant permission", exact: true }).waitFor();
const permissions = await page.evaluate(async () => ({
  origins: (await chrome.permissions.getAll()).origins,
  recorded: (await chrome.storage.local.get("syllab.permissionOrigins"))["syllab.permissionOrigins"]
}));
assert(
  !permissions.origins.some((p) => p.includes("blackboard.com")),
  "UNEXPECTED_PERMISSION_GRANT"
);
const ntu =
  context.pages().find((p) => p.url().startsWith("https://ntulearn.ntu.edu.sg/")) ??
  (await context.newPage());
await ntu.goto("https://ntulearn.ntu.edu.sg/ultra/institution-page");
assert(
  new URL(ntu.url()).hostname === "ntulearn.ntu.edu.sg" &&
    !/login|logon|auth-saml/i.test(ntu.url()),
  "AUTHENTICATION_ENVIRONMENT_REQUIRED"
);
const report = {
  status: "WAITING_USER_PERMISSION",
  workflowId,
  restoredSameProfile: true,
  allCheckpointTablesUnchanged: true,
  sourceCount: before.sources.length,
  observationCount: before.sourceObservations.length,
  aiRuns: 0,
  newFullCourseScans: 0,
  newWorkflows: 0,
  paidCalls: 0,
  exactPermissionOrigins: permissions.recorded,
  grantButtonVerified: true,
  browserRestartAfterObserverCrash: true,
  originalBrowserProcessPreserved: false
};
await mkdir("artifacts/v0.3.0/permission-036", { recursive: true });
await writeFile(
  "artifacts/v0.3.0/permission-036/RECOVERY.json",
  JSON.stringify(report, null, 2) + "\n"
);
await writeFile(`${privateDir}/POST-ACTIVATION.json`, JSON.stringify(before));
console.log(JSON.stringify(report));
// A recoverable observer error must never close this user's active browser/session.
for (;;) {
  try {
    const tables = await snapshot();
    const current = tables.workflows.find((w) => w.workflowId === workflowId);
    assert.equal(tables.workflows.length, 1, "SECOND_WORKFLOW_DETECTED");
    await writeFile(`${privateDir}/LATEST.json`, JSON.stringify({ run: current, tables }));
    if (current.state === "waiting" && current.waitingReason === "review") {
      const opened = await page.evaluate(
        async (courseId) =>
          chrome.runtime.sendMessage({
            contract: 2,
            type: "OPEN_SCREEN",
            surface: "full-page",
            screen: "IRV-01",
            courseId
          }),
        current.courseId
      );
      assert.equal(opened.ok, true);
      await page.reload();
      await writeFile(
        "artifacts/v0.3.0/permission-036/REVIEW-GATE.json",
        JSON.stringify(
          {
            workflowId,
            status: "INITIAL_REVIEW",
            sourceCount: tables.sources.length,
            observationCount: tables.sourceObservations.length,
            aiRunCount: tables.aiRuns.length,
            adoption: false
          },
          null,
          2
        ) + "\n"
      );
    }
  } catch (error) {
    await writeFile(`${privateDir}/OBSERVER-ERROR.txt`, String(error));
  }
  await new Promise((r) => setTimeout(r, 10000));
}
