# Syllab for NTU Learn v0.2.0 — Engineering Report

**Status:** FINAL · Development Complete · Engineering Freeze accepted
**Final current-source CI:** PASS · 476 tests (Extension 454 / Backend 20 / Contracts 2)

## 1. Delivered implementation

v0.2.0 delivers the local-first/BYOK Chrome MV3 product defined by the final PRD: Semester and Course
discovery, Initial Scan, Initial Review, trusted Current Course State, Course Brief, Manual Add/Edit,
Opportunity and Manual Check, Task C Change analysis and Change Review, protected Rebuild preview,
Calendar planning/export, Backup/Restore, Settings, Side Panel, and Full-page surfaces.

The extension calls DeepSeek directly with the user's locally held key. Production and QA builds
share product source; QA-only telemetry and fixtures are mechanically absent from Production.

## 2. Material corrections made during development

- Restored real announcement body extraction and real attachment redirect/download/parse paths.
- Added runtime Semester/Course enrollment instead of fixture-only Course creation.
- Passed live tab context to Check and Rebuild; no-tab background failure is silent and state-safe.
- Prevented failed/incomparable coverage and stale parsed content from becoming false machine change.
- Separated trusted state, Rebuild staging, and maintenance workflow staging.
- Made Task C current context a trusted projection and its new side workflow-scoped.
- Completed NEW Assessment Change Review payload/Confirm/Exclude round-trip.
- Prevented pending/deferred/excluded Initial Review drafts from leaking into product views.
- Added revision, fingerprint, idempotency, and completion-time generation guards.
- Preserved full Source coverage semantics: local extraction does not decide Assessment meaning before
  Task A.

## 3. Final AI invocation strategy

Provider/model remain DeepSeek / `deepseek-flash`. Task A/B/C explicitly request thinking and
`reasoning_effort=high`. The versioned dynamic ceiling policy is:

```text
context_margin = max(32,000, ceil(model_context_limit * 0.05))
available_generation = model_context_limit - conservative_estimated_input - context_margin
max_tokens = min(provider_max_output, available_generation, task_guard)
```

Provisional guards: A 96k (including consolidation), B 192k (including expansion), C 96k. They are
runaway guards, not expected output or product capability promises. Provider timeout remains 300s,
provisional.

Failure handling is class-specific. Truncation recomputes and fresh-retries once; empty non-truncated
output fresh-retries once; schema failure receives safe normalization or one targeted repair;
transient transport uses workflow backoff; timeout gets one delayed retry then fail-soft; auth/config
fails immediately. Terminal contract failure does not re-enter generic three-round workflow retry.

One bounded Task A failed-unit recovery pass may run after the normal pass. Successful units are
reused. Cache identity includes invocation fingerprint. Superseded async workers are rejected at
completion before any AI-run, staging, provisional, or workflow write.

## 4. Real QA evidence

Post-correction workflow `wf_922463ab20c7ad37920c1e09`:

- real NTU Learn and real DeepSeek;
- 119/119 Sources complete; terminal failed Sources 0;
- Task A 216 starts including recovery lineage; Task A consolidation 41 starts;
- Task B one base call plus two expansion calls;
- staging: 73 Assessments / 879 Facts / 521 Evidence / 72 Review items;
- no application-defined output-ceiling truncation;
- one bounded failed-unit recovery reused prior successful work;
- one stale-worker completion was safely discarded;
- trusted Course content stayed unchanged through provisional processing;
- Review classified `USABLE WITH HEAVY REVIEW BURDEN`, not candidate explosion;
- technical Rebuild `FULL`; Product Owner chose `Keep current course`, so staging was cleared and
  trusted semantic content remained unchanged.

Manual Check `wf_615f8f1e6b2f435db3799ee1` passed with live tab, 119 observations, zero machine
changes, zero AI calls, zero new Review/Change, and unchanged trusted semantic state.

## 5. Verification

Final `npm run ci` passed formatting, build, strict typecheck, ESLint, all automated tests, manifest
validation, secret scan, documented-facts verification, README screenshot verification, QA build,
and Production/QA separation. Total: 476 tests (454 Extension, 20 Backend, 2 Contracts).

Gate 1/2 and earlier Gate 3 artifacts remain historical evidence and were not rerun after Phase 2.
The final source is supported by current CI plus the narrow post-correction real workflow.

