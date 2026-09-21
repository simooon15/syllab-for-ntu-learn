# v0.2.0 PRD Baseline → Engineering Freeze Decision Delta

**Purpose:** This document explains how the product and engineering direction evolved after the
original v0.2.0 PRD / Product Handoff / Interaction & IA baseline was locked.

It answers three different questions without mixing them:

1. Which later Product Owner decisions changed or clarified the baseline?
2. Which engineering policies were added because real implementation and real-course evidence
   exposed a missing operational contract?
3. Which ideas were deliberately deferred to the next version rather than added to v0.2.0?

This is a **decision-delta and retrospective input**, not a replacement PRD and not Documentation
Consolidation. The original documents remain the historical baseline. A later decision overrides
that baseline only where this document or `DIRECTION_ADJUSTMENTS_v0.2.0.md` identifies an explicit
Product Owner decision.

## 1. Baseline that did not change

The following central v0.2.0 direction survived implementation and real verification:

- The product is Assessment-centric, not a Blackboard clone, generic planner, or raw-data viewer.
- Current Course State is the trusted center. Course Brief, Semester Dashboard, and Calendar are
  views or outputs of that state, not separate truths.
- The semantic boundary remains:
  `Deterministic Local Logic → AI Semantic Judgment → User Final Decision`.
- Task A, Task B, and Task C retain their original responsibilities. Phase 2 did not redesign the
  AI pipeline.
- Review is a decision queue. AI drafts and provisional maintenance output are not Current Course
  State merely because they have been generated.
- A failure, retry, background check, or Rebuild must not silently destroy trusted state.
- Local-first + BYOK and direct extension-to-DeepSeek runtime remain the v0.2.0 architecture.
- `deepseek-flash` remains the provider model.
- Side Panel + Full-page remain the two product surfaces; Popup remains retired.
- Calendar remains derived from confirmed Current Course State and is not another source of truth.
- v0.2.0 remains English-only, local-only, and does not add cloud sync, Calendar Sync, reminders,
  or a general Todo product.

These items are important because many later changes were **reliability corrections inside this
model**, not a new product direction.

## 2. Product-direction changes after the baseline

### 2.1 Toolbar entry was narrowed to Side Panel on NTU Learn

The baseline permitted broader entry behavior. The later confirmed rule is: when invoked from NTU
Learn, the toolbar entry opens the Side Panel. Full-page remains available for work that needs more
space, but it is not the default NTU Learn toolbar landing behavior.

**Classification:** explicit baseline override.

### 2.2 Not-established Courses use the same card form as neighbouring Courses

The original Interaction Spec said the not-established state should be expressed only visually and
should not show state text. The later decision replaced that rule: the card keeps the same shape as
its neighbours and includes one small explanatory line. It is no longer deliberately styled as a
separate dashed or visually diminished object.

**Classification:** explicit baseline override.

### 2.3 Semester-aware date resolution was added

The initial product direction required confirmed-date-only Calendar export, but did not fully define
how a real course date such as `18 Oct` obtains its year. The later decision added deterministic,
Semester-aware resolution:

- Semester 1 uses the academic-year start year for August–December;
- Semester 2 uses the academic-year end year for January–May;
- dates outside the Semester window, relative dates, and ambiguous dates remain unresolved;
- the current system year is never used to guess a Course date;
- CAL-01 preview and `.ics` export use the same resolved input.

CAL-01 was also given three honest states: all exportable, partly exportable, or dates found but none
exportable.

**Classification:** added product definition, without adding a date editor or Calendar manager.

### 2.4 Calendar was downgraded from a Freeze requirement to an edge capability

Phase 2 planning initially treated a real date/export observation as a desirable verification
target. The Product Owner later decided that v0.2.0 must not select another Course, run another
Rebuild, or spend more AI calls merely to obtain a Calendar sample.

If a confirmed date arises naturally, one CAL-01 + `.ics` smoke test is useful. If not, Calendar is
recorded as `NOT TESTED` and does not block Engineering Freeze. It becomes a blocker only if it
causes data corruption, trusted-state pollution, an Extension crash, or another core regression.

**Classification:** release-readiness priority change; core Calendar semantics did not change.

### 2.5 Rebuild acceptance does not require adoption

The baseline already defined Rebuild as a protected preview followed by an overall choice. Phase 2
made the acceptance consequence explicit:

- live-tab ingestion, provisional-state isolation, and a rebuilt preview prove the Rebuild path;
- `Use rebuilt course` is valid only when the Product Owner trusts the result;
- `Keep current course` is also a valid completed test result;
- QA must never adopt a provisional result merely to make the test look complete.

