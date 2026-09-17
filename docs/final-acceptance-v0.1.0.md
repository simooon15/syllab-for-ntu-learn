# Syllab v0.1.0 — Final acceptance record

Status: **IMPLEMENTATION COMPLETE · GATE D PASS**

Gate D passed on 2026-09-17. The consolidated human check in real NTU Learn, the second Calendar client, the Backend-unavailable failure and recovery paths and the forced Service Worker termination are all evidenced. The only gaps are real sample classes that could not be exercised, which are recorded as `NOT TESTED` with their impact. Passing Gate D is a functional acceptance result and does not by itself make this a production deployment: see the known risks below.

## Final automated result

- `npm run ci`: PASS on 2026-09-17.
- Contracts: 2 tests passed.
- Extension: 109 tests passed across 26 files.
- Backend: 20 tests passed across 5 files.
- Build, strict typecheck, ESLint, Prettier, Manifest validation and Secret scan: PASS.
- Extension package: `artifacts/Syllab_Extension_v0.1.0.zip`.
- SHA-256: `6d554470a22c3d0f15ac19571c771665333c20def473d5426a00040e27e84546`.

### Final automated result (2026-09-17, after all Gate D fixes)

- `npm run ci`: **PASS** (exit code 0).
- Contracts: 2 tests passed.
- Extension: **124** tests passed across 27 files (15 new regression tests added by the three Gate D fixes and the error-copy module).
- Backend: 20 tests passed across 5 files.
- Build, strict typecheck, ESLint, Prettier, Manifest validation and Secret scan: PASS.
- Extension package rebuilt from `extension/dist`: 18 files, `unzip -t` reported no errors, contents byte-identical to the freshly built `dist`.
- SHA-256: `ff76a2394d6dbc550ad37d5aaf55502db132db364a36309c3756535f18172fe8`.
- Superseded intermediate builds: `874dc8d5020e0dea8a0efbffeafe616850446ddf23862f43ee7c8f78fb0e352c` (117 tests) and `a28dc82b7d39db1f46a73a45a8bc2b61799446db0f5d0dc218e8d20f0ec95a02` (114 tests).

### Pre-existing CI finding resolved during Gate D

