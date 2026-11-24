// Read-only accounting from private snapshots; public output excludes titles, prompts and answers.
import { readFile, writeFile, readdir, mkdir, stat } from "node:fs/promises";
import { build } from "esbuild";
import { createRequire } from "node:module";
import { createHash } from "node:crypto";
const directory = "evidence/private/v030-clean-rebuild-da005-015";
const files = (await readdir(directory)).filter((n) => /^snapshot-\d+\.json$/.test(n)).sort();
const snapshot = JSON.parse(await readFile(`${directory}/${files.at(-1)}`, "utf8"));
const before = JSON.parse(await readFile(`${directory}/BEFORE.json`, "utf8"));
const start = JSON.parse(await readFile(`${directory}/START.json`, "utf8"));
const events = JSON.parse(await readFile(`${directory}/EVENTS.json`, "utf8"));
await build({
  stdin: {
    contents: `export { contentIndex } from './extension/src/v2/content-index'; export { needsTeachingClassification } from './extension/src/v2/teaching-deferral'; export { stableDigest } from './extension/src/v2/chunking';`,
    resolveDir: process.cwd()
  },
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: ".tmp/v030-015-accounting-helper.cjs"
});
const { contentIndex, needsTeachingClassification, stableDigest } = createRequire(import.meta.url)(
  `${process.cwd()}/.tmp/v030-015-accounting-helper.cjs`
);
const wf = snapshot.tables.workflows.find((w) => w.workflowId === start.workflowId);
const sources = snapshot.tables.sources.filter((s) => !s.removedFromNative);
const index = contentIndex(sources);
const manifest = sources.filter(needsTeachingClassification).map((s, n) => {
  const row = index.sources.find((r) => r.sourceId === s.sourceId),
    cp = s.teaching;
  const units = s.parsed?.units ?? [];
  const valid = cp?.workflowId === wf.workflowId;
  const classification = valid ? cp.result.classification : "NOT_YET_CLASSIFIED";
  // This describes AI rationale for the audit only; never decides Source eligibility or native role.
  const reason = valid ? cp.result.rationale.toLowerCase() : "";
  const tags = [];
  if (/syllabus|course outline/.test(reason)) tags.push("Course Outline");
  if (/assignment|assessment|rubric|marking|submission/.test(reason))
    tags.push("Assignment / Assessment");
  if (/exam/.test(reason)) tags.push("Exam");
  if (/integrity|plagiarism|cheating/.test(reason)) tags.push("Academic Integrity");
  if (/lecture|teaching|slide/.test(reason) && tags.length) tags.push("management-signal Lecture");
  return {
    sourceRef: row.ref,
    label: `${s.kind === "attachment" ? "Attachment" : "File Source"} ${String(n + 1).padStart(2, "0")}`,
    kind: s.kind,
    format:
      s.parsed?.canonicalization?.originalFormat ??
      /\.(pdf|pptx|docx|xlsx|ppt|doc|xls)(?:\b|$)/i.exec(s.title)?.[1]?.toLowerCase() ??
      "format metadata unavailable",
    formatBasis:
      "native canonicalization metadata or attachment filename extension; never used to infer Source role",
    nativeType: s.discovery?.nativeTypeHint ?? null,
    nativeRole: "Uncertain unless native type defines it",
    classification,
    nativeUnits: units.length,
    visualGaps: units.filter((u) => u.partial).length,
    classificationReason: valid
      ? classification === "TEACHING_MATERIAL_DEFERRED"
        ? "AI: ordinary teaching material deferred under DA-005"
        : classification === "UNCERTAIN"
          ? "AI: insufficient certainty; processing retained"
          : tags.length
            ? `AI rationale management signals: ${tags.join("; ")}`
            : "AI: preserve processing; role not deterministically specified"
      : "Pending",
    processedCategory: classification === "PROCESS" ? tags.join("; ") || "other / Uncertain" : null,
    categoryBasis: "AI rationale summary; not filename/native-role inference",
    entersTaskA: valid && classification !== "TEACHING_MATERIAL_DEFERRED",
    classificationWorkflowCurrent: valid
  };
});
const stats = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return {
    count: sorted.length,
    total: sorted.reduce((a, b) => a + b, 0),
    median: sorted.length ? sorted[Math.floor((sorted.length - 1) / 2)] : null,
    p95: sorted.length ? sorted[Math.ceil(sorted.length * 0.95) - 1] : null
  };
};
const calls = events.filter((e) => e.event === "qa.deepseek-physical-call");
const callSummary = (rows) => ({
  calls: rows.length,
  latencyMs: stats(rows.map((e) => e.fields.latencyMs)),
  inputTokens: rows.reduce((n, e) => n + (e.fields.inputTokens ?? 0), 0),
  outputTokens: rows.reduce((n, e) => n + (e.fields.outputTokens ?? 0), 0),
  reasoningTokensIncludedInOutput: rows.reduce((n, e) => n + (e.fields.reasoningTokens ?? 0), 0),
  cacheHitTokens: rows.reduce((n, e) => n + (e.fields.cacheHitTokens ?? 0), 0),
  cacheMissTokens: rows.reduce((n, e) => n + (e.fields.cacheMissTokens ?? 0), 0),
  failures: rows
    .filter((e) => e.fields.failureClass)
    .map((e) => ({
      task: e.fields.task,
      failure: e.fields.failureClass,
      attemptType: e.fields.attemptType
    })),
  repairs: rows.filter((e) => e.fields.attemptType !== "initial").length,
  currencyCost: null,
  costReason: "verified tariff unavailable; no guessed price"
});
const occupancy = (intervals) => {
  const points = intervals
    .flatMap(([a, b]) => [
      [a, 1],
      [b, -1]
    ])
    .sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let active = 0,
    peak = 0,
    area = 0,
    last = points[0]?.[0];
  for (const [t, change] of points) {
    area += active * (t - last);
    active += change;
    peak = Math.max(peak, active);
    last = t;
  }
  const wall = points.length ? points.at(-1)[0] - points[0][0] : 0;
  return { peak, averageOverOccupiedWindow: wall ? area / wall : null, occupiedWindowMs: wall };
};
const taskAPhysical = calls.filter((e) => String(e.fields.task).startsWith("task-a"));
const intervals = taskAPhysical.map((e) => [
  Date.parse(e.at) - e.fields.latencyMs,
  Date.parse(e.at)
]);
const runtime = events.filter(
  (e) => e.event === "qa.runtime" && e.fields.scopeId === stableDigest(wf.workflowId)
);
const spanSummary = (kind) => {
  const matching = runtime.filter((e) => e.fields.kind === kind),
    starts = new Map(),
    intervals = [];
  for (const e of matching) {
    if (e.fields.phase === "start") starts.set(e.fields.unitId, Date.parse(e.at));
    else if (starts.has(e.fields.unitId)) {
      intervals.push([starts.get(e.fields.unitId), Date.parse(e.at)]);
      starts.delete(e.fields.unitId);
    }
  }
  return {
    ...occupancy(intervals),
    recordedActivePeak: Math.max(0, ...matching.map((e) => e.fields.active ?? 0)),
    completed: intervals.length,
    outstanding: starts.size
  };
};
const observations = snapshot.tables.sourceObservations.filter(
  (o) => o.workflowId === wf.workflowId
);
const tally = (rows) =>
  rows.reduce((out, row) => {
    out[row.classification] = (out[row.classification] ?? 0) + 1;
    return out;
  }, {});
