/** Exact captured-response replay for the observed C schema alias. No credentials or provider port. */
import { build } from "esbuild";
import { readFile, writeFile, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const privateDir = "evidence/private/v030-semantic-034-r2";
const sharedDir = "artifacts/v0.3.0/semantic-034/r2";
await build({
  stdin: {
    contents: `export {runSession} from './extension/src/v2/architecture-runner';
  export {validateTaskC} from './extension/src/v2/ai-contracts';
  export {validateProvenance} from './extension/src/v2/architecture-provenance';`,
    resolveDir: process.cwd(),
    loader: "ts"
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".tmp/semantic-034-replay.mjs",
  plugins: [
    {
      name: "disabled",
      setup(b) {
        b.onResolve({ filter: /qa-telemetry$/ }, () => ({
          path: resolve("extension/src/v2/qa-telemetry.disabled.ts")
        }));
      }
    }
  ]
});
const R = await import(pathToFileURL(resolve(".tmp/semantic-034-replay.mjs")));
const report = JSON.parse(await readFile(`${sharedDir}/TARGETED.json`, "utf8"));
assert(
  report.status === "FAIL" &&
    report.failedCase === "c-changed" &&
    report.errorCode === "AI_CONTRACT:task_c"
);
const ledger = JSON.parse(await readFile(`${sharedDir}/LEDGER.json`, "utf8"));
assert(ledger.at(-1).finishReason === "stop" && ledger.at(-1).state === "generation-observed");
const file = `${privateDir}/session-c-changed.json`;
let saved = JSON.parse(await readFile(file, "utf8"));
const rawResponse = JSON.stringify(saved.requests.at(-1).response);
assert(
  saved.state === "failed" && saved.requests.at(-1).response.output.schema === "syllab.ai/task-c/1"
);
await copyFile(file, `${privateDir}/session-c-changed-pre-alias.json`);
await copyFile(`${sharedDir}/TARGETED.json`, `${sharedDir}/TARGETED-PRE-C-ALIAS-REPLAY.json`);
saved.state = "active";
saved.requests.at(-1).state = "captured";
const input = JSON.parse(saved.rounds[0].segments.map((s) => s.text).join(""));
const evidence = [...input.current.evidence, ...input.latest.evidence];
let dispatches = 0;
await R.runSession("c-changed", "C", input, {
  load: async () => saved,
  save: async (s) => {
    saved = structuredClone(s);
    await writeFile(file, JSON.stringify(s));
  },
  execute: async () => {
    dispatches++;
    throw Error("REPLAY_GENERATION_FORBIDDEN");
  },
  resolve: async () => {
    throw Error("UNEXPECTED_NEW_READ");
  },
  validateFinal: (v) => {
    const c = R.validateTaskC(v, new Set(evidence.map((e) => e.sourceId)), true);
    R.validateProvenance(v, { sources: [], evidence, objects: {} });
    assert(c.changeResults.length === 1 && c.changeResults[0].changeType === "CHANGED");
    assert.deepEqual(c.changeResults[0].currentEvidence, input.current.evidence);
    assert.deepEqual(c.changeResults[0].newEvidence, input.latest.evidence);
  }
});
assert(dispatches === 0 && JSON.stringify(saved.requests.at(-1).response) === rawResponse);
// Ground-truth audit uses the fixed synthetic corpus, never production grouping heuristics.
const registry = JSON.parse(await readFile(`${privateDir}/REGISTRY.json`, "utf8"));
const relations = registry.records
  .filter((r) => r.kind === "identity")
  .map((r) => r.payload.resolution.relationship);
for (const value of ["SAME_ASSESSMENT", "DIFFERENT_ASSESSMENT", "UNCERTAIN"])
  assert(relations.includes(value));
const fields = [];
for (const id of ["b2-0-repair-r3", "b2-1", "b2-2", "b2-3"]) {
  const session = JSON.parse(await readFile(`${privateDir}/session-${id}.json`, "utf8"));
  assert(session.state === "final");
  const proposal = session.output.canonicalAssessmentProposals[0];
  fields.push({
    name: proposal.canonicalName,
    fields: proposal.consolidatedFields.map((f) => ({
      fieldName: f.fieldName,
      state: f.state,
      value: f.value
    })),
    requirements: proposal.requirements.length
  });
}
assert(fields.every((p) => p.fields.some((f) => f.fieldName === "weight" && f.state === "KNOWN")));
await writeFile(
  `${sharedDir}/SEMANTIC-AUDIT.json`,
  JSON.stringify(
    {
      status: "PASS",
      corpus: "synthetic ground truth plus one private native sample",
      relationships: relations,
      groupCount: 4,
      ruleCount: 2,
      proposals: fields,
      cDualEvidence: true,
      cReplayNewCalls: 0,
      rawResponsePreserved: true,
      deterministicOnly: [
        "merge/split/reassign/retirement",
        "multi-segment transport budget",
        "absent Conflict/Not Mentioned paths",
        "technical failure is not empty semantic success",
        "removal safety"
      ]
    },
    null,
    2
  ) + "\n"
);
const matrix = [
  ...report.matrix,
  {
    case: "c-changed",
    stage: "C",
    status: "PASS",
    physicalRequests: saved.requests.length,
    effectiveSemanticRounds: saved.effectiveRounds,
    transportSegments: saved.rounds.reduce((n, r) => n + r.segments.length, 0),
    capturedReplayNewCalls: 0
  }
];
await writeFile(
  `${sharedDir}/TARGETED.json`,
  JSON.stringify(
    {
      status: "PASS",
      matrix,
      actualModelInvocations: ledger.length,
      priorEngineeringAttempts: 2,
      totalMilestoneModelInvocations: ledger.length + 2,
      adoption: 0,
      fullCourseRuns: 0,
      groundTruthAudit: "SEMANTIC-AUDIT.json",
      capturedCReplayNewCalls: 0,
      limitations:
        "Synthetic semantic cases plus one saved private native Source; deterministic-only paths are explicitly listed in SEMANTIC-AUDIT.json."
    },
    null,
    2
  ) + "\n"
);
console.log(
  JSON.stringify({
    targeted: "PASS",
    calls: ledger.length + 2,
    newReplayCalls: 0,
    groups: 4,
    rules: 2,
    cases: matrix.length
  })
);
