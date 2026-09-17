# Product version and archive rules

These rules define the durable Product record for every Syllab version.

## Starting a new version

When work on a new version begins:

1. Preserve the previous version's root README as `README_vX.X.X.md`.
2. Archive that snapshot with the rest of the previous version's material.
3. Continue using the root `README.md` for the new current version.

The root README's public content and screenshot rules live in
[`public-readme-and-screenshots.md`](public-readme-and-screenshots.md).

## Three core Product archives

Each product version must leave Product with three core long-term archives:

- `PRD_vX.X.X.md` records what the version plans to build: scope, behaviour, exclusions and
  acceptance intent.
- `PRODUCT_HANDOFF_vX.X.X.md` is completed after implementation and acceptance. It records what was
  actually delivered, material differences from the PRD, PASS / NOT TESTED evidence, defects fixed
  during development, remaining known issues and risks, newly discovered Product problems,
  explicit carry-over and final version status.
- `README_vX.X.X.md` preserves the public description of the product as that version closed.

Keep the three files with the corresponding version archive under `docs/` or the established
version directory. The root `README.md` is the deliberate exception to version-suffixed archive
names because it always represents the current product.

## Feishu product archive synchronization

The Feishu knowledge base is the navigable long-term copy of the same Product archive model. Under
the `Syllab for NTU Learn` project node, maintain one child node per released version. The project
node itself is named `Syllab for NTU Learn` and its root page mirrors the repository root
`README.md`, including the bilingual GitHub-homepage content. At each version closeout, copy the
then-current project-root README into that version node's own root page as a fixed snapshot. This
snapshot is the historical copy of the README that was current when that version was completed; it
is not a separate, independently authored README. Do not create a separate README child under the
version node. Keep only the version's `PRD_vX.X.X.md` and `PRODUCT_HANDOFF_vX.X.X.md` as child online
documents. Do not use Codex Handoffs, start prompts, obsolete prompts, superseded alignment handoffs,
or other engineering-session records as substitutes for these three Product archives.

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
remain engineering records. They may support or be linked from the three core Product archives, but
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
