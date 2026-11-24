/** Metadata-only physical-call accounting; missing usage/pricing never becomes zero cost. */
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export function summarize(trace, pricing) {
  const calls = trace.filter((entry) => entry.event === "qa.deepseek-physical-call");
  const finite = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
  const known = calls.filter(
    (entry) => finite(entry.fields.inputTokens) && finite(entry.fields.outputTokens)
  );
  const total = (field) =>
    calls.every((entry) => finite(entry.fields[field]))
      ? calls.reduce((sum, entry) => sum + entry.fields[field], 0)
      : null;
  const costKnown =
    pricing &&
    ["inputCacheHitPerMillion", "inputCacheMissPerMillion", "outputPerMillion"].every((key) =>
      finite(pricing[key])
    ) &&
    calls.every(
      (entry) =>
        ["inputTokens", "outputTokens", "cacheHitTokens", "cacheMissTokens"].every((key) =>
          finite(entry.fields[key])
        ) && entry.fields.cacheHitTokens + entry.fields.cacheMissTokens === entry.fields.inputTokens
    );
  const tasks = {};
  for (const entry of calls) {
    const task = typeof entry.fields.task === "string" ? entry.fields.task : "unknown";
    tasks[task] = (tasks[task] ?? 0) + 1;
  }
  const times = trace.map((entry) => Date.parse(entry.at)).filter(Number.isFinite);
  return {
    physicalCalls: calls.length,
    tasks,
    retries: calls.filter((entry) => entry.fields.retryType && entry.fields.retryType !== "none")
      .length,
    failures: calls.filter((entry) => entry.fields.failureClass).length,
    usageKnownCalls: known.length,
    inputTokens: total("inputTokens"),
    outputTokens: total("outputTokens"),
    cacheHitTokens: total("cacheHitTokens"),
    cacheMissTokens: total("cacheMissTokens"),
    summedCallLatencyMs: total("latencyMs"),
    // Observation span includes user Review and waiting; it is explicitly not model runtime.
    observationSpanMs: times.length ? Math.max(...times) - Math.min(...times) : null,
    cost: costKnown
      ? calls.reduce(
          (sum, entry) =>
            sum +
            (entry.fields.cacheHitTokens * pricing.inputCacheHitPerMillion +
              entry.fields.cacheMissTokens * pricing.inputCacheMissPerMillion +
              entry.fields.outputTokens * pricing.outputPerMillion) /
              1_000_000,
          0
        )
      : null,
    currency: costKnown ? pricing.currency : null,
    pricingDate: costKnown ? pricing.date : null,
    limitations: [
      "No semantic or coverage verdict is inferred from invocation counts.",
      "Unavailable usage, failed-call billing or missing cache split makes total tokens/cost unavailable.",
      "Compare the same course, content, model and coverage before attributing differences to the version."
    ]
  };
}

const args = process.argv.slice(2);
if (args[0] === "--self-test") {
  const event = (fields) => ({
    at: "2026-10-04T00:00:00Z",
    event: "qa.deepseek-physical-call",
    fields
  });
  const pricing = {
    inputCacheHitPerMillion: 1,
    inputCacheMissPerMillion: 2,
    outputPerMillion: 3,
    currency: "TEST",
    date: "synthetic"
  };
  const full = event({
    task: "task-a",
    inputTokens: 100,
    outputTokens: 20,
    cacheHitTokens: 10,
    cacheMissTokens: 90,
    latencyMs: 5
  });
  assert.equal(summarize([full], pricing).cost, 0.00025);
  const failed = event({
    task: "task-a",
    failureClass: "network",
    retryType: "fresh-retry",
    latencyMs: 9
  });
  const partial = summarize([full, failed], pricing);
  assert.equal(partial.cost, null);
  assert.equal(partial.inputTokens, null);
  assert.equal(partial.physicalCalls, 2);
  assert.equal(partial.retries, 1);
  assert.equal(partial.summedCallLatencyMs, 14);
  assert.equal(summarize([full]).cost, null);
  console.log("Ledger accounting checks passed (unknown usage and failed attempts retained).");
} else if (args.length) {
  const [tracePath, outputPath, pricingPath, baselinePath] = args;
  if (!outputPath)
    throw Error(
      "Usage: node scripts/v030-ledger.mjs <qa-events.json> <output.json> [pricing.json] [baseline-qa-events.json]"
    );
  const trace = JSON.parse(await readFile(tracePath, "utf8"));
  if (!Array.isArray(trace)) throw Error("TRACE_MUST_BE_EVENT_ARRAY");
  const pricing = pricingPath ? JSON.parse(await readFile(pricingPath, "utf8")) : undefined;
  const result = { version: "0.3.0", current: summarize(trace, pricing) };
  if (baselinePath)
    result.baseline = summarize(JSON.parse(await readFile(baselinePath, "utf8")), pricing);
  await mkdir(dirname(resolve(outputPath)), { recursive: true });
  await writeFile(outputPath, JSON.stringify(result, null, 2) + "\n");
  console.log(`Metadata ledger written: ${outputPath}`);
}
