/**
 * Task A/B/C orchestration. This module owns the deterministic workflow shape — which calls are
 * made, in what order, with which context — and nothing else. Identity, structure, change and
 * removal meaning is never decided here: every semantic answer comes back from the model and is
 * checked only against the deterministic contracts in `ai-contracts`.
 */

import { isRecord } from "@syllab/contracts";

import {
  TASK_A_SCHEMA,
  TASK_B_SCHEMA,
  TASK_C_SCHEMA,
  validateTaskA,
  validateTaskB,
  validateTaskC,
  type SourceResult,
  type TaskAResult,
  type TaskBResult,
  type TaskCResult
} from "./ai-contracts";
import {
  buildTaskAConsolidationContext,
  buildTaskAContext,
  buildTaskBContext,
  buildTaskBExpansionContext,
  buildTaskCContext,
  type AiCallContext,
  type AiCourseIndexEntry,
  type AiCourseInput,
  type AiEvidence,
  type AiSourceIdentity,
  type AiSourceInput
} from "./ai-context";
import type { Chunk } from "./chunking";
import { completeJson, type AiFailure, type AiTransport, type AiUsage } from "./deepseek-complete";
import { DeepSeekFailure, type DeepSeekFailureCode } from "./deepseek";
import { PROMPT_VERSIONS } from "./prompts";
import { computeOutputSafetyCeiling, invocationFingerprint } from "./invocation-policy";

export type { AiCourseIndexEntry, AiCourseInput, AiEvidence, AiSourceIdentity, AiSourceInput };

/** Technical Design §8.4: at most two Evidence expansion rounds after the first Task B call. */
export const MAX_TASK_B_EXPANSION_ROUNDS = 2;

export type AiTaskName = "task-a" | "task-a-consolidate" | "task-b" | "task-b-expand" | "task-c";

export interface AiCall {
  task: AiTaskName;
  schemaVersion: string;
  promptVersion: string;
  idempotencyKey: string;
  maxTokens: number;
  system: string;
  user: string;
  /** Non-secret cache/config identity; never contains prompt text or credentials. */
  invocationFingerprint?: string;
}

export interface AiCallOutcome {
  call: AiCall;
  value: unknown;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
}

/**
 * The single-physical-call boundary. `run` must perform exactly one provider call and return the
 * parsed JSON value; it must not retry, repair or validate, because the repair / retry escalation
 * and the contract checks live here so that usage, failures and idempotency keys stay comparable.
 */
export interface AiGateway {
  run(call: AiCall, apiKey: string): Promise<AiCallOutcome>;
}

export interface AiGatewayDeps {
  gateway: AiGateway;
  apiKey: string;
}

/** One record per logical AI unit, ready to be stored as an AiRun. */
export interface AiCallRecord {
  task: AiTaskName;
  schemaVersion: string;
  promptVersion: string;
  idempotencyKey: string;
  maxTokens: number;
  status: "succeeded" | "failed";
  /** Physical provider calls this unit spent, including repair and retry. */
  attempts: number;
  consumesApi: boolean;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens?: number;
  errorCode?: DeepSeekFailureCode;
  detail?: string;
  sourceId?: string;
  chunkIndex?: number;
}

export type AiRunOutcome<T> =
  | { status: "succeeded"; value: T; calls: AiCallRecord[]; usage: AiUsage }
  | { status: "failed"; failure: AiFailure; calls: AiCallRecord[]; usage: AiUsage };

/**
 * Keys the accepted prompts prohibit. Rejecting them is a deterministic contract check, not a
 * semantic judgment: a response that carries an apply/notify/confidence instruction is not usable
 * regardless of what else it says.
 */
const FORBIDDEN_OUTPUT_KEYS = [
  "automerge",
  "autoapply",
  "autonotify",
  "nexttask",
  "confidence",
  "confidencescore",
  "identityscore",
  "similarityscore",
  "matchscore",
  "pointscore",
  "threshold"
];

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[_-]/g, "");
}

export function assertNoProductInstructions(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) assertNoProductInstructions(item);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, item] of Object.entries(value)) {
    if (FORBIDDEN_OUTPUT_KEYS.includes(normalizeKey(key))) {
      throw new Error(`AI_CONTRACT:forbidden_key:${key}`);
    }
    assertNoProductInstructions(item);
  }
}

function collectIdsWithKeys(value: unknown, keys: ReadonlySet<string>, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectIdsWithKeys(item, keys, into);
    return;
  }
  if (!isRecord(value)) return;
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" && keys.has(key)) into.add(item);
    collectIdsWithKeys(item, keys, into);
  }
}

