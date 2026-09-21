/**
 * Failure-specific malformed / truncated response handling (Technical Design §9 correction).
 *
 * Truncation and empty responses receive one fresh request with a recomputed dynamic ceiling;
 * schema-invalid JSON receives one targeted repair. Transport failures are returned to the
 * workflow retry policy, and no failure gets an unbounded repair loop. Every physical call keeps
 * the original idempotency key, so a workflow replay cannot apply the same result twice.
 */

import { isRecord } from "@syllab/contracts";

import type { AiCall, AiCallOutcome } from "./ai-pipeline";
import type { AiVisualPart } from "./ai-context";
import { DeepSeekFailure, DeepSeekTransport, type DeepSeekFailureCode } from "./deepseek";
import { qaTrace } from "./qa-telemetry";
import {
  computeOutputSafetyCeiling,
  DEEPSEEK_FLASH_CAPABILITIES,
  estimateInputTokens,
  TASK_RUNAWAY_GUARDS,
  type InvocationTask
} from "./invocation-policy";

/** Retained as a compatibility export; dynamic task guards now determine retry ceilings. */
export const RETRY_OUTPUT_TOKEN_CEILING = 96_000;
/** Bound on how much of a rejected response is echoed back into the repair request. */
export const MALFORMED_EXCERPT_CHARS = 24_000;
/**
 * The one wording for "the model ran out of room". A truncated answer reaches the reader through two
 * doors — it parsed anyway, or it did not — and both are the same problem, so both say the same
 * thing.
 */
const TRUNCATION_PROBLEM = "the response was cut off before it finished";

export interface AiTransportRequest {
  system: string;
  user: string;
  maxTokens: number;
  /** Page images for Sources whose visual interpretation is necessary (mixed PDFs). */
  visualParts?: AiVisualPart[];
  /** QA-only metadata; never includes prompt text, response text or credentials. */
  telemetry?: {
    task: string;
    logicalUnitId: string;
    attemptType: "initial" | "repair" | "fresh-retry";
    invocationFingerprint?: string;
  };
}

/**
 * One provider call. No retry, no repair, no validation — those belong to `completeJson` so that
 * usage, failure codes and idempotency keys stay in one place.
 */
export interface AiTransport {
  complete(apiKey: string, request: AiTransportRequest): Promise<unknown>;
}

export interface AiUsage {
  inputTokens: number;
  outputTokens: number;
  reasoningTokens?: number;
}

export interface AiFailure {
  errorCode: DeepSeekFailureCode;
  /**
   * Whether a paid request may have been served. An authentication rejection is refused before
   * inference, so it is the one failure that is known not to consume API usage.
   */
  consumesApi: boolean;
  detail?: string;
}

export type ProviderCompletion =
  | {
      ok: true;
      raw: string;
      value: unknown;
      truncated: boolean;
      finishReason: string | null;
      usage: AiUsage;
    }
  | {
      ok: false;
      raw: string;
      problem: string;
      truncated: boolean;
      finishReason: string | null;
      failureKind: "empty" | "invalid-json";
      usage: AiUsage;
    };

export type JsonCompletion<T> =
  | { status: "succeeded"; value: T; idempotencyKey: string; usage: AiUsage; attempts: number }
  | {
      status: "failed";
      failure: AiFailure;
      idempotencyKey: string;
      usage: AiUsage;
      attempts: number;
    };

function bounded(value: string): string {
  return value.length <= MALFORMED_EXCERPT_CHARS ? value : value.slice(0, MALFORMED_EXCERPT_CHARS);
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "unknown failure";
}

function readUsage(usage: unknown): AiUsage {
  if (!isRecord(usage)) return { inputTokens: 0, outputTokens: 0 };
  const input = usage.prompt_tokens;
  const output = usage.completion_tokens;
  const reasoning = isRecord(usage.completion_tokens_details)
    ? usage.completion_tokens_details.reasoning_tokens
    : undefined;
  return {
    inputTokens: typeof input === "number" ? input : 0,
    outputTokens: typeof output === "number" ? output : 0,
    ...(typeof reasoning === "number" ? { reasoningTokens: reasoning } : {})
  };
}

/** A provider payload that carried no message content is echoed back as its own JSON rendering. */
function renderPayload(payload: unknown): string {
  if (payload === undefined) return "";
  const rendered: unknown = JSON.stringify(payload);
  return typeof rendered === "string" ? rendered : "";
}