The final MA6081 run therefore produced a technically FULL Rebuild, but the Product Owner retained
the current course. A new Rebuild was deferred until the next-version AI runtime work.

**Classification:** acceptance interpretation and safety clarification, not a new Rebuild model.

### 2.6 Product-visible states and copy must come from the locked product model

During Gate 3, implementation-only states and phrases such as generic saved/progress language were
found in the UI. The later rule is that an undefined user-visible state or phrase must be removed or
mapped back to Working / Waiting / Saved / Failed and the established recovery semantics. Engineering
must not invent product states to explain implementation details.

**Classification:** product-semantic cleanup rule.

## 3. Trusted-state boundary clarifications and corrections

These items were implicit or explicit in the original PRD, but the first implementation did not
fully preserve them. Phase 1 turned them into tested engineering invariants.

### 3.1 Opportunity Check and Manual Check require real live-tab context

The original intent was opportunity-based checking against real NTU Learn Sources. The implementation
initially launched checks without a `tabId`, which produced zero discovery, meaningless failed
coverage, unnecessary AI calls, and false Review/state changes.

The corrected rule is:

- Manual Check resolves and passes the live NTU Learn tab whenever available;
- background Check without readable NTU Learn context stops silently;
- it makes zero paid AI calls, creates no Review, and does not mutate Current Course State;
- a later opportunity can retry.

Rebuild was brought under the same live-tab rule.

### 3.2 Failed or incomparable coverage is only a Coverage Fact

Old parsed content may be retained for continuity, but it cannot be treated as new machine evidence
when the current attempt did not successfully read that Source. A missing old machine baseline plus
failed current coverage must not become `new-source` or `machine-different`.

Failed, permission-denied, partial, or incomparable coverage can inform coverage and freshness only.
It cannot justify Task A/B/C, a Change, removal, or trusted-state mutation by itself.

### 3.3 Maintenance Task A/B output is workflow-scoped provisional state

The first implementation allowed maintenance Task A/B output to write objects that looked like
trusted Current Course State and could even create Initial Review items. The corrected maintenance
chain is:

`machine-different Source → provisional Task A → provisional Task B → Task C → legal Change Review when needed → user decision → Current Course State`

Task A/B output stays in workflow-scoped staging. It cannot appear in Course Brief or Semester
preview before the legal Task C / Review / decision boundary.

### 3.4 Task C current side is a trusted projection, not a raw snapshot

Task C must compare:

- confirmed trusted current facts and current Evidence;
- new Task A/B structured information and new Evidence from this workflow;
- Task B identity/structural results;
- deterministic Coverage Facts;
- relevant user decision/history state.

Pending and excluded Initial Review drafts are filtered out of the current side. Confirmed objects
and manual additions remain visible. PB-01 added an exact regression for a confirmed Assessment,
simultaneous pending draft, and maintenance Task C.

### 3.5 Initial Review visibility is decision-derived

The initial projection bug treated “not currently pending” as equivalent to trusted. The final rule
uses existing Review Decision semantics:

- Confirm → visible in Current Course State;
- Pending / Defer → not visible;
- Exclude → not visible, while exclusion memory remains available;
- Manual Add → visible.

### 3.6 NEW Assessment maintenance round-trip was completed

A maintenance Assessment can remain provisional through Task A/B, be classified `NEW` by Task C,
enter CRV-02 with its Assessment/Facts/Evidence payload intact, and become trusted only after Confirm.
Exclude leaves it outside Current Course State. Clearing workflow staging cannot strand the Review
with `ASSESSMENT_NOT_FOUND` or a missing payload.

### 3.7 Rebuild and maintenance staging are separate workflow scopes

A Course may have a Rebuild preview while a background maintenance check occurs. Their provisional
states must not overwrite, mix with, or supply inputs to each other. Rebuild preview, maintenance
Task C new state, and trusted Current Course State are three separate boundaries.

## 4. Source completeness and AI-boundary decisions

### 4.1 Local extraction must not make semantic Assessment judgments

Real-run debugging exposed a tendency to treat empty-looking, short, or apparently non-assessment
content as ineligible before Task A. The Product Owner reaffirmed the original three-layer boundary:

- local code captures and normalizes what it can read;
- local code may report technical emptiness, failure, parse coverage, and provenance;
- local code must not decide whether captured course information is semantically an Assessment;
- all captured eligible information is passed to Task A, which makes the semantic judgment.

This is a clarification of the original product model, not a new AI responsibility.

### 4.2 Fail-soft protects trusted state but does not claim completeness

