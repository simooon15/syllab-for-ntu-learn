import { decodeDirectCapture } from "./direct-json";
import { canonicalEnvelope, AI_SCHEMAS, type CompatibilityRepair } from "./contract-registry";
import { completePrefixItems } from "./task-b-ledger";
import type { ActivityScope } from "./activity";
/** DA-004 completion boundary: exactly one paid dispatch per attempt. Deterministic local
 * representation repair is allowed; unusable/ambiguous results require explicit user Retry.
 */

import { isRecord } from "@syllab/contracts";

import type { AiCall, AiCallOutcome } from "./ai-pipeline";
import type { AiVisualPart } from "./ai-context";
import { DeepSeekFailure, DeepSeekTransport, type DeepSeekFailureCode } from "./deepseek";
import { qaTrace } from "./qa-telemetry";
import {
  computeOutputSafetyCeiling,
  DEEPSEEK_FLASH_CAPABILITIES,
  estimateInputTokens
} from "./invocation-policy";

/** Retained as a compatibility export; dynamic task guards now determine retry ceilings. */
export const RETRY_OUTPUT_TOKEN_CEILING = 96_000;
/**
 * The one wording for "the model ran out of room". A truncated answer reaches the reader through two
 * doors — it parsed anyway, or it did not — and both are the same problem, so both say the same
 * thing.
 */
const TRUNCATION_PROBLEM = "the response was cut off before it finished";

export interface AiTransportRequest {
  /** Audits may stop exact repeated reasoning checkpoints; not an output capacity cap. */
  reasoningCycleGuard?: true;
  reasoningEffort?: "low" | "high";
  /** Optional API max_tokens is omitted for this current Task B path; no owned output cap. */
  providerRequestCompatibility?: "provider-default";
  system: string;
  user: string;
  maxTokens: number;
  /** Page images for Sources whose visual interpretation is necessary (mixed PDFs). */
  visualParts?: AiVisualPart[];
  activityScope?: ActivityScope;
  signal?: AbortSignal;
  messages?: Array<{ role: "user" | "assistant"; content: string }>;
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
  usageKnown?: boolean;
  cacheHitTokens?: number;
  cacheMissTokens?: number;
}

export interface AiFailure {
  preGenerationBoundary?: boolean;
  retryAfterMs?: number;
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

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "unknown failure";
}

function readUsage(usage: unknown): AiUsage {
  if (!isRecord(usage)) return { inputTokens: 0, outputTokens: 0, usageKnown: false };
  const input = usage.prompt_tokens;
  const output = usage.completion_tokens;
  const reasoning = isRecord(usage.completion_tokens_details)
    ? usage.completion_tokens_details.reasoning_tokens
    : undefined;
  return {
    usageKnown: typeof input === "number" && typeof output === "number",
    ...(typeof usage.prompt_cache_hit_tokens === "number"
      ? { cacheHitTokens: usage.prompt_cache_hit_tokens }
      : {}),
    ...(typeof usage.prompt_cache_miss_tokens === "number"
      ? { cacheMissTokens: usage.prompt_cache_miss_tokens }
      : {}),
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

/** Only parser category/offsets; never quote rejected response text in diagnostics. */
function jsonParseDiagnostic(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  const category = message.startsWith("Unexpected end")
    ? "unexpected-end"
    : message.startsWith("Unterminated")
      ? "unterminated-string"
      : message.startsWith("Expected")
        ? "expected-separator-or-property"
        : message.includes("control character")
          ? "unescaped-control-character"
          : "unexpected-token";
  const position = message.match(/position (\d+)/)?.[1];
  return category + (position === undefined ? "" : ` at character ${position}`);
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
      raw: renderPayload(payload),
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
      raw: renderPayload(payload),
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
      raw: renderPayload(payload),
      problem: "the response contained no message content",
      truncated,
      finishReason,
      failureKind: "empty",
      usage
    };
  }
  try {
    const decoded = decodeDirectCapture(
      content.trim().replace(/^```(?:json)?\s*([\s\S]*?)\s*```$/u, "$1")
    );
    const value = decoded.value;
    if (decoded.formatRecovery)
      qaTrace("qa.json-format-recovery", { formatRecovery: decoded.formatRecovery });
    return { ok: true, raw: content, value, truncated, finishReason, usage };
  } catch (error) {
    const parseDiagnostic = jsonParseDiagnostic(error);
    qaTrace("qa.json-parse-failure", {
      characters: content.length,
      diagnostic: parseDiagnostic,
      finishReason
    });
    // A response that was cut off is not a response that was malformed, and calling it "not valid
    // JSON" sends its reader to the wrong problem. Every failing unit measured on MA6083 / MA6084
    // was `finish_reason: "length"` — a correct JSON prefix, the right `schema`, no closing brace,
    // and 6,601 characters of it that grew to 15,800 on the retry. (Gate 3 finding F35.)
    return {
      ok: false,
      raw: content,
      problem: truncated
        ? TRUNCATION_PROBLEM
        : `the response was not valid JSON (${parseDiagnostic})`,
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
      consumesApi: error.code !== "AI_AUTH" && !error.preGenerationBoundary,
      ...(error.preGenerationBoundary ? { preGenerationBoundary: true } : {}),
      detail: error.message,
      ...(error.retryAfterMs ? { retryAfterMs: error.retryAfterMs } : {})
    };
  }
  return { errorCode: "AI_PROVIDER", consumesApi: true, detail: errorText(error) };
}

