# Syllab for NTU Learn — Gate 2 Release Acceptance v0.2.0

**Product version:** v0.2.0
**Gate:** Gate 2 — Release Acceptance
**Status:** Awaiting Product Judgment (machine-generated evidence in
`artifacts/gates/v0.2.0/gate-2/REPORT.md`)

This is the durable record behind the machine-generated Gate 2 report. It states what the release
delivered, what was verified, and what a PASS does not claim.

## 1. Delivered scope

| Area | State | Where it lives |
| --- | --- | --- |
| Semester → Course → Current Course State → Assessment model | Delivered | `extension/src/v2/schema.ts`, `course-state.ts` |
| Canonical Assessment identity (Same / Different / Uncertain) | Delivered | Task B contract + `materialize.ts`; user decisions in `course-state.ts` |
| Course-wide Constraint (deliberately narrow) | Delivered | `constraints` table, rendered after the Assessment sections |
| Assessment Series / Component | Delivered | `role` + `parentAssessmentId`; nested presentation in `assessmentCard` |
| One-start Initial Scan | Delivered | `WorkflowEngine` (`workflow.ts`) |
| Assessment-level Initial Review | Delivered | `screens/initial-review.ts` |
| Change Detection (New / Changed / Conflict / Possibly Removed / Identity Uncertain) | Delivered | `change-reducer.ts`, `workflow.ts`, `screens/change-review.ts` |
| Opportunity Checking with local comparison first | Delivered | `fingerprint.ts`, `opportunity.ts`, `scheduler.ts` |
| Semester Dashboard, Current / Historical lifecycle | Delivered | `screens/semester.ts`, `view.ts` |
| Side Panel + Full-page, no Popup | Delivered | `sidepanel.html`, `app.html`, manifest, `screens/mount.ts` |
| Local-first + BYOK | Delivered | `storage.ts`, `store.ts`, `settings.ts`, direct DeepSeek calls |
| Backup / Restore (Full Replace, confirmed) | Delivered | `backup.ts`, `restore.ts`, Settings → Data |
| Calendar Export | Delivered | `calendar-export.ts`, projected in `view.ts`, handled in `handler.ts` |
| Semester-aware date resolution | Delivered | `date-resolution.ts`; composed for both the preview and the export by `calendar-plan.ts` |
| Product Mark (A1 Folded Brief) | Delivered | `assets/logo/`, `extension/public/icons/` as provided |
| KR-07 / KR-08 / E3 | Delivered | see §3 |
| Rebuild (preview, then adopt or decline) | Delivered | `staging.ts`, `screens/rebuild.ts` |

## 2. Automated evidence

Every step of `npm run gate:2` passed. The step list and its counts are in
`artifacts/gates/v0.2.0/gate-2/REPORT.md`, generated from `report.json` for that run rather than
maintained here — a count written into this document by hand is a count that goes stale.

Listed in the order they run, which is the order in `REPORT.md`:

| Step | What it establishes |
| --- | --- |
| build+ci | format, build, strict typecheck, lint, unit tests, manifest validation, secret scan |
| acceptance-bundle | the bundle under test carries the deterministic E2E bridge |
| core-loop-e2e | the real extension drives discovery → Initial Scan → Initial Review → Current State → Source change → machine comparison → Change Review → updated Current State, including a stale-writer rejection |
| screenshot-capture | all 39 required screens and states render from the real build |
| shipping-bundle | the bundle is rebuilt without the test bridge before anything is packaged |
| package-extension | the release archive is produced from a build whose every file is free of the bridge, a fixture seed, a key-shaped string and source maps |
| verify-package | that archive is unzipped and loaded as an unpacked extension in a clean profile; every file inside it is read, not only the scripts |
| screenshot-backfill | those screenshots are in the Interaction & IA Spec, and the README walkthrough is built from the same set |
| readme-backfill-verify | the README carries exactly one walkthrough per language and a second backfill changes no byte |
| evidence-inventory | every required screen exists and is captured; no internal id, key-shaped string, test bridge or source map anywhere in the shipped bundle |
| v2-contract-tests | domain, schema, workflow, AI contracts and reducers |
| ai-regression | Task A/B/C recorded regression, deterministic hard checks |
| data-integrity | v0.1.0 migration and idempotency, restore atomicity, calendar consolidation, workflow coverage |
| package-delivery | the delivery archive is built last, so it carries the documents this run produced rather than the previous run's |