Fail-soft means one terminally failed Source is isolated so that it cannot corrupt trusted state and
does not necessarily destroy all successful work. It does **not** mean another Source substitutes
for it, and it does not mean the Course Brief remains complete. A failed Source can contain a unique
Assessment; therefore partial coverage must be visible and a partial Rebuild cannot be adopted.

The release distinction is now explicit:

- `FULL`: all required Sources complete and normal Review is reached;
- `PARTIAL`: useful provisional output exists, but failed coverage remains; inspection-only;
- `FAIL`: no usable protected result.

### 4.3 One bounded failed-unit recovery pass was added

After the normal Task A pass, terminally failed Task A logical units may receive one independent
recovery attempt:

- only failed units are retried;
- successful units are reused;
- the Course is not rescanned or restarted;
- original captured Source/chunk input is used;
- normal schema, referential, Evidence, fingerprint, and generation checks still apply;
- a second failure remains isolated and inspection-only.

This was added to improve completeness without hiding failure or multiplying paid calls across
successful Sources. It is not semantic pre-filtering and not a whole-Course retry.

## 5. DeepSeek invocation strategy added after the PRD

The original product design locked DeepSeek, `deepseek-flash`, structured output, and Tasks A/B/C,
but did **not** completely productize the invocation strategy. Output ceilings, timeout, repair,
retry, workflow retry, chunking, consolidation, and cache behavior initially emerged as implementation
assumptions.

Phase 2 converted the following into a Product Owner-approved provisional v0.2.0 baseline.

### 5.1 Thinking and reasoning

- Task A/B/C explicitly enable thinking.
- Task A/B/C explicitly set `reasoning_effort: high`.
- Provider defaults are not relied on; `max` reasoning is not used in v0.2.0.
- Reasoning does not replace schema validation, Evidence boundaries, Review, or trusted-state
  protection.
- Reasoning token counts may be recorded in safe QA telemetry; reasoning text must not be stored or
  exposed.

### 5.2 Dynamic output safety ceiling

The old fixed ceilings—including Task A 8k/12k variants, Task B 16k/24k/32k/64k tuning, and Task C
8k—are historical implementation/debug values, not product capability limits.

The approved policy is:

```text
context_margin = max(32,000, ceil(model_context_limit * 0.05))
available_generation = model_context_limit - conservative_estimated_input - context_margin
max_tokens = min(provider_max_output, available_generation, task_guard)
```

Versioned provisional runaway guards are:

| Task | Guard |
| --- | ---: |
| Task A, including consolidation | 96,000 |
| Task B, including expansion | 192,000 |
| Task C | 96,000 |

The guards are safety ceilings, not target outputs or proven permanent requirements. Capability
facts live in versioned application configuration rather than an unverified hard-coded assumption.

### 5.3 Failure-specific retry replaced universal escalation

The old broad path—initial, repair, fresh retry, then generic workflow retry for most contract
failures—amplified cost and often used the wrong recovery for the failure.

The new policy is:

| Failure | v0.2.0 handling |
| --- | --- |
| Explicit truncation | recompute dynamic ceiling, one fresh retry; no JSON repair at the same insufficient ceiling |
| Empty, non-truncated response | one fresh retry; no meaningless JSON repair |
| JSON/schema mismatch | safe local normalization when deterministic, otherwise one targeted repair |
| 429 / 5xx / network/provider transient | workflow retry with backoff; no JSON repair |
| Timeout | one delayed retry, then fail-soft / park |
| Auth / invalid configuration | immediate failure, no retry |

A terminal `AI_CONTRACT` result no longer enters a generic three-attempt workflow retry.

### 5.4 Timeout remained provisional

The provider-call timeout remains 300 seconds. It is explicitly provisional and is not a product
latency promise. It was neither increased merely because ceilings grew nor reduced without reliable
per-call latency evidence.

### 5.5 Invocation fingerprint, cache validity, and idempotency

Successful-result reuse remains required, but validity now includes an invocation fingerprint that
covers provider, model, prompt/schema versions, thinking, reasoning effort, ceiling/retry policy
versions, and normalized semantic input digest. Results from an incompatible old policy cannot be
silently reused as if they were generated under the new configuration.

### 5.6 Completion-time generation guard

Real QA observed an old worker completing after reload / `Keep current` and attempting to recreate
provisional state. The corrected rule is that every asynchronous completion must revalidate current
workflow generation/lease before writing an AI run, staging, provisional output, or workflow
progress. A superseded completion is discarded and may emit safe diagnostic metadata only.