function collectEvidenceIds(value: unknown, into: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectEvidenceIds(item, into);
    return;
  }
  if (!isRecord(value)) return;
  if (typeof value.sourceId === "string" && typeof value.evidenceId === "string") {
    into.add(value.evidenceId);
  }
  for (const item of Object.values(value)) collectEvidenceIds(item, into);
}

function evidenceIdsOf(evidence: AiEvidence[]): Set<string> {
  return new Set(evidence.map((item) => item.evidenceId));
}

function addUsage(total: AiUsage, next: AiUsage): void {
  total.inputTokens += next.inputTokens;
  total.outputTokens += next.outputTokens;
}

/**
 * Presents the one-call gateway as a transport so the repair / retry escalation stays in exactly
 * one place (`completeJson`). Authentication, rate-limit and provider failures propagate unchanged
 * — a rejected request must never be "repaired" — while a contract failure becomes the malformed
 * response the repair request echoes back to the model.
 */
function gatewayTransport(gateway: AiGateway, call: AiCall): AiTransport {
  return {
    async complete(apiKey, request) {
      let outcome: AiCallOutcome;
      try {
        outcome = await gateway.run(
          { ...call, system: request.system, user: request.user, maxTokens: request.maxTokens },
          apiKey
        );
      } catch (error) {
        if (error instanceof DeepSeekFailure && error.code !== "AI_CONTRACT") throw error;
        const detail = error instanceof Error ? error.message : "the response could not be used";
        return providerShape(detail, { inputTokens: 0, outputTokens: 0 });
      }
      const content = JSON.stringify(outcome.value);
      return providerShape(typeof content === "string" ? content : "", {
        inputTokens: outcome.inputTokens ?? 0,
        outputTokens: outcome.outputTokens ?? 0,
        ...(outcome.reasoningTokens === undefined
          ? {}
          : { reasoningTokens: outcome.reasoningTokens })
      });
    }
  };
}

function providerShape(content: string, usage: AiUsage): unknown {
  return {
    choices: [{ message: { content }, finish_reason: "stop" }],
    usage: {
      prompt_tokens: usage.inputTokens,
      completion_tokens: usage.outputTokens,
      ...(usage.reasoningTokens === undefined
        ? {}
        : { completion_tokens_details: { reasoning_tokens: usage.reasoningTokens } })
    }
  };
}

type UnitResult<T> =
  | { ok: true; record: AiCallRecord; value: T }
  | { ok: false; record: AiCallRecord; failure: AiFailure };

interface CallScope {
  sourceId?: string;
  chunkIndex?: number;
}

async function executeUnit<T>(
  deps: AiGatewayDeps,
  call: AiCall,
  validate: (value: unknown) => T,
  scope: CallScope = {}
): Promise<UnitResult<T>> {
  const completion = await completeJson({
    transport: gatewayTransport(deps.gateway, call),
    apiKey: deps.apiKey,
    request: { system: call.system, user: call.user, maxTokens: call.maxTokens },
    idempotencyKey: call.idempotencyKey,
    budget: call.maxTokens,
    task: call.task,
    maxTokensForRequest: (request) =>
      computeOutputSafetyCeiling(call.task, request.system, request.user),
    logicalUnitId: call.idempotencyKey,
    invocationFingerprint: call.invocationFingerprint,
    validate
  });
  const base: AiCallRecord = {
    task: call.task,
    schemaVersion: call.schemaVersion,
    promptVersion: call.promptVersion,
    idempotencyKey: call.idempotencyKey,
    maxTokens: call.maxTokens,
    status: completion.status === "succeeded" ? "succeeded" : "failed",
    attempts: completion.attempts,
    consumesApi: completion.status === "failed" ? completion.failure.consumesApi : true,
    inputTokens: completion.usage.inputTokens,
    outputTokens: completion.usage.outputTokens,
    ...(completion.usage.reasoningTokens === undefined
      ? {}
      : { reasoningTokens: completion.usage.reasoningTokens }),
    ...(scope.sourceId === undefined ? {} : { sourceId: scope.sourceId }),
    ...(scope.chunkIndex === undefined ? {} : { chunkIndex: scope.chunkIndex })
  };
  if (completion.status === "succeeded") {
    return { ok: true, record: base, value: completion.value };
  }
  return {
    ok: false,
    record: {
      ...base,
      errorCode: completion.failure.errorCode,
      ...(completion.failure.detail === undefined ? {} : { detail: completion.failure.detail })
    },
    failure: completion.failure
  };
}