/**
 * Reads a provider payload into either a parsed JSON value or a problem description. `raw` is the
 * message content when there is one and a bounded rendering of the payload when there is not, so
 * the repair request always has something concrete to show the model.
 */
export function readProviderCompletion(payload: unknown): ProviderCompletion {
  const usage = readUsage(isRecord(payload) ? payload.usage : undefined);
  const choices = isRecord(payload) ? payload.choices : undefined;
  if (!Array.isArray(choices) || choices.length === 0) {
    return {
      ok: false,
      raw: bounded(renderPayload(payload)),
      problem: "the provider response contained no choices",
      truncated: false,
      finishReason: null,
      failureKind: "empty",
      usage
    };
  }
  const choice: unknown = choices[0];
  if (!isRecord(choice)) {
    return {
      ok: false,
      raw: bounded(renderPayload(payload)),
      problem: "the provider response contained no message",
      truncated: false,
      finishReason: null,
      failureKind: "empty",
      usage
    };
  }
  const message = isRecord(choice.message) ? choice.message : undefined;
  const content = typeof message?.content === "string" ? message.content : "";
  const finishReason = typeof choice.finish_reason === "string" ? choice.finish_reason : null;
  const truncated = finishReason === "length";
  if (content.length === 0) {
    return {
      ok: false,
      raw: bounded(renderPayload(payload)),
      problem: "the response contained no message content",
      truncated,
      finishReason,
      failureKind: "empty",
      usage
    };
  }
  try {
    const value: unknown = JSON.parse(content);
    return { ok: true, raw: content, value, truncated, finishReason, usage };
  } catch {
    // A response that was cut off is not a response that was malformed, and calling it "not valid
    // JSON" sends its reader to the wrong problem. Every failing unit measured on MA6083 / MA6084
    // was `finish_reason: "length"` — a correct JSON prefix, the right `schema`, no closing brace,
    // and 6,601 characters of it that grew to 15,800 on the retry. (Gate 3 finding F35.)
    return {
      ok: false,
      raw: bounded(content),
      problem: truncated ? TRUNCATION_PROBLEM : "the response was not valid JSON",
      truncated,
      finishReason,
      failureKind: "invalid-json",
      usage
    };
  }
}

/** Turns a validator or transport failure into the stable code plus its API-consumption flag. */
function transportFailure(error: unknown): AiFailure {
  if (error instanceof DeepSeekFailure) {
    return {
      errorCode: error.code,
      consumesApi: error.code !== "AI_AUTH",
      detail: error.message
    };
  }
  return { errorCode: "AI_PROVIDER", consumesApi: true, detail: errorText(error) };
}

function repairUser(user: string, detail: string, malformed: string): string {
  return `${user}

--- REPAIR REQUEST ---

The previous response could not be used: ${detail}
Return the same JSON object again with that problem corrected. Do not add anything that was not in the supplied input.

Previous response:
${malformed}`;
}

export interface JsonCompletionInput<T> {
  transport: AiTransport;
  apiKey: string;
  request: AiTransportRequest;
  idempotencyKey: string;
  /** Output budget of the first attempt; fresh retries recompute the task/context ceiling. */
  budget: number;
  /** The task this unit is for, so a failure on the record says which one it was. */
  task: string;
  validate: (value: unknown) => T;
  /** The builder's ceiling is recomputed for a fresh retry instead of reusing a stale fixed value. */
  maxTokensForRequest?: (request: AiTransportRequest) => number;
  logicalUnitId?: string;
  invocationFingerprint?: string | undefined;
}

/**
 * What an unusable answer looked like — without the answer.
 *
 * A failed unit used to leave nothing behind at all: `qa.deepseek-task` is written once a call has
 * succeeded, so a real run could report `AI_CONTRACT` three times running and no one could tell a
 * whitespace-only answer from a fenced one from an object whose `schema` field the model misspelled.
 * The length, the first characters and the top-level keys separate those, and they carry none of the
 * course content the answer was about. The prompt and the answer itself are still not recorded, and
 * `qaTrace` redacts anything shaped like a credential before it is written.
 *
 * `maxTokens` and the reported output usage are here for one question the first version could not
 * answer: a truncated answer proves the model ran out of room, but not whose room — the budget this
 * request carried, or a ceiling the provider keeps for itself. The two are told apart by how close
 * `outputTokens` came to `maxTokens`, and nothing else in the record can. (Gate 3 finding F35.)
 */
