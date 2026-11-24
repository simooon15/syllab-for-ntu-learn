/** P2E-034 targeted real-model qualification. Private inputs/responses never enter shared artifacts. */
import { build } from "esbuild";
import { chromium } from "playwright";
import { mkdir, readFile, writeFile, appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const paid = process.argv.includes("--paid");
const replayAlias = process.argv.includes("--resume-nested-alias-r1");
const resumeB2 = process.argv.includes("--resume-b2-contract-r3");
const resumeR2 = process.argv.includes("--resume-source-selector-r2") || resumeB2;
if (resumeR2 && !resumeB2) {
  const previous = JSON.parse(
    await readFile("artifacts/v0.3.0/semantic-034/r2/TARGETED.json", "utf8")
  );
  assert(
    previous.errorCode === "PRIVATE_NATIVE_SAMPLE_REQUIRED" &&
      previous.actualModelInvocations === 5,
    "KNOWN_HARNESS_SELECTOR_DEFECT_REQUIRED"
  );
}
if (resumeB2) {
  const previous = JSON.parse(
    await readFile("artifacts/v0.3.0/semantic-034/r2/TARGETED.json", "utf8")
  );
  assert(
    previous.errorCode === "AI_CONTRACT:task_b" && previous.actualModelInvocations === 8,
    "CONFIRMED_B2_CONTRACT_REQUIRED"
  );
}
const evidenceRepair = process.argv.includes("--repair-evidence-r2") || resumeR2;
if (evidenceRepair) {
  const failed = JSON.parse(
    await readFile("artifacts/v0.3.0/semantic-034/r1/TARGETED.json", "utf8")
  );
  assert(
    failed.errorCode === "PROVENANCE_SHAPE" && failed.actualModelInvocations === 1,
    "CONFIRMED_MISSING_EVIDENCE_ID_REQUIRED"
  );
}
const repair = process.argv.includes("--repair-envelope-r1") || replayAlias;
if (repair) {
  const failed = JSON.parse(await readFile("artifacts/v0.3.0/semantic-034/TARGETED.json", "utf8"));
  assert(
    failed.status === "FAIL" &&
      failed.actualModelInvocations === 1 &&
      failed.errorCode.startsWith("AI_CONTRACT:schema:syllab.ai/session/1"),
    "CONFIRMED_ENVELOPE_DEFECT_REQUIRED"
  );
}
const privateDir = resolve(
  evidenceRepair
    ? "evidence/private/v030-semantic-034-r2"
    : repair
      ? "evidence/private/v030-semantic-034-r1"
      : "evidence/private/v030-semantic-034"
);
const sharedDir = resolve(
  evidenceRepair
    ? "artifacts/v0.3.0/semantic-034/r2"
    : repair
      ? "artifacts/v0.3.0/semantic-034/r1"
      : "artifacts/v0.3.0/semantic-034"
);
await mkdir(privateDir, { recursive: true });
await mkdir(sharedDir, { recursive: true });
await mkdir(".tmp", { recursive: true });
await build({
  stdin: {
    contents: `export {runSession} from './extension/src/v2/architecture-runner';
      export {bootstrap,resolveReads} from './extension/src/v2/course-read';
      export {validateTaskA,validateTaskB,validateTaskC} from './extension/src/v2/ai-contracts';
      export {validateProvenance,scopeEvidenceIds} from './extension/src/v2/architecture-provenance';
      export {emptyRegistry,applyOperations,validateRegistry} from './extension/src/v2/progressive-registry';
      export {completeWithRepair} from './extension/src/v2/deepseek-complete';
      export {DeepSeekTransport} from './extension/src/v2/deepseek';`,
    resolveDir: process.cwd(),
    loader: "ts"
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".tmp/semantic-034-runtime.mjs",
  plugins: [
    {
      name: "no-qa-archive",
      setup(b) {
        b.onResolve({ filter: /qa-telemetry$/ }, () => ({
          path: resolve("extension/src/v2/qa-telemetry.disabled.ts")
        }));
      }
    }
  ]
});
const R = await import(pathToFileURL(resolve(".tmp/semantic-034-runtime.mjs")));
const authority = await readFile("docs/collaboration/CHATGPT_TO_CODEX_HANDOFF.md", "utf8");
assert(
  authority.includes("P2E-v0.3.0-2026-10-08-034") &&
    authority.includes("READY_PAID_SEMANTIC_VALIDATION")
);
const browser = await chromium.connectOverCDP("http://127.0.0.1:9440");
const context = browser.contexts()[0];
const credentialPage = context
  .pages()
  .find(
    (p) => p.url().startsWith("chrome-extension://") && /\/(sidepanel|app)\.html/.test(p.url())
  );
assert(credentialPage, "EXISTING_QA_SETTINGS_REQUIRED");
let apiKey = await credentialPage.evaluate(
  async () => (await chrome.storage.local.get("syllab.deepseekApiKey"))["syllab.deepseekApiKey"]
);
assert(typeof apiKey === "string" && apiKey.length > 0, "BYOK_REQUIRED");
const snapshot = JSON.parse(
  await readFile("evidence/private/v030-gate-br-028/BEFORE.json", "utf8")
);
const snapshotSha = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
const preflight = {
  handoff: "P2E-v0.3.0-2026-10-08-034",
  credentialAvailable: true,
  privateSnapshotAvailable: true,
  privateSnapshotSha256: snapshotSha,
  productionRuntime: true,
  adoptionAllowed: false,
  fullCourseAllowedBeforeGate: false
};
const auth = await fetch("https://api.deepseek.com/v1/models", {
  headers: { Authorization: `Bearer ${apiKey}` }
});
preflight.providerAuthHttpStatus = auth.status;
if (!auth.ok) {
  await browser.close();
  throw Error("PROVIDER_AUTH_PREFLIGHT_FAILED");
}
const models = await auth.json();
preflight.exactModelAvailable = models.data?.some((m) => m.id === "deepseek-flash") === true;
assert(preflight.exactModelAvailable, "EXACT_MODEL_UNAVAILABLE");
await writeFile(resolve(sharedDir, "PREFLIGHT.json"), JSON.stringify(preflight, null, 2) + "\n");
console.log(JSON.stringify({ event: "preflight", ...preflight }));
if (!paid) {
  apiKey = null;
  await browser.close();
  process.exit(0);
}
// Exclusive claim prevents random reruns or redispatch of an ambiguous previous attempt.
await writeFile(
  resolve(
    privateDir,
    resumeB2
      ? "B2-REPAIR-R3-CLAIM.json"
      : resumeR2
        ? "SOURCE-RESUME-CLAIM.json"
        : replayAlias
          ? "REPLAY-CLAIM.json"
          : "PAID-CLAIM.json"
  ),
  JSON.stringify({ at: new Date().toISOString(), handoff: preflight.handoff }),
  { flag: "wx" }
);
const ledger =
    replayAlias || resumeR2
      ? JSON.parse(
          await readFile(
            resolve(privateDir, resumeB2 ? "LEDGER-BASELINE-R3.json" : "LEDGER-BASELINE.json"),
            "utf8"
          )
        )
      : [],
  matrix = [],
  sessions = new Map();
const start = Date.now();
let activeCase = null,
  activePhysical = null;
const saveLedger = async () =>
  writeFile(resolve(sharedDir, "LEDGER.json"), JSON.stringify(ledger, null, 2) + "\n");
const fetcher = async (url, init) => {
  assert(url === "https://api.deepseek.com/chat/completions", "UNAUTHORIZED_GENERATION_ENDPOINT");
  const row = {
    ordinal: ledger.length,
    case: activeCase,
    physicalId: activePhysical,
    attemptType: evidenceRepair
      ? "engineering-rerun-evidence-id-r2"
      : repair
        ? "engineering-rerun-envelope-r1"
        : "initial",
    startedAt: new Date().toISOString(),
    state: "dispatched",
    requestSha256: createHash("sha256").update(init.body).digest("hex")
  };
  ledger.push(row);
  await saveLedger();
  try {
    const response = await fetch(url, init);
    row.httpStatus = response.status;
    const stream = await response.clone().text();
    await writeFile(resolve(privateDir, `physical-${row.ordinal}.sse`), stream, { flag: "wx" });
    for (const line of stream.split("\n"))
      if (line.startsWith("data: ") && line !== "data: [DONE]") {
        try {
          const event = JSON.parse(line.slice(6));
          if (event.usage) row.usage = event.usage;
          if (event.choices?.[0]?.finish_reason) row.finishReason = event.choices[0].finish_reason;
        } catch {
          /* SSE separators are not content */
        }
      }
    row.finishedAt = new Date().toISOString();
    row.latencyMs = Date.parse(row.finishedAt) - Date.parse(row.startedAt);
    row.state = row.finishReason
      ? "generation-observed"
      : response.ok
        ? "paid-unverified"
        : "provider-rejected";
    await saveLedger();
    console.log(
      JSON.stringify({
        event: "physical",
        case: activeCase,
        ordinal: row.ordinal,
        state: row.state,
        latencyMs: row.latencyMs,
        finishReason: row.finishReason
      })
    );
    if (row.state === "paid-unverified") throw Error("PAID_UNVERIFIED");
    return response;
  } catch (error) {
    row.state = row.state === "dispatched" ? "paid-unverified" : row.state;
    await saveLedger();
    throw error;
  }
};
const transport = new R.DeepSeekTransport(fetcher);
const source = (id, units, kind = "content") => ({
  sourceId: id,
  courseId: "semantic034",
  kind,
  title: id,
  parsed: {
    status: "ok",
    text: units.join("\n"),
    units: units.map((text, i) => ({ locator: `native-${i + 1}`, text, partial: false })),
    contentHash: createHash("sha256").update(units.join("\n")).digest("hex")
  }
});
const inputs = [
  source("notice-one", [
    "Assignment 1 is an individual essay worth 20%, due 20 October 2026 at 23:59. Submit a 1500-word PDF via NTU Learn. Quiz Alpha is worth 10%, scheduled 12 October 2026. A project is mentioned, but its identity and details are not specified. All submissions must cite external sources. Late work loses 5% per day."
  ]),
  source("notice-two", [
    "Assignment One (also called Assignment 1) is the same individual 1500-word essay worth 20%, due 20 October 2026 at 23:59; submit PDF via NTU Learn. Quiz Beta is a separate test worth 15%, scheduled 19 October 2026. A project is mentioned without enough detail to decide whether it is the same project as other notices. All submissions must cite external sources."
  ]),
  source("office-hours", [
    "The library opening hours are 09:00–18:00. The campus shuttle stops at the north gate. This notice contains no assessments or course-wide learning/submission rules."
  ]),
  source(
    "project-guide",
    [
      "Project Gamma assessment. Detailed weight, deadline and requirements are on native-2; they are not provided in this opening section. Read that section before deciding the assessment fields.",
      "Project Gamma is worth 30%, due 30 October 2026 at 17:00. Work in groups of three. Submit a report and a five-minute presentation. The report component is worth 20% and presentation 10%."
    ],
    "file"
  )
];
async function session(id, stage, input, scope, validateFinal, onReply) {
  activeCase = id;
  const file = resolve(privateDir, `session-${id}.json`);
  const port = {
    load: async () => {
      if (resumeR2 && !sessions.has(id)) {
        try {
          const saved = JSON.parse(await readFile(file, "utf8"));
          assert(saved.state === "final", "ONLY_FINAL_REUSE");
          sessions.set(id, saved);
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
      if (replayAlias && id === "a-notice-one" && !sessions.has(id)) {
        const saved = JSON.parse(await readFile(file, "utf8"));
        const request = saved.requests.at(-1);
        assert(
          saved.state === "failed" &&
            request.state === "failed" &&
            request.response?.schema === "syllab.ai/session/1" &&
            request.response.output?.schema === "syllab.ai/task-a/1",
          "KNOWN_CAPTURED_ALIAS_REQUIRED"
        );
        saved.state = "active";
        request.state = "captured";
        sessions.set(id, saved);
      }
      return sessions.get(id);
    },
    save: async (s) => {
      sessions.set(id, structuredClone(s));
      await writeFile(file, JSON.stringify(s));
    },
    resolve: async (reads) => R.resolveReads(reads, scope),
    resolveTransport: async (reads) => R.resolveReads(reads, scope),
    validateFinal,
    onReply,
    execute: async (call) => {
      activePhysical = call.idempotencyKey;
      return R.completeWithRepair(call, apiKey, transport);
    }
  };
  const result = await R.runSession(id, stage, input, port);
  const saved = sessions.get(id);
  const row = {
    case: id,
    stage,
    status: "PASS",
    physicalRequests: saved.requests.length,
    effectiveSemanticRounds: saved.effectiveRounds,
    transportSegments: saved.rounds.reduce((n, r) => n + r.segments.length, 0)
  };
  matrix.push(row);
  console.log(JSON.stringify({ event: "case", ...row }));
  return result;
}
try {
  const outputs = [];
  for (const s of inputs) {
    const scope = { sources: [s], evidence: [], objects: {} };
    const value = await session(
      `a-${s.sourceId}`,
      "A",
      { course: { courseCode: "QA034", courseName: "Semantic qualification" }, ...R.bootstrap(s) },
      scope,
      (v) => {
        R.validateTaskA(v, new Set([s.sourceId]));
        R.validateProvenance(v, scope);
        if (s.sourceId === "office-hours")
          assert(
            v.assessmentDrafts.length === 0 && v.courseWideConstraintCandidates.length === 0,
            "ZERO_OUTPUT_CASE"
          );
        else assert(v.assessmentDrafts.length > 0, "DRAFT_RECALL");
      }
    );
    outputs.push({ source: s, value: R.scopeEvidenceIds(value, "semantic034", scope) });
  }
  assert(sessions.get("a-project-guide").effectiveRounds >= 2, "REQUESTED_READ_CASE_NOT_OBSERVED");
  const real = snapshot.tables.sources.find(
    (s) =>
      s.parsed &&
      s.parsed.text?.length > 200 &&
      s.parsed.text.length < 5000 &&
      !["file", "attachment"].includes(s.kind)
  );
  assert(real, "PRIVATE_NATIVE_SAMPLE_REQUIRED");
  await session(
    "a-private-native",
    "A",
    { course: { courseCode: "Private", courseName: "Private snapshot" }, ...R.bootstrap(real) },
    { sources: [real], evidence: [], objects: {} },
    (v) => {
      R.validateTaskA(v, new Set([real.sourceId]));
      R.validateProvenance(v, { sources: [real], evidence: [], objects: {} });
    }
  );
  const drafts = outputs.flatMap(({ source, value }) =>
    value.assessmentDrafts.map((payload, i) => ({
      id: `${source.sourceId}:d:${i}`,
      sourceId: source.sourceId,
      payload
    }))
  );
  const rules = outputs.flatMap(({ source, value }) =>
    value.courseWideConstraintCandidates.map((payload, i) => ({
      id: `${source.sourceId}:r:${i}`,
      sourceId: source.sourceId,
      payload
    }))
  );
  let registry = resumeB2
    ? JSON.parse(await readFile(resolve(privateDir, "REGISTRY.json"), "utf8"))
    : R.emptyRegistry();
  const scope = {
    sources: inputs,
    evidence: R.validateProvenance(
      outputs.map((o) => o.value),
      { sources: inputs, evidence: [], objects: {} }
    ),
    objects: Object.fromEntries([...drafts, ...rules].map((d) => [d.id, d.payload]))
  };
  await session(
    "b1-global",
    "B1",
    {
      drafts,
      rules,
      sourceTerminals: inputs.map((s) => ({ sourceId: s.sourceId, state: "final" })),
      trusted: null,
      registryManifest: []
    },
    scope,
    (v) =>
      R.validateRegistry(
        R.applyOperations(registry, v.operations),
        drafts.map((d) => d.id),
        rules.map((d) => d.id)
      ),
    async (reply) => {
      registry = R.applyOperations(registry, reply.carry?.operations ?? []);
      if (reply.kind === "ROUND_COMPLETE_FINAL")
        registry = R.applyOperations(registry, reply.output.operations);
      for (const record of registry.records) scope.objects[record.id] = record;
      await writeFile(resolve(privateDir, "REGISTRY.json"), JSON.stringify(registry));
    }
  );
  const groups = registry.records.filter((r) => r.kind === "group");
  assert(groups.length > 0, "CANONICAL_IDENTITY_COLLAPSE");
  assert(
    groups.some((g) => g.payload.memberDraftIds.length >= 2),
    "SAME_ASSESSMENT_NOT_GROUPED"
  );
  assert(
    registry.records.some((r) => r.kind === "rule"),
    "IMPORTANT_RULE_RECALL"
  );
  for (const group of groups) {
    const members = drafts.filter((d) => group.payload.memberDraftIds.includes(d.id));
    const ids = new Set(members.map((m) => m.sourceId));
    const gscope = {
      sources: inputs.filter((s) => ids.has(s.sourceId)),
      evidence: scope.evidence.filter((e) => ids.has(e.sourceId)),
      objects: { [group.id]: group, ...Object.fromEntries(members.map((m) => [m.id, m.payload])) }
    };
    await session(
      `b2-${groups.indexOf(group)}${resumeB2 && groups.indexOf(group) === 0 ? "-repair-r3" : ""}`,
      "B2",
      { group, members, registryRevision: registry.revision },
      gscope,
      (v) => {
        const b = R.validateTaskB(v, ids);
        R.validateProvenance(v, gscope);
        assert(
          b.canonicalAssessmentProposals.length === 1 &&
            b.courseWideConstraintProposals.length === 0,
          "ONE_GROUP_OUTPUT"
        );
        assert(
          b.identityResolutions.length === 0 && b.structuralRelationships.length === 0,
          "B2_IDENTITY_REDO"
        );
        assert.deepEqual(v.upstream, {
          groupId: group.id,
          revision: group.revision,
          memberDraftIds: group.payload.memberDraftIds
        });
      }
    );
  }
  const current = {
    evidenceId: "current",
    sourceId: "current-notice",
    locator: "native-1",
    excerpt: "Essay deadline is 20 October 2026 at 23:59."
  };
  const latest = {
    evidenceId: "latest",
    sourceId: "latest-notice",
    locator: "native-1",
    excerpt: "Essay deadline is now 22 October 2026 at 23:59."
  };
  const cscope = {
    sources: [
      source("current-notice", [current.excerpt]),
      source("latest-notice", [latest.excerpt])
    ],
    evidence: [current, latest],
    objects: {}
  };
  await session(
    "c-changed",
    "C",
    {
      target: { objectId: "essay", kind: "assessment" },
      current: {
        assessment: { assessmentId: "essay", name: "Assignment 1" },
        facts: [{ field: "dueDate", value: "2026-10-20T23:59" }],
        evidence: [current]
      },
      latest: {
        assessment: { assessmentId: "essay", name: "Assignment 1" },
        facts: [{ field: "dueDate", value: "2026-10-22T23:59" }],
        evidence: [latest]
      },
      coverage: { scopeComplete: true, partialCoverage: false },
      identity: [{ involvedObjectIds: ["essay"], relationship: "SAME_ASSESSMENT" }],
      registryDisposition: []
    },
    cscope,
    (v) => {
      const c = R.validateTaskC(v, new Set(cscope.sources.map((s) => s.sourceId)), true);
      R.validateProvenance(v, cscope);
      assert(
        c.changeResults.length === 1 && c.changeResults[0].changeType === "CHANGED",
        "CHANGE_CASE"
      );
      assert(
        c.changeResults[0].currentEvidence.length && c.changeResults[0].newEvidence.length,
        "DUAL_EVIDENCE_CHAIN"
      );
    }
  );
  await writeFile(
    resolve(sharedDir, "TARGETED.json"),
    JSON.stringify(
      {
        status: "PASS",
        matrix,
        runtimeMs: Date.now() - start,
        actualModelInvocations: ledger.length,
        adoption: 0,
        fullCourseRuns: 0,
        naturalSampleLimitations: [
          "merge/split/reassign/retirement, multi-segment and absent enum paths retain deterministic regression; no extra paid enum fabrication"
        ]
      },
      null,
      2
    ) + "\n"
  );
  console.log(JSON.stringify({ event: "targeted-gate", status: "PASS", calls: ledger.length }));
} catch (error) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  await appendFile(resolve(privateDir, "FAILURE.txt"), code + "\n");
  await writeFile(
    resolve(sharedDir, "TARGETED.json"),
    JSON.stringify(
      {
        status: "FAIL",
        failedCase: activeCase,
        errorCode: code,
        matrix,
        runtimeMs: Date.now() - start,
        actualModelInvocations: ledger.length,
        fullCourseRuns: 0,
        adoption: 0
      },
      null,
      2
    ) + "\n"
  );
  console.log(
    JSON.stringify({
      event: "targeted-gate",
      status: "FAIL",
      case: activeCase,
      errorCode: code,
      calls: ledger.length
    })
  );
  process.exitCode = 1;
} finally {
  apiKey = null;
  await browser.close();
}
