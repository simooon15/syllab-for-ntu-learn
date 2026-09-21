# Syllab for NTU Learn v0.2.0 — Final Acceptance

**Result:** PASS  
**Engineering Freeze:** YES  
**Date:** 2026-09-21

## Acceptance basis

- Final integrated PRD, Product Handoff, Interaction & IA, Decision Log, Technical Design, and
  Engineering Report are mutually consistent on material product behavior.
- Phase 2 is PASS / CLOSED. Post-correction MA6081 Rebuild is technically FULL: 119/119 Sources,
  terminal failed Sources 0, Task A/B complete, no artificial-ceiling truncation.
- Applicable Task C maintenance path, Manual Check, trusted-state protection, stale-worker guard,
  and invocation fingerprint/cache behavior passed.
- Final current-source CI passed 476 tests: Extension 454, Backend 20, Contracts 2, plus build,
  strict typecheck, lint, format, manifest, secret, documentation, README, QA build, and build
  separation checks.
- Product-impacting Technical Conflict: NONE. Remaining engineering blockers: NONE.

## Evidence interpretation

The rebuilt preview was `USABLE WITH HEAVY REVIEW BURDEN`. The Product Owner selected
`Keep current course`; adoption is not an acceptance requirement and trusted semantic state stayed
unchanged. No second Rebuild was run.

Calendar/F36 remains `NOT TESTED` because no natural confirmed date was available. Mixed/image-only
PDF remains a known limitation. Neither is represented as a PASS, and neither blocks Engineering
Freeze under the approved v0.2.0 policy.

Raw real-course telemetry and AI request/reasoning/output content are not part of this handoff.
The local analysis export retains only its separately controlled, sanitized metadata package.

## Repository reconciliation

The canonical source is `/Users/simonluo/罗鑫宇/Vibe Coding/Syllab for NTU Learn`. The preserved
historical clone is `/Users/simonluo/罗鑫宇/Vibe Coding/Syllab for NTU Learn__historical-clone-20260921`;
both are independent clones of the same
remote and shared the same pre-v0.2.0 HEAD (`670880f`) before reconciliation. The Codex `457e`
checkout is a detached worktree of the canonical repository at that same historical HEAD. Neither
alternate checkout contained unique commits; the older clone's uncommitted v0.2.0 subset was
superseded by the tested canonical workspace.

No old repository/worktree was deleted, reset, or overwritten. No push, tag, or GitHub Release was
performed.

## Final disposition

v0.2.0 is ready for local consolidation and release readiness. This acceptance does not itself
authorize Phase 3, tagging, pushing, or publishing a GitHub Release.
