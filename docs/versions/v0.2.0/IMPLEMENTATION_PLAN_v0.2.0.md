# Syllab for NTU Learn — Implementation Plan v0.2.0

**Product version:** v0.2.0  
**Status:** HISTORICAL · implementation complete  
**Technical basis:** `TECHNICAL_DESIGN_v0.2.0.md`

## 1. Execution rules

- Preserve the five untracked v0.2.0 handoff inputs and all user changes.
- Work in vertical slices. Run affected tests during a phase and the full `npm run ci` at each Gate.
- A phase proceeds automatically when its deterministic acceptance passes.
- Stop only for a Product-impacting Technical Conflict, an unresolvable critical failure, required
  external action/Product Judgment, or final Gate acceptance.
- Script-first: CLI, fixtures, validators, fake clocks, browser extension automation, and automated
  screenshots precede manual/Computer Use.
- Any extension-bundle real-browser check requires rebuilding, reloading the unpacked extension,
  and refreshing already-open NTU Learn tabs.

## 2. Phase map

| Phase | Vertical slice | Gate | Main dependency |
|---|---|---|---|
| 0 | Version archive, baseline, contracts, harness | G1 | v0.1.0 baseline |
| 1 | Local data model, migration, E4/E5 hardening | G1 | 0 |
| 2 | BYOK, authorizations, DeepSeek transport | G1 | 1 |
| 3 | Task A/B/C schemas, context, regression | G1 | 2 |
| 4 | Resumable initial workflow + canonicalization | G1 | 3 |
| 5 | Initial Review + Current Course State + core UI | G1 | 4 |
| 6 | Fingerprint, Task C, Change Review | G1 | 5 |
| 7 | Gate 1 automation/evidence | G1 | 0–6 |
| 8 | Semester lifecycle, discovery and dashboards | G2 | 7 |
| 9 | Opportunity Checking and freshness | G2 | 8 |
| 10 | Full Side Panel/Full-page interaction families | G2 | 8–9 |
| 11 | Backup/Restore and Rebuild staging | G2 | 10 |
| 12 | Calendar, Product Mark, KR-07/KR-08/E3 | G2 | 10 |
| 13 | Error/recovery, i18n and hardening | G2 | 11–12 |
| 14 | Gate 2 E2E, real-course evidence, screenshots | G2 | 0–13 |
| 15 | Spec/README backfill, archive sync-ready set | Freeze | 14 |

## 3. Phase 0 — version foundation and harness

Deliver:

- archive formal v0.2.0 documents under `docs/versions/v0.2.0/` without changing product meaning;
- version packages/manifests to 0.2.0;
- add deterministic fixture builder and Playwright/Chromium extension harness;
- add `gate:1` and `gate:2` command shells that always emit a report, including failures;
- establish a clean baseline and record inherited NOT TESTED evidence.

Automated acceptance:

- format/type/lint/build/test/manifest/secret scan;
- harness loads the unpacked extension and resolves its extension ID;
- supplied documents are present and version titles match filenames;
- no private fixture or secret-pattern regression.

## 4. Phase 1 — local model and migration

Deliver IndexedDB v6 stores/repositories, transactions, revisions, v0.1 migration, per-record lease
recovery, initialization error state, and typed query projections. The version is 6 rather than the
v5 the phase was scoped against because generation-scoped durable tables (required for an atomic
Full Replace restore) were added inside the same store set; see Technical Design §3.1.

Automated acceptance:

- clean install, v0.1 upgrade, repeated migration, future-schema read-only failure;
- user-visible course names survive migration;
- accepted Brief/Evidence relationships survive;
- concurrent initialization cannot overwrite a newer task record;
- injected migration/write failure preserves the prior readable database.

## 5. Phase 2 — BYOK and authorization

Deliver masked Settings API-key flow, direct DeepSeek transport, validation, separate Privacy/API
Usage records, return context, redacted diagnostics, and removal of Backend dependency from the
ordinary extension path.

Automated acceptance:

- key never appears in Backup, IndexedDB, logs, UI query responses, source map, or built assets;
- missing/invalid/revoked states map to the correct waiting reason;
- Settings completion resumes the exact workflow context;
- mocked 400/401/402/422/429/500/503 and truncation map to stable errors and bounded retry.

## 6. Phase 3 — AI contracts and context

