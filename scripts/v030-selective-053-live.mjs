/** Explicit Human ¥7 continuation; private saved sources, no scan or original profile writes. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
const root = resolve(process.cwd()),
  priv = join(root, "evidence/private/goal-driven-052/continuation-053"),
  pub = join(root, "artifacts/v0.3.0/goal-driven-053");
const dispatch = process.argv.includes("--dispatch"),
  read = async (p) => JSON.parse(await fs.readFile(p, "utf8")),
  sha = (x) => createHash("sha256").update(x).digest("hex");
const auth = await read(join(priv, "authorization-053-human-7.json"));
assert.equal(auth.newPaidCapCNY, 7);
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
      'export * from "./extension/src/v2/selective-course";export * from "./extension/src/v2/direct-wallet-budget";export {serializeProviderRequest} from "./extension/src/v2/provider-request";export {directReviewItems} from "./extension/src/v2/direct-review";',
    resolveDir: root
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: join(priv, "live-runtime.mjs"),
  logLevel: "silent"
});
const R = await import(pathToFileURL(join(priv, "live-runtime.mjs")));
const tokenizerBytes = await fs.readFile(join(priv, "official-tokenizer.json")),
  codec = JSON.parse(tokenizerBytes);
assert.equal(
  sha(tokenizerBytes),
  "c90dfa01249db1be4245780a052ede752e1361c612ac6d08e2bdada7d599476b"
);
assert.equal(codec.model.type, "BPE");
assert.deepEqual(codec.normalizer, { type: "Sequence", normalizers: [] });
assert.equal(codec.pre_tokenizer.pretokenizers.at(-1).add_prefix_space, false);
const input = await read(
    join(
      root,
      "evidence/private/goal-driven-052/052:production:direct:isolated-native-052c:final-exact-clause-v8-input.json"
    )
  ),
  saved = await read(join(priv, "real-replay-candidate.json"));
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
  maxCNY: 7,
  usdToCNY: 7.5,
  initialAvailableCNY: 7.03,
  pricingBasis: "verified-cny-peak/1"
};
let rows = (await optional(ledgerPath)) ?? structuredClone(inherited),
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
const port = {
  load: (key) => optional(join(runs, "cache-" + sha(key) + ".json")),
  save: (key, value) => atomic(join(runs, "cache-" + sha(key) + ".json"), value),
  capture: async (call) => {
    const body = R.serializeProviderRequest(call),
      hash = sha(body),
      id = "053:selective-real-1:" + hash,
      file = join(runs, hash + ".json"),
      old = await optional(file);
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
    // Human's new ¥7 cap does not erase P2E-052's original cumulative ¥25 accounting.
    // Retain all historical known charges and UNKNOWN rows exactly once, including
    // account debits since the original ¥25.16 wallet observation.
    R.reserveWalletDispatch(
      [...originalLedger, ...rows.filter((r) => !inherited.some((old) => old.id === r.id))],
      {
        ...approval,
        approvalReference: "P2E-052 original cumulative CNY25",
        maxCNY: 25,
        initialAvailableCNY: 25.16
      },
      id,
      available,
      call.maxTokens,
      proof
    );
    rows = R.reserveWalletDispatch(rows, approval, id, available, call.maxTokens, proof);
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
        newPhysicalCalls: rows.length - inherited.length
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
  const draft = await R.runSelectiveCourse(
    { course: input.course, sources: input.sources, outputLimit: 32768 },
    port
  );
  const compiled = R.compileCourseDraft(draft, input.sources, {
    course: saved.course,
    workflowId: "isolated-selective-real-053",
    sources: new Map(
      input.sources.map((s) => [s.sourceId, { sourceId: s.sourceId, title: s.title }])
    ),
    exclusionKeys: new Set(),
    now: new Date().toISOString()
  });
  const candidate = {
    ...compiled.candidate.bundle,
    sources: input.sources,
    course: saved.course,
    draft,
    reviewItems: R.directReviewItems(
      compiled.candidate,
      saved.course.courseId,
      "isolated-selective-real-053",
      new Date().toISOString()
    )
  };
  await atomic(join(runs, "candidate.json"), candidate);
  status = "REAL_CANDIDATE_COMPILED_SEMANTICS_PENDING";
} catch (e) {
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
  const newRows = rows.filter((r) => !inherited.some((o) => o.id === r.id));
  const report = {
    schema: "syllab.selective-real/1",
    status,
    failure,
    sourceCount: input.sources.length,
    newPhysicalCalls: newRows.length,
    knownNewCalls: newRows.filter((r) => r.verifiedUsage).length,
    unknownNewCalls: newRows.filter((r) => !r.verifiedUsage).length,
    newChargedAndReservedCNY: newRows.reduce((n, r) => n + r.chargedCNY, 0),
    newAuthorizationCapCNY: 7,
    inheritedUnknownReservedCNY: inherited.reduce((n, r) => n + r.chargedCNY, 0),
    originalLedgerUnchanged: true,
    courseRescans: 0,
    originalProfileOpened: false,
    trustedAdoptions: 0,
    metrics,
    newModelSemanticAcceptance: false
  };
  await atomic(join(pub, "REAL_MODEL_PROGRESS.json"), report);
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
