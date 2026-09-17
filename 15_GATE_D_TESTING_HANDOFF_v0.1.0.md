# Syllab for NTU Learn v0.1.0 — Gate D Testing Handoff

Date: 2026-09-17  
Current phase: Phase 13–15 consolidated testing and final acceptance  
Status: **IN PROGRESS — continue current Gate D run; do not restart coding**

## 1. Instruction to the next Agent

Continue the existing Formal MVP Gate D testing and closure from the current workspace.

- Do not restart from Phase 1.
- Do not reopen product brainstorming, IA or Technical Design.
- Treat the current formal documents, including D-015, as the v0.1.0 baseline.
- Do not perform the deferred artistic/visual reconstruction during this test run.
- The user will operate Chrome manually. Give concise, step-by-step instructions and wait for each reported result.
- Do not use Computer Use unless the user explicitly asks again.
- Reuse evidence already collected; do not make the user repeat passed tests.
- Do not expose or request the DeepSeek API key in chat, files, Git or logs.

Read these working acceptance records first:

1. `docs/gate-d-consolidated-acceptance.md`
2. `docs/final-acceptance-v0.1.0.md`
3. `docs/implementation-gates.md`

Read implementation files only when a reported result requires diagnosis.

## 2. Current formal baseline

D-015 Important Rules Product Alignment is already applied and is part of the formal v0.1.0 baseline:

- Important Rules use the Grade-Impact Boundary.
- The DeepSeek extraction prompt and local boundary validator have been updated.
- D-015 regression tests pass.
- No Product-impacting Technical Conflict is open.

Do not reapply the delta and do not redesign D-015.

## 3. Latest automated/package state

Latest complete `npm run ci`: **PASS**.

- Contracts: 2 tests passed.
- Extension: 109 tests passed across 26 files.
- Backend: 20 tests passed across 5 files.
- Build, strict typecheck, ESLint, Prettier, Manifest validation and Secret scan: PASS.
- Package: `artifacts/Syllab_Extension_v0.1.0.zip`
- SHA-256: `6d554470a22c3d0f15ac19571c771665333c20def473d5426a00040e27e84546`

The unpacked extension uses `extension/dist`. After any code change/build, tell the user to reload Syllab at `chrome://extensions` before real-browser retesting.

## 4. Backend development start command

Use bounded raised development limits because a real course requires about 46 extraction batches. In the project root:

```bash
read -s "SYLLAB_KEY?Paste DeepSeek API key: "; echo; DEEPSEEK_API_KEY="$SYLLAB_KEY" RATE_LIMIT_REQUESTS_PER_MINUTE=120 INSTALLATION_USAGE_CAP_UNITS=1000000 GLOBAL_BUDGET_CAP_UNITS=5000000 npm run start -w @syllab/backend
```

The key remains in a temporary shell variable and is not written to the repository. Expected listener:

```text
Syllab backend listening on http://127.0.0.1:8787
```

## 5. Passed real-environment evidence — do not repeat

- Primary MA6084 end-to-end Scan → Review → Course Brief completed.
- Second structurally different real course MA6081 completed through Review/Brief.
- Dynamic exact-host permission Allow passed.
- Dynamic exact-host permission Deny passed: `Fetch Partial · 0 fetched · 10 denied · 0 failed`; ten source-specific permission issues were retained and other sources continued.
- Discovery depth, content details, assignments, announcements, attachments and pagination were observed in real courses.
- Real fetch passed for Xythos/Blackboard runtime origins with complete bytes.
- Parse/Normalize/DeepSeek paths completed on real course data.
- Popup close is not Cancel.
- Explicit Cancel produced Interrupted; Continue used the saved checkpoint and preserved the old Brief.
- Full paid Scan again preserved edited/user-added/confirmed facts and did not clear the old Brief.
- Saved Courses navigation and pending-review state passed.
- Review persisted after popup close/reopen.
- Source is hidden by default and original evidence remains available.
- Apple Calendar import passed.
- Google Calendar import passed; evidence: `artifacts/acceptance-evidence/google-calendar-import-2026-09-17.png`.
- Confirmed-date-only export passed; an unconfirmed/Needs Review date did not appear in Calendar export.
- Reloading the page and reopening the popup retained Course Brief content and nested relationships.
- Parent-association real regression passed after the latest fixes: a Requirement remained nested beneath `Part 2: Multiple Choice Quiz` after confirmation and reload.
- `No items detected in the supported sources. This does not mean the course has no information.` wording has been observed.

## 6. Parent-association defects fixed during Gate D

Real second-course testing exposed three narrow issues. They are fixed and covered by automated tests:

