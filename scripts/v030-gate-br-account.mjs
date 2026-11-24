import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { summary } from "./v030-gate-b-usage.mjs";
const dir = "artifacts/v0.3.0/gate-br-028/",
  priv = "evidence/private/v030-gate-br-028/";
const before = JSON.parse(await readFile(priv + "BEFORE.json")),
  after = JSON.parse(await readFile(priv + "R1-FINAL.json"));
const wid = "wf_ebdef177ba1a33bbc520b577";
const saved = after.tables.appMetadata.find((x) => x.key === `task-b-ledger:${wid}`).value.ledger;
const streams = after.streams.filter((x) => x.logicalUnitId?.startsWith(`task-b:${wid}:P2E-028:`));
const pricing = JSON.parse(await readFile(dir + "R1-PRICING-SNAPSHOT.json"));
let usage = summary(streams, wid, pricing, "Gate B-R R1 B2 only", after.tables.appMetadata);
try {
  const frozen = JSON.parse(await readFile(dir + "R1-DEEPSEEK-USAGE.json"));
  if (JSON.stringify(frozen.invocations) !== JSON.stringify(usage.invocations))
    throw Error("FROZEN_USAGE_DIVERGED");
  usage = frozen;
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  await writeFile(dir + "R1-DEEPSEEK-USAGE.json", JSON.stringify(usage, null, 2) + "\n", {
    flag: "wx"
  });
}
const digest = (v) => createHash("sha256").update(JSON.stringify(v)).digest("hex");
const exactCoursesPreserved = digest(before.tables.courses) === digest(after.tables.courses);
const protectedCourse = (rows) => rows.map(({ updatedAt: _updatedAt, ...row }) => row);
const conserved = Object.fromEntries(
  [
    "sources",
    "sourceObservations",
    "history",
    "facts",
    "evidence",
    "assessments",
    "constraints",
    "reviewItems"
  ].map((n) => [n, digest(before.tables[n]) === digest(after.tables[n])])
);
conserved.courseStateExcludingEnrollmentRefreshTimestamp =
  digest(protectedCourse(before.tables.courses)) === digest(protectedCourse(after.tables.courses));
const previousA = before.tables.aiRuns.filter((x) => x.task !== "task-b");
const oldWorkflows = before.tables.workflows.filter((x) => x.workflowId !== wid);
const proof = {
  workflowId: wid,
  gate: "Gate B-R",
  status: "FAIL",
  reason: "R1 canonical=0 / identity=0; mandatory STOP, B1 paid validation not run",
  required: saved.requiredRefs.length,
  processed: saved.processedRefs.length,
  pending: saved.pendingRefs.length,
  unresolved: saved.unresolved.length,
  canonical: saved.final.result.canonicalAssessmentProposals.length,
  identity: saved.final.result.identityResolutions.length,
  candidates: saved.candidates.length,
  stopReason: saved.stopReason,
  logicalValidationAttempts: 1,
  physicalInvocations: streams.length,
  continuations: Math.max(0, streams.length - 1),
  wallMs:
    Date.parse(after.tables.workflows.find((x) => x.workflowId === wid).updatedAt) -
    Date.parse(saved.physical[0].at),
  providerLatencyMs: streams.map((x) => Date.parse(x.finishedAt) - Date.parse(x.startedAt)),
  finishReasons: streams.map((x) => x.finishReason),
  usage: usage.total,
  stateConservation: conserved,
  exactCoursesPreserved,
  courseTimestampDelta:
    "Only updatedAt changed on all five courses during QA reload/enrollment refresh; all other fields including established/currentRevision unchanged.",
  allPreviousNonBRunRecordsPreserved: previousA.every(
    (x) => digest(x) === digest(after.tables.aiRuns.find((y) => y.aiRunId === x.aiRunId))
  ),
  otherWorkflowsPreserved: oldWorkflows.every(
    (x) => digest(x) === digest(after.tables.workflows.find((y) => y.workflowId === x.workflowId))
  ),
  providerInFlight: after.provider.active.length,
  oldLedgerArchived: !!after.tables.appMetadata.find(
    (x) => x.key === `b-validation-history:P2E-028:${wid}`
  ),
  historicalGateBCostUSD: 1.225572492,
  remediationCostUSD: usage.total.estimatedCostUSD,
  cumulativeCostUSD:
    typeof usage.total.estimatedCostUSD === "number"
      ? 1.225572492 + usage.total.estimatedCostUSD
      : "Unavailable",
  B1Validation: "NOT RUN",
  B1Discovery: "NOT RUN",
  B1DeltaProcessing: "NOT RUN",
  initialReviewUntrusted: !after.tables.courses.find((x) => x.courseId === "_2707110_1")
    .established,
  repairBoundary:
    "Post-run prefix alias correction is offline; active R1 runtime was not reloaded/mutated; repaired prefixes are provisional and never claimed as final canonical/identity.",
  streams: streams.map((x) => ({
    streamId: x.streamId,
    inputSHA256: digest(x.user),
    outputSHA256: digest(x.content),
    reasoningCharacters: x.reasoning.length,
    outputCharacters: x.content.length
  }))
};
await writeFile(dir + "R1-RESULT.json", JSON.stringify(proof, null, 2) + "\n");
if (
  !Object.values(conserved).every(Boolean) ||
  !proof.allPreviousNonBRunRecordsPreserved ||
  !proof.otherWorkflowsPreserved ||
  proof.providerInFlight ||
  !proof.initialReviewUntrusted
)
  throw Error("STATE_CONSERVATION_FAILED");
console.log({
  status: proof.status,
  wallMs: proof.wallMs,
  canonical: proof.canonical,
  identity: proof.identity,
  unresolved: proof.unresolved,
  physical: proof.physicalInvocations,
  cost: proof.remediationCostUSD,
  cumulative: proof.cumulativeCostUSD,
  conservation: proof.stateConservation
});
