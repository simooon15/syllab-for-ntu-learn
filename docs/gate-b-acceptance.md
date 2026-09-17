# Gate B acceptance — Phase 5–9

Status: **AUTOMATED PASS · REAL NTU LEARN / DEEPSEEK MATRIX PENDING**

> **Historical checkpoint.** The pending real NTU Learn / DeepSeek, Review and Course Brief evidence was subsequently completed. Current authority: `docs/final-acceptance-v0.1.0.md` — v0.1.0 implementation complete, Gate D PASS.

## Implemented

- Phase 5: signature-first PDF/PPTX/DOCX parsing, legacy OLE Unsupported, parser limits, one isolated Worker per file, timeout/cancel and immediate byte release.
- Phase 6: page/slide/paragraph/item locators, evidence-preserving text normalization, SHA-256 content identity, duplicate annotation and Source-bounded batching.
- Phase 7: anonymous installation registration/token, authentication, installation enablement, rate limit, usage cap, global budget guard, fixed DeepSeek `deepseek-flash` adapter, evidence validation, ambiguous-week risk routing and per-batch failure isolation.
- Phase 8: one Review surface with Needs Review and Detected sections, single-item actions, category-only Confirm all, Skip semantics, immutable AI proposal/evidence and IndexedDB persistence.
- Phase 9: Course Brief fact layer consuming only Confirmed/EditedConfirmed candidates, default Brief entry with `Continue review`, incremental confirmed-fact projection, fixed three-section structure, Edit/Add/Resolve actions, field-level Unresolved state, hidden-by-default Source evidence and separate user-added fact ownership.
- D-014: structured `scope` / `appliesToAssessmentKey`, flat Review parent context, conservative relationship migration, parent-aware deduplication, child-only confirmation semantics, and Brief child → parent projection without top-level duplication.
- The runtime path is connected as Fetch → Offscreen Parser Worker → Normalize → Backend AI → Review → Course Brief.

## Automated verification

The latest full `npm run ci` passed on 2026-09-16 after D-014:

- Contracts: 2 tests passed.
- Extension: 81 tests passed across 20 files.
- Backend: 20 tests passed across 5 files.
- Build, strict typecheck, ESLint and Prettier passed.
- Manifest validation passed.
- Secret scan passed; no DeepSeek key or installation token is present in tracked source or bundles.

## Real evidence completed

- MA6084 Fetch: 10 fetched, 0 denied, 0 failed; 8 PDF and 2 ZIP signatures; Xythos final origin; 0 incomplete byte results.
- MA6084 Parse after PDF worker repair: 4 Parsed, 6 Partial, 0 Unsupported, 0 Failed.
- MA6084 Normalize: 399 units from 19 sources with 63 duplicate annotations.
- Backend → DeepSeek probe: HTTP 200, provider `deepseek`, model `deepseek-flash`, valid candidate response.
- Real extraction reached Review. Prompt v3 removed practice-question, template-as-Assessment, and lecture-knowledge false positives.
- Local candidate consolidation reduced the real unreviewed set from 48 to 38 without another DeepSeek call.
- D-014 migration is restricted to `0 reviewed`; Confirmed, EditedConfirmed and Ignored candidate records are not rewritten.
- Ambiguous ownership can be explicitly reclassified to a listed Assessment or Course-level without confirming the fact.

## Real matrix required before Gate B PASS

- Gate A carry-over: exact-origin Allow user gesture, Deny continuation, Popup close/reopen and repeated-request suppression.
- Confirm at least one real PDF locator/text sequence; PPTX/DOCX remain `NOT TESTED` because the two ZIP-signature files were not established as those Office formats.
- Reload the built extension and confirm the existing 38-candidate Review migrates locally without an AI request.
- Confirm Assessment-specific child facts show `Applies to <Assessment>` and ambiguous ownership appears in Needs Review.
- Complete Review, reopen it mid-way to verify persistence, and confirm Course Brief contains attached children only under their confirmed parent, course-level Rules at top level, and Source hidden by default.

## Known risks

- The development build uses the public backend URL `http://127.0.0.1:8787`; the production build must set `SYLLAB_BACKEND_URL` to the deployed HTTPS endpoint.
- The current server entry uses an in-memory installation repository behind a repository interface. A persistent deployment adapter is required before production acceptance so server restart does not invalidate installations.
- Real layout quality, multi-column PDFs, Office table ordering and complex slides remain subject to the Gate B real sample.