const group = (classification) => {
  const rows = manifest.filter((r) => r.classification === classification);
  return {
    targets: rows.length,
    attachments: rows.filter((r) => r.kind === "attachment").length,
    nativeUnits: rows.reduce((n, r) => n + r.nativeUnits, 0),
    visualGaps: rows.reduce((n, r) => n + r.visualGaps, 0)
  };
};
const comparable = (table, rows) =>
  table === "courses" ? rows?.map(({ updatedAt, ...row }) => row) : rows;
const hash = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const trusted = [
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
];
const staging = Object.entries(snapshot.staging).filter(([key]) => key.includes(wf.workflowId));
const report = {
  handoff: "P2E-v0.3.0-2026-10-06-015",
  at: snapshot.at,
  workflow: {
    workflowId: wf.workflowId,
    state: wf.state,
    phase: wf.phase,
    qaSemanticClean: wf.qaSemanticClean,
    errorCode: wf.errorCode ?? null,
    wallClockMs:
      Date.parse(wf.state === "working" ? snapshot.at : wf.updatedAt) - Date.parse(wf.createdAt)
  },
  coverage: {
    sources: sources.length,
    attachments: sources.filter((s) => s.kind === "attachment").length,
    nativeUnits: index.units.filter((u) => !u[2].startsWith("native-")).length,
    visualGaps: index.units.filter((u) => u[7].length).length,
    observations: observations.length,
    fetchFailures: observations.filter((o) => o.fetchStatus !== "ok").length,
    parseStatuses: observations.reduce((out, o) => {
      out[o.parseStatus] = (out[o.parseStatus] ?? 0) + 1;
      return out;
    }, {})
  },
  classification: {
    targets: manifest.length,
    counts: tally(manifest),
    PROCESS: group("PROCESS"),
    TEACHING_MATERIAL_DEFERRED: group("TEACHING_MATERIAL_DEFERRED"),
    UNCERTAIN: group("UNCERTAIN"),
    calls: callSummary(calls.filter((e) => e.fields.task === "teaching-classification")),
    actualEligibleSources:
      sources.length -
      manifest.filter((r) => r.classification === "TEACHING_MATERIAL_DEFERRED").length
  },
  sourceManifest: manifest,
  taskA: {
    ...callSummary(taskAPhysical),
    primaryPackages: spanSummary("package"),
    render: spanSummary("render"),
    physicalAiConcurrency: occupancy(intervals),
    admissionWaitMs: stats(
      events
        .filter(
          (e) =>
            e.event === "qa.runtime-wait" &&
            e.fields.scopeId === stableDigest(wf.workflowId) &&
            e.fields.kind === "package"
        )
        .map((e) => e.fields.waitMs)
    ),
    consolidation: spanSummary("consolidation"),
    visualEvidenceEvents: events
      .filter((e) => e.event === "qa.task-a-visual-evidence")
      .map((e) => e.fields),
    logicalRuns: snapshot.tables.aiRuns.filter(
      (r) => r.workflowId === wf.workflowId && r.task.startsWith("task-a")
    ).length
  },
  taskB: callSummary(calls.filter((e) => e.fields.task === "task-b")),
  ledger: callSummary(calls),
  lifecycle: {
    parserWorkers: events.filter((e) => e.event === "qa.parser-worker").map((e) => e.fields),
    workerEvents: events.filter((e) => e.event === "qa.worker-lifecycle").map((e) => e.fields)
  },
  isolation: {
    trustedUnchanged: trusted.every(
      (t) => hash(comparable(t, before.tables[t])) === hash(comparable(t, snapshot.tables[t]))
    ),
    historicalWorkflowsUnchanged: before.tables.workflows.every(
      (w) => hash(w) === hash(snapshot.tables.workflows.find((x) => x.workflowId === w.workflowId))
    ),
    historicalAiRunsUnchanged: before.tables.aiRuns.every(
      (r) => hash(r) === hash(snapshot.tables.aiRuns.find((x) => x.aiRunId === r.aiRunId))
    ),
    taskC: snapshot.tables.aiRuns.filter(
      (r) => r.workflowId === wf.workflowId && r.task === "task-c"
    ).length
  },
  preview: { stagingRecords: staging.length },
  remainingData: [
    "currency tariff unverified",
    "Source native role Uncertain where API does not define it",
    "final Preview accounting pending until terminal workflow"
  ]
};
const sourceReads = events.filter((e) => e.event === "qa.source-read");
const discovered = events.find((e) => e.event === "qa.discovery-sources");
report.stageTimingMs = {
  discovery: discovered ? Date.parse(discovered.at) - Date.parse(wf.createdAt) : null,
  fetchAndParse:
    discovered && sourceReads.length
      ? Date.parse(sourceReads.at(-1).at) - Date.parse(discovered.at)
      : null,
  classification: report.classification.calls.latencyMs.total,
  taskA: {
    completedObservationWindow: report.taskA.physicalAiConcurrency.occupiedWindowMs,
    finalWallClock: null
  },
  taskB: null,
  review: null
};
const priorById = new Map(before.tables.sources.map((s) => [s.sourceId, s]));
report.coverage.conservation = {
  sourceCount: sources.length === before.tables.sources.filter((s) => !s.removedFromNative).length,
  attachmentsContentHash: sources
    .filter((s) => s.kind === "attachment")
    .every((s) => s.parsed?.contentHash === priorById.get(s.sourceId)?.parsed?.contentHash),
  attachmentsNativeTextAndLocators: sources
    .filter((s) => s.kind === "attachment")
    .every(
      (s) =>
        hash(s.parsed?.units?.map((u) => [u.locator, u.text])) ===
        hash(priorById.get(s.sourceId)?.parsed?.units?.map((u) => [u.locator, u.text]))
    ),
  manifestAttachmentCount: manifest.filter((r) => r.kind === "attachment").length,
  manifestUnits: manifest.reduce((n, r) => n + r.nativeUnits, 0),
  manifestGaps: manifest.reduce((n, r) => n + r.visualGaps, 0)
};
try {
  const stopped = JSON.parse(await readFile(`${directory}/STOP-DISPATCH.json`, "utf8"));
  if (stopped.result?.result?.value?.dispatchStopped) {
    const details = JSON.parse(await readFile(`${directory}/DEBUG-STATE.json`, "utf8")).result
      .result.value;
    report.validationOutcome = "STOP_RUNTIME_OBSERVATION_BLOCKED_NOT_PASS";
    report.stop = {
      dispatchStopped: true,
      stopAt: (await stat(`${directory}/STOP-DISPATCH.json`)).mtime.toISOString(),
      phase: details.claimed?.phase ?? "task-a",
      providerInFlightAtDiagnostic: details.provider?.length ?? null,
      aborted: details.phaseControllers?.every((p) => p.aborted),
      rawContextPreserved: true,
      secondRun: false,
      terminalDatabaseStateVerified: false,
      cause:
        "Root cause unverified: CDP attachment and asynchronous IndexedDB reads stalled; synchronous debugger inspection succeeds",
      observerClosed: true
    };
    report.ledger.complete = false;
    report.ledger.scope =
      "Lower bound at last complete snapshot; final requests/tokens cannot be reconstructed yet";
    report.taskA.concurrencyScope =
      "Completed spans only; live recorded active peak is a lower bound, not final-run peak";
    report.remainingData = [
      "terminal durable workflow state",
      "final physical request / token / cost ledger",
      "full Task A wall-clock and concurrency",
      "schema failure disposition / explicit Retry state",
      "runtime stall root cause",
      "Task B / Preview not reached",
      "verified currency tariff"
    ];
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
await mkdir("artifacts/v0.3.0/clean-rebuild-015", { recursive: true });
await writeFile("artifacts/v0.3.0/clean-rebuild-015/REPORT.json", JSON.stringify(report, null, 2));
console.log(
  JSON.stringify({
    workflow: report.workflow,
    coverage: report.coverage,
    classification: report.classification.counts,
    taskA: {
      calls: report.taskA.calls,
      packages: report.taskA.primaryPackages,
      physicalAiConcurrency: report.taskA.physicalAiConcurrency
    },
    isolation: report.isolation
  })
);
