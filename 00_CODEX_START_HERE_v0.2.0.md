# Syllab for NTU Learn — Codex Development Handoff v0.2.0

**Product Version:** v0.2.0  
**Handoff Type:** Product Design → Technical Design → Implementation → Development  
**Status:** Ready for Codex execution

---

# 1. Mission

You are taking over **Syllab for NTU Learn v0.2.0** after Product Planning, AI Design, and Interaction & Information Architecture have been closed.

This is **not** a new product brainstorming round.

Your job is to:

1. inspect the existing local repository and v0.1.0 implementation;
2. produce `TECHNICAL_DESIGN_v0.2.0.md`;
3. produce `IMPLEMENTATION_PLAN_v0.2.0.md`;
4. after those two documents are internally consistent and technically actionable, **continue directly into implementation without waiting for routine human approval**;
5. develop in phases with automated tests;
6. complete **Gate 1 — Core Loop**;
7. continue development;
8. complete **Gate 2 — Release Acceptance**;
9. backfill final real UI screenshots into the Interaction & IA Spec and update the README Product Walkthrough;
10. prepare the version for final product acceptance and freeze.

Only stop for the user when one of the explicit stop conditions in this handoff is met.

---

# 2. Authoritative product inputs

Read these three documents completely before Technical Design:

1. `PRD_v0.2.0.md`
2. `PRODUCT_HANDOFF_v0.2.0.md`
3. `Interaction_and_Information_Architecture_Spec_v0.2.0.md`

They are the formal v0.2.0 product-design sources.

## 2.1 Responsibility split

- **PRD** — product scope, model, behavior, Product/User Flow, acceptance criteria.
- **PRODUCT_HANDOFF** — locked AI behavior, Task A/B/C, context, evidence, prompt baseline, evaluation, implementation-facing AI contract, testing/Gate principles.
- **Interaction & IA Spec** — screens, navigation, information hierarchy, interaction, UI states, error/recovery, Side Panel / Full-page behavior, screenshot requirements.

Do **not** create a separate Screen Inventory. The Interaction & IA Spec is already organized by Screen Family / page category and is the page-level implementation checklist.

If a technical choice appears to require changing a locked product rule, do not silently reinterpret the docs. Treat it as a **Product-impacting Technical Conflict** and stop at that conflict point.

---

# 3. Repository reading rules

Work from the **local repository first**.

Before changing code:

- inspect the current branch and `git status`;
- do not discard, reset, or overwrite existing user changes;
- inspect `README.md`, current code, build/test scripts, manifests, storage schemas, and relevant v0.1.0 documents already present locally;
- understand the existing architecture before proposing migrations;
- prefer local files and local Git history over reading the GitHub website.

Do not spend tokens pulling files from GitHub web when the same repository content exists locally.

The temporary handoff package can be removed later when it is no longer needed, but formal version documents under the project history must be preserved.

---

# 4. Locked product boundaries — do not reopen

Do not redesign or re-litigate:

- product positioning;
- `Semester → Course → Current Course State → Assessment` model;
- Assessment / Component / Assessment Series / Course-wide Constraint semantics;
- Same / Different / Uncertain;
- New / Changed / Conflict / Possibly Removed / Identity Uncertain;
- Local / AI / User boundaries;
- Task A / B / C responsibilities;
- Local-first + BYOK;
- DeepSeek-only baseline and accepted Prompt behavior;
- Popup removal;
- Side Panel / Full-page product roles defined in the current PRD and Interaction Spec;
- Todo / Planner / Reminder Center being out of scope;
- Product Mark A1 Folded Brief;
- interaction rules already locked in the Interaction & IA Spec.

Do not change the product model merely to make implementation or schema design easier.

---

# 5. Required Technical Design work

Create a formal `TECHNICAL_DESIGN_v0.2.0.md` whose filename and H1 both carry product version `v0.2.0`.

It must resolve the implementation questions left open by the product handoff, including at minimum:

