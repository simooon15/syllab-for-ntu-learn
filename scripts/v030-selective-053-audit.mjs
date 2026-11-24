/** Offline audit of immutable real requests, SSE, depth decisions and provisional source criteria. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const root = resolve(process.cwd());
const priv = join(root, "evidence/private/goal-driven-052/continuation-053");
const runs = join(priv, "selective-real-1");
const pub = join(root, "artifacts/v0.3.0/goal-driven-053");
globalThis.fetch = async () => {
  throw Error("OFFLINE_NETWORK_DISABLED");
};
const read = async (p) => JSON.parse(await fs.readFile(p, "utf8"));
const sha = (b) => createHash("sha256").update(b).digest("hex");
const input = await read(
  join(
    root,
    "evidence/private/goal-driven-052/052:production:direct:isolated-native-052c:final-exact-clause-v8-input.json"
  )
);
const R = await import(pathToFileURL(join(priv, "replay-runtime.mjs")));
const sourceIndex = new Map(input.sources.map((s) => [s.sourceId, s]));
const captures = [];
for (const name of await fs.readdir(runs)) {
  if (!name.endsWith(".request.json")) continue;
  const id = name.slice(0, -".request.json".length);
  const request = await read(join(runs, name));
  const capture = await read(join(runs, id + ".json"));
  assert.equal(sha(JSON.stringify(request)), capture.bodySHA256);
  if (capture.state !== "captured") continue;
  const sse = await fs.readFile(join(runs, id + ".sse"), "utf8");
  let content = "",
    done = false,
    finish,
    usage;
  for (const line of sse.split(/\r?\n/u)) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (data === "[DONE]") {
      done = true;
      continue;
    }
    if (!data) continue;
    const frame = JSON.parse(data);
    usage = frame.usage ?? usage;
    for (const choice of frame.choices ?? []) {
      content += choice.delta?.content ?? "";
      finish = choice.finish_reason ?? finish;
    }
  }
  assert.equal(content, capture.raw);
  assert.equal(finish, capture.finishReason);
  assert.equal(done, capture.streamDone);
  assert.equal(usage.prompt_tokens, capture.usage.inputTokens);
  assert.equal(usage.completion_tokens, capture.usage.outputTokens);
  assert(capture.usage.inputTokens <= capture.inputTokenCeiling);
  let response;
  try {
    response = JSON.parse(content);
  } catch {
    /* Retain incomplete model output as a failure. */
  }
  captures.push({ request, capture, response });
}
captures.sort((a, b) => a.capture.startedAt.localeCompare(b.capture.startedAt));
const inspections = captures.filter(
  (c) => c.capture.stage.endsWith(":inspect") && c.capture.finishReason === "stop"
);
const depth = inspections.map(({ capture, response }) => {
  const rows = R.validateInspections(response, input.sources);
  let units = 0,
    attachmentUnits = 0,
    nativeCharacters = 0;
  let deepSources = 0,
    inspectedSources = 0,
    unresolvedSources = 0;
  for (const row of rows) {
    if (row.depth === "INSPECTED") inspectedSources++;
    if (row.depth === "UNRESOLVED") unresolvedSources++;
    if (row.depth !== "DEEP") continue;
    deepSources++;
    const source = sourceIndex.get(row.sourceId);
    const native = R.directEvidenceCatalog([source]).delivered[0].nativeContent;
    for (const unit of native.filter((u) => row.locators.includes(u.locator))) {
      units++;
      if (source.kind === "attachment") attachmentUnits++;
      nativeCharacters += unit.passages.reduce((n, p) => n + p.text.length, 0);
    }
  }
  return {
    requestSHA256: capture.bodySHA256,
    deepSources,
    inspectedSources,
    unresolvedSources,
    plannedWholeUnits: units,
    plannedAttachmentPages: attachmentUnits,
    nativeCharacters,
    inputTokens: capture.usage.inputTokens,
    outputTokens: capture.usage.outputTokens,
    reasoningTokens: capture.usage.reasoningTokens,
    limitation:
      "Initial AI depth plan only. Later reader/link expansion is additional. Counts do not establish semantic recall or final savings."
  };
});
const latest = inspections.at(-1)?.response;
const frozen = await read(
  join(root, "evidence/private/goal-driven-050/seeded-holdout-reference.json")
);
const sentinels = frozen.rows.map((row) => {
  const decision = latest?.decisions.find((d) => d.sourceId === row.sourceId);
  return {
    id: row.id,
    depth: decision?.depth,
    anchorUnitPlannedForDeepRead:
      decision?.depth === "DEEP" &&
      (decision.locators === "ALL" || decision.locators.includes(row.locator)),
    semanticJudgment: "NOT_SCORED"
  };
});
const report = {
  schema: "syllab.selective-real-offline-audit/1",
  status: "CAPTURE_INTEGRITY_PASS",
  auditedCompleteCaptures: captures.length,
  originalRequestAndSSEUnmodified: true,
  sourceCount: input.sources.length,
  nativeUnitCount: input.sources.reduce((n, s) => n + R.inspectionView(s).units.length, 0),
  depthPlans: depth,
  frozenProvisionalCriteria: sentinels,
  humanAdjudicatedGold: false,
  modelPromptContainsCriteria: false,
  semanticAcceptance: false,
  interpretation:
    "Depth plans and raw integrity are verified independently of semantic acceptance. Provisional positives, negatives and conditions remain source-first review criteria; no automatic keyword score or candidate repair."
};
await fs.writeFile(join(pub, "REAL_CAPTURE_AUDIT.json"), JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify({
    status: report.status,
    auditedCompleteCaptures: captures.length,
    depthPlans: depth
  })
);