The committed handoff document `15_GATE_D_TESTING_HANDOFF_v0.1.0.md` failed `secret:scan` because its backend start command contained a literal key assignment (the key's environment-variable name, then an equals sign, then the pasted value), matching the repository's key-assignment pattern `/DEEPSEEK_API_KEY[ \t]*=[ \t]*[^\s#][^\r\n]*/`. The previously recorded `npm run ci: PASS` did not hold against the committed working tree. The scan pattern and its ignore list were **not** changed; the document's command was rewritten to assemble the variable name on its own line (semantics unchanged, still copy-pasteable) so the scan still covers every file. Recorded here rather than silently corrected.

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
- Backend-unavailable failure half: PASS. With the Backend stopped, the MA6081 extraction stage reported `Extraction Failed · 46 failed batches · Failed to fetch` in the real popup.
- Old-Brief preservation across that failure: PASS. Re-opening the Course Brief from Saved Courses afterwards still showed three Assessments (`Part 1: Group Presentation`, `Part 2: Multiple Choice Quiz`, `Part 3: In-Class Scenario-Based Case Study`), the Requirement nested beneath `Part 2: Multiple Choice Quiz`, the Important Date `Part 2 Multiple Choice Quiz` (2026-11-14, 3.30 pm – 6.20pm, LT-2A), and a collapsed `Source` affordance on every item. Nothing was cleared and no relationship was lost.
- Recovery half: **FAIL. Two defects found; both fixed, real revalidation pending.** Re-opening the popup after the Backend-unavailable failure did not offer the Extract checkpoint. It offered `Discovery checkpoint · 109 sources · …` with `Continue discovery` on MA6081, and `Normalize checkpoint · 0 units · 0 sources · 0 duplicates` with `Continue scan` on MA6084; `Continue scan` then still offered `Continue discovery` or a dead checkpoint rather than `Extract course information`.
- Defect 1 — dead recoverability flag. `extraction-runner` persists a failed run as `{ status: "Failed", recoverable: true, phase: "extract" }`, but `CourseIndexRepository.findEntryScan` accepted only `Scanning`, `WaitingForPermission`, or `Interrupted && recoverable`, so `recoverable: true` on a failure was unreachable, and `resumeScan` had the same `status !== "Interrupted"` guard and would have rejected the resume with `SCAN_NOT_RECOVERABLE` even if entry had selected it. Fixed by treating `Failed` and `Interrupted` as equally resumable, and **only** when `recoverable` is true, so a failure that is explicitly not recoverable (for example a discovery failure, which writes `recoverable: false`) stays unreachable. Pinned by regression tests.
- Defect 2 — superseded scans shadow the course's real state. This is the defect that actually produced the observed screens. `findEntryScan` returned the first entry matching its status filter, so any old `Interrupted && recoverable` scan kept winning entry priority forever, even after a newer scan had completed. Reading the real extension storage confirmed it: MA6084 held `[Complete, Interrupted(recoverable), Partial, Partial]` and the popup selected the superseded `Interrupted`/`extract` entry, which owns no normalized units, while the course's actual state was the `Complete` scan with 399 normalized units, `lastEffectiveScanId` pointing at it and `pendingReviewCount: 0`. MA6081 held `[Partial, Interrupted(discovery), Interrupted(extract), Interrupted(fetch), Partial×3]` and the popup selected the superseded discovery entry, while the course's actual state was the newer `Partial` scan with 896 normalized units and `pendingReviewCount: 62`. Fixed by letting the newest entry for the course decide entry priority: a live scan, or a resumable scan that is still the course's current one. A scan that never stopped is still surfaced even if an unrelated entry was written later.
- Entry priority fix revalidated in the real browser: **PASS**. Opening the popup on MA6084 after the reload went straight to `Course Brief` with `Entry route: course-brief`, showing all four Assessments (`Final Examination`, `CA1`, `CA2`, `CA3`), each with its nested Important date, the nested CA3 Requirement, two course-level Important Rules, the Calendar export list and `Scan again`. The user-edited fact was intact (`Final Examination` still carried `"gateDNote": "User-edited fact protection check"`). Opening the popup on MA6081 likewise went to `Course Brief` and showed exactly the predicted `62 items need review` with `Continue review`. Neither course surfaces a superseded checkpoint any more.
- Service Worker termination procedure correction (found by reading the implementation, then confirmed in Chrome). §8A of the handoff assumes that stopping the Service Worker is enough for `Interrupted` to be detected. It is not, on its own: `withScanLease` clears the lease in its `finally` block (`recovery/lease.ts:67`), and `interruptExpired` deliberately ignores a scan with no lease (`recovery/lease.ts:49`), so a scan that is merely _idle_ at a saved checkpoint never becomes `Interrupted`. `initialize()` does run on every Service Worker start (`background/index.ts:251`), so the recovery path works — but only when the Service Worker is stopped **while a stage is actively running**, and only after the 45 s lease (`SCAN_LEASE_DURATION_MS`) has expired. The operative procedure is to stop the worker mid-stage and wait before reopening the popup.
- Forced Service Worker termination: **PASS** in real Chrome on MA6084, following that corrected procedure. The worker was stopped with `chrome://serviceworker-internals` → `Stop` (Unregister was never used) while the Parse stage was running. After the 45 s lease expired, reopening the popup detected `Interrupted` and offered `Continue scan`, with SCAN RECORD reading `Fetch Complete · 10 fetched · …`. Continuing resumed the **same parse checkpoint on the same scanId** — the next screen offered `Continue to parse`, with no `Scan this course` reset and no repeated attachment-permission prompt. The MA6084 Course Brief afterwards was identical to before, including all four Assessments, every nested Important date, the nested CA3 Requirement, both course-level Important Rules and the user-edited `"gateDNote": "User-edited fact protection check"` fact.
- Two earlier attempts at the same test produced no `Interrupted`, because the stage had already finished before the worker was stopped. That is expected rather than a defect: a finished stage clears its lease, and an idle checkpoint legitimately stays resumable as `Scanning`. Recorded because it changes the test procedure, not the product.
- Real attachment bytes and formats observed on MA6084's fresh scan: `Fetch Complete · 10 fetched · 0 denied · 0 failed · 8 pdf, 2 zip`, final origin `https://prod01-apse1-prod01-xythos.prod.files.blackboard.com`, runtime origins `https://alt-5dcb73f79ba4c.blackboard.com` and the same Xythos host, with `0 incomplete byte results`. This supplies real PDF and real ZIP samples for the format-coverage matrix, which were previously unavailable.
- Navigation observation: while a scan sits at a checkpoint there is no in-popup route from the Scan surface to the Course Brief, because the four-surface strip is a status rail rather than a menu (`popup/index.ts` sets `button.disabled = surface.id !== active`, and the active button has no handler). The user had to switch to an unrelated tab to reach Saved Courses and open the Brief. Recorded as Review-effort friction; not changed during this run.
- Leftover-lease lock-out fix: **PASS** in real Chrome. After reloading the extension, the user reproduced the sequence that previously froze the scan — `Scan again`, Stop the Service Worker mid-stage, wait past the 45 s lease, reopen the popup, `Continue scan`, then Stop the worker again. This time the popup stayed on the stage action `Continue discovery` instead of reverting to `Continue scan`, so a spent lease no longer re-interrupts a resumed scan. Both Course Briefs were verified unchanged before and after, so neither fix introduced a regression.
- Backend-unavailable **recovery half: PASS** on MA6084. With the Backend stopped, clicking `Extract course information` on a scan whose persisted status was still `Interrupted` returned the bare internal string `SCAN_INTERRUPTED` and persisted nothing; a second attempt, after the status was set back to `Scanning`, produced the intended `Extraction Failed · 26 failed batches · Failed to fetch`. Restarting the Backend and reopening the popup offered `Normalize checkpoint · 399 units · 19 sources · 63 duplicates` with `Continue scan`, exactly as the handoff predicted. `Continue scan` then offered `Extract course information`, and clicking it reached Review at `0 of 29 reviewed` — **without** rerunning Discovery, Fetch or Parse and **without** repeating the attachment-permission prompt. The four confirmed Assessments, every nested Important date, the nested CA3 Requirement and the user-edited fact were still present afterwards.
- Human baseline summary for both real courses is recorded in the next section; no rescan was performed for it.

## Human baseline summary — both real courses

Compiled from existing evidence; no rescan was performed for this summary.

**MA6084 (primary course).** Four Assessments: `Final Examination` (40%, carrying the user-edited `gateDNote` fact), `CA1 Group Assignment` (30 marks, group, three components plus presentation and role-play time limits), `CA2 In-class MCQ Test` (20%, 20 questions in about 20 minutes, online), `CA3 In-class Case Study` (10%, one hour, closed book). Eleven important-date facts, nine of which carry a structured confirmed date and therefore export to Calendar: Final Written Exam (2026-11-30, 1–3 pm), CA1 Batch 1 and Batch 2 presentation sessions (2026-10-23 and 2026-10-30, 3.30–6.20 pm, LT 10), the CA1 presentation/role-play, PowerPoint-slides and role-play-script submission deadlines (all 2026-10-22), two Peer Evaluation submission deadlines (2026-11-08), the CA2 MCQ test (2026-11-13), the CA3 case study (2026-11-13) and the Project Background & Procurement Scenario form (2026-09-11). One Assessment-specific Rule (CA3 closed book) and two course-level Rules (single group representative submits the form; GAI integrity and citation). Relationship nesting behaved correctly: the Final Written Exam date sits under `Final Examination`, and the CA3 rule and date sit under `CA3`.

Omissions, false positives and Review effort on MA6084: the real parse produced `4 parsed · 6 partial · 0 unsupported · 0 failed` on eight real PDFs and two real ZIPs, so six of ten attachments were only partially parsed — a measurable parser-completeness limit rather than a failure (KR-06). Normalization produced 399 units from 19 sources with 63 duplicates. The fresh extraction produced **29 Review candidates and 0 of 29 were reviewed**, of which roughly fourteen restate facts already confirmed in the Brief (the four Assessments and the Peer Evaluation, PowerPoint-slides, role-play-script, CA2 MCQ, CA3 case study, Final Written Exam, presentation-batch and 2026-09-11 dates). Two candidates landed in Needs Review rather than Detected: the CA1 assessment, flagged `Conflicting values were found for the same course fact`, and the tutorial-attendance rule, flagged because it is unclear whether absences carry a grade or assessment-eligibility consequence — the D-015 Grade-Impact Boundary behaving as designed on real data. Several candidates read as low-value rules for the Important Rules category, for example `View the "Negotiation Tactics Videos" in the "Content" section on NTULearn.` Every candidate exposed explicit `Applies to CA1 / CA3 / Final Examination / CA2` or `Course-level` reassignment, which is the earlier parent-association fix visible in real data.

**MA6081 (second, structurally different course).** Three Assessments (`Part 1: Group Presentation` 25%, `Part 2: Multiple Choice Quiz` 25%, `Part 3: In-Class Scenario-Based Case Study` 10%) and one important date (`Part 2 Multiple Choice Quiz`, 2026-11-14, 3.30 pm – 6.20 pm, LT-2A). No course-level Rule is confirmed; the attendance rule sits as a Requirement nested beneath `Part 2` because of a confirmed selection error, not candidate identity swapping. **62 candidates are pending review and none have been reviewed**, which is the largest single piece of outstanding Review effort across both courses. This course is also where relationship handling was originally exercised: an unresolved model-supplied parent key entered Needs Review instead of disappearing, a missing parent was exposed as an explicit `Applies to …` reassignment, and a newly confirmed child attached to an Assessment retained from an earlier scan.

**Known-risk update.** KR-01 is now satisfied for both courses at the level of detail above. KR-02 is partly closed: real PDF and real ZIP are evidenced end to end, but real PPTX and DOCX remain unestablished. KR-03 and KR-06 remain open with no real sample. KR-04 and KR-05 keep their existing wording. One further defect was found and fixed during real testing: a lease left behind by a killed Service Worker could lock a scan out permanently and surface the raw code `SCAN_INTERRUPTED`. See `docs/gate-d-consolidated-acceptance.md` for the mechanism and the fix.

## Consolidated manual acceptance run

Use the freshly built unpacked extension and a running backend. Perform this once, across the already selected real courses:

1. Open a new course: Saved Courses → Scan Ready → Discovery → Fetch → Parse → Normalize → Extract → Review.
2. During attachment permission, verify exact host text, Allow once, and on another run Deny; confirm other sources continue and View issues shows the denial.
3. Close/reopen the popup during a stage; then explicitly Cancel another scan and Continue it. Confirm these are distinct behaviors.
4. Confirm one Assessment plus attached Date/Rule, one course-level Rule, and one conflicting date field. Verify nested Brief placement, hidden Source and unresolved date exclusion from Calendar.
5. Edit one confirmed fact and add one user fact. Export selected dates and import the `.ics` into two calendar clients.
6. Run Scan again. Verify identical facts do not repeat, changed/new/relationship-changed facts do, ignored facts may reappear, missing sources delete nothing, and the edited/user-added facts are unchanged.
7. Reopen Chrome/reload the extension and verify Saved Courses, Review progress, Brief relationships and recovery state persist.

Record the course code, outcome and a redacted screenshot/export for each required item. This matrix was completed on 2026-09-17 across MA6084 and MA6081; the per-item results, the evidence and the three defects it exposed are recorded in `docs/gate-d-consolidated-acceptance.md`.

## Product feedback recorded at Gate D closure

This is the Product owner's own assessment, recorded at the point Gate D passed. It is feedback for the next version. It is not a change to the v0.1.0 baseline and it does not reopen any confirmed decision. Evidence gathered during this run is cited alongside each point so Product can weigh the judgement against real data.

### 1. The interaction path is too complex and too confused

The number of steps, and the number of near-synonymous actions, make the product hard to use; the surface order also makes it hard to get back to where you were.

Evidence from this run:

- A first scan asks for a manual decision at every stage: `Scan this course`, then an attachment-permission choice, then `Continue to fetch`, `Continue to parse`, `Continue to normalize` and `Extract course information`. That is six actions before any reviewable value exists.
- The action vocabulary is large and the consequences differ: `Continue scan`, `Continue discovery`, `Continue to fetch`, `Continue to parse`, `Continue to normalize`, `Extract course information`, `Retry extraction`, `Refresh discovery coverage`, `Try again from the beginning`, `Scan again` and `Cancel scan`. During this run, choosing wrongly among those would have discarded a checkpoint holding 399 normalized units, and nothing in the product warns of that.
- The four-surface strip is a status rail rather than navigation, so from the Scan surface there is no route to the Course Brief. The acceptance run had to switch to an unrelated tab and re-enter through Saved Courses in order to read the Brief.
- The progress display contradicts the action. Resting at a saved checkpoint, the popup titles itself `Scan in progress` and lists the five stages while nothing is actually running and the product is waiting for a click.
- The scan record is one run-on line of twelve or more segments, for example `Discovery checkpoint · 109 sources · 0 issues · 28 content pages · 30 content details · 0 announcement pages · max content depth 2 · 21 assignments · 0 announcements · 19 attachments · 0 attachment URLs pending refresh · attachment origins … · pagination not observed`.

### 2. The Course Brief is close to unreadable

The Brief is the product's payoff surface, and in its current form a person cannot comfortably read it.

Evidence from this run:

- Confirmed facts are rendered as raw JSON objects, so the reader gets `{"name": "Part 1: Group Presentation (Project Management Plan Presentation)", "weight": "25%", "format": "Group", "components": [{"name": …}]}` instead of a structured fact, and long values become walls of text.
- Child rows repeat verbose ownership labels — `Applies to CA1`, `Applies to CA3`, `Applies to Final Examination`, `Applies to CA2`, `Course-level` — once per rule and per date.
- Adjacent controls run together without separation, for example `EditSource`, which reads as a single word.
- Dates belonging to different assessments are interleaved under a single `Other Important Dates` heading instead of being grouped under the assessment they belong to.
- One real deadline becomes three calendar entries: CA1 PowerPoint slides, CA1 Presentation and Role Play, and CA1 Role Play script all resolve to 2026-10-22.
- Review opens on 29 candidates for MA6084, of which roughly half restate facts already confirmed in the Brief, so the first impression of Review is a wall of near-duplicates.

Scope note: the deferred artistic visual reconstruction covers part of this, but the problem is larger than styling. The Brief needs an information-architecture pass — what a fact looks like when rendered, how ownership is expressed once rather than per row, and how dates are grouped — either before or alongside the visual work.

### 3. The Important Rules bar needs tightening, and that is a product-positioning question

Important Rules is currently too loose and admits material that is not really a rule. This should be settled from product positioning rather than patched, and corrected in the next version.

Evidence from this run — real candidates classified as important rules included:

- `View the "Negotiation Tactics Videos" in the "Content" section on NTULearn.` — an instruction to read something.
- `Total time for all groups: 8 minutes, including a 1-minute buffer.` and `Total time: 7 minutes for the Role Play.` — assessment parameters.
- `Number of slides (Presentation) must not exceed 8 slides for all groups.` and `Number of pages (Role Play) must not exceed 7 single-spaced pages.` — format specifications.
- `All written assignments must be submitted via Turnitin/NTULearn.` — submission mechanics.

Each of those is already, or should be, owned by the Assessment itself. The D-015 Grade-Impact Boundary does not by itself exclude them, because format and submission constraints can plausibly affect marks, so the current test discriminates less than the category needs. The product question to settle is what the Important Rules category is for. On the feedback recorded here, the need it serves is closer to "conditions that can cost me marks if I do not notice them", which argues for a stricter test than mere grade impact and for demoting logistics and format specifications onto the owning Assessment. This is recorded as a next-version product decision; D-015 itself was not reopened during this run.

### 4. Assessments are fragmented into many identities, which produces duplicates and an unusable relationship control

The Product owner's description, recorded as given: assessments appear "split too far apart" and can end up duplicated, and the phenomenon is hard to describe from the interface.

What the run actually shows. In MA6081's Review, one `important date` candidate — `Part 3 - Case study Assignment`, 2026-11-14, 3.30 pm – 6.20 pm, LT-2A, Tutorial 8, 1 hr, compulsory attendance — arrived with no matching parent and produced **fifteen `Applies to …` buttons plus `Course-level`**:

`Literature Review Assignment`, `Part 3 (Restricted Open Book exam)`, `Part 1 Assignment (Group Presentation)`, `Part 3 Case Study Assignment (Closed Book)`, `Part 2 (Multiple Choice Quiz)`, `Part 1`, `Multiple Choice Quiz`, `Part 1 (Group Presentation)`, `Part 2`, `Part 3`, `Part 3 (Case study assignment)`, `Restricted Open Book Exam`, `MA6081 Examination`, `Group Presentation`, `Individual Assignment: Project Management Plan Presentation`.

Those fifteen names denote **three** real assessments: Part 1 Group Presentation (five variants), Part 2 Multiple Choice Quiz (three variants) and Part 3 Case Study (five variants). Two of them — `Literature Review Assignment` and `MA6081 Examination` — correspond to nothing in the course at all.

Root cause in the code. The reassignment list is built from every assessment-kind candidate in the current Review batch plus assessments already in the Brief (`popup/index.ts`, the `candidateParents` / `existingParents` loop). Because D-014 makes relationship part of candidate identity, each spelling of the same assessment carries its own `semanticKey` and therefore becomes a separate parent candidate. The control is generated from the mess instead of correcting it, so the more the extraction fragments one assessment, the longer and less usable the list becomes.

Two consequences that matter for the next version:

- **Duplicates.** Confirming an alias button attaches the child to that alias key. If the Brief already holds the real assessment under a different key, the Brief ends up describing one assessment twice. The same candidate also shows how duplicates start: it occupies exactly the slot the confirmed Brief assigns to `Part 2 Multiple Choice Quiz` (2026-11-14, 3.30–6.20 pm, LT-2A, Tutorial 8) while naming Part 3.
- **No signal to choose.** The correct answer here is Part 2, and Part 2 is in the list twice, with nothing distinguishing it from the twelve wrong options.

What this implies: the product needs a canonical Assessment identity — parent keys resolved to a single assessment before Review presents them, and the reassignment control offering only canonical assessments rather than every string the model produced. This touches D-014, which this run did not reopen, so it is recorded as a next-version item.
