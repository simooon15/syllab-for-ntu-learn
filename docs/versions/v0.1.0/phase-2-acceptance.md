# Phase 2 acceptance record

Status: automated implementation complete; installed bundle reload pending

> **Historical checkpoint.** The pending real-browser work recorded here was subsequently completed through the consolidated acceptance run. Current authority: `final-acceptance-v0.1.0.md` — v0.1.0 implementation complete, Gate D PASS.

## Scope

Current course detection and Entry routing only. This phase does not discover sources, fetch
course content, request attachment permissions, parse documents, or start a scan.

## Automated evidence

- The Content Script accepts only `/ultra/courses/<native-id>/outline` as a course route and never
  derives course identity from a title.
- Display metadata may use the visible `h1`; a conservative course-code pattern is display-only.
- Entry routing covers non-course, unscanned, scanned-with-review, Scanning,
  WaitingForPermission, recoverable Interrupted, and safe fallback states.
- Scanning, WaitingForPermission, and recoverable Interrupted take priority over an existing Brief.
- Course and Scan summaries are read from local storage through a repository boundary.
- Missing Content Script, unsupported origins, and malformed responses fall back to Saved Courses.
- `npm run ci` passes after the Phase 2 implementation.

## Real NTU Learn evidence

- Chrome 152.0.7977.84 remained authenticated after navigation and reload.
- `/ultra/course` rendered the real Courses page and provides the non-course routing case.
- Two different real courses were opened. Their native route IDs were distinct and their visible
  headings yielded display codes `MA6083` and `MA6081` without using those headings as identity.
- The Phase 2 build must still be reloaded from `chrome://extensions` before the installed Popup
  routing result can be observed; browser automation cannot control that internal page.
- No course body content, credentials, cookies, tokens, signed URLs, grades, or submissions were
  retained in this record.

## Known Risks

KR-01 through KR-06 are unchanged. Course-name selectors remain a compatibility risk, but failure
only omits display metadata; it does not guess or merge Course IDs.
