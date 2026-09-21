# Syllab v0.2.0 — Local Workspace Consolidation

**Date:** 2026-09-21  
**Status:** FINAL INVENTORY · NON-DESTRUCTIVE

## Canonical source

- Repository: `/Users/simonluo/罗鑫宇/Vibe Coding/Syllab for NTU Learn`
- Branch: `main`
- Remote: `https://github.com/simooon15/syllab-for-ntu-learn.git`
- Frozen product baseline: `43de61aafd23661abcce3ba9335284f2e752ea41`

The canonical workspace is the source that passed Phase 2, Engineering Freeze, Final Acceptance,
and the 476-test current-source CI. Release-readiness documentation and packaging changes may be
committed after that immutable product baseline without changing product semantics.

## Workspace/repository classification

| Location | Relationship | Unique Git commits | Disposition |
| --- | --- | --- | --- |
| `/Users/simonluo/罗鑫宇/Vibe Coding/Syllab for NTU Learn` | canonical repository and `main` worktree | v0.2.0 freeze commit | retain; only release source |
| `/Users/simonluo/.codex/worktrees/457e/Syllab for NTU Learn_副本` | detached worktree of canonical repository | none beyond historical `670880f` | retain until after release; safe cleanup candidate later |
| `/Users/simonluo/罗鑫宇/Vibe Coding/Syllab for NTU Learn__historical-clone-20260921` | independent clone of the same remote at historical `670880f` | none | retain as historical clone until Product Owner approves cleanup |
| Downloads handoff folders/ZIPs | copied delivery inputs, not repositories | not applicable | historical reference; do not use as source |

No alternate workspace contained a unique commit that needed merging. No repository, worktree,
untracked file set, or historical document was deleted, reset, or overwritten.

## Artifact classification

- `artifacts/release/`: public, privacy-safe release candidate only.
- `artifacts/handoffs/`: compact internal closure handoff only.
- `artifacts/real-test/`, `artifacts/real-test-runs/`, and
  `artifacts/AI_RUNTIME_COST_ANALYSIS_PACKAGE_v0.2.0/`: private local QA/runtime evidence; excluded
  from public packages and Git.
- The tracked v0.1 ZIP remains at its historical repository path. Superseded, untracked v0.2 ZIPs
  are preserved under `artifacts/historical/`; none is a release candidate.
- `extension/dist/`: current Production build; ignored generated output.
- `extension/dist-qa/`, QA profiles, `.tmp/`: non-release generated/debug material.

## Post-release cleanup plan

Only after tag/push/Release verification and explicit Product Owner approval:

1. remove the detached `457e` worktree through Git worktree management;
2. archive or remove the old independent clone after confirming no new local edits appeared;
3. move obsolete root-level ZIPs to an external archive or trash;
4. remove disposable `.tmp`, QA profile, and build outputs;
5. retain the canonical repository, tagged release artifact, compact final handoff, and private
   evidence required for retrospective analysis.

This document authorizes none of those deletions by itself.

## Pre-release safe cleanup completed

- Created one public release location, `artifacts/release/`.
- Created one compact internal handoff location, `artifacts/handoffs/`.
- Classified private QA/runtime data and kept it outside public and internal release packages.
- Preserved superseded untracked v0.2 ZIPs under `artifacts/historical/`, while leaving the tracked
  v0.1 archive at its historical path; none is presented as the current release.
- Left all old repositories/worktrees, private evidence, profiles, and uncertain temporary data
  untouched for post-release review.
