/** Offline preservation counterfactual over immutable real captures. No model semantic acceptance. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
const root = resolve(process.argv[2] ?? process.cwd()),
  priv = join(root, "evidence/private/goal-driven-052/continuation-053"),
  out = join(root, "artifacts/v0.3.0/goal-driven-053");
globalThis.fetch = async () => {
  throw Error("OFFLINE_NETWORK_DISABLED");
};
await fs.mkdir(priv, { recursive: true });
await fs.mkdir(out, { recursive: true });
const prefix = join(
  root,
  "evidence/private/goal-driven-052/direct-runs/052:production:direct:isolated-native-052c:final-exact-clause-v8"
);
const input = JSON.parse(
  await fs.readFile(
    join(
      root,
      "evidence/private/goal-driven-052/052:production:direct:isolated-native-052c:final-exact-clause-v8-input.json"
    ),
    "utf8"
  )
);
const capture = JSON.parse(await fs.readFile(prefix + ".json", "utf8")),
  sse = await fs.readFile(prefix + ".sse", "utf8");
let content = "",
  done = false,
  finish,
  usage;
for (const line of sse.split(/\r?\n/)) {
  if (!line.startsWith("data:")) continue;
  const data = line.slice(5).trim();
  if (data === "[DONE]") {
    done = true;
    continue;
  }
  if (!data) continue;
  const frame = JSON.parse(data);
  usage = frame.usage ?? usage;
  for (const choice of frame.choices ?? []) {
    content += choice.delta?.content ?? "";
    finish = choice.finish_reason ?? finish;
  }
}
assert.equal(content, capture.capture.raw);
assert(done);
assert.equal(finish, "stop");
assert.equal(usage.prompt_tokens, capture.capture.usage.inputTokens);
assert.equal(usage.completion_tokens, capture.capture.usage.outputTokens);
await build({
  stdin: {
    contents:
      'export * from "./extension/src/v2/selective-course";export {resolveDirectEvidence,directEvidenceCatalog} from "./extension/src/v2/direct-evidence";export {directReviewItems} from "./extension/src/v2/direct-review";',
    resolveDir: root
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: join(priv, "replay-runtime.mjs"),
  logLevel: "silent"
});
const R = await import(pathToFileURL(join(priv, "replay-runtime.mjs"))),
  old = JSON.parse(content),
  owner = new Map(),
  entities = [];
for (const p of old.output.canonicalAssessmentProposals) {
  const ids = [...p.requirements, ...p.consolidatedFields].flatMap(
    (x) => x.reconciledClaimIds ?? []
  );
  for (const id of ids) {
    assert(!owner.has(id), "OLD_DUPLICATE_OWNER");
    owner.set(id, p.proposalId);
  }
  entities.push({
    ref: p.proposalId,
    name: p.canonicalName,
    type: p.type,
    role: p.role,
    parentRef: p.componentOfProposalId,
    aliases: p.aliases,
    clauseRefs: ids.slice(0, 1)
  });
}
for (const p of old.output.courseWideConstraintProposals) {
  for (const id of p.reconciledClaimIds ?? []) {
    assert(!owner.has(id));
    owner.set(id, p.proposalId);
  }
  entities.push({
    ref: p.proposalId,
    name: p.proposalId,
    type: "rule",
    role: "assessment",
    aliases: [],
    clauseRefs: p.reconciledClaimIds.slice(0, 1)
  });
}
const dispositions = new Map(old.unmappedClaims.map((c) => [c.claimId, c]));
const clauses = input.claimAudit.map((c) => {
  const evidence = R.resolveDirectEvidence(c.evidence, input.sources);
  assert(evidence.length);
  const descriptor = c.fieldDescriptor;
  return {
    clauseId: c.claimId,
    sourceId: evidence[0].sourceId,
    kind: c.kind,
    field: descriptor?.fieldName,
    content: c.content,
    value: descriptor
      ? {
          state: descriptor.state,
          ...(descriptor.value != null ? { value: descriptor.value } : {}),
          competingValues: descriptor.competingValues
        }
      : { state: "KNOWN", value: c.content },
    modality: "Not separately structured in the historical response; authored wording retained",
    conditions: [],
    exceptions: [],
    applicability: "CURRENT",
    context: "Historical saved reader clause; this adapter tests mechanical preservation only",
    evidence
  };
});
const links = clauses.map((c) => {
  const d = dispositions.get(c.clauseId),
    ref = owner.get(c.clauseId);
  assert(ref || d, "OLD_UNACCOUNTED_CLAUSE");
  return {
    clauseRef: c.clauseId,
    ...(ref ? { ownerRef: ref } : {}),
    disposition: ref ? "CURRENT" : d.disposition === "HISTORICAL" ? "HISTORICAL" : "UNRESOLVED",
    state: ref ? c.value.state : d.disposition === "HISTORICAL" ? c.value.state : "UNCERTAIN",
    competingClauseRefs: [],
    resolutionClauseRefs: [],
    basis: ref
      ? "Saved ownership only; every alias-expanded independent clause preserved"
      : d.reason
  };
});
const draft = {
  schema: R.SELECTIVE_COURSE_SCHEMA,
  clauses,
  entities,
  links,
  identities: [],
  inspections: input.sources.map((s) => ({
    sourceId: s.sourceId,
    depth: "DEEP",
    locators: R.inspectionView(s).units.map((u) => u.locator),
    reason: "Historical whole delivery, not new selective-routing acceptance"
  })),
  deepLocators: Object.fromEntries(
    input.sources.map((s) => [s.sourceId, R.inspectionView(s).units.map((u) => u.locator)])
  )
};
const course = {
  courseId: input.sources[0].courseId,
  semesterId: "isolated-053",
  ...input.course,
  curriculum: true,
  established: false,
  currentRevision: 0,
  consecutiveCheckFailures: 0,
  updatedAt: "2026-10-10T00:00:00.000Z"
};
const candidate = R.compileCourseDraft(draft, input.sources, {
  course,
  workflowId: "isolated-053-real-replay",
  sources: new Map(
    input.sources.map((s) => [s.sourceId, { sourceId: s.sourceId, title: s.title }])
  ),
  exclusionKeys: new Set(),
  now: course.updatedAt
}).candidate;
const facts = candidate.bundle.facts,
  unowned = draft.links.filter((l) => !l.ownerRef);
assert.equal(facts.length + unowned.length, 211);
for (const c of clauses) {
  const f = facts.find((f) => f.semanticClause?.clauseId === c.clauseId);
  if (owner.has(c.clauseId)) {
    assert(f);
    assert.equal(f.semanticClause.content, c.content);
    assert.deepEqual(
      f.value,
      c.value.state === "UNCERTAIN"
        ? { ...c.value, competingValues: c.value.competingValues ?? [] }
        : c.value.state === "EXPLICITLY_UNKNOWN"
          ? { state: c.value.state }
          : { state: c.value.state, value: c.value.value }
    );
  } else {
    assert(candidate.unresolvedIssues.some((i) => i.description.includes(c.content)));
  }
}
const views = input.sources.map(R.inspectionView),
  previewBytes = Buffer.byteLength(JSON.stringify(views)),
  nativeBytes = Buffer.byteLength(JSON.stringify(R.directEvidenceCatalog(input.sources).delivered));
const frozen = JSON.parse(
  await fs.readFile(
    join(root, "evidence/private/goal-driven-050/seeded-holdout-reference.json"),
    "utf8"
  )
);
const normalized = (text) => text.replace(/\s+/gu, " ").trim();
const sentinels = frozen.rows.map((row) => {
  const observed = views.find((s) => s.sourceId === row.sourceId),
    unit = observed?.units.find((u) => u.locator === row.locator);
  return {
    id: row.id,
    sourceObserved: !!observed,
    unitObserved: !!unit,
    anchorInPreliminary:
      !!unit && normalized(unit.preview.join(" ")).includes(normalized(row.excerpt)),
    omittedContentExplicit: !!unit && unit.omittedCharacters > 0
  };
});
assert(
  sentinels.every((s) => s.sourceObserved && s.unitObserved),
  "FROZEN_SENTINEL_UNIT_UNOBSERVED"
);
await fs.writeFile(
  join(out, "PREVIEW_SENTINELS.json"),
  JSON.stringify(
    {
      schema: "syllab.selective-preview-exposure/1",
      frozenCriteria: sentinels.length,
      rows: sentinels,
      modelRoutingJudgmentTested: false,
      humanAdjudicatedGold: false,
      limitation:
        "Exposure accounting only over the existing frozen positive/negative/conditional provisional reference. Missing preliminary anchor is an omitted-content risk, not proof that no task exists. No criterion is passed to any model prompt."
    },
    null,
    2
  ) + "\n"
);
const report = {
  schema: "syllab.selective-offline-preservation/1",
  rawSSEVerified: true,
  savedClauseCount: 211,
  ownedFacts: facts.length,
  unownedVisibleIssues: unowned.length,
  everyOwnedBodyPreserved: true,
  aliasBodiesCannotReplaceIndependentFacts: true,
  historicalAliasGroups: old.output.canonicalAssessmentProposals
    .flatMap((p) => p.requirements)
    .filter((r) => r.reconciledClaimIds?.length > 1).length,
  discoveredSources: input.sources.length,
  observedUnits: views.reduce((n, s) => n + s.units.length, 0),
  preliminaryBytes: previewBytes,
  wholeNativeDeliveryBytes: nativeBytes,
  preliminaryToWholeBytes: previewBytes / nativeBytes,
  preliminaryCharacters: views.reduce(
    (n, s) => n + s.units.reduce((a, u) => a + u.preview.join("\n").length, 0),
    0
  ),
  timestampOnlyVersionsUnchanged: input.sources.filter(
    (s) =>
      R.semanticSourceVersion(s, input.sources) ===
      R.semanticSourceVersion({ ...s, updatedAt: "2100-01-01T00:00:00Z" }, input.sources)
  ).length,
  newPaidDispatches: 0,
  newModelRoutingRecallAccepted: false,
  newModelSemanticQualityAccepted: false,
  limitation:
    "Uses saved ownership and every upstream clause as a counterfactual. Does not repair/admit v8, infer historical modality, validate new AI routing, or adopt trusted state."
};
await fs.writeFile(join(out, "OFFLINE_PRESERVATION.json"), JSON.stringify(report, null, 2) + "\n");
await fs.writeFile(
  join(out, "OBSERVATION_MEASUREMENT.json"),
  JSON.stringify(
    {
      sources: report.discoveredSources,
      units: report.observedUnits,
      previewBytes,
      nativeBytes,
      previewCharacters: report.preliminaryCharacters,
      timestampOnlyVersionsUnchanged: report.timestampOnlyVersionsUnchanged,
      newPaidDispatches: 0,
      claim: report.limitation
    },
    null,
    2
  ) + "\n"
);
await fs.writeFile(
  join(priv, "real-replay-candidate.json"),
  JSON.stringify(
    {
      course,
      ...candidate.bundle,
      reviewItems: R.directReviewItems(
        candidate,
        course.courseId,
        "isolated-053-real-replay",
        course.updatedAt,
        new Map(input.sources.map((s) => [s.sourceId, s.title]))
      ),
      sources: input.sources,
      draft
    },
    null,
    2
  )
);
console.log(JSON.stringify(report));
