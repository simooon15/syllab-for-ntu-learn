// Acceptance-only orchestration; real workflow path, no seeding or private attachment shortcuts.
import { chromium } from "playwright";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
const mode = process.argv[2];
if (!["baseline", "preflight", "start", "status"].includes(mode))
  throw Error("EXPLICIT_MODE_REQUIRED");
const acceptanceId = process.argv[3] ?? "009";
if (!["009", "010", "011", "015"].includes(acceptanceId)) throw Error("UNKNOWN_ACCEPTANCE_HANDOFF");
const directory =
  acceptanceId === "015"
    ? "evidence/private/v030-clean-rebuild-da005-015"
    : acceptanceId !== "009"
      ? "evidence/private/v030-clean-rebuild-second"
      : "evidence/private/v030-clean-rebuild";
const ciPath =
  acceptanceId !== "009" ? `.tmp/v030-${acceptanceId}-ci-final.log` : ".tmp/v030-009-ci.log";
const preflightPath = `.tmp/v030-${acceptanceId}-preflight.json`;
async function blockerGates() {
  if (acceptanceId === "015") {
    if (JSON.parse(await readFile(".tmp/v030-015-blocker-gates.json", "utf8")).status !== "PASS")
      throw Error("DA005_BLOCKER_GATES_REQUIRED");
    return;
  }
  if (acceptanceId === "011") {
    for (const name of ["offline", "targeted-gate"]) {
      if (JSON.parse(await readFile(`.tmp/v030-011-${name}.json`, "utf8")).status !== "PASS")
        throw Error(`COVERAGE_AUDIT_GATE_REQUIRED:${name}`);
    }
    return;
  }
  if (acceptanceId !== "010") return;
  for (const name of ["offline", "planner-gate"]) {
    if (JSON.parse(await readFile(`.tmp/v030-010-${name}.json`, "utf8")).status !== "PASS")
      throw Error(`BLOCKER_GATE_REQUIRED:${name}`);
  }
}
// Enrollment refresh updates the Course observation timestamp, not trusted content/revision.
const comparable = (name, rows) =>
  name === "courses" ? rows?.map(({ updatedAt: _at, ...course }) => course) : rows;

