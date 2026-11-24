// Read-only accounting. Never imports a provider or writes workflow semantic state.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { build } from "esbuild";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
await mkdir(".tmp", { recursive: true });
await build({
  stdin: {
    contents: `export {stableDigest} from './extension/src/v2/chunking';
export {stableStringify} from './extension/src/v2/crypto';
export {semanticallyProcess,teachingSourceView,reusableTeaching,DEFERRAL_POLICY} from './extension/src/v2/teaching-deferral';
export {contentIndex} from './extension/src/v2/content-index';
export {validateTaskA} from './extension/src/v2/ai-contracts';
export {PROMPT_VERSIONS} from './extension/src/v2/prompts';`,
    resolveDir: process.cwd(),
    loader: "ts"
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".tmp/v030-postprocessing-accounting.mjs",
  plugins: [
    {
      name: "disable-private-telemetry",
      setup(b) {
        b.onResolve({ filter: /qa-telemetry$/ }, () => ({
          path: resolve("extension/src/v2/qa-telemetry.disabled.ts")
        }));
      }
    }
  ]
});
const {
  stableDigest,
  semanticallyProcess,
  teachingSourceView,
  reusableTeaching,
  contentIndex,
  validateTaskA,
  stableStringify,
  PROMPT_VERSIONS,
  DEFERRAL_POLICY
} = await import(pathToFileURL(resolve(".tmp/v030-postprocessing-accounting.mjs")));
if (process.argv[2] && !process.argv[2].startsWith("evidence/private/"))
  throw Error("PRIVATE_SNAPSHOT_REQUIRED");
const dir = process.argv[2] ?? "evidence/private/v030-recovery-017",
  w = "wf_3ee80256bee2d6d2fb0e805c";
const outputDir = process.argv[3] ?? "artifacts/v0.3.0/recovery-017";
if (!outputDir.startsWith("artifacts/v0.3.0/recovery-"))
  throw Error("FORMAL_RECOVERY_OUTPUT_REQUIRED");
const d = JSON.parse(await readFile(dir + "/BEFORE.json", "utf8"));
const o = JSON.parse(
  await readFile("evidence/private/v030-recovery-016/OBSERVATION-STORAGE.json", "utf8")
);
const t = o.trace.filter(
  (e) => e.at >= "2026-10-05T18:03:04.291Z" && e.at <= "2026-10-05T18:20:47.766Z"
);
const runs = d.tables.aiRuns.filter((a) => a.workflowId === w && a.task === "task-a");
const st = Object.values(o.staging).find((s) => s.workflowId === w);
const sources = d.tables.sources;
const obs = d.tables.sourceObservations.filter((a) => a.workflowId === w);
const eligible = sources.filter((s) => {
  const o = obs.find((a) => a.sourceId === s.sourceId);
  return (
    s.parsed &&
    !s.removedFromNative &&
    o?.fetchStatus === "ok" &&
    ["ok", "partial"].includes(o.parseStatus) &&
    semanticallyProcess(s)
  );
});
const index = contentIndex(sources);
const rows = eligible.map((s, i) => {
  const id = stableDigest(s.sourceId),
    r = runs.find((r) => r.sourceId === s.sourceId);
  const ev = t.filter((e) => e.fields.unitId === id || e.fields.packageUnitId === id);
  const phys = t.find(
    (e) =>
      e.event === "qa.deepseek-physical-call" &&
      (e.fields.packageUnitId === id ||
        (r?.invocationFingerprint && e.fields.invocationFingerprint === r.invocationFingerprint))
  );
  const start = t.find(
    (e) =>
      e.event === "qa.deepseek-call-started" &&
      phys &&
      e.fields.invocationFingerprint === phys.fields.invocationFingerprint
  );
  let valid = false,
    fp = false;
  if (r?.taskAPackage) {
    try {
      validateTaskA(r.taskAPackage.result, new Set([s.sourceId]));
      valid = true;
    } catch {
      // Invalid cached contract stays false; accounting must never repair a payload.
    }
    const sel = teachingSourceView(s, sources, index);
    const p = s.parsed;
    fp =
      r.taskAPackage.fingerprint ===
      stableDigest(
        stableStringify({
          policy: DEFERRAL_POLICY,
          selection: sel.selectionFingerprint,
          native: {
            text: p.text,
            structure: p.structure,
            units: p.units,
            contentHash: p.contentHash,
            canonicalization: p.canonicalization
          },
          prompt: PROMPT_VERSIONS.a
        })
      );
  }
  return {
    sourceRef: "s:" + id,
    order: i,
    admission:
      ev.find(
        (e) => e.event === "qa.runtime" && e.fields.kind === "package" && e.fields.phase === "start"
      )?.at ?? null,
    physicalStart: start?.at ?? null,
    physicalEnd: phys?.at ?? null,
    providerFinish: phys?.fields.finishReason ?? null,
    failureClass: phys?.fields.failureClass ?? null,
    usage: phys
      ? Object.fromEntries(
          ["inputTokens", "outputTokens", "reasoningTokens", "latencyMs"].map((k) => [
            k,
            phys.fields[k] ?? null
          ])
        )
      : null,
    aiRunId: r?.aiRunId ?? null,
    durableStatus: r?.status ?? "unverified",
    durableRecordedAt: r?.recordedAt ?? null,
    checkpoint: !!r?.taskAPackage,
    contractValid: valid,
    fingerprintMatches: fp,
    packageEnd:
      ev.find(
        (e) => e.event === "qa.runtime" && e.fields.kind === "package" && e.fields.phase === "end"
      )?.at ?? null,
    stagingSuccess: st.taskACoverage.succeededSourceIds.includes(s.sourceId),
    stagingFailure: st.taskACoverage.failedSources.some((a) => a.sourceId === s.sourceId),
    stagingWriteStart: null,
    stagingWriteEnd: null,
    stagingTimingEvidence: "Not instrumented in original build",
    retrySet: r?.status !== "succeeded",
    understandingUpdated: obs.find((a) => a.sourceId === s.sourceId)?.recordedAt ?? null
  };
});
await mkdir(outputDir, { recursive: true });
await writeFile(
  outputDir + "/RECONCILIATION.json",
  JSON.stringify({ workflowId: w, rows }, null, 2) + "\n"
);
const time = (at) => at?.slice(11, 23) ?? "Unknown";
await writeFile(
  outputDir + "/RECONCILIATION.md",
  "# P2E-017 Task A outcome reconciliation\n\n" +
    "109 eligible = 99 checkpoint successes + 9 contract failures + 1 paid-unverified item. " +
    "Times are UTC. Original staging write start/end were not instrumented; observation timestamps " +
    "are creation times, not transaction completion times. Raw payloads and Source titles stay private.\n\n" +
    "| Order (0-based) | Source/package ref | Admission | Physical start | Physical end | Package end | AiRun / checkpoint | Staging | Retry set | Observation created |\n" +
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |\n" +
    rows
      .map(
        (row) =>
          `| ${row.order} | ${row.sourceRef} | ${time(row.admission)} | ${time(row.physicalStart)} | ${time(row.physicalEnd)} | ${time(row.packageEnd)} | ${row.durableStatus} / ${row.checkpoint ? "Yes" : "No"} | ${row.stagingSuccess ? "Success" : row.stagingFailure ? "Failed" : "Not recorded"} | ${row.retrySet ? "Yes" : "No"} | ${time(row.understandingUpdated)} |`
      )
      .join("\n") +
    "\n\nAiRun IDs, provider finish, usage, schema/invalid-json disposition and contract/fingerprint checks are in RECONCILIATION.json. " +
    "Unknown original transaction timing/error is explicitly missing evidence, never reconstructed from replay timings.\n"
);
console.log({
  eligible: rows.length,
  success: rows.filter((r) => r.durableStatus === "succeeded").length,
  failed: rows.filter((r) => r.durableStatus === "failed").length,
  unverified: rows.filter((r) => r.durableStatus === "unverified"),
  gap: rows.filter((r) => r.checkpoint && !r.stagingSuccess),
  allReusable: rows
    .filter((r) => r.checkpoint)
    .every((r) => r.contractValid && r.fingerprintMatches),
  classificationReusable: sources.every((s) => reusableTeaching(s, sources, w, index))
});
