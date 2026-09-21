# Phase 2 Decision & Insight Tracker — v0.2.0

> **HISTORICAL INPUT · CONSOLIDATED.** Phase 2 的 durable Decision source 是
> `DECISION_LOG_v0.2.0.md`。本文保留当时记录顺序，不删除、不倒写历史。

This is an append-only engineering trace for Phase 2 decisions, observations, defects, and
dispositions. It preserves what was learned during real verification without rewriting the
original product or invocation design as if these decisions had existed from the start.

## Entry 001 — bounded Task A failed-unit recovery

- **Date:** 2026-09-20 (UTC)
- **Trigger:** The post-correction MA6081 Rebuild reached Task A with successful real ingestion and
  many successful Task A units, but a small number of terminal `AI_CONTRACT` units prevented a
  normal rebuilt preview.
- **Decision:** After the normal Task A pass, collect terminal failed Task A logical units and run
  one independent recovery pass for those units only. Successful units are not re-run and the
  whole Course is not restarted. Recovery uses the original captured Source/chunk input and the
  unchanged Task A contract.
- **Boundaries:** Recovery is single-shot per failed logical unit, is validated through the normal
  schema/referential/Evidence checks, and must complete before Task A consolidation/Task B consumes
  the result. A second failure stays isolated and inspection-only; it cannot mutate trusted Current
  Course State.
- **Why:** This targets completeness of a real Course without hiding failures or multiplying calls
  across already successful Sources. It does not perform semantic pre-filtering before Task A.
- **Evidence to retain:** workflow ID, failed unit IDs, failure class, recovery attempt type,
  recovery result, physical-call count, and before/after trusted-state fingerprints.
- **Status:** Implemented and observed in the MA6081 post-recovery workflow. Successful Task A
  units were reused, one bounded recovery pass completed the remaining unit, and the recovered
  result was consumed by consolidation/Task B without changing the trusted Course State.

## Entry 003 — MA6081 post-recovery evidence boundary

- **Date:** 2026-09-21 (UTC)
- **Workflow:** `wf_922463ab20c7ad37920c1e09`
- **Observation:** The resumed workflow reached `waiting / review` after 119/119 Source coverage,
  216 Task A invocation starts (including recovery lineage), 41 consolidation starts, one Task B
  call and two Task B expansion calls. Staging contained 73 assessment drafts, 879 facts, 521
  evidence records and 72 review items; trusted Course State remained at revision 14.
- **Disposition:** Evidence is a valid rebuilt preview boundary, not an adoption decision. The
  preview remains provisional until the user performs the existing Review decision. The local
  AI Runtime Cost Analysis and Full QA AI Trace exports preserve the raw telemetry and stream
  records without credentials.

## Historical facts to preserve

- Local extraction passes mechanically captured Source information to Task A; it did not decide
  Assessment meaning before the model.
- F35 included truncation/contract failures, but was not caused by output ceiling alone; empty
  content and schema failures remain distinct failure classes.
- A failed Source is isolated for safety. The recovery pass is intended to reduce avoidable
  incompleteness, not to turn fail-soft into silent success.

## Entry 002 — future bounded Task A concurrency

- **Date:** 2026-09-20 (UTC)
- **Status:** Next-version candidate; deliberately not implemented in v0.2.0.
- **Proposal:** Process independent Task A Source units in bounded batches instead of one unit at a
  time. The batch width should be dynamic rather than a fixed product promise (for example, a
  course with 119 units could be processed in several batches of roughly 20–30 when the provider,
  device, and current rate-limit conditions safely allow it).
- **Failure handling:** After the normal batches finish, run the bounded failed-unit recovery pass
  for failed units only. A successful unit is not re-run, and a failed recovery remains isolated.
- **Required design evidence before implementation:** provider rate-limit behavior, BYOK burst cost,
  memory/latency measurements, ordering and consolidation dependencies, invocation idempotency,
  lease/generation ownership, and stale-worker completion behavior under parallel workers.
- **Product boundary:** This is an execution-speed optimization. It must not add semantic
  pre-filtering, change Task A/B/C responsibilities, or allow provisional output into trusted
  Current Course State.
- **Stage hand-off extension:** A later version may use the same bounded approach for Task B and
  Task C once each stage reaches its deterministic readiness boundary. Task B must not start until
  the required Task A results and consolidation inputs are complete; Task C must not start until
  the trusted current side, accepted Task B identity/structure, new Evidence, and Coverage Facts
  are complete for its target. Independent B/C logical units may then run in dynamic batches, while
  their final merge, Change Review, user decision, and trusted-state adoption remain deterministic
  and generation-guarded.

## Entry 004 — post-correction Rebuild closure

- **Date:** 2026-09-21 (UTC)
- **Workflow:** `wf_922463ab20c7ad37920c1e09`
- **Technical result:** FULL. All 119 discovered Sources completed Task A coverage after one bounded
  failed-unit recovery pass; final terminal failed Source count was zero. Task B completed one base
  call and two expansion calls. No application-defined output ceiling truncation occurred, and the
  long-running serial workflow reached a normal Rebuild Review without lifecycle termination.
- **Review sanity:** The provisional preview contained 73 assessments, 879 facts and 521 Evidence
  records. Static inspection found no exact normalized fact duplication, while 14 normalized-title
  groups covering 38 assessment objects created a heavy but finite Review burden. The preview was
  classified as usable with heavy Review burden, not as a candidate explosion.
- **Decision:** Keep current course. The provisional rebuilt result was not adopted; staging was
  cleared and the workflow completed. Trusted Course content remained semantically unchanged. Its
  revision moved from 14 to 15 only to record the Review decision and history.
- **Next-version disposition:** Do not spend another v0.2.0 DeepSeek run solely to adopt this
  preview. Rebuild again after the planned next-version AI runtime, packing and bounded-concurrency
  work is ready, then make a fresh Product Review decision.
- **Telemetry policy:** The local runtime/cost package retains invocation boundaries, usage,
  timing, token counts, fingerprints and retry metadata. Request context, course text, visible model
  output and model reasoning text were removed; only safe stream metadata remains. The final export
  covers the workflow through its terminal Review decision.

## Future entries

Append new decisions and evidence here with date, trigger, decision, boundaries, and status. Do not
delete or rewrite earlier entries when a later implementation changes the outcome.