function traceContractFailure(
  task: string,
  attempt: number,
  maxTokens: number,
  completion: ProviderCompletion,
  detail: string
): void {
  const value = completion.ok ? completion.value : undefined;
  qaTrace("qa.ai-contract-failure", {
    task,
    attempt,
    maxTokens,
    detail,
    truncated: completion.truncated,
    length: completion.raw.length,
    outputTokens: completion.usage.outputTokens,
    head: completion.raw.replace(/\s+/g, " ").trim().slice(0, 40),
    ...(isRecord(value)
      ? { keys: Object.keys(value).slice(0, 12), sawSchema: value.schema ?? null }
      : {})
  });
}

function failureClass(completion: ProviderCompletion, detail: string): string {
  if (completion.truncated || detail === TRUNCATION_PROBLEM) return "truncation";
  if (!completion.ok && completion.failureKind === "empty") return "empty";
  if (/schema|contract|forbidden|referential|evidence|coverage/i.test(detail)) return "schema";
  if (!completion.ok && completion.failureKind === "invalid-json") return "invalid-json";
  return "ai-contract";
}

function addReasoningUsage(total: AiUsage, next: AiUsage): void {
  if (next.reasoningTokens === undefined) return;
  total.reasoningTokens = (total.reasoningTokens ?? 0) + next.reasoningTokens;
}

function tracePhysicalCall(input: {
  task: string;
  logicalUnitId: string;
  attemptType: "initial" | "repair" | "fresh-retry";
  request: AiTransportRequest;
  maxTokens: number;
  invocationFingerprint?: string | undefined;
  startedAt: number;
  completion?: ProviderCompletion;
  failureClass?: string;
}): void {
  qaTrace("qa.deepseek-physical-call", {
    task: input.task,
    logicalUnitId: input.logicalUnitId,
    attemptType: input.attemptType,
    provider: DEEPSEEK_FLASH_CAPABILITIES.provider,
    model: DEEPSEEK_FLASH_CAPABILITIES.model,
    thinking: DEEPSEEK_FLASH_CAPABILITIES.thinking,
    reasoningEffort: DEEPSEEK_FLASH_CAPABILITIES.reasoningEffort,
    maxTokens: input.maxTokens,
    estimatedInputTokens: estimateInputTokens(input.request.system, input.request.user),
    ...(input.completion
      ? {
          inputTokens: input.completion.usage.inputTokens,
          outputTokens: input.completion.usage.outputTokens,
          ...(input.completion.usage.reasoningTokens === undefined
            ? {}
            : { reasoningTokens: input.completion.usage.reasoningTokens }),
          finishReason: input.completion.finishReason
        }
      : {}),
    latencyMs: Math.max(0, Date.now() - input.startedAt),
    failureClass: input.failureClass ?? null,
    retryType: input.attemptType === "initial" ? "none" : input.attemptType,
    cache: "miss",
    invocationFingerprint: input.invocationFingerprint ?? null
  });
}

/**
 * Runs one AI unit using failure-specific handling. Truncation and empty responses receive one
 * fresh request; schema-invalid JSON receives one targeted repair; transient transport failures
 * return to the workflow retry policy. All calls share the logical idempotency identity.
 */
