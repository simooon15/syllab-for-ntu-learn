import { createHash } from "node:crypto";
const hash = (x) => createHash("sha256").update(x).digest("hex");
/** Explicit isolated dispatch adapter. Default mode prepares only and cannot access a Key/network. */
import { readFile, rename, mkdir, open, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
async function main() {
  const args = process.argv.slice(2);
  const canonical = resolve(args[0] ?? process.cwd());
  const opt = (name) => {
    const i = args.indexOf(name);
    return i < 0 ? undefined : args[i + 1];
  };
  const caseId = opt("--case") ?? "development-11";
  const requestId = opt("--id") ?? `052:${caseId}:candidate1`;
  if (!/^[\w:-]+$/.test(requestId)) throw Error("UNSAFE_REQUEST_ID");
  const baseline = join(canonical, "evidence/private/goal-driven-050");
  const priv = join(canonical, "evidence/private/goal-driven-052");
  const runtime = await import(pathToFileURL(join(priv, "candidate-runtime.mjs")).href);
  const read = async (p) => JSON.parse(await readFile(p, "utf8"));
  const dev = await read(
    join(canonical, "evidence/private/workflow-simplification-eval-047/original-sources.json")
  );
  const holdout = await read(join(baseline, "holdout-sources-frozen.json"));
  const selected = new Set(
    (await read(join(baseline, "holdout-order.json"))).slice(0, 12).map((x) => x.sourceId)
  );
  const cases = {
    "development-11": dev,
    "seeded-holdout-12": holdout.filter((s) => selected.has(s.sourceId)),
    "whole-holdout-106": holdout,
    "saved-course-117": [...dev, ...holdout]
  };
  if (opt("--source-plan")) {
    const plan = await read(resolve(opt("--source-plan")));
    const ids = plan.cases?.[caseId]?.sourceIds;
    if (!Array.isArray(ids) || !ids.length || ids.some((id) => typeof id !== "string"))
      throw Error("SOURCE_PLAN_SCOPE");
    const all = [...dev, ...holdout];
    if (ids.some((id) => !all.some((s) => s.sourceId === id)) || new Set(ids).size !== ids.length)
      throw Error("SOURCE_PLAN_SCOPE");
    cases[caseId] = ids.map((id) => all.find((s) => s.sourceId === id));
  }
  if (!cases[caseId]) throw Error("UNKNOWN_CASE");
  const input = opt("--input")
    ? await read(resolve(opt("--input")))
    : {
        course: { courseCode: "MA6081", courseName: "Fundamentals of Project Management - B" },
        sources: cases[caseId],
        outputLimit: 98304,
        ...(args.includes("--source-capture") ? { sourceCapture: true } : {}),
        ...(opt("--incremental")
          ? { incrementalSnapshot: await read(resolve(opt("--incremental"))) }
          : {}),
        ...(opt("--claims") ? { claimAudit: await read(resolve(opt("--claims"))) } : {}),
        ...(opt("--candidate")
          ? { candidateUnderReview: await read(resolve(opt("--candidate"))) }
          : {})
      };
  const prepared = runtime.prepareDirectCourse(input, requestId);
  if (
    !Number.isSafeInteger(prepared.call.maxTokens) ||
    prepared.call.maxTokens < 1 ||
    prepared.call.maxTokens > 98304
  )
    throw Error("OUTPUT_LIMIT_SCOPE");
  if (!args.includes("--dispatch")) {
    console.log(
      JSON.stringify({
        mode: "PREPARE_ONLY",
        caseId,
        sourceCount: input.sources.length,
        requestBytes: Buffer.byteLength(runtime.serializeProviderRequest(prepared.call)),
        paidDispatches: 0
      })
    );
  } else {
    // A file records a previously verified Human approval; it never substitutes for that approval.
    const authorizationPath = opt("--authorization");
    if (!authorizationPath) throw Error("AUTHORIZATION_REQUIRED");
    const approval = await read(resolve(authorizationPath));
    if (
      approval.handoff !== "P2E-v0.3.0-2026-10-10-052" ||
      approval.approvalReference !== "P2E-v0.3.0-2026-10-10-052/CNY25" ||
      approval.model !== "deepseek-flash" ||
      approval.maxCNY !== 25 ||
      approval.usdToCNY < 7.5 ||
      (approval.pricingBasis !== undefined &&
        (approval.pricingBasis !== "verified-cny-peak/1" ||
          approval.pricingURL !== "https://api-docs.deepseek.com/zh-cn/quick_start/pricing/" ||
          !Number.isFinite(Date.parse(approval.pricingVerifiedAt)) ||
          Date.now() - Date.parse(approval.pricingVerifiedAt) > 24 * 60 * 60 * 1000))
    )
      throw Error("AUTHORIZATION_SCOPE");

    const body = runtime.serializeProviderRequest(prepared.call);
    const reviewPath = opt("--privacy-review");
    if (!reviewPath) throw Error("PRIVACY_REVIEW_REQUIRED");
    const review = await read(resolve(reviewPath));
    if (
      review.bodySHA256 !== hash(body) ||
      review.status !== "APPROVED_FOR_PRIVATE_PROVIDER_DELIVERY"
    )
      throw Error("PRIVACY_REVIEW_MISMATCH");
    const apiKey = process.env.DEEPSEEK_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    if (apiKey && body.includes(apiKey)) throw Error("SECRET_BODY_FORBIDDEN");
    if (!apiKey) throw Error("BACKEND_ENVIRONMENT_KEY_REQUIRED");
    const runs = join(priv, "direct-runs");
    await mkdir(runs, { recursive: true });
    const ledgerPath = join(priv, "direct-paid-ledger.json");
    const atomicWrite = async (p, value) => {
      const temp = `${p}.${process.pid}.tmp`;
      const handle = await open(temp, "wx", 0o600);
      try {
        await handle.writeFile(JSON.stringify(value, null, 2) + "\n");
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temp, p);
      const dir = await open(resolve(p, ".."), "r");
      try {
        await dir.sync();
      } finally {
        await dir.close();
      }
    };
    const optionalRead = async (p) => {
      try {
        return await read(p);
      } catch (e) {
        if (e.code === "ENOENT") return undefined;
        throw e;
      }
    };
    const withLedger = async (update) => {
      const lock = await open(`${ledgerPath}.lock`, "wx", 0o600);
      try {
        const rows = (await optionalRead(ledgerPath)) ?? [];
        await atomicWrite(ledgerPath, await update(rows));
      } finally {
        await lock.close();
        await unlink(`${ledgerPath}.lock`);
      }
    };
    const port = {
      load: (id) => optionalRead(join(runs, `${id}.json`)),
      claim: async (run) => {
        try {
          const handle = await open(join(runs, `${run.id}.json`), "wx", 0o600);
          try {
            await handle.writeFile(JSON.stringify(run));
            await handle.sync();
          } finally {
            await handle.close();
          }
          return true;
        } catch (e) {
          if (e.code === "EEXIST") return false;
          throw e;
        }
      },
      save: (run) => atomicWrite(join(runs, `${run.id}.json`), run),
      authorize: async (call) => {
        await withLedger(async (rows) => {
          const response = await fetch("https://api.deepseek.com/user/balance", {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: AbortSignal.timeout(30000)
          });
          if (!response.ok) throw Error("BALANCE_UNAVAILABLE");
          const balance = await response.json();
          const cny = balance.balance_infos?.find((x) => x.currency === "CNY");
          if (!balance.is_available || !cny) throw Error("BALANCE_UNAVAILABLE");
          await atomicWrite(join(priv, `${call.idempotencyKey}-wallet.json`), {
            at: new Date().toISOString(),
            availableCNY: Number(cny.total_balance)
          });
          return runtime.reserveWalletDispatch(
            rows,
            approval,
            call.idempotencyKey,
            Number(cny.total_balance),
            call.maxTokens
          );
        });
      },
      execute: async (call) => {
        const requestBody = runtime.serializeProviderRequest(call);
        await atomicWrite(
          join(runs, `${call.idempotencyKey}.request.json`),
          JSON.parse(requestBody)
        );
        const metadata = {
          authority: approval.approvalReference,
          requestSHA256: hash(requestBody),
          startedAt: new Date().toISOString(),
          modelRequested: "deepseek-flash",
          physicalIntent: true
        };
        const metaPath = join(runs, `${call.idempotencyKey}.metadata.json`);
        await atomicWrite(metaPath, metadata);
        const ssePath = join(runs, `${call.idempotencyKey}.sse`);
        const stream = await open(ssePath, "wx", 0o600);
        let raw = "",
          finishReason = null,
          streamDone = false,
          usage = { inputTokens: 0, outputTokens: 0, usageKnown: false };
        try {
          // Exactly one physical fetch; errors/truncation remain recorded and never retry here.
          const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: requestBody,
            signal: AbortSignal.timeout(30 * 60 * 1000)
          });
          metadata.httpStatus = response.status;
          await atomicWrite(metaPath, metadata);
          if (!response.ok || !response.body) {
            await stream.write(await response.text());
            throw Error("PROVIDER_TRANSPORT_REJECTED");
          }
          const reader = response.body.getReader(),
            decoder = new TextDecoder();
          let buffer = "";
          const line = (data) => {
            if (!data.startsWith("data:")) return;
            const text = data.slice(5).trim();
            if (text === "[DONE]") {
              streamDone = true;
              return;
            }
            if (!text) return;
            const event = JSON.parse(text);
            if (event.model) metadata.modelReturned = event.model;
            for (const choice of event.choices ?? []) {
              if (typeof choice.delta?.content === "string") raw += choice.delta.content;
              if (choice.finish_reason) finishReason = choice.finish_reason;
            }
            if (event.usage) {
              const u = event.usage;
              usage = {
                inputTokens: u.prompt_tokens,
                outputTokens: u.completion_tokens,
                usageKnown:
                  Number.isSafeInteger(u.prompt_tokens) &&
                  Number.isSafeInteger(u.completion_tokens),
                ...(Number.isSafeInteger(u.prompt_cache_hit_tokens)
                  ? { cacheHitTokens: u.prompt_cache_hit_tokens }
                  : {}),
                ...(Number.isSafeInteger(u.prompt_cache_miss_tokens)
                  ? { cacheMissTokens: u.prompt_cache_miss_tokens }
                  : {}),
                ...(Number.isSafeInteger(u.completion_tokens_details?.reasoning_tokens)
                  ? { reasoningTokens: u.completion_tokens_details.reasoning_tokens }
                  : {})
              };
            }
          };
          while (true) {
            const part = await reader.read();
            if (part.done) break;
            await stream.write(part.value);
            buffer += decoder.decode(part.value, { stream: true });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? "";
            for (const text of lines) line(text);
          }
          buffer += decoder.decode();
          if (buffer) line(buffer);
          if (usage.usageKnown)
            await withLedger((rows) =>
              runtime.settleWalletDispatch(rows, call.idempotencyKey, approval, usage, {
                startedAt: metadata.startedAt,
                finishedAt: new Date().toISOString()
              })
            );
          Object.assign(metadata, {
            finishedAt: new Date().toISOString(),
            finishReason,
            streamDone,
            usage,
            outputSHA256: hash(raw)
          });
          await atomicWrite(metaPath, metadata);
          return { raw, finishReason, streamDone, usage };
        } catch (error) {
          metadata.transportFailure = {
            name: typeof error?.name === "string" ? error.name : "UnknownError",
            causeCode:
              typeof error?.cause?.code === "string" && /^[A-Z_]+$/.test(error.cause.code)
                ? error.cause.code
                : null,
            at: new Date().toISOString(),
            visibleOutputCharacters: raw.length,
            finishReason,
            streamDone
          };
          await atomicWrite(metaPath, metadata);
          throw error;
        } finally {
          await stream.sync();
          await stream.close();
        }
      }
    };
    const result = await runtime.runDirectCourse(input, requestId, port);
    console.log(
      JSON.stringify({
        requestId,
        state: result.run.state,
        problem: result.run.problem,
        semanticAcceptance: "NOT_EVALUATED",
        knownUsage: result.run.capture?.usage.usageKnown ?? false
      })
    );
  }
}
await main().catch((error) => {
  process.exitCode = 1;
  const code =
    typeof error?.message === "string" && /^[A-Z_]+$/.test(error.message)
      ? error.message
      : "PRIVATE_DIAGNOSTIC_RETAINED";
  console.error(JSON.stringify({ status: "FAILED", code }));
});
