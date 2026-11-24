# Product → Engineering Handoff | P2E-v0.3.0-2026-11-25-066

Status: READY / PHASE 1 REMEDIATION ONLY / ZERO NEW PAID AI CALLS / HUMAN GATE 5 NOT PASSED / NO RELEASE
From: Product Side (Product Owner + ChatGPT)
To: Engineering Side (current authorized development Agent)
Updated At: 2026-11-25 (Asia/Singapore)
Project: Syllab for NTU Learn v0.3.0
Project ID: `03837f29ef364a71b6aacc6e138732a0`
Handoff ID: `P2E-v0.3.0-2026-11-25-066`
Source engineering Handoff: `d0d5723257004f8a96f032db699cb7f1` (2026-11-25 00:01 SGT; source Git HEAD `a52d40c40cea25f24c0683cb47b475fed95b39a3`; subsequent audit fixes not yet committed/pushed per report).

## Changed Files / Sync Scope
- `docs/collaboration/CHATGPT_TO_CODEX_HANDOFF.md`

## 1. Owner direction and scope

Owner has approved continuing v0.3.0 refinement instead of stopping at the earlier engineering checkpoint. No separate re-onboarding, new version, feature exploration, or wholesale redesign. Preserve the established workflow, trusted/provisional distinction, single Assessment card / organized details / Evidence on demand, Review boundaries, existing visual system (Fraunces for headings/large numbers; sans-serif for body/controls), and local-first/BYOK. Phase 1 fixes known defects and bounded engineering debt; Phase 2 evaluates AI quality and efficiency, Phase 3 refines real product experience, Phase 4 final validation/delivery. Only Phase 1 is authorized to execute now. Do not start later phases autonomously.

Engineering Side is a role, not a particular Agent. Use GPT Drive Codex v0.2.0, existing project binding, same canonical repository and shared baseline; retain old configured Handoff paths. Finish previous writer before another writes; no competing implementations. Check the current canonical root, branch, worktree, remote, dirty state and existing project binding with doctor before inbound plan/apply/inspect. Do not re-init or rename Handoffs. Review current E2P and manifest before acting. Preserve the earlier P2E-065 history and already authorized checkpoint work; this instruction supersedes its stop-after-checkpoint direction, not its privacy and release boundaries.

## 2. Phase 1 product requirements

All ten known UI defects in the latest E2P are in scope. Confirm actual reproduction and fix if still present; if already resolved, record evidence, do not redo.

- UI-01 OPEN_SCREEN: preserve semester context; current/historical selection actually works on both surfaces.
- UI-02 CRS-06: empty course can open Add Assessment, preserving existing manual-add semantics.
- UI-03 BKP-04: Done on restore failure exits correctly; no partial restore or loss of original state.
- UI-04 RBL-01: Back returns to the correct prior surface/context without initiating Rebuild.
- UI-05 same-screen re-render preserves scroll and relevant focus/drafts; do not force old position onto a genuinely new screen or course.
- UI-06 SYS-07 error feedback remains readable and actionable; transient success/undo behavior remains intact. Follow existing IA; do not invent a new error subsystem.
- UI-07 Settings from Side Panel opens proper full-page Settings where required and retains side-panel/task context.
- UI-08 Enter does not refresh extension page; preserve intended submit/keyboard behavior and validation.
- UI-09 course-name/course-card-status styling no longer conflicts; retain current design tokens and typography.
- UI-10 accessible names and reading order convey actual fact values and status; keyboard operation and focus remain usable.

Product behavior (PRD v0.3.0 §§6.0, 6.1, 6.7, 7, 8.5; IA §§11–14; inherited v0.2.0 rules):

- PR-01 Paid retry and cache. Fix PAID_UNVERIFIED deadlock without automatically redispatching an ambiguous/possibly charged request or releasing its reservation. Only verified safe retry may redispatch under existing authorization; verified successful outputs are reused. Preserve unknown records, bounded technical recovery, semantic-round separation, ownership and stale-writer protection. Independent safe tasks may progress; unresolved scopes stay explicit and recoverable. Invalid, incomplete or stale audit cache is not valid completion; preserve raw/evidence/history and do not silently promote unverified results. No new paid calls, wallet queries/reconciliation, reservation release or new provider experiments in this phase.
- PR-02 Opportunity Checking. Current semester retains automatic checks; historical semester defaults to no automatic checks; manual behavior follows existing rules. Background failure uses bounded backoff and quiet single-failure behavior; prolonged failure can surface Needs attention. Missing or inaccessible Source is not removal, and no change yields quiet end/no AI/no Review. Exact backoff and scheduling are engineering design under existing policy.
- PR-03 ISC-03/04. Missing API key/permission/authorization enters specific Waiting state with actionable route to settings; configuration recovery resumes existing context and reuses checkpoint where valid. Do not duplicate workflows or label missing permission as empty course.
- PR-04 Permissions and privacy. Align discovery/fetch/runtime permissions with intended project allowlist and least privilege; do not broaden permission merely to bypass an error. Filter secrets, credentials, tokens and irrelevant private fields before AI context or shared artifacts; preserve legitimate course content and evidence. Review flattenCapturedFields and relevant entry paths. No real user data or private QA profile exposure.
- PR-05 Spreadsheet discovery. Recognize .xlsx/.xls and maintain original Source identity, format-aware sheet/cell/range locators, provenance and honest coverage; legacy formats follow existing canonicalization capability. Do not claim unsupported/partial formats as complete or add local semantic filtering. If legacy support needs a new external dependency/permission or architecture, report bounded proposal rather than silently changing scope.
- PR-06 Calendar Export. Apply approved refinement direction: only eligible confirmed, normalized, actionable dates from trusted Current Course State; deadlines, exam/presentation schedules and other confirmed actionable dates are eligible. REFERENCE/BACKGROUND classification alone must not promote a date to calendar; do not export unresolved conflict as settled, do not infer unknown end time, and preserve eligible confirmed dates of kept Possibly Removed objects. Maintain existing event consolidation and no AI/no separate date model. Correct timezone/VTIMEZONE/DTEND encoding and test client compatibility; use explicit end only when supported by existing normalized event semantics. Preserve all-day/date-only vs timed-event meaning; report any ambiguous policy rather than invent a deadline. If existing authoritative policy conflicts with this refinement, report specific conflict before changing that behavior.

