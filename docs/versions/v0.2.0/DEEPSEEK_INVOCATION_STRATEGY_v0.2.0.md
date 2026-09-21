# DeepSeek Invocation Strategy — v0.2.0 provisional baseline

This record captures the invocation correction approved during Phase 2. It does not replace the
product handoff or change Task A, Task B, or Task C responsibilities.

## Current baseline

Syllab uses DeepSeek `deepseek-flash` through the local-first BYOK extension transport. Task A,
Task B, and Task C send structured JSON and retain deterministic schema, referential, Evidence,
Review, and trusted-state checks. Thinking is explicitly enabled with `reasoning_effort: high` for
all three tasks; reasoning text is never stored or exposed.

The capability facts are versioned in `extension/src/v2/invocation-policy.ts`. They were checked
against the DeepSeek Chat Completions and model documentation on 2026-09-20:

- https://api-docs.deepseek.com/api/create-chat-completion/
- https://api-docs.deepseek.com/guides/thinking_mode/
- https://api-docs.deepseek.com/quick_start/pricing/

The local capability configuration is not a remote registry. A later provider capability change
requires an explicit versioned update.

## Dynamic safety ceiling

The output ceiling is a runaway safety guard, not a product capability limit:

```text
context_margin = max(32,000, ceil(model_context_limit * 0.05))
available_generation = model_context_limit - conservative_estimated_input - context_margin
max_tokens = min(provider_max_output, available_generation, task_guard)
```

The provisional task guards are:

- Task A and Task A consolidation: 96,000;
- Task B and Task B expansion: 192,000;
- Task C: 96,000.

The old 12k / 64k / 8k values were implementation and F35-debugging ceilings, not the original
product policy. Task B passed through 24k, 32k, and 64k during debugging; 64k must not be rewritten
as the original design value. Low output ceilings were an important F35 factor, but F35 also
contained empty-content and schema-contract failures.

## Failure-specific retry policy

- Explicit truncation: recompute the dynamic ceiling and make one fresh retry; no same-ceiling JSON
  repair and no generic AI_CONTRACT workflow retry.
- Empty non-truncated response: one fresh retry; no JSON repair.
- JSON/schema mismatch: one targeted repair, then fail.
- 429, 5xx, transient network/provider failure: workflow retry with existing backoff.
- Timeout: one delayed retry, then fail-soft/park; no JSON repair.
- Authentication and invalid configuration: fail immediately.

### Failed-unit recovery pass (Phase 2 operational decision)

After the normal Task A source/unit pass completes, the workflow may collect the Task A logical
units that ended in a terminal AI contract failure and run one bounded recovery pass for those
units only. A recovery pass reuses the original captured Source/chunk input and the same Task A
contract; it does not re-run successful units, apply a local semantic filter, or send a whole
Course through Task A again. Recovery results are validated with the normal schema, referential,
Evidence, and state-boundary checks before they can be included in consolidation and Task B.

The pass is single-shot per failed logical unit for a workflow. A unit that still fails remains
isolated under the existing Source-level fail-soft rule and cannot enter trusted Current Course
State. This is a bounded completeness recovery strategy, not a generic retry loop; its physical
calls must be separately labelled in QA telemetry so its benefit and cost can be reviewed.

Rebuild retains Source-level fail-soft and keeps failed/partial output inspection-only. Terminal
AI_CONTRACT results do not enter the generic three-attempt workflow retry.

The 300-second provider timeout remains provisional. It is not a product latency commitment.

## Telemetry and cache identity

QA telemetry records safe per-physical-call metadata: task, logical unit, attempt type, provider,
model, thinking mode, reasoning effort, computed ceiling, estimated/provider-reported usage,
reasoning token count when supplied, finish reason, latency, failure class, retry type, cache state,
and invocation fingerprint. It never records reasoning text, prompts, course content, credentials,
cookies, or authorization headers.

Successful AI-run reuse remains available for retry/resume/reload. An invocation fingerprint now
covers provider/model, prompt/schema versions, thinking/reasoning settings, ceiling/retry policy
versions, computed ceiling, and a non-secret semantic request digest. A result created under an
older invocation policy is not reused by the new policy.

Async workflow completion rechecks the active workflow lease before writing AI runs, staging, or
provisional state. A superseded worker's late result is discarded and may emit only a safe
diagnostic event.

The recovery decision was added after Phase 2 real-course observation showed that a small number of
terminal Task A contract failures could make an otherwise healthy ingestion stop short of a normal
preview. It is recorded as an operational decision, not as an original v0.2.0 product assumption.
