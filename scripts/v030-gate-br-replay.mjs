import { build } from "esbuild";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const dir = "artifacts/v0.3.0/gate-br-028";
await mkdir(dir, { recursive: true });
await build({
  stdin: {
    contents:
      "export{checkpointTaskB}from'./extension/src/v2/task-b-grounding';export{applyBResponse,newBLedger,assertBLedgerAccounting}from'./extension/src/v2/task-b-ledger';",
    resolveDir: process.cwd(),
    loader: "ts"
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".tmp/v030-028-after.mjs"
});

const after = await import(pathToFileURL(resolve(".tmp/v030-028-after.mjs")));
const hash = (v) =>
  createHash("sha256")
    .update(typeof v === "string" ? v : JSON.stringify(v))
    .digest("hex");
const count = (rows, key) =>
  Object.fromEntries(
    [...new Set(rows.map(key))].map((k) => [k, rows.filter((r) => key(r) === k).length])
  );
const results = [];
for (const [label, file, wid] of [
  ["B1", "B1-REVIEW.json", "wf_26455133f0631385cbf5b56c"],
  ["B2", "B2-FINAL-REVIEW.json", "wf_ebdef177ba1a33bbc520b577"]
]) {
  const bytes = await readFile(`evidence/private/v030-gate-b-027/${file}`, "utf8"),
    data = JSON.parse(bytes);
  const saved = data.tables.appMetadata.find((x) => x.key === `task-b-ledger:${wid}`).value.ledger;
  const sources = new Set(saved.suppliedEvidence.map((x) => x.sourceId));
  const rawChecks = after.checkpointTaskB(
    { schema: saved.final.schema, items: saved.candidates },
    saved.suppliedEvidence,
    sources,
    new Set(saved.requiredRefs),
    saved.at
  );
  const rows = rawChecks.items.map((item) => {
    const raw = saved.candidates.find((c) => c.itemId === item.itemId);
    const err = item.error;
    const category = !err
      ? "VALID_RAW_SEMANTIC_ITEM"
      : err === "B_FIELD_SHAPE"
        ? "FIELD_SHAPE / ENVELOPE"
        : err.includes("DEPENDENCY")
          ? "DEPENDENCY_MODEL_FAILURE"
          : err.includes("EVIDENCE")
            ? "GROUNDING / EVIDENCE"
            : "PROMPT_CONTRACT_MISALIGNMENT";
    return {
      itemId: item.itemId,
      category: item.category,
      error: err ?? null,
      rootCause: category,
      inputRefHashes: item.inputRefs.map(hash),
      affectedRefs: item.inputRefs.length,
      rawHash: hash(raw),
      semanticPresent: !!raw?.payload,
      zeroModelRepair: !err
        ? "already valid; closure sibling isolation"
        : "no semantic repair; preserve diagnostic and correct future contract"
    };
  });
  const replays = {
    before: {
      required: saved.requiredRefs.length,
      processed: saved.processedRefs.length,
      pending: saved.pendingRefs.length,
      unresolved: saved.unresolved.length,
      canonical: saved.final.result.canonicalAssessmentProposals.length,
      identity: saved.final.result.identityResolutions.length,
      verified: saved.final.items.filter((x) => x.status === "verified").length,
      dispositionErrors: count(saved.dispositionErrors, (x) => x.error),
      failed: count(
        saved.final.items.filter((x) => x.error),
        (x) => x.error
      ),
      physicalResponses: saved.physical.length,
      basis: "immutable original saved ledger"
    }
  };
  for (const [name, impl] of [["after", after]]) {
    const first = JSON.parse(saved.physical[0].request);
    let l = impl.newBLedger(
      saved.attemptId,
      saved.requiredRefs,
      saved.parts.map((p) => p.text).join(""),
      saved.suppliedEvidence,
      saved.at
    );
    l.sourceRefs = saved.sourceRefs;
    l.parts = saved.parts.map((p) => ({ ...p, delivered: false }));
    l.unresolved = first.unresolved ?? [];
    l.processedRefs = first.closedRefs ?? [];
    l.pendingRefs = l.requiredRefs.filter(
      (r) => !l.unresolved.some((x) => x.ref === r) && !l.processedRefs.includes(r)
    );
    for (const physical of saved.physical) {
      l = impl.applyBResponse(l, physical.response, sources, saved.at);
      impl.assertBLedgerAccounting(l);
    }
    replays[name] = {
      required: l.requiredRefs.length,
      processed: l.processedRefs.length,
      pending: l.pendingRefs.length,
      unresolved: l.unresolved.length,
      canonical: l.final.result.canonicalAssessmentProposals.length,
      identity: l.final.result.identityResolutions.length,
      verified: l.final.items.filter((x) => x.status === "verified").length,
      dispositionErrors: count(l.dispositionErrors, (x) => x.error),
      failed: count(
        l.final.items.filter((x) => x.error),
        (x) => x.error
      ),
      physicalResponses: saved.physical.length
    };
  }
  const physicalEvidence = data.streams
    .filter((x) => x.workflowId === wid && x.stage === "task-b")
    .map((x) => ({
      streamId: x.streamId,
      inputHash: hash(x.user),
      outputHash: hash(x.content),
      outputBytes: Buffer.byteLength(x.content),
      finishReason: x.finishReason
    }));
  results.push({
    label,
    snapshotHash: hash(bytes),
    candidateCounts: count(saved.candidates, (x) => x.category),
    rows,
    diagnosticAxes: {
      MODEL_SEMANTIC_MISSING: {
        status: "not a blanket root cause",
        canonicalCandidates: saved.candidates.filter(
          (x) => x.category === "canonicalAssessmentProposals"
        ).length,
        identityCandidates: saved.candidates.filter((x) => x.category === "identityResolutions")
          .length
      },
      PROMPT_CONTRACT_MISALIGNMENT: {
        overlaps: ["FIELD_SHAPE / ENVELOPE", "DEPENDENCY_MODEL_FAILURE"],
        status:
          "prompt lacks typed enum/array examples and prerequisite direction; future contract remediation only"
      },
      FIELD_SHAPE_ENVELOPE: {
        items: rows.filter((x) => x.rootCause === "FIELD_SHAPE / ENVELOPE").length,
        zeroModelSemanticRepair: false
      },
      DEPENDENCY_MODEL_FAILURE: {
        items: rows.filter((x) => x.rootCause === "DEPENDENCY_MODEL_FAILURE").length,
        zeroModelEdgeDeletion: false
      },
      GROUNDING_EVIDENCE: {
        items: rows.filter((x) => x.rootCause === "GROUNDING / EVIDENCE").length,
        zeroModelGuessing: false
      },
      CONTINUATION_LEDGER: {
        physicalResponsesReplayed: saved.physical.length,
        completeInputOutputHashes: physicalEvidence.length,
        status: "coverage/accounting conserved; sibling retirement diagnosed separately"
      },
      VALIDATOR_FALSE_REJECTION: {
        beforeIdentity: replays.before.identity,
        afterIdentity: replays.after.identity,
        affectedRefs: replays.after.processed - replays.before.processed,
        explicitPartialRows: replays.after.dispositionErrors.B_DISPOSITION_PARTIAL_ITEM_SUPPORT ?? 0
      },
      REAL_SEMANTIC_UNRESOLVED: {
        modelAuthoredIssueCandidates: saved.candidates.filter(
          (x) => x.category === "unresolvedIssues"
        ).length,
        status:
          "not locally adjudicated; includes issues dependent on rejected canonical, not all evidence-insufficient judgments"
      }
    },
    failureCounts: count(
      rows.filter((x) => x.error),
      (x) => x.rootCause
    ),
    affectedRefs: Object.fromEntries(
      [...new Set(rows.filter((x) => x.error).map((x) => x.rootCause))].map((k) => [
        k,
        new Set(rows.filter((x) => x.error && x.rootCause === k).flatMap((x) => x.inputRefHashes))
          .size
      ])
    ),
    replays,
    physicalEvidence,
    semanticMissing: false,
    semanticMissingBasis:
      "Raw paid output contains grounded identity judgments and canonical proposals; rejection is not blanket model semantic absence. Individual unresolved meaning requires Product review, not local inference.",
    limits:
      "No raw semantic edits, no evidence aliases added, no dependency edges deleted, no model calls, no native state writes."
  });
  if (
    replays.after.required !==
    replays.after.processed + replays.after.pending + replays.after.unresolved
  )
    throw Error("ACCOUNTING_FAILED");
  if (replays.after.identity === 0) throw Error("INDEPENDENT_IDENTITY_REPLAY_FAILED");
}
await writeFile(
  `${dir}/ROOT-CAUSE-MATRIX.json`,
  JSON.stringify({ gate: "P2E-028", results }, null, 2) + "\n"
);
console.log(
  JSON.stringify(
    results.map(({ label, failureCounts, replays }) => ({ label, failureCounts, replays })),
    null,
    2
  )
);