Deliver versioned Task A/B/C schemas/validators, accepted prompt resources, chunking, mixed-PDF
selection, complete concise Task B index/evidence expansion, Task C context, budgets, and regression
runner.

Automated acceptance:

- accepted A6/B6+C8 baseline plus B calibration pass deterministic hard checks;
- positive `PARTIALLY_UNDERSTOOD` fixture passes;
- malformed/truncated/unknown-reference outputs fail or repair as designed;
- long Source chunk overlap never loses or duplicates locator lineage;
- no local semantic shortlist/score/authority heuristic exists in routing.

## 7. Phase 4 — initial workflow and canonicalization

Deliver one-start automatic discovery→A→B orchestration, exact permission wait/resume, Assessment
Draft materialization, canonical identity proposals, Component/Series/Constraint structures, leases,
idempotent paid calls, and source Coverage Facts.

Automated acceptance:

- one command advances every safe stage without Continue buttons;
- surface close/reopen and forced worker termination resume from committed units;
- paid unit retry does not duplicate application or accepted objects;
- permission denial produces partial Coverage without removal semantics;
- aliases consolidate and ambiguous identity becomes a user Review Item.

## 8. Phase 5 — Initial Review and Current State

Deliver whole-Assessment review, Confirm/Edit/Exclude/Review later/Same assessment as/Split/Manual
Add, incremental Current State, readable Brief, Evidence toggle, Course-wide Constraints, and shared
Side Panel/full-page query modules.

Automated acceptance:

- no normal UI renders raw JSON or Candidate wall;
- Confirm immediately updates Current State without waiting for queue completion;
- Exclude memory is tied to unchanged Evidence; Merge targets canonical objects only;
- Component/Series hierarchy and Assessment-specific facts project once;
- both surfaces render the same revision and preserve independent navigation context.

## 9. Phase 6 — maintenance and Change Review

Deliver canonical Source fingerprints, machine comparison, B/C maintenance workflow, Current-vs-
Latest pending changes, Changed/New/Conflict/Possibly Removed/Identity Uncertain review reducers,
History, and trusted-state concurrency protection.

Automated acceptance:

- unchanged Source produces zero AI transport calls;
- fetch/parse/permission/partial failure cannot produce Possibly Removed;
- Current 10 → 15 → 18 renders one 10 → 18 item and histories 15;
- Conflict/identity uncertainty/Keep Current never overwrite trusted state;
- kept Possibly Removed remains current/exportable and reappearance auto-resolves;
- stale workflow revisions cannot apply over a newer Current State.

## 10. Phase 7 — Gate 1 Core Loop

`npm run gate:1` performs:

```text
Build → CI checks → migration/data tests → recorded AI regression
→ extension integration E2E → service-worker interruption/failure injection
→ screenshot/evidence capture → Gate 1 report
```

Required fixture loop:

```text
Course discovery → Initial Scan → A/B → Initial Review → Current State
→ Source update → machine difference → A/B/C → Change Review → updated state
```

The report distinguishes Automated PASS/FAIL, live-DeepSeek status, real-course status, and Product
Judgment. Deterministic PASS permits automatic continuation into Phase 8; final Human/Product Gate
acceptance remains pending until presented to the user.

## 11. Phase 8 — Semester model and dashboards

Deliver native Semester/Curriculum Course discovery, Current/Historical rollover, Add/Drop data
protection, Full-page Dashboard cards, Side Panel Course List, switcher, empty/not-established
states, and context-aware Toolbar entry.

Acceptance covers curriculum filtering, no auto-scan, established previews from Current State,
historical no-check default, Side Panel fallback to Course List, and no Popup in manifest/bundle.

## 12. Phase 9 — Opportunity Checking

Deliver normal-use scheduling, per-course throttle/backoff, single-flight queue, manual shared path,
quiet transient failure, successful freshness, and long-term attention escalation.

Acceptance uses fake clocks and transport spies: no per-open full scan, Historical exclusion,
unchanged zero AI, bounded retry, and thresholded stale attention.

## 13. Phase 10 — complete interaction families

Implement all required SEM/CRS/ISC/IRV/CRV/RBL/CAL/SET/BKP and SYS states from the Interaction Spec,
responsive Side Panel/full-page layouts, real navigation, status priority, return context, first-use
hints, and English i18n catalogue.