1. Unknown model-supplied parent keys now enter Needs Review instead of silently disappearing.
2. Missing-parent candidates now expose explicit `Applies to …` reassignment buttons; Review Edit remains JSON-only.
3. A newly confirmed child can attach to an Assessment retained from an earlier Brief/scan. Exact semantic-key match is preferred; a unique unambiguous alias match is permitted; ambiguous matches are not guessed.

The user accidentally confirmed the general `Attendance is compulsory for all lectures…` rule under Part 2 while testing. The user confirmed this was selection error, not candidate identity swapping. Do not diagnose it as a code defect.

## 7. Current exact stopping point

The user started the remaining Backend-unavailable recovery test.

Observed result with Backend stopped:

```text
Extraction Failed · 46 failed batches · Failed to fetch
```

This is valid failure-path evidence. The next Agent must finish only the recovery half:

1. Ask whether the pre-existing Course Brief remained unchanged after the failure.
2. Have the user restart Backend with the command above.
3. Have the user click `Retry extraction` (or `Extract course information` if that is the checkpoint action shown).
4. Verify recovery reaches Review without rerunning Discovery/Fetch/Parse and without clearing the old Brief.
5. Record the result in the acceptance documents.

Do not confuse the popup's static five-step display with a new scan. A preserved `Normalize checkpoint · … units` plus an `Extract course information` button means the Extract checkpoint was retained. A genuine reset would show `Scan this course` or create a new Discovery scan.

## 8. Remaining manual evidence after Backend recovery

### A. Forced Service Worker termination — mandatory

Use an active Scan with a saved checkpoint and an existing Brief.

1. Open `chrome://serviceworker-internals`.
2. Find the Scope beginning with the Syllab extension origin, currently observed as `chrome-extension://apcokhnabajnkd…/`.
3. Click **Stop** only. Do not click Unregister.
4. Close and reopen the Syllab popup.
5. Verify Interrupted is detected and `Continue scan` is offered.
6. Continue the same scan and verify the old Brief remains unchanged.

Record exact screen text and whether the same checkpoint was used.

### B. Isolated real Parsing Failed source — mandatory if a suitable real sample exists

Verify one failed source is isolated while other sources continue and the scan becomes Partial rather than wholly Failed. `View issues` must retain the source-specific Parsing Failed record.

If no suitable corrupt/no-text real source exists, do not modify NTU Learn or fabricate evidence. Record `NOT TESTED — no real failure sample available`, with impact.

### C. Real format coverage — sample-dependent

Record separately:

- Real PDF: already evidenced.
- Real PPTX: PASS if present and parsed; otherwise NOT TESTED.
- Real DOCX: PASS if present and parsed; otherwise NOT TESTED.
- Legacy PPT/DOC: must be Unsupported with no meaningless Retry if present; otherwise NOT TESTED.
- Large, no-text and corrupt samples: report individually as PASS/FAIL/NOT TESTED.

Unavailable sample classes may remain NOT TESTED only with an explicit impact statement, per the Implementation Plan.

### D. Human baseline summary for both real courses

Do not rescan solely for this. Summarize existing evidence for each course:

- Assessments found;
- important dates;
- grade-impact rules under D-015;
- parent relationships;
- important sources;
- observed omissions, false positives, wrong relationships and Review effort.

The second-course evidence already exposed and fixed relationship handling; record that history rather than hiding it.

## 9. Acceptance recording requirements

Update these files as results arrive:

- `docs/gate-d-consolidated-acceptance.md`
- `docs/final-acceptance-v0.1.0.md`
- `docs/implementation-gates.md`

Use `PASS`, `FAIL`, `NOT TESTED` or `BLOCKED`; never turn missing evidence into PASS.

After any implementation fix:

1. Run `npm run ci`.
2. Rebuild `artifacts/Syllab_Extension_v0.1.0.zip` from `extension/dist`.
3. Validate with `unzip -t`.
4. Record the new SHA-256.
5. Tell the user to reload the unpacked extension.

Do not mark Gate D PASS merely because CI passes. Gate D may become PASS only after mandatory real-environment recovery evidence is complete and all unavailable sample classes are explicitly documented.

## 10. Stop conditions

Stop and return a Product-impacting Technical Conflict only if continuing requires changing confirmed product behavior, broadening host permissions, weakening external-AI boundaries, adding accounts/cloud storage, overwriting confirmed/edited/user-added facts, or expanding to a non-goal.

After Phase 15 Final acceptance is complete, stop and return the complete evidence package to Product. Do not begin production deployment or the deferred artistic visual reconstruction in the same run.

## 11. Suggested opening message to the user

```text
我已接手当前 Gate D 测试，不会重跑已经通过的项目。现在从 Backend 断开测试的恢复半程继续：请先确认刚才 Extraction Failed 后旧 Course Brief 是否仍完整保留；然后重启 Backend，并点击 Retry extraction。把“旧 Brief 是否保留”和“Retry 是否回到 Review”告诉我即可。
```
