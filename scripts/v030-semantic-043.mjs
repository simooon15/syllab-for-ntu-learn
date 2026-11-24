/** P2E-043: one durable dispatch; no retry, repair, continuation or live workflow write. */
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import { build } from "esbuild";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const authority = await readFile("docs/collaboration/CHATGPT_TO_CODEX_HANDOFF.md", "utf8");
assert(
  authority.includes("P2E-v0.3.0-2026-10-08-043") &&
    authority.includes("ONE_TARGETED_B2_PAID_DISPATCH_AUTHORIZED")
);
const privateDir = "evidence/private/v030-semantic-043",
  sharedDir = "artifacts/v0.3.0/semantic-043";
await mkdir(privateDir, { recursive: true });
await mkdir(sharedDir, { recursive: true });
await mkdir(".tmp", { recursive: true });
await build({
  stdin: {
    contents: `export {runSession} from './extension/src/v2/architecture-runner';
export {validateTaskB} from './extension/src/v2/ai-contracts';
export {validateOutputB2} from './extension/src/v2/assessment-output';
export {validateProvenance,scopeEvidenceIds} from './extension/src/v2/architecture-provenance';
export {materializeTaskB} from './extension/src/v2/materialize';
export {DeepSeekTransport} from './extension/src/v2/deepseek';
export {readProviderCompletion} from './extension/src/v2/deepseek-complete';`,
    resolveDir: process.cwd(),
    loader: "ts"
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: ".tmp/semantic-043-runtime.mjs",
  plugins: [
    {
      name: "private-no-qa-archive",
      setup(b) {
        b.onResolve({ filter: /qa-telemetry$/ }, () => ({
          path: resolve("extension/src/v2/qa-telemetry.disabled.ts")
        }));
      }
    }
  ]
});
const R = await import(pathToFileURL(resolve(".tmp/semantic-043-runtime.mjs")));
let apiKey = process.env.DEEPSEEK_API_KEY;
delete process.env.DEEPSEEK_API_KEY;
assert(typeof apiKey === "string" && apiKey.length, "MEMORY_ONLY_BYOK_REQUIRED");
const inputBytes = await readFile("evidence/private/v030-semantic-041/b2-real-input.json");
const input = JSON.parse(inputBytes);
const tables = JSON.parse(
  await readFile("evidence/private/v030-recovery-039/FINAL-ACTIVATION.json", "utf8")
).data["syllab-local"];
const sourceIds = new Set(input.suppliedNativeEvidence.map((s) => s.sourceId));
const scope = {
  sources: tables.sources.filter((s) => sourceIds.has(s.sourceId)),
  evidence: [],
  objects: {}
};
const sha = (b) => createHash("sha256").update(b).digest("hex");
const attempt = "validation-043:b2-real-20261009";
await writeFile(
  `${privateDir}/claim.json`,
  JSON.stringify({
    attempt,
    authoritySHA256: sha(authority),
    inputSHA256: sha(inputBytes),
    claimedAt: new Date().toISOString()
  }),
  { flag: "wx" }
);
await writeFile(`${privateDir}/input.json`, inputBytes, { flag: "wx" });
let dispatches = 0,
  session;
const ledger = {
  attempt,
  state: "prepared",
  physicalDispatches: 0,
  maxDispatches: 1,
  model: "deepseek-flash",
  prompt: "b2-session/6",
  contract: "assessment-output/2",
  inputSHA256: sha(inputBytes)
};
const persist = () => writeFile(`${sharedDir}/LEDGER.json`, JSON.stringify(ledger, null, 2) + "\n");
await persist();
const transport = new R.DeepSeekTransport(async (url, init) => {
  assert(url === "https://api.deepseek.com/chat/completions");
  assert(dispatches === 0, "P2E043_SECOND_DISPATCH_FORBIDDEN");
  assert(!String(init.body).includes(apiKey), "KEY_IN_REQUEST_BODY_FORBIDDEN");
  await writeFile(
    `${privateDir}/dispatch-1.json`,
    JSON.stringify({ attempt, startedAt: new Date().toISOString(), requestSHA256: sha(init.body) }),
    { flag: "wx" }
  );
  dispatches++;
  Object.assign(ledger, {
    state: "dispatched",
    physicalDispatches: dispatches,
    startedAt: new Date().toISOString(),
    requestSHA256: sha(init.body),
    requestBytes: Buffer.byteLength(init.body)
  });
  await writeFile(`${privateDir}/request.json`, init.body, { flag: "wx" });
  await persist();
  try {
    const response = await fetch(url, init);
    ledger.httpStatus = response.status;
    const raw = await response.clone().text();
    await writeFile(`${privateDir}/response.sse`, raw, { flag: "wx" });
    for (const line of raw.split("\n"))
      if (line.startsWith("data: ") && line !== "data: [DONE]") {
        try {
          const event = JSON.parse(line.slice(6));
          if (event.usage) ledger.usage = event.usage;
          if (event.choices?.[0]?.finish_reason)
            ledger.finishReason = event.choices[0].finish_reason;
        } catch {
          /* separators */
        }
      }
    ledger.finishedAt = new Date().toISOString();
    ledger.state = ledger.finishReason ? "generation-observed" : "paid-unverified";
    await persist();
    return response;
  } catch (e) {
    ledger.state = "paid-unverified";
    ledger.errorName = e.name;
    await persist();
    throw e;
  }
});
try {
  const result = await R.runSession(attempt, "B2", input, {
    semanticPolicy: "assessment-relevance/2",
    load: () => Promise.resolve(undefined),
    save: async (s) => {
      session = s;
      await writeFile(`${privateDir}/session.json`, JSON.stringify(s));
    },
    execute: async (call) => {
      assert(call.promptVersion === "b2-session/6");
      const payload = await transport.complete(apiKey, call);
      const completion = R.readProviderCompletion(payload);
      await writeFile(`${privateDir}/completion.json`, JSON.stringify(completion));
      assert(completion.ok && !completion.truncated, "P2E043_INVALID_OR_TRUNCATED_JSON_NO_RETRY");
      return { call, value: completion.value, consumesApi: true };
    },
    resolve: () => {
      throw Error("P2E043_EXTRA_READ_NOT_AUTHORIZED");
    },
    resolveTransport: () => {
      throw Error("P2E043_TRANSPORT_CONTINUATION_NOT_AUTHORIZED");
    },
    validateFinal: (value) => {
      const b = R.validateTaskB(value, sourceIds);
      R.validateOutputB2(value, b, input.group);
      R.validateProvenance(value, scope);
    }
  });
  await writeFile(`${privateDir}/result.json`, JSON.stringify(result), { flag: "wx" });
  const qualified = R.scopeEvidenceIds(result, tables.courses[0].courseId, scope);
  const refs = R.validateProvenance(qualified, scope);
  const projected = R.materializeTaskB(
    R.validateTaskB(qualified, sourceIds),
    {
      strictOutput: true,
      course: tables.courses[0],
      workflowId: attempt,
      sources: new Map(
        scope.sources.map((s) => [s.sourceId, { sourceId: s.sourceId, title: s.title }])
      ),
      sourceRecords: scope.sources,
      evidence: refs,
      exclusionKeys: new Set(),
      now: new Date().toISOString()
    },
    new Map(),
    new Set()
  );
  await writeFile(`${privateDir}/projection.json`, JSON.stringify(projected), { flag: "wx" });
  const summary = {
    attempt,
    contract: "PASS",
    semantic: "PENDING_EVIDENCE_REVIEW",
    physicalDispatches: dispatches,
    effectiveRounds: session.effectiveRounds,
    resultSHA256: sha(JSON.stringify(result)),
    requirementsReturned: result.canonicalAssessmentProposals[0].requirements.length,
    requirementsProjected: projected.bundle.facts.filter((f) => f.field === "requirement").length,
    kind: projected.assessments[0].kind,
    structuralRelationships: result.structuralRelationships.length
  };
  await writeFile(`${sharedDir}/RESULT.json`, JSON.stringify(summary, null, 2) + "\n");
  console.log(JSON.stringify(summary));
} catch (e) {
  await writeFile(
    `${privateDir}/failure.json`,
    JSON.stringify({ name: e.name, message: e.message, stack: e.stack })
  );
  const code =
    /^(ASSESSMENT_OUTPUT:[A-Z_]+|PROVENANCE_[A-Z_]+|P2E043_[A-Z_]+|AI_CONTRACT:[a-z_]+)/.exec(
      e.message
    )?.[0] ?? e.name;
  const summary = {
    attempt,
    contract: "FAIL",
    semantic: "NOT_VERIFIED",
    physicalDispatches: dispatches,
    remaining: 1 - dispatches,
    errorCode: code,
    privateEvidencePreserved: true
  };
  await writeFile(`${sharedDir}/RESULT.json`, JSON.stringify(summary, null, 2) + "\n");
  console.log(JSON.stringify(summary));
  process.exitCode = 1;
} finally {
  apiKey = undefined;
}
