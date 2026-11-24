import { ReasoningCycleGuard } from "./reasoning-cycle";
import { requestBoundary, serializeProviderRequest } from "./provider-request";
import { runtimeSpan } from "./runtime-metrics";
import { activityHub, type ActivityScope } from "./activity";
import {
  qaProviderStreamDelta,
  qaProviderStreamEnd,
  qaProviderStreamStart,
  qaProviderStreamResult,
  qaTrace
} from "./qa-telemetry";

declare const __SYLLAB_E2E_FIXTURES__: boolean;

export type DeepSeekFailureCode =
  "AI_AUTH" | "AI_RATE_LIMIT" | "AI_PROVIDER" | "NETWORK_TRANSIENT" | "AI_CONTRACT";

export class DeepSeekFailure extends Error {
  constructor(
    readonly code: DeepSeekFailureCode,
    readonly retryable: boolean,
    message: string,
    readonly retryAfterMs = 0,
    readonly layer?: "browser-request" | "network" | "timeout" | "abort" | "provider" | "schema",
    readonly preGenerationBoundary = false
  ) {
    super(message);
  }
}

export interface DeepSeekRequest {
  /** Audits may stop exact repeated reasoning checkpoints; not an output capacity cap. */
  reasoningCycleGuard?: true;
  reasoningEffort?: "low" | "high";
  /** Optional API max_tokens is omitted for this current Task B path; no owned output cap. */
  providerRequestCompatibility?: "provider-default";
  system: string;
  user: string;
  maxTokens: number;
  activityScope?: ActivityScope;
  signal?: AbortSignal;
  telemetry?: { logicalUnitId: string; task: string; attemptType: string };
  visualParts?: Array<{ locator: string; dataUrl: string }>;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
}

const ENDPOINT = "https://api.deepseek.com/chat/completions";
/** Models list: a free read that answers "is this key good?" without spending anything. */
const MODELS_ENDPOINT = "https://api.deepseek.com/v1/models";
/** A provider request must eventually release the workflow lease and enter existing retry logic. */
/** Live observations only: unknown stall boundaries never become guessed deadlines. */
const providerProgress = new Map<
  string,
  { logicalUnitId: string; startedAt: number; lastProgressAt: number; bytes: number }
>();
export const activeProviderProgress = () =>
  [...providerProgress.values()].map((row) => ({ ...row }));

function qaStreamingEnabled(): boolean {
  return typeof __SYLLAB_E2E_FIXTURES__ !== "undefined" && __SYLLAB_E2E_FIXTURES__;
}

