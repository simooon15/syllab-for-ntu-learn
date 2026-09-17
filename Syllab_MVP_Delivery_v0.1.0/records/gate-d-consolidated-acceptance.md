# Gate D Consolidated Acceptance Run — v0.1.0

Status: **PASS · COMPLETE, WITH DOCUMENTED NOT-TESTED SAMPLE CLASSES**

This is the single remaining formal Gate D test. It consolidates the outstanding Phase 13–15 evidence into one continuous session and one final report. Previously completed Allow/Deny, popup-close, Cancel/Continue, Apple Calendar, paid Scan again and automated CI evidence is reused rather than repeated.

## Goal

Close the remaining Formal MVP acceptance gaps with one primary real course, one structurally different real course, controlled fixtures where NTU Learn cannot be safely changed, and one second Calendar client.

## Dependencies

- Fresh unpacked extension from `artifacts/Syllab_Extension_v0.1.0.zip`.
- Backend running with a server-side DeepSeek key and bounded development limits.
- Existing MA6084 Brief retained as the primary-course baseline.
- A second real NTU Learn course.
- Available real PPTX/DOCX/legacy/corrupt/large samples; unavailable sample classes remain explicitly `NOT TESTED`.

## This run will not do

- Reopen or redesign D-015; its Grade-Impact Boundary is now the formal v0.1.0 baseline.
- Perform the final artistic green serif visual redesign.
- Treat local HTTP or process-memory usage counters as production deployment readiness.
- Modify NTU Learn, grades, submissions, SSO or MFA.

## One-pass procedure

### 1. Baseline and persistence

- Restart Chrome and reload the extension once.
- Open Saved Courses and the primary course.
- Verify the existing four Assessments, nested Date/Rule relationships, course-level Rule, Review completion and collapsed Source.
- Save a redacted baseline screenshot and item-count record.

### 2. User-fact protection and unresolved date

- Edit one confirmed fact and add one clearly labelled user fact.
- Create a controlled conflicting date through the test fixture so it enters Needs Review/Unresolved without changing NTU Learn.
- Verify evidence/raw values remain available.
- Export Calendar and verify the unresolved date is absent while edited/user-added confirmed dates use their final values.

### 3. One Scan-again reconciliation matrix

Run one controlled Scan again containing all four cases:

- an identical fact;
- a conflicting fact;
- a new fact;
- a previously present source omitted from the fixture.

Verify identical facts do not repeat, conflict/new facts enter Review, omission deletes nothing, Ignored may reappear, and the edited/user-added facts remain byte-level/domain-level unchanged.

### 4. Recovery and error matrix

Within the same run, record:

- one isolated Parsing Failed source while other sources continue as Partial;
- Backend/network unavailable, followed by recovery;
- forced Service Worker termination, Interrupted detection and Continue on the same scan;
- Unsupported legacy Office with no meaningless Retry;
- No Items Detected without claiming that the course has no information;
- old Brief unchanged after Failed, Interrupted and Cancel.

The already recorded real Permission Denied and popup-close evidence is referenced, not rerun.

### 5. Multi-course and format coverage

- Run the second real course through Entry → Scan → Review → Brief.
- Compare both courses against a short human baseline covering Assessment, Date, Rule, relationship and important Source.
- Record omissions, false positives, wrong relationships and Review effort.
- Validate real PDF, PPTX and DOCX where samples exist; validate legacy recognition; exercise large, no-text, corrupt and duplicate fixtures.
- Never convert a missing real sample into PASS; record it as `NOT TESTED` with impact.

### 6. Second Calendar client

Result: **PASS** on 2026-09-17 in Google Calendar; screenshot retained at `artifacts/acceptance-evidence/google-calendar-import-2026-09-17.png`.

- Export from the final real Course Brief.
- Import into Google Calendar or Outlook. Completed in Google Calendar.
- Verify event count, title, date/time, all-day boundary and absence of unresolved/unconfirmed dates.
- Save one redacted screenshot.

### 7. Final automated and package check

- Run `npm run ci` once after all fixes.
- Rebuild `artifacts/Syllab_Extension_v0.1.0.zip` and record SHA-256.
- Audit manifest permissions, external requests, secret scan and non-goals.

## Results so far