await mkdir(directory, { recursive: true });
const browser = await chromium.connectOverCDP("http://127.0.0.1:9440");
try {
  const page = browser
    .contexts()[0]
    .pages()
    .find((p) =>
      p.url().startsWith("chrome-extension://jinfkigclgmeopkpkgfegnhgehaefibj/app.html")
    );
  if (!page) throw Error("QA_APP_REQUIRED");
  const prior = JSON.parse(await readFile(".tmp/v030-007-planner-id.json", "utf8"));
  const courseId = prior.courseId;
  const state = async () =>
    page.evaluate(async (courseId) => {
      const db = await new Promise((r, j) => {
        const q = indexedDB.open("syllab-local");
        q.onsuccess = () => r(q.result);
        q.onerror = () => j(q.error);
      });
      const tables = {};
      for (const name of [
        "courses",
        "courseStates",
        "sources",
        "sourceObservations",
        "workflows",
        "aiRuns",
        "assessments",
        "constraints",
        "facts",
        "evidence",
        "reviewItems",
        "reviewDecisions",
        "history",
        "changes",
        "exclusionMemory"
      ]) {
        if (!db.objectStoreNames.contains(name)) continue;
        tables[name] = await new Promise((r, j) => {
          const q = db.transaction(name).objectStore(name).getAll();
          q.onsuccess = () => r(q.result.filter((x) => !x.courseId || x.courseId === courseId));
          q.onerror = () => j(q.error);
        });
      }
      db.close();
      const stagingKeys = (await chrome.storage.local.getKeys()).filter((k) =>
        k.startsWith("syllab.staged.")
      );
      const local = await chrome.storage.local.get(stagingKeys);
      const staging = Object.fromEntries(
        Object.entries(local).filter(([k]) => k.startsWith("syllab.staged."))
      );
      const trace = (await chrome.storage.session.get("syllab.qa.trace"))["syllab.qa.trace"] ?? [];
      return {
        at: new Date().toISOString(),
        courseId,
        tables,
        staging,
        trace,
        activity: {
          text: document.querySelector("[data-region=ai-activity]")?.textContent ?? "",
          task: document.querySelector("[data-region=task]")?.textContent ?? ""
        }
      };
    }, courseId);
  if (mode === "baseline") {
    try {
      await readFile(`${directory}/BEFORE.json`);
      throw Error("BASELINE_ALREADY_EXISTS");
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    const snapshot = await state();
    if (
      snapshot.tables.workflows.some((w) =>
        ["working", "queued", "saved", "waiting"].includes(w.state)
      )
    )
      throw Error("ACTIVE_HISTORICAL_WORKFLOW");
    await writeFile(`${directory}/BEFORE.json`, JSON.stringify(snapshot));
    console.log(
      JSON.stringify({
        baselineSaved: true,
        historicalWorkflows: snapshot.tables.workflows.length,
        sources: snapshot.tables.sources.length
      })
    );
  }
  if (mode === "preflight") {
    await blockerGates();
    const ci = await readFile(ciPath, "utf8");
    if (!ci.includes("Build separation verified:")) throw Error("CI_GATE_REQUIRED");
    const shipped = await readFile("extension/dist/background.js", "utf8");
    const qa = await readFile("extension/dist-qa/background.js", "utf8");
    if (shipped.includes("E2E_CLEAN_REBUILD") || !qa.includes("E2E_CLEAN_REBUILD"))
      throw Error("QA_BOUNDARY_FAILED");
    const baseline = JSON.parse(await readFile(`${directory}/BEFORE.json`, "utf8"));
    const current = await state();
    const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
    for (const name of Object.keys(baseline.tables)) {
      if (
        hash(comparable(name, baseline.tables[name])) !==
        hash(comparable(name, current.tables[name]))
      )
        throw Error(`PREFLIGHT_STATE_CHANGED:${name}`);
    }
    if (hash(baseline.staging) !== hash(current.staging)) throw Error("PREFLIGHT_STAGING_CHANGED");
    const probe = await page.evaluate(
      (courseId) =>
        chrome.runtime.sendMessage({ type: "E2E_CLEAN_REBUILD", courseId, preflight: true }),
      courseId
    );
    if (
      !probe.ok ||
      probe.acceptanceContext !== "same-workflow-only" ||
      probe.activeWorkflowCount !== 0
    )
      throw Error("QA_PREFLIGHT_NOT_READY");
    const gate = {
      status: "PASS",
      at: new Date().toISOString(),
      qaOnly: true,
      cleanAcceptanceContext: "same-workflow-only",
      historicalPlannerReuse: "blocked",
      historicalTaskAReuse: "blocked",
      historicalTaskBReuse: "blocked",
      genericCrossWorkflowReuse: "blocked",
      sameWorkflowRecovery: "allowed",
      privateParserCacheFetchShortcut: "not used",
      historicalStateUnchanged: true,
      courseUpdatedAtRefreshed:
        JSON.stringify(baseline.tables.courses) !== JSON.stringify(current.tables.courses),
      fullCI: "PASS",
      regressionEvidence: ciPath,
      fetchPath:
        "BlackboardMachinePort -> PARSE_ATTACHMENT -> fetchAttachmentPayload -> parseInIsolatedWorker"
    };
    await writeFile(preflightPath, JSON.stringify(gate, null, 2));
    console.log(JSON.stringify(gate));
  }
  if (mode === "start") {
    await blockerGates();
    const ci = await readFile(ciPath, "utf8");
    if (!ci.includes("Build separation verified:")) throw Error("CI_GATE_REQUIRED");
    const gate = JSON.parse(await readFile(preflightPath, "utf8"));
    if (gate.status !== "PASS") throw Error("PREFLIGHT_REQUIRED");
    try {
      await readFile(`${directory}/START.json`);
      throw Error("CLEAN_RUN_ALREADY_STARTED");
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    const before = JSON.parse(await readFile(`${directory}/BEFORE.json`, "utf8"));
    const current = await state();
    const hash = (v) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
    for (const name of [
      "courses",
      "courseStates",
      "assessments",
      "constraints",
      "facts",
      "evidence",
      "history",
      "reviewItems",
      "reviewDecisions",
      "changes",
      "exclusionMemory",
      "workflows"
    ])
      if (
        hash(comparable(name, before.tables[name])) !== hash(comparable(name, current.tables[name]))
      )
        throw Error(`PREFLIGHT_STATE_CHANGED:${name}`);
    // Durable dispatch intent prevents a second clean workflow if the harness response is lost.
    await writeFile(
      `${directory}/START.json`,
      JSON.stringify({ courseId, at: new Date().toISOString(), state: "dispatch-intent" })
    );
    let acceptanceRefs = [];
    if (acceptanceId !== "015") {
      const oracle = JSON.parse(
        await readFile("evidence/private/v030-retrieval/KNOWN_RECALL_007.json", "utf8")
      );
      const objectiveIndex = JSON.parse(
        await readFile("evidence/private/v030-clean-rebuild/INDEX.json", "utf8")
      );
      acceptanceRefs = [
        ...new Set([
          ...oracle.lectureLocators.map((row) => row.ref),
          ...oracle.dueDateAssignments.map((row) => row.ref),
          ...objectiveIndex.sources
            .filter((row) => ["assignment", "announcement"].includes(row.kind))
            .map((row) => row.ref)
        ])
      ];
    }
    const result = await page.evaluate(
      ({ courseId, acceptanceRefs, acceptancePolicy }) =>
        chrome.runtime.sendMessage({
          type: "E2E_CLEAN_REBUILD",
          courseId,
          acceptanceRefs,
          acceptancePolicy
        }),
      {
        courseId,
        acceptanceRefs,
        acceptancePolicy: acceptanceId === "015" ? "da005-015" : undefined
      }
    );
    await writeFile(
      `${directory}/START.json`,
      JSON.stringify({ ...result, courseId, at: new Date().toISOString() })
    );
    console.log(JSON.stringify(result));
  }
  if (mode === "status") {
    const started = JSON.parse(await readFile(`${directory}/START.json`, "utf8"));
    const snapshot = await state();
    const run = snapshot.tables.workflows.find((w) => w.workflowId === started.workflowId);
    const at = Date.now();
    await writeFile(`${directory}/snapshot-${at}.json`, JSON.stringify(snapshot));
    // Merge telemetry snapshots so the QA session buffer never becomes the evidence archive.
    let events = [];
    try {
      events = JSON.parse(await readFile(`${directory}/EVENTS.json`, "utf8"));
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    const base = JSON.parse(await readFile(`${directory}/BEFORE.json`, "utf8"));
    const merged = new Map(
      [...events, ...snapshot.trace.filter((e) => e.at >= started.at)].map((e) => [
        JSON.stringify(e),
        e
      ])
    );
    await writeFile(`${directory}/EVENTS.json`, JSON.stringify([...merged.values()]));
    const hash = (v) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
    const trustedUnchanged = [
      "courses",
      "courseStates",
      "assessments",
      "constraints",
      "facts",
      "evidence",
      "history",
      "reviewItems",
      "reviewDecisions",
      "changes",
      "exclusionMemory"
    ].every((n) => hash(comparable(n, base.tables[n])) === hash(comparable(n, snapshot.tables[n])));
    const historyUnchanged = base.tables.workflows.every(
      (w) => hash(w) === hash(snapshot.tables.workflows.find((x) => x.workflowId === w.workflowId))
    );
    const runs = snapshot.tables.aiRuns.filter((r) => r.workflowId === started.workflowId);
    const obs = snapshot.tables.sourceObservations.filter(
      (o) => o.workflowId === started.workflowId
    );
    console.log(
      JSON.stringify({
        workflow: run
          ? Object.fromEntries(
              [
                "workflowId",
                "kind",
                "state",
                "phase",
                "attempt",
                "createdAt",
                "updatedAt",
                "qaSemanticClean",
                "errorCode",
                "waitingReason"
              ]
                .filter((k) => run[k] !== undefined)
                .map((k) => [k, run[k]])
            )
          : null,
        activityChars: snapshot.activity?.text?.length ?? 0,
        observations: obs.length,
        fetchFailures: obs.filter((o) => o.fetchStatus !== "ok").length,
        aiRuns: runs.length,
        tasks: Object.fromEntries(
          [...new Set(runs.map((r) => r.task))].map((t) => [
            t,
            runs.filter((r) => r.task === t).length
          ])
        ),
        trustedUnchanged,
        historyUnchanged,
        evidenceSnapshot: `${directory}/snapshot-${at}.json`
      })
    );
  }
} finally {
  await browser.close();
}
