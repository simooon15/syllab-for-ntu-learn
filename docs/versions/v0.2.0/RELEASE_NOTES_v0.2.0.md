# Syllab for NTU Learn v0.2.0 — Release Notes

## What changed

v0.2.0 advances Syllab from a single-course Course Brief MVP to a semester-oriented, local-first
course information tool. It discovers NTU Learn Courses, builds Assessment-centred Current Course
State with traceable Evidence, and maintains that state through machine-first checks and explicit
Review decisions.

Highlights:

- Current/Historical Semester views and context-aware Side Panel entry;
- Initial Scan and Initial Review with confirmed-only Current Course State;
- Manual Check and background opportunity checking with zero AI calls for unchanged Sources;
- Change Review for meaningful Changed/New/Conflict/Removal/Identity cases;
- protected Rebuild preview that cannot overwrite trusted state before adoption;
- direct DeepSeek BYOK invocation with explicit high reasoning, dynamic safety ceilings,
  failure-specific retry, fingerprinted reuse, and stale-worker protection;
- Backup/Restore and deterministic Calendar export from confirmed canonical dates.

## Verification

- Phase 2: PASS / CLOSED.
- Post-correction MA6081 Rebuild: FULL, 119/119 Sources, zero terminal failed Sources.
- Manual Check: PASS with zero AI and zero Review delta for unchanged Sources.
- Final current-source CI: PASS, 476 tests (Extension 454 / Backend 20 / Contracts 2).
- Production/QA separation, manifest validation, secret scan, and trusted-state protection: PASS.

## Known limitations

- Calendar/F36 had no natural confirmed-date sample during Phase 2 and remains `NOT TESTED` in a
  real course. This is non-blocking under the accepted edge-capability policy.
- Mixed/image-only PDFs are limited to text layers; OCR and multimodal page reading are deferred.
- The final Rebuild preview was technically complete but carried heavy Review burden and was not
  adopted.
- Task A remains serial; adaptive parallelism and multi-source/token-aware packing are deferred.
- Distribution is currently a developer-mode, Load-unpacked Chrome extension rather than a Chrome
  Web Store listing.

## Installation

Download `syllab-for-ntu-learn-v0.2.0.zip`, extract it, enable Developer mode at
`chrome://extensions`, select **Load unpacked**, and choose the extracted `Syllab-v0.2.0` folder.
See `HOW-TO-INSTALL.txt` inside the archive.