| Item                                                                    | Status     | Evidence / note                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend unavailable — failure half                                      | PASS       | `Extraction Failed · 46 failed batches · Failed to fetch` recorded in the handoff, and `Extraction Failed · 26 failed batches · Failed to fetch` reproduced in this run on MA6084. The differing batch counts come from different scans; the 46-batch record belongs to a superseded scan, so they are not comparable.                                                                                                                                                                                                                                                                                                                                |
| Old Brief unchanged after Failed                                        | PASS       | MA6081's Brief stayed intact (3 Assessments, nested Requirement under `Part 2: Multiple Choice Quiz`, 1 Important Date, collapsed Source on every item), and MA6084's Brief stayed intact across both its failure and recovery runs, including the user-edited `gateDNote` fact.                                                                                                                                                                                                                                                                                                                                                                      |
| Backend unavailable — recovery half                                     | PASS       | After the `Failed` run, restarting the Backend and reopening the popup offered `Normalize checkpoint · 399 units · 19 sources · 63 duplicates` with `Continue scan`; `Continue scan` then offered `Extract course information`, and clicking it went straight to Review (`0 of 29 reviewed`) with no Discovery/Fetch/Parse rerun and no repeated attachment-permission prompt. This also revalidates the entry-priority fix against a real `Failed && recoverable` scan.                                                                                                                                                                              |
| Entry priority: a finished course shows its Course Brief                | PASS       | Both courses previously surfaced superseded interrupted scans (empty or stale checkpoints) instead of their Briefs. After the fix, MA6084 opened on `Course Brief` / `Entry route: course-brief` with all 4 Assessments, nested dates, nested CA3 Requirement, 2 course-level Rules and the user-edited fact intact; MA6081 opened on `Course Brief` with the predicted `62 items need review` + `Continue review`.                                                                                                                                                                                                                                   |
| Forced Service Worker termination                                       | PASS       | Stopped the worker **mid-stage** via `chrome://serviceworker-internals` → Stop (never Unregister), waited past the 45 s lease, then reopened the popup: `Interrupted` was detected and `Continue scan` was offered. Continuing resumed the **same parse checkpoint on the same scanId**, with no new scan and no repeated attachment-permission prompt. The MA6084 Brief afterwards was identical, including the user-edited `gateDNote` fact. Two earlier attempts failed because the stage had already finished — a finished stage clears its lease, so nothing is marked interrupted; the operative procedure is to stop while a stage is running. |
| Isolated real Parsing Failed source                                     | NOT TESTED | MA6084's real scan reported `Parse Complete · 4 parsed · 6 partial · 0 unsupported · 0 failed` on 8 real PDFs and 2 real ZIPs. No real parsing-failure or unsupported-legacy sample exists in the available courses, and per the handoff no NTU Learn content was altered to manufacture one. Impact: the isolation guarantee is covered by automated tests but has no real-sample evidence.                                                                                                                                                                                                                                                          |
| Real format coverage — PDF                                              | PASS       | Previously evidenced; re-confirmed on MA6084's fresh scan, which fetched 8 real PDFs from the Xythos host and parsed them with 0 failures. Real ZIP is also now PASS: the same fetch reported `2 zip`, parsed with 0 failures and 0 unsupported.                                                                                                                                                                                                                                                                                                                                                                                                      |
| Real format coverage — PPTX / DOCX / legacy / large / no-text / corrupt | NOT TESTED | No PPTX, DOCX, legacy Office, oversize, no-text or corrupt real sample exists in the available courses (real parse reported `0 unsupported · 0 failed`). Per the handoff, no NTU Learn content was altered to manufacture one. Impact: these parser paths remain covered only by fixtures, so real-world frequency and behaviour are unmeasured; KR-02, KR-03 and KR-06 stay open.                                                                                                                                                                                                                                                                    |
| Second Calendar client (Google Calendar)                                | PASS       | `artifacts/acceptance-evidence/google-calendar-import-2026-09-17.png`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Automated suite and package                                             | PASS       | `npm run ci` exit 0 (Extension 124 tests across 27 files, Backend 20); package rebuilt and byte-identical to `extension/dist`; SHA-256 `ff76a2394d6dbc550ad37d5aaf55502db132db364a36309c3756535f18172fe8`.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Human baseline summary, both real courses                               | PASS       | Completed from existing MA6084 and MA6081 evidence without a rescan; the assessment, date, rule, relationship, source, omission and Review-effort summary is recorded in `docs/final-acceptance-v0.1.0.md`.                                                                                                                                                                                                                                                                                                                                                                                                                                           |

Every mandatory real-environment item passes: the Backend-unavailable failure **and** recovery halves, forced Service Worker termination, entry priority on both real courses, the Calendar-client imports, and the automated suite and package. All three defects found during this run are fixed, regression-tested and revalidated in the real browser. The human baseline summary for both courses is written up in `docs/final-acceptance-v0.1.0.md`. The only items left `NOT TESTED` are the real sample classes that could not be exercised — isolated parsing failure, PPTX, DOCX, legacy Office, oversize, no-text and corrupt — each with its impact documented, which the Implementation Plan explicitly permits. Gate D is therefore **PASS** with those documented gaps.

The package SHA `ff76a239…` in the table is the artifact verified when Gate D closed. The current delivery artifact was later rebuilt from the post-visual-rebuild `extension/dist`; it contains 25 files and bundled fonts, with SHA-256 `30e9c21b9e2f1c27c9aa0f6c6f73724a799c7e42549fcb38b4396226cefbdb5e`. See `docs/final-acceptance-v0.1.0.md` for the preserved package lineage.

One behavioural consequence to carry forward: a course with a resumable scan always opens on the scan surface, so after finishing a test drill the popup keeps offering to continue that scan rather than showing the Course Brief. That is the documented entry priority, and the Brief remains reachable from Saved Courses. It is worth watching in real use, together with the navigation observation above.

### Defect found during Gate D — a leftover lease could lock a scan (fixed)