This guard is about ownership, not a short wall-clock allowance for large Courses. Long-running AI
work is expected; polling or UI observation timing must not kill a valid worker.

### 5.7 Safe QA telemetry was expanded

QA-only telemetry now records per-call task/unit identity, attempt type, provider/model, thinking
mode, reasoning effort, computed ceiling, estimated and reported usage, reasoning token count when
available, finish reason, latency, failure/retry class, cache state, and invocation fingerprint.

It must not record API keys, Authorization, cookies, raw prompts/course content, visible model
output, or reasoning text. A local runtime/cost package may preserve safe invocation boundaries and
usage metadata, but remains a local analysis artifact and is not production telemetry.

## 6. Real-verification and release-readiness direction changes

### 6.1 QA uses one product codebase with a separate observation layer

Instead of building a large independent harness, v0.2.0 uses:

- Production Build;
- QA Build from the same product source;
- a one-click real-test runner;
- QA-only telemetry removed mechanically from Production.

The runner observes and records. The Product Owner performs login/MFA, permissions, and product
judgments; scripts do not impersonate human acceptance.

### 6.2 Evidence reuse became the default

Phase 2 was explicitly narrowed to:

`reuse existing evidence → one narrow real Course session → analyze → minimal fix → focused verification → only necessary real re-check → final CI`

Gate 1/2/3, Initial Scan, multiple-Course matrices, Calendar-client import, Backup/Restore, and broad
screenshot campaigns were not repeated merely for reassurance.

### 6.3 One real Course was sufficient by default

MA6081 was selected to cover live-tab discovery, 119 Sources, real ingestion, Task A/B, protected
Rebuild staging, and Manual Check. A second Course was not automatically required for missing
Calendar evidence or another convenience sample; it required a separate Product Owner judgment that
the extra evidence justified the cost.

### 6.4 Final Engineering Freeze evidence

The final post-correction MA6081 workflow reached a technically FULL Rebuild:

- 119/119 discovered Sources completed;
- terminal failed Source count was zero after one bounded failed-unit recovery;
- Task A recorded 216 starts including recovery lineage and 41 consolidation starts;
- Task B completed one base call plus two expansion calls;
- staging held 73 Assessments, 879 Facts, and 521 Evidence records;
- no application-defined output-ceiling truncation remained;
- trusted Course content remained unchanged until the Product Review decision;
- the rebuilt preview was usable with heavy Review burden rather than a candidate explosion;
- `Keep current course` completed the workflow without adopting provisional state.

The current full CI result is 476 tests: Extension 454, Backend 20, Contracts 2. Earlier totals such
as 438, 448, 454, or 464 describe earlier source states or narrower count scopes and must not replace
the final current-source total.

## 7. Ideas and decisions deliberately deferred beyond v0.2.0

These items came from the real run and Product Owner discussion, but were **not** made part of the
v0.2.0 runtime.

### 7.1 Bounded adaptive parallelism

Task A remains serial in v0.2.0. A later version may process independent units in bounded dynamic
waves and may later apply the same principle to independently ready Task B/C units. Before that,
the design needs evidence for provider rate limits, BYOK burst cost, memory, ordering, consolidation,
idempotency, generation ownership, and stale-worker safety.

Parallelism must not change semantic responsibilities, permit early Task B/C execution, or weaken
trusted-state boundaries.

### 7.2 Multi-source / token-aware packing

The long 119-Source run produced a cost/latency baseline for evaluating one-Source-per-unit versus
multi-source or token-aware Task A packs. No structural redesign was justified inside v0.2.0.

### 7.3 User-facing AI progress and developer monitoring

Long-running AI work created understandable anxiety. A next-version product opportunity is a useful
progress surface that proves work is advancing across Task A/B/C without exposing private model
reasoning.

A richer developer-only monitor may show safe invocation state, timing, token counts, unit progress,
retry class, and provider lifecycle. The final v0.2.0 privacy decision still prohibits storing or
exposing raw reasoning text, prompts, or course content in telemetry. A development build does not
waive that policy automatically.

### 7.4 Rebuild again after runtime changes

Because the v0.2.0 rebuilt preview was intentionally not adopted, the Product Owner decided not to
pay for another v0.2.0 Rebuild. The next fresh Rebuild should occur after the next-version runtime,
packing, and bounded-concurrency work is ready.

### 7.5 Mixed/image-only PDF

v0.2.0 remains text-layer-first. Honest partial coverage with no unsupported trusted facts is a known
limitation. OCR, page rasterization, and multimodal parsing are later-version architecture work.

## 8. Concise decision matrix