function callFromContext(
  task: AiTaskName,
  schemaVersion: string,
  promptVersion: string,
  context: AiCallContext
): AiCall {
  const call = {
    task,
    schemaVersion,
    promptVersion,
    idempotencyKey: context.idempotencyKey,
    maxTokens: context.maxTokens,
    system: context.system,
    user: context.user
  };
  return {
    ...call,
    invocationFingerprint: invocationFingerprint({
      task,
      promptVersion,
      schemaVersion,
      system: call.system,
      user: call.user,
      maxTokens: call.maxTokens
    })
  };
}

// ---------------------------------------------------------------------------
// Call builders
// ---------------------------------------------------------------------------

export function buildTaskACalls(input: {
  source: AiSourceInput;
  course: AiCourseInput;
  chunks: Chunk[];
}): AiCall[] {
  return input.chunks.map((chunk) =>
    callFromContext(
      "task-a",
      TASK_A_SCHEMA,
      PROMPT_VERSIONS.a,
      buildTaskAContext({ source: input.source, course: input.course, chunk })
    )
  );
}

export function buildTaskAConsolidationCall(input: {
  source: AiSourceIdentity;
  chunkValues: unknown[];
  course?: AiCourseInput;
}): AiCall {
  return callFromContext(
    "task-a-consolidate",
    TASK_A_SCHEMA,
    PROMPT_VERSIONS.a,
    buildTaskAConsolidationContext({
      source: input.source,
      chunkValues: input.chunkValues,
      ...(input.course === undefined ? {} : { course: input.course })
    })
  );
}

export function buildTaskBCalls(input: {
  drafts: unknown[];
  constraintCandidates: unknown[];
  courseIndex: AiCourseIndexEntry[];
  evidence?: AiEvidence[];
  course?: AiCourseInput;
}): AiCall[] {
  return [
    callFromContext(
      "task-b",
      TASK_B_SCHEMA,
      PROMPT_VERSIONS.b,
      buildTaskBContext({
        drafts: input.drafts,
        constraintCandidates: input.constraintCandidates,
        courseIndex: input.courseIndex,
        evidence: input.evidence ?? [],
        ...(input.course === undefined ? {} : { course: input.course })
      })
    )
  ];
}

export function buildTaskBExpansionCall(input: {
  base: AiCall;
  requestedObjectIds: string[];
  evidence: AiEvidence[];
}): AiCall {
  return callFromContext(
    "task-b-expand",
    TASK_B_SCHEMA,
    PROMPT_VERSIONS.b,
    buildTaskBExpansionContext({
      baseUser: input.base.user,
      requestedObjectIds: input.requestedObjectIds,
      evidence: input.evidence
    })
  );
}

export function buildTaskCCalls(input: {
  target: AiCourseIndexEntry;
  currentFacts: unknown[];
  currentEvidence: AiEvidence[];
  newEvidence: AiEvidence[];
  identity: unknown;
  userState: unknown;
  coverageFacts: unknown;
  history?: unknown[];
}): AiCall[] {
  return [
    callFromContext(
      "task-c",
      TASK_C_SCHEMA,
      PROMPT_VERSIONS.c,
      buildTaskCContext({
        target: input.target,
        currentFacts: input.currentFacts,
        currentEvidence: input.currentEvidence,
        newEvidence: input.newEvidence,
        identity: input.identity,
        userState: input.userState,
        coverageFacts: input.coverageFacts,
        ...(input.history === undefined ? {} : { history: input.history })
      })
    )
  ];
}

// ---------------------------------------------------------------------------
// Task A
// ---------------------------------------------------------------------------

export interface TaskAValue {
  sourceResult: SourceResult;
  chunkResults: TaskAResult[];
  consolidated?: TaskAResult;
}

function carriesRelevantInformation(result: TaskAResult): boolean {
  return (
    result.sourceResult === "RELEVANT_INFORMATION_FOUND" ||
    result.sourceResult === "PARTIALLY_UNDERSTOOD"
  );
}

/**
 * One Task A call per chunk, then a consolidation call only when more than one chunk carried
 * relevant information. The consolidated result may use only Evidence that already appeared in
 * the chunk results — a Source that was split for size can never gain a fact it never had.
 */