export async function completeJson<T>(input: JsonCompletionInput<T>): Promise<JsonCompletion<T>> {
  const usage: AiUsage = { inputTokens: 0, outputTokens: 0 };
  let attempts = 0;
  let lastFailure: AiFailure = { errorCode: "AI_CONTRACT", consumesApi: true };

  const attempt = async (
    request: AiTransportRequest,
    maxTokens: number,
    attemptType: "initial" | "repair" | "fresh-retry"
  ): Promise<{
    value?: T;
    detail?: string;
    malformed?: string;
    aborted?: boolean;
    completion?: ProviderCompletion;
  }> => {
    attempts += 1;
    let payload: unknown;
    const startedAt = Date.now();
    const requestWithTelemetry: AiTransportRequest = {
      ...request,
      maxTokens,
      telemetry: {
        task: input.task,
        logicalUnitId: input.logicalUnitId ?? input.idempotencyKey,
        attemptType,
        ...(input.invocationFingerprint === undefined
          ? {}
          : { invocationFingerprint: input.invocationFingerprint })
      }
    };
    qaTrace("qa.deepseek-call-started", {
      task: input.task,
      logicalUnitId: input.logicalUnitId ?? input.idempotencyKey,
      attemptType,
      provider: DEEPSEEK_FLASH_CAPABILITIES.provider,
      model: DEEPSEEK_FLASH_CAPABILITIES.model,
      thinking: DEEPSEEK_FLASH_CAPABILITIES.thinking,
      reasoningEffort: DEEPSEEK_FLASH_CAPABILITIES.reasoningEffort,
      maxTokens,
      estimatedInputTokens: estimateInputTokens(request.system, request.user),
      retryType: attemptType === "initial" ? "none" : attemptType,
      invocationFingerprint: input.invocationFingerprint ?? null
    });
    try {
      payload = await input.transport.complete(input.apiKey, requestWithTelemetry);
    } catch (error) {
      // A thrown transport error is not a response to repair: retry and backoff belong to the
      // workflow, which knows whether the unit is worth paying for again.
      lastFailure = transportFailure(error);
      tracePhysicalCall({
        task: input.task,
        logicalUnitId: input.logicalUnitId ?? input.idempotencyKey,
        attemptType,
        request: requestWithTelemetry,
        maxTokens,
        invocationFingerprint: input.invocationFingerprint,
        startedAt,
        failureClass: lastFailure.errorCode === "NETWORK_TRANSIENT" ? "transient" : "transport"
      });
      return { aborted: true, detail: lastFailure.detail ?? "" };
    }
    const completion = readProviderCompletion(payload);
    usage.inputTokens += completion.usage.inputTokens;
    usage.outputTokens += completion.usage.outputTokens;
    addReasoningUsage(usage, completion.usage);
    if (!completion.ok) {
      lastFailure = { errorCode: "AI_CONTRACT", consumesApi: true, detail: completion.problem };
      traceContractFailure(input.task, attempts, maxTokens, completion, completion.problem);
      tracePhysicalCall({
        task: input.task,
        logicalUnitId: input.logicalUnitId ?? input.idempotencyKey,
        attemptType,
        request: requestWithTelemetry,
        maxTokens,
        invocationFingerprint: input.invocationFingerprint,
        startedAt,
        completion,
        failureClass: failureClass(completion, completion.problem)
      });
      return { detail: completion.problem, malformed: completion.raw, completion };
    }
    if (completion.truncated) {
      const detail = TRUNCATION_PROBLEM;
      lastFailure = { errorCode: "AI_CONTRACT", consumesApi: true, detail };
      traceContractFailure(input.task, attempts, maxTokens, completion, detail);
      tracePhysicalCall({
        task: input.task,
        logicalUnitId: input.logicalUnitId ?? input.idempotencyKey,
        attemptType,
        request: requestWithTelemetry,
        maxTokens,
        invocationFingerprint: input.invocationFingerprint,
        startedAt,
        completion,
        failureClass: "truncation"
      });
      return { detail, malformed: completion.raw, completion };
    }
    try {
      const value = input.validate(completion.value);
      tracePhysicalCall({
        task: input.task,
        logicalUnitId: input.logicalUnitId ?? input.idempotencyKey,
        attemptType,
        request: requestWithTelemetry,
        maxTokens,
        invocationFingerprint: input.invocationFingerprint,
        startedAt,
        completion
      });
      return { value };
    } catch (error) {
      const detail = errorText(error);
      lastFailure = { errorCode: "AI_CONTRACT", consumesApi: true, detail };
      traceContractFailure(input.task, attempts, maxTokens, completion, detail);
      tracePhysicalCall({
        task: input.task,
        logicalUnitId: input.logicalUnitId ?? input.idempotencyKey,
        attemptType,
        request: requestWithTelemetry,
        maxTokens,
        invocationFingerprint: input.invocationFingerprint,
        startedAt,
        completion,
        failureClass: failureClass(completion, detail)
      });
      return { detail, malformed: completion.raw, completion };
    }
  };

  const first = await attempt(input.request, input.budget, "initial");
  if (first.value !== undefined) {
    return {
      status: "succeeded",
      value: first.value,
      idempotencyKey: input.idempotencyKey,
      usage,
      attempts
    };
  }
  if (first.aborted === true) {
    return {
      status: "failed",
      failure: lastFailure,
      idempotencyKey: input.idempotencyKey,
      usage,
      attempts
    };
  }

  const firstFailureClass = first.completion
    ? failureClass(first.completion, first.detail ?? "")
    : "transient";
  const shouldFreshRetry = firstFailureClass === "truncation" || firstFailureClass === "empty";
  const shouldRepair = firstFailureClass === "schema" || firstFailureClass === "invalid-json";
  if (!shouldFreshRetry && !shouldRepair) {
    return {
      status: "failed",
      failure: lastFailure,
      idempotencyKey: input.idempotencyKey,
      usage,
      attempts
    };
  }

  const retryBudget = shouldRepair
    ? input.budget
    : input.maxTokensForRequest
      ? input.maxTokensForRequest(input.request)
      : input.task in TASK_RUNAWAY_GUARDS
        ? computeOutputSafetyCeiling(
            input.task as InvocationTask,
            input.request.system,
            input.request.user
          )
        : Math.max(input.budget, Math.min(RETRY_OUTPUT_TOKEN_CEILING, input.budget * 2));
  const retryRequest = shouldRepair
    ? {
        ...input.request,
        user: repairUser(input.request.user, first.detail ?? "", first.malformed ?? "")
      }
    : input.request;
  const retried = await attempt(retryRequest, retryBudget, shouldRepair ? "repair" : "fresh-retry");
  if (retried.value !== undefined) {
    return {
      status: "succeeded",
      value: retried.value,
      idempotencyKey: input.idempotencyKey,
      usage,
      attempts
    };
  }

  return {
    status: "failed",
    failure: lastFailure,
    idempotencyKey: input.idempotencyKey,
    usage,
    attempts
  };
}

