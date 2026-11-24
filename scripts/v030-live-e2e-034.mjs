/** One clean P2E-034 live workflow, after targeted PASS, in an isolated authenticated QA profile. */
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { launchExtension } from "./lib/browser-harness.mjs";
const preflightRepair = process.argv.includes("--repair-initial-preflight");
if (preflightRepair) {
  const prior = JSON.parse(await readFile("evidence/private/v030-live-034/START.json", "utf8"));
  assert(
    prior.ok === false && prior.errorCode === "QA_ACCEPTANCE_UNAVAILABLE",
    "KNOWN_PRE_DISPATCH_REFUSAL_REQUIRED"
  );
}
const dir = preflightRepair
    ? "evidence/private/v030-live-034-r1"
    : "evidence/private/v030-live-034",
  shared = "artifacts/v0.3.0/semantic-034";
await mkdir(dir, { recursive: true });
await mkdir(shared, { recursive: true });
const gate = JSON.parse(await readFile(`${shared}/r2/TARGETED.json`, "utf8"));
assert(gate.status === "PASS" && gate.matrix.some((r) => r.stage === "C" && r.status === "PASS"));
const ci = await readFile("/tmp/syllab-034-final-ci.log", "utf8");
assert(ci.includes("Build separation verified:"), "FINAL_CI_REQUIRED");
const handoff = await readFile("docs/collaboration/CHATGPT_TO_CODEX_HANDOFF.md", "utf8");
assert(
  handoff.includes("P2E-v0.3.0-2026-10-08-034") &&
    handoff.includes("READY_PAID_SEMANTIC_VALIDATION")
);
await writeFile(
  `${dir}/ONE-COURSE-CLAIM.json`,
  JSON.stringify({
    at: new Date().toISOString(),
    targetedGate: "PASS",
    maximumCleanWorkflowStarts: 1
  }),
  { flag: "wx" }
);
const old = await chromium.connectOverCDP("http://127.0.0.1:9440");
const oldContext = old.contexts()[0];
const oldPage = oldContext
  .pages()
  .find((p) => p.url().includes("/sidepanel.html") && p.url().startsWith("chrome-extension://"));
const ntu = oldContext.pages().find((p) => p.url().startsWith("https://ntulearn.ntu.edu.sg/"));
let app,
  report = { status: "IN_PROGRESS", targetedGate: "PASS", fullCourseStarts: 0, adoptionActions: 0 };
