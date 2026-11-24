/** Read-only real-output → actual View/DOM verification, isolated page; no transport/trusted writes. */
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { chromium } from "playwright";
const root = resolve(process.argv[2] ?? process.cwd()),
  id = process.argv[3];
if (!id || !/^\w[\w:-]+$/.test(id)) throw Error("RUN_ID");
const priv = root + "/evidence/private/goal-driven-051",
  pub = root + "/artifacts/v0.3.0/goal-driven-051";
await mkdir(priv, { recursive: true });
await mkdir(pub, { recursive: true });
const read = async (p) => JSON.parse(await readFile(p, "utf8"));
const input = await read(priv + "/" + id + "-input.json"),
  run = await read(priv + "/direct-runs/" + id + ".json");
if (run.state !== "accepted" || run.capture.finishReason !== "stop" || !run.capture.streamDone)
  throw Error("NON_FINAL_MODEL_OUTPUT");
await build({
  stdin: {
    contents:
      'export {materializeDirectCourse} from "./extension/src/v2/direct-course"; export {assessmentCard,factView} from "./extension/src/v2/view";',
    resolveDir: process.cwd()
  },
  plugins: [
    {
      name: "readonly-view",
      setup(b) {
        b.onLoad({ filter: /[/\\]view\.ts$/ }, async (a) => ({
          contents: (await readFile(a.path, "utf8"))
            .replace("function assessmentCard(", "export function assessmentCard(")
            .replace("function factView(", "export function factView("),
          loader: "ts"
        }));
      }
    }
  ],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: priv + "/review-runtime.mjs",
  logLevel: "silent"
});
const R = await import(pathToFileURL(priv + "/review-runtime.mjs"));
const frozenRuntime = process.argv[4];
if (!/^candidate-runtime-[\w-]+\.mjs$/.test(frozenRuntime ?? ""))
  throw Error("FROZEN_RUNTIME_REQUIRED");
const M = await import(pathToFileURL(priv + "/" + frozenRuntime));
const m = M.materializeDirectCourse(JSON.parse(run.capture.raw), input, {
  course: {
    courseId: input.sources[0].courseId,
    semesterId: "isolated-synthetic",
    courseCode: input.course.courseCode,
    courseName: input.course.courseName,
    curriculum: false,
    established: false,
    currentRevision: 0,
    consecutiveCheckFailures: 0,
    updatedAt: "now"
  },
  workflowId: "isolated-" + id,
  sources: new Map(),
  exclusionKeys: new Set(),
  now: "now"
});
const facts = m.bundle.facts ?? [],
  ev = m.bundle.evidence ?? [];
const views = (ids) =>
  ids
    .map((id) => ev.find((e) => e.evidenceId === id))
    .filter(Boolean)
    .map((e) => ({
      evidenceId: e.evidenceId,
      sourceTitle: input.sources.find((s) => s.sourceId === e.sourceId)?.title ?? "Source",
      locator: e.locator,
      excerpt: e.excerpt
    }));
const groups = new Map(
  m.assessments.map((a) => [a.assessmentId, facts.filter((f) => f.assessmentId === a.assessmentId)])
);
const cards = m.assessments.map((a) =>
  R.assessmentCard(
    a,
    groups,
    new Map(
      facts.map((f) => [
        f.factId,
        f.evidenceRefs.map((r) => ev.find((e) => e.evidenceId === r.evidenceId)).filter(Boolean)
      ])
    ),
    views,
    () => []
  )
);
await build({
  stdin: {
    contents:
      'export {assessmentBody} from "./extension/src/v2/screens/course"; export {createUiState} from "./extension/src/v2/screens/patterns";',
    resolveDir: process.cwd()
  },
  bundle: true,
  platform: "browser",
  format: "iife",
  globalName: "OfflineReview",
  outfile: priv + "/review-renderer.js",
  logLevel: "silent"
});
const browser = await chromium.launch({ headless: true });
let visibleRequirements = 0,
  conflicts = 0;
try {
  const page = await browser.newPage();
  for (let i = 0; i < cards.length; i++) {
    await page.setContent('<div id="app"></div>');
    await page.addScriptTag({ path: priv + "/review-renderer.js" });
    await page.evaluate((card) => {
      const ctx = {
        ui: globalThis.OfflineReview.createUiState(),
        repaint() {},
        open() {},
        mutate() {},
        surface: "full-page",
        view: {},
        runtime: { hints: {} }
      };
      document
        .getElementById("app")
        .append(globalThis.OfflineReview.assessmentBody(ctx, card, { showDetailAction: true }));
    }, cards[i]);
    const expected = groups
      .get(m.assessments[i].assessmentId)
      .filter((f) => f.field === "requirement");
    const text = await page.locator('[data-field="requirement"] .fact-value').allTextContents();
    assert.deepEqual(
      text,
      expected.map((f) => String(f.value.value))
    );
    visibleRequirements += text.length;
    for (const f of groups
      .get(m.assessments[i].assessmentId)
      .filter((f) => f.value.state === "UNCERTAIN" && f.value.competingValues?.length)) {
      const shown = await page
        .locator('[data-field="' + f.field + '"] .competing-values')
        .allTextContents();
      assert(f.value.competingValues.every((v) => shown.join("\n").includes(String(v))));
      conflicts++;
    }
  }
} finally {
  await browser.close();
}
await writeFile(priv + "/" + id + "-materialized.json", JSON.stringify(m));
const report = {
  id,
  rawSHA256: createHash("sha256").update(run.capture.raw).digest("hex"),
  paidCalls: 0,
  assessments: m.assessments.length,
  constraints: m.constraints.length,
  requirementsReturned: facts.filter((f) => f.field === "requirement").length,
  requirementsVisible: visibleRequirements,
  conflictFieldsVisible: conflicts,
  exactReturnedContent: "PASS",
  mechanicalEvidence: "PASS",
  realTrustedWrites: 0,
  originalProfileOpened: false,
  semanticAcceptance: "SEPARATE_SOURCE_FIRST_AUDIT_REQUIRED",
  unresolvedIssues: {
    global: m.unresolvedIssues.length,
    objects: m.objectIssues.reduce((n, x) => n + x.unresolvedIssues.length, 0),
    constraints: m.constraintIssues.reduce((n, x) => n + x.unresolvedIssues.length, 0)
  },
  issueReviewPresentation: "NOT_ESTABLISHED",
  courseRuleInitialAdoption: "NOT_ESTABLISHED",
  crossCourse: "NOT_VERIFIED"
};
await writeFile(
  pub + "/" + id.replaceAll(":", "-") + "-REVIEW.json",
  JSON.stringify(report, null, 2) + "\n"
);
console.log(JSON.stringify(report));
