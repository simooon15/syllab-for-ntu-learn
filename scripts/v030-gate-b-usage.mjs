/** Offline accounting only. Input snapshots remain private; output contains numeric usage/identities. */
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
export function priceBand(at, snapshot) {
  const date = new Date(at);
  if (!Number.isFinite(date.valueOf())) throw Error("REQUEST_START_TIMESTAMP_REQUIRED");
  const day = date.toISOString().slice(0, 10);
  const holiday = snapshot.holidaySnapshot.nationalDay2026;
  if (day >= holiday[0] && day <= holiday[1]) return "OFF_PEAK";
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  return date.getUTCDay() >= 1 &&
    date.getUTCDay() <= 5 &&
    snapshot.peakUTC.windows.some(([a, b]) => {
      const m = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
      return minutes >= m(a) && minutes < m(b);
    })
    ? "PEAK"
    : "OFF_PEAK";
}
const workflowOf = (stream) =>
  stream.workflowId ?? /^physical-work:(wf_[a-f0-9]+):/.exec(stream.logicalUnitId ?? "")?.[1];
const singapore = (at) =>
  at ? new Date(Date.parse(at) + 8 * 3600000).toISOString().replace("Z", "+08:00") : null;
export function account(stream, pricing) {
  const band = priceBand(stream.startedAt, pricing),
    usage = stream.providerUsage ?? {};
  const hit = usage.prompt_cache_hit_tokens ?? null,
    miss = usage.prompt_cache_miss_tokens ?? null,
    output = usage.completion_tokens ?? null;
  const reasoning =
    usage.completion_tokens_details?.reasoning_tokens ?? usage.reasoning_tokens ?? null;
  const known = [hit, miss, output].every(
    (n) => typeof n === "number" && Number.isFinite(n) && n >= 0
  );
  const rates = pricing.rates[band];
  const cost =
    known && stream.model === pricing.model
      ? (hit * rates.cacheHit + miss * rates.cacheMiss + output * rates.output) / 1e6
      : null;
  return {
    workflowId: workflowOf(stream),
    stage: stream.visualParts > 0 ? "Vision" : stream.stage,
    logicalAttempt: stream.attemptType ?? "Unavailable",
    logicalUnitId: stream.logicalUnitId ?? "Unavailable",
    physicalInvocationId: stream.streamId,
    model: stream.model,
    startUTC: stream.startedAt,
    finishUTC: stream.finishedAt ?? null,
    startSingapore: singapore(stream.startedAt),
    finishSingapore: singapore(stream.finishedAt),
    priceBand: band,
    finishBand: stream.finishedAt ? priceBand(stream.finishedAt, pricing) : null,
    cacheHitInputTokens: hit,
    cacheMissInputTokens: miss,
    providerOutputTokens: output,
    reasoningTokens: reasoning,
    latencyMs: stream.finishedAt
      ? Date.parse(stream.finishedAt) - Date.parse(stream.startedAt)
      : null,
    finishReason: stream.finishReason ?? null,
    httpStatus: stream.httpStatus ?? null,
    paidDisposition: stream.finishReason
      ? "generation-observed"
      : stream.httpStatus && stream.httpStatus !== 200
        ? "provider-rejected"
        : "paid-unverified",
    estimatedCostUSD: cost ?? "Unavailable",
    usageKnown: known,
    reasoningIncludedInOutput: true,
    crossesPriceBand: !!stream.finishedAt && priceBand(stream.finishedAt, pricing) !== band,
    requestContentHash: createHash("sha256").update(stream.user).digest("hex")
  };
}
function aggregate(rows) {
  const total = (field) =>
    rows.every((r) => typeof r[field] === "number")
      ? rows.reduce((n, r) => n + r[field], 0)
      : "Unavailable";
  return {
    physicalCalls: rows.length,
    cacheHitInputTokens: total("cacheHitInputTokens"),
    cacheMissInputTokens: total("cacheMissInputTokens"),
    providerOutputTokens: total("providerOutputTokens"),
    reasoningTokens: total("reasoningTokens"),
    estimatedCostUSD: total("estimatedCostUSD")
  };
}
export function summary(streams, workflowId, pricing, label, metadata = []) {
  const ledgerRequests = new Map();
  for (const entry of metadata) {
    const ledger = entry.value?.ledger ?? entry.value;
    for (const request of ledger?.requests ?? ledger?.physical ?? [])
      ledgerRequests.set(request.id, {
        ledgerIdentity: ledger.identity ?? ledger.attemptId,
        wave: request.wave ?? null,
        logicalUnitCount: request.unitIds?.length ?? null,
        state: request.state,
        paidDisposition: request.paidDisposition ?? null
      });
  }
  const rows = streams
    .filter((s) => workflowOf(s) === workflowId)
    .map((s) => ({
      ...account(s, pricing),
      logicalAttemptIdentity:
        ledgerRequests.get(s.logicalUnitId)?.ledgerIdentity ?? s.logicalUnitId,
      ledger: ledgerRequests.get(s.logicalUnitId) ?? null
    }));
  return {
    label,
    workflowId,
    frozenAtUTC: new Date().toISOString(),
    pricingSnapshot: pricing,
    basis:
      "Per physical invocation start band; crossing flagged. Estimated API cost, not verified account billing; reasoning not double-billed. Missing usage is Unavailable.",
    PEAK: aggregate(rows.filter((r) => r.priceBand === "PEAK")),
    OFF_PEAK: aggregate(rows.filter((r) => r.priceBand === "OFF_PEAK")),
    total: aggregate(rows),
    stages: Object.fromEntries(
      [...new Set(rows.map((r) => r.stage))].map((stage) => [
        stage,
        {
          PEAK: aggregate(rows.filter((r) => r.stage === stage && r.priceBand === "PEAK")),
          OFF_PEAK: aggregate(rows.filter((r) => r.stage === stage && r.priceBand === "OFF_PEAK")),
          total: aggregate(rows.filter((r) => r.stage === stage))
        }
      ])
    ),
    invocations: rows
  };
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [snapshotPath, workflowId, label, outputPath] = process.argv.slice(2);
  const snapshot = JSON.parse(await readFile(snapshotPath, "utf8"));
  const pricing = JSON.parse(
    await readFile("artifacts/v0.3.0/gate-b-027/PRICING-SNAPSHOT.json", "utf8")
  );
  const result = summary(snapshot.streams, workflowId, pricing, label, snapshot.tables.appMetadata);
  await writeFile(outputPath, JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  console.log({
    label,
    physicalCalls: result.total.physicalCalls,
    PEAK: result.PEAK,
    OFF_PEAK: result.OFF_PEAK,
    cost: result.total.estimatedCostUSD
  });
}
