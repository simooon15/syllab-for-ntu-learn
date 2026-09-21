# Project governance

This is the index for Syllab's durable project rules. `AGENTS.md` remains the short entry point for
repository-wide hard rules; detailed long-term rules are grouped by subject here:

- [`PROJECT_COLLABORATION_MODEL.md`](PROJECT_COLLABORATION_MODEL.md) — Product ↔ Engineering
  collaboration model, Google Drive Shared Project Mirror, filesystem-native synchronization,
  Handoff / Sync Manifest, conflict protection and role/file authority.
- [`DOCUMENTATION_GOVERNANCE.md`](DOCUMENTATION_GOVERNANCE.md) — documentation audiences, language
  classification, the four Feishu Core Product Archives, README lifecycle and source-of-truth
  boundaries.
- [`rules/product-version-archives.md`](rules/product-version-archives.md) — version directories,
  version transitions, Product archive synchronization and the boundary between Product archives
  and engineering records.
- [`rules/public-readme-and-screenshots.md`](rules/public-readme-and-screenshots.md) — the current
  public README, historical README snapshots and the README screenshot lifecycle.
- [`design-system.md`](design-system.md) — interface tokens, typography, components and rejected
  visual directions.
- [`fixture-policy.md`](fixture-policy.md) — fixture privacy and storage of real acceptance evidence.

These rules apply to every Syllab version unless a document explicitly marks itself as a temporary
pilot. Version-specific PRDs, Product Handoffs, acceptance records and implementation plans record
what happened in one version; they do not replace the long-term rule set.

`PROJECT_COLLABORATION_MODEL.md` is currently a v0.3.0 Collaboration Pilot baseline. During the pilot,
agents must follow it for cross-agent handoff and Drive/Local synchronization, but promotion to a
permanent cross-version rule requires Product Owner approval after at least one complete
Product → Engineering → Product cycle.

## Rule routing

Agents must automatically read the branch rule documents relevant to their task before acting; the
user does not need to request this explicitly. Read this index first when a task crosses categories
or when its correct branch is unclear, then follow every applicable branch.

For any task that moves project state between Product Side, Engineering Side, Google Drive and the
canonical local repo, read `PROJECT_COLLABORATION_MODEL.md` before syncing. Prefer deterministic
filesystem-native synchronization when Google Drive for desktop exposes the shared mirror locally.
Do not use high-capability model quota for mechanical per-file transfer when the filesystem can do
the work.

Future long-term rules should use the same structure: keep `AGENTS.md` short, place detail in the
smallest suitable existing branch, and add a new branch only when no current category owns the
subject. Register every new branch in this index. Do not turn version-specific or temporary process
notes into long-term rules.

Avoid copying a rule into multiple branch documents. Put each rule in the document that owns its
subject and link to it where another area depends on it.

If two active long-term rules conflict, preserve both statements and raise the conflict for a
Product decision rather than silently choosing one. Historical handoff or version-specific
instructions remain evidence of their original context, but do not override the active long-term
rule set unless explicitly promoted into it.