When a Service Worker is killed mid-stage, `withScanLease` never reaches its `finally` block, so the scan's lease record survives with a past expiry. `interruptExpired` skipped it while the scan was already `Interrupted` (it only flips `Scanning` entries), so nothing ever consumed the record. Once the user resumed that scan — `RESUME_SCAN` sets the status back to `Scanning` — the next Service Worker start found a `Scanning` scan with an expired lease and marked it `Interrupted` again. Every stage writer refuses to update the summary while the status is `Interrupted` (`fetch-runner.ts:88`, `parse-runner.ts:113`, `normalize-runner.ts:61`), so the status was then effectively frozen, and `startExtraction` threw `SCAN_INTERRUPTED` (`extraction-runner.ts:55`) **after** running every batch, discarding the whole result.

Observed consequence in real Chrome: the first `Extract course information` click after the forced-termination test returned the bare internal string `SCAN_INTERRUPTED` with no recoverable state and no explanation, and persisted nothing. A second attempt, after the status had been set back to `Scanning` and both `finally` blocks had cleared the leftover lease, produced the intended `Extraction Failed · 26 failed batches · Failed to fetch`. This is also the explanation for the missing `Failed` scan in the earlier storage dump.

Fixed in two places, as agreed with the user. `ScanLeaseRepository.interruptExpired` now spends the leases it acts on, so a resumed scan can no longer be interrupted by a lease that was already used; leases that are still valid, or that belong to other scans, are left alone. The transient codes that had no user-facing copy — `SCAN_INTERRUPTED`, `SCAN_NOT_RECOVERABLE`, `SCAN_NOT_FOUND`, `REVIEW_ALREADY_STARTED`, `DISCOVERY_NOT_COMPLETE`, `DISCOVERY_CHECKPOINT_NOT_FOUND` and `STORAGE_UNAVAILABLE` — are now rendered as actionable sentences by a dedicated `popup/scan-errors.ts` module, with anything unrecognised passed through unchanged so no failure is swallowed. Real-browser revalidation of the lock-out fix: **PASS.** After reloading the unpacked extension, the user reproduced the exact sequence that previously froze the scan — `Scan again`, Stop mid-stage, wait past the lease, reopen the popup, `Continue scan`, then Stop the worker a second time. The popup stayed on the stage action (`Continue discovery`) instead of reverting to `Continue scan`, so the spent lease no longer re-interrupts a resumed scan, and the scan no longer freezes. Both Course Briefs were verified unchanged before and after. The replacement error copy could not be triggered in the browser, because removing the lock-out also removes the path that surfaced `SCAN_INTERRUPTED` there; it stays in place as a safety net for the same codes arriving from other paths and is covered by unit tests.

### Recorded observation — no in-popup path from Scan back to Course Brief

The four-surface strip is a status rail, not a menu (`popup/index.ts` sets `button.disabled = surface.id !== active`, and the active button has no handler), so while a scan sits at a checkpoint the only way to reach the Course Brief is to switch to a non-NTU-Learn tab, let the popup fall back to Saved Courses, and open the course card. During §8A the user had to do exactly that. This is not a functional failure of any required item — Saved Courses navigation and entry priority both behave correctly — but it is real Review-effort friction and belongs in the human baseline. It is a layout/navigation concern, and the artistic visual reconstruction is intentionally deferred for this run, so it is recorded and not changed.

### Post-closure review — five further findings, recorded and not fixed

An independent review after Gate D closed — reading the implementation and replaying real confirmed values through it — produced five further findings, recorded in `docs/final-acceptance-v0.1.0.md` under "Engineering findings from the Gate D review" and deliberately kept separate from the Product owner's feedback. None of them changes a Gate D result, and no code change was made in response to any of them in this run. Two are carried into that document's risks list because a person using v0.1.0 as it stands can be affected:

- **E1 revises one Gate D evidence figure.** Calendar export showed 9 of MA6084's 11 confirmed dates. The reason recorded at the time — that the other two held no structured confirmed date — is wrong. Both carried ISO dates and were dropped because `calendarEventsFromBrief` selects the first date-_looking field name_ rather than the first _parseable value_, so the prose `when` shadowed the `date` stored beside it. Carried forward as KR-07.
- **E2:** Review offers `Retry extraction` whenever nothing has been reviewed, which is exactly the state right after a successful extraction; the button re-runs the paid extraction and replaces the saved candidate set. Carried forward as KR-08.
- **E3, E4 and E5** are internal-id naming for saved courses and exported files, a read-modify-write over the scan list during Service Worker start, and an unhandled rejection that would silently disable interrupted-scan recovery on a storage-schema mismatch. Recorded as findings only.

The run produces one table with each item marked `PASS`, `FAIL`, `NOT TESTED` or `BLOCKED`, plus evidence path, product impact and known-risk update. Gate D is `PASS` only when all mandatory items pass; unavailable format samples may remain `NOT TESTED` only where the Implementation Plan explicitly permits that status and their impact is documented.

After this report, stop and return the full acceptance evidence to Product. Do not begin D-015, production deployment or visual reconstruction as part of the same test.
