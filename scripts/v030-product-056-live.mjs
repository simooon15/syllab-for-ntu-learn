/** P2E-056: core semantic organization of SAVED observations only; no course scan. */
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { logicalAuditScope, legacyAuditScope } from "./qa-logical-audit-scope.mjs";
const root = resolve(process.cwd()),
  priv = join(root, "evidence/private/gate5-remediation-056"),
  prior = join(root, "evidence/private/goal-driven-052/continuation-053"),
  prev = join(root, "evidence/private/goal-driven-052/continuation-054"),
  runs = join(priv, "product-real-1");
const dispatch = process.argv.includes("--dispatch"),
  oneBounded = process.argv.includes("--one-bounded"),
  sha = (x) => createHash("sha256").update(x).digest("hex"),
  read = async (p) => JSON.parse(await fs.readFile(p, "utf8"));
await fs.mkdir(runs, { recursive: true });
const auth = await read(join(prev, "authorization-054-prepaid.json"));
const baselineRows = await read(join(prev, "selective-real-1/ledger.json"));
assert.equal(auth.policy, "prepaid-wallet/1");
assert.equal(auth.model, "deepseek-flash");
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
const saveCandidateReceipt = async (path, receipt) => {
  const previous = await optional(path);
  if (previous) {
    assert.equal(previous.resumeProductHash, receipt.resumeProductHash, "CANDIDATE_BASE_COLLISION");
    assert.deepEqual(previous.product, receipt.product, "CANDIDATE_HASH_COLLISION");
    return; // Preserve the original successful capture/recovery provenance on replay.
  }
  await atomic(path, receipt);
};
await build({
  stdin: {
    contents:
      'export {ReasoningCycleGuard} from "./extension/src/v2/reasoning-cycle";export * from "./extension/src/v2/course-product";export {PRODUCT_AUDIT_POLICY,PRODUCT_AUDIT_BUDGET,planProductAudits,planOwnerAuditRecovery,planOwnerAuditComposition,auditOwnerRecovery,auditCourseProduct,auditProductTask,productKnowledgeIssues,captureProductRepair,captureReviewScopeCompletion,applyProductRepair,partitionProductRepairIssues,withNativeRiskSources} from "./extension/src/v2/product-audit";export * from "./extension/src/v2/direct-json";export * from "./extension/src/v2/selective-course";export * from "./extension/src/v2/direct-wallet-budget";export {serializeProviderRequest,providerConfigurationError} from "./extension/src/v2/provider-request";export {directReviewItems} from "./extension/src/v2/direct-review";',
    resolveDir: root
  },
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: join(priv, "runtime.mjs"),
  logLevel: "silent"
});
const R = await import(pathToFileURL(join(priv, "runtime.mjs")));
const tokenizerBytes = await fs.readFile(join(prior, "official-tokenizer.json"));
assert.equal(
  sha(tokenizerBytes),
  "c90dfa01249db1be4245780a052ede752e1361c612ac6d08e2bdada7d599476b"
);
const ledgerPath = join(runs, "ledger.json"),
  lockPath = join(runs, "run.lock"),
  lock = await fs.open(lockPath, "wx", 0o600);
let apiKey = dispatch ? process.env.DEEPSEEK_API_KEY : undefined;
delete process.env.DEEPSEEK_API_KEY;
const approval = {
  approvalReference: "P2E-v0.3.0-2026-10-11-056",
  policy: "prepaid-wallet/1",
  pricingBasis: "verified-cny-peak/1"
};
let rows = (await optional(ledgerPath)) ?? structuredClone(baselineRows),
  metrics = (await optional(join(runs, "metrics.json"))) ?? [],
  prepared = false;
let boundedDispatches = 0;
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
const executionTrace = [];
const carryArg = process.argv.find((x) => x.startsWith("--carry="));
const carryHash = carryArg?.slice("--carry=".length);
if (carryHash) assert(/^[a-f0-9]{64}$/.test(carryHash));
let carryUsed = false;
const resumeProductHash = process.argv
  .find((x) => x.startsWith("--resume-product="))
  ?.slice("--resume-product=".length);