export interface JsonCompletionInput<T> {
  singlePhysicalAttempt?: boolean;
  taskBPhysicalContinuation?: boolean;
  physicalWorkContinuation?: boolean;
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
    ...(input.request.activityScope?.packageUnitId
      ? { packageUnitId: input.request.activityScope.packageUnitId }
      : {}),
    attemptType: input.attemptType,
    provider: DEEPSEEK_FLASH_CAPABILITIES.provider,
    model: DEEPSEEK_FLASH_CAPABILITIES.model,
    thinking: DEEPSEEK_FLASH_CAPABILITIES.thinking,
    reasoningEffort: input.request.reasoningEffort ?? DEEPSEEK_FLASH_CAPABILITIES.reasoningEffort,
    ...(input.request.providerRequestCompatibility
      ? { providerRequestCompatibility: input.request.providerRequestCompatibility }
      : { maxTokens: input.maxTokens }),
    estimatedInputTokens: estimateInputTokens(input.request.system, input.request.user),
    ...(input.completion
      ? {
          inputTokens: input.completion.usage.usageKnown
            ? input.completion.usage.inputTokens
            : null,
          outputTokens: input.completion.usage.usageKnown
            ? input.completion.usage.outputTokens
            : null,
          ...(input.completion.usage.reasoningTokens === undefined
            ? {}
            : { reasoningTokens: input.completion.usage.reasoningTokens }),
          finishReason: input.completion.finishReason
        }
      : {}),
    latencyMs: Math.max(0, Date.now() - input.startedAt),
    failureClass: input.failureClass ?? null,
    retryType: input.attemptType === "initial" ? "none" : input.attemptType,
    cacheHitTokens: input.completion?.usage.cacheHitTokens ?? null,
    cacheMissTokens: input.completion?.usage.cacheMissTokens ?? null,
    cost: null,
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
      reasoningEffort: request.reasoningEffort ?? DEEPSEEK_FLASH_CAPABILITIES.reasoningEffort,
      ...(request.providerRequestCompatibility
        ? { providerRequestCompatibility: request.providerRequestCompatibility }
        : { maxTokens }),
      estimatedInputTokens: estimateInputTokens(request.system, request.user),
      retryType: attemptType === "initial" ? "none" : attemptType,
      invocationFingerprint: input.invocationFingerprint ?? null
    });
    try {
      payload = await input.transport.complete(input.apiKey, requestWithTelemetry);
    } catch (error) {
      // A thrown transport error is not a response to repair: retry and backoff belong to the
      // workflow, which knows whether the unit is worth paying for again.
      usage.usageKnown = false;
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
    if (completion.usage.usageKnown === false) usage.usageKnown = false;
    usage.inputTokens += completion.usage.inputTokens;
    usage.outputTokens += completion.usage.outputTokens;
    addReasoningUsage(usage, completion.usage);
    if (
      completion.truncated &&
      (input.taskBPhysicalContinuation || input.physicalWorkContinuation)
    ) {
      const value = {
        schema: input.physicalWorkContinuation ? AI_SCHEMAS.physical : AI_SCHEMAS.groundedB,
        items: completePrefixItems(
          completion.raw,
          input.physicalWorkContinuation ? AI_SCHEMAS.physical : AI_SCHEMAS.groundedB
        ),
        physicalLength: true,
        rawPrefix: completion.raw
      };
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
      return { value: input.validate(value) };
    }
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
      const value = input.validate(
        (input.taskBPhysicalContinuation || input.physicalWorkContinuation) &&
          isRecord(completion.value)
          ? { ...completion.value, physicalLength: false }
          : completion.value
      );
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
  if (first.aborted === true || input.singlePhysicalAttempt) {
    return {
      status: "failed",
      failure: lastFailure,
      idempotencyKey: input.idempotencyKey,
      usage,
      attempts
    };
  }

  // DA-004: a completed/ambiguous dispatch cannot authorize another paid invocation.
  qaTrace("qa.ai-user-retry-required", {
    task: input.task,
    attempts,
    errorCode: lastFailure.errorCode
  });

  return {
    status: "failed",
    failure: lastFailure,
    idempotencyKey: input.idempotencyKey,
    usage,
    attempts
  };
}

