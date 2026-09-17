# Syllab v0.1.0 — Final acceptance record

Status: **IMPLEMENTATION COMPLETE · FORMAL REAL-ENVIRONMENT ACCEPTANCE PENDING**

This status does not claim release readiness. The automated package is complete, but the Implementation Plan requires a consolidated human check in real NTU Learn plus Calendar-client imports before Gate D can be marked PASS.

## Final automated result

- `npm run ci`: PASS on 2026-09-17.
- Contracts: 2 tests passed.
- Extension: 109 tests passed across 26 files.
- Backend: 20 tests passed across 5 files.
- Build, strict typecheck, ESLint, Prettier, Manifest validation and Secret scan: PASS.
- Extension package: `artifacts/Syllab_Extension_v0.1.0.zip`.
- SHA-256: `6d554470a22c3d0f15ac19571c771665333c20def473d5426a00040e27e84546`.

## Implemented MVP boundary

- Four primary surfaces only: Saved Courses, Scan, Review and Course Brief.
- Current-course-first entry, explicit first Scan, exact runtime attachment permissions and checkpointed discovery/fetch/parse/normalize/extract.
- DeepSeek `deepseek-flash` only through the Syllab Backend; anonymous installation token plus token, enablement, rate, usage and budget guards.
- One Review surface with Needs Review / Detected, category-level Confirm all, source evidence and D-014 parent ownership.
- Confirmed Course Brief with nested Assessment-specific Date/Rule, unresolved fields, Edit/Add/Resolve and hidden-by-default Source.
- Confirmed-date-only `.ics`, Saved Courses navigation, recoverable errors and active full Scan again.

## Non-goal audit

No Chat, Reminder, multi-course dashboard, automatic change detection, Ignore memory, account/login, OAuth, Invite Code, provider/model switcher, cloud Course Brief storage, cloud sync, admin dashboard or NTU Learn write operation was added.

## Decision audit

- D-001: exact discovered Blackboard/Xythos origin permission remains runtime-only.
- D-002–D-010: four-surface IA, entry priority, user-started Scan, Review/Brief facts, Saved Courses boundary and error states are represented.
- D-011/D-012: Scan again protects confirmed user facts and does not remember Ignore across scans.
- D-013: provider, secret, anonymous access and usage boundaries remain server-side.
- D-014: relationship is part of candidate identity and Brief nesting.
- D-015: Important Rules follow the Grade-Impact Boundary; prompt, local boundary validator and regression suite use the updated formal baseline.

## Known risks and limitations

- KR-01: multiple real courses have discovery/fetch evidence, but final human baseline comparison is pending.
- KR-02: real PDF path is evidenced; real PPTX and DOCX end-to-end identity is still not established.
- KR-03: legacy Office is intentionally Unsupported and non-retryable; its real frequency remains unknown.
- KR-04: depth and pagination were observed, but no universal completeness claim is made.
- KR-05: exact-origin mechanics passed automated tests; the full Allow/Deny/reopen/repeat-prompt gesture matrix is pending.
- KR-06: parser limits exist; representative real large/corrupt-file evidence is pending.
- The development extension targets `http://127.0.0.1:8787`; production packaging requires an HTTPS `SYLLAB_BACKEND_URL`.
- Backend installation and usage state is currently process-memory backed. Restart recovery works by re-registration, but production-grade durable counters/disablement require a deployment adapter.
- The default development protection values (`10` requests/minute and `100000` installation units) are intentionally conservative and rejected this real 25-batch course on retry. Local acceptance passed with bounded raised values (`60` requests/minute, `500000` installation units, `2000000` global units); production limits must be sized explicitly rather than inheriting development defaults.
- Broad course-material copyright/recording policies remain outside D-015 unless they cross the confirmed Grade-Impact Boundary.
- Final artistic green serif visual reconstruction remains intentionally deferred per product direction and is not part of this functional acceptance run.

## Real-browser evidence collected on 2026-09-17