- architecture for Local-first + BYOK;
- secure local API-key storage strategy;
- persistence model and migrations for Semester / Course / Current Course State / Review / History / Source relationships;
- local workflow orchestrator and resumable task state;
- Source machine-change detection / fingerprint strategy;
- Opportunity Checking throttle and scheduling behavior;
- Task A/B/C physical API-call strategy without changing their logical responsibilities;
- Task B complete concise index and original-Evidence expansion strategy;
- long Source chunking / overlap;
- mixed PDF text + image strategy;
- final structured-output JSON Schema and validator;
- malformed / truncated response retry behavior;
- DeepSeek output-budget strategy;
- Privacy Authorization and API Usage Authorization persistence;
- Backup / Restore full-replace implementation and integrity guarantees;
- Calendar Export event consolidation and KR-07 protection;
- KR-08 retry protection;
- E3 user-visible naming protection;
- E4 / E5 assessment and whether they should be hardened in v0.2.0;
- Side Panel / Full-page state synchronization;
- Extension lifecycle / service worker implications;
- failure recovery and atomicity where needed;
- testability and automation architecture.

Technical decisions may be made autonomously when they do not alter product semantics. Record rationale and test implications.

---

# 6. Required Implementation Plan

Create `IMPLEMENTATION_PLAN_v0.2.0.md`, again with `v0.2.0` in filename and H1.

The plan should:

- derive directly from the accepted Technical Design;
- divide implementation into coherent phases / vertical slices;
- define automated acceptance for every phase;
- make dependencies and migration order explicit;
- identify which work belongs before Gate 1 and which belongs before Gate 2;
- avoid unnecessary human checkpoints between ordinary phases;
- include screenshot-evidence generation and final document backfill as release work, not as an afterthought.

After Technical Design + Implementation Plan are internally complete and there is no Product-impacting Technical Conflict, **proceed directly into development**.

Do not stop merely to ask the user to approve routine technical choices.

---

# 7. Script-first testing and automation rule

This is a hard development-process requirement.

## 7.1 Prefer scripts over manual operation

If a requirement can be reliably checked with:

- CLI scripts;
- unit / integration tests;
- deterministic validators;
- fixtures;
- storage/data migration tests;
- mocked or recorded Source inputs;
- headless browser automation;
- Chrome-extension browser automation;
- Playwright or equivalent E2E automation;
- automated screenshot capture;
- AI regression runners;

then **use the scripted path first**.

Do not turn repeatable deterministic checks into manual click-through work.

## 7.2 Do not abuse Computer Use

Computer Use / human-like GUI operation is a last resort, not the default test method.

Do not use Computer Use merely because a feature has a UI.

If browser automation or a script can reliably:

- open the extension surface;
- navigate screens;
- inject fixtures;
- trigger actions;
- inspect DOM/state/storage;
- verify expected outputs;
- capture screenshots;

then use that approach instead.

Reserve Computer Use / manual interaction for the small set of cases where:

- the real GUI behavior cannot reasonably be scripted;
- the task specifically requires human visual/Product Judgment;
- a real external platform interaction cannot be represented by the automated harness;
- the final Human / Product Gate intentionally requires a product-owner judgment.

## 7.3 Automation outcome

Tests should be reproducible, re-runnable, and evidence-producing.

Prefer a command-driven workflow where the same test can be executed again after a fix without repeating manual steps.

When a deterministic test fails, Codex may fix the issue and rerun the relevant regression automatically.

---

# 8. Development / Gate model

Do not stop after every phase for human validation.

Each implementation phase should have its own applicable:

- typecheck / lint;
- unit tests;
- integration tests;
- deterministic contract tests;
- storage / migration tests;
- error/recovery tests;
- AI regression tests;
- browser / extension E2E tests;
- screenshot / evidence generation when relevant.

If those pass, continue automatically.

## 8.1 Gate 1 — Core Loop

Gate 1 must validate the complete vertical slice:

`Course discovery → Initial Scan → Task A/B → Initial Review → Current Course State → Source update → Local machine-change detection → Task A/B/C when required → Change Review → Updated Current Course State`

It must also cover:

- Canonical Assessment identity;
- trusted Current State protection;
- Local-first persistence;
- BYOK basic call path;
- key failure / retry protection.

## 8.2 Gate 2 — Release Acceptance

Gate 2 must cover the complete v0.2.0 scope, including:

- Semester Dashboard;
- Side Panel / Full-page;
- Opportunity Checking;
- Local-first + BYOK;
- Backup / Restore;
- Calendar Export;
- Product Mark;
- KR-07 / KR-08 / E3;
- AI Regression;
- Error / Recovery;
- at least two structurally different real NTU Learn Courses where practical;
- final UI screenshot evidence;
- README Product Walkthrough;
- full regression.