## 3. Engineering ownership and technical debt

Engineering Side may autonomously choose implementation, targeted regression, fixes for clearly incorrect existing behavior, internal quality improvements, and verified safe cleanup within this scope. Do not invent new product rules, modules, AI pipeline design or review framework. Batch genuinely unresolved product decisions into one evidence-backed handoff with options and recommendation; continue independent authorized work.

- Adapt existing package-delivery.mjs, package-final-handoff.mjs, run-gate.mjs and necessary build/verification paths to current v0.3.0 facts; no fake release artifact, stale gate PASS or private material in packages.
- Reconcile README, AGENTS, permissions/design-system and governance docs with actual current product. Preserve original historical facts, formal version documents, QA/recovery evidence and rollback paths.
- For old AI pipeline (~15k LOC), v0.1 legacy modules/backend and ~85 one-off v030 scripts, inspect runtime/build/test/migration/recovery references, then remove only demonstrably obsolete, safe, in-scope items in bounded reversible groups. Do not wholesale delete old pipeline/backend or historical archives; for unclear dependencies or material architectural impact, provide a retirement recommendation, defer deletion. Root duplicate v0.2 docs may be reconciled only without losing canonical historical records or references. Previously deleted 8 files in E2P are not auto-transferred deletions; record explicit deletion inventory, do not recursively mirror deletion. No new separate permanent handoff.

## 4. Checkpoints, evidence and validation

- Preserve the source checkpoint a52d40c and existing audit changes before modifying. Check actual status and diff, retain unrelated dirty/private state. Previous P2E-065 explicitly authorizes safe commit/push of its existing checkpoint scope; if not already done, complete that checkpoint independently only after proper review, correct remote/branch and privacy checks. Do not treat that authorization as permission to publish new Phase 1 changes or release. Save new Phase 1 changes in a separate traceable local engineering checkpoint; report push status and request explicit authority if needed. No force push, reset --hard, clean -fd, unchecked git add ., tag or GitHub Release.
- Prior audit CI reported 1008 extension + 20 backend + 2 contracts + 4 QA logical audit tests, lint 0/0. Treat as previous evidence, not current-run results. Reuse valid tests/fixtures; add targeted regressions for repaired behaviors, including both surfaces, keyboard/focus, protected state, paid ambiguity, cache invalidation, historical/current eligibility, backoff, waiting/resume, spreadsheets, privacy and calendar. Use automated scripts first; for real UI where needed run isolated zero-paid browser QA. No new real course scans, paid model calls, original user profile operations or mutation of trusted data. Run necessary integrated CI for the resulting changed code; do not indiscriminately rerun unrelated historical gates or duplicate expensive workflows.
- Keep outstanding RC2 Human Gate 5 and real online Side Panel, incremental Check/Rebuild, non-MA6081 generalization, GAI original PDF, Literature Review identity, 2h/3h exam conflict, 24%/40% similarity boundaries, Part1 slots and Part3 version/duration gaps explicit. No claim that prior 17 authorized candidate interpretations were independent AI success or Human acceptance. Preserve MA6081 evidence and old RC1 FAIL. Do not attempt new semantic or source correction in Phase 1.

## 5. Documents and stop condition

Read as needed: latest E2P + outbound manifest; PRD_v0.3.0, independent page-organized Interaction_and_Information_Architecture_Spec_v0.3.0, DECISION_LOG, TECHNICAL_DESIGN, RC2_ACCEPTANCE_STATUS / RC2_HUMAN_GATE5, inherited v0.2.0 PRD, current README/governance. Formal facts and any approved clarification belong in existing appropriate docs (PRD/IA/decision log/version record/technical design/engineering report); no parallel PRD or new report per minor fix. Keep existing implementation, product and evidence statements distinguishable.

Stop at Phase 1 engineering delivery. Report each UI-01–10 and PR-01–06: reproduced / fixed / already fixed / blocked, evidence/test, remaining limitations. Report actual cleanup/deletions/deferred retirement, actual CI/build and privacy boundary, local checkpoint SHA and verified remote status if applicable. Document any product questions together and propose next Phase 2 entry, without initiating it. State `PHASE 1 REMEDIATION [actual status] / HUMAN GATE 5 NOT PASSED / NO RELEASE`. Do not ask Owner to repeat full product orientation or Human Gate 5 now.

Use GPT Drive Codex v0.2.0 outbound explicit Changed Files (including configured `docs/collaboration/CODEX_TO_CHATGPT_HANDOFF.md`) via Desktop plan/apply/inspect. Distinguish local readback from cloud visibility; report ID, plan, receipt and evidence boundary. No connector workaround absent explicit emergency authorization. Current owner: Engineering Side after successful inbound verification. Product Side only reviews the delivered result and later-phase decisions.
