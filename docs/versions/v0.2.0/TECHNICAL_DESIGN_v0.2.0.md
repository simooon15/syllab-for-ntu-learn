# Syllab for NTU Learn — Technical Design v0.2.0

**Product version:** v0.2.0  
**Status:** Final as-built technical design · Engineering Freeze  
**Product inputs:** `PRD_v0.2.0.md`, `PRODUCT_HANDOFF_v0.2.0.md`, `Interaction_and_Information_Architecture_Spec_v0.2.0.md`  
**Historical baseline:** v0.1.0 implementation and Gate D acceptance

## 1. Decision summary

No Product-impacting Technical Conflict was found. The implementation may proceed without changing
the locked product, AI, or interaction semantics.

v0.2.0 keeps the proven v0.1.0 discovery, exact-host permission, fetch, parser, normalization, and
evidence foundations. It replaces the popup-centric orchestration, Candidate/Brief ownership model,
and backend-proxy AI path with:

- a Side Panel and Full-page shell reading one local application state;
- an IndexedDB v6 local-first aggregate store;
- a persisted, resumable workflow orchestrator;
- direct DeepSeek BYOK calls from the extension;
- Task A/B/C schema-validated semantic stages;
- canonical Assessment and Current Course State aggregates;
- deterministic Source fingerprints before any maintenance AI call;
- atomic backup/restore and rebuild staging areas.

The v0.1.0 backend remains historical/dev code but is not in the ordinary v0.2.0 runtime path.

## 2. Runtime architecture

```text
Toolbar action
  ├─ recognised NTU Learn course → Side Panel
  └─ otherwise                  → Full-page Extension Page

Side Panel / Full-page
  ↔ typed runtime messages + chrome.storage change summaries
Service Worker
  ├─ durable Workflow Orchestrator
  ├─ Discovery / Fetch / Parse / Normalize (retained adapters)
  ├─ Source Fingerprint / Coverage Engine
  ├─ Task A / B / C Context Builders and DeepSeek Client
  ├─ Review / Current State / History reducers
  ├─ Calendar / Backup / Restore / Rebuild coordinators
  └─ IndexedDB v6 + chrome.storage.local summaries
```

All authoritative Course data is local. UI surfaces are projections and never own workflow or
course facts. Service-worker memory is disposable; every runnable unit is reconstructed from a
persisted task record and protected by an expiring lease.

### 2.1 Semester / Curriculum Course discovery

```text
NTU Learn tab finishes loading, or the toolbar action fires on one
  ↓ ENROLLMENT_API_GET (content script, read-only scope, session cookie)
GET /learn/api/public/v1/users/me
GET /learn/api/public/v1/users/{id}/memberships?expand=course
GET /learn/api/public/v1/terms/{termId}
  ↓
SemesterRecord per term  ·  CourseRecord per Course that belongs to one
  ↓
Semester Dashboard
```

`extension/src/v2/enrollment.ts` owns this read and the mapping onto the product's own records.
A Course belongs to the Semester structure when the native record names a term; an Organization, a
sandbox and anything else without one is not a Curriculum Course and is excluded (PRD §5.1.5). The
term whose own dates contain now is Current; the rest are Historical. Discovery writes identity and
semester membership and nothing else — a Course arrives **Not Established**, and
`Auto-discovery ≠ Auto-scan` holds because nothing in this path starts a workflow.

A Course the native side stops listing is marked `missingFromNative` rather than deleted, and a
Course that comes back loses the mark. Add/Drop must not take a Course Brief, its Review decisions
and its Calendar with it.

The Semester label is the form the date resolver reads (`AY2026/27 · Semester 1`, §2.17 of
DIRECTION_ADJUSTMENTS). A native term name that already carries both the academic year and the term
is kept as it is; otherwise the label is derived from the term's own dates using the same month
windows, and a term that states neither keeps its native name and leaves its dates unresolved rather
than inventing a year.

The Content Script serves this scope from its own allow-list
(`validateEnrollmentEndpoint`), separate from the course-content one. A reply body cannot widen
either: the next request is validated the same way the first was.

## 3. Local-first persistence

### 3.1 IndexedDB v6 stores

There is one database, `syllab-local`, and v0.2.0 opens it at version **6**
(`V2_DATABASE_VERSION` in `extension/src/v2/schema.ts`). The version moved from 5 to 6 because
v0.2.0 adds the store set below *and* generation-scopes it; the two changes ship together because a
store created without its generation column would be unreadable to the restore path that depends on
it.

