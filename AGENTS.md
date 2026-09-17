# Working in this repository

Read this first, whichever agent you are. It is deliberately short: only what every session needs
before touching anything. The details live in the documents it points at.

More than one assistant works in this repository. `CLAUDE.md` — and any equivalent another tool
turns out to require — is a thin adapter, kept because Claude Code reads `CLAUDE.md` and not
`AGENTS.md`. That is documented behaviour, not an oversight, so the adapter is not a duplicate to be
tidied away. This file is the single source of truth, and a second one must not be allowed to grow
beside it.

## What this is

Syllab for NTU Learn v0.1.0 — a Chrome extension that scans the user's NTU Learn (Blackboard Ultra)
courses into a confirmed Course Brief, plus a small backend that proxies the extraction model. The
extension and the backend are separate workspaces that share only versioned API contracts.
`README.md` has the build basics.

| Path                  | What lives there                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------ |
| `extension/`          | the Manifest V3 extension. `extension/dist/` is the loadable unpacked build, and is git-ignored. |
| `backend/`            | the AI proxy. It owns the only secret boundary in the project.                                   |
| `packages/contracts/` | the versioned API contracts both sides compile against.                                          |
| `docs/`               | acceptance records, product feedback, and the design system.                                     |
| `scripts/`            | the repository-level checks that `npm run ci` runs.                                              |

## Before you call anything finished

Run `npm run ci`. It is the whole gate: Prettier, build, strict typecheck, ESLint, every test,
manifest validation and secret scan. Passing means zero failures — the counts grow as tests are
added, and `docs/final-acceptance-v0.1.0.md` records them as they stood at Gate D.

One step cannot be automated. After any change that affects the extension bundle:

1. Reload the unpacked extension at `chrome://extensions`.
2. **Refresh every already-open NTU Learn tab.**

A reloaded extension leaves open tabs running a dead content script, so the popup silently loses its
course context and lands on the wrong surface. This has been misdiagnosed as a product defect before.

## Hard rules

**Secrets never touch this repository, a log, a commit, or a chat transcript.** The backend reads
`DEEPSEEK_API_KEY` from its environment only, and the user injects it from their own shell. Naming
the variable is fine; its value is not. If you need it to run something, ask the user to supply it
rather than pasting it anywhere.

**A change the user can see is a product decision, not an implementation detail.** Adding a derived
value, changing what a control does, or changing confirmed copy needs the user's sign-off before you
build it. Raise it; do not ship it and explain afterwards.

**Ask before committing.** When you do commit: conventional-commit subject, a body that says what
changed and why. `.claude/`, `.codex/` and `dist/` stay out of history.

**No assistant signs its work, and none claims another's.** Commits, documents and code comments
carry no model or tool attribution — no `Co-authored-by` trailer, no "generated with" line, no first
person. The history belongs to the project, not to whichever assistant happened to write a given
change. Equally, do not describe work another agent did as your own.

**Anything a later session needs must be written into the repository.** Private memory, session
history and tool-local settings are invisible to the other assistants working here, so they must
never be relied on. If you learn something a future session will need — a constraint, a gotcha, a
decision and its reason — put it in a document, not in your own notes.

## Working on the interface

Read `docs/design-system.md` before changing anything visual. It holds the tokens, the three
typefaces and which of them owns which text, the component vocabulary, and — most usefully — the list
of directions already tried and rejected with the reason each was dropped. Adding one of those back
without reading that list is the most likely way to undo work.

The popup's DOM is built imperatively in `extension/src/popup/index.ts` and styled entirely by
`extension/src/popup/popup.css`. The only coupling between the two is class names, so check both
directions when you finish.

## Where the product's decisions live

- `docs/final-acceptance-v0.1.0.md` — the acceptance record, the known risks, and the product
  feedback the next version has to answer. Read the feedback section before proposing work.
- `docs/implementation-gates.md` — the phase plan and the gate definitions.
- `15_GATE_D_TESTING_HANDOFF_v0.1.0.md` — the manual walkthrough for testing against real NTU Learn.
