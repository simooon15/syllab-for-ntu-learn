# Syllab for NTU Learn v0.2.0 — Engineering Freeze / Final Acceptance Handoff

## Milestone

- Development Complete: YES
- Phase 2: PASS / CLOSED
- Engineering Freeze: YES
- Final Acceptance: PASS
- Final current-source CI: PASS · 476 tests (Extension 454 / Backend 20 / Contracts 2)
- Product-impacting Technical Conflict: NONE
- Remaining engineering blocker: NONE
- Local consolidation and release-readiness documentation are complete. The next milestone is
  Product Owner approval for tag, push, and GitHub Release; none is authorized by this handoff.

## Canonical repository

- Path: `/Users/simonluo/罗鑫宇/Vibe Coding/Syllab for NTU Learn`
- Canonical branch: `main`
- Remote: `https://github.com/simooon15/syllab-for-ntu-learn.git`
- Relationship: the older Vibe Coding directory is an independent clone of the same remote at the
  same historical v0.1.0 HEAD; Codex `457e` is a detached worktree of the canonical repository.
- Reconciliation: current tested workspace retained as source of truth; no alternate checkout had a
  unique commit; no old checkout was deleted/reset/overwritten.

The immutable tested product baseline is `43de61aafd23661abcce3ba9335284f2e752ea41`.
Documentation/packaging closure may follow it without changing product semantics. This handoff does
not tag or publish either commit.

## Current authoritative documents

The four Feishu Core Product Archives are:

1. `PRD_v0.2.0.md` — final integrated product definition.
2. `PRODUCT_HANDOFF_v0.2.0.md` — final Product handoff and delivered status.
3. `Interaction_and_Information_Architecture_Spec_v0.2.0.md` — final screen/interaction contract.
4. `AI_DESIGN_v0.2.0.md` — current AI behavior and policy.

`README_v0.2.0.md` is the independent immutable released README snapshot, not one of the four
Feishu Core Product Archives.

Additional authoritative engineering, decision and verification records are:

5. `DECISION_LOG_v0.2.0.md` — chronological durable decision source.
6. `ENGINEERING_REPORT_v0.2.0.md` — implementation, corrections, evidence, CI, reconciliation,
   known limitations, and deferred engineering work.
7. `TECHNICAL_DESIGN_v0.2.0.md` — final technical contract.
8. `FINAL_ACCEPTANCE_v0.2.0.md` — document-and-evidence-based acceptance result.
10. `FINAL_PROJECT_CLOSURE_v0.2.0.md` — local closure and exact public-artifact contract.
11. `RELEASE_NOTES_v0.2.0.md` — user-facing release summary and limitations.
12. `LOCAL_WORKSPACE_CONSOLIDATION_v0.2.0.md` — repository/artifact inventory and post-release
    cleanup plan.

## Historical/reference documents

- `PRD_TO_ENGINEERING_FREEZE_DECISION_DELTA_v0.2.0.md` — baseline-to-final history; must not be
  rewritten as if later decisions were original.
- `DIRECTION_ADJUSTMENTS_v0.2.0.md` — historical post-baseline Product Owner instructions.
- `PHASE2_DECISION_INSIGHT_TRACKER_v0.2.0.md` — historical Phase 2 sequence.
- `GATE3_FINDINGS_v0.2.0.md` — historical findings, not final status.
- `CURRENT_ENGINEERING_STATE_v0.2.0.md` — superseded 2026-09-19 takeover snapshot.
- `DEEPSEEK_INVOCATION_STRATEGY_v0.2.0.md` — invocation audit/history supporting the final policy.

## Known limitations

- Calendar/F36 had no natural confirmed-date sample in Phase 2 and remains `NOT TESTED`;
  non-blocking under the approved edge-capability policy.
- Mixed/image-only PDF remains text-layer-only; OCR/multimodal expansion is deferred.
- The final rebuilt preview was usable with heavy Review burden and was not adopted.
- Task A remains serial; parallelism and multi-source/token-aware packing are deferred.
- A privacy-safe AI progress experience is deferred; reasoning text remains prohibited.

## Security and evidence boundary

This compact handoff contains no API key, Authorization header, cookie, login/profile, raw NTU
private content, QA Chrome profile, or raw AI prompt/reasoning/output stream. Large local runtime and
cost exports remain outside this package.
