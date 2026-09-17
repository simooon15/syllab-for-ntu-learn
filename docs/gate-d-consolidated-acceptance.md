# Gate D Consolidated Acceptance Run — v0.1.0

Status: **IN PROGRESS · MANUAL ITEMS PENDING**

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

## Single acceptance result

The run produces one table with each item marked `PASS`, `FAIL`, `NOT TESTED` or `BLOCKED`, plus evidence path, product impact and known-risk update. Gate D is `PASS` only when all mandatory items pass; unavailable format samples may remain `NOT TESTED` only where the Implementation Plan explicitly permits that status and their impact is documented.

After this report, stop and return the full acceptance evidence to Product. Do not begin D-015, production deployment or visual reconstruction as part of the same test.