Version 5 is the v0.1.0-era layout. It holds five stores — `candidates`, `reviewProgress`,
`briefItems`, `parsedSources`, `normalizedUnits` — which v6 keeps and does not alter. Migration
therefore reads a v0.1.0 database in place rather than through an export/import step. The v0.1.0
repository module `extension/src/repository/local-database.ts` still names version 5; it is
retained as that layout's definition and is not on the v0.2.0 runtime path.

What v6 adds over v5:

- the 17 stores below, none of which exist at v5;
- `restoreGeneration` on every durable record (`GENERATION_FIELD`), and
  `appMetadata.activeGeneration` naming the live generation. Restore writes a complete new
  generation and only then moves that pointer, so an interrupted restore is never observable as a
  half-applied state. Runtime tables are cleared when the active generation changes.

The upgrade handler is additive — it creates what is missing and touches nothing that exists — so
opening a v0.1.0 database at version 6 adds the new stores and leaves the v0.1.0 rows readable.

| Store | Key | Purpose |
|---|---|---|
| `semesters` | `semesterId` | Current/Historical lifecycle and native semester identity |
| `courses` | `courseId` | User-facing code/name, semester membership, established state |
| `courseStates` | `courseId` | Current Course State revision pointer and freshness |
| `assessments` | `assessmentId` | Canonical Assessment, Component and Series hierarchy |
| `constraints` | `constraintId` | Narrow Course-wide Constraints |
| `facts` | `factId` | Typed fields/requirements, marks and state |
| `sources` | `sourceId` | Stable Source identity and latest machine representation |
| `evidence` | `evidenceId` | Immutable field-level excerpts and visual locators |
| `sourceObservations` | `observationId` | Per-run fetch/parse/fingerprint/Coverage Facts |
| `reviewItems` | `reviewItemId` | Only unresolved Initial/Change/Rebuild decisions |
| `reviewDecisions` | `decisionId` | Append-only Confirm/Edit/Exclude/Merge/Split/etc. decisions |
| `exclusionMemory` | `memoryId` | Evidence-fingerprint-bound false-positive suppression |
| `changes` | `changeId` | Current-vs-latest pending semantic change |
| `history` | `historyId` | Append-only accepted state transitions and superseded pending values |
| `workflows` | `workflowId` | Durable phase, cursor, waiting/failure/retry state and return context |
| `aiRuns` | `aiRunId` | Redacted request lineage, schema version, usage and outcome |
| `appMetadata` | `key` | Schema version, current semester and restore generation |

Large temporary parse/chunk data stays in the existing parsed/normalized stores and is garbage
collected after durable Evidence and AI lineage are committed. Raw file bytes are not retained.

### 3.2 IDs and revisions

- Native Blackboard identifiers anchor Semester, Course, and Source identity.
- `assessmentId` is generated once when a canonical proposal is accepted and survives aliases,
  edits, scans, and semester use.
- Facts use stable IDs independent of their current value.
- Each Course State update creates a monotonically increasing `revision` in one transaction.
- History references `fromRevision`, `toRevision`, affected IDs, decision, and evidence; it does not
  duplicate an entire state snapshot.

### 3.3 Migration from v0.1.0

Migration is idempotent and runs in a single IndexedDB upgrade transaction:

1. Copy v0.1.0 course summaries and human-readable names into `courses` (fixes E3).
2. Convert confirmed assessment Brief items into canonical assessments and facts.
3. Attach child Brief items through existing parent IDs/semantic keys; unresolved ownership becomes
   a migration review item and is never guessed.
4. Preserve Candidate/Evidence references as immutable lineage.
5. Convert active scans into resumable legacy-import workflows or safe Failed records.
6. Leave old stores readable for rollback during v0.2.0 development; delete none in v6.

Migration tests use v0.1.0 database snapshots and assert stable repeated execution.

### 3.4 Atomicity and E4/E5 hardening

E4 is fixed: initialization never rewrites the scan/workflow collection from a stale snapshot.
Expired leases are updated per record in read-write transactions after rereading the target.

E5 is fixed: initialization errors are caught, persisted as a stable global attention record, and
exposed to both UI surfaces. Message handling is not advertised ready until schema initialization
succeeds. Unsupported future schemas are read-only and never overwritten.

