# Syllab for NTU Learn — Gate 1 Core Loop Acceptance v0.2.0

**Product version:** v0.2.0
**Gate:** Gate 1 — Core Loop
**Status:** Awaiting Product Judgment (automated evidence recorded in
`artifacts/gates/v0.2.0/gate-1/REPORT.md`)

This document is the durable record behind the machine-generated Gate report. It states what was
verified, by what, and what a PASS does not claim.

## 1. The slice under test

```text
Course discovery
→ Initial Scan (discover → fetch → parse → normalize → Task A → Task B)
→ Initial Review
→ Current Course State
→ Source update
→ local machine comparison
→ Task A / B / C when required
→ Change Review
→ Updated Current Course State
```

Gate 1 exists because this slice is where a wrong product model would be expensive to discover
later: canonical identity, trusted-state protection, local-first persistence, the BYOK call path
and failure/retry behaviour all meet here.

## 2. Automated evidence

| Requirement | Evidence | Result |
| --- | --- | --- |
| One start advances every safe stage without a Continue button | `extension/src/v2/workflow.test.ts` — "runs discovery through review in one start" | PASS |
| Task A runs once per Source, before Task B, with Evidence bound to its Source | same test, asserting call order and `evidence[0].sourceId` | PASS |
| A machine-identical Source spends no model call at all | `workflow.test.ts` — "does not call the provider again when a Source is machine-identical" asserts `ai.calls` is empty | PASS |
| A failed Source becomes a Coverage Fact, never a removal | `coverageFromObservations` test: `partialCoverage`, no `missingAfterCoverageSourceIds` | PASS |
| A failed maintenance run leaves Current State byte-identical | `workflow.test.ts` — revision and assessment list unchanged after a failed check | PASS |
| Pending changes supersede rather than stack (Current 10 → pending 15 → latest 18) | `upsertLatestChange` test keeps one 10 → 18 item and histories 15 | PASS |
| A stale decision cannot apply over newer state | `course-state.test.ts` — `StateGuardError` for `expectedRevision` mismatch | PASS |
| Canonical identity operations (Merge / Split / Manual Add) | `course-state.test.ts` — component merge keeps aliases and re-parents facts; split creates distinct identities; manual add carries no `User-added` marker | PASS |
| Trusted-state protection across Exclude / Keep Current / Conflict / Possibly Removed | `course-state.test.ts` per-decision reducers | PASS |
| Local-first persistence with a real IndexedDB, including restore generations | `storage.ts` + `store.ts` exercised by `workflow.test.ts` on `fake-indexeddb` | PASS |
| BYOK gate: the run refuses to call without a key or either authorization | `workflow.ts` waiting path; `settings.test.ts` for the stored state | PASS |

`npm run gate:1` reproduces all of the above plus the browser end-to-end run and the screenshot set.

## 3. Product Judgment — still required

The automation can decide none of the following, and none of them are reported as PASS:

1. Course Brief reads as a course, not as a scan result, and the assessment grouping matches how
   the Course is really structured.
2. Initial Review asks only for decisions the system genuinely cannot make.
3. Change Review shows Current → Latest as a single decision rather than a stack of pending items.
4. Trusted Current State stays believable after a rejected change and after a failed check.

## 4. What is NOT TESTED

- **Live DeepSeek.** The automated run replaces the provider with recorded fixtures. A live run is
  available through `npm run gate:1 -- --live-deepseek` with `DEEPSEEK_API_KEY` present in the
  environment; it has not been performed in this environment, so the row stays `NOT TESTED`.
- **Real NTU Learn Courses.** This environment has no authenticated NTU Learn session, so no real
  Course was read. Fixtures are synthetic and are never reported as real-course evidence.
- **`.ics` import into real calendar clients.** Deferred to Gate 2.

## 5. Reserved risk

A PASS here is a PASS of the mechanical contract. If the product model itself is wrong — for
example if a "meaningful change" turns out not to be what a student cares about — the automation
will keep reporting PASS. That judgement is the Product Owner's, and it is the reason Gate 1 is a
human Gate rather than a CI step.