## 8.3 One-command Gate acceptance

Provide a one-command / one-click acceptance workflow for each formal Gate, following repo conventions.

Each should automate as much of this chain as possible:

`Build → Automated Tests → Integration / E2E → AI Evaluation / Regression → Data Integrity → Evidence Collection → Gate Acceptance Report`

The Gate report must clearly distinguish automated Pass/Fail from the small number of items that still require Product Judgment.

---

# 9. Opportunity Checking cost / AI boundary

Do not treat `Checking…` as synonymous with “AI is running.”

Opportunity Checking must first use deterministic local machine-change detection on Sources.

Conceptually:

`Fetch / inspect Source → machine comparison / fingerprint → unchanged: stop without AI → changed: enter semantic Task A/B/C path as needed`

The exact fingerprint/hash mechanism is a Technical Design decision.

Source unchanged must not consume DeepSeek API.

---

# 10. UI implementation and screenshot evidence

The Interaction & IA Spec is organized by Screen Family and includes the implementation / screenshot checklist.

For every complete screen and every important state marked as requiring evidence:

- implement the real final UI;
- capture at least one final screenshot;
- capture Side Panel and Full-page separately when layout differs materially;
- prefer deterministic automated browser capture over Computer Use;
- keep screenshot paths stable and versioned;
- backfill each screenshot into the corresponding page/state section of `Interaction_and_Information_Architecture_Spec_v0.2.0.md`;
- add a short explanation of what the screen is, its major areas, and how the user operates it.

Do not create a separate final screenshot document.

README should use the final real screenshots from the product to create a concise Product Walkthrough covering the major product surfaces and flows.

README is a presentation layer, not a product fact source.

---

# 11. Documentation rules

Formal v0.2.0 project documents must keep `v0.2.0` in both filename and main title.

By the end of the version, the retained formal documentation should include at least:

- `PRD_v0.2.0.md`
- `PRODUCT_HANDOFF_v0.2.0.md`
- `Interaction_and_Information_Architecture_Spec_v0.2.0.md`
- `TECHNICAL_DESIGN_v0.2.0.md`
- `IMPLEMENTATION_PLAN_v0.2.0.md`
- Gate acceptance / evidence documents required by the development process

Do not create redundant “delta” documents when the authoritative formal document itself can be updated safely.

After implementation, update the Interaction & IA Spec with final screenshots and update README with the Product Walkthrough.

At final documentation sync, include the Interaction & IA / Page Design document together with the other formal project documents in the Feishu knowledge base workflow. If the current environment has no Feishu capability, prepare the final sync-ready document set and state that external sync remains to be executed in an environment with access.

---

# 12. Stop conditions — when to ask the user

Do **not** ask for approval after ordinary phases or routine technical decisions.

Stop and ask the user only if:

1. a technical constraint would require changing a locked Product / AI / Interaction rule;
2. a key automated test or Gate failure cannot be resolved without Product Judgment;
3. two technically viable options have materially different user-facing product behavior and the existing docs do not decide between them;
4. a required real-world external action genuinely cannot be automated or safely completed without the user;
5. final Human / Product Gate acceptance is ready.

Otherwise, make the technical decision, document it, test it, and continue.

---

# 13. Expected final delivery

The development handoff is complete only when Codex can provide:

- Technical Design v0.2.0;
- Implementation Plan v0.2.0;
- implemented v0.2.0 code;
- automated phase tests;
- one-command Gate 1 acceptance + report;
- one-command Gate 2 acceptance + report;
- AI regression evidence;
- data integrity / recovery evidence;
- final screenshot set mapped to the Interaction Spec;
- Interaction Spec screenshot backfill;
- README Product Walkthrough update;
- final regression result;
- any remaining Product-impacting issue explicitly identified rather than silently worked around.

---

# 14. Start now

Begin by reading the three supplied formal documents completely, then inspect the local repository and existing v0.1.0 implementation.

Create Technical Design and Implementation Plan, validate that they preserve the locked product contracts, and then proceed directly into implementation.

Do not reopen product brainstorming unless a real Product-impacting Technical Conflict is discovered.