## 4. API key and authorizations

### 4.1 API-key storage

The DeepSeek API key is stored only in `chrome.storage.local` under a dedicated key, never in
IndexedDB, Backup, logs, fixtures, runtime messages returned to ordinary views, or diagnostic
exports. Settings sends writes directly to the Service Worker; reads return only
`missing | valid | invalid` and a short masked suffix.

Chrome extensions cannot provide a durable encryption secret that is both unattended and
independent of the same local profile. Therefore v0.2.0 does not claim cryptographic protection
against a compromised Chrome profile. The design uses extension-origin isolation, minimum exposure,
no sync, no export, immediate buffer disposal, and masked UI. This is an implementation truth, not a
change to BYOK semantics.

### 4.2 Authorization records

Privacy Authorization and API Usage Authorization are separate versioned records:

```text
{ granted, policyVersion, grantedAt, revokedAt? }
```

Privacy permits sending necessary course content to DeepSeek. API Usage permits automatic paid
calls, including Opportunity Checking after a machine change. Revoking either blocks new calls but
does not affect offline-readable state. A task waiting for either stores its return context and
continues only after the exact authorization is restored.

## 5. Workflow orchestrator

### 5.1 Durable task state

```text
Workflow {
  workflowId, courseId, kind: initial | check | rebuild,
  state: queued | working | waiting | saved | failed | complete,
  phase, phaseCursor, attempt, nextAttemptAt?, lease?,
  waitingReason?, errorCode?, returnContext?,
  baseCourseRevision?, stagingRevision?, createdAt, updatedAt
}
```

Initial Scan automatically advances through discover, fetch, parse, normalize, Task A, Task B, and
review materialization. It pauses only for exact host permission, API key, one of the two
authorizations, Initial Review, or an unrecoverable failure. Closing either surface has no effect.

Every unit is idempotent. A unit transaction commits its output and next cursor together. Leases
prevent concurrent duplicate work; expired leases are recoverable. Retry is exposed only when a
persisted failure exists and records whether a new paid call will occur, closing KR-08.

### 5.2 Initial, maintenance, and rebuild isolation

- Initial work writes Drafts and Review Items; Confirm creates Current State incrementally.
- Maintenance uses the Course revision captured at start. Task C output is rebased or rerun if that
  revision changed before review materialization.
- Rebuild writes a separate staging Course State. Only `Use rebuilt course` swaps the current
  revision pointer; `Keep current course` deletes staging data. Failure cannot touch Current State.

## 6. Source identity and machine-change detection

Each successfully inspected Source produces:

```text
MachineRepresentation {
  sourceId, fetchStatus, parseStatus,
  canonicalMetadataHash,
  contentHash,
  structureHash,
  representationVersion
}
```

Hashes are SHA-256 over canonical UTF-8 representations with volatile signed URL parameters,
transport timestamps, whitespace noise, and ordering noise removed only where the source model says
order is irrelevant. Native IDs and parent relationships remain part of identity/structure.

Comparison outcomes are exactly `unchanged`, `machine-different`, `new-source`, `missing-after-
successful-coverage`, or `incomparable`. Only `machine-different`/`new-source` enter Task A/B/C.
Missing is only a Coverage Fact; it is never locally promoted to Possibly Removed. Failed,
permission-denied, partial, or incomparable observations make removal coverage insufficient.

## 7. Opportunity Checking

The Service Worker schedules checks only when normal NTU Learn use wakes the extension. There is no
server polling and no promise of real-time monitoring.

- Current Semester + Established only; Historical is excluded.
- Per-course minimum interval: 6 hours.
- Successful unchanged backoff: 6h → 12h → 24h (cap).
- Manual `Check for updates` bypasses the interval but shares the same engine and single-flight lock.
- One course runs at a time; foreground initial/review/rebuild work wins.
- Transient failures retry silently with bounded exponential backoff and jitter (5m, 30m, 2h).
- Three consecutive failures or 72 hours without a successful check creates `Needs attention`.
- Unchanged Sources end before context assembly and consume zero DeepSeek calls.

Intervals are configuration constants covered by fake-clock tests, not user-facing promises.

## 8. Task A/B/C calls and context retrieval

