# Working in this repository

Read this file before touching the repository. It contains only the rules every session needs and
links to the durable documents that hold the details.

`CLAUDE.md` and any equivalent tool adapter must remain thin pointers to this file. Do not allow a
second repository-wide rule source to grow beside `AGENTS.md`.

## Repository map

Syllab is a Chrome extension for NTU Learn (Blackboard Ultra) with a small extraction-model proxy.
The extension and backend are separate workspaces joined only by versioned API contracts.

| Path                  | Purpose                                                                            |
| --------------------- | ---------------------------------------------------------------------------------- |
| `extension/`          | Manifest V3 extension; `extension/dist/` is the ignored, loadable build.           |
| `backend/`            | AI proxy and the repository's only secret boundary.                                |
| `packages/contracts/` | Versioned contracts shared by extension and backend.                               |
| `docs/`               | Long-term governance, acceptance records, product feedback and interface guidance. |
| `scripts/`            | Repository-level checks run by `npm run ci`.                                       |

## Hard rules

**Secrets never touch this repository, a log, a commit or a chat transcript.** The backend reads
`DEEPSEEK_API_KEY` from its environment only. Naming the variable is safe; its value is not. Ask the
user to supply it through their own environment when required.

**A user-visible change is a Product decision, not an implementation detail.** Get the user's
sign-off before adding a derived value, changing a control's behaviour or changing confirmed copy.

**Ask before committing unless the Product Owner has explicitly authorized the current commit/push.**
Use a conventional-commit subject and explain what changed and why in the body. `.claude/`, `.codex/`
and `dist/` stay out of history unless a later authoritative rule explicitly changes that repository
history policy.

**No assistant signs its work or claims another's.** Do not add model or tool attribution to commits,
documents or comments, and do not describe another assistant's work as your own.

**Durable knowledge belongs in the repository.** Do not rely on private memory, session history or
tool-local settings for anything a later session needs. Record lasting constraints, decisions and
gotchas in the appropriate project document.

**Cross-agent project synchronization follows
[`docs/PROJECT_COLLABORATION_MODEL.md`](docs/PROJECT_COLLABORATION_MODEL.md).**
For bulk or incremental project transfer, prefer Google Drive for desktop plus filesystem-native
sync over model-mediated per-file upload/download. Physical file sync may be bidirectional, but code,
Product documents and release state retain their separate authorities defined in that document.

## Completion gate

Run `npm run ci` before calling implementation work finished. It covers formatting, build, strict
typecheck, lint, tests, manifest validation and secret scanning; success means zero failures.

After any change that affects the extension bundle, reload the unpacked extension and refresh every
already-open NTU Learn tab. Reloading alone leaves those tabs with a dead content script and can make
the popup lose its course context.

## Rule index

Before acting, automatically read the branch rule documents relevant to the task. Do not wait for
the user to name them. Start from the governance index when a task spans more than one category or
when the correct branch is unclear.

- [`docs/PROJECT_COLLABORATION_MODEL.md`](docs/PROJECT_COLLABORATION_MODEL.md) — Product ↔ Engineering
  collaboration model, Google Drive shared mirror, filesystem-native sync, Handoff / Sync Manifest,
  conflict protection and file authority.
- [`docs/DOCUMENTATION_GOVERNANCE.md`](docs/DOCUMENTATION_GOVERNANCE.md) — documentation audiences,
  language policy, Product archives and the README lifecycle.
- [`docs/project-governance.md`](docs/project-governance.md) — index of the remaining durable
  governance branches and the rules for extending them.
- [`docs/design-system.md`](docs/design-system.md) — interface tokens, typography, components and
  rejected visual directions. Read it before changing anything visual.
- [`docs/fixture-policy.md`](docs/fixture-policy.md) — fixture privacy and rules for real acceptance
  evidence.
- [`docs/versions/v0.1.0/final-acceptance-v0.1.0.md`](docs/versions/v0.1.0/final-acceptance-v0.1.0.md) — current accepted baseline,
  known risks and Product feedback that later work must account for.
- [`docs/versions/v0.1.0/implementation-gates.md`](docs/versions/v0.1.0/implementation-gates.md) — implementation phases and gate
  definitions.

Version-specific PRDs, Product Handoffs, acceptance records and engineering handoffs are evidence
for their version, not additional repository-wide rule sources.