Screenshots are captured with `prefers-reduced-motion: reduce`, which the design system already
requires to neutralise every animation, so a screenshot cannot record a half-faded page.

## 3. Inherited defects closed

- **KR-07 — Calendar could silently omit a confirmed date.** Export now reads typed date facts
  rather than searching field names for something date-shaped, which was the omission's cause.
  Covered by `calendar-export.test.ts`.
- **KR-08 — a misleading Retry could follow a successful Extraction.** Retry is reachable only from
  a persisted failure (`paidRetryAvailable` is set only in `fail()`), and it states whether it may
  consume API.
- **E3 — an internal Blackboard course id could reach a user-visible name or `.ics` filename.**
  Filenames use the sanitised course code or name with a non-id fallback; a migration test asserts
  the readable name survives; an inventory check rejects internal-id shapes in rendered screens.

## 4. Requires Product Judgment — not reported as PASS

1. Semester Dashboard communicates a semester at a glance without becoming a task list.
2. Side Panel and Full-page feel like one product at two densities.
3. Background checking is quiet enough to leave on, and its freshness copy is honest.
4. Backup → clean environment → Restore reproduces a Course a student would still trust.
5. Calendar Export produces one event per real deadline, and the `.ics` opens cleanly in a calendar
   client.
6. The Product Mark is legible at 16px and consistent across toolbar, Side Panel and Full-page.

## 5. What is NOT TESTED

- **Live DeepSeek.** The automated run substitutes a recorded transport. Run
  `npm run gate:2 -- --live-deepseek` with `DEEPSEEK_API_KEY` in the environment to exercise the
  real provider.
- **Real NTU Learn Courses.** This environment has no authenticated session, so no real Course was
  read. Two structurally different real Courses remain the PRD's requirement, and synthetic
  fixtures are never reported as satisfying it.
- **`.ics` import into two calendar clients.** Written correctly and structurally validated, and the
  file is now produced by the real export path, but not opened in a real client here.
- **A calendar built from a real Course's dates.** The resolver completes a day and month from the
  Course's Semester (`18 Oct` + `AY2026/27 · Semester 1` → `2026-10-18`), and the acceptance Course
  now exports its six dates. What is unverified is the real case: whether a real extraction returns
  date forms the resolver covers, and whether a real Course has any Semester to resolve against.
  v0.2.0 has no runtime semester or course discovery — every writer of a Semester or Course record
  is the v0.1.0 migration or an acceptance fixture — so on a real NTU Learn course the Semester
  context is currently absent and the resolver correctly declines to guess. Gate 3 is where that is
  observed rather than argued.
- **Mixed PDF page images.** Page rasterisation needs a rendering context a Service Worker does not
  have. The transport refuses a text-only extraction rather than misreporting a visual Source as
  understood, so a mixed PDF currently fails loudly instead of degrading quietly. Wiring the
  offscreen renderer remains open and is not on either Gate's path.
- **Real PPTX / DOCX, legacy Office, oversize, no-text and corrupt files.** Unchanged evidence gap
  carried from v0.1.0.

## 6. What a Gate 2 PASS does not claim

A PASS means every step above executed and succeeded. It does not mean the six Product Judgment
items are accepted, and it does not convert any `NOT TESTED` row into evidence. Those are the
Product Owner's to decide, and this document exists so that decision is explicit rather than
implied.
