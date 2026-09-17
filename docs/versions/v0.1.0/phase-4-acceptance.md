# Phase 4 acceptance — Fetch / attachment permission

Status: **AUTOMATED PASS · REAL NTU LEARN GATE PENDING**

> **Historical checkpoint.** The pending exact-permission Allow/Deny, continuation and recovery work was subsequently completed. Current authority: `final-acceptance-v0.1.0.md` — v0.1.0 implementation complete, Gate D PASS.

## Implemented

- Diagnoses the redirect chain from each discovered NTU Learn attachment URL without logging signed URLs.
- Adds a persistent, per-Scan queue of exact HTTPS origins and associated Source IDs.
- Checks `permissions.contains` before presenting an origin and deduplicates each origin within a Scan.
- Calls `permissions.request` only from the Popup's **Allow access** click handler and passes only the exact discovered `https://host/*` pattern.
- Persists Waiting for Permission so closing the Popup does not cancel or lose the Scan.
- Supports **Continue without them**; denied attachments become `permission-denied` while unrelated sources continue.
- Validates HTTP status, MIME metadata, Content-Disposition, payload size, file signature and SHA-256.
- Cancels bounded reads and does not retain downloaded file buffers in the Fetch checkpoint.
- Keeps install-time host access limited to `https://ntulearn.ntu.edu.sg/*`; Blackboard/Xythos declarations remain optional.

The 64 MiB Fetch cap is a provisional transport safety boundary, not the formal parser/product size limit. Phase 5 must establish the format-specific limits with test evidence.

## Automated verification

Full `npm run ci` passed on 2026-09-16:

- Contracts: 2 tests passed.
- Extension: 36 tests passed across 12 files.
- Backend: 8 tests passed.
- Build, strict typecheck, ESLint and Prettier passed.
- Manifest validation passed; no broad Blackboard host is granted at install.
- Secret scan passed.

Key Phase 4 cases covered:

- exact-origin validation and grouping;
- no permission request from the background engine;
- one decision per Scan/origin;
- first and second redirect-hop discovery;
- Allow resume boundary and Deny/Partial continuation;
- checkpoint survival across worker restarts;
- PDF signature/hash and oversized payload rejection.

## Real NTU Learn matrix still required

Verified on 2026-09-16 against the real MA6084 checkpoint:

- 10 attachments fetched; 0 denied; 0 failed.
- File signatures: 8 PDF and 2 ZIP; 0 incomplete byte results.
- Final byte origin: `https://prod01-apse1-prod01-xythos.prod.files.blackboard.com`.
- Redirect-chain runtime origins recorded as the exact hosts
  `https://alt-5dcb73f79ba4c.blackboard.com` and
  `https://prod01-apse1-prod01-xythos.prod.files.blackboard.com`.
- A real partial-response defect was found and fixed: the redirect probe no longer uses a Range
  request, all probe/download requests bypass cache, and HTTP 206 / `Content-Range` is rejected.
  Re-fetching only the eight suspicious results produced eight valid PDF signatures.

Still required:

- Deny path: other sources continue and the Fetch outcome is Partial.
- Same Scan/origin does not prompt twice.
- Close and reopen the Popup while Waiting; the same pending origin remains actionable.
- Confirm whether the recorded Blackboard and Xythos grants came from the current Popup user-gesture flow or were pre-existing browser permissions.

If Chrome cannot request the dynamically discovered exact origin, or presents a broader effective authorization than that origin, Phase 4 fails the product gate and implementation must stop for product review.

## Known risks

- Chrome user-gesture preservation and actual permission-prompt wording require real-browser confirmation.
- Redirect event visibility and credential behavior across the NTU Learn → Blackboard → Xythos chain require real-browser confirmation.
- Some servers may ignore the one-byte Range probe; the response body is cancelled immediately, but real network behavior remains to be observed.