/**
 * Production transport forwards selective visual parts and the ephemeral Activity scope.
 */
export function deepSeekTransport(
  transport: DeepSeekTransport = new DeepSeekTransport()
): AiTransport {
  return {
    async complete(apiKey, request) {
      return transport.complete(apiKey, {
        system: request.system,
        user: request.user,
        maxTokens: request.maxTokens,
        ...(request.providerRequestCompatibility
          ? { providerRequestCompatibility: request.providerRequestCompatibility }
          : {}),
        ...(request.visualParts ? { visualParts: request.visualParts } : {}),
        ...(request.activityScope ? { activityScope: request.activityScope } : {}),
        ...(request.signal ? { signal: request.signal } : {}),
        ...(request.messages ? { messages: request.messages } : {}),
        ...(request.telemetry ? { telemetry: request.telemetry } : {})
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
      failure.detail ?? "The AI response could not be used",
      failure.retryAfterMs ?? 0
    );
  }
}

/**
 * Runs one AI dispatch for the workflow engine with a check that the response carries the schema version the call asked for. A
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
  let compatibilityRepair: CompatibilityRepair | undefined;
  const completion = await completeJson({
    transport: bridge,
    ...(call.singlePhysicalAttempt ? { singlePhysicalAttempt: true } : {}),
    taskBPhysicalContinuation: call.taskBPhysicalContinuation === true,
    physicalWorkContinuation: call.physicalWorkContinuation === true,
    apiKey,
    request: {
      system: call.system,
      user: call.user,
      ...(call.reasoningCycleGuard ? { reasoningCycleGuard: true as const } : {}),
      ...(call.reasoningEffort ? { reasoningEffort: call.reasoningEffort } : {}),
      ...(call.providerRequestCompatibility
        ? { providerRequestCompatibility: call.providerRequestCompatibility }
        : {}),
      maxTokens: call.maxTokens,
      ...(call.visualParts ? { visualParts: call.visualParts } : {}),
      ...(call.activityScope ? { activityScope: call.activityScope } : {}),
      ...(call.signal ? { signal: call.signal } : {}),
      ...(call.messages ? { messages: call.messages } : {})
    },
    idempotencyKey: call.idempotencyKey,
    budget: call.maxTokens,
    task: call.task,
    maxTokensForRequest: (request) =>
      computeOutputSafetyCeiling(
        call.task,
        request.system,
        request.messages ? JSON.stringify(request.messages) : request.user
      ),
    logicalUnitId: call.idempotencyKey,
    invocationFingerprint: call.invocationFingerprint,
    validate: (original) => {
      const normalized = canonicalEnvelope(original, call.schemaVersion);
      const value = normalized.value;
      compatibilityRepair = normalized.repair;
      if (
        !isRecord(value) ||
        (value.schema !== call.schemaVersion &&
          !(call.schemaVersion === AI_SCHEMAS.courseDraft && value.schema === undefined))
      ) {
        throw new Error(
          `AI_CONTRACT:schema:${call.schemaVersion}; top-level "schema" must equal the exact JSON string ${JSON.stringify(call.schemaVersion)}. Preserve every dot and slash; replace the incorrect value rather than repeating it.`
        );
      }
      check?.(value);
      return value;
    }
  });
  if (completion.status === "failed") throw new AiUnitFailure(completion.failure);
  return {
    call,
    value: completion.value,
    consumesApi: true,
    ...(compatibilityRepair ? { compatibilityRepair } : {}),
    ...(completion.usage.usageKnown === false
      ? {}
      : { inputTokens: completion.usage.inputTokens, outputTokens: completion.usage.outputTokens }),
    ...(completion.usage.reasoningTokens === undefined
      ? {}
      : { reasoningTokens: completion.usage.reasoningTokens })
  };
}