/**
 * Production transport for the v0.2.0 baseline. Requests that need page images are refused instead
 * of being sent without them: the text-only `DeepSeekTransport` cannot carry a page image, and a
 * silently text-only extraction would misreport a visual Source as understood.
 */
export function deepSeekTransport(
  transport: DeepSeekTransport = new DeepSeekTransport()
): AiTransport {
  return {
    async complete(apiKey, request) {
      if ((request.visualParts?.length ?? 0) > 0) {
        throw new DeepSeekFailure(
          "AI_CONTRACT",
          true,
          "page images are not supported by the text-only transport"
        );
      }
      return transport.complete(apiKey, {
        system: request.system,
        user: request.user,
        maxTokens: request.maxTokens
      });
    }
  };
}

/** A unit that could not be completed, carrying the API-consumption flag to the workflow. */
export class AiUnitFailure extends DeepSeekFailure {
  constructor(readonly failure: AiFailure) {
    super(
      failure.errorCode,
      failure.errorCode !== "AI_AUTH",
      failure.detail ?? "The AI response could not be used"
    );
  }
}

/**
 * Runs one whole AI unit for the workflow engine: the call's request, the repair and retry
 * escalation, and a check that the response carries the schema version the call asked for. A
 * failure is thrown as `AiUnitFailure` so the caller never has to distinguish "no usable answer"
 * from "no answer at all".
 */
export async function completeWithRepair(
  call: AiCall,
  apiKey: string,
  transport: DeepSeekTransport | AiTransport = new DeepSeekTransport(),
  /**
   * Contract check below the schema envelope, e.g. "every cited Source was actually supplied".
   * Running it here rather than after the call means a repairable contract mistake is corrected
   * by the repair round instead of failing the whole unit.
   */
  check?: (value: unknown) => void
): Promise<AiCallOutcome> {
  const bridge = transport instanceof DeepSeekTransport ? deepSeekTransport(transport) : transport;
  const completion = await completeJson({
    transport: bridge,
    apiKey,
    request: { system: call.system, user: call.user, maxTokens: call.maxTokens },
    idempotencyKey: call.idempotencyKey,
    budget: call.maxTokens,
    task: call.task,
    maxTokensForRequest: (request) =>
      computeOutputSafetyCeiling(call.task, request.system, request.user),
    logicalUnitId: call.idempotencyKey,
    invocationFingerprint: call.invocationFingerprint,
    validate: (value) => {
      if (!isRecord(value) || value.schema !== call.schemaVersion) {
        throw new Error(`AI_CONTRACT:schema:${call.schemaVersion}`);
      }
      check?.(value);
      return value;
    }
  });
  if (completion.status === "failed") throw new AiUnitFailure(completion.failure);
  return {
    call,
    value: completion.value,
    inputTokens: completion.usage.inputTokens,
    outputTokens: completion.usage.outputTokens,
    ...(completion.usage.reasoningTokens === undefined
      ? {}
      : { reasoningTokens: completion.usage.reasoningTokens })
  };
}
