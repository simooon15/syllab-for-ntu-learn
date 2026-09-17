# Formal MVP implementation gates

The 15 implementation phases are grouped into four verification gates:

| Gate   | Phases      | Consolidated acceptance focus                                                       |
| ------ | ----------- | ----------------------------------------------------------------------------------- |
| Gate A | Phase 1–4   | Foundation, routing, discovery, fetch and exact runtime permissions                 |
| Gate B | Phase 5–9   | Parser → normalization → DeepSeek extraction → Review → Course Brief vertical slice |
| Gate C | Phase 10–12 | Error/recovery, Calendar export and Scan again                                      |
| Gate D | Phase 13–15 | Integration, privacy/security/performance hardening and final acceptance            |

## Test cadence

- During a phase, run only the affected unit/integration tests and the minimum build/type checks needed to catch local regressions.
- At each Gate, run one full CI pass and one consolidated real NTU Learn validation matrix.
- Reload the unpacked extension only when the built extension materially changes and a real-browser check is required.
- A Gate does not pass merely because the build succeeds; every required real-environment item must be evidenced or explicitly remain `NOT TESTED` when the formal plan permits that status.
- A stop condition in the formal handoff still stops the affected path immediately; Gate batching does not waive product or security gates.
- All remaining Phase 13–15 real-environment work is consolidated into the single procedure in `docs/gate-d-consolidated-acceptance.md`. Existing evidence is referenced and is not rerun unless a later code change invalidates it.

## Current status

- Gate A automated checks: PASS.
- Gate A real discovery and real attachment-byte checks: PASS.
- Gate A exact-permission interaction matrix: PASS for real user-gesture Allow, Deny continuation, Popup close/reopen and same-Fetch repeated-request suppression. The Deny run recorded 10 source-specific permission issues and continued as Partial with zero failed sources.
- Gate B automated checks: PASS after D-014 and Phase 9 closure (Contracts 2, Extension 81, Backend 20; build/typecheck/lint/format/manifest/secret scan passed).
- Gate B real Parse / Normalize / DeepSeek / Review-entry evidence: PASS. Review persistence and parent-aware Course Brief placement were also confirmed in the real browser; Gate A permission carry-over is complete.
- Gate C automated checks: PASS. Real-browser popup-close continuity, explicit Cancel/Continue from the saved Discovery checkpoint, persisted resume, old-Brief preservation, Saved Courses navigation, `.ics` generation, Apple Calendar and Google Calendar imports, and a full paid AI Scan-again reconciliation passed.
- Gate D implementation and automated acceptance: PASS. Final unified CI passed with Contracts 2, Extension 109 and Backend 20 tests; build/typecheck/lint/format/manifest/secret checks passed and the v0.1.0 extension ZIP was rebuilt with SHA-256 `6d554470a22c3d0f15ac19571c771665333c20def473d5426a00040e27e84546`. Required consolidated real-environment acceptance remains in progress.