export async function runTaskA(
  deps: AiGatewayDeps,
  input: { source: AiSourceInput; course: AiCourseInput; chunks: Chunk[] }
): Promise<AiRunOutcome<TaskAValue>> {
  const knownSourceIds = new Set([input.source.sourceId]);
  const calls: AiCallRecord[] = [];
  const usage: AiUsage = { inputTokens: 0, outputTokens: 0 };
  const chunkResults: TaskAResult[] = [];

  for (const call of buildTaskACalls(input)) {
    const unit = await executeUnit(
      deps,
      call,
      (value) => {
        assertNoProductInstructions(value);
        return validateTaskA(value, knownSourceIds);
      },
      { sourceId: input.source.sourceId, chunkIndex: chunkResults.length }
    );
    calls.push(unit.record);
    addUsage(usage, {
      inputTokens: unit.record.inputTokens,
      outputTokens: unit.record.outputTokens
    });
    if (!unit.ok) return { status: "failed", failure: unit.failure, calls, usage };
    chunkResults.push(unit.value);
  }

  const relevant = chunkResults.filter(carriesRelevantInformation);
  if (relevant.length <= 1) {
    const only = relevant[0];
    return {
      status: "succeeded",
      value: {
        sourceResult: only === undefined ? "NO_RELEVANT_INFORMATION" : only.sourceResult,
        chunkResults
      },
      calls,
      usage
    };
  }

  const consolidation = buildTaskAConsolidationCall({
    source: input.source,
    chunkValues: chunkResults,
    course: input.course
  });
  const supplied = new Set<string>();
  collectEvidenceIds(chunkResults, supplied);
  const unit = await executeUnit(
    deps,
    consolidation,
    (value) => {
      assertNoProductInstructions(value);
      const result = validateTaskA(value, knownSourceIds);
      const introduced = new Set<string>();
      collectEvidenceIds(result, introduced);
      for (const evidenceId of introduced) {
        if (!supplied.has(evidenceId)) {
          throw new Error(`AI_CONTRACT:consolidation_evidence:${evidenceId}`);
        }
      }
      return result;
    },
    { sourceId: input.source.sourceId }
  );
  calls.push(unit.record);
  addUsage(usage, { inputTokens: unit.record.inputTokens, outputTokens: unit.record.outputTokens });
  if (!unit.ok) return { status: "failed", failure: unit.failure, calls, usage };

  return {
    status: "succeeded",
    value: { sourceResult: unit.value.sourceResult, chunkResults, consolidated: unit.value },
    calls,
    usage
  };
}

// ---------------------------------------------------------------------------
// Task B
// ---------------------------------------------------------------------------

export interface TaskBValue {
  result: TaskBResult;
  /** Evidence expansion rounds that followed the initial call (0, 1 or 2). */
  expansionRounds: number;
}

/**
 * Task B, including the Evidence expansion round trip: when the model names existing canonical
 * objects, the next round carries the original Evidence of exactly those objects. Unknown object
 * ids, invented Evidence and a Same Assessment judgment with no supplied Evidence all fail the
 * unit instead of reaching the reducers.
 */
