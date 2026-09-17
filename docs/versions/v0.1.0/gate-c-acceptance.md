# Gate C acceptance — Phase 10–12

Status: **AUTOMATED PASS · CONSOLIDATED REAL-BROWSER MATRIX PENDING**

> **Historical checkpoint.** The pending recovery, Calendar and Scan-again matrix was subsequently completed. Current authority: `final-acceptance-v0.1.0.md` — v0.1.0 implementation complete, Gate D PASS.

## Phase 10 — Error / Partial / Interrupted

- Added persisted scan leases and heartbeat renewal. An expired active lease is recovered as `Interrupted`; a normal popup close does not create or clear a lease and is not treated as Cancel.
- Added explicit Cancel, same-`scanId` Continue, full Try again with a new scan, and a source issue overview.
- Source reasons are separated into Permission Denied, Unsupported, Parsing Failed, Could Not Access and Interrupted Processing. Unsupported is non-retryable.
- Upstream discovery, fetch and parse failures now contribute to the final `Partial` / `Failed` classification instead of being hidden by a successful AI batch.
- Failed, Interrupted and Cancel do not delete or replace existing Course Brief items.

## Phase 11 — Calendar export

- Calendar candidates are queried only from confirmed Course Brief items.
- Any item with an unresolved date field is excluded.
- Edited and user-added confirmed dates are eligible; matching linked dates are deduplicated.
- RFC 5545 output includes stable UID, escaping, CRLF, 75-byte folding, all-day exclusive `DTEND`, explicit `Asia/Singapore` time and Blob download.
- Export supports default-all selection and Select none; it does not edit course facts.

## Phase 12 — Scan again

- Scan again always starts a new `scanId` and leaves the old Brief readable.
- Only exact semantic key, value, scope and parent-Assessment matches skip repeated Review.
- Exact matches add source/candidate linkage without changing the fact value.
- New values, relationship changes and uncertain matches remain in Review.
- Edited and User-added facts are never auto-matched or overwritten; previously Ignored candidates can reappear.
- Missing old sources do not delete or mark old facts.

## Automated evidence

- Recovery, issue overview, Calendar and Scan-again targeted tests passed.
- Domain integration test passed for Review → nested Brief → Calendar → identical rescan → edited-fact protection.
- Strict extension typecheck passed after the Phase 10–12 changes.

## Required consolidated real-browser evidence

- Explicit Cancel → Interrupted → Continue using the same scan; old Brief remains visible after a new failed/interrupted scan.
- Popup close/reopen during work does not act as Cancel; forced Service Worker termination becomes recoverable Interrupted.
- Permission Deny continues other sources and appears in View issues without a repeat prompt in that scan.
- Export a real Brief to `.ics` and import it into two calendar clients.
- Scan the same real course twice and inspect identical, changed, new and missing-source cases.