if (resumeProductHash) assert(/^[a-f0-9]{64}$/.test(resumeProductHash));
const auditTaskRef = process.argv
  .find((x) => x.startsWith("--audit-task="))
  ?.slice("--audit-task=".length);
const planOnly = process.argv.includes("--plan-audits");
const auditOwnerRecoveryRef = process.argv
  .find((x) => x.startsWith("--audit-owner-recovery="))
  ?.slice("--audit-owner-recovery=".length);
assert(
  !auditOwnerRecoveryRef ||
    (!auditTaskRef && !planOnly && /^[a-f0-9]{16}$/.test(auditOwnerRecoveryRef)),
  "OWNER_RECOVERY_ENTRY_REQUIRED"
);
const recoveryOwnerTaskRef = process.argv
  .find((x) => x.startsWith("--plan-owner-recovery="))
  ?.slice("--plan-owner-recovery=".length);
assert(
  !recoveryOwnerTaskRef || (planOnly && !dispatch && /^[a-f0-9]{16}$/.test(recoveryOwnerTaskRef)),
  "OWNER_RECOVERY_PLAN_MUST_BE_ZERO_PAID"
);
const auditReasoning = process.argv
  .find((x) => x.startsWith("--audit-reasoning="))
  ?.slice("--audit-reasoning=".length);
assert(
  !auditReasoning || (auditTaskRef && ["low", "high"].includes(auditReasoning)),
  "REASONING_EXPERIMENT_REQUIRES_SINGLE_AUDIT_TASK"
);
const prepareKnowledgeRepair = process.argv.includes("--prepare-knowledge-repair");
const repairKnowledge = process.argv.includes("--repair-knowledge");
const completeRepairHash = process.argv
  .find((x) => x.startsWith("--complete-repair="))
  ?.slice("--complete-repair=".length);
if (completeRepairHash)
  assert(
    /^[a-f0-9]{64}$/.test(completeRepairHash) &&
      resumeProductHash &&
      !repairKnowledge &&
      !prepareKnowledgeRepair &&
      !auditTaskRef &&
      !planOnly,
    "CONTRACT_COMPLETION_REQUIRES_ISOLATED_SAVED_ENTRY"
  );
const repairOwner = process.argv
  .find((x) => x.startsWith("--repair-owner="))
  ?.slice("--repair-owner=".length);
const resumeRepairHash = process.argv
  .find((x) => x.startsWith("--resume-repair="))
  ?.slice("--resume-repair=".length);
if (resumeRepairHash)
  assert(/^[a-f0-9]{64}$/.test(resumeRepairHash) && resumeProductHash, "REPAIR_BASE_REQUIRED");
assert(
  !repairOwner || repairKnowledge || prepareKnowledgeRepair,
  "REPAIR_OWNER_REQUIRES_REPAIR_ENTRY"
);
const repairAuditTaskRef = process.argv
  .find((x) => x.startsWith("--repair-audit="))
  ?.slice("--repair-audit=".length);
if (repairAuditTaskRef)
  assert(
    /^[a-f0-9]{16}$/.test(repairAuditTaskRef) && (repairKnowledge || prepareKnowledgeRepair),
    "AUDIT_REPAIR_ENTRY_REQUIRED"
  );
