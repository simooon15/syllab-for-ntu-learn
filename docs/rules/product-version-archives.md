# Product version and archive rules

These rules define the durable Product record for every Syllab version.

## Starting a new version

When work on a new version begins:

1. Before changing the root `README.md`, copy its completed old-version content unchanged to
   `docs/versions/<old-version>/README_<old-version>.md`.
2. Treat that renamed, version-suffixed file as the fixed README snapshot for the old version.
3. Only after the old snapshot is safely archived, update the root `README.md` for the new current
   version.

Do not build an old-version snapshot from the new README after the root page has already been
updated. Each `README_vX.X.X.md` must preserve the root README that was current when that exact
version closed.

The root README's public content and screenshot rules live in
[`public-readme-and-screenshots.md`](public-readme-and-screenshots.md).

## Repository version directories

Store every version-specific Product or engineering fact document under
`docs/versions/vX.X.X/`. The version number is the archive directory name; do not scatter a new
version's PRD, Product Handoff, README snapshot, Decision Log, implementation plan, acceptance
records or validation evidence across the repository root or temporary handoff-package directories.

The version directory is an append-only historical archive after that version closes. A later
version gets a new sibling directory and must not overwrite, relocate into a temporary package or
delete the older version's records. Durable cross-version rules remain under `docs/rules/` (or their
existing durable location) rather than being copied into each version directory.

## Five core Product archives

Starting with v0.2.0, each product version must leave Product with five core long-term archives:

- `README_vX.X.X.md` preserves the public description of the product as that version closed.
- `PRD_vX.X.X.md` records what the version plans to build: scope, behaviour, exclusions and
  acceptance intent.
- `PRODUCT_HANDOFF_vX.X.X.md` is completed after implementation and acceptance. It records what was
  actually delivered, material differences from the PRD, PASS / NOT TESTED evidence, defects fixed
  during development, remaining known issues and risks, newly discovered Product problems,
  explicit carry-over and final version status.
- `Interaction_and_Information_Architecture_Spec_vX.X.X.md` records the accepted page, state,
  navigation and interaction contract.
- `AI_DESIGN_vX.X.X.md` records current AI behaviour, prompt policy, invocation and recovery
  strategy, state-safety boundary, observability policy, evaluation and limitations.

Keep the five files together in `docs/versions/vX.X.X/`. The root `README.md` is the deliberate
exception to version-suffixed archive names because it always represents the current product.

Use **ONE FACT → ONE AUTHORITATIVE HOME**. PRD owns product requirements and boundaries; Product
Handoff owns delivered status and the minimum continuation summary; Interaction/IA owns user-visible
structure and interaction; AI Design owns current AI policy. Decision Logs retain why and when a
decision changed, Engineering Reports retain implementation and verification, and historical records
must not be rewritten to make later decisions look original.

## Feishu product archive synchronization

The Feishu knowledge base is the navigable long-term copy of the same Product archive model. Under
the `Syllab for NTU Learn` project node, maintain one child node per released version. The project
node itself is named `Syllab for NTU Learn` and its root page mirrors the repository root
`README.md`, including the bilingual GitHub-homepage content. At each version closeout, copy the
then-current project-root README into that version node's own root page as a fixed snapshot. This
snapshot is the historical copy of the README that was current when that version was completed; it
is not a separate, independently authored README. Do not create a separate README child under the
version node. Keep the version's PRD, Product Handoff, Interaction/IA and AI Design as the four child
documents that, together with the version-root README snapshot, form the Five Core Product Archives.
Do not use Codex Handoffs, start prompts, obsolete prompts, superseded alignment handoffs, or other
engineering-session records as substitutes for these five Product archives.

Decision Logs, Engineering Reports, Technical Design, Final Acceptance, Final Closure, Release Notes,
Gate/tracker/QA records and other useful engineering or historical material may remain beside the core
archives. Their presence does not make them part of the Five Core Product Archives, and organizing a
version must not destructively delete them.

README image assets are part of the README snapshot. When synchronizing a README into Feishu, upload
and insert each product screenshot into the corresponding screenshot table cell in the root page;
do not append the images to the document tail, place them in an unrelated section, or rely on
unresolved local Markdown image paths. Apply this placement to every matching language section in
the README. At version closeout, preserve the same images and table placement in the version
root-page snapshot as well. Later README updates may replace the project-root images, but must not
change images or their placement already stored in an earlier version snapshot.

When a later version is released, update the project root page from the new repository root
`README.md`, then snapshot that same content into the new version node's root page. Leave all earlier
version-node root pages unchanged. Before creating anything, inspect the existing project and version
nodes and reuse any matching nodes or documents rather than creating duplicates. After
synchronization, verify the result by reading the Feishu tree and the created or updated document
contents.

## Product and engineering records

Technical Design, Implementation Plan, Gate / Acceptance records, Coding Handoffs and Agent Prompts
remain engineering records. They may support or be linked from the five core Product archives, but
they do not replace them.

The Product Handoff is a durable Product archive, not an engineering-session handoff. It must not
contain Agent instructions, Coding continuation prompts, temporary release-choice scripts or
repository takeover notes. Preserve evidence and unresolved facts without turning candidate
next-version directions into approved Product decisions.

## Temporary transfer-package cleanup

Only packages assembled temporarily for a specific handoff may be considered for cleanup after
they become obsolete. This category includes Handoff packages, Delivery packages, Transfer bundles,
Agent takeover packages, and complete copied or packaged material sets prepared to transfer work
between Product and Development. These packages may be removed from the local project only after the
handoff is complete, a newer handoff has replaced them, and the package contains no unique source of
truth. The purpose of this cleanup is to prevent the project directory from accumulating duplicate
transfer copies, not to erase historical records.

This cleanup rule never applies to formal historical archives. Preserve, at minimum:

- `PRD_vX.X.X.md`;
- `PRODUCT_HANDOFF_vX.X.X.md`;
- `README_vX.X.X.md`;
- formal Decision Logs;
- formal Acceptance and Validation records;
- durable project rules; and
- Product or engineering fact documents archived with a historical version.

The end of a version does not make these records disposable. Do not remove them merely because a
version is old, closed or superseded by later product work.

Before deleting any temporary transfer package, confirm all of the following:

1. The handoff is complete.
2. Every still-valid item in the package also exists in formal project documents, Git history or
   another reliable archive.
3. The package contains no unique Product decision, acceptance evidence, test record or user
   feedback.
4. Current and foreseeable follow-on work no longer depends on the package.

If any condition cannot be confirmed, retain the package by default. Cleanup authorization for a
temporary transfer package does not authorize deletion of any formal archive listed above.

Apply this archive model to every later version. Link to this document instead of duplicating its
rules in version-specific files.
