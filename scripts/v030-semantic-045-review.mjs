/** Offline saved-output replay. No provider transport, environment credentials or network. */
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";
await mkdir(".tmp", { recursive: true });
await mkdir("artifacts/v0.3.0/semantic-045", { recursive: true });
await build({
  stdin: {
    contents: `export {validateCoverageDecisions} from './extension/src/v2/assessment-coverage';export {scopeEvidenceIds} from './extension/src/v2/architecture-provenance';export {validateTaskB} from './extension/src/v2/ai-contracts';
export {assessmentCard,factView} from './extension/src/v2/view';
export {canonicalEnvelope,AI_SCHEMAS} from './extension/src/v2/contract-registry';
export {validateOutputB2,validateOutputRequirement,canonicalOutputFieldName} from './extension/src/v2/assessment-output';
export {validateProvenance} from './extension/src/v2/architecture-provenance';
export {materializeTaskB} from './extension/src/v2/materialize';
export {presentAssessment,competingValues} from './extension/src/v2/assessments';`,
    resolveDir: process.cwd(),
    loader: "ts"
  },
  plugins: [
    {
      name: "expose-readonly-view-for-replay",
      setup(b) {
        b.onLoad({ filter: /[/\\]view\.ts$/ }, async (args) => ({
          contents: (await readFile(args.path, "utf8"))
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
  outfile: ".tmp/semantic-045-review-runtime.mjs"
});
const R = await import(pathToFileURL(resolve(".tmp/semantic-045-review-runtime.mjs")));
const resultBytes = await readFile(
  "evidence/private/v030-semantic-045/b2-closure-v2-completion-10.json"
);
const raw = JSON.parse(resultBytes).value.output;
const p = raw.canonicalAssessmentProposals[0];
const job = JSON.parse(
  await readFile("evidence/private/v030-semantic-045/b2-closure-v2-job.json", "utf8")
);
const scope = {
  sources: job.sources,
  evidence: [],
  objects: { [job.input.group.id]: job.input.group }
};
R.validateOutputB2(
  raw,
  R.validateTaskB(raw, new Set(job.sources.map((s) => s.sourceId))),
  job.input.group
);
R.validateCoverageDecisions(
  R.validateTaskB(raw, new Set(job.sources.map((s) => s.sourceId))),
  job.input.semanticInventory,
  scope
);
const qualified = R.scopeEvidenceIds(raw, job.course.courseId, scope);
const evidence = R.validateProvenance(qualified, scope);
const m = R.materializeTaskB(
  R.validateTaskB(qualified, new Set(job.sources.map((s) => s.sourceId))),
  {
    strictOutput: true,
    course: job.course,
    workflowId: "validation-045:dispatch10-offline-replay",
    sourceRecords: job.sources,
    evidence,
    sources: new Map(
      job.sources.map((s) => [s.sourceId, { sourceId: s.sourceId, title: s.title }])
    ),
    exclusionKeys: new Set(),
    now: "2026-10-09T00:00:00.000Z"
  },
  new Map(),
  new Set()
);
await writeFile(
  "evidence/private/v030-semantic-045/dispatch10-unchanged-projection.json",
  JSON.stringify(m)
);
const sources = JSON.parse(
  await readFile("evidence/private/v030-recovery-039/FINAL-ACTIVATION.json", "utf8")
).data["syllab-local"].sources;
const facts = m.bundle.facts;
assert.deepEqual(
  facts.filter((f) => f.field === "requirement").map((f) => f.value.value),
  p.requirements.map((r) => r.content)
);
assert(facts.filter((f) => f.field === "requirement").every((f) => f.evidenceRefs.length > 0));
const evidenceRows = m.bundle.evidence;
const evidenceViews = (ids) =>
  ids
    .map((id) => evidenceRows.find((e) => e.evidenceId === id))
    .filter(Boolean)
    .map((e) => ({
      evidenceId: e.evidenceId,
      sourceTitle: sources.find((s) => s.sourceId === e.sourceId)?.title ?? "Source",
      locator: e.locator,
      excerpt: e.excerpt
    }));
const factViews = facts.map((f) =>
  R.factView(f, evidenceViews(f.evidenceRefs.map((e) => e.evidenceId)))
);
const visibleCard = R.assessmentCard(
  m.assessments[0],
  new Map([[m.assessments[0].assessmentId, facts]]),
  new Map(
    facts.map((f) => [
      f.factId,
      f.evidenceRefs
        .map((r) => evidenceRows.find((e) => e.evidenceId === r.evidenceId))
        .filter(Boolean)
    ])
  ),
  evidenceViews,
  () => []
);
assert.deepEqual(
  visibleCard.facts,
  factViews.sort((a, b) => a.field.localeCompare(b.field))
);
await build({
  stdin: {
    contents:
      "export {assessmentBody} from './extension/src/v2/screens/course'; export {createUiState} from './extension/src/v2/screens/patterns';",
    resolveDir: process.cwd(),
    loader: "ts"
  },
  bundle: true,
  platform: "browser",
  format: "iife",
  globalName: "SyllabOfflineRenderer",
  outfile: ".tmp/semantic-045-renderer.js"
});
const browser = await chromium.launch({ headless: true });
let visibleRequirementCount;
try {
  const page = await browser.newPage();
  await page.setContent("<!doctype html><div id='app'></div>");
  await page.addScriptTag({ path: resolve(".tmp/semantic-045-renderer.js") });
  await page.evaluate((card) => {
    const ctx = {
      ui: globalThis.SyllabOfflineRenderer.createUiState(),
      repaint() {},
      open() {},
      mutate() {},
      surface: "full-page",
      view: {},
      runtime: { hints: {} }
    };
    document
      .getElementById("app")
      .append(
        globalThis.SyllabOfflineRenderer.assessmentBody(ctx, card, { showDetailAction: true })
      );
  }, visibleCard);
  visibleRequirementCount = await page.locator('[data-field="requirement"]').count();
  assert.equal(visibleRequirementCount, p.requirements.length);
  const visibleTexts = await page
    .locator('[data-field="requirement"] .fact-value')
    .allTextContents();
  assert.deepEqual(
    visibleTexts,
    p.requirements.map((r) => r.content)
  );
  const conflicts = await page.locator('[data-field="due_date"] .competing-values').textContent();
  assert(
    p.consolidatedFields
      .find((f) => R.canonicalOutputFieldName(f.fieldName) === "due_date")
      .competingValues.every((v) => conflicts.includes(v))
  );
} finally {
  await browser.close();
}
const summary = {
  paidCalls: 0,
  scope:
    "Untouched P2E045 dispatch10 output → strict materializer → actual View → actual Review DOM; isolated offline rendering, no live adoption",
  resultSHA256: createHash("sha256").update(resultBytes).digest("hex"),
  coverageDecisions: raw.coverageDecisions.length,
  unchangedOriginalCompletion: true,
  originalDispatchContract: "FAIL TARGET_SUPPORT before nested literal quote fix",
  replayAfterEngineeringFix: "PASS",
  requirementsReturned: p.requirements.length,
  requirementsProjected: facts.filter((f) => f.field === "requirement").length,
  requirementsVisible: visibleRequirementCount,
  exactContent: true,
  evidenceNonempty: true,
  dueConflictsVisible: true
};
await writeFile(
  "artifacts/v0.3.0/semantic-045/REVIEW.json",
  JSON.stringify(summary, null, 2) + "\n"
);
console.log(JSON.stringify(summary));
