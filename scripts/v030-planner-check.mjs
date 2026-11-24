// QA-only planner orchestration. Private native text and model output never enter public artifacts.
import { chromium } from "playwright";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const hash = (v) =>
  createHash("sha256")
    .update(typeof v === "string" ? v : JSON.stringify(v))
    .digest("hex");
const mode = process.argv[2];
if (!["reload", "start", "resume", "status", "continue007", "status007"].includes(mode))
  throw new Error("Use reload/start/status explicitly");
const browser = await chromium.connectOverCDP("http://127.0.0.1:9440");
const context = browser.contexts()[0];
let page = context
  .pages()
  .find((p) => p.url().startsWith("chrome-extension://jinfkigclgmeopkpkgfegnhgehaefibj/app.html"));
if (!page) throw new Error("QA_APP_REQUIRED");
async function state(id, courseId) {
  return page.evaluate(
    async ({ id, courseId }) => {
      const db = await new Promise((r, j) => {
        const q = indexedDB.open("syllab-local");
        q.onsuccess = () => r(q.result);
        q.onerror = () => j(q.error);
      });
      const read = (n) =>
        new Promise((r, j) => {
          const q = db.transaction(n).objectStore(n).getAll();
          q.onsuccess = () => r(q.result);
          q.onerror = () => j(q.error);
        });
      const sources = (await read("sources")).filter((s) => s.courseId === courseId),
        workflows = await read("workflows");
      const evaluation = id
        ? (await read("appMetadata")).find((m) => m.key === id)?.value
        : undefined;
      const runs = id ? (await read("aiRuns")).filter((r) => r.workflowId === id) : [];
      db.close();
      const t = await chrome.storage.session.get("syllab.qa.trace");
      return {
        sources,
        workflows,
        evaluation,
        runs,
        trace: id
          ? (t["syllab.qa.trace"] ?? []).filter(
              (e) =>
                JSON.stringify(e.fields ?? {}).includes(id) ||
                (e.event === "qa.ai-contract-failure" &&
                  e.at >= evaluation?.startedAt &&
                  (!evaluation?.endedAt || e.at <= evaluation.endedAt))
            )
          : []
      };
    },
    { id, courseId }
  );
}
if (mode === "reload") {
  const ntu = context.pages().filter((p) => p.url().startsWith("https://ntulearn.ntu.edu.sg/"));
  await page.evaluate(() => {
    setTimeout(() => chrome.runtime.reload(), 0);
  });
  await new Promise((r) => setTimeout(r, 1500));
  for (const p of ntu) await p.reload();
  page =
    context
      .pages()
      .find((p) =>
        p.url().startsWith("chrome-extension://jinfkigclgmeopkpkgfegnhgehaefibj/app.html")
      ) ?? (await context.newPage());
  await page.goto("chrome-extension://jinfkigclgmeopkpkgfegnhgehaefibj/app.html");
  console.log(JSON.stringify({ reloaded: true, refreshedNTUTabs: ntu.length }));
}
if (mode === "start" || mode === "resume" || mode === "continue007") {
  if (mode === "continue007") {
    const gate = JSON.parse(await readFile(".tmp/v030-007-offline-replay.json", "utf8"));
    if (gate.status !== "OFFLINE_PROTOCOL_REPLAY_PASS") throw new Error("OFFLINE_GATE_REQUIRED");
    const ci = await readFile(".tmp/v030-007-ci.log", "utf8");
    if (!ci.includes("Build separation verified:")) throw new Error("CI_GATE_REQUIRED");
    try {
      await readFile(".tmp/v030-007-continuation-attempt.json");
      throw new Error("ONE_AUTHORIZED_CONTINUATION_ALREADY_ATTEMPTED");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const prior =
    mode === "resume" || mode === "continue007"
      ? JSON.parse(await readFile(".tmp/v030-006-planner-id.json", "utf8"))
      : null;
  if (prior)
    await writeFile(`.tmp/v030-006-planner-id-${prior.evaluationId}.json`, JSON.stringify(prior));
  const manifest = JSON.parse(
    await readFile("evidence/private/v030-parser-measurement/FETCH_MANIFEST.json", "utf8")
  );
  const report = JSON.parse(
    await readFile("artifacts/v0.3.0/parser-measurement/REPORT.json", "utf8")
  );
  const courseId = manifest[0].courseId;
  const before = await state(null, courseId);
  if (before.workflows.some((w) => ["working", "queued"].includes(w.state)))
    throw new Error("ACTIVE_WORKFLOW");
  await writeFile(
    `evidence/private/v030-retrieval/BEFORE-${Date.now()}.json`,
    JSON.stringify(before)
  );
  const gapProjection = manifest.map((m) => {
    const row = report.rows.find((r) => r.sourceAlias === hash(m.sourceId));
    if (!row) throw new Error("PROJECTION_ALIAS_MISSING");
    return {
      sourceId: m.sourceId,
      contentHash: m.expectedContentHash,
      remainingGaps: row.remainingGaps
    };
  });
  if (mode === "continue007") {
    const previous = await state(prior.evaluationId, courseId);
    if (
      previous.evaluation?.expanded?.length !== 223 ||
      previous.evaluation.expanded.filter((e) => e.ref.startsWith("s:")).length !== 51 ||
      previous.evaluation.expanded.filter((e) => e.ref.startsWith("u:")).length !== 172
    )
      throw new Error("AUTHORIZED_CHECKPOINT_MISMATCH");
    await writeFile("evidence/private/v030-retrieval/BEFORE-007.json", JSON.stringify(before), {
      flag: "wx"
    });
    await writeFile(
      ".tmp/v030-007-continuation-attempt.json",
      JSON.stringify({
        recoverFrom: prior.evaluationId,
        at: new Date().toISOString(),
        handoff: "P2E-v0.3.0-2026-10-05-007"
      }),
      { flag: "wx" }
    );
  }
  const response = await page.evaluate((msg) => chrome.runtime.sendMessage(msg), {
    type: "E2E_RETRIEVAL_EVALUATE",
    courseId,
    gapProjection,
    ...(prior ? { recoverFrom: prior.evaluationId } : {})
  });
  await writeFile(
    mode === "continue007" ? ".tmp/v030-007-planner-id.json" : ".tmp/v030-006-planner-id.json",
    JSON.stringify({ ...response, courseId })
  );
  console.log(JSON.stringify(response));
}
if (mode === "status" || mode === "status007") {
  const id = JSON.parse(
    await readFile(
      mode === "status007" ? ".tmp/v030-007-planner-id.json" : ".tmp/v030-006-planner-id.json",
      "utf8"
    )
  );
  const data = await state(id.evaluationId, id.courseId);
  await writeFile(
    `evidence/private/v030-retrieval/${id.evaluationId}-${Date.now()}.json`,
    JSON.stringify(data)
  );
  console.log(
    JSON.stringify({
      state: data.evaluation?.state,
      rounds: data.evaluation?.rounds?.map((r) => ({
        durationMs: r.durationMs,
        newRefs: r.newRefs.length,
        newNativeCharacters: r.newNativeCharacters,
        inputTokens: r.inputTokens,
        outputTokens: r.outputTokens
      })),
      expandedRefs: data.evaluation?.expanded?.length,
      errorCode: data.evaluation?.errorCode,
      physicalCalls: data.trace.filter((t) => t.event === "qa.deepseek-physical-call").length
    })
  );
}
await browser.close();
