# Project governance

This is the index for Syllab's durable project rules. `AGENTS.md` remains the short entry point for
repository-wide hard rules; detailed long-term rules are grouped by subject here:

- [`rules/product-version-archives.md`](rules/product-version-archives.md) — version directories,
  version transitions, the three core Product archives and the boundary between Product archives
  and engineering records.
- [`rules/public-readme-and-screenshots.md`](rules/public-readme-and-screenshots.md) — the current
  public README, historical README snapshots and the README screenshot lifecycle.
- [`design-system.md`](design-system.md) — interface tokens, typography, components and rejected
  visual directions.
- [`fixture-policy.md`](fixture-policy.md) — fixture privacy and storage of real acceptance evidence.

These rules apply to every Syllab version. Version-specific PRDs, Product Handoffs, acceptance
records and implementation plans record what happened in one version; they do not replace the
long-term rule set.

## Rule routing

Agents must automatically read the branch rule documents relevant to their task before acting; the
user does not need to request this explicitly. Read this index first when a task crosses categories
or when its correct branch is unclear, then follow every applicable branch.

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