Automated DOM/accessibility/visual acceptance checks every required screen ID, keyboard focus,
reduced motion, copy key, status priority, and surface-specific layout.

## 14. Phase 11 — Backup/Restore and Rebuild

Deliver canonical backup/digest, limits/validation/summary, confirmed Full Replace generation swap,
rollback, post-startup GC, and isolated rebuilt-state preview/use/keep.

Acceptance executes export → clean profile → restore and compares all required durable tables;
asserts key/cache/runtime exclusion; injects validation/write/crash failures; and proves old state stays
byte-equivalent before atomic switch.

## 15. Phase 12 — Calendar, Product Mark, inherited defects

Deliver typed-date export, real-event consolidation, Conflict gate, Possibly Removed behavior,
sanitized course filenames, A1 Folded Brief assets/manifest wiring, and failure-only paid retry UI.

Acceptance includes KR-07 fixtures, event-equivalence fixtures, RFC 5545 validation, two common
Calendar clients at final acceptance, asset pixel/dimension checks, 16px screenshot, no internal ID
copy, and no retry after successful extraction.

## 16. Phase 13 — hardening

Deliver error/detail copy, offline read, parser and AI failure isolation, authorization revocation,
storage quota/integrity handling, accessibility, performance budgets, fixture/privacy audit, and
full E4/E5 regressions.

Acceptance fault-injects every stable error category and confirms Current State remains readable,
no false removal/review is created, and recovery resumes at the last committed unit.

## 17. Phase 14 — Gate 2 Release Acceptance

`npm run gate:2` performs Gate 1 plus full UI/E2E, Opportunity, backup/restore, rebuild, calendar,
icons, accessibility, evidence inventory, and final CI. Automated screenshot capture writes stable
paths under `docs/versions/v0.2.0/images/`.

Real/private validation, where practical:

- at least two structurally distinct NTU Learn Courses;
- exact permission path and authenticated attachment bytes;
- live DeepSeek BYOK A/B/C;
- `.ics` import into two common clients;
- final visual/Product Judgment.

Unavailable real samples remain accurately `NOT TESTED`; static/theoretical evidence is never
reported as real PASS.

## 18. Phase 15 — release documentation and freeze

- Backfill every required screenshot at its corresponding Interaction Spec screen/state section.
- Update root README Chinese-first/English Product Walkthrough from the same final screenshots.
- Complete v0.2.0 Product Handoff with delivered scope, PASS/NOT TESTED, fixes, risks, and status.
- Verify version archive and prepare the Interaction/IA, PRD, Product Handoff, Technical Design,
  Implementation Plan, Gate reports, and README snapshot as a sync-ready set.
- If Feishu access is unavailable, record external sync as pending; do not claim completion.

## 19. Phase 16 — Production / QA build separation and real acceptance

Deliver two builds from one source, a QA observation layer that cannot change product behaviour, and
a one-click runner that drives the machine's own Chrome against real NTU Learn and the real
provider.

- `npm run build` → `extension/dist`; `npm run build:qa` → `extension/dist-qa`. The only difference
  is which module two imports resolve to, so the acceptance evidence is evidence about the shipped
  product.
- `scripts/verify-build-separation.mjs` proves it mechanically and runs inside `npm run ci`: the
  shipped bundle has no `qa.` marker, the QA bundle has one, and **the set of source files behind
  every bundle is identical** apart from the QA layer's own five files.
- `scripts/real-test.mjs` + `Run Syllab Real Test.command` + `npm run test:real`; system Google
  Chrome, dedicated profile at `.tmp/syllab-qa-profile/`, no access to the Product Owner's everyday
  profile. Output in `artifacts/real-test/`.
- Gate 1 and Gate 2 move to the QA build; the shipped ZIP keeps its own absence checks.

Acceptance covers: shipped bundle free of the QA layer, QA bundle observable, both builds from the
same modules, a two-Course real run reported from the product's own trace, and `NOT TESTED` wherever
the run could not tell.

## 20. Current execution status