- Review state persisted after closing and reopening the extension popup.
- Category-level `Confirm all assessment` confirmed four detected assessments.
- An Assessment-specific Rule was confirmed and appeared nested under its parent Assessment in Course Brief.
- A course-level Rule remained top-level, and Source stayed collapsed by default.
- Category-level `Confirm all important date` confirmed 11 detected dates. Calendar exposed only the 9 facts containing a structured confirmed date; the exported `.ics` contained 9 valid `VEVENT` blocks with UID, DTSTART and SUMMARY.
- Closing and reopening the popup did not cancel an active Scan again. Explicit Cancel produced Interrupted without clearing the existing Brief, and Continue resumed the same saved Discovery checkpoint.
- On the NTU Learn course shelf, the popup entered Saved Courses, showed the saved course and its pending-review count, and reopened the existing Brief without starting a scan.
- A same-source, different-locator contamination bug in assessment risk routing was reproduced, fixed to use exact `sourceId + locator`, migration-tested and revalidated by the full CI suite.
- A real resume exposed that the popup had previously changed only its in-memory route while the persisted scan remained Interrupted. `RESUME_SCAN` now persists Scanning before work continues; the regression is covered by a repository test.
- The full paid Scan again completed under bounded development limits. It produced three new/changed Review candidates rather than repeating the old candidate set; after those candidates were ignored, the four existing Assessments, nested dates, CA3 Requirement, course-level GAI rule and Calendar entries remained unchanged and the Brief reported `Review complete`.
- Apple Calendar import: PASS. The generated calendar imported successfully and displayed `CA1 PowerPoint slides submission deadline` on 2026-10-22 as an all-day event. Evidence: `artifacts/acceptance-evidence/apple-calendar-import-2026-09-17.png`.
- Google Calendar import: PASS. The same export displayed imported CA1 events on 2026-10-22, providing the required second-client evidence. Evidence: `artifacts/acceptance-evidence/google-calendar-import-2026-09-17.png`.
- Dynamic exact-permission Deny: PASS in real Chrome. Choosing `Continue without them` produced `Fetch Partial · 0 fetched · 10 denied · 0 failed`, with no file signatures, final origins, runtime origins or incomplete byte results. `View issues` retained ten source-specific `Permission Denied` records stating that exact attachment-host permission was declined; the scan continued instead of becoming Failed, did not reprompt during the same Fetch and normalized 9 units from 9 non-attachment sources with 1 duplicate.
- A real second-course retry verified that unresolved parent keys enter Needs Review instead of disappearing. The follow-up exposed that Review Edit changed only JSON and that Brief projection did not resolve parents retained from an earlier scan. The narrow fix now exposes explicit relationship reassignment for missing parents and projects newly confirmed children under matching existing Brief Assessments; automated regression passes and real-browser revalidation remains pending.

## Consolidated manual acceptance run

Use the freshly built unpacked extension and a running backend. Perform this once, across the already selected real courses:

1. Open a new course: Saved Courses → Scan Ready → Discovery → Fetch → Parse → Normalize → Extract → Review.
2. During attachment permission, verify exact host text, Allow once, and on another run Deny; confirm other sources continue and View issues shows the denial.
3. Close/reopen the popup during a stage; then explicitly Cancel another scan and Continue it. Confirm these are distinct behaviors.
4. Confirm one Assessment plus attached Date/Rule, one course-level Rule, and one conflicting date field. Verify nested Brief placement, hidden Source and unresolved date exclusion from Calendar.
5. Edit one confirmed fact and add one user fact. Export selected dates and import the `.ics` into two calendar clients.
6. Run Scan again. Verify identical facts do not repeat, changed/new/relationship-changed facts do, ignored facts may reappear, missing sources delete nothing, and the edited/user-added facts are unchanged.
7. Reopen Chrome/reload the extension and verify Saved Courses, Review progress, Brief relationships and recovery state persist.

Record the course code, outcome and a redacted screenshot/export for each required item. Gate D can become PASS only after this matrix is complete.
