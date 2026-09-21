# Syllab for NTU Learn v0.2.0 — Decision Log

**Status:** FINAL · Engineering Freeze / Final Acceptance  
**Rule:** Entries remain chronological. Later entries supersede earlier ones explicitly; history is
never rewritten to make a later policy look original.

This is the durable decision source for v0.2.0. `DIRECTION_ADJUSTMENTS_v0.2.0.md` and
`PHASE2_DECISION_INSIGHT_TRACKER_v0.2.0.md` remain historical inputs, not parallel current
authorities. The final product truth is integrated into `PRD_v0.2.0.md`; implementation detail is
owned by `ENGINEERING_REPORT_v0.2.0.md` and `TECHNICAL_DESIGN_v0.2.0.md`.

| ID | When | Decision | Disposition / supersession |
| --- | --- | --- | --- |
| D020-001 | Product baseline | Assessment-centric Current Course State; Task A/B/C; Review as decision queue; Local-first + BYOK; Side Panel + Full-page | Retained |
| D020-002 | Development | Add restrained motion, no underlined clickable text, official locked Product Mark, consistent shell masthead and header alignment | Added visual direction; detailed history in Direction Adjustments §2.1–2.15 |
| D020-003 | Development | Gate 1/2 are one-command automation with machine-readable evidence; screenshots regenerate from the rendered product | Added acceptance infrastructure |
| D020-004 | Development | Semester-aware deterministic date resolution and CAL-01 all/partial/none-exportable states | Added product definition; no date guessing/editor |
| D020-005 | Development | Dashboard Course cards alternate two tones; not-established Course uses the same card form plus one small line | Supersedes original Interaction Spec §3.5 visual-only/no-text rule |
| D020-006 | Gate 3 | On NTU Learn, toolbar entry opens Side Panel | Supersedes broader baseline toolbar landing rule |
| D020-007 | Gate 3 | Production and QA builds share product source; QA layer observes only; one-click runner records while Product Owner performs login, permissions, and product judgment | Added acceptance rule; no large separate harness |
| D020-008 | Gate 3 | Undefined user-visible implementation states/copy must be removed or mapped to the locked product model | Added semantic-cleanup rule |
| D020-009 | Phase 1 | Manual Check, opportunity Check, and Rebuild must carry readable live NTU tab context; background no-tab failure is silent, zero-AI, zero-Review, state-preserving | Clarifies/fixes original failure semantics |
| D020-010 | Phase 1 | Failed, permission-denied, partial, or incomparable coverage is Coverage Fact only; stale parsed data cannot become current `new-source` evidence | Added deterministic guard |
| D020-011 | Phase 1 | Maintenance Task A/B output is workflow-scoped provisional state; Task C current side uses trusted projection only | Corrects implementation boundary |
| D020-012 | Phase 1 | Pending, deferred, and excluded Initial Review drafts are not Current Course State; Confirm/manual add are | Clarifies Review Decision semantics |
| D020-013 | Phase 1B | NEW maintenance Assessment survives CRV-02 payload round-trip and becomes trusted only after Confirm | Completes locked maintenance loop |
| D020-014 | Phase 1B | Rebuild and maintenance staging are workflow-scoped and cannot mix | Added workflow-safety rule |
| D020-015 | Phase 2 planning | Reuse evidence; use one narrow real Course by default; rerun only affected scenarios; run final CI only if engineering files changed | Added cost/evidence policy |
| D020-016 | Phase 2 planning | Calendar/F36 is an edge capability for Freeze; natural confirmed date may be smoke-tested, absence is `NOT TESTED` and non-blocking | Supersedes Calendar-as-hard-Freeze-evidence expectation |
| D020-017 | Phase 2 planning | Rebuild path acceptance requires live ingestion, isolation, and preview, not adoption; Keep Current is valid | Clarifies baseline Rebuild choice |
| D020-018 | Phase 2 | Deterministic local logic must not semantically pre-filter captured information before Task A | Reaffirms original AI boundary |
| D020-019 | Phase 2 | Fail-soft isolates failure and protects state but does not imply replacement or completeness; partial Rebuild is inspection-only | Clarifies completeness consequence |
| D020-020 | Phase 2 | After normal Task A pass, run one bounded recovery for terminal failed units only; reuse successful units | Added operational completeness policy |
| D020-021 | Invocation correction | Task A/B/C explicitly enable thinking with `reasoning_effort=high`; do not use `max` in v0.2.0 | Added approved provisional invocation policy |
| D020-022 | Invocation correction | Replace low fixed product ceilings with task/context-aware dynamic safety ceilings; guards A 96k, B 192k, C 96k | Supersedes 8k/12k/16k/24k/32k/64k implementation/debug ceilings |
| D020-023 | Invocation correction | Use failure-specific retry: truncation fresh retry, empty fresh retry, schema targeted repair, transient workflow backoff, timeout one delayed retry, auth/config no retry | Supersedes universal contract repair/retry chain |
| D020-024 | Invocation correction | 300s provider timeout remains provisional; it is not a latency promise | Retained temporarily pending latency data |
| D020-025 | Invocation correction | Cache/resume validity includes invocation fingerprint; completion-time generation/lease validation discards stale workers | Added closure requirement |
| D020-026 | Invocation correction | QA telemetry may retain safe usage/timing/token metadata, never reasoning text, prompts/course content, credentials, cookies, or secrets | Added privacy/observability rule |
| D020-027 | Post-correction real run | MA6081 Rebuild is technically FULL at 119/119 Sources; preview is usable with heavy Review burden; Keep Current chosen | Final v0.2.0 real disposition; preview not adopted |
| D020-028 | Freeze | Adaptive parallelism, multi-source/token-aware packing, AI progress monitoring, and Mixed-PDF/OCR expansion move to a later version | Explicitly deferred, not v0.2.0 capability |
| D020-029 | Freeze | Do not pay for another v0.2.0 Rebuild; rebuild after next-version runtime changes | Final operational disposition |

## Historical facts that must remain visible

- The original PRD did not fully define DeepSeek invocation strategy.
- Low fixed output ceilings were implementation assumptions. Task B's `24k → 32k → 64k` sequence
  was F35 debugging, not designed policy.
- Truncation was important but not F35's only failure class; empty output and schema/contract
  failures also occurred.
- Dynamic ceilings, explicit high reasoning, failure-specific retry, fingerprints, stale-worker
  protection, and failed-unit recovery were evidence-led later decisions.
- The final rebuilt state was not adopted, even though the technical Rebuild was FULL.