## 6. PRD → Final Implementation Reconciliation

| Material item | Original baseline | Final accepted state | Type | Decision | Authority |
| --- | --- | --- | --- | --- | --- |
| Assessment-centric model | Current Course State, A/B/C, Review | implemented as designed | Retained | D020-001 | Final PRD |
| Local-first + BYOK | direct extension runtime | implemented as designed | Retained | D020-001 | Final PRD / Technical Design |
| Toolbar entry | context-aware mixed landing | NTU Learn toolbar always Side Panel | Changed | D020-006 | Final PRD / Interaction Spec |
| Not-established card | visual-only, no state text | same card form + one small line | Superseded | D020-005 | Interaction Spec §3.5 |
| Date resolution | confirmed-date export; year underspecified | deterministic Semester-aware year resolution | Added | D020-004 | Final PRD / Technical Design |
| Calendar Freeze evidence | broad release acceptance expectation | natural smoke only; `NOT TESTED` non-blocking | Changed | D020-016 | Decision Log / Final Acceptance |
| Rebuild | protected preview then Use/Keep | implemented; adoption not required for path acceptance | Clarified | D020-017 | Final PRD / Interaction Spec |
| Check failure | silent retry intent | live-tab guard; no-tab = zero AI/Review/state mutation | Clarified | D020-009 | Final PRD / Technical Design |
| Failed coverage | no removal on failure | Coverage Fact only; cannot create machine evidence | Clarified | D020-010 | Technical Design |
| Maintenance state | A/B/C change chain | workflow staging + trusted Task C current side | Clarified | D020-011–014 | Technical Design |
| Pre-AI semantic boundary | local facts, AI semantics | no local Assessment pre-filter | Clarified | D020-018 | Final PRD |
| Fail-soft | protect trusted state | partial is honest, inspection-only, not complete | Clarified | D020-019 | Final PRD / Technical Design |
| Invocation strategy | not fully defined | explicit high reasoning + dynamic ceilings | Added | D020-021–022 | Final PRD / Technical Design |
| Retry | malformed/truncated open question | failure-specific policy | Added | D020-023 | Technical Design |
| Cache/stale workers | not fully defined | fingerprint + completion generation guard | Added | D020-025 | Technical Design |
| Failed-unit recovery | not defined | one bounded failed-only recovery | Added | D020-020 | Decision Log / Technical Design |
| Parallelism/packing | not defined | intentionally serial; later-version research | Deferred | D020-028 | Decision Log |
| AI progress monitor | not defined | later-version opportunity; no reasoning-text exposure | Deferred | D020-028 | Decision Log |
| Mixed PDF | open technical question | text-layer limitation; OCR/multimodal deferred | Deferred | D020-028 | Decision Log |

The full historical comparison remains in
`PRD_TO_ENGINEERING_FREEZE_DECISION_DELTA_v0.2.0.md`; it is intentionally not rewritten as final
design provenance.

## 7. Known limitations

- Mixed/image-only PDF pages are not OCRed or sent through a multimodal path. Coverage must remain
  honest and unsupported facts must not become trusted.
- Calendar/F36 had no natural confirmed-date sample in Phase 2 and remains `NOT TESTED`; this does
  not block Freeze unless Calendar corrupts core state or crashes the extension.
- The final rebuilt preview carried heavy Review burden (14 normalized-title duplicate groups over
  38 Assessment objects), though it was finite and usable.
- Task A is serial and long-running; runtime/packing/parallelism work is deferred.
- Real PPTX/DOCX, legacy Office, isolated corrupt/no-text/oversize samples do not all have current
  real-environment coverage.

## 8. Deferred technical opportunities

Adaptive bounded parallelism, multi-source/token-aware packing, a privacy-safe AI progress surface,
richer developer monitoring, and Mixed-PDF/OCR/multimodal support belong after v0.2.0. They are not
release claims.

## 9. Engineering conclusion

Development Complete: YES. Engineering blockers: NONE. Product-impacting Technical Conflict: NONE.
The tested product source is frozen at `43de61aafd23661abcce3ba9335284f2e752ea41`.
Repository reconciliation found no unique alternate commits, and Final Acceptance passed. Later
documentation/packaging closure does not change product semantics.