AI behavior、Prompt policy、invocation / retry / recovery、cache identity、observability 与 AI limitation 的
current authoritative source 是 `AI_DESIGN_v0.2.0.md`。本章保留 modules、interfaces、data flow、
validation 与实现架构；其中的历史 baseline / correction 段落是工程事实，不建立平行 AI policy。

### 8.1 Physical call strategy

Logical tasks remain separate. v0.2.0 uses separate physical calls for A, B, and C because this
provides independent schema validation, retry/idempotency, usage visibility, and regression
evidence. Calls are never merged in Gate 1. A later optimization may combine B/C only after an
evaluation proves identical semantics; it is not needed for v0.2.0 acceptance.

### 8.2 Task A chunking

- Prefer native page/slide/section/table boundaries.
- Text target: 10,000 Unicode characters; hard limit: 14,000.
- Overlap: the last complete paragraph, capped at 800 characters.
- Every chunk carries `chunkIndex/count` and exact locator range.
- Chunk results are consolidated per Source by a second Task A consolidation call only when more
  than one chunk contains relevant information; this call cannot add unsupported Evidence.
- Retries use deterministic request IDs derived from workflow/source/chunk/schema/prompt versions.

### 8.3 Mixed PDFs — text baseline delivered, page images **Planned / not implemented in the current v0.2.0 delivery**

**Delivered.** PDF.js text extraction is the baseline. Each page becomes a text unit at locator
`page:N`; a page with no extractable text is marked `partial` and carries empty text, and the Source
parses as `partial` rather than as `parsed`. Direct PDF upload and default OCR are not used.

**Not delivered.** Rasterizing low-text or image-heavy pages and sending them as page images. The
type plumbing exists end to end — `FetchedSource.pageImages` in `extension/src/v2/workflow.ts` and
the `visualParts` branch of `extension/src/v2/ai-context.ts` — but **no code path produces a page
image**, so the branch is never taken in a real run. The offscreen document that would host
rasterization is not wired into any v0.2.0 entry point: `extension/src/background/parse-runner.ts`
creates it, and nothing imports that module.

Consequence, stated plainly: an image-only page in a mixed PDF is currently read as empty text. It
is not rendered, not sent to the model, and not reported as understood. Wiring the offscreen
renderer is open work and is on neither Gate's path. Gate 2 records this as NOT TESTED, and the
image-page path has no automated evidence or real-environment evidence behind it.

The budgets below describe the planned behaviour and are not in force today: a hard visual-page
budget that pauses with a clear API usage action rather than silently dropping pages.

### 8.4 Task B concise index and Evidence expansion

Call B1 receives all canonical objects as a complete concise index: stable ID, canonical name,
type, role, selected fields, component/series parent, known aliases, and unresolved flags. Local
code does not shortlist semantically similar objects.

If B1 requests Evidence for named object IDs, the orchestrator sends B2 with only those objects'
original Evidence plus the new Draft Evidence. At most two expansion rounds are allowed. Unknown IDs
or unsupported Evidence references fail validation. The final B result must be grounded in supplied
Evidence; index summaries alone cannot support a critical identity merge.

### 8.5 Task C

Task C is invoked per affected canonical object/change cluster with current value, current Evidence,
new Evidence, accepted B identity, relevant decision memory/history, and deterministic Coverage
Facts. Pending changes are upserted by target field, so Current 10 → pending 15 → latest 18 becomes
one 10 → 18 item while 15 is appended to History.

### 8.6 Semester-aware date resolution (local, deterministic)

A Source writes a date the way a person does — `Deadline: 18 Oct` — and the year is not in the
sentence. The model is asked what kind of date it is, never what year it is: inferring an academic
calendar is not its job. The year is a fact about the Course's Semester, and it is supplied locally
by `extension/src/v2/date-resolution.ts`, which is the only module that understands a Semester.

`resolveDate(raw, semesterContext)` answers in one of three ways:

| Input | Answer |
| --- | --- |
| A date the Source wrote in full (`2026-11-12`, `19/11/2026`, `2026-11-19T14:30`) | `source` — the Semester is not consulted |
| A day and month (`18 Oct`, `Oct 18`) whose month falls in the term's window | `semester` — the year comes from the Course's Semester |
| Anything else (`Week 8`, `TBC`, `mid-semester`, a month outside the window, or a day and month with no Semester) | unresolved |