const selectRepairIssues = async (packet, product) => {
  let all = R.productKnowledgeIssues(product);
  if (repairAuditTaskRef) {
    const receipt = await read(join(runs, "audit-task-" + sha(repairAuditTaskRef) + ".json"));
    assert(
      receipt.resumeProductHash === resumeProductHash &&
        receipt.semanticAuditComplete === true &&
        receipt.task.taskRef === repairAuditTaskRef,
      "AUDIT_REPAIR_RECEIPT_NOT_COMPLETE"
    );
    if (receipt.resumeRepairHash)
      assert.equal(receipt.resumeRepairHash, resumeRepairHash, "AUDIT_REPAIR_CANDIDATE_CHANGED");
    assert.deepEqual(
      product.propositions.filter((p) => receipt.task.propositionRefs.includes(p.propositionRef)),
      receipt.task.payload.propositions,
      "AUDIT_REPAIR_OWNED_PROPOSITIONS_CHANGED"
    );
    assert(
      receipt.issues.every(
        (i) =>
          i.propositionRefs.every((r) => receipt.task.propositionRefs.includes(r)) &&
          i.clauseRefs.every((r) => receipt.task.clauseRefs.includes(r))
      ),
      "AUDIT_REPAIR_ISSUES_OUTSIDE_CAPTURED_SCOPE"
    );
    all = receipt.issues;
  }
  if (!repairOwner) return all;
  const groups = R.partitionProductRepairIssues(packet, product, all);
  const selected = groups.filter((issues) =>
    issues.some((i) =>
      product.propositions.some(
        (p) => i.propositionRefs.includes(p.propositionRef) && p.ownerRef === repairOwner
      )
    )
  );
  assert.equal(selected.length, 1, "REPAIR_OWNER_NO_UNIQUE_CURRENT_SCOPE");
  return selected[0];
};
assert(!(planOnly && dispatch), "PLAN_ONLY_MUST_BE_ZERO_PAID");
assert(
  !prepareKnowledgeRepair || (!dispatch && !planOnly && !auditTaskRef),
  "REPAIR_PREPARATION_MUST_BE_ZERO_PAID"
);
assert(
  !repairKnowledge || (!prepareKnowledgeRepair && !planOnly && !auditTaskRef),
  "REPAIR_REQUIRES_INDEPENDENT_ENTRY"
);
assert(
  !auditOwnerRecoveryRef ||
    (!prepareKnowledgeRepair &&
      !repairKnowledge &&
      !completeRepairHash &&
      !repairAuditTaskRef &&
      !repairOwner),
  "OWNER_RECOVERY_REQUIRES_INDEPENDENT_ENTRY"
);
const scopeIdentity = logicalAuditScope;
const port = {
  load: async (key) => {
    const cached = await optional(join(runs, "cache-" + sha(key) + ".json"));
    if (cached !== undefined) return cached;
    if (carryHash && !carryUsed && /^course-product\/1:[a-f0-9]+$/.test(key)) {
      const captured = await read(join(runs, carryHash + ".json"));
      assert(
        captured.state === "captured" &&
          captured.finishReason === "stop" &&
          captured.streamDone &&
          captured.usage.usageKnown
      );
      carryUsed = true;
      return R.decodeDirectCapture(captured.raw).value;
    }
    return undefined;
  },
  save: async (key, value) => atomic(join(runs, "cache-" + sha(key) + ".json"), value),
  capture: async (call) => {
    // User-directed pause: old whole-course audit/regenerate operations cannot dispatch.
    if (
      call.promptVersion === "course-product/1:audit" ||
      call.promptVersion === "course-product/1:repair" ||
      call.promptVersion === "course-product/1:contract-repair"
    )
      throw Error("WHOLE_COURSE_PAID_RETRY_DISABLED");
    // A prompt/JSON/budget correction must not create a second dispatch for the same UNKNOWN scope.
    if (call.promptVersion.startsWith("bounded-product-audit/")) {
      const scope = JSON.parse(call.user);
      if (
        !!scope.compositionScope !== call.promptVersion.endsWith(":owner-composition") ||
        (scope.compositionScope &&
          scope.compositionScope.operation !== "owner-cross-group-composition/1")
      )
        throw Error("OWNER_COMPOSITION_OPERATION_MISMATCH");
      for (const identity of [scopeIdentity(scope), legacyAuditScope(scope)].filter(Boolean)) {
        if (await optional(join(runs, "unusable-scope-" + sha(identity) + ".json")))
          throw Error("PAID_UNVERIFIED_SCOPE_NO_REDISPATCH");
      }
      for (const name of await fs.readdir(runs)) {
        let capture;
        if (/^unusable-scope-[a-f0-9]{64}\.json$/.test(name)) {
          const frozen = await read(join(runs, name));
          if (typeof frozen.capture !== "string" || !/^[a-f0-9]{64}$/.test(frozen.capture))
            throw Error("UNKNOWN_AUDIT_SCOPE_UNREADABLE");
          capture = frozen.capture;
        } else if (/^[a-f0-9]{64}\.json$/.test(name)) {
          const previous = await read(join(runs, name));
          if (
            previous.state !== "failed-paid-unverified" ||
            !previous.stage?.startsWith("bounded-product-audit/")
          )
            continue;
          capture = name.slice(0, -5);
        } else continue;
        const request = await optional(join(runs, capture + ".request.json"));
        const message = request?.messages?.findLast((m) => m.role === "user");
        if (typeof message?.content !== "string") throw Error("UNKNOWN_AUDIT_SCOPE_UNREADABLE");
        const priorScope = JSON.parse(message.content);
        if (scopeIdentity(priorScope) === scopeIdentity(scope))
          throw Error("PAID_UNVERIFIED_SCOPE_NO_REDISPATCH");
      }
    }
    const configurationError = R.providerConfigurationError(call);
    if (configurationError) throw Error("PROVIDER_CONFIGURATION:" + configurationError);
    let body = R.serializeProviderRequest(call);
    let allocation;
    if (dispatch && process.argv.includes("--wallet-allocation")) {
      assert(
        call.promptVersion.startsWith(R.PRODUCT_AUDIT_POLICY + ":"),
        "ONLY_SCOPED_AUDIT_ALLOCATION"
      );
      const observed = await balance();
      const proof = {
        serializedRequest: body,
        tokenizerSHA256: sha(tokenizerBytes),
        verifiedAt: (await read(join(priv, "codec-verification.json"))).verifiedAt
      };
      allocation = R.prepaidOutputAllocation(
        rows,
        observed,
        R.verifiedTextInputCeiling(proof, call.maxTokens),
        auth.historicalUnknownIds,
        call.maxTokens
      );
      call = { ...call, maxTokens: allocation.outputTokens };
      body = R.serializeProviderRequest(call);
    }
    const hash = sha(body),
      id = "056:product:" + hash,
      file = join(runs, hash + ".json");
    const operationFile = join(runs, "invocation-" + sha(call.idempotencyKey) + ".json");
    const operation = await optional(operationFile);
    const old = await optional(operation ? join(runs, operation.bodySHA256 + ".json") : file);
    executionTrace.push({ bodySHA256: hash, stage: call.promptVersion, reused: !!old });
    if (old) {
      if (old.bodySHA256 !== (operation?.bodySHA256 ?? hash)) throw Error("CAPTURE_INPUT_MISMATCH");
      if (old.state !== "captured") throw Error("PAID_UNVERIFIED_NO_REDISPATCH");
      if (old.finishReason !== "stop" || !old.streamDone || !old.usage?.usageKnown)
        throw Error("CAPTURE_NOT_COMPLETE");
      return R.decodeDirectCapture(old.raw).value;
    }
    const proof = {
      serializedRequest: body,
      tokenizerSHA256: sha(tokenizerBytes),
      verifiedAt: (await read(join(priv, "codec-verification.json"))).verifiedAt
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
    const paused = await fs.stat(join(priv, "STOP_AFTER_CAPTURE")).then(
      () => true,
      () => false
    );
    const kind = call.promptVersion.slice(R.PRODUCT_AUDIT_POLICY.length + 1);
    const boundedAudit =
      call.promptVersion.startsWith(R.PRODUCT_AUDIT_POLICY + ":") &&
      ["source", "owner", "owner-composition", "bridge"].includes(kind);
    const boundedRepair = repairKnowledge && kind === "local-repair";
    const boundedCompletion = !!completeRepairHash && kind === "review-scope-completion";
    if (
      (oneBounded &&
        (boundedDispatches >= 1 ||
          !(boundedAudit || boundedRepair || boundedCompletion) ||
          call.maxTokens >
            (boundedRepair || boundedCompletion ? 384000 : R.PRODUCT_AUDIT_BUDGET[kind]))) ||
      (paused && !oneBounded)
    )
      throw Error("OPERATOR_PAUSED_AFTER_CAPTURE");
    const providerAvailable = await balance();
    // P2E-054 prepaid authority is fresh provider availability, not a new cumulative cap.
    // The wallet allocator/reservation still subtracts current UNKNOWN/in-flight reserves.
    // Do not subtract historical settled estimates again or treat the first observation as approval.
    const available = providerAvailable;
    const affordableOutput = R.prepaidOutputAllocation(
      rows,
      available,
      inputTokenCeiling,
      auth.historicalUnknownIds,
      call.maxTokens
    ).outputTokens;
    // A wallet cannot choose semantic capacity. Preserve the task's configured budget or stop.
    if (affordableOutput < call.maxTokens)
      throw Error("WALLET_BUDGET:TASK_OUTPUT_RESERVE_INSUFFICIENT");
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
    boundedDispatches++;
    const record = {
      id,
      state: "dispatching",
      bodySHA256: hash,
      stage: call.promptVersion,
      startedAt: new Date().toISOString(),
      inputTokenCeiling,
      outputLimit: call.maxTokens,
      ...(allocation ? { outputAllocation: allocation } : {})
    };
    await atomic(file, record);
    await atomic(operationFile, { bodySHA256: hash, idempotencyKey: call.idempotencyKey });
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
    let activeReader;
    const cycleGuard = call.reasoningCycleGuard ? new R.ReasoningCycleGuard() : undefined;
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
      if (!response.ok) {
        // Redacted provider diagnostics are evidence, not permission to retry an UNKNOWN.
        const diagnostic = await response.text();
        assert(!diagnostic.includes(apiKey), "SECRET_RESPONSE_FORBIDDEN");
        await atomic(join(runs, hash + ".rejection.json"), {
          httpStatus: response.status,
          responseText: diagnostic,
          bodySHA256: hash,
          at: new Date().toISOString()
        });
        throw Error("PROVIDER_TRANSPORT_REJECTED");
      }
      if (!response.body) throw Error("PROVIDER_TRANSPORT_REJECTED");
      const reader = response.body.getReader(),
        decoder = new TextDecoder();
      activeReader = reader;
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
          if (!raw && cycleGuard?.add(c.delta?.reasoning_content ?? ""))
            throw Error("PROVIDER_REASONING_CYCLE");
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
      return R.decodeDirectCapture(raw).value;
    } catch (e) {
      await activeReader?.cancel().catch(() => {});
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
let status = "FAILED",
  failure;
try {
  const saved = await read(join(prev, "selective-real-1/candidate-projected.json"));
  let inputDraft = saved.draft;
  if (resumeProductHash) {
    const captured = await read(join(runs, resumeProductHash + ".json"));
    assert(
      captured.bodySHA256 === resumeProductHash &&
        captured.state === "captured" &&
        captured.finishReason === "stop" &&
        captured.streamDone &&
        captured.usage.usageKnown,
      "RESUME_CAPTURE_NOT_FINAL"
    );
    const packet = R.courseProductPacket(inputDraft);
    inputDraft = {
      ...inputDraft,
      product: R.validateCourseProduct(
        packet.decode(R.decodeDirectCapture(captured.raw).value),
        inputDraft
      )
    };
    // No certificate is copied: this is an existing candidate awaiting all bounded audits.
  }
  if (resumeRepairHash) {
    const receipt = await read(join(runs, "knowledge-repaired-" + resumeRepairHash + ".json"));
    assert(
      receipt.resumeProductHash === resumeProductHash &&
        sha(JSON.stringify(receipt.product)) === resumeRepairHash,
      "REPAIR_CANDIDATE_HASH_OR_BASE_MISMATCH"
    );
    inputDraft = { ...inputDraft, product: R.validateCourseProduct(receipt.product, inputDraft) };
    delete inputDraft.productVerification;
  }
  if (completeRepairHash) {
    assert(resumeRepairHash && inputDraft.product, "COMPLETION_BASE_CANDIDATE_REQUIRED");
    const captured = await read(join(runs, completeRepairHash + ".json"));
    const request = await read(join(runs, completeRepairHash + ".request.json"));
    assert(
      captured.state === "captured" &&
        captured.finishReason === "stop" &&
        captured.streamDone &&
        captured.usage?.usageKnown &&
        captured.stage === R.PRODUCT_AUDIT_POLICY + ":local-repair" &&
        sha(JSON.stringify(request)) === completeRepairHash,
      "COMPLETION_CAPTURE_NOT_VERIFIED"
    );
    const originalContext = request.messages.findLast((m) => m.role === "user")?.content;
    assert(typeof originalContext === "string", "COMPLETION_CONTEXT_MISSING");
    const context = JSON.parse(originalContext);
    const wire = R.courseProductPacket(inputDraft);
    const product = wire.encode(inputDraft.product);
    assert.deepEqual(
      product.propositions.filter((p) => context.scope.propositionRefs.includes(p.propositionRef)),
      context.propositions,
      "COMPLETION_BASE_PROPOSITIONS_CHANGED"
    );
    for (const p of context.relatedPropositions)
      assert.deepEqual(
        product.propositions.find((v) => v.propositionRef === p.propositionRef),
        p,
        "COMPLETION_READONLY_CONTEXT_CHANGED"
      );
    const rawPatch = R.decodeDirectCapture(captured.raw).value;
    const observedOwners = wire.input.entities.map((e) => e.ref);
    assert(
      Array.isArray(rawPatch?.propositions) &&
        Array.isArray(rawPatch.entities) &&
        Array.isArray(rawPatch.context),
      "COMPLETION_PATCH_SHAPE_INVALID"
    );
    R.applyProductRepair(
      product,
      {
        ...context.scope,
        propositions: rawPatch.propositions,
        entities: rawPatch.entities,
        context: rawPatch.context
      },
      observedOwners
    );
    const completed = await R.captureReviewScopeCompletion(rawPatch, originalContext, port);
    const repaired = R.applyProductRepair(
      product,
      {
        ...context.scope,
        propositions: completed.propositions,
        entities: completed.entities,
        context: completed.context
      },
      observedOwners
    );
    const validated = R.validateCourseProduct(wire.decode({ product: repaired }), inputDraft);
    const receipt = {
      resumeProductHash,
      resumeRepairHash,
      completedRepairCapture: completeRepairHash,
      product: validated,
      courseComplete: false,
      semanticAcceptance: false,
      executionTrace
    };
    await saveCandidateReceipt(
      join(runs, "knowledge-repaired-" + sha(JSON.stringify(validated)) + ".json"),
      receipt
    );
    status = "CONTRACT_COMPLETED_CANDIDATE_NOT_SEMANTIC_ACCEPTANCE";
  } else if (repairKnowledge) {
    assert(inputDraft.product, "SAVED_PRODUCT_REQUIRED");
    const wire = R.courseProductPacket(inputDraft);
    const product = wire.encode(inputDraft.product);
    const issues = await selectRepairIssues(wire.input, product);
    assert(issues.length, "NO_KNOWLEDGE_DEFECT_TO_REPAIR");
    const repaired = await R.captureProductRepair(wire.input, product, issues, port);
    const validated = R.validateCourseProduct(wire.decode({ product: repaired }), inputDraft);
    const remaining = R.productKnowledgeIssues(validated);
    const receipt = {
      resumeProductHash,
      resumeRepairHash,
      repairOwner,
      repairAuditTaskRef,
      product: validated,
      issues,
      remainingLocalIssues: remaining,
      courseComplete: false,
      semanticAcceptance: false,
      executionTrace
    };
    await saveCandidateReceipt(
      join(runs, "knowledge-repaired-" + sha(JSON.stringify(validated)) + ".json"),
      receipt
    );
    status = remaining.length
      ? "SCOPED_REPAIR_STILL_INCONSISTENT_NOT_ACCEPTANCE"
      : "SCOPED_REPAIR_CANDIDATE_NOT_SEMANTIC_ACCEPTANCE";
  } else if (prepareKnowledgeRepair) {
    assert(inputDraft.product, "SAVED_PRODUCT_REQUIRED");
    const wire = R.courseProductPacket(inputDraft);
    const product = wire.encode(inputDraft.product);
    const issues = await selectRepairIssues(wire.input, product);
    assert(issues.length, "NO_KNOWLEDGE_DEFECT_TO_PREPARE");
    let prepared = false;
    try {
      await R.captureProductRepair(wire.input, product, issues, {
        load: async () => undefined,
        save: async () => {},
        capture: async (request) => {
          await atomic(
            join(
              runs,
              repairOwner
                ? "knowledge-repair-prepared-owner-" + sha(repairOwner) + ".json"
                : "knowledge-repair-prepared.json"
            ),
            {
              resumeProductHash,
              resumeRepairHash,
              repairOwner,
              repairAuditTaskRef,
              issues,
              request,
              physicalDispatches: 0,
              courseComplete: false
            }
          );
          prepared = true;
          throw Error("ZERO_PAID_REPAIR_PREPARED");
        }
      });
    } catch (error) {
      if (!prepared || error.message !== "ZERO_PAID_REPAIR_PREPARED") throw error;
    }
    status = "KNOWLEDGE_REPAIR_PREPARED_ZERO_PAID_NOT_SEMANTIC_ACCEPTANCE";
  } else if (auditTaskRef || auditOwnerRecoveryRef || planOnly) {
    assert(inputDraft.product, "SAVED_PRODUCT_REQUIRED");
    const wire = R.courseProductPacket(inputDraft);
    const product = wire.encode(inputDraft.product);
    if (planOnly) {
      const nativeAudit = R.withNativeRiskSources(wire.auditInput, saved.sources);
      const tasks = R.planProductAudits(nativeAudit, product);
      if (recoveryOwnerTaskRef) {
        const original = tasks.find(
          (t) => t.kind === "owner" && t.taskRef === recoveryOwnerTaskRef
        );
        assert(original, "OWNER_RECOVERY_TASK_NOT_IN_PLAN");
        const localTasks = R.planOwnerAuditRecovery(original);
        await atomic(join(runs, "owner-recovery-plan-" + recoveryOwnerTaskRef + ".json"), {
          policy: R.PRODUCT_AUDIT_POLICY,
          resumeProductHash,
          resumeRepairHash,
          originalTask: original,
          localTasks,
          compositionTask: R.planOwnerAuditComposition(original, R.PRODUCT_AUDIT),
          fullOwnerCompositionStillPending: true,
          fullSourceAndBridgePlanUnchanged: true,
          courseComplete: false,
          modelCalls: 0
        });
      } else {
        await atomic(join(runs, "full-native-risk-audit-plan.json"), {
          policy: R.PRODUCT_AUDIT_POLICY,
          nativeRiskInventory: nativeAudit.riskInventory,
          courseComplete: false,
          resumeProductHash,
          tasks
        });
      }
      status = "AUDIT_PLAN_ZERO_PAID_NOT_SEMANTIC_ACCEPTANCE";
    } else {
      const auditPacket = R.withNativeRiskSources(wire.auditInput, saved.sources);
      let result;
      if (auditOwnerRecoveryRef) {
        const original = R.planProductAudits(auditPacket, product).find(
          (t) => t.kind === "owner" && t.taskRef === auditOwnerRecoveryRef
        );
        assert(original, "OWNER_RECOVERY_TASK_NOT_IN_PLAN");
        result = await R.auditOwnerRecovery(original, port, R.PRODUCT_AUDIT, auditPacket);
      } else {
        result = await R.auditProductTask(
          R.withNativeRiskSources(wire.auditInput, saved.sources),
          product,
          auditTaskRef,
          port,
          R.PRODUCT_AUDIT,
          auditReasoning ? { reasoningEffort: auditReasoning } : {}
        );
      }
      const receiptName =
        (auditOwnerRecoveryRef ? "audit-owner-recovery-" : "audit-task-") +
        sha(auditOwnerRecoveryRef ?? auditTaskRef) +
        (auditReasoning ? "-reasoning-" + auditReasoning : "") +
        (result.semanticAuditComplete ? "" : "-local-consistency") +
        ".json";
      await atomic(join(runs, receiptName), {
        resumeProductHash,
        resumeRepairHash,
        ...(auditReasoning ? { controlledReasoningEffort: auditReasoning } : {}),
        ...result
      });
      status = result.semanticAuditComplete
        ? "INDEPENDENT_AUDIT_COMPLETE_NOT_COURSE_ACCEPTANCE"
        : result.issues.some((i) => i.auditTaskRef)
          ? "NATIVE_READ_RECOVERY_REQUIRED_NOT_COURSE_ACCEPTANCE"
          : "LOCAL_CANDIDATE_DEFECT_ZERO_PAID_NOT_SEMANTIC_AUDIT";
    }
  } else {
    const draft = await R.organizeCourseProduct(
      inputDraft,
      port,
      undefined,
      saved.sources,
      (previous, riskReads) =>
        R.runSelectiveCourse(
          {
            course: { courseCode: saved.course.courseCode, courseName: saved.course.courseName },
            sources: saved.sources,
            previous,
            completeScreening: true,
            riskReads
          },
          port
        )
    );
    const course = {
      ...saved.course,
      courseId: saved.course.courseId,
      semesterId: "isolated-056",
      established: false,
      currentRevision: 0,
      updatedAt: new Date().toISOString(),
      consecutiveCheckFailures: 0
    };
    const { candidate, output } = R.compileCourseDraft(draft, saved.sources, {
      course,
      workflowId: "isolated-056",
      exclusionKeys: new Set(),
      now: new Date().toISOString(),
      sources: new Map(
        saved.sources.map((s) => [s.sourceId, { sourceId: s.sourceId, title: s.title }])
      ),
      sourceRecords: saved.sources,
      observations: []
    });
    const reviewItems = R.directReviewItems(
      candidate,
      course.courseId,
      "isolated-056",
      new Date().toISOString()
    );
    await atomic(join(runs, "candidate.json"), {
      course,
      sources: saved.sources,
      draft,
      candidate,
      output,
      reviewItems
    });
    status = "CANDIDATE_READY_NOT_HUMAN_ACCEPTED";
  }
} catch (e) {
  failure = e.message;
  status = prepared ? "PREPARED_ZERO_PAID" : "FAILED";
  const last = executionTrace.at(-1);
  if (
    !prepared &&
    failure.startsWith("COURSE_PRODUCT:") &&
    last?.stage?.startsWith(R.PRODUCT_AUDIT_POLICY + ":")
  ) {
    const captured = await optional(join(runs, last.bodySHA256 + ".json"));
    const request = await optional(join(runs, last.bodySHA256 + ".request.json"));
    const content = request?.messages?.findLast((m) => m.role === "user")?.content;
    if (
      captured?.state === "captured" &&
      captured.usage?.usageKnown &&
      typeof content === "string"
    ) {
      const scope = scopeIdentity(JSON.parse(content));
      const path = join(runs, "unusable-scope-" + sha(scope) + ".json");
      if (!(await optional(path)))
        await atomic(path, {
          scope,
          capture: last.bodySHA256,
          failure,
          automaticRedispatch: false
        });
    }
  }
  if (!prepared) process.exitCode = 1;
} finally {
  apiKey = undefined;
  await atomic(join(runs, "status.json"), {
    status,
    failure,
    newCalls: rows.length - baselineRows.length,
    metrics
  });
  await lock.close();
  await fs.unlink(lockPath);
}
console.log(JSON.stringify({ status, failure }));
