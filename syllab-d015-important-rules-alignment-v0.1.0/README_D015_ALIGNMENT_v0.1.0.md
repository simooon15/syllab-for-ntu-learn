# Syllab — D-015 Alignment Package — v0.1.0

This replaces the failed earlier Important Rules handoff.

The old package failed before writing because it relied on a stale Technical Design anchor. This package does not reuse that anchor.

## Use

Copy this folder into the current Syllab workspace and give Codex:

`15_D015_CODEX_APPLY_PROMPT_v0.1.0.txt`

The script:

- takes the project root as `.`；
- auto-finds the one directory containing all four formal docs；
- requires D-014 to already exist in Decision Log；
- does not depend on the old Technical Design wording；
- preflights all four documents before any write；
- preserves D-014；
- is idempotent；
- generates exact final line numbers in `D015_APPLIED_CHANGE_REPORT_v0.1.0.md`.

Do not use the earlier D-015 package.