export async function runTaskB(
  deps: AiGatewayDeps,
  input: {
    drafts: unknown[];
    constraintCandidates: unknown[];
    courseIndex: AiCourseIndexEntry[];
    evidence: AiEvidence[];
    course?: AiCourseInput;
  }
): Promise<AiRunOutcome<TaskBValue>> {
  const indexIds = new Set(input.courseIndex.map((entry) => entry.objectId));
  const knownSourceIds = new Set(input.evidence.map((item) => item.sourceId));
  const suppliedIds = new Set<string>([...indexIds]);
  collectIdsWithKeys(input.drafts, new Set(["draftId"]), suppliedIds);
  collectIdsWithKeys(input.constraintCandidates, new Set(["candidateId"]), suppliedIds);

  const calls: AiCallRecord[] = [];
  const usage: AiUsage = { inputTokens: 0, outputTokens: 0 };
  let call = buildTaskBCalls(input)[0];
  if (call === undefined)
    return {
      status: "failed",
      failure: { errorCode: "AI_CONTRACT", consumesApi: false },
      calls,
      usage
    };
  let suppliedEvidence = evidenceIdsOf(input.evidence);
  const requested = new Set<string>();
  let rounds = 0;

  for (;;) {
    const currentCall = call;
    const currentEvidence = suppliedEvidence;
    const unit = await executeUnit(deps, currentCall, (value) => {
      assertNoProductInstructions(value);
      const result = validateTaskB(value, knownSourceIds);
      const created = new Set<string>();
      collectIdsWithKeys(result, new Set(["proposalId", "draftId", "candidateId"]), created);
      const involved = new Set<string>();
      for (const resolution of result.identityResolutions) {
        for (const objectId of resolution.involvedObjectIds) involved.add(objectId);
      }
      for (const objectId of involved) {
        if (!suppliedIds.has(objectId) && !created.has(objectId)) {
          throw new Error(`AI_CONTRACT:unknown_object_id:${objectId}`);
        }
      }
      const cited = new Set<string>();
      collectEvidenceIds(result, cited);
      for (const evidenceId of cited) {
        if (!currentEvidence.has(evidenceId)) {
          throw new Error(`AI_CONTRACT:evidence_not_supplied:${evidenceId}`);
        }
      }
      for (const resolution of result.identityResolutions) {
        if (
          resolution.relationship === "SAME_ASSESSMENT" &&
          resolution.supportingEvidence.length === 0
        ) {
          throw new Error("AI_CONTRACT:same_assessment_without_evidence");
        }
      }
      return result;
    });
    calls.push(unit.record);
    addUsage(usage, {
      inputTokens: unit.record.inputTokens,
      outputTokens: unit.record.outputTokens
    });
    if (!unit.ok) return { status: "failed", failure: unit.failure, calls, usage };

    const involved = new Set<string>();
    for (const resolution of unit.value.identityResolutions) {
      for (const objectId of resolution.involvedObjectIds) involved.add(objectId);
    }
    const needing = [...involved].filter(
      (objectId) => indexIds.has(objectId) && !requested.has(objectId)
    );
    if (needing.length === 0 || rounds >= MAX_TASK_B_EXPANSION_ROUNDS) {
      return {
        status: "succeeded",
        value: { result: unit.value, expansionRounds: rounds },
        calls,
        usage
      };
    }

    rounds += 1;
    for (const objectId of needing) requested.add(objectId);
    call = buildTaskBExpansionCall({
      base: currentCall,
      requestedObjectIds: needing,
      evidence: input.evidence
    });
    suppliedEvidence = new Set([
      ...suppliedEvidence,
      ...evidenceIdsOf(
        input.evidence.filter(
          (item) => item.objectId !== undefined && needing.includes(item.objectId)
        )
      )
    ]);
  }
}

// ---------------------------------------------------------------------------
// Task C
// ---------------------------------------------------------------------------

export interface TaskCValue {
  result: TaskCResult;
}

/**
 * Task C for one affected canonical object. `coverageSufficient` is a machine fact taken from the
 * deterministic Coverage Facts; it is passed to the validator so that a removal proposal can never
 * exist on its own, and it is never decided here.
 */
export async function runTaskC(
  deps: AiGatewayDeps,
  input: {
    target: AiCourseIndexEntry;
    currentFacts: unknown[];
    currentEvidence: AiEvidence[];
    newEvidence: AiEvidence[];
    identity: unknown;
    userState: unknown;
    coverageFacts: unknown;
    coverageSufficient: boolean;
    history?: unknown[];
  }
): Promise<AiRunOutcome<TaskCValue>> {
  const knownSourceIds = new Set(
    [...input.currentEvidence, ...input.newEvidence].map((item) => item.sourceId)
  );
  const suppliedEvidence = evidenceIdsOf([...input.currentEvidence, ...input.newEvidence]);
  const calls: AiCallRecord[] = [];
  const usage: AiUsage = { inputTokens: 0, outputTokens: 0 };
  const call = buildTaskCCalls(input)[0];
  if (call === undefined) {
    return {
      status: "failed",
      failure: { errorCode: "AI_CONTRACT", consumesApi: false },
      calls,
      usage
    };
  }

  const unit = await executeUnit(
    deps,
    call,
    (value) => {
      assertNoProductInstructions(value);
      const result = validateTaskC(value, knownSourceIds, input.coverageSufficient);
      for (const change of result.changeResults) {
        if (change.targetObjectId !== input.target.objectId) {
          throw new Error(`AI_CONTRACT:unknown_object_id:${change.targetObjectId}`);
        }
        for (const item of [...change.currentEvidence, ...change.newEvidence]) {
          if (!suppliedEvidence.has(item.evidenceId)) {
            throw new Error(`AI_CONTRACT:evidence_not_supplied:${item.evidenceId}`);
          }
        }
      }
      return result;
    },
    { sourceId: input.target.objectId }
  );
  calls.push(unit.record);
  addUsage(usage, { inputTokens: unit.record.inputTokens, outputTokens: unit.record.outputTokens });
  if (!unit.ok) return { status: "failed", failure: unit.failure, calls, usage };
  return { status: "succeeded", value: { result: unit.value }, calls, usage };
}
