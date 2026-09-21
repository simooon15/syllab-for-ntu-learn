# Syllab v0.2.0 gate-1 acceptance report

- Started: 2026-09-19T08:57:37.881Z
- Completed: 2026-09-19T08:59:10.159Z
- Automated result: **AUTOMATED_PASS**
- Steps executed: **8**, PASS **8**, FAIL **0**
- Live DeepSeek: **NOT TESTED**
- Real NTU Learn courses: **NOT TESTED**
- Product Judgment: **PENDING**

## Executed steps

| Step | Result | Exit | Duration | Evidence produced |
| --- | --- | --- | --- | --- |
| build+ci | PASS | 0 | 66s | formatting, build, strict typecheck, lint, unit tests, manifest, secret scan |
| qa-bundle | PASS | 0 | 0.7s | extension/dist-qa — the same product with the acceptance bridge and observation layer |
| core-loop-e2e | PASS | 0 | 10.7s | one-start scan through Initial Review to Current State, Source change through Change Review to updated Current State |
| shipping-bundle | PASS | 0 | 1.1s | extension/dist — the shipped bundle, rebuilt in its own configuration |
| evidence-inventory | PASS | 0 | 0.3s | required screens implemented and captured, shipped bundle free of the test bridge |
| v2-contract-tests | PASS | 0 | 8.1s | domain, schema, workflow, AI-contract and reducers |
| ai-regression | PASS | 0 | 2.6s | Task A/B/C recorded regression, deterministic hard checks, live provider run when enabled |
| data-integrity | PASS | 0 | 2.8s | v0.1.0 migration and idempotency, backup/restore Full Replace atomicity, calendar event consolidation and KR-07, resumable workflow and Coverage Facts |

## Requires Product Judgment

The automation cannot decide the following. They are listed so the Product Owner can accept
or reject the Gate explicitly; nothing below is reported as PASS by the automation.

- Course Brief reads as a course, not as a scan result, and the assessment grouping matches how the Course is really structured.
- Initial Review asks only for decisions the system genuinely cannot make.
- Change Review shows Current → Latest as a single decision rather than a stack of pending items.
- Trusted Current State stays believable after a rejected change and after a failed check.

## What a PASS does not claim

- A `NOT TESTED` item was not exercised in this environment and is not implied by PASS.
- Automated steps use synthetic fixtures and a fake transport; no live provider call is made
  unless the live-DeepSeek step is explicitly enabled with a key present in the environment.
- Real NTU Learn validation needs an authenticated session on a real course and is never
  substituted by fixtures.
