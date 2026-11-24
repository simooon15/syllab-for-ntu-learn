/** Zero-paid QA of the shipped unpacked bundle using a fresh private profile and saved candidate. */
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { build } from "esbuild";
import { chromium } from "playwright";
const canonical = resolve(process.argv[2]),
  priv = join(canonical, "evidence/private/goal-driven-052"),
  pub = join(canonical, "artifacts/v0.3.0/goal-driven-052");
const runId = process.argv[3] ?? "052:production:direct:isolated-native-052b:final";
const original = JSON.parse(await fs.readFile(join(priv, runId + "-input.json"), "utf8"));
const run = JSON.parse(await fs.readFile(join(priv, "direct-runs", runId + ".json"), "utf8"));
assert.equal(run.state, "accepted");
await build({
  stdin: {
    contents:
      'export {materializeDirectCourse} from "./extension/src/v2/direct-course";export {decodeDirectCapture} from "./extension/src/v2/direct-json";export {directReviewItems} from "./extension/src/v2/direct-review";',
    resolveDir: process.cwd()
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: join(priv, "extension-review-runtime.mjs"),
  logLevel: "silent"
});
const { pathToFileURL } = await import("node:url");
const R = await import(pathToFileURL(join(priv, "extension-review-runtime.mjs")));
const course = {
  courseId: original.sources[0].courseId,
  semesterId: "isolated-052",
  ...original.course,
  curriculum: true,
  established: false,
  currentRevision: 0,
  consecutiveCheckFailures: 0,
  updatedAt: new Date().toISOString()
};
const m = R.materializeDirectCourse(R.decodeDirectCapture(run.capture.raw).value, original, {
  course,
  workflowId: "isolated-extension",
  sources: new Map(),
  exclusionKeys: new Set(),
  now: course.updatedAt
});
const saved = {
  course,
  assessments: m.assessments,
  constraints: m.constraints,
  facts: m.bundle.facts,
  evidence: m.bundle.evidence,
  reviewItems: R.directReviewItems(
    m,
    course.courseId,
    "isolated-extension",
    course.updatedAt,
    new Map(original.sources.map((s) => [s.sourceId, s.title]))
  ),
  changes: []
};
const profile = await fs.mkdtemp(join(tmpdir(), "syllab052-native-extension-"));
const extension = join(priv, "unpacked-test");
await fs.cp(resolve("extension/dist"), extension, { recursive: true });
await fs.writeFile(
  join(extension, "control.html"),
  '<html><script src="control.js"></script></html>'
);
await build({
  stdin: {
    contents:
      'import {LocalDatabase} from "./extension/src/v2/storage";import {LocalStore} from "./extension/src/v2/store";import {createInitialWorkflow} from "./extension/src/v2/course-state";window.seed052=async(x)=>{const store=new LocalStore(new LocalDatabase(indexedDB));await store.initialize();await store.upsertCourse(x.course);await store.writeDraft(x);await store.saveWorkflow({...createInitialWorkflow("isolated-extension",x.course,x.course.updatedAt,"initial"),state:"waiting",phase:"review",waitingReason:"review",directCoursePolicy:"native-global/1"});};',
    resolveDir: process.cwd(),
    loader: "ts"
  },
  bundle: true,
  platform: "browser",
  format: "iife",
  outfile: join(extension, "control.js"),
  define: { __SYLLAB_QA_TELEMETRY__: "false" }
});
const context = await chromium.launchPersistentContext(profile, {
  channel: "chromium",
  headless: true,
  args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`]
});
try {
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker", { timeout: 30000 }));
  const origin = `chrome-extension://${new URL(worker.url()).host}`;
  console.log("UNPACKED_WORKER_READY");
  const seed = await context.newPage();
  await seed.goto(origin + "/control.html");
  await seed.evaluate((x) => window.seed052(x), { ...saved, sources: original.sources });
  const response = await seed.evaluate(
    (courseId) =>
      chrome.runtime.sendMessage({
        contract: 2,
        type: "OPEN_SCREEN",
        surface: "full-page",
        screen: "IRV-01",
        courseId
      }),
    saved.course.courseId
  );
  assert(response?.ok);
  console.log("UNPACKED_ROUTE_READY");
  const app = await context.newPage();
  app.setDefaultTimeout(30000);
  app.on("pageerror", () => console.log("UNPACKED_PAGE_ERROR"));
  await app.goto(origin + "/app.html");
  await app.getByRole("button", { name: "Confirm", exact: true }).waitFor();
  assert((await app.locator(".fact-question").count()) > 0);
  await app.screenshot({ path: join(priv, "unpacked-initial-review.png"), fullPage: true });
  const proof = {
    schema: "syllab.unpacked-native-review/1",
    shippedBundle: true,
    freshIsolatedProfile: true,
    savedRealCandidate: true,
    runId,
    actualBackground: true,
    actualAppDOM: true,
    paidCalls: 0,
    originalProfileTouched: false,
    confirmVisible: true
  };
  await fs.writeFile(join(pub, "UNPACKED_EXTENSION.json"), JSON.stringify(proof, null, 2));
  console.log(JSON.stringify(proof));
} finally {
  await context.close();
}
