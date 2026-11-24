// Offline-only protocol regression using private captures. Never dispatches browser/provider work.
import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const built = await build({
  entryPoints: ["extension/src/v2/retrieval-planner.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false
});
const { validatePlanner, PLANNER_SCHEMA, contentIndex, expandRef } = await import(
  `data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`
);
const ids = ["0ec7ad7862d587cca30b0685", "b769fffeb2325445da1b844c", "f02018908ce966abe409dd34"];
const cases = [];
for (const [n, id] of ids.entries()) {
  const data = JSON.parse(
      await readFile(`evidence/private/v030-retrieval/planner_eval_${id}.json`, "utf8")
    ),
    e = data.evaluation,
    legacy = e.failedPayload ?? e.result;
  assert.ok(legacy, "private raw output must exist");
  assert.throws(() => validatePlanner(legacy, e.index, e.expanded), /PLANNER_CONTRACT:ENVELOPE/);
  const read = new Set(e.expanded.map((r) => r.ref));
  const intents = [
    ...new Set([
      ...(legacy.requestedRefs ?? []),
      ...legacy.sources.flatMap((s) => s.processingRefs ?? [])
    ])
  ];
  const requestRefs = intents.filter((ref) => !read.has(ref));
  const selectedEvidenceRefs = [
    ...new Set(legacy.sources.flatMap((s) => s.processingRefs ?? []))
  ].filter((ref) => read.has(ref));
  const visualRequestRefs = [...new Set((legacy.visualRequests ?? []).map((r) => r.ref))];
  const payload = {
    schema: PLANNER_SCHEMA,
    status: requestRefs.length ? "CONTINUE" : "COMPLETE",
    requestRefs,
    selectedEvidenceRefs,
    visualRequestRefs,
    uncertainRefs: []
  };
  const parsed = validatePlanner(payload, e.index, e.expanded);
  assert.ok(parsed.selectedEvidenceRefs.every((ref) => read.has(ref)));
  assert.ok(parsed.visualRequestRefs.every((ref) => parsed.selectedEvidenceRefs.includes(ref)));
  const duplicateSources = legacy.sources.length - new Set(legacy.sources.map((s) => s.ref)).size;
  let detection;
  if (n === 0) {
    assert.equal(legacy.sources.filter((s) => s.decision === "NO_FURTHER_EXPANSION").length, 117);
    assert.equal(parsed.selectedEvidenceRefs.length, 0);
    detection = "AMBIGUOUS_LEGACY_EMPTY_SCOPE_REQUIRES_AI_RESELECTION";
  }
  if (n === 1) {
    assert.equal(requestRefs.length, 9);
    assert.equal(parsed.status, "CONTINUE");
    assert.throws(
      () =>
        validatePlanner(
          { ...payload, selectedEvidenceRefs: [...selectedEvidenceRefs, ...requestRefs] },
          e.index,
          e.expanded
        ),
      /SELECTION_NOT_READ/
    );
    detection = "NINE_UNREAD_INTENTS_ARE_ACQUISITION_NOT_READ_SELECTION";
  }
  if (n === 2) {
    assert.ok(duplicateSources > 0);
    const duplicated = {
      ...payload,
      selectedEvidenceRefs: [...selectedEvidenceRefs, ...selectedEvidenceRefs]
    };
    assert.deepEqual(
      validatePlanner(duplicated, e.index, e.expanded).selectedEvidenceRefs,
      selectedEvidenceRefs
    );
    detection = "SOURCE_CLASSIFICATION_ARRAY_REMOVED_EXACT_REF_DUPLICATES_NORMALIZED";
  }
  cases.push({
    case: n + 1,
    passed: true,
    detection,
    duplicateSources,
    requestRefs: requestRefs.length,
    readSelectionRefs: selectedEvidenceRefs.length,
    visualRequestRefs: visualRequestRefs.length,
    acceptedProductScope: false
  });
}
const previous = JSON.parse(
  await readFile(`evidence/private/v030-retrieval/planner_eval_${ids[2]}.json`, "utf8")
).evaluation;
const inventory = JSON.parse(
  await readFile("evidence/private/v030-retrieval/BEFORE.json", "utf8")
).sources;
const measurement = JSON.parse(
  await readFile("artifacts/v0.3.0/parser-measurement/REPORT.json", "utf8")
);
const manifest = JSON.parse(
  await readFile("evidence/private/v030-parser-measurement/FETCH_MANIFEST.json", "utf8")
);
for (const attachment of manifest) {
  const source = inventory.find((s) => s.sourceId === attachment.sourceId),
    alias = createHash("sha256").update(attachment.sourceId).digest("hex"),
    row = measurement.rows.find((r) => r.sourceAlias === alias);
  assert.equal(source.parsed.contentHash, attachment.expectedContentHash);
  for (const unit of source.parsed.units) {
    const gap = row.remainingGaps.find((g) => g.locator === unit.locator);
    unit.partial = !!gap;
    unit.visualGaps = gap?.triggers ?? [];
  }
}
const currentIndex = contentIndex(inventory);
assert.equal(currentIndex.sources.length, 117);
assert.equal(currentIndex.units.length, 880);
assert.equal(currentIndex.units.filter((u) => u[7].length).length, 852);
for (const source of currentIndex.sources)
  assert.equal(
    source.fingerprint,
    previous.index.sources.find((s) => s.ref === source.ref).fingerprint
  );
assert.equal(previous.expanded.length, 223);
for (const native of previous.expanded)
  assert.deepEqual(expandRef(currentIndex, inventory, native.ref), native);
cases.push({
  case: 4,
  passed: true,
  detection: "OBJECTIVE_223_NATIVE_EXPANSIONS_UNCHANGED_WITH_NEW_PROTOCOL_IDENTITY",
  sourceRefs: 51,
  unitRefs: 172
});
const report = {
  status: "OFFLINE_PROTOCOL_REPLAY_PASS",
  realModelCalls: 0,
  taskABC: 0,
  vision: 0,
  courseWorkflows: 0,
  cases,
  note: "Legacy conversion is exact Ref-set protocol replay only; no semantic interpretation, no accepted final scope. The all-NO_FURTHER output is not recoverable as an authoritative selection and requires AI reselection."
};
await writeFile(".tmp/v030-007-offline-replay.json", JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
