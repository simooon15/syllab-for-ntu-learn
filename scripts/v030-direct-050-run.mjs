/** Explicit isolated dispatch adapter. Default mode prepares only and cannot access a Key/network. */
import { readFile, writeFile, rename, mkdir, open, unlink } from "node:fs/promises";
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
  const requestId = opt("--id") ?? `050:${caseId}:candidate1`;
  if (!/^[\w:-]+$/.test(requestId)) throw Error("UNSAFE_REQUEST_ID");
  const priv = join(canonical, "evidence/private/goal-driven-050");
  const runtime = await import(pathToFileURL(join(priv, "candidate-runtime.mjs")).href);
  const read = async (p) => JSON.parse(await readFile(p, "utf8"));
  const dev = await read(
    join(canonical, "evidence/private/workflow-simplification-eval-047/original-sources.json")
  );
  const holdout = await read(join(priv, "holdout-sources-frozen.json"));
  const selected = new Set(
    (await read(join(priv, "holdout-order.json"))).slice(0, 12).map((x) => x.sourceId)
  );
  const cases = {
    "development-11": dev,
    "seeded-holdout-12": holdout.filter((s) => selected.has(s.sourceId)),
    "whole-holdout-106": holdout,
    "saved-course-117": [...dev, ...holdout]
  };
  if (!cases[caseId]) throw Error("UNKNOWN_CASE");
  const input = {
    course: { courseCode: "MA6081", courseName: "Fundamentals of Project Management - B" },
    sources: cases[caseId]
  };
  const prepared = runtime.prepareDirectCourse(input, requestId);
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
    if (approval.handoff !== "P2E-v0.3.0-2026-10-09-050" || approval.model !== "deepseek-flash")
      throw Error("AUTHORIZATION_SCOPE");
    runtime.reserveDirectDispatch([], approval, "authorization-preflight");
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw Error("BACKEND_ENVIRONMENT_KEY_REQUIRED");
    const runs = join(priv, "direct-runs");
    await mkdir(runs, { recursive: true });
    const ledgerPath = join(priv, "direct-paid-ledger.json");
    const atomicWrite = async (p, value) => {
      const temp = `${p}.${process.pid}.tmp`;
      await writeFile(temp, JSON.stringify(value, null, 2) + "\n", { mode: 0o600 });
      await rename(temp, p);
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
        await atomicWrite(ledgerPath, update(rows));
      } finally {
        await lock.close();
        await unlink(`${ledgerPath}.lock`);
      }
    };
    const port = {
      load: (id) => optionalRead(join(runs, `${id}.json`)),
      claim: async (run) => {
        try {
          await writeFile(join(runs, `${run.id}.json`), JSON.stringify(run), {
            flag: "wx",
            mode: 0o600
          });
          return true;
        } catch (e) {
          if (e.code === "EEXIST") return false;
          throw e;
        }
      },
      save: (run) => atomicWrite(join(runs, `${run.id}.json`), run),
      authorize: async (call) => {
        await withLedger((rows) =>
          runtime.reserveDirectDispatch(rows, approval, call.idempotencyKey)
        );
      },
      execute: async (call) => {
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
            body: runtime.serializeProviderRequest(call),
            signal: AbortSignal.timeout(30 * 60 * 1000)
          });
          if (!response.ok || !response.body) throw Error("PROVIDER_TRANSPORT_REJECTED");
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
              runtime.settleDirectDispatch(rows, call.idempotencyKey, usage)
            );
          return { raw, finishReason, streamDone, usage };
        } finally {
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
