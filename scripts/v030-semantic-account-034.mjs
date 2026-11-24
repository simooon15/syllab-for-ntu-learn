/** Offline metadata accounting only. Never exports prompts, course text, reasoning or credentials. */
import { readFile, writeFile } from "node:fs/promises";
import { account } from "./v030-gate-b-usage.mjs";
const root = "artifacts/v0.3.0/semantic-034";
const pricing = JSON.parse(await readFile(`${root}/PRICING.json`, "utf8"));
const paths = [`${root}/LEDGER.json`, `${root}/r1/LEDGER.json`, `${root}/r2/LEDGER.json`];
const physical = (
  await Promise.all(paths.map(async (path) => JSON.parse(await readFile(path, "utf8"))))
).flat();
const rows = physical.map((row) => ({
  ...account(
    {
      streamId: `${row.case}:${row.startedAt}`,
      model: "deepseek-flash",
      stage: row.case,
      logicalUnitId: row.physicalId,
      attemptType: row.attemptType,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      providerUsage: row.usage,
      finishReason: row.finishReason,
      httpStatus: row.httpStatus,
      user: row.requestSha256
    },
    pricing
  ),
  requestContentHash: row.requestSha256,
  validationAttempt: row.attemptType
}));
const total = (field) =>
  rows.every((r) => typeof r[field] === "number") ? rows.reduce((n, r) => n + r[field], 0) : null;
const summary = {
  targetedPhysicalCalls: rows.length,
  technicalRetries: 0,
  engineeringSemanticReruns: 3,
  capturedReplayNewCalls: 0,
  inputTokens: physical.reduce((n, r) => n + (r.usage?.prompt_tokens ?? 0), 0),
  outputTokens: total("providerOutputTokens"),
  reasoningTokens: total("reasoningTokens"),
  cacheHitTokens: total("cacheHitInputTokens"),
  cacheMissTokens: total("cacheMissInputTokens"),
  estimatedCostUSD: total("estimatedCostUSD"),
  summedProviderLatencyMs: total("latencyMs"),
  requestStartToFinishSpanMs:
    Math.max(...physical.map((r) => Date.parse(r.finishedAt))) -
    Math.min(...physical.map((r) => Date.parse(r.startedAt))),
  model: "deepseek-flash",
  reasoningIncludedInOutput: true,
  pricingSource: pricing.source,
  actualInvoice: "not available",
  rows
};
if (!physical.every((r) => typeof r.usage?.prompt_tokens === "number")) summary.inputTokens = null;
await writeFile(`${root}/ACCOUNTING.json`, JSON.stringify(summary, null, 2) + "\n");
console.log(JSON.stringify({ ...summary, rows: undefined }));
