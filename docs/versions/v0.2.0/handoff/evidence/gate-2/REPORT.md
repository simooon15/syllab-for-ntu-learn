# Syllab v0.2.0 gate-2 acceptance report

- Started: 2026-09-19T08:59:10.666Z
- Completed: 2026-09-19T09:00:43.555Z
- Automated result: **AUTOMATED_PASS**
- Steps executed: **14**, PASS **14**, FAIL **0**
- Live DeepSeek: **NOT TESTED**
- Real NTU Learn courses: **NOT TESTED**
- Product Judgment: **PENDING**

## Executed steps

| Step | Result | Exit | Duration | Evidence produced |
| --- | --- | --- | --- | --- |
| build+ci | PASS | 0 | 44.5s | formatting, build, strict typecheck, lint, unit tests, manifest, secret scan |
| qa-bundle | PASS | 0 | 0.4s | extension/dist-qa — the same product with the acceptance bridge and observation layer |
| core-loop-e2e | PASS | 0 | 7.5s | one-start scan through Initial Review to Current State, Source change through Change Review to updated Current State |
| screenshot-capture | PASS | 0 | 19.9s | final UI screenshot set for the Interface Spec backfill |
| shipping-bundle | PASS | 0 | 1.2s | extension/dist — the shipped bundle, rebuilt in its own configuration |
| package-extension | PASS | 0 | 1.9s | artifacts/Syllab_Extension_v0.2.0.zip — unzip and load unpacked |
| verify-package | PASS | 0 | 4s | the packaged zip extracts and loads in a clean browser profile |
| screenshot-backfill | PASS | 0 | 0.3s | Interaction & IA Spec screenshots in place, README Product Walkthrough |
| readme-backfill-verify | PASS | 0 | 1s | one walkthrough per language; a second backfill changes no byte |
| evidence-inventory | PASS | 0 | 0.3s | required screens implemented and captured, shipped bundle free of the test bridge |
| v2-contract-tests | PASS | 0 | 6.6s | domain, schema, workflow, AI-contract and reducers |
| ai-regression | PASS | 0 | 2.1s | Task A/B/C recorded regression, deterministic hard checks, live provider run when enabled |
| data-integrity | PASS | 0 | 2.4s | v0.1.0 migration and idempotency, backup/restore Full Replace atomicity, calendar event consolidation and KR-07, resumable workflow and Coverage Facts |
| package-delivery | PASS | 0 | 0.7s | artifacts/Syllab_v0.2.0_delivery.zip — documents, screenshots and Gate reports |

## Requires Product Judgment

The automation cannot decide the following. They are listed so the Product Owner can accept
or reject the Gate explicitly; nothing below is reported as PASS by the automation.

- Semester Dashboard communicates the state of a semester at a glance without becoming a task list.
- Side Panel and Full-page feel like one product at two densities, not two products.
- Background checking is quiet enough to leave on, and its freshness copy is honest.
- Backup → clean environment → Restore reproduces a Course that a student would still trust.
- Calendar Export produces one event per real deadline and files that open cleanly in a calendar client.
- The Product Mark is legible at 16px and consistent across toolbar, Side Panel and Full-page.

## What a PASS does not claim

- A `NOT TESTED` item was not exercised in this environment and is not implied by PASS.
- Automated steps use synthetic fixtures and a fake transport; no live provider call is made
  unless the live-DeepSeek step is explicitly enabled with a key present in the environment.
- Real NTU Learn validation needs an authenticated session on a real course and is never
  substituted by fixtures.