| Area | Original baseline | Current direction | Nature |
| --- | --- | --- | --- |
| Core model | Assessment-centric Current Course State | unchanged | retained |
| AI stages | Task A/B/C with distinct responsibilities | unchanged | retained |
| Runtime architecture | Local-first + BYOK | unchanged | retained |
| Toolbar on NTU Learn | broader baseline behavior | Side Panel | explicit override |
| Not-established Course | visual-only difference, no text | same card form + one small line | explicit override |
| Date handling | confirmed dates only | Semester-aware deterministic resolution | added definition |
| Calendar Freeze status | desirable real verification | optional edge smoke; `NOT TESTED` non-blocking | priority adjustment |
| Rebuild acceptance | preview then adopt/keep | adoption not required for path acceptance | clarification |
| Check without tab | implementation continued falsely | silent stop, zero AI/Review/state mutation | defect correction |
| Failed coverage | could become false machine evidence | Coverage Fact only | defect correction |
| Maintenance A/B | could leak into live state | workflow-scoped provisional staging | defect correction |
| Task C current side | raw snapshot risk | trusted projection only | defect correction |
| Initial Review drafts | pending/excluded could leak | Confirm/manual-add only | defect correction |
| Pre-AI filtering | implementation tempted semantic filtering | technical capture only; Task A judges meaning | reaffirmed boundary |
| Fail-soft | safety isolation | honest incompleteness + partial non-adoptable | clarified consequence |
| Failed Task A units | whole-flow failure/retry risk | one bounded failed-unit recovery | added engineering policy |
| Thinking | provider/default ambiguity | explicit on + high for A/B/C | approved provisional policy |
| Output budget | low fixed ceilings | task/context-aware safety ceiling | approved provisional policy |
| Retry | broad repair/fresh/workflow escalation | failure-specific | approved provisional policy |
| Cache identity | request/workflow identity | invocation fingerprint included | added safety policy |
| Late completion | stale worker could rewrite staging | completion-time generation guard | closure requirement |
| AI telemetry | limited/debug-oriented | safe metadata only, no reasoning/prompt text | privacy/observability policy |
| Execution | serial | serial in v0.2.0 | retained |
| Parallelism/packing | not defined | next-version candidate | deferred |
| AI progress monitor | not defined | next-version opportunity | deferred |
| Mixed PDF | unresolved technical risk | known text-layer limitation | deferred |

## 9. What must not be rewritten in later consolidation

When Documentation Consolidation eventually updates the formal product set, it must preserve this
history rather than pretending the final state existed from day one:

- Local-first + BYOK was a deliberate v0.2.0 product decision, even though stale repository-wide
  wording still described a backend-only secret boundary.
- The invocation strategy was not fully specified in the original PRD.
- Low fixed output ceilings and the Task B `24k → 32k → 64k` sequence came from implementation and
  F35 debugging; 64k was never the designed product policy.
- Output truncation was an important F35 factor, not the only factor. Empty output, schema mismatch,
  and other contract failures also occurred.
- Dynamic ceilings, explicit high reasoning, failure-specific retry, invocation fingerprints, and
  completion-time generation checks were later corrections approved after real evidence.
- Fail-soft never guaranteed completeness. The bounded failed-unit recovery policy was added later
  to reduce avoidable gaps.
- The final MA6081 Rebuild was technically FULL, but its provisional Course was not adopted.
- Parallelism, packing, a user-facing AI progress experience, and Mixed-PDF expansion belong to a
  later version unless separately promoted by a future Product decision.

## 10. Source trail

This delta is derived from the following repository evidence:

- `PRD_v0.2.0.md` — original formal product baseline;
- `PRODUCT_HANDOFF_v0.2.0.md` — AI contracts and locked handoff baseline;
- `Interaction_and_Information_Architecture_Spec_v0.2.0.md` — original interaction baseline;
- `docs/versions/v0.2.0/DIRECTION_ADJUSTMENTS_v0.2.0.md` — confirmed post-baseline UI,
  Calendar, QA, and interaction adjustments;
- `docs/versions/v0.2.0/TECHNICAL_DESIGN_v0.2.0.md` — Phase 2 invocation correction and
  trusted-state implementation contracts;
- `docs/versions/v0.2.0/PHASE2_DECISION_INSIGHT_TRACKER_v0.2.0.md` — failed-unit recovery,
  future concurrency, and post-correction Rebuild disposition;
- `docs/versions/v0.2.0/GATE3_FINDINGS_v0.2.0.md` and real-test artifacts — real-environment
  defects and evidence;
- final current-source CI and the sanitized local AI runtime/cost trace package.

