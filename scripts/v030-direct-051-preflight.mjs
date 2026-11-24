/** Offline preparation only: no network, no Key, no real workflow writes. */
import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
const canonical = resolve(process.argv[2] ?? process.cwd());
const baseline = join(canonical, "evidence/private/goal-driven-050");
const priv = join(canonical, "evidence/private/goal-driven-051");
const pub = join(canonical, "artifacts/v0.3.0/goal-driven-051");
await mkdir(priv, { recursive: true });
await mkdir(pub, { recursive: true });
const outfile = join(priv, "candidate-runtime.mjs");
await build({
  stdin: {
    contents:
      'export * from "./extension/src/v2/direct-course.ts"; export * from "./extension/src/v2/direct-course-runner.ts"; export * from "./extension/src/v2/direct-dispatch-budget.ts"; export * from "./extension/src/v2/native-delivery.ts"; export * from "./extension/src/v2/provider-request.ts"; export * from "./extension/src/v2/course-read.ts";',
    resolveDir: process.cwd()
  },
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  logLevel: "silent"
});
const runtime = await import(pathToFileURL(outfile).href);
const dev = JSON.parse(
  await readFile(
    join(canonical, "evidence/private/workflow-simplification-eval-047/original-sources.json"),
    "utf8"
  )
);
const holdout = JSON.parse(await readFile(join(baseline, "holdout-sources-frozen.json"), "utf8"));
const order = JSON.parse(await readFile(join(baseline, "holdout-order.json"), "utf8"));
const first = new Set(order.slice(0, 12).map((x) => x.sourceId));
const cases = [
  { id: "development-11", sources: dev },
  { id: "seeded-holdout-12", sources: holdout.filter((s) => first.has(s.sourceId)) },
  { id: "whole-holdout-106", sources: holdout },
  { id: "saved-course-117", sources: [...dev, ...holdout] }
];
const sha = (x) => createHash("sha256").update(x).digest("hex");
const rows = [];
for (const test of cases) {
  const input = {
    course: { courseCode: "MA6081", courseName: "Fundamentals of Project Management - B" },
    sources: test.sources
  };
  const { call, snapshot } = runtime.prepareDirectCourse(input, `051:${test.id}`);
  const delivery = JSON.parse(call.user);
  const body = runtime.serializeProviderRequest(call);
  let intact = 0,
    suppressed = 0,
    empty = 0,
    partial = 0;
  test.sources.forEach((s, i) => {
    const original = runtime.sourceUnits(s);
    const sent = delivery.sources[i].nativeContent;
    if (original.length !== sent.length || original.some((u, j) => u.locator !== sent[j].locator))
      throw Error("NATIVE_UNIT_IDENTITY_LOSS");
    original.forEach((u, j) => {
      const deliveredText = sent[j].passages.map((p) => p.text).join("\n");
      if (!deliveredText) empty++;
      if (sent[j].partial) partial++;
      if (u.text === deliveredText) intact++;
      else suppressed++;
    });
  });
  await writeFile(join(priv, `${test.id}-delivery.json`), call.user);
  await writeFile(join(priv, `${test.id}-provider-request.json`), body);
  rows.push({
    id: test.id,
    sourceCount: test.sources.length,
    nativeUnitCount: intact + suppressed,
    intactNativeUnits: intact,
    accessSecretSuppressedUnits: suppressed,
    emptyUnits: empty,
    partialUnits: partial,
    originalNativeCharacters: test.sources.reduce(
      (n, s) => n + runtime.sourceUnits(s).reduce((n, u) => n + u.text.length, 0),
      0
    ),
    providerBodyBytes: Buffer.byteLength(body),
    providerBodySHA256: sha(body),
    snapshot,
    model: JSON.parse(body).model,
    maxTokensOmitted: !("max_tokens" in JSON.parse(body)),
    actualDispatches: 0,
    deliveryStatus: "PREPARED_NOT_DISPATCHED",
    consumed: "NOT_ESTABLISHED",
    semanticQuality: "NOT_EVALUATED",
    contextAdmission: "NOT_MEASURED_BY_PROVIDER"
  });
}
const report = {
  schema: "syllab.direct-course.preflight/1",
  paidDispatches: 0,
  privacy:
    "masked units are Partial; raw corpus remains private and immutable; suppression is pattern-based, not a general DLP guarantee",
  cases: rows
};
await writeFile(join(pub, "DELIVERY_PREFLIGHT.json"), JSON.stringify(report, null, 2) + "\n");
console.log(
  JSON.stringify(
    rows.map(
      ({
        id,
        sourceCount,
        nativeUnitCount,
        intactNativeUnits,
        accessSecretSuppressedUnits,
        providerBodyBytes
      }) => ({
        id,
        sourceCount,
        nativeUnitCount,
        intactNativeUnits,
        accessSecretSuppressedUnits,
        providerBodyBytes
      })
    ),
    null,
    2
  )
);
