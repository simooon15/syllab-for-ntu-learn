/** P2E-054 prepaid-wallet continuation. Saved sources/captures, no scan or formal profile writes. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
const root = resolve(process.cwd()),
  priv = join(root, "evidence/private/goal-driven-052/continuation-054"),
  prior = join(root, "evidence/private/goal-driven-052/continuation-053"),
  pub = join(root, "artifacts/v0.3.0/goal-driven-054");
const projected = process.argv.includes("--project"),
  dispatch = process.argv.includes("--dispatch"),
  incremental =
    process.argv.includes("--incremental") || process.argv.includes("--projected-incremental"),
  read = async (p) => JSON.parse(await fs.readFile(p, "utf8")),
  sha = (x) => createHash("sha256").update(x).digest("hex");
const variantArg = process.argv.find((a) => a.startsWith("--incremental-variant="));
const incrementalVariant = variantArg ? variantArg.slice("--incremental-variant=".length) : "";
assert(["", "current-auto"].includes(incrementalVariant));
const incrementalSuffix = incrementalVariant ? "-" + incrementalVariant : "";
const auth = await read(join(priv, "authorization-054-prepaid.json"));
assert.equal(auth.policy, "prepaid-wallet/1");
assert.equal(auth.model, "deepseek-flash");
const originalLedgerPath = join(root, "evidence/private/goal-driven-052/direct-paid-ledger.json"),
  originalLedgerBytes = await fs.readFile(originalLedgerPath),
  originalLedger = JSON.parse(originalLedgerBytes),
  inherited = originalLedger.filter((r) => !r.verifiedUsage);
assert.equal(originalLedger.length, 43);
assert.equal(inherited.length, 2);
await build({
  stdin: {
    contents:
      'export * from "./extension/src/v2/selective-course";export * from "./extension/src/v2/course-projection";export * from "./extension/src/v2/direct-wallet-budget";export {serializeProviderRequest} from "./extension/src/v2/provider-request";export {directReviewItems} from "./extension/src/v2/direct-review";',
    resolveDir: root
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: join(priv, "live-runtime.mjs"),
  logLevel: "silent"
});
const R = await import(pathToFileURL(join(priv, "live-runtime.mjs")));
const tokenizerBytes = await fs.readFile(join(prior, "official-tokenizer.json")),
  codec = JSON.parse(tokenizerBytes);
assert.equal(
  sha(tokenizerBytes),
  "c90dfa01249db1be4245780a052ede752e1361c612ac6d08e2bdada7d599476b"
);
assert.equal(codec.model.type, "BPE");
assert.deepEqual(codec.normalizer, { type: "Sequence", normalizers: [] });
assert.equal(codec.pre_tokenizer.pretokenizers.at(-1).add_prefix_space, false);
const input = await read(
    incremental
      ? join(
          priv,
          process.argv.includes("--projected-incremental")
            ? "engine-projected-incremental" + incrementalSuffix + "-input.json"
            : "engine-incremental-input.json"
        )
      : join(
          root,
          "evidence/private/goal-driven-052/052:production:direct:isolated-native-052c:final-exact-clause-v8-input.json"
        )
  ),
  saved = await read(join(prior, "real-replay-candidate.json"));
if (incremental)
  assert.equal(input.scenarioLabel, "CONTROLLED_SOURCE_CHANGE_NOT_OBSERVED_NTU_UPDATE");
const priorRuns = join(prior, "selective-real-1");
const priorRows = await read(join(priorRuns, "ledger.json"));
const priorLedgerSHA = sha(await fs.readFile(join(priorRuns, "ledger.json")));
const baselineRows = [
  ...originalLedger,
  ...priorRows.filter((r) => !inherited.some((old) => old.id === r.id))
];
assert.equal(baselineRows.length, 61);
assert.deepEqual(
  auth.historicalUnknownIds,
  inherited.map((r) => r.id)
);
const baselineIds = new Set(baselineRows.map((r) => r.id));
const runs = join(priv, "selective-real-1");
await fs.mkdir(runs, { recursive: true });
const atomic = async (p, v) => {
  const temp = p + ".tmp";
  const h = await fs.open(temp, "w", 0o600);
  try {
    await h.writeFile(JSON.stringify(v, null, 2) + "\n");
    await h.sync();
  } finally {
    await h.close();
  }
  await fs.rename(temp, p);
};
const optional = async (p) => {
  try {
    return await read(p);
  } catch (e) {
    if (e.code === "ENOENT") return undefined;
    throw e;
  }
};
const ledgerPath = join(runs, "ledger.json"),
  lockPath = join(runs, "run.lock");
const lock = await fs.open(lockPath, "wx", 0o600);
let apiKey = dispatch ? process.env.DEEPSEEK_API_KEY : undefined;
delete process.env.DEEPSEEK_API_KEY;
const approval = {
  approvalReference: auth.approvalReference,
  policy: "prepaid-wallet/1",
  pricingBasis: "verified-cny-peak/1"
};
let rows = (await optional(ledgerPath)) ?? structuredClone(baselineRows),
  metrics = (await optional(join(runs, "metrics.json"))) ?? [];
const balance = async () => {
  assert(apiKey, "BACKEND_ENVIRONMENT_KEY_REQUIRED");
  const r = await fetch("https://api.deepseek.com/user/balance", {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(30000)
  });
  if (!r.ok) throw Error("BALANCE_UNAVAILABLE");
  const b = await r.json(),
    c = b.balance_infos?.find((x) => x.currency === "CNY");
  if (!b.is_available || !c) throw Error("BALANCE_UNAVAILABLE");
  const n = Number(c.total_balance);
  assert(Number.isFinite(n) && n >= 0);
  await atomic(join(runs, "wallet-latest.json"), { at: new Date().toISOString(), availableCNY: n });
  return n;
};
let prepared = false;
const executionTrace = [];
const executionTraceName = "execution-trace-" + Date.now() + ".json";
const port = {
  load: async (key) => {
    if (
      process.argv.includes("--cold-projection-validation") &&
      key.startsWith("course-projection-cache:")
    )
      return undefined;
    const value =
      (await optional(join(runs, "cache-" + sha(key) + ".json"))) ??
      optional(join(priorRuns, "cache-" + sha(key) + ".json"));
    const resolved = await value;
    executionTrace.push({
      cacheKey: key,
      hit: resolved !== undefined,
      valueDigest: resolved === undefined ? undefined : sha(JSON.stringify(resolved))
    });
    return resolved;
  },
  save: async (key, value) => {
    const target = join(runs, "cache-" + sha(key) + ".json");
    if (
      process.argv.includes("--cold-projection-validation") &&
      key.startsWith("course-projection-cache:")
    ) {
      const existing = await optional(target);
      if (existing !== undefined) {
        const archived = join(runs, "cold-validation-baseline-cache-" + sha(key) + ".json");
        if ((await optional(archived)) === undefined) await atomic(archived, existing);
      }
    }
    await atomic(target, value);
  },
  capture: async (call) => {
    // Whole-course Link has not been output-bounded by reader measurements. Use the verified provider maximum.
    if (
      [":link", ":link-patch", ":history-patch", ":link-update", ":compare-delta"].some((stage) =>
        call.promptVersion.endsWith(stage)
      )
    )
      call = { ...call, maxTokens: 384000 };
    const body = R.serializeProviderRequest(call),
      hash = sha(body),
      id = "054:selective-real-1:" + hash,
      file = join(runs, hash + ".json"),
      old = (await optional(file)) ?? (await optional(join(priorRuns, hash + ".json")));
    executionTrace.push({ bodySHA256: hash, stage: call.promptVersion, reused: !!old });
    if (old) {
      if (old.bodySHA256 !== hash) throw Error("CAPTURE_INPUT_MISMATCH");
      if (old.state !== "captured") throw Error("PAID_UNVERIFIED_NO_REDISPATCH");
      if (old.finishReason !== "stop" || !old.streamDone || !old.usage?.usageKnown)
        throw Error("CAPTURE_NOT_COMPLETE");
      return JSON.parse(old.raw);
    }
    const proof = {
      serializedRequest: body,
      tokenizerSHA256: sha(tokenizerBytes),
      verifiedAt: auth.codecVerifiedAt
    };
    const inputTokenCeiling = R.verifiedTextInputCeiling(proof, call.maxTokens);
    if (!dispatch) {
      await atomic(join(runs, "prepared-first-request.json"), {
        call,
        bodySHA256: hash,
        inputTokenCeiling
      });
      prepared = true;
      throw Error("PREPARE_ONLY");
    }
    assert(apiKey && !body.includes(apiKey), "SECRET_BODY_FORBIDDEN");
    const available = await balance();
    rows = R.reservePrepaidWalletDispatch(
      rows,
      approval,
      id,
      { availableCNY: available, observedAt: new Date().toISOString() },
      call.maxTokens,
      auth.historicalUnknownIds,
      proof
    );
    await atomic(ledgerPath, rows);
    const record = {
      id,
      state: "dispatching",
      bodySHA256: hash,
      stage: call.promptVersion,
      startedAt: new Date().toISOString(),
      inputTokenCeiling,
      outputLimit: call.maxTokens
    };
    await atomic(file, record);
    await atomic(join(runs, hash + ".request.json"), JSON.parse(body));
    console.log(
      JSON.stringify({
        state: "DISPATCHING",
        stage: call.promptVersion,
        reservedCNY: rows.at(-1).reservedCNY,
        newPhysicalCalls: rows.length - baselineRows.length
      })
    );
    const sse = await fs.open(join(runs, hash + ".sse"), "wx", 0o600);
    let raw = "",
      finishReason = null,
      streamDone = false,
      usage = { usageKnown: false, inputTokens: 0, outputTokens: 0 };
    try {
      const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body,
        signal: AbortSignal.timeout(1800000)
      });
      record.httpStatus = response.status;
      if (!response.ok || !response.body) throw Error("PROVIDER_TRANSPORT_REJECTED");
      const reader = response.body.getReader(),
        decoder = new TextDecoder();
      let buffer = "";
      const frame = (line) => {
        if (!line.startsWith("data:")) return;
        const data = line.slice(5).trim();
        if (data === "[DONE]") {
          streamDone = true;
          return;
        }
        if (!data) return;
        const f = JSON.parse(data);
        if (f.model) record.modelReturned = f.model;
        if (f.id) record.providerRequestId = f.id;
        if (f.created) record.providerCreated = f.created;
        for (const c of f.choices ?? []) {
          raw += c.delta?.content ?? "";
          finishReason = c.finish_reason ?? finishReason;
        }
        if (f.usage) {
          const u = f.usage;
          usage = {
            usageKnown:
              Number.isSafeInteger(u.prompt_tokens) && Number.isSafeInteger(u.completion_tokens),
            inputTokens: u.prompt_tokens,
            outputTokens: u.completion_tokens,
            cacheHitTokens: u.prompt_cache_hit_tokens,
            cacheMissTokens: u.prompt_cache_miss_tokens,
            reasoningTokens: u.completion_tokens_details?.reasoning_tokens
          };
        }
      };
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        await sse.write(part.value);
        buffer += decoder.decode(part.value, { stream: true });
        const lines = buffer.split(/\r?\n/);
        buffer = lines.pop() ?? "";
        for (const line of lines) frame(line);
      }
      buffer += decoder.decode();
      if (buffer) frame(buffer);
      Object.assign(record, {
        raw,
        finishReason,
        streamDone,
        usage,
        finishedAt: new Date().toISOString()
      });
      assert(!raw.includes(apiKey), "SECRET_OUTPUT_FORBIDDEN");
      if (usage.usageKnown) {
        assert(usage.inputTokens <= inputTokenCeiling, "INPUT_PROOF_EXCEEDED");
        rows = R.settleWalletDispatch(rows, id, approval, usage, {
          startedAt: record.startedAt,
          finishedAt: record.finishedAt
        });
        await atomic(ledgerPath, rows);
      }
      record.state = "captured";
      await atomic(file, record);
      metrics.push({
        stage: call.promptVersion,
        bodyBytes: Buffer.byteLength(body),
        inputTokenCeiling,
        outputLimit: call.maxTokens,
        usage,
        chargedCNY: rows.find((r) => r.id === id)?.chargedCNY,
        seconds: (Date.parse(record.finishedAt) - Date.parse(record.startedAt)) / 1000
      });
      await atomic(join(runs, "metrics.json"), metrics);
      console.log(
        JSON.stringify({
          state: "CAPTURED",
          stage: record.stage,
          finishReason,
          streamDone,
          usage,
          chargedCNY: rows.find((r) => r.id === id)?.chargedCNY
        })
      );
      if (finishReason !== "stop" || !streamDone || !usage.usageKnown)
        throw Error("MODEL_COMPLETION_NOT_FINAL");
      return JSON.parse(raw);
    } catch (e) {
      if (record.state !== "captured") {
        record.state = "failed-paid-unverified";
        record.finishedAt = new Date().toISOString();
        record.failure =
          typeof e.message === "string" && /^[A-Z_:]+$/.test(e.message)
            ? e.message
            : "PRIVATE_TRANSPORT_FAILURE";
        await atomic(file, record);
      }
      throw e;
    } finally {
      await sse.sync();
      await sse.close();
    }
  }
};
let status = "UNKNOWN",
  failure;
try {
  let draft = await R.runSelectiveCourse(
    {
      course: input.course,
      sources: input.sources,
      outputLimit: 32768,
      previous: input.previous,
      currentContext: input.currentContext,
      completeScreening: process.argv.includes("--screen")
    },
    port
  );
  let projectionCarry;
  const carryArg = process.argv.find((a) => a.startsWith("--project-carry="));
  if (carryArg) {
    const hash = carryArg.slice("--project-carry=".length);
    assert(/^[a-f0-9]{64}$/.test(hash));
    const captured = await read(join(runs, hash + ".json"));
    assert.equal(captured.state, "captured");
    assert.equal(captured.finishReason, "stop");
    assert.equal(captured.streamDone, true);
    assert.equal(captured.stage, "selective-draft/2:project");
    projectionCarry = JSON.parse(captured.raw);
  }
  for (const patchCarryArg of process.argv.filter((a) => a.startsWith("--project-patch-carry="))) {
    assert(projectionCarry);
    const hash = patchCarryArg.slice("--project-patch-carry=".length);
    assert(/^[a-f0-9]{64}$/.test(hash));
    const captured = await read(join(runs, hash + ".json"));
    assert.equal(captured.state, "captured");
    assert.equal(captured.finishReason, "stop");
    assert.equal(captured.streamDone, true);
    assert.equal(captured.stage, "selective-draft/2:project-patch");
    const req = await read(join(runs, hash + ".request.json")),
      payload = JSON.parse(req.messages[1].content);
    projectionCarry = {
      schema: R.SELECTIVE_COURSE_SCHEMA,
      projection: R.mergeCourseProjectionPatch(
        projectionCarry.projection,
        JSON.parse(captured.raw).projection,
        payload.metadataViolations.map((v) => v.assertionRef),
        payload.missingClauseRefs ?? []
      )
    };
  }
  // Recover a saved complete JSON response with omitted scope as provisional carry only.
  // It still goes through full coverage/provenance validation and explicit AI missing-ref repair.
  for (const partialArg of process.argv.filter((a) =>
    a.startsWith("--project-partial-patch-carry=")
  )) {
    assert(projectionCarry);
    const hash = partialArg.slice("--project-partial-patch-carry=".length);
    assert(/^[a-f0-9]{64}$/.test(hash));
    const captured = await read(join(runs, hash + ".json"));
    assert.equal(captured.state, "captured");
    assert.equal(captured.finishReason, "stop");
    assert.equal(captured.streamDone, true);
    assert.equal(captured.stage, "selective-draft/2:project-patch");
    const req = await read(join(runs, hash + ".request.json")),
      payload = JSON.parse(req.messages[1].content),
      partial = JSON.parse(captured.raw).projection;
    const target = new Set(payload.metadataViolations.map((v) => v.assertionRef));
    const allowed = new Set(payload.allowedClauseRefs);
    const supplied = [...partial.assertions, ...partial.context].flatMap(
      (a) => a.clauseRefs ?? [a.clauseRef]
    );
    assert(supplied.every((id) => allowed.has(id)));
    assert.equal(new Set(supplied).size, supplied.length);
    assert(supplied.length < allowed.size, "NOT_AN_OMISSION_RECOVERY");
    projectionCarry = {
      schema: R.SELECTIVE_COURSE_SCHEMA,
      projection: {
        assertions: [
          ...projectionCarry.projection.assertions.filter((a) => !target.has(a.assertionRef)),
          ...partial.assertions
        ],
        context: partial.context
      }
    };
  }
  for (const carryFileArg of process.argv.filter((a) =>
    a.startsWith("--unvalidated-projection-file=")
  )) {
    const name = carryFileArg.slice("--unvalidated-projection-file=".length);
    assert(/^cold-merged-[0-9]+-unvalidated\.json$/.test(name));
    projectionCarry = await read(join(priv, name));
    assert.equal(projectionCarry.schema, R.SELECTIVE_COURSE_SCHEMA);
  }
  if (projected)
    draft = await R.projectCourseDraft(
      draft,
      port,
      input.previous?.projection,
      input.currentContext
        ? {
            assessments: input.currentContext.assessments,
            constraints: input.currentContext.constraints,
            decisions: input.currentContext.decisions
          }
        : undefined,
      undefined,
      projectionCarry,
      input.previous
    );
  const reviewRefs = process.argv
    .filter((a) => a.startsWith("--review-projection="))
    .map((a) => a.slice("--review-projection=".length));
  if (reviewRefs.length) {
    assert(projected);
    draft = await R.reviewCourseProjectionGroups(draft, port, reviewRefs);
    const context = input.currentContext
      ? {
          assessments: input.currentContext.assessments,
          constraints: input.currentContext.constraints,
          decisions: input.currentContext.decisions
        }
      : undefined;
    await port.save(R.courseProjectionCacheKey(draft, input.previous?.projection, context), {
      projection: draft.projection,
      semanticVerification: draft.projectionVerification
    });
  }
  const compiled = R.compileCourseDraft(
    draft,
    input.sources,
    {
      course: input.localCourse ?? saved.course,
      workflowId: input.workflow?.workflowId ?? "isolated-selective-real-054",
      sources: new Map(
        input.sources.map((s) => [s.sourceId, { sourceId: s.sourceId, title: s.title }])
      ),
      exclusionKeys: new Set(),
      now: new Date().toISOString()
    },
    new Set(input.currentContext?.assessments.map((a) => a.assessmentId)),
    new Set(input.currentContext?.constraints.map((c) => c.constraintId))
  );
  const candidate = {
    ...compiled.candidate.bundle,
    sources: input.sources,
    course: input.localCourse ?? saved.course,
    draft,
    reviewItems: R.directReviewItems(
      compiled.candidate,
      saved.course.courseId,
      "isolated-selective-real-054",
      new Date().toISOString()
    )
  };
  if (incremental)
    candidate.incremental = await R.compareCourseDraft(
      input.currentContext.facts,
      compiled.candidate.bundle.facts,
      [...input.currentEvidence, ...compiled.candidate.bundle.evidence],
      input.sources,
      draft,
      port,
      undefined,
      {
        assessments: input.currentContext.assessments,
        constraints: input.currentContext.constraints,
        decisions: input.currentContext.decisions
      },
      input.coverage
    );
  await atomic(
    join(
      runs,
      projected
        ? incremental
          ? "candidate-projected-incremental" + incrementalSuffix + ".json"
          : process.argv.includes("--cold-projection-validation")
            ? "candidate-projected-cold-validation.json"
            : "candidate-projected.json"
        : incremental
          ? "candidate-incremental.json"
          : "candidate.json"
    ),
    candidate
  );
  status = "REAL_CANDIDATE_COMPILED_SEMANTICS_PENDING";
} catch (e) {
  const diagnostic = String(e?.message ?? e)
    .replaceAll(apiKey ?? "\u0000", "[credential redacted]")
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "[credential redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]");
  await atomic(join(priv, "diagnostic-" + Date.now() + ".json"), { diagnostic });
  failure =
    typeof e.message === "string" && /^[A-Z_:]+$/.test(e.message)
      ? e.message
      : "PRIVATE_DIAGNOSTIC_RETAINED";
  status = prepared
    ? "PREPARE_ONLY"
    : dispatch
      ? "STOPPED_WITH_PRIVATE_RECOVERY"
      : "PREPARE_FAILED";
} finally {
  apiKey = undefined;
  assert.equal(
    sha(await fs.readFile(originalLedgerPath)),
    sha(originalLedgerBytes),
    "ORIGINAL_LEDGER_CHANGED"
  );
  assert.equal(
    sha(await fs.readFile(join(priorRuns, "ledger.json"))),
    priorLedgerSHA,
    "PRIOR_LEDGER_CHANGED"
  );
  const newRows = rows.filter((r) => !baselineIds.has(r.id));
  const report = {
    schema: "syllab.selective-real/1",
    validationScope: incremental ? "CONTROLLED_INCREMENTAL" : "INITIAL",
    status,
    failure,
    sourceCount: input.sources.length,
    newPhysicalCalls: newRows.length,
    knownNewCalls: newRows.filter((r) => r.verifiedUsage).length,
    unknownNewCalls: newRows.filter((r) => !r.verifiedUsage).length,
    newChargedAndReservedCNY: newRows.reduce((n, r) => n + r.chargedCNY, 0),
    authorizationPolicy: "prepaid-wallet/1",
    oldCapsSupersededForFutureDispatch: true,
    priorKnownNewCalls: 18,
    priorKnownNewFeeCNY: 1.08370752,
    historicalUnreconciledUnknownCNY: inherited.reduce((n, r) => n + r.chargedCNY, 0),
    originalLedgerUnchanged: true,
    courseRescans: 0,
    originalProfileOpened: false,
    trustedAdoptions: 0,
    metrics,
    newModelSemanticAcceptance: false
  };
  await atomic(join(pub, "REAL_MODEL_PROGRESS.json"), report);
  await atomic(join(runs, executionTraceName), {
    status,
    failure,
    incremental,
    incrementalVariant,
    coldProjection: process.argv.includes("--cold-projection-validation"),
    entries: executionTrace
  });
  console.log(
    JSON.stringify({
      status,
      failure,
      newPhysicalCalls: report.newPhysicalCalls,
      newChargedAndReservedCNY: report.newChargedAndReservedCNY
    })
  );
  await lock.close();
  await fs.unlink(lockPath);
}