The term windows are `AY<yyyy>/<yy> · Semester 1` → Aug–Dec of the starting year, and
`Semester 2` → Jan–May of the year after. The current system year is never used: a date inside
`AY2026/27 · Semester 1` belongs to 2026 whether it is read in 2026 or 2027. A month outside both
windows is left unresolved rather than assigned to the nearer one.

Resolution is **not persisted**. The Source's own value remains the stored fact and the only thing
Evidence shows; the canonical date is computed on read from `(value, Course's Semester)`. No
schema change and no migration were needed, and a Course written by an earlier version resolves
exactly as a new one does.

`extension/src/v2/calendar-plan.ts` is the single composition point: `calendarExportInput()` builds
the exporter's input, resolving dates on the way. The CAL-01 preview and the export action both call
it, so the list a user is shown and the file they receive are one answer computed twice rather than
two answers that happen to agree. `calendar-export.ts` parses nothing and understands no Semester —
it places the dates it is given and reports the ones it was not given as unresolved counts.

## 9. Structured output and validation

Schemas live in the shared contracts package and are versioned independently as
`syllab.ai.task-a/1`, `task-b/1`, and `task-c/1`. They use closed objects, required IDs/enums, typed
field states (`KNOWN | EXPLICITLY_UNKNOWN | UNCERTAIN`), competing-value arrays, explicit Evidence
locators, and structured unresolved issues. Not Mentioned is omission, not a state.

Validation layers:

1. JSON parse and exact schema validation;
2. referential integrity (Source, chunk, Evidence, canonical IDs);
3. deterministic product invariants (for example no Possibly Removed with insufficient coverage);
4. persistence transaction constraints.

Validators do not decide semantics, similarity, authority, or confidence.

The original implementation handled malformed/truncated output with one repair call containing the
schema errors and malformed response, then one fresh retry with a larger output budget. The same
idempotency key prevented duplicate local application. If both failed, the workflow became a
paid-call-aware recoverable failure; existing state was untouched. The Phase 2 correction below
replaces that broad escalation with failure-specific handling while preserving the validation and
state-protection boundary.

The original implementation baseline used Task A 8k, Task B 16k, Task C 8k tokens, with a 16k
retry ceiling where the API supported it. Those values are historical implementation/debug
ceilings, not a permanent product capability policy. Inputs are split before exceeding the model
context budget. Usage is recorded locally; raw prompts/responses are not retained outside redacted
private evidence runs.

### v0.2.0 Phase 2 invocation correction (2026-09-20)

Phase 2 converted the invocation strategy from an implementation assumption into a versioned,
provisional safety policy. DeepSeek `deepseek-flash` is called with thinking explicitly enabled and
`reasoning_effort: high` for Tasks A, B, and C. The provider capability facts are versioned in
`extension/src/v2/invocation-policy.ts`; they were checked against the DeepSeek Chat Completions,
thinking-mode, and model/pricing documentation on 2026-09-20. The local capability record is not a
remote registry.

Each request computes:

```text
context_margin = max(32,000, ceil(model_context_limit * 0.05))
available_generation = model_context_limit - conservative_estimated_input - context_margin
max_tokens = min(provider_max_output, available_generation, task_guard)
```

The provisional runaway guards are 96k for Task A (including consolidation), 192k for Task B
(including expansion), and 96k for Task C. They are safety guards, not expected output sizes,
permanent limits, or evidence that every course needs that much output. During F35 debugging Task B
was observed at 24k, 32k, and 64k; that sequence must remain historical and must not be rewritten as
the original design.

Failure handling is now specific to the observed failure: truncation recomputes the dynamic ceiling
and gets one fresh retry; an empty non-truncated response gets one fresh retry; schema-invalid JSON
gets one targeted repair; transient transport errors use workflow retry/backoff; timeout gets one
delayed retry and then fail-soft; authentication/configuration errors fail immediately. A terminal
AI contract failure does not enter the generic three-attempt workflow retry. Rebuild still isolates
failed Sources and keeps partial output inspection-only.

After the normal Task A pass, a Rebuild may perform one bounded failed-unit recovery pass before
Task A consolidation/Task B. It re-runs only terminally failed Task A logical units with their
original captured Source/chunk input; successful units are reused. The recovery result must pass
the same schema, referential, Evidence, and workflow-generation checks. A second failure remains
isolated and cannot become trusted Current Course State. This is an operational completeness
recovery decision recorded during Phase 2, not a semantic filter or a whole-Course retry.

