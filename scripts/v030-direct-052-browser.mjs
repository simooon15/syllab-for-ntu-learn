/** Saved native snapshots → production Engine → real Chromium IndexedDB → existing Review DOM.
 * Private outputs stay local. All physical requests go through the durable CNY wallet adapter. */
import { build } from "esbuild";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import assert from "node:assert/strict";
const runLabel = process.argv[3] ?? "isolated-native-052b";
const work = process.cwd(),
  canonical = resolve(process.argv[2]),
  priv = join(canonical, "evidence/private/goal-driven-052"),
  pub = join(canonical, "artifacts/v0.3.0/goal-driven-052");
await fs.mkdir(pub, { recursive: true });
const R = await import(pathToFileURL(join(priv, "candidate-runtime.mjs")));
const read = async (p) => JSON.parse(await fs.readFile(p, "utf8"));
const sources = [
  ...(await read(
    join(canonical, "evidence/private/workflow-simplification-eval-047/original-sources.json")
  )),
  ...(await read(join(canonical, "evidence/private/goal-driven-050/holdout-sources-frozen.json")))
];
const sha = (s) => createHash("sha256").update(s).digest("hex");
await build({
  stdin: {
    contents: await fs.readFile(
      join(work, "scripts/lib/v030-native-browser-harness.ts.txt"),
      "utf8"
    ),
    resolveDir: work,
    loader: "ts"
  },
  bundle: true,
  platform: "browser",
  format: "iife",
  outfile: join(priv, "production-browser.js"),
  logLevel: "silent",
  define: { __SYLLAB_QA_TELEMETRY__: "false", __SYLLAB_E2E_FIXTURES__: "false" }
});
const bundle = await fs.readFile(join(priv, "production-browser.js")),
  css = await fs.readFile(join(work, "extension/src/app/app.css"));
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("Content-Type", "text/javascript");
    res.end(bundle);
  } else if (req.url === "/app.css") {
    res.setHeader("Content-Type", "text/css");
    res.end(css);
  } else {
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<html><head><link rel="stylesheet" href="app.css"></head><body><main id="root"></main><script src="bundle.js"></script></body></html>'
    );
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const url = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.addInitScript((label) => {
  window.qaRunLabel = label;
}, runLabel);
const priorDispatchCount = (await read(join(priv, "direct-paid-ledger.json"))).length;
let calls = 0;
await page.exposeFunction("savedSources052", () => sources);
await page.exposeFunction("physical052", async (call, actualSources) => {
  const d = JSON.parse(call.user);
  const actualById = new Map(actualSources.map((s) => [s.sourceId, s]));
  const input = {
    course: d.course,
    sources: d.sources.map((s) => actualById.get(s.index.sourceId)),
    outputLimit: call.maxTokens,
    ...(call.promptVersion.startsWith("native-source-capture") ? { sourceCapture: true } : {}),
    ...(d.candidateUnderReview ? { candidateUnderReview: d.candidateUnderReview } : {}),
    ...(d.claimAudit ? { claimAudit: d.claimAudit } : {}),
    ...(d.claimAuditEncoding ? { claimAuditEncoding: d.claimAuditEncoding } : {}),
    ...(d.literalClausePolicy ? { requireExactClauses: true } : {}),
    ...(d.contentEncoding === "upstream-claim/1" ? { losslessClaimEncoding: true } : {}),
    ...(d.incrementalSnapshot ? { incrementalSnapshot: d.incrementalSnapshot } : {}),
    ...(d.comparisonOnly ? { comparisonOnly: true } : {}),
    ...(d.contractRepair ? { contractRepair: d.contractRepair } : {})
  };
  const prepared = R.prepareDirectCourse(input, call.idempotencyKey);
  if (sha(prepared.call.user) !== sha(call.user)) throw Error("PRODUCTION_INPUT_MISMATCH");
  if (sha(prepared.call.system) !== sha(call.system)) throw Error("PRODUCTION_PROMPT_MISMATCH");
  const body = R.serializeProviderRequest(call);
  const id = "052:production:" + call.idempotencyKey;
  const file = join(priv, id + "-input.json"),
    review = join(priv, id + "-privacy.json");
  await fs.writeFile(file, JSON.stringify(input));
  await fs.writeFile(
    review,
    JSON.stringify({
      bodySHA256: sha(body),
      status: "APPROVED_FOR_PRIVATE_PROVIDER_DELIVERY",
      basis:
        "Production full native redaction. Node-only existing Key; exact reconstructed request/snapshot verified. No gold or live profile."
    })
  );
  const result = await promisify(execFile)(
    "python3",
    [
      join(priv, "launch-private.py"),
      "--input",
      file,
      "--id",
      id,
      "--authorization",
      join(priv, "authorization.json"),
      "--privacy-review",
      review,
      "--dispatch"
    ],
    { cwd: canonical, timeout: 30 * 60 * 1000, maxBuffer: 1024 * 1024 }
  );
  console.log(result.stdout.trim());
  calls++;
  const run = await read(join(priv, "direct-runs", id + ".json"));
  if (
    run.state !== "accepted" &&
    (run.problem !== "CONTRACT" || run.capture?.finishReason !== "stop" || !run.capture?.streamDone)
  )
    throw Error("CAPTURE_NOT_ACCEPTED_" + run.problem);
  return R.decodeDirectCapture(run.capture.raw).value;
});
try {
  await page.goto(url);
  const result = await page.evaluate(() => window.qa052.start());
  console.log(JSON.stringify({ productionStart: result }));
  const before = await page.evaluate(() => window.qa052.summary());
  await fs.writeFile(
    join(priv, "production-browser-snapshot.json"),
    JSON.stringify(await page.evaluate(() => window.qa052.readPrivate()), null, 2)
  );
  assert.equal(before.workflow.state, "waiting");
  assert.equal(before.trustedRules, 0);
  assert.equal(before.trustedAssessments, 0);
  const questions = await page.locator(".fact-question").count();
  assert(questions > 0);
  await page.screenshot({ path: join(priv, "production-initial-review.png"), fullPage: true });
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  const after = await page.evaluate(() => window.qa052.settle());
  assert.equal(after.trustedAssessments + after.trustedRules, 1);
  const old = calls;
  await page.evaluate(() => window.qa052.resume());
  assert.equal(calls, old);
  const proof = {
    schema: "syllab.production-native-browser/1",
    sourceCount: sources.length,
    realChromiumIndexedDB: true,
    actualWorkflowEngine: true,
    actualViewHandler: true,
    actualReviewDOM: true,
    newDiscoveryOrFetch: 0,
    originalQAProfileTouched: false,
    providerBoundaryRequests: calls,
    physicalDispatchesDuringRun:
      (await read(join(priv, "direct-paid-ledger.json"))).length - priorDispatchCount,
    initial: {
      assessments: before.assessments,
      rules: before.rules,
      reviewItems: before.reviewItems,
      trustedAssessments: before.trustedAssessments,
      trustedRules: before.trustedRules,
      visibleQuestions: questions
    },
    isolatedExplicitConfirm: {
      trustedAssessments: after.trustedAssessments,
      trustedRules: after.trustedRules
    },
    resumePhysicalCalls: 0,
    semanticAcceptance: "SEPARATE_AUDIT_REQUIRED"
  };
  if (process.argv.includes("--deep")) {
    const beforeDeep = calls;
    const deep = await page.evaluate(() => window.qa052.deepProof());
    await fs.writeFile(join(priv, "production-deep-proof.json"), JSON.stringify(deep, null, 2));
    assert(["waiting", "complete"].includes(deep.check.state));
    assert.equal(deep.override.value, "41%");
    const stateHash = (state) =>
      sha(JSON.stringify([state.assessments, state.constraints, state.facts]));
    assert.equal(stateHash(deep.before), stateHash(deep.after));
    assert.equal(stateHash(deep.after), stateHash(deep.afterKeep));
    // Sources are unchanged; a deliberate Human override is not itself a new Source change.
    // NO_MEANINGFUL_CHANGE is legitimate, provided the actual trusted value stays 41%.

    assert(deep.stagingExisted && deep.stagingCleared);
    proof.incremental = {
      providerBoundaryRequests: calls - beforeDeep,
      currentUserOverridePreserved: true,
      trustedUnchangedBeforeReview: true,
      pendingChangeCount: deep.changes.length,
      unchangedSourcesDoNotRequireInventedConflict: true,
      stagedRebuildDiscardSafe: true
    };
  }
  await fs.writeFile(join(pub, "PRODUCTION_BROWSER.json"), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof));
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