/** Reassembles DeepSeek's documented SSE chat stream into the normal completion payload. */
export async function readDeepSeekStream(
  response: Response,
  streamId: string,
  detectReasoningCycle = false
): Promise<unknown> {
  if (!response.body) {
    throw new DeepSeekFailure("AI_PROVIDER", true, "DeepSeek returned an empty response stream");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  const streamState = { finishReason: null as string | null };
  let usage: unknown;
  const cycle = detectReasoningCycle ? new ReasoningCycleGuard() : undefined;

  const consume = (block: string): boolean => {
    for (const line of block.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return true;
      if (!data) continue;
      const chunk = JSON.parse(data) as unknown;
      if (typeof chunk !== "object" || chunk === null) continue;
      const record = chunk as Record<string, unknown>;
      if (record.usage !== undefined && record.usage !== null) {
        usage = record.usage;
        qaProviderStreamResult(streamId, { providerUsage: usage });
      }
      const choices = record.choices;
      if (!Array.isArray(choices) || choices.length === 0) continue;
      const choice = choices[0] as unknown;
      if (typeof choice !== "object" || choice === null) continue;
      const choiceRecord = choice as Record<string, unknown>;
      if (typeof choiceRecord.finish_reason === "string") {
        streamState.finishReason = choiceRecord.finish_reason;
        qaProviderStreamResult(streamId, { finishReason: choiceRecord.finish_reason });
      }
      const delta = choiceRecord.delta;
      if (typeof delta !== "object" || delta === null) continue;
      const deltaRecord = delta as Record<string, unknown>;
      if (typeof deltaRecord.reasoning_content === "string" && deltaRecord.reasoning_content) {
        activityHub.delta(streamId, deltaRecord.reasoning_content, "reasoning");
        qaProviderStreamDelta(streamId, "reasoning", deltaRecord.reasoning_content);
        if (!content && cycle?.add(deltaRecord.reasoning_content)) {
          qaTrace("qa.provider-reasoning-cycle", {
            streamId,
            answerCharacters: 0,
            usageKnown: usage !== undefined
          });
          throw new DeepSeekFailure(
            "AI_PROVIDER",
            false,
            "PROVIDER_REASONING_CYCLE",
            0,
            "provider"
          );
        }
      }
      if (typeof deltaRecord.content === "string" && deltaRecord.content) {
        content += deltaRecord.content;
        activityHub.delta(streamId, deltaRecord.content, "content");
        qaProviderStreamDelta(streamId, "content", deltaRecord.content);
      }
    }
    return false;
  };

  let done = false;
  try {
    while (!done) {
      const next = await reader.read();
      const progress = providerProgress.get(streamId);
      if (progress && next.value) {
        progress.bytes += next.value.byteLength;
        progress.lastProgressAt = Date.now();
      }
      buffer += decoder.decode(next.value, { stream: !next.done });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() ?? "";
      for (const block of blocks) {
        if (consume(block)) {
          done = true;
          break;
        }
      }
      if (next.done) {
        if (buffer.trim()) consume(buffer);
        break;
      }
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
  if (streamState.finishReason === null)
    throw new DeepSeekFailure(
      "NETWORK_TRANSIENT",
      true,
      "Provider stream ended before completion",
      0,
      "network"
    );
  return {
    choices: [
      {
        message: { content },
        finish_reason: streamState.finishReason
      }
    ],
    ...(usage === undefined ? {} : { usage })
  };
}

/**
 * The reasons Chrome gives when it refuses to *build* a request, as opposed to failing to send one.
 *
 * The difference is who can fix it. A refused connection is a network problem and may pass on the
 * next try; a request the browser would not construct will never pass, and telling the reader
 * "DeepSeek could not be reached" sends them to check their network for something that is not there.
 * Both surface as a `TypeError`, so the message is what separates them.
 */
const REQUEST_REFUSED = /Illegal invocation|Invalid value|Failed to read the 'headers'/i;

/**
 * One provider call, and the one place that turns a thrown fetch into a coded failure.
 *
 * `fetch` is stored bound to its own global. It has to be: `fetch` is an operation on the global
 * object, and calling it as `this.fetcher(...)` makes `this` the transport instead — Chrome answers
 * `TypeError: Illegal invocation` without ever opening a connection. That is not a hypothetical:
 * it is what this transport did, so every real model call failed while every test passed, because
 * tests hand it a plain function and a plain function does not care what `this` is.
 * (Gate 3 finding F1; see `docs/versions/v0.2.0/GATE3_FINDINGS_v0.2.0.md`.)
 */
export class DeepSeekTransport {
  constructor(
    private readonly fetcher: typeof fetch = fetch.bind(globalThis),
    private readonly endpoint = ENDPOINT
  ) {}

  async complete(apiKey: string, request: DeepSeekRequest): Promise<unknown> {
    let response: Response;
    const parts = request.visualParts ?? [];
    const boundary = requestBoundary(request);
    if (boundary.reason)
      throw new DeepSeekFailure("AI_CONTRACT", false, boundary.reason, 0, "browser-request", true);
    qaTrace("qa.provider-request-boundary", { bytes: boundary.bytes, images: parts.length });
    const streamId = crypto.randomUUID();
    providerProgress.set(streamId, {
      logicalUnitId: request.telemetry?.logicalUnitId ?? streamId,
      startedAt: Date.now(),
      lastProgressAt: Date.now(),
      bytes: 0
    });
    const releaseSpan = runtimeSpan(
      "ai",
      request.activityScope?.workflowId ?? "unscoped",
      streamId,
      request.activityScope?.packageUnitId
    );
    const releaseRequest = () => {
      const progress = providerProgress.get(streamId);
      if (progress)
        qaTrace("qa.provider-progress-ended", {
          logicalUnitId: progress.logicalUnitId,
          bytes: progress.bytes,
          lastProgressAt: progress.lastProgressAt,
          elapsedMs: Date.now() - progress.startedAt
        });
      providerProgress.delete(streamId);
      releaseSpan();
    };
    if (request.activityScope) activityHub.start(streamId, request.activityScope, apiKey);
    if (qaStreamingEnabled()) {
      qaProviderStreamStart(streamId, {
        system: request.system,
        user: request.user,
        startedAt: new Date().toISOString(),
        ...(request.activityScope ? { workflowId: request.activityScope.workflowId } : {}),
        ...(request.telemetry
          ? {
              logicalUnitId: request.telemetry.logicalUnitId,
              stage: request.telemetry.task,
              attemptType: request.telemetry.attemptType
            }
          : {}),
        model: "deepseek-flash",
        visualParts: parts.length
      });
    }
    try {
      response = await this.fetcher(this.endpoint, {
        method: "POST",
        ...(request.signal ? { signal: request.signal } : {}),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: serializeProviderRequest(request)
      });
    } catch (error) {
      {
        releaseRequest();
        activityHub.end(streamId);
        await qaProviderStreamEnd(streamId);
      }
      const failure = transportFailure(error, this.endpoint);
      qaTrace("qa.network-first-failure", {
        layer: "fetch-or-stream",
        errorCode: failure.code,
        reason: failure.layer,
        retryable: failure.retryable
      });
      throw failure;
    }
    qaProviderStreamResult(streamId, { httpStatus: response.status });
    if (!response.ok) {
      qaTrace("qa.provider-rejection", { status: response.status, layer: "provider" });
      {
        releaseRequest();
        activityHub.end(streamId);
        await qaProviderStreamEnd(streamId);
      }
      if (response.status === 413) {
        throw new DeepSeekFailure(
          "AI_CONTRACT",
          false,
          "Provider rejected request content before generation (HTTP 413)",
          0,
          "provider",
          true
        );
      }
      if (response.status === 401 || response.status === 402) {
        throw new DeepSeekFailure("AI_AUTH", false, "This API key isn’t working");
      }
      if (response.status === 429) {
        const header = response.headers.get("retry-after");
        const seconds = header === null ? NaN : Number(header);
        const delay = Number.isFinite(seconds)
          ? seconds * 1000
          : header
            ? Date.parse(header) - Date.now()
            : 0;
        throw new DeepSeekFailure(
          "AI_RATE_LIMIT",
          true,
          "DeepSeek rate limit reached",
          Math.max(0, Number.isFinite(delay) ? delay : 0),
          "provider"
        );
      }
      throw new DeepSeekFailure(
        "AI_PROVIDER",
        response.status >= 500,
        `DeepSeek request failed (${String(response.status)})`,
        0,
        "provider"
      );
    }
    const payload: unknown = await (
      response.headers.get("content-type")?.includes("text/event-stream")
        ? readDeepSeekStream(response, streamId, request.reasoningCycleGuard === true)
        : response.json()
    )
      .catch((error: unknown) => {
        const failure =
          error instanceof DeepSeekFailure
            ? error
            : error instanceof SyntaxError
              ? new DeepSeekFailure(
                  "AI_PROVIDER",
                  false,
                  "Malformed provider response frame",
                  0,
                  "schema"
                )
              : transportFailure(error, this.endpoint);
        qaTrace("qa.network-first-failure", {
          layer: "stream-or-response",
          reason: failure.layer,
          errorCode: failure.code,
          retryable: failure.retryable
        });
        throw failure;
      })
      .finally(async () => {
        releaseRequest();
        activityHub.end(streamId);
        await qaProviderStreamEnd(streamId);
      });
    if (typeof payload !== "object" || payload === null || !("choices" in payload)) {
      throw new DeepSeekFailure("AI_CONTRACT", true, "DeepSeek returned an invalid response");
    }
    return payload;
  }

  /**
   * Whether this key is accepted, asked without spending anything: the models list is a read, so a
   * key that works costs nothing to check and a key that does not is refused before inference.
   */
  async verify(apiKey: string): Promise<void> {
    let response: Response;
    try {
      response = await this.fetcher(MODELS_ENDPOINT, {
        headers: { Authorization: `Bearer ${apiKey}` }
      });
    } catch (error) {
      throw transportFailure(error, MODELS_ENDPOINT);
    }
    if (!response.ok) {
      qaTrace("qa.provider-rejection", { status: response.status, layer: "provider" });
      throw new DeepSeekFailure(
        response.status === 401 || response.status === 403 ? "AI_AUTH" : "AI_PROVIDER",
        false,
        response.status === 401 || response.status === 403
          ? "This API key isn’t working"
          : `DeepSeek could not check the key (${String(response.status)})`
      );
    }
  }
}

/**
 * A thrown fetch, as a coded failure.
 *
 * Recorded before it is flattened: "DeepSeek could not be reached" covers a refused connection and a
 * request the browser would not build, and a report that cannot tell those apart is a report that
 * sends its reader the wrong way. (Gate 3 finding F4.)
 */
function transportFailure(error: unknown, endpoint: string): DeepSeekFailure {
  if (error instanceof DeepSeekFailure) return error;
  const reason = error instanceof Error ? error.message : String(error);
  qaTrace("qa.ai-transport-failed", {
    endpoint,
    name: error instanceof Error ? error.name : typeof error,
    reason
  });
  if (error instanceof TypeError && REQUEST_REFUSED.test(reason)) {
    // Retrying cannot help: the request never became a request.
    return new DeepSeekFailure(
      "AI_CONTRACT",
      false,
      "Syllab could not build the request to DeepSeek",
      0,
      "browser-request"
    );
  }
  const timedOut =
    (error instanceof DOMException && error.name === "TimeoutError") ||
    /timeout|timed out/i.test(reason);
  const aborted = error instanceof DOMException && error.name === "AbortError";
  return new DeepSeekFailure(
    "NETWORK_TRANSIENT",
    true,
    timedOut
      ? "DeepSeek request timed out"
      : aborted
        ? "DeepSeek request cancelled"
        : "DeepSeek could not be reached",
    0,
    timedOut ? "timeout" : aborted ? "abort" : "network"
  );
}
