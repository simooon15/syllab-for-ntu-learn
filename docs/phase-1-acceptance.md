# Phase 1 acceptance record

Status: complete

## Scope

Project foundation only: Extension Foundation + Backend Foundation. No real scan, AI extraction,
full product UI, Scan again, or document parsers are implemented.

## Automated evidence

- 2026-09-16, Node 26.0.0 / npm 11.12.1: `npm run ci` passed.
- Formatting, Extension + Backend builds, strict typecheck, lint, manifest validation, and secret
  scan passed.
- 14 tests passed: 2 shared-contract tests, 4 extension tests, and 8 backend tests.
- The secret scan covers source and built JavaScript. No provider key or installation token was
  found.
- The built backend started on `127.0.0.1:8787`; `GET /health` returned
  `{ "status": "ok", "contractVersion": 1, "phase": "foundation" }`.
- The built Popup rendered successfully from a local static server. All four canonical route
  shells were present and the Scan route changed state without console-visible failure.

## Manual / real-environment evidence

- [x] Load `extension/dist/` unpacked in target Chrome 152.0.7977.84 (user-confirmed).
- [x] Confirm the built extension shell exposes only the four canonical surface routes.
- [x] Open an authenticated NTU Learn page and confirm the content script loads without changing
      the page.
- [x] Record the Chrome version and redacted structural evidence without retaining course content.
- [x] Confirm the install-time manifest grants only NTU Learn; Blackboard/Xythos patterns remain
      optional and no optional permission was requested.

The unpacked extension was loaded manually because browser automation cannot control
`chrome://extensions`. After installation, an authenticated NTU Learn course route was reloaded.
The route and login context remained intact, no Syllab error was recorded, and no optional host
permission was requested. Two existing Blackboard Collab module errors were observed and
classified as unrelated page errors. No course content, credentials, or signed URLs were captured.