| Phase | Status | Evidence |
|---|---|---|
| 0 | **Done** | `npm run ci` green; both design documents written; Playwright harness and the deterministic E2E bridge exist |
| 1 | **Done** | IndexedDB v6 with generation-scoped durable tables (`storage.ts`, `store.ts`); `LocalDatabase.replaceGeneration` swaps state atomically |
| 2 | **Done** | Masked Settings flow and separate Privacy / API-Usage records (`settings.ts`); the key never enters IndexedDB, a Backup or a view payload |
| 3 | **Done** | Prompts byte-identical to the handoff; chunking, context builders, contract validators and offline regression fixtures (45 AI regression tests) |
| 4 | **Done** | `WorkflowEngine` advances discovery→A→B in one start under a lease; every AI unit carries a deterministic idempotency key |
| 5 | **Done** | Whole-Assessment review decisions, canonical merge/split/manual add, incremental Current State with revision guards |
| 6 | **Done** | Fingerprints and machine comparison; a machine-identical Source spends zero model calls; pending changes supersede rather than stack |
| 7 | **Automated PASS** | `npm run gate:1` → `artifacts/gates/v0.2.0/gate-1/REPORT.md`; record in `gate-1-core-loop-acceptance.md` |
| 8 | **Done (completed in Phase 16)** | Semester / Course records with Current / Historical lifecycle, SEM-01…07, toolbar routing on tab context. The lifecycle was exercised only by fixtures at the time: no runtime path created a Semester or Course record, so a real user saw an empty Semester Dashboard and `StartScan` failed with `COURSE_NOT_FOUND`. `enrollment.ts` closed that in Phase 16 — see `DIRECTION_ADJUSTMENTS §2.24` |
| 9 | **Done** | Per-course interval, unchanged backoff and bounded transient retry in `opportunity.ts`, single-flight selection in `scheduler.ts`, alarm wiring in `background/index.ts`; fake-clock tests cover the thresholds |
| 10 | **Done** | All 47 Screen ids render; 39 required screenshots captured through the real render path; 50 DOM tests in `screens/render.test.ts` |
| 11 | **Done** | Backup export and Full Replace restore with digest + generation swap; Restore validates and summarises before it replaces anything; Rebuild accumulates in `staging.ts` and only swaps Current State on adoption |
| 12 | **Done** | Typed-date calendar export with event consolidation (`calendar-export.ts`, 12 tests); official Product Mark installed from the provided asset set; KR-08 retry is reachable only from a persisted failure |
| 13 | **Done** | Stable error taxonomy surfaced through `handler.ts` copy, with codes only inside Details; offline read, authorization revocation and parser/AI failure isolation covered by the failure-path tests |
| 14 | **Automated PASS** | `npm run gate:2` → `artifacts/gates/v0.2.0/gate-2/REPORT.md`; record in `gate-2-release-acceptance.md` |
| 15 | **Done (screen and README backfill)** | 39 screenshots backfilled into the Interaction & IA Spec with captions; README Product Walkthrough written in both languages. External knowledge-base sync remains to be executed elsewhere |
| 16 | **Ready; real run pending Product Owner** | Production / QA separation with a mechanical check inside `npm run ci`; real Course discovery implemented (`enrollment.ts`); the `Scan course` transition the Interaction Spec draws implemented; one-click runner ready. Gate 1 and Gate 2 re-run on the QA build: both AUTOMATED PASS. The real run needs the QA extension loaded and an NTU sign-in, which only the Product Owner can do |

This table is updated only from evidence; planned work is never marked PASS.

### 20.1 Known gaps

- **Mixed-PDF page images.** Page rasterisation needs a rendering context that a Service Worker
  does not have; the transport refuses a text-only extraction rather than misreporting a visual
  Source as understood. Wiring the offscreen renderer is required for mixed PDFs and is not on the
  Gate 1 path.
- **Real-course evidence.** No authenticated NTU Learn session exists in this environment. The
  one-click runner reaches the point where it needs one; the two-real-course acceptance stays
  `NOT TESTED` until the Product Owner signs in. Every row the runner cannot verify is reported as
  `NOT TESTED` rather than assumed.
- **Blackboard payload shapes.** Discovery reads the documented Blackboard Learn REST API
  (`users/me`, `users/{id}/memberships?expand=course`, `terms/{id}`) and is tested against those
  shapes, but no response from NTU Learn itself is in evidence yet. The unauthenticated routes are
  verified to exist — every one answers `401 API request is not authenticated` where an invented
  path answers `404 API is not found` — and the first real run confirms or corrects the parsing.