Per-call QA telemetry records safe invocation metadata, including the computed ceiling, estimated
and provider-reported usage, reasoning token count when supplied, finish reason, latency, retry
classification, cache state, and an invocation fingerprint. Reasoning text, prompts, course
content, credentials, cookies, and authorization headers are never recorded. Successful result
reuse remains available, but cache identity includes the invocation fingerprint. Async completions
revalidate the workflow lease/generation before writing AI runs, staging, or provisional state, so
superseded workers cannot recreate stale preview state.

## 10. Review, decisions, and state protection

- Task A produces Assessment Drafts and Course-wide Constraint Candidates for one Source. They stay
  internal until Review decides. Task B takes those Drafts and resolves identity, canonicalization
  and structure.
- Initial Review items are whole Assessments. Confirm writes the accepted object immediately.
- Merge targets only canonical assessments; Split creates distinct draft identities with explicit
  user provenance.
- Exclusion memory key = semantic proposal identity + supporting Evidence fingerprint. It suppresses
  only unchanged false positives.
- Keep Current records the real discrepancy but does not create permanent suppression.
- Conflict and identity uncertainty never overwrite Current State.
- A reappearing kept Possibly Removed object clears its mark automatically and adds History.
- All reducers require `expectedCourseRevision`; mismatches fail safely and retry/rebase.

## 11. Side Panel and Full-page synchronization

Both surfaces use the same query/reducer modules and subscribe to lightweight revision summaries in
`chrome.storage.local`. A changed revision causes the surface to reread IndexedDB. UI route state is
surface-local, but return context is persisted for Settings interruptions and resumable reviews.

The manifest removes `default_popup`, adds `sidePanel`, `tabs`, `alarms`, and `downloads` as needed,
declares `side_panel.default_path`, and maps the action click in the Service Worker to Side Panel or
the extension page. No surface receives the raw API key.

## 12. Backup and restore

Backup is canonical JSON with `format`, `formatVersion`, `exportedAt`, normalized state tables,
per-table counts, and a SHA-256 payload digest. It includes the PRD-listed durable state and excludes
API key, temporary stores, leases, runtime state, cached bytes, and diagnostics.

Restore pipeline:

1. Parse in memory; enforce size/depth/count limits.
2. Validate schema, referential integrity, enum/version support, and digest.
3. Show summary and Full Replace warning.
4. Import into a new generation of staging stores in one versioned transaction.
5. Revalidate counts/references from staging.
6. Atomically switch `activeGeneration`.
7. Keep the old generation until the next successful startup, then garbage collect.

Any error before pointer swap leaves the old state active. API key and authorizations stay local and
are not replaced.

## 13. Calendar and reliability fixes

Calendar reads typed date facts, never searches arbitrary field names. Exportable facts require a
resolved normalized date/time and no unresolved Conflict. Event identity is based on canonical
Assessment/Component plus real-event key, not Evidence count. Equivalent facts consolidate Evidence
and produce one VEVENT. Kept Possibly Removed facts remain eligible. Filenames use sanitized course
code/name with a non-ID fallback. These rules close KR-07 and E3.

KR-08 is closed by failure-scoped retry tokens: a retry action exists only for the latest failed
AI unit, states that it may consume API, and resumes that unit without replacing accepted state.

## 14. Error taxonomy and recovery

Stable categories are `CONFIG_REQUIRED`, `AUTHORIZATION_REQUIRED`, `PERMISSION_REQUIRED`,
`NETWORK_TRANSIENT`, `SOURCE_ACCESS`, `PARSER`, `AI_AUTH`, `AI_RATE_LIMIT`, `AI_PROVIDER`,
`AI_CONTRACT`, `STORAGE_SCHEMA`, `STORAGE_WRITE`, and `INTEGRITY`. UI maps these to specific English
copy; codes appear only in Details.

Transient retry is bounded and idempotent. Waiting states preserve return context. Failed Initial
Scan can retry; failed Check stays quiet until the freshness threshold; failed Rebuild discards only
staging. No error clears Current State or creates Possibly Removed.

## 15. Test and automation architecture

- Unit: schema validators, reducers, identity/reference invariants, fingerprint canonicalization,
  calendar consolidation, throttle/fake clock, i18n key completeness.
