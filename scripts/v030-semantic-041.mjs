/** P2E-041: one explicitly budgeted provider dispatch per targeted case; private I/O only. */
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const name = process.argv[2];
assert(["a-positive", "a-negative", "a-uncertain", "b1-real", "b2-real"].includes(name));
const authority = await readFile("docs/collaboration/CHATGPT_TO_CODEX_HANDOFF.md", "utf8");
assert(
  authority.includes("P2E-v0.3.0-2026-10-08-041") &&
    authority.includes("FIVE_TARGETED_DEEPSEEK_CALLS_AUTHORIZED")
);
const privateDir = resolve("evidence/private/v030-semantic-041");
const sharedDir = resolve("artifacts/v0.3.0/semantic-041");
await mkdir(privateDir, { recursive: true });
await mkdir(sharedDir, { recursive: true });
await build({
  stdin: {
    contents: `export {runSession} from './extension/src/v2/architecture-runner';
export {bootstrap,sourceIndex,sourceUnits,resolveReads} from './extension/src/v2/course-read';
export {validateTaskA,validateTaskB} from './extension/src/v2/ai-contracts';
export {validateProvenance} from './extension/src/v2/architecture-provenance';
export {emptyRegistry,applyOperations,validateRegistry} from './extension/src/v2/progressive-registry';
export {assessmentSourceContexts,validateAssessmentRelevance,validateExcludedAssessment,relevanceSourceIds,relevanceFields} from './extension/src/v2/assessment-semantics';
export {materializeTaskB} from './extension/src/v2/materialize';
export {DeepSeekTransport} from './extension/src/v2/deepseek';
export {readProviderCompletion} from './extension/src/v2/deepseek-complete';`,
    resolveDir: process.cwd(),
    loader: "ts"
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".tmp/semantic-041-runtime.mjs",
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
const R = await import(pathToFileURL(resolve(".tmp/semantic-041-runtime.mjs")));
let apiKey = process.env.DEEPSEEK_API_KEY;
delete process.env.DEEPSEEK_API_KEY;
assert(typeof apiKey === "string" && apiKey.length > 0, "MEMORY_ONLY_BYOK_REQUIRED");
const snapshotBytes = await readFile("evidence/private/v030-recovery-039/FINAL-ACTIVATION.json");
const tables = JSON.parse(snapshotBytes).data["syllab-local"];
const metadata = Object.fromEntries(tables.appMetadata.map((x) => [x.key, x.value]));
const rows = metadata["architecture-a:wf_ffd850a9f186233026338f6f"].ledger;
const oldRegistry = metadata["architecture-registry:wf_ffd850a9f186233026338f6f"].ledger;
const oldMemberIds = new Set(
  oldRegistry.records.filter((x) => x.kind === "group").flatMap((x) => x.payload.memberDraftIds)
);
const drafts = rows
  .flatMap((r) =>
    (r.result?.assessmentDrafts ?? []).map((payload, i) => ({
      id: `wf_ffd850a9f186233026338f6f:a:${r.sourceId}:draft:${i}`,
      sourceId: r.sourceId,
      payload
    }))
  )
  .filter((d) => oldMemberIds.has(d.id));
const selectedSources = new Set(drafts.map((d) => d.sourceId));
const originals = tables.sources.filter((s) => selectedSources.has(s.sourceId));
const evidence = [];
const collect = (v) => {
  if (Array.isArray(v)) v.forEach(collect);
  else if (v && typeof v === "object") {
    if (typeof v.evidenceId === "string" && typeof v.excerpt === "string") evidence.push(v);
    Object.values(v).forEach(collect);
  }
};
collect(drafts);
let scope = {
  sources: tables.sources,
  evidence,
  objects: Object.fromEntries(drafts.map((d) => [d.id, d.payload]))
};
const syntheticTexts = {
  "a-positive":
    "Current course instructions, Semester 1 2026. Assignment 1 is an individual design report, due 21 October 2026 at 23:59, worth 20% of this course. Submit a PDF through the course portal. Assignment 2: answer Question 1 from the attached 2023 archived exam paper and submit those answers by 28 October 2026 at 17:00; this assigned exercise is worth 5% this semester. Its question has subparts (a) and (b), not separate assignments. Teaching example only, NOT assigned: a fictional team submits a report on Friday for 50%. This example is here to illustrate planning.",
  "a-negative":
    "Reference material for optional revision. Past examination paper, 2023. This is not a current assignment and no submission is required. Question 1: Describe stakeholder analysis (10 marks). Question 2: Discuss structures (15 marks). Also included: an academic journal article reporting that participants completed a 20%-weighted design report in a historical study. This article is background reading, not an instruction to this course's students. Worked example: submit a proposal by Friday. This is an example, not an assigned exercise.",
  "a-uncertain":
    "Project briefing note: Report 1. Further instructions will follow. It is not yet clear whether this is a required submission, a presentation component, or a reference example. The note does not establish whether it refers to the earlier similarly named Report 1. No due date or grade weight is specified."
};
let input, stage, group;
if (name.startsWith("a-")) {
  stage = "A";
  const text = syntheticTexts[name];
  const source = {
    sourceId: name,
    courseId: "synthetic-041",
    kind: "content",
    title: "Course material",
    parsed: {
      text,
      contentHash: createHash("sha256").update(text).digest("hex"),
      units: [{ locator: "native-text", text, partial: false }]
    }
  };
  scope = { sources: [source], evidence: [], objects: {} };
  input = {
    course: { courseCode: "QA041", courseName: "Synthetic semantic validation" },
    ...R.bootstrap(source)
  };
} else if (name === "b1-real") {
  stage = "B1";
  const sourceContexts = R.assessmentSourceContexts(rows, scope);
  input = {
    course: {
      courseCode: "MA6081",
      courseName: "Fundamentals of Project Management",
      context:
        "Current course container; source dates/roles must be judged from actual evidence, not inferred from access date."
    },
    drafts,
    rules: [],
    sourceContexts,
    sourceTerminals: rows.map((r) => ({
      sourceId: r.sourceId,
      state: r.result ? "final" : "failed"
    })),
    trusted: null,
    registryManifest: [],
    suppliedNativeEvidence: originals.map((s) => ({
      sourceId: s.sourceId,
      index: R.sourceIndex(s),
      units: R.sourceUnits(s)
    })),
    validationScope:
      "Bounded replay of the existing four groups. Full original text for all member Sources is pre-delivered for this one-call test. Source indexes elsewhere allow explicit missing-context uncertainty. Do not claim full-course completeness."
  };
} else {
  stage = "B2";
  const result = JSON.parse(await readFile(resolve(privateDir, "b1-real-result.json"), "utf8"));
  const registry = R.applyOperations(R.emptyRegistry(), result.operations);
  const eligible = registry.records.filter(
    (r) => r.kind === "group" && r.payload.relevance?.status === "CURRENT"
  );
  const presentationIds = oldRegistry.records.find((r) => r.id === "group:group-presentation")
    .payload.memberDraftIds;
  group = eligible.find((g) => g.payload.memberDraftIds.some((id) => presentationIds.includes(id)));
  assert(group, "B1_MUST_RETAIN_TRUE_PRESENTATION_BEFORE_B2");
  const members = drafts.filter((d) => group.payload.memberDraftIds.includes(d.id));
  const ids = new Set([...members.map((d) => d.sourceId), ...R.relevanceSourceIds(group)]);
  scope = {
    sources: tables.sources.filter((s) => ids.has(s.sourceId)),
    evidence: evidence.filter((e) => ids.has(e.sourceId)),
    objects: { ...Object.fromEntries(members.map((d) => [d.id, d.payload])), [group.id]: group }
  };
  input = {
    group,
    members,
    registryRevision: registry.revision,
    sourceContexts: R.assessmentSourceContexts(
      rows.filter((r) => ids.has(r.sourceId)),
      scope
    ),
    suppliedNativeEvidence: scope.sources.map((s) => ({
      sourceId: s.sourceId,
      index: R.sourceIndex(s),
      units: R.sourceUnits(s)
    }))
  };
}
await writeFile(resolve(privateDir, `${name}-input.json`), JSON.stringify(input), { flag: "wx" });
await writeFile(
  resolve(privateDir, `${name}-claim.json`),
  JSON.stringify({ handoff: "P2E-041", at: new Date().toISOString() }),
  { flag: "wx" }
);
const ledgerPath = resolve(sharedDir, "LEDGER.json");
let ledger;
try {
  ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
} catch (e) {
  if (e.code !== "ENOENT") throw e;
  ledger = [];
}
let caseDispatches = 0;
const persist = () => writeFile(ledgerPath, JSON.stringify(ledger, null, 2) + "\n");
const transport = new R.DeepSeekTransport(async (url, init) => {
  assert(url === "https://api.deepseek.com/chat/completions");
  assert(ledger.length < 5 && caseDispatches === 0, "P2E041_DISPATCH_LIMIT_NO_AUTOMATIC_RETRY");
  const ordinal = ledger.length + 1;
  // Exclusive durable slot is consumed BEFORE transport. Unknown/failed attempts still count.
  await writeFile(
    resolve(privateDir, `dispatch-${ordinal}.json`),
    JSON.stringify({ name, ordinal, at: new Date().toISOString() }),
    { flag: "wx" }
  );
  caseDispatches++;
  const row = {
    ordinal,
    case: name,
    state: "dispatched",
    startedAt: new Date().toISOString(),
    requestSHA256: createHash("sha256").update(init.body).digest("hex"),
    requestBytes: Buffer.byteLength(init.body)
  };
  ledger.push(row);
  await persist();
  const response = await fetch(url, init);
  row.httpStatus = response.status;
  const raw = await response.clone().text();
  await writeFile(resolve(privateDir, `${name}.sse`), raw, { flag: "wx" });
  for (const line of raw.split("\n"))
    if (line.startsWith("data: ") && line !== "data: [DONE]") {
      try {
        const event = JSON.parse(line.slice(6));
        if (event.usage) row.usage = event.usage;
        if (event.choices?.[0]?.finish_reason) row.finishReason = event.choices[0].finish_reason;
      } catch {
        /* SSE separators */
      }
    }
  row.finishedAt = new Date().toISOString();
  row.state = row.finishReason ? "generation-observed" : "paid-unverified";
  await persist();
  return response;
});
let saved;
try {
  const result = await R.runSession(`validation-041:${name}`, stage, input, {
    load: () => Promise.resolve(undefined),
    save: async (s) => {
      saved = s;
      await writeFile(resolve(privateDir, `${name}-session.json`), JSON.stringify(s));
    },
    execute: async (call) => {
      const payload = await transport.complete(apiKey, call);
      const completion = R.readProviderCompletion(payload);
      await writeFile(resolve(privateDir, `${name}-completion.json`), JSON.stringify(completion));
      assert(completion.ok && !completion.truncated, "INVALID_OR_TRUNCATED_JSON_NO_RETRY");
      return { call, value: completion.value, consumesApi: true };
    },
    resolve: (reads) => Promise.resolve(R.resolveReads(reads, scope)),
    resolveTransport: (reads) => Promise.resolve(R.resolveReads(reads, scope)),
    validateFinal: (value) => {
      if (stage === "A") {
        R.validateTaskA(value, new Set(scope.sources.map((s) => s.sourceId)));
        R.validateProvenance(value, scope);
      }
      if (stage === "B1") {
        const registry = R.applyOperations(R.emptyRegistry(), value.operations);
        R.validateRegistry(
          registry,
          drafts.map((d) => d.id),
          []
        );
        for (const record of registry.records) {
          if (record.kind === "group") R.validateAssessmentRelevance(record, scope);
          R.validateExcludedAssessment(record, scope);
        }
      }
      if (stage === "B2") {
        const result = R.validateTaskB(value, new Set(scope.sources.map((s) => s.sourceId)));
        assert(
          result.canonicalAssessmentProposals.length === 1 &&
            result.identityResolutions.length === 0 &&
            result.structuralRelationships.length === 0 &&
            result.courseWideConstraintProposals.length === 0
        );
        assert(
          value.upstream.groupId === group.id &&
            value.upstream.revision === group.revision &&
            JSON.stringify(value.upstream.memberDraftIds) ===
              JSON.stringify(group.payload.memberDraftIds)
        );
        R.validateProvenance(value, scope);
      }
    }
  });
  await writeFile(resolve(privateDir, `${name}-result.json`), JSON.stringify(result));
  if (stage === "B2") {
    const proposal = result.canonicalAssessmentProposals[0];
    assert(
      typeof proposal.canonicalName === "string" &&
        proposal.canonicalName.length > 0 &&
        Array.isArray(proposal.consolidatedFields) &&
        Array.isArray(proposal.requirements) &&
        Array.isArray(proposal.supportingEvidence),
      "GROUP_PROPOSAL_SHAPE"
    );
    const projected = R.materializeTaskB(
      {
        ...result,
        canonicalAssessmentProposals: [
          {
            ...proposal,
            consolidatedFields: [...proposal.consolidatedFields, ...R.relevanceFields(group)]
          }
        ]
      },
      {
        course: tables.courses.find((c) => c.courseId === tables.workflows[0].courseId),
        sources: new Map(
          scope.sources.map((s) => [s.sourceId, { sourceId: s.sourceId, title: s.title }])
        ),
        workflowId: "validation-041",
        exclusionKeys: new Set(),
        sourceRecords: scope.sources,
        evidence: scope.evidence,
        observations: tables.sourceObservations,
        now: new Date().toISOString()
      },
      new Map(),
      new Set()
    );
    assert(
      projected.assessments.length === 1 && projected.bundle.facts.length > 0,
      "REVIEW_PROJECTION_REQUIRED"
    );
    await writeFile(resolve(privateDir, "b2-review-projection.json"), JSON.stringify(projected));
  }
  await writeFile(
    resolve(sharedDir, `${name}.json`),
    JSON.stringify(
      {
        case: name,
        contract: "PASS",
        semantic: "PENDING_MANUAL_EVIDENCE_REVIEW",
        physicalDispatches: caseDispatches,
        effectiveRounds: saved.effectiveRounds,
        resultSHA256: createHash("sha256").update(JSON.stringify(result)).digest("hex")
      },
      null,
      2
    ) + "\n"
  );
  console.log(JSON.stringify({ case: name, contract: "PASS", physicalDispatches: caseDispatches }));
} catch (e) {
  await writeFile(
    resolve(sharedDir, `${name}.json`),
    JSON.stringify(
      {
        case: name,
        contract: "FAIL",
        semantic: "NOT_ESTABLISHED",
        physicalDispatches: caseDispatches,
        error: e.code ?? e.message
      },
      null,
      2
    ) + "\n"
  );
  console.log(
    JSON.stringify({
      case: name,
      contract: "FAIL",
      physicalDispatches: caseDispatches,
      error: e.code ?? e.message
    })
  );
  process.exitCode = 1;
} finally {
  apiKey = null;
}
