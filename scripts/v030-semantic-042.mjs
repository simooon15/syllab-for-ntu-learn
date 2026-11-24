/** Offline saved-output replay. No provider transport, environment credentials or network. */
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";
await mkdir(".tmp", { recursive: true });
await mkdir("artifacts/v0.3.0/semantic-042", { recursive: true });
await build({
  stdin: {
    contents: `export {validateTaskB} from './extension/src/v2/ai-contracts';
export {assessmentCard,factView} from './extension/src/v2/view';
export {canonicalEnvelope,AI_SCHEMAS} from './extension/src/v2/contract-registry';
export {validateOutputB2,validateOutputRequirement} from './extension/src/v2/assessment-output';
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
  outfile: ".tmp/semantic-042-runtime.mjs"
});
const R = await import(pathToFileURL(resolve(".tmp/semantic-042-runtime.mjs")));
const bytes = await readFile("evidence/private/v030-semantic-041/b2-real-completion.json");
const originalOutput = JSON.parse(bytes).value.output;
const envelope = R.canonicalEnvelope(originalOutput, R.AI_SCHEMAS.b);
const raw = envelope.value;
const input = JSON.parse(
  await readFile("evidence/private/v030-semantic-041/b2-real-input.json", "utf8")
);
const capture = JSON.parse(
  await readFile("evidence/private/v030-recovery-039/FINAL-ACTIVATION.json", "utf8")
).data["syllab-local"];
const sources = capture.sources;
const scope = { sources, evidence: [], objects: {} };
const hash = createHash("sha256").update(bytes).digest("hex");
const before = JSON.stringify(raw);
const errors = {};
const rejection = (key, fn) => {
  try {
    fn();
    errors[key] = "UNEXPECTED_PASS";
  } catch (e) {
    errors[key] = e.message;
  }
};
const validated = R.validateTaskB(raw, new Set(sources.map((s) => s.sourceId)));
rejection("wholeSavedB2", () => R.validateOutputB2(raw, validated, input.group));
assert(errors.wholeSavedB2.includes("B2_AUTHORITY"));
// Independent node diagnostics preserve the whole rejection. No deletion of structural relationships.
R.validateProvenance(raw, scope);
errors.provenance = "PASS_LITERAL_AND_TYPED_STATE_ONLY_NOT_SEMANTIC";
const p = raw.canonicalAssessmentProposals[0];
for (const [i, r] of p.requirements.entries())
  rejection(`requirement-${i}`, () => R.validateOutputRequirement(r));
const ctx = {
  strictOutput: true,
  course: capture.courses[0],
  workflowId: "offline-042",
  sources: new Map(sources.map((s) => [s.sourceId, { sourceId: s.sourceId, title: s.title }])),
  sourceRecords: sources,
  exclusionKeys: new Set(),
  now: "2026-10-08T00:00:00Z"
};
rejection("protectedMaterializer", () => R.materializeTaskB(validated, ctx, new Map(), new Set()));
assert(errors.protectedMaterializer.includes("TYPE_ENUM"));
assert(
  p.requirements.length === 11 &&
    Object.values(errors).filter((x) => x.includes("REQUIREMENT_CONTENT")).length === 11
);
// Explicit schema fixture, NEVER represented as accepted/repaired model output.
// It isolates wire/projection conservation using verbatim requirement text and original quotes.
// A declared enum is synthetic; classification/date applicability require a fresh AI verdict.
const fixture = {
  schema: raw.schema,
  identityResolutions: [],
  structuralRelationships: [],
  courseWideConstraintProposals: [],
  fieldConsolidationResults: [],
  unresolvedIssues: [],
  canonicalAssessmentProposals: [
    {
      proposalId: "synthetic-projection-only",
      canonicalName: p.canonicalName,
      type: "other",
      role: "assessment",
      aliases: p.aliases,
      consolidatedFields: p.consolidatedFields,
      requirements: p.requirements.map((r) => ({
        requirementId: r.requirementId,
        content: r.description,
        evidence: r.evidence
      })),
      supportingEvidence: p.supportingEvidence,
      unresolvedIssues: p.unresolvedIssues
    }
  ]
};
// This fixture is a declared experiment; all original date fields remain unchanged.
R.validateProvenance(fixture, scope);
const b = R.validateTaskB(fixture, new Set(sources.map((s) => s.sourceId)));
const m = R.materializeTaskB(b, ctx, new Map(), new Set());
const facts = m.bundle.facts;
const card = R.presentAssessment(m.assessments[0], facts, [], () => []);
assert(p.requirements.every((r) => card.requirements.includes(r.description)));
assert.deepEqual(
  facts.filter((f) => f.field === "requirement").map((f) => f.value.value),
  p.requirements.map((r) => r.description)
);
assert(facts.filter((f) => f.field === "requirement").every((f) => f.evidenceRefs.length > 0));
const due = facts.find((f) => f.field === "due_date");
assert.equal(due.value.state, "UNCERTAIN");
assert.deepEqual(
  R.competingValues(due.value),
  p.consolidatedFields.find((f) => f.fieldName === "dueDate").competingValues
);
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
  outfile: ".tmp/semantic-042-renderer.js"
});
const browser = await chromium.launch({ headless: true });
let visibleRequirementCount;
try {
  const page = await browser.newPage();
  await page.setContent("<!doctype html><div id='app'></div>");
  await page.addScriptTag({ path: resolve(".tmp/semantic-042-renderer.js") });
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
  assert.equal(visibleRequirementCount, 11);
  const visibleTexts = await page
    .locator('[data-field="requirement"] .fact-value')
    .allTextContents();
  assert.deepEqual(
    visibleTexts,
    p.requirements.map((r) => r.description)
  );
  const conflicts = await page.locator('[data-field="due_date"] .competing-values').textContent();
  assert(
    p.consolidatedFields
      .find((f) => f.fieldName === "dueDate")
      .competingValues.every((v) => conflicts.includes(v))
  );
} finally {
  await browser.close();
}
assert.equal(JSON.stringify(raw), before);
await writeFile(
  "evidence/private/v030-semantic-041/042-projection-diagnostic.json",
  JSON.stringify({ fixture, m, card })
);
const result = {
  handoff: "P2E-042",
  paidCalls: 0,
  sourceSHA256: hash,
  rawResponseUnmodified: true,
  registeredEnvelopeCompatibilityRepair: envelope.repair,
  wholeSavedOutput: "REJECTED_B2_AUTHORITY_NOT_REPAIRED",
  protectedMaterializer: "REJECTED_UNKNOWN_TYPE_NO_FALLBACK",
  requirementsRaw: 11,
  requirementsRejectedExplicitly: 11,
  provenance: "PASS literal verification; does not establish current applicability",
  structuralRelationshipsRejected: raw.structuralRelationships.length,
  fieldConsolidationNodes: raw.fieldConsolidationResults.length,
  errors,
  isolatedSchemaFixture: {
    status: "PASS_DIAGNOSTIC_ONLY_NOT_REAL_MODEL_PASS",
    requirementsProjected: facts.filter((f) => f.field === "requirement").length,
    verbatimContentAndEvidence: true,
    dueConflictPreserved: true,
    type: "Explicit synthetic other, NOT inferred from group presentation",
    unverifiedStartDate: "Preserved unchanged in diagnostic; current applicability NOT established"
  },
  visibleReviewDOM: {
    requirements: visibleRequirementCount,
    exactTexts: true,
    conflictsVisible: true,
    scope:
      "Diagnostic schema fixture rendered through actual View/Review code; not accepted AI output"
  },
  modelRevalidation: "REQUIRED",
  wholeCourseAcceptance: "NOT_ESTABLISHED"
};
await writeFile(
  "artifacts/v0.3.0/semantic-042/REPLAY.json",
  JSON.stringify(result, null, 2) + "\n"
);
console.log(
  JSON.stringify({
    offline: true,
    paidCalls: 0,
    wholeOutput: "correctly rejected",
    requirementsConservationDiagnostic: 11
  })
);
