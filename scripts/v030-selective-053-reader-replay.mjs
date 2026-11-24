/** Zero-paid transport counterfactual of new validated DeepSeek reader notes, with synthetic ownership. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
const root = resolve(process.cwd()),
  priv = join(root, "evidence/private/goal-driven-052/continuation-053"),
  runs = join(priv, "selective-real-1"),
  pub = join(root, "artifacts/v0.3.0/goal-driven-053");
globalThis.fetch = async () => {
  throw Error("OFFLINE_NETWORK_DISABLED");
};
const read = async (p) => JSON.parse(await fs.readFile(p, "utf8")),
  sha = (s) => createHash("sha256").update(s).digest("hex");
const input = await read(
  join(
    root,
    "evidence/private/goal-driven-052/052:production:direct:isolated-native-052c:final-exact-clause-v8-input.json"
  )
);
const saved = await read(join(priv, "real-replay-candidate.json"));
const R = await import(pathToFileURL(join(priv, "replay-runtime.mjs")));
const inspectionCaptures = [];
for (const file of await fs.readdir(runs)) {
  if (!/^[0-9a-f]{64}\.json$/u.test(file)) continue;
  const value = await read(join(runs, file));
  if (value.stage?.endsWith(":inspect") && value.finishReason === "stop")
    inspectionCaptures.push(value);
}
inspectionCaptures.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
const plans = new Map(
  JSON.parse(inspectionCaptures.at(-1).raw).decisions.map((d) => [d.sourceId, d])
);
const completed = new Set();
for (const file of await fs.readdir(runs)) {
  if (!file.startsWith("cache-")) continue;
  const v = await read(join(runs, file));
  if (Array.isArray(v.notes)) for (const note of v.notes) completed.add(note.sourceId);
}
assert(completed.size > 0);
let syntheticLink = false;
const draft = await R.runSelectiveCourse(
  { course: input.course, sources: input.sources, outputLimit: 32768 },
  {
    load: async (key) => {
      if (key.includes(":inspect:")) return undefined;
      try {
        return await read(join(runs, "cache-" + sha(key) + ".json"));
      } catch (e) {
        if (e.code === "ENOENT") return undefined;
        throw e;
      }
    },
    save: async () => {},
    capture: async (call) => {
      const payload = JSON.parse(call.user);
      if (call.promptVersion.endsWith(":inspect"))
        return {
          decisions: payload.sources.map((s) => ({
            sourceId: s.sourceId,
            depth: completed.has(s.sourceId) ? "DEEP" : "UNRESOLVED",
            locators: completed.has(s.sourceId) ? plans.get(s.sourceId).locators : [],
            reason:
              "Transport counterfactual only: reuse completed reader cache; other content remains explicitly unresolved."
          }))
        };
      if (!call.promptVersion.endsWith(":link")) throw Error("REPLAY_UNFINISHED_READ");
      syntheticLink = true;
      return {
        entities: [
          {
            ref: "synthetic-owner",
            name: "Reader transport fixture: synthetic ownership, not course acceptance",
            type: "assignment",
            role: "assessment",
            aliases: [],
            clauseRefs: [payload.clauses[0].clauseId]
          }
        ],
        links: payload.clauses.map((c) => ({
          clauseRef: c.clauseId,
          ...(c.applicability === "HISTORICAL" ? {} : { ownerRef: "synthetic-owner" }),
          disposition:
            c.applicability === "CURRENT"
              ? "CURRENT"
              : c.applicability === "HISTORICAL"
                ? "HISTORICAL"
                : "UNRESOLVED",
          state: c.applicability === "UNCERTAIN" ? "UNCERTAIN" : c.value.state,
          competingClauseRefs: [],
          resolutionClauseRefs: [],
          basis: "Synthetic ownership tests transport only; no real model reconciliation."
        })),
        identities: [],
        reads: []
      };
    }
  }
);
assert(syntheticLink);
const candidate = R.compileCourseDraft(draft, input.sources, {
  course: saved.course,
  workflowId: "isolated-reader-transport-053",
  sources: new Map(
    input.sources.map((s) => [s.sourceId, { sourceId: s.sourceId, title: s.title }])
  ),
  exclusionKeys: new Set(),
  now: saved.course.updatedAt
}).candidate;
for (const clause of draft.clauses) {
  const fact = candidate.bundle.facts.find((f) => f.semanticClause?.clauseId === clause.clauseId);
  if (clause.applicability === "HISTORICAL") {
    assert(candidate.unresolvedIssues.some((q) => q.description.includes(clause.content)));
    continue;
  }
  assert(fact);
  for (const key of ["content", "modality", "conditions", "exceptions", "applicability", "context"])
    assert.deepEqual(fact.semanticClause[key], clause[key]);
  assert.deepEqual(
    fact.evidenceRefs,
    clause.evidence.map(({ sourceId, locator, evidenceId }) => ({ sourceId, locator, evidenceId }))
  );
  assert.equal(fact.semanticClause.originalState, clause.value.state);
}
const result = {
  ...candidate.bundle,
  sources: input.sources,
  course: saved.course,
  draft,
  reviewItems: R.directReviewItems(
    candidate,
    saved.course.courseId,
    "isolated-reader-transport-053",
    saved.course.updatedAt
  )
};
await fs.writeFile(join(priv, "reader-transport-candidate.json"), JSON.stringify(result) + "\n");
const report = {
  schema: "syllab.real-reader-transport/1",
  status: "PRESERVATION_PASS",
  completedReaderSources: completed.size,
  validatedClauses: draft.clauses.length,
  projectedFacts: result.facts.length,
  historicalClausesVisibleAsIssues: draft.clauses.length - result.facts.length,
  conditionalClauses: draft.clauses.filter((c) => c.conditions.length || c.exceptions.length)
    .length,
  modalities: [...new Set(draft.clauses.map((c) => c.modality))].sort(),
  bodyStateQualifiersAndEvidencePreserved: true,
  syntheticOwnership: true,
  newPaidDispatches: 0,
  semanticAcceptance: false,
  humanAcceptance: false,
  limitation:
    "New real reader clauses are validated and preserved, but ownership/applicability reconciliation is a deliberately synthetic transport fixture. Unfinished sources are unresolved. This is not a complete real CourseDraft, model Link PASS, holdout recall score or trusted adoption."
};
await fs.writeFile(
  join(pub, "REAL_READER_PRESERVATION.json"),
  JSON.stringify(report, null, 2) + "\n"
);
console.log(JSON.stringify(report));
