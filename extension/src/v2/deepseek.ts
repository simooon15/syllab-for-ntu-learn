import {
  qaProviderStreamDelta,
  qaProviderStreamEnd,
  qaProviderStreamStart,
  qaTrace
} from "./qa-telemetry";
import { DEEPSEEK_FLASH_CAPABILITIES } from "./invocation-policy";

declare const __SYLLAB_E2E_FIXTURES__: boolean;

export type DeepSeekFailureCode =
  "AI_AUTH" | "AI_RATE_LIMIT" | "AI_PROVIDER" | "NETWORK_TRANSIENT" | "AI_CONTRACT";

export class DeepSeekFailure extends Error {
  constructor(
    readonly code: DeepSeekFailureCode,
    readonly retryable: boolean,
    message: string
  ) {
    super(message);
  }
}

export interface DeepSeekRequest {
  system: string;
  user: string;
  maxTokens: number;
}

const ENDPOINT = "https://api.deepseek.com/v1/chat/completions";
/** Models list: a free read that answers "is this key good?" without spending anything. */
const MODELS_ENDPOINT = "https://api.deepseek.com/v1/models";
/** A provider request must eventually release the workflow lease and enter existing retry logic. */
export const DEEPSEEK_REQUEST_TIMEOUT_MS = 300_000;

function qaStreamingEnabled(): boolean {
  return typeof __SYLLAB_E2E_FIXTURES__ !== "undefined" && __SYLLAB_E2E_FIXTURES__;
}

/** Reassembles DeepSeek's documented SSE chat stream into the normal completion payload. */
export async function readDeepSeekStream(response: Response, streamId: string): Promise<unknown> {
  if (!response.body) {
    throw new DeepSeekFailure("AI_PROVIDER", true, "DeepSeek returned an empty response stream");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  let reasoning = "";
  let finishReason: string | null = null;
  let usage: unknown;

  const consume = (block: string): boolean => {
    for (const line of block.split(/\r?\n/)) {
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return true;
      if (!data) continue;
      const chunk = JSON.parse(data) as unknown;
      if (typeof chunk !== "object" || chunk === null) continue;
      const record = chunk as Record<string, unknown>;
      if (record.usage !== undefined && record.usage !== null) usage = record.usage;
      const choices = record.choices;
      if (!Array.isArray(choices) || choices.length === 0) continue;
      const choice = choices[0] as unknown;
      if (typeof choice !== "object" || choice === null) continue;
      const choiceRecord = choice as Record<string, unknown>;
      if (typeof choiceRecord.finish_reason === "string") {
        finishReason = choiceRecord.finish_reason;
      }
      const delta = choiceRecord.delta;
      if (typeof delta !== "object" || delta === null) continue;
      const deltaRecord = delta as Record<string, unknown>;
      if (typeof deltaRecord.reasoning_content === "string" && deltaRecord.reasoning_content) {
        reasoning += deltaRecord.reasoning_content;
        qaProviderStreamDelta(streamId, "reasoning", deltaRecord.reasoning_content);
      }
      if (typeof deltaRecord.content === "string" && deltaRecord.content) {
        content += deltaRecord.content;
        qaProviderStreamDelta(streamId, "content", deltaRecord.content);
      }
    }
    return false;
  };

  let done = false;
  while (!done) {
    const next = await reader.read();
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
  return {
    choices: [
      {
        message: { content, reasoning_content: reasoning },
        finish_reason: finishReason
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
    const streaming = qaStreamingEnabled();
    const streamId = streaming ? crypto.randomUUID() : "";
    if (streaming) {
      qaProviderStreamStart(streamId, { system: request.system, user: request.user });
    }
    try {
      response = await this.fetcher(this.endpoint, {
        method: "POST",
        signal: AbortSignal.timeout(DEEPSEEK_REQUEST_TIMEOUT_MS),
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: DEEPSEEK_FLASH_CAPABILITIES.model,
          thinking: { type: DEEPSEEK_FLASH_CAPABILITIES.thinking },
          reasoning_effort: DEEPSEEK_FLASH_CAPABILITIES.reasoningEffort,
          max_tokens: request.maxTokens,
          response_format: { type: "json_object" },
          ...(streaming ? { stream: true, stream_options: { include_usage: true } } : {}),
          messages: [
            { role: "system", content: request.system },
            { role: "user", content: request.user }
          ]
        })
      });
    } catch (error) {
      if (streaming) qaProviderStreamEnd(streamId);
      throw transportFailure(error, this.endpoint);
    }
    if (!response.ok) {
      if (streaming) qaProviderStreamEnd(streamId);
      if (response.status === 401 || response.status === 402) {
        throw new DeepSeekFailure("AI_AUTH", false, "This API key isn’t working");
      }
      if (response.status === 429) {
        throw new DeepSeekFailure("AI_RATE_LIMIT", true, "DeepSeek rate limit reached");
      }
      throw new DeepSeekFailure(
        "AI_PROVIDER",
        response.status >= 500,
        `DeepSeek request failed (${String(response.status)})`
      );
    }
    const payload: unknown = streaming
      ? await readDeepSeekStream(response, streamId).finally(() => qaProviderStreamEnd(streamId))
      : await response.json();
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
        signal: AbortSignal.timeout(DEEPSEEK_REQUEST_TIMEOUT_MS),
        headers: { Authorization: `Bearer ${apiKey}` }
      });
    } catch (error) {
      throw transportFailure(error, MODELS_ENDPOINT);
    }
    if (!response.ok) {
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
      "Syllab could not build the request to DeepSeek"
    );
  }
  const timedOut =
    (error instanceof DOMException && error.name === "TimeoutError") ||
    /timeout|timed out|aborted/i.test(reason);
  return new DeepSeekFailure(
    "NETWORK_TRANSIENT",
    true,
    timedOut ? "DeepSeek request timed out" : "DeepSeek could not be reached"
  );
}
