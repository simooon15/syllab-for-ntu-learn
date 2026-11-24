/** P2E-045 validation only: durable 10-dispatch / USD1 guards, no live workflow writes. */
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
const dir = "evidence/private/v030-semantic-045",
  shared = "artifacts/v0.3.0/semantic-045";
await mkdir(dir, { recursive: true });
await mkdir(shared, { recursive: true });
const jobName = process.argv[2];
assert(jobName && /^[a-z0-9-]+$/.test(jobName));
assert(
  (await readFile("docs/collaboration/CHATGPT_TO_CODEX_HANDOFF.md", "utf8")).includes(
    "P2E-v0.3.0-2026-10-09-045"
  )
);
await build({
  stdin: {
    contents: `export {DEEPSEEK_FLASH_CAPABILITIES} from './extension/src/v2/invocation-policy';export {runSession} from './extension/src/v2/architecture-runner';export {sourceUnits,sourceIndex,resolveReads} from './extension/src/v2/course-read';export {validateTaskA,validateTaskB,validateTaskC} from './extension/src/v2/ai-contracts';export {validateOutputA,validateOutputB2,validateGroupStructure} from './extension/src/v2/assessment-output';export {validateSourceCoverage,sourceInventory,registryInventory,validateInventoryRouting,validateCoverageDecisions} from './extension/src/v2/assessment-coverage';export {validateAssessmentRelevance,validateExcludedAssessment} from './extension/src/v2/assessment-semantics';export {validateProvenance,scopeEvidenceIds} from './extension/src/v2/architecture-provenance';export {emptyRegistry,applyOperations,validateRegistry} from './extension/src/v2/progressive-registry';export {materializeTaskB} from './extension/src/v2/materialize';export {DeepSeekTransport} from './extension/src/v2/deepseek';export {readProviderCompletion} from './extension/src/v2/deepseek-complete';`,
    resolveDir: process.cwd(),
    loader: "ts"
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".tmp/semantic-045-runtime.mjs",
  plugins: [
    {
      name: "disable-qa-archive",
      setup(b) {
        b.onResolve({ filter: /qa-telemetry$/ }, () => ({
          path: resolve("extension/src/v2/qa-telemetry.disabled.ts")
        }));
      }
    }
  ]
});
const R = await import(pathToFileURL(resolve(".tmp/semantic-045-runtime.mjs")));
const job = JSON.parse(await readFile(`${dir}/${jobName}-job.json`, "utf8"));
let key = process.env.DEEPSEEK_API_KEY;
delete process.env.DEEPSEEK_API_KEY;
assert(key?.length, "MEMORY_ONLY_BYOK_REQUIRED");
const sha = (b) => createHash("sha256").update(b).digest("hex");
let ledger;
try {
  ledger = JSON.parse(await readFile(`${shared}/LEDGER.json`, "utf8"));
} catch {
  ledger = {
    authority: "P2E-045 plus direct Human supplemental 2026-10-09",
    maxDispatches: 10,
    maxEstimatedUSD: 1,
    requests: []
  };
}
assert(!ledger.requests.some((r) => r.state === "dispatched"), "ACTIVE_UNVERIFIED_REQUEST_STOP");
await writeFile(
  `${dir}/${jobName}-claim.json`,
  JSON.stringify({
    jobName,
    inputSHA256: sha(JSON.stringify(job.input)),
    at: new Date().toISOString()
  }),
  { flag: "wx" }
);
const persist = () => writeFile(`${shared}/LEDGER.json`, JSON.stringify(ledger, null, 2) + "\n");
const scope = {
  sources: job.sources,
  evidence: [],
  objects: {
    ...(job.input.group ? { [job.input.group.id]: job.input.group } : {}),
    ...Object.fromEntries((job.input.members ?? []).map((d) => [d.id, d.payload]))
  }
};
let session;
const transport = new R.DeepSeekTransport(async (url, init) => {
  assert(url === "https://api.deepseek.com/chat/completions");
  assert(ledger.requests.length < 10, "DISPATCH_BUDGET_EXHAUSTED");
  const body = JSON.parse(init.body);
  assert(!String(init.body).includes(key), "SECRET_BODY_FORBIDDEN");
  // UTF8 byte count is a conservative text-token upper bound. Reserve max advertised output at frozen peak rates.
  const reserve =
    (Buffer.byteLength(init.body) * 0.3) / 1e6 +
    ((body.max_tokens ?? R.DEEPSEEK_FLASH_CAPABILITIES.providerMaxOutput) * 1.2) / 1e6;
  const spent = ledger.requests.reduce((sum, r) => sum + (r.estimatedUSD ?? r.reservedUSD), 0);
  assert(Number.isFinite(reserve) && spent + reserve <= 1, "USD1_CONSERVATIVE_RESERVE_STOP");
  const n = ledger.requests.length + 1;
  const row = {
    dispatch: n,
    job: jobName,
    stage: job.stage,
    state: "dispatched",
    startedAt: new Date().toISOString(),
    reservedUSD: reserve,
    requestBytes: Buffer.byteLength(init.body),
    requestSHA256: sha(init.body),
    model: body.model
  };
  await writeFile(`${dir}/dispatch-${n}.json`, JSON.stringify(row), { flag: "wx" });
  ledger.requests.push(row);
  await persist();
  await writeFile(`${dir}/request-${n}.json`, init.body, { flag: "wx" });
  try {
    const response = await fetch(url, init);
    row.httpStatus = response.status;
    const raw = await response.clone().text();
    await writeFile(`${dir}/response-${n}.sse`, raw, { flag: "wx" });
    for (const line of raw.split("\n"))
      if (line.startsWith("data: ") && line !== "data: [DONE]") {
        try {
          const e = JSON.parse(line.slice(6));
          if (e.usage) row.usage = e.usage;
          if (e.choices?.[0]?.finish_reason) row.finishReason = e.choices[0].finish_reason;
        } catch {
          /* SSE separators */
        }
      }
    row.finishedAt = new Date().toISOString();
    if (row.usage) {
      const u = row.usage;
      const at = new Date(row.startedAt);
      const minute = at.getUTCHours() * 60 + at.getUTCMinutes();
      const peak =
        at.getUTCDay() > 0 &&
        at.getUTCDay() < 6 &&
        ((minute >= 60 && minute < 240) || (minute >= 360 && minute < 600));
      const hit = u.prompt_cache_hit_tokens ?? u.prompt_tokens_details?.cached_tokens ?? 0;
      const miss = u.prompt_cache_miss_tokens ?? u.prompt_tokens - hit;
      row.estimatedUSD =
        (hit * (peak ? 0.006 : 0.003) +
          miss * (peak ? 0.3 : 0.15) +
          u.completion_tokens * (peak ? 1.2 : 0.6)) /
        1e6;
      row.pricingBasis =
        "Frozen semantic-034 verified rates, outside national-day snapshot; estimate not invoice; reasoning included in completion";
    }
    row.state = "captured";
    await persist();
    return response;
  } catch (e) {
    row.state = "paid-unverified";
    row.errorName = e.name;
    await persist();
    throw e;
  }
});
const validate = (value) => {
  const ids = new Set(scope.sources.map((s) => s.sourceId));
  if (job.stage === "A") {
    const a = R.validateTaskA(value, ids);
    R.validateOutputA(a);
    R.validateSourceCoverage(a, scope);
  }
  if (job.stage === "B1") {
    assert(Array.isArray(value.operations));
    const registry = R.applyOperations(R.emptyRegistry(), value.operations);
    R.validateRegistry(
      registry,
      job.input.drafts.map((d) => d.id),
      job.input.rules.map((r) => r.id)
    );
    R.validateGroupStructure(registry.records.filter((r) => r.kind === "group"));
    for (const r of registry.records) {
      if (r.kind === "group") R.validateAssessmentRelevance(r, scope);
      R.validateExcludedAssessment(r, scope);
    }
    const units = R.registryInventory(job.input.semanticInventory, registry.records, scope);
    R.validateInventoryRouting(units, registry.records, scope);
  }
  if (job.stage === "B2") {
    const b = R.validateTaskB(value, ids);
    R.validateOutputB2(value, b, job.input.group);
    R.validateCoverageDecisions(b, job.input.semanticInventory, scope);
  }
  if (job.stage === "C") R.validateTaskC(value, ids, job.coverageSufficient === true);
  R.validateProvenance(value, scope);
};
try {
  const result = await R.runSession(`validation-045:${jobName}`, job.stage, job.input, {
    semanticPolicy: "assessment-relevance/3",
    load: async () => undefined,
    save: async (s) => {
      session = s;
      await writeFile(`${dir}/${jobName}-session.json`, JSON.stringify(s));
    },
    execute: async (call) => {
      assert(call.promptVersion.endsWith("/7"));
      const completion = R.readProviderCompletion(await transport.complete(key, call));
      await writeFile(
        `${dir}/${jobName}-completion-${ledger.requests.length}.json`,
        JSON.stringify(completion)
      );
      assert(completion.ok && !completion.truncated, "INVALID_OR_TRUNCATED_NO_AUTO_RETRY");
      return { call, value: completion.value, consumesApi: true };
    },
    resolve: (reads) => Promise.resolve(R.resolveReads(reads, scope)),
    resolveTransport: (reads) =>
      Promise.resolve(R.resolveReads(reads, { sources: [], evidence: [], objects: scope.objects })),
    validateFinal: validate
  });
  await writeFile(`${dir}/${jobName}-result.json`, JSON.stringify(result), { flag: "wx" });
  if (job.stage === "B2") {
    const qualified = R.scopeEvidenceIds(result, job.course.courseId, scope);
    const refs = R.validateProvenance(qualified, scope);
    const m = R.materializeTaskB(
      R.validateTaskB(qualified, new Set(scope.sources.map((s) => s.sourceId))),
      {
        strictOutput: true,
        course: job.course,
        workflowId: `validation-045:${jobName}`,
        sourceRecords: scope.sources,
        evidence: refs,
        sources: new Map(
          scope.sources.map((s) => [s.sourceId, { sourceId: s.sourceId, title: s.title }])
        ),
        exclusionKeys: new Set(),
        now: new Date().toISOString()
      },
      new Map(),
      new Set()
    );
    await writeFile(`${dir}/${jobName}-projection.json`, JSON.stringify(m));
  }
  const summary = {
    job: jobName,
    stage: job.stage,
    contract: "PASS",
    semantic: "PENDING_ACTUAL_EVIDENCE_REVIEW",
    rounds: session.effectiveRounds,
    resultSHA256: sha(JSON.stringify(result)),
    dispatches: ledger.requests.filter((r) => r.job === jobName).length
  };
  await writeFile(`${shared}/${jobName}.json`, JSON.stringify(summary, null, 2) + "\n");
  console.log(JSON.stringify(summary));
} catch (e) {
  await writeFile(
    `${dir}/${jobName}-failure.json`,
    JSON.stringify({ name: e.name, message: e.message, stack: e.stack })
  );
  const summary = {
    job: jobName,
    stage: job.stage,
    contract: "FAIL",
    semantic: "NOT_VERIFIED",
    errorCode:
      /^(SEMANTIC_COVERAGE:[A-Z_]+|ASSESSMENT_OUTPUT:[A-Z_]+|PROVENANCE_[A-Z_]+)/.exec(
        e.message
      )?.[0] ?? e.name,
    dispatches: ledger.requests.filter((r) => r.job === jobName).length
  };
  await writeFile(`${shared}/${jobName}.json`, JSON.stringify(summary, null, 2) + "\n");
  console.log(JSON.stringify(summary));
  process.exitCode = 1;
} finally {
  key = undefined;
}