const courseId = JSON.parse(await readFile(".tmp/v030-007-planner-id.json", "utf8")).courseId;
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
async function existingState() {
  return oldPage.evaluate(async (courseId) => {
    const db = await new Promise((r, j) => {
      const q = indexedDB.open("syllab-local");
      q.onsuccess = () => r(q.result);
      q.onerror = j;
    });
    const tables = {};
    for (const name of [
      "courses",
      "semesters",
      "courseStates",
      "assessments",
      "constraints",
      "facts",
      "evidence",
      "history",
      "reviewDecisions",
      "exclusionMemory"
    ]) {
      tables[name] = await new Promise((r, j) => {
        const q = db.transaction(name).objectStore(name).getAll();
        q.onsuccess = () => r(q.result.filter((x) => !x.courseId || x.courseId === courseId));
        q.onerror = j;
      });
    }
    db.close();
    return tables;
  }, courseId);
}
try {
  if (!oldPage || !ntu) throw Error("AUTHENTICATED_NTU_ENVIRONMENT_REQUIRED");
  const before = await existingState();
  await writeFile(`${dir}/ORIGINAL-BEFORE.json`, JSON.stringify(before));
  const course = before.courses.find((c) => c.courseId === courseId);
  assert(course, "KNOWN_LARGE_COURSE_REQUIRED");
  const kind = course.established ? "rebuild" : "initial";
  report.workflowKind = kind;
  // Keep all existing user workflows/state untouched. Transfer authenticated NTU cookies only in memory.
  app = await launchExtension();
  const context = app.fullPage.context();
  await context.addCookies(await oldContext.cookies("https://ntulearn.ntu.edu.sg"));
  const settings = await oldPage.evaluate(async () =>
    chrome.storage.local.get([
      "syllab.deepseekApiKey",
      "syllab.deepseekApiKeyStatus",
      "syllab.privacyAuthorization",
      "syllab.apiUsageAuthorization"
    ])
  );
  assert(
    settings["syllab.privacyAuthorization"]?.granted &&
      settings["syllab.apiUsageAuthorization"]?.granted
  );
  await app.fullPage.evaluate(async (settings) => chrome.storage.local.set(settings), settings);
  for (const key of Object.keys(settings)) Reflect.deleteProperty(settings, key);
  await app.fullPage.evaluate(
    async (tables) => {
      const db = await new Promise((r, j) => {
        const q = indexedDB.open("syllab-local");
        q.onsuccess = () => r(q.result);
        q.onerror = j;
      });
      const t = db.transaction(Object.keys(tables), "readwrite");
      for (const [name, rows] of Object.entries(tables))
        for (const row of rows) t.objectStore(name).put(row);
      await new Promise((r, j) => {
        t.oncomplete = r;
        t.onerror = j;
      });
      db.close();
    },
    kind === "rebuild" ? before : { courses: [course], semesters: before.semesters }
  );
  const live = await context.newPage();
  await live.goto(ntu.url());
  if (
    new URL(live.url()).hostname !== "ntulearn.ntu.edu.sg" ||
    /login|auth-saml|logon/i.test(live.url())
  )
    throw Error("AUTHENTICATED_NTU_ENVIRONMENT_REQUIRED");
  const preflight = await app.fullPage.evaluate(
    async (courseId) =>
      chrome.runtime.sendMessage({ type: "E2E_CLEAN_REBUILD", courseId, preflight: true }),
    courseId
  );
  assert(preflight.ok && preflight.activeWorkflowCount === 0, "ISOLATED_WORKFLOW_PREFLIGHT_FAILED");
  await writeFile(
    `${dir}/START-INTENT.json`,
    JSON.stringify({ at: new Date().toISOString(), courseId, kind }),
    { flag: "wx" }
  );
  const started = await app.fullPage.evaluate(
    async ({ courseId, kind }) =>
      chrome.runtime.sendMessage({
        type: "E2E_CLEAN_REBUILD",
        courseId,
        workflowKind: kind,
        acceptancePolicy: "architecture-034"
      }),
    { courseId, kind }
  );
  await writeFile(`${dir}/START.json`, JSON.stringify(started));
  if (!started.ok) throw Error("LIVE_START_REFUSED");
  // Bind the existing run to the normal Scan view; this never starts another workflow.
  for (const [page, surface] of [
    [app.fullPage, "full-page"],
    [app.panel, "side-panel"]
  ]) {
    await page.evaluate(
      async ({ courseId, surface }) =>
        chrome.runtime.sendMessage({
          contract: 2,
          type: "OPEN_SCREEN",
          surface,
          screen: "ISC-02",
          courseId
        }),
      { courseId, surface }
    );
  }
  report.fullCourseStarts = 1;
  const began = Date.now();
  let last = "";
  for (;;) {
    const snapshot = await app.fullPage.evaluate(async (workflowId) => {
      const db = await new Promise((r, j) => {
        const q = indexedDB.open("syllab-local");
        q.onsuccess = () => r(q.result);
        q.onerror = j;
      });
      const tables = {};
      for (const name of [
        "workflows",
        "sources",
        "sourceObservations",
        "aiRuns",
        "appMetadata",
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
          q.onerror = j;
        });
      }
      db.close();
      const run = tables.workflows.find((w) => w.workflowId === workflowId);
      const keys = (await chrome.storage.local.getKeys()).filter((k) =>
        k.startsWith("syllab.staged.")
      );
      const staging = await chrome.storage.local.get(keys);
      let streams = [];
      const privateDb = (await indexedDB.databases()).some(
        (db) => db.name === "syllab.qa.private-streams"
      )
        ? await new Promise((r) => {
            const q = indexedDB.open("syllab.qa.private-streams");
            q.onsuccess = () => r(q.result);
            q.onerror = () => r(null);
          })
        : null;
      if (privateDb?.objectStoreNames.contains("streams"))
        streams = await new Promise((r, j) => {
          const q = privateDb.transaction("streams").objectStore("streams").getAll();
          q.onsuccess = () => r(q.result);
          q.onerror = j;
        });
      privateDb?.close();
      return { run, tables, staging, streams };
    }, started.workflowId);
    await writeFile(`${dir}/LATEST.json`, JSON.stringify(snapshot));
    const run = snapshot.run;
    assert(run, "WORKFLOW_LOST");
    const status = {
      phase: run.phase,
      state: run.state,
      completed: run.completedSources ?? null,
      total: run.totalSources ?? null,
      modelCalls: snapshot.streams.length,
      runtimeMs: Date.now() - began
    };
    const key = JSON.stringify({ ...status, runtimeMs: 0 });
    if (key !== last) {
      console.log(JSON.stringify(status));
      last = key;
    }
    const numericLedger = snapshot.streams.map((s) => ({
      stage: s.stage,
      physicalIdHash: hash(s.logicalUnitId ?? s.streamId),
      startedAt: s.startedAt,
      finishedAt: s.finishedAt ?? null,
      model: s.model,
      usage: s.providerUsage ?? null,
      finishReason: s.finishReason ?? null,
      httpStatus: s.httpStatus ?? null,
      latencyMs: s.finishedAt ? Date.parse(s.finishedAt) - Date.parse(s.startedAt) : null
    }));
    await writeFile(`${shared}/LIVE-LEDGER.json`, JSON.stringify(numericLedger, null, 2) + "\n");
    report = {
      ...report,
      ...status,
      architecturePolicy: run.architecturePolicy,
      sourceCount: snapshot.tables.sources.length,
      errorCode: run.errorCode ?? null,
      established: course.established
    };
    if (run.state === "waiting" && run.phase === "review") {
      const screen = kind === "rebuild" ? "RBL-02" : "IRV-02";
      const opened = await app.fullPage.evaluate(
        async ({ courseId, screen }) =>
          chrome.runtime.sendMessage({
            contract: "syllab.e2e/1",
            type: "E2E_OPEN",
            surface: "full-page",
            screen,
            courseId
          }),
        { courseId, screen }
      );
      assert(opened?.ok, "REVIEW_ROUTE_FAILED");
      await app.fullPage.reload();
      await app.fullPage.screenshot({ path: `${dir}/REVIEW.png`, fullPage: true });
      report.reviewRendered = true;
      report.status = "COMPLETED_REVIEW";
      report.stopScreen = kind === "rebuild" ? "Rebuilt Preview" : "Initial Review";
      break;
    }
    if (["failed", "cancelled", "complete"].includes(run.state)) {
      report.status = "LIVE_E2E_FAIL";
      report.errorCode = run.errorCode ?? "UNEXPECTED_TERMINAL";
      break;
    }
    await writeFile(`${shared}/LIVE.json`, JSON.stringify(report, null, 2) + "\n");
    await new Promise((r) => setTimeout(r, 10000));
  }
  const after = await existingState();
  await writeFile(`${dir}/ORIGINAL-AFTER.json`, JSON.stringify(after));
  report.originalUserStateUnchanged = hash(before) === hash(after);
  assert(report.originalUserStateUnchanged, "ORIGINAL_USER_STATE_CHANGED");
  await writeFile(`${shared}/LIVE.json`, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
} catch (error) {
  await writeFile(`${dir}/ERROR.txt`, String(error?.stack ?? error));
  report.status =
    error.message === "AUTHENTICATED_NTU_ENVIRONMENT_REQUIRED"
      ? "STOP_USER_ENVIRONMENT_REQUIRED_AFTER_G_SEMANTIC"
      : "LIVE_E2E_BLOCKED";
  report.errorCode = /^[A-Z_]+$/.test(error.message)
    ? error.message
    : "ENGINEERING_ENVIRONMENT_FAILURE";
  await writeFile(`${shared}/LIVE.json`, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
  process.exitCode = 1;
} finally {
  if (app) await app.close();
  await old.close();
}