- Migration: v0.1.0 IndexedDB snapshots → v6, rerun idempotency, E4/E5 recovery.
- Integration: orchestrator with fake repositories, deterministic Task A/B/C recordings, failure
  injection, service-worker restart, atomic rebuild/restore.
- Browser extension E2E: Playwright pinned Chromium loads the QA build, exercises Side Panel and
  full-page routes, fixtures, storage, downloads, and screenshots.
- AI regression: accepted A/B/C cases and calibration, schema hard checks, Evidence traceability,
  Partially Understood positive case. Live DeepSeek runs are opt-in and never print the key.
- Real NTU Learn: the one-click runner below, against the machine's own Chrome and the real
  accounts; private ignored evidence, Product Judgment only where the product asks for one.

Gate commands write machine-readable JSON and Markdown reports under
`artifacts/gates/v0.2.0/<gate>/`; private inputs remain under ignored evidence directories.

### 15.1 One source, two builds

| Build | Command | Output | Contains |
| --- | --- | --- | --- |
| Shipped | `npm run build` | `extension/dist` | the product, and nothing else |
| QA | `npm run build:qa` | `extension/dist-qa` | the same product + acceptance bridge + observation layer |

The two are the same source. `extension/scripts/build.mjs` swaps exactly two modules for inert
stubs in the shipped build — `e2e-fixtures` and `qa-telemetry` — and nothing else differs. Each
build writes `extension/.build-meta/<target>.json` listing the source files behind every bundle.

`scripts/verify-build-separation.mjs` reads both builds and both metadata files, and is part of
`npm run ci`:

- the shipped bundle contains no acceptance-bridge marker and no `qa.` marker, file by file;
- the QA bundle contains both, or a run would be observing nothing;
- **the set of source files behind each bundle is identical**, apart from the five files the QA
  layer owns. A forked or copied Course/Review/Calendar/AI module appears here as a file that only
  one build read.

Checked by reversing it: a `qa.` marker added to a shipped string fails the run
(`QA_MARKER_IN_SHIPPED`).

### 15.2 The QA observation layer's boundary

`extension/src/v2/qa-telemetry.ts` records: Semester and Course discovery, Scan start, discovered
Sources, per-Source fetch/parse outcome, one line per model call with its task and token counts,
Candidate counts, Review opened, Course Brief written, Calendar preview and export counts, and the
download request. Its most important line is the date resolver's, because it is the one comparison
a real run exists to make:

```json
{ "event": "qa.date-resolution", "fields": {
  "rawValue": "18 Oct", "semester": "AY2026/27 · Semester 1",
  "resolved": true, "canonicalDate": "2026-10-18", "resolutionSource": "semester" } }
```

The layer observes and never decides. It cannot accept a Candidate, edit a Course Brief, skip a
confirmation, change a Semester, alter a date resolution, or add an event to a Calendar file; a QA
run that cannot reach a screen still cannot reach it. Call sites are ordinary product code, and the
shipped build resolves them to empty functions, which esbuild inlines away — so the event names
leave the bundle with the calls.

Fields whose name looks like a credential are dropped rather than filtered, values shaped like a
provider key are replaced, and long text is truncated. Nothing here can print a password, a cookie,
a session token, an Authorization header or an API key, and the write is fire-and-forget: a refused
telemetry write never fails the product action that produced it.

### 15.3 Real acceptance: system Chrome, QA profile, one-click runner

`npm run test:real`, or `Run Syllab Real Test.command` in Finder, launches the machine's own Google
Chrome with a dedicated profile at `.tmp/syllab-qa-profile/`, attaches over CDP, and drives real
NTU Learn and the real provider through the product's own screens.

Chrome 153 refuses to load an unpacked extension from the command line — verified for this build
across every flag combination and against a profile with the extension pre-registered — so the first
load is a person's job: `chrome://extensions` → `Load unpacked` → `extension/dist-qa`. The runner
opens that page and waits. The QA profile keeps the extension afterwards, so every later run is one
click.

The runner never opens, reads or copies the Product Owner's everyday Chrome profile, never asks for
or stores a password, never completes an MFA challenge and never takes a cookie out of the browser.
Where the platform needs a person — the extension load, an NTU sign-in, a save dialog, a Product
Judgment the product is asking for — it says what it needs, waits, and carries on. It answers
`Confirm` in Initial Review the way a user would, and stops at `Same / Different / Uncertain` and
`Accept / Ignore`, which are the Product Owner's to make.

