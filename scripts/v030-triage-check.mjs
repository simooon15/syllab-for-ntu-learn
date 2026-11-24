/** Read or start QA-only Source Triage; never Discovery, Vision, Task A or a workflow.
 * Raw profiles/results stay in evidence/private. Stdout contains metadata-only aggregates. */
import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import assert from "node:assert/strict";

export function triageSummary(data) {
  const { evaluation, runs = [], trace = [] } = data;
  if (evaluation.passes) return revisedSummary(data);
  const profiles = new Map(evaluation.profiles.map((profile) => [profile.sourceId, profile]));
  const results = evaluation.results;
  const enters = (result) =>
    result.classification !== "TEACHING_ONLY" || result.confidence !== "HIGH";
  const downstream = results.filter(enters).map((result) => profiles.get(result.sourceId));
  const attachments = downstream.filter((profile) => profile.kind === "attachment");
  const physical = trace
    .filter((entry) => entry.event === "qa.deepseek-physical-call")
    .map((entry) => entry.fields);
  const sumKnown = (items, field) =>
    items.length && items.every((item) => typeof item[field] === "number")
      ? items.reduce((n, item) => n + item[field], 0)
      : null;
  return {
    stage: "targeted-real-model-triage",
    promptVersion: runs[0]?.promptVersion ?? null,
    schemaVersion: runs[0]?.schemaVersion ?? null,
    sources: profiles.size,
    classifications: Object.fromEntries(
      ["PRODUCT_RELEVANT", "TEACHING_ONLY", "UNCERTAIN"].map((c) => [
        c,
        results.filter((r) => r.classification === c).length
      ])
    ),
    teachingOnlyHigh: results.filter((r) => !enters(r)).length,
    projection: {
      downstreamSources: downstream.length,
      attachments: attachments.length,
      nativeUnits: attachments.reduce((n, p) => n + p.nativeUnits, 0),
      historicalParserVisualGaps: attachments.reduce((n, p) => n + p.visualGapUnits, 0),
      postRepairRealParserGaps: null
    },
    wallClockMs: Date.parse(evaluation.endedAt) - Date.parse(evaluation.startedAt),
    logicalInvocations: runs.length,
    physicalInvocations: physical.length || null,
    repairInvocations: physical.length
      ? physical.filter((p) => p.attemptType === "repair").length
      : null,
    schemaFailuresBeforeRepair: physical.length
      ? physical.filter((p) => p.failureClass === "schema").length
      : null,
    networkOrProviderFailures: physical.filter((p) => p.failureClass && p.failureClass !== "schema")
      .length,
    physicalLatenciesMs: physical.map((p) => p.latencyMs),
    inputTokens: sumKnown(runs, "inputTokens"),
    outputTokens: sumKnown(runs, "outputTokens"),
    reasoningTokens: sumKnown(runs, "reasoningTokens"),
    cacheHitTokens: sumKnown(physical, "cacheHitTokens"),
    cacheMissTokens: sumKnown(physical, "cacheMissTokens"),
    cost: null,
    costStatus: "unavailable-no-verified-pricing",
    fullCourseWorkflowsStarted: 0,
    visionCalls: 0,
    taskACalls: 0,
    results: results.map((r) => ({
      sourceAlias: createHash("sha256").update(r.sourceId).digest("hex"),
      classification: r.classification,
      confidence: r.confidence,
      reasonCode: r.reasonCode,
      evidenceUsed: r.evidenceUsed,
      downstream: enters(r)
    }))
  };
}
function revisedSummary({ evaluation, runs = [], trace = [], measurement }) {
  const enters = (r) =>
    r.decision !== undefined ||
    !(
      r.classification === "TEACHING_ONLY" &&
      r.productRelevantEvidence === "ABSENT" &&
      r.profileCoverage === "SUFFICIENT"
    );
  const alias = (id) => createHash("sha256").update(id).digest("hex");
  const measured = new Map((measurement?.rows ?? []).map((r) => [r.sourceAlias, r]));
  const profiles = new Map(evaluation.profiles.map((p) => [p.sourceId, p]));
  const physical = trace
    .filter((e) => e.event === "qa.deepseek-physical-call")
    .map((e) => e.fields);
  const sum = (items, field) =>
    items.length && items.every((i) => typeof i[field] === "number")
      ? items.reduce((n, i) => n + i[field], 0)
      : null;
  const projection = (results) => {
    const p = results.map((r) => profiles.get(r.sourceId));
    const attachments = p.filter((p) => p.kind === "attachment");
    return {
      sources: p.length,
      attachments: attachments.length,
      nativeUnits: attachments.reduce((n, p) => n + p.nativeUnits, 0),
      latestParserVisualGaps: attachments.every((p) => measured.has(alias(p.sourceId)))
        ? attachments.reduce((n, p) => n + measured.get(alias(p.sourceId)).visualGapUnits, 0)
        : null
    };
  };
  return {
    stage: "revised-two-pass-triage",
    sources: profiles.size,
    wallClockMs: Date.parse(evaluation.endedAt) - Date.parse(evaluation.startedAt),
    coarse: {
      process: evaluation.coarseResults.filter((r) => r.decision === "PROCESS").length,
      deepCandidates: evaluation.coarseResults.filter((r) => r.decision === "DEEP_TRIAGE_CANDIDATE")
        .length
    },
    safeToSkip: projection(evaluation.results.filter((r) => !enters(r))),
    downstream: projection(evaluation.results.filter(enters)),
    passes: evaluation.passes.map((p) => {
      const calls = physical.filter((c) => c.logicalUnitId?.includes(":" + p.pass + ":"));
      const logical = runs.filter((r) =>
        p.pass === "coarse"
          ? r.schemaVersion.includes("coarse")
          : !r.schemaVersion.includes("coarse")
      );
      return {
        ...p,
        physicalCalls: calls.length || null,
        latenciesMs: calls.map((c) => c.latencyMs),
        repairs: calls.length ? calls.filter((c) => c.attemptType === "repair").length : null,
        schemaFailures: calls.filter((c) => c.failureClass === "schema").length,
        networkOrProviderFailures: calls.filter(
          (c) => c.failureClass && c.failureClass !== "schema"
        ).length,
        inputTokens: sum(logical, "inputTokens"),
        outputTokens: sum(logical, "outputTokens"),
        reasoningTokens: sum(logical, "reasoningTokens"),
        cacheHitTokens: sum(calls, "cacheHitTokens"),
        cacheMissTokens: sum(calls, "cacheMissTokens")
      };
    }),
    cost: null,
    costStatus: "unavailable-no-verified-pricing",
    taskACalls: 0,
    visionCalls: 0,
    fullCourseWorkflowsStarted: 0,
    results: evaluation.results.map((r) => ({
      sourceAlias: alias(r.sourceId),
      ...("decision" in r
        ? { coarseDecision: r.decision }
        : {
            classification: r.classification,
            productRelevantEvidence: r.productRelevantEvidence,
            profileCoverage: r.profileCoverage,
            confidence: r.confidence
          }),
      reasonCode: r.reasonCode,
      evidenceUsed: r.evidenceUsed,
      downstream: enters(r)
    }))
  };
}
const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};
if (args.includes("--self-test")) {
  const profiles = ["a", "b", "c"].map((sourceId) => ({
    sourceId,
    kind: "attachment",
    nativeUnits: 7,
    visualGapUnits: 6
  }));
  const results = [
    { sourceId: "a", classification: "TEACHING_ONLY", confidence: "HIGH" },
    { sourceId: "b", classification: "TEACHING_ONLY", confidence: "LOW" },
    { sourceId: "c", classification: "UNCERTAIN", confidence: "LOW" }
  ];
  const summary = triageSummary({
    evaluation: {
      profiles,
      results,
      startedAt: "2026-10-04T00:00:00Z",
      endedAt: "2026-10-04T00:00:01Z"
    }
  });
  assert.equal(summary.projection.downstreamSources, 2);
  assert.equal(summary.projection.nativeUnits, 14);
  assert.equal(summary.projection.historicalParserVisualGaps, 12);
  assert.equal(summary.cost, null);
  assert.equal(summary.inputTokens, null);
  assert.equal(summary.physicalInvocations, null);
  const revised = triageSummary({
    evaluation: {
      profiles,
      results: [
        { sourceId: "a", decision: "PROCESS" },
        {
          sourceId: "b",
          classification: "TEACHING_ONLY",
          productRelevantEvidence: "ABSENT",
          profileCoverage: "SUFFICIENT",
          confidence: "LOW"
        },
        {
          sourceId: "c",
          classification: "TEACHING_ONLY",
          productRelevantEvidence: "ABSENT",
          profileCoverage: "INSUFFICIENT",
          confidence: "HIGH"
        }
      ],
      coarseResults: [
        { sourceId: "a", decision: "PROCESS" },
        { sourceId: "b", decision: "DEEP_TRIAGE_CANDIDATE" },
        { sourceId: "c", decision: "DEEP_TRIAGE_CANDIDATE" }
      ],
      passes: [
        { pass: "coarse", sources: 3, logicalCalls: 1, durationMs: 10 },
        { pass: "deep", sources: 2, logicalCalls: 1, durationMs: 10 }
      ],
      startedAt: "2026-10-05T00:00:00Z",
      endedAt: "2026-10-05T00:00:01Z"
    },
    measurement: {
      rows: profiles.map((p) => ({
        sourceAlias: createHash("sha256").update(p.sourceId).digest("hex"),
        visualGapUnits: 2
      }))
    }
  });
  assert.equal(revised.safeToSkip.sources, 1);
  assert.equal(revised.safeToSkip.latestParserVisualGaps, 2);
  assert.equal(revised.downstream.sources, 2);
  assert.equal(revised.downstream.latestParserVisualGaps, 4);
  assert.equal(revised.passes[0].physicalCalls, null);
  console.log("Triage ledger/projection self-test PASS");
} else if (args.includes("--evaluation") || args.includes("--start")) {
  const cdp = option("--cdp") ?? "http://127.0.0.1:9440";
  async function evaluate(expression) {
    const targets = await (await fetch(`${cdp}/json/list`)).json();
    const app = targets.find(
      (target) => target.type === "page" && target.url.endsWith("/app.html")
    );
    if (!app) throw new Error("QA_APP_MISSING");
    const socket = new WebSocket(app.webSocketDebuggerUrl);
    return new Promise((resolveResult, reject) => {
      socket.addEventListener(
        "open",
        () =>
          socket.send(
            JSON.stringify({
              id: 1,
              method: "Runtime.evaluate",
              params: { expression, awaitPromise: true, returnByValue: true }
            })
          ),
        { once: true }
      );
      socket.addEventListener("error", () => reject(new Error("CDP_DISCONNECTED")), { once: true });
      socket.addEventListener("message", (event) => {
        const result = JSON.parse(event.data);
        if (result.id !== 1) return;
        socket.close();
        if (result.error || result.result.exceptionDetails)
          reject(new Error("QA_EVALUATION_FAILED"));
        else resolveResult(result.result.result.value);
      });
    });
  }
  if (args.includes("--start")) {
    const courseId = option("--course");
    if (!courseId || courseId.startsWith("--")) throw new Error("EXPLICIT_COURSE_REQUIRED");
    console.log(
      JSON.stringify(
        await evaluate(
          `chrome.runtime.sendMessage({type:'E2E_TRIAGE_EVALUATE',courseId:${JSON.stringify(courseId)}})`
        )
      )
    );
  } else {
    const evaluationId = option("--evaluation");
    const data = await evaluate(
      `(async()=>{const db=await new Promise((r,j)=>{const q=indexedDB.open('syllab-local');q.onsuccess=()=>r(q.result);q.onerror=()=>j(new Error('QA_DB_FAILED'));});const get=(name,key)=>new Promise(r=>{const q=key?db.transaction(name).objectStore(name).get(key):db.transaction(name).objectStore(name).getAll();q.onsuccess=()=>r(q.result)});const evaluation=(await get('appMetadata',${JSON.stringify(evaluationId)}))?.value;const runs=(await get('aiRuns')).filter(r=>r.workflowId===${JSON.stringify(evaluationId)});db.close();const t=await chrome.storage.session.get('syllab.qa.trace');const trace=(t['syllab.qa.trace']??[]).filter(e=>JSON.stringify(e.fields??{}).includes(${JSON.stringify(evaluationId)}));return{evaluation,runs,trace};})()`
    );
    if (data.evaluation?.state !== "completed")
      console.log(JSON.stringify({ state: data.evaluation?.state ?? "missing" }));
    else {
      const privatePath = resolve("evidence/private", `${evaluationId}.json`);
      await mkdir(dirname(privatePath), { recursive: true });
      await writeFile(privatePath, JSON.stringify(data, null, 2));
      if (data.evaluation.passes)
        data.measurement = JSON.parse(
          await readFile("artifacts/v0.3.0/parser-measurement/REPORT.json", "utf8")
        );
      const summary = triageSummary(data);
      if (args.includes("--report")) {
        const report = resolve(option("--report"));
        await mkdir(dirname(report), { recursive: true });
        await writeFile(report, `${JSON.stringify(summary, null, 2)}\n`);
      }
      const { results: _results, ...aggregate } = summary;
      console.log(JSON.stringify(aggregate));
    }
  }
}
