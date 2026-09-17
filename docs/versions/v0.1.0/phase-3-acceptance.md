# Phase 3 Acceptance — Scan discovery

Status: PASS

## Scope completed

- Content root, paginated collection, nested container, assignment, direct attachment, and Announcement discovery.
- Native item, container, page, and Source deduplication with parent linkage, canonical attachment URL, and discovery path.
- Leaf (`HTTP 400`) isolation versus retryable branch failure and invalid/out-of-scope pagination issues.
- Per-page persisted cursor and queue checkpoint. A restarted worker can resume the same `scanId` without replaying a completed page.
- Same-origin, current-course, read-only API endpoint allowlist in the Content Script.
- Lightweight Scan task list with no percentage, ETA, or completeness claim.
- Discovery result remains a source inventory only. No attachment byte fetch, permission request, parser, normalization, AI extraction, Review, or Brief write is included.

## Automated acceptance

Command: `npm run ci`

Result: PASS on 2026-09-16.

- Contracts: 2 tests passed.
- Extension: 22 tests passed across 6 files.
- Backend: 8 tests passed.
- Fixture coverage includes three levels, pagination, duplicate native item, cycle, branch failure, normal leaf, out-of-scope pagination, persisted cursor recovery, repository recovery, and endpoint scope rejection.
- Typecheck, ESLint, formatting, Manifest validation, and secret scan passed.

## Real NTU Learn

Current authenticated target: MA6081 (`/ultra/courses/_2707107_1/outline`).

First formal-engine run: `Complete · 86 sources · 0 issues · 27 content collection responses · 1 announcement response · max content depth 2 · 0 assignments · 3 announcements · 0 attachments · pagination not observed`.

This result did not pass the Gate. Manual comparison showed visible Announcement, Learning Module, Assignment-labelled content, and a UI `Load 10 more content items` control. Diagnosis against the redacted Spike evidence showed that NTU attachments and handler details can live in each content item's detail/body rather than the collection row. The formal engine was updated to:

- read the same-course, read-only `/contents/<itemId>` detail endpoint;
- recognize nested handler shapes and Assignment-labelled content-module clues;
- discover nested file metadata and supported document links in content bodies without downloading bytes;
- detect `hasMore` / total-without-cursor as unresolved pagination instead of reporting Complete;
- keep detail work in a checkpointed queue and allow the active, pre-Fetch scan to refresh its discovery coverage under the same `scanId`.

Refreshed formal-engine run: `Complete · 105 sources · 0 issues · 27 content collection responses · 83 content details · 1 announcement response · max content depth 2 · 15 Assignment/learning-module clues · 3 announcements · 19 attachment relationships · pagination not observed`.

Manual comparison: PASS for visible course pages, Announcements, Assignment-labelled/Learning Module content, three observed content levels (`depth 0–2`), and the 19 attachment relationships previously observed by the Spike. Attachment bytes were not fetched in Phase 3.

Real API pagination remains NOT OBSERVED in this course. The visible `Load 10 more content items` control is a Blackboard UI paging/virtualization affordance; the scanned API collections did not return a next cursor or unresolved `hasMore`/total signal. The pagination implementation is covered by fixtures, but the formal real-environment pagination Gate remains pending on another course that actually returns a cursor.

Second real course (MA6083): `Complete · 48 sources · 0 issues · 8 content collection responses · 28 content details · 1 announcement response · max content depth 2 · 5 Assignment clues · 10 announcements · 10 attachment relationships · pagination not observed`. This confirms cross-course discovery behavior, but again provides no real API cursor for the pagination Gate.

Third real course (MA6084): `Complete · 63 sources · 0 issues · 18 content collection responses · 42 content details · 2 announcement responses · max content depth 3 · 5 Assignment clues · 11 announcements · 10 attachment relationships · pagination observed`.

The MA6084 run closes the real pagination Gate and adds a four-level traversal sample (`depth 0–3`). Across MA6081, MA6083, and MA6084, the real-environment discovery acceptance is PASS.

## Visual baseline

Final visual direction is intentionally deferred until the complete functional MVP exists. Two exploratory treatments were rejected during Phase 3 and are not retained as the product baseline. The Popup has been returned to a neutral functional shell; the four canonical surfaces, readable status feedback, keyboard focus, and reduced-motion handling remain intact. A unified visual refactor will be performed near final acceptance without changing the approved IA.

Pending after loading the current `extension/dist` bundle:

- Run `Refresh discovery coverage` through the actual extension Content Script and Service Worker.
- Record only aggregate source/page/issue counts; do not retain course body text in this evidence file.
- Compare discovered Content, Announcements, Assignments/learning modules, at least three folder levels, and pagination with the visible course source list.

Browser automation could not substitute for this extension-path check: its page-evaluation sandbox disables network calls, and direct API-tab navigation is client-blocked. This is a validation harness limitation, not evidence that the NTU Learn API or extension path failed.

## Known risks

- Real Assignment handler variants, speculative child probes, and actual pagination shapes remain unverified until the gate above runs.
- The current phase records direct attachment relationships but does not download bytes; download deduplication is enforced in Phase 4. Source provenance remains separate even when later fetch work can share a canonical attachment.
- Phase 10 will add full Interrupted detection, leases/heartbeats, cancellation, and recovery presentation. Phase 3 only guarantees durable discovery work units and same-scan continuation.

## Gate

Phase 4 may start. Phase 3 is complete; no product or Technical Design deviation was required.