Output lands in `artifacts/real-test/`: `REPORT.md`, `trace.json` (the machine-readable summary),
`qa-events.json` (the raw trace), `screenshots/`, and `downloaded/`. `.real-test.local.json` holds
the QA profile path and the two Course URLs and is gitignored; it has no field for a secret, because
the run needs none.

### 15.4 Scripted inspection: driving and reading the running product

The one-click runner *watches* a run the Product Owner performs. This is the other half: a script
that drives and interrogates the live extension to answer a question about the product's own
behaviour — why a file was never read, what the model was actually sent, which build is even
running. It is not a test suite and not part of the delivery; it is a reusable way of asking a
running install a question, recorded here so the next session rebuilds it the same way instead of
rediscovering it. In Gate 3 this is what found every finding from F1 onwards.

**Attach, never launch.** `chromium.connectOverCDP("http://127.0.0.1:<port>")` against the QA Chrome
the runner already started. The port comes from the process list, matched on the profile's *folder*
name: `ps` escapes non-ASCII bytes under a non-UTF-8 locale, so comparing the full path never
matches a profile inside a folder named in Chinese. Nothing is launched, no profile is read, and the
Product Owner's own Chrome is never opened, copied or controlled.

**Five channels, each proving something the others cannot.**

| Channel | How | What it answers |
| --- | --- | --- |
| Rendered UI | `page.locator('[data-screen]')`, `#app.innerText` | What the user actually sees, including the screen id |
| Product state | `indexedDB.open("syllab-local")` from an extension page or the worker | What the product persisted — records, reviews, observations |
| QA trace | `chrome.storage.session["syllab.qa.trace"]` | The product's own structured account of what it did |
| Network | raw CDP `Network.enable` on the service-worker target | What actually left the browser, and why a request failed |
| Executing code | CDP `Debugger.getScriptSource` on the worker | Which build V8 is running — not which file is on disk |

**Drive through the product, never around it.** Clicks on the real controls, or the product's own
message API. Writing state directly into IndexedDB proves nothing about the product: the question is
always what the product does, so the input has to arrive the way a user's does.

**Establish the executing build first.** A rebuild does not mean the extension is running it.
Chrome keeps a Service Worker's script in the profile's `Service Worker/ScriptCache` and reused one
across a restart, so a run silently tested a build that no longer existed while the file on disk was
current. Compare `Debugger.getScriptSource` against the file before trusting anything else. (F17)

**When a probe disagrees with the product, suspect the probe.** Three times in one Gate 3 session a
"product defect" turned out to be the script: a back button that "did nothing" because the click
target was addressed by its glyph instead of its accessible name; a bridge replay that returned
`null` because the tab's Content Script was orphaned by an extension reload; and a detail read that
"failed with HTTP 400" because the probe passed `sourceId` where the endpoint wanted `nativeItemId`.
In each case the product was right and the measurement was wrong. Reproduce a suspected defect
through the product's own path before reporting it.

**What it cannot do.** A sign-in, a Chrome permission prompt, a save dialog, and any Product
Judgment are a person's. The script says what it is waiting for and leaves them to it — which is
also why the run's most important evidence comes from a person having done them.

## 16. Security and privacy

The extension remains read-only on NTU Learn. Exact discovered attachment origins remain runtime
permissions. Logs and committed fixtures follow `docs/fixture-policy.md`. Signed URLs, headers,
cookies, credentials, personal/grade/submission data, full course prose, API keys, and raw live AI
payloads are never committed or printed. CSP remains local-script-only; network connections are
limited to NTU Learn/discovered user-approved attachment origins and DeepSeek.

## 17. Product contract audit

This design preserves:

- Semester → Course → Current Course State → Assessment;
- Same/Different/Uncertain and New/Changed/Conflict/Possibly Removed/Identity Uncertain;
- deterministic Local → AI semantics → User decision boundaries;
- separate Task A/B/C responsibilities and accepted prompts;
- Current State availability during every background/rebuild/failure path;
- Side Panel/Full-page roles, no Popup, real navigation, Review semantics, Evidence toggle;
- Source-change-before-AI, Local-first/BYOK, separate authorizations, Full Replace Restore;
- no Todo/Planner/Reminder, cloud sync, hosted account, or expanded source scope.

**Technical Design Gate: PASS — implementation may proceed.**
