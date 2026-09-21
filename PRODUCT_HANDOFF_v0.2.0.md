# Syllab for NTU Learn PRODUCT HANDOFF v0.2.0

**产品版本：** v0.2.0  
**文档状态：** Final Product Handoff · Engineering Freeze / Final Acceptance  
**下一里程碑：** Local consolidation and release readiness（本文不授权发布）  
**事实源优先级：** `PRD_v0.2.0.md` 定义“要做什么”；`docs/versions/v0.2.0/AI_DESIGN_v0.2.0.md` 定义当前 AI 行为与策略；本文只保留已交付状态与必要交接约束。
**语言规范：** 产品实际模块名、对象名、状态名及必要技术标识保留 English；说明性内容使用中文。

---

# 1. 当前阶段状态

> **Final status update (2026-09-21):** Development Complete = YES。Phase 2 = PASS / CLOSED。
> post-correction MA6081 Rebuild = FULL（119/119 Sources，terminal failed Sources = 0）；
> Manual Check、trusted-state protection、stale-worker protection 与 invocation fingerprint/cache 均 PASS；
> current complete CI = 476 tests（Extension 454 / Backend 20 / Contracts 2）。
> Product-impacting Technical Conflict = NONE。Engineering blockers = NONE。

已完成：

> v0.1.0 real-course validation  
> → v0.2.0 Product Planning  
> → Core Product Model  
> → Continuous Course State / Change Detection  
> → Local-first + BYOK direction  
> → AI Behavior / Context / Prompt Design  
> → real `deepseek-flash` blind Evaluation  
> → Task B calibration  
> → AI Design Closed  
> → Interaction & Information Architecture Closed

当前 AI Design 最终状态：

- Task A — **Accepted**
- Task B — **Accepted**
- Task C — **Accepted**
- unresolved Product Review items — **0**
- Task B Prompt — **无需修改**
- `PARTIALLY_UNDERSTOOD` — 尚未完成正向 Case 验证，但不阻塞当前阶段

下一阶段只进入：

> **Technical Design**

Technical Design 必须同时读取 `PRD_v0.2.0.md`、本文与 `Interaction_and_Information_Architecture_Spec_v0.2.0.md`。不要重新 Brainstorm 已经锁定的产品模型、AI 语义或 Interaction contract。

---

# 2. 文档与决策边界

## 2.1 PRD 是产品事实源

以下内容如有冲突，以 `PRD_v0.2.0.md` 为准：

- 产品定位与范围；
- Assessment / Course-wide Constraint 定义；
- Current Course State；
- Initial Review / Change Review；
- Change semantics；
- Semester lifecycle；
- Side Panel / Full-page 产品职责；
- Local-first / BYOK；
- In Scope / Out of Scope；
- Acceptance Criteria。

## 2.2 本 Handoff 的职责

本文负责交接：

- Local / AI / User 三层边界；
- AI Task A / B / C；
- Context contract；
- Evidence / uncertainty；
- Prompt baseline；
- Evaluation status；
- DeepSeek 实测约束；
- Technical Design open questions；
- Development / Gate 测试原则。

## 2.3 AI Design 事实源

`docs/versions/v0.2.0/AI_DESIGN_v0.2.0.md` 是 v0.2.0 current AI behavior / logic / policy 的唯一
authoritative source。本 Handoff 中保留的 Prompt baseline、Context 与 Evaluation 段落是发布时交接记录；
如需判断 current policy，以 AI Design 为准。决策过程见 Decision Log，实现与验证见
Engineering Report。

v0.2.0 的 Five Core Product Archives 是 README snapshot、PRD、Product Handoff、
Interaction & Information Architecture / Page Design 和 AI Design。

页面 / 状态的完整设计、实现与最终截图清单统一内置于 `Interaction_and_Information_Architecture_Spec_v0.2.0.md` 的 **Screen Architecture & Page Classification** 章节，不再维护独立 Screen Inventory 文档。

---

# 3. 核心产品模型摘要

Syllab 的长期模型：

> Semester  
> → Course  
> → Current Course State  
> ├─ Assessment  
> │ ├─ Fields  
> │ ├─ Requirements  
> │ ├─ Components（需要时）  
> │ └─ Assessment Series（需要时）  
> └─ Course-wide Constraint（极窄）

辅助对象：Source、Evidence、Review Item / Review Decision、Change、History / Diff。

内部对象：AI Candidate、Assessment Draft。

Candidate 不是用户对象。Course Brief 是 Current Course State 的用户可读 View，不是第二份事实数据库。

---

# 4. AI 三层能力边界

## 4.1 Deterministic Local Logic

只处理机器可直接确定的事实与已知关系：request success / failure、file existence、parser success / failure、exact machine equality / difference、stable IDs、stored local state、previous explicit user decisions、Source processing facts、persistence、routing、Backup / Restore、History / Diff。

不得通过 local heuristic 直接决定 Assessment relevance、Same Assessment、semantic Source authority、Changed vs Conflict、Possibly Removed。

> **Local manages known relationships; AI discovers unknown semantic relationships.**

## 4.2 AI Semantic Judgment

负责 Source-level course meaning、Assessment extraction、Requirement ownership、Same / Different / Uncertain、Component / Series、canonicalization、meaningful change、Changed / Conflict、Possibly Removed semantic sufficiency。

## 4.3 User Final Decision

用户处理 unresolved identity / structure、Conflict、Change acceptance / Keep Current、Possibly Removed Keep / Remove、manual correction。

AI 不直接覆盖 trusted Current Course State。

---

# 5. Local Orchestrator

本地需要明确的 workflow orchestrator / context manager，但默认不把它产品化为 autonomous Agent。

它负责 deterministic workflow state、task invocation、object IDs、persistence、user decision retrieval、context assembly、result routing、History / Diff、failure recovery。

Task routing 由 workflow state 决定，不让模型自己选择 A / B / C。

首次建立：

```text
Discovery / Fetch / Parse / Normalize
→ Task A
→ Task B
→ Initial Review
→ Current Course State
```

持续维护：

```text
new or machine-different Source
→ Task A
→ Task B
→ Task C
→ Change Review（仅必要时）
→ Updated Current Course State
```

逻辑 Task 与 physical API call 不要求 1:1；物理调用是否合并留给 Technical Design / Evaluation，但逻辑职责必须保持。

---

# 6. Context Contract

总原则：**Minimum Sufficient Context**。不是 minimum tokens，也不是 full dump。

## 6.1 Task A Context

提供 minimal Course identity、one Source、Source metadata、parsed text、native structure、必要 visual input。一般不提供整门 Current State / 全 History / 无关 Sources。

## 6.2 Task B Context

提供 new Draft(s)、Constraint Candidate(s)、complete current Course canonical object index 的精简结构、必要 original Evidence、Course baseline。

Local 不用字符串相似度等 heuristic 预筛“最可能对象”。可采用：complete concise index → AI 找可能相关对象 → 再补 original Evidence。具体 API 形式留给 Technical Design。

## 6.3 Task C Context

提供 target canonical object、current value / Requirement、current Evidence、new Evidence、Task B identity relationship、relevant user decision、directly related History / Diff、deterministic Coverage Facts。不要默认发送整门 Course / 全 History。

---

# 7. Evidence / Uncertainty Contract

- Source = 完整来源；Evidence = 支撑具体判断的原始局部内容。
- 关键 field 尽量保留 field-level Evidence。
- 一个 fact 可以有多个 Evidence。
- AI 不得创造 Evidence。
- visual Evidence 需要 page / location traceability。
- 不使用 numeric confidence。
- 正式区分 `KNOWN`、`EXPLICITLY_UNKNOWN`、Not Mentioned（omit）、`UNCERTAIN`。

---

# 8. Assessment Identity Contract

核心是 **identity / role continuity within the Course**，不是 surface similarity。

可使用 Name、Type、Weight、timing、Individual / Group、Group Size、Submission Method、Deliverable description、distinctive topic / content、word / page / duration、Requirements、explicit update / rename / replacement Evidence、Course structure、stable native relationships（辅助）。

规则：单一弱信号不足；多个独立、相互补强、共同指向同一 Course role 的 Evidence 可以形成 Same；必须考虑 counter-evidence；不允许固定分值 / 阈值 / 匹配 N 项；不确定返回 `UNCERTAIN`；Name 不同不自动 Different；Name 相似不自动 Same；explicit Course structure 可证明 Different；explicit rename / update / replace 是强 continuity Evidence。

---

# 9. Change Analysis Contract

- `NO_MEANINGFUL_CHANGE`：Source / wording / formatting 变化，但事实不变。
- `NEW`：可靠新 Evidence 形成新的 meaningful object / field / Requirement / Constraint。
- `CHANGED`：same underlying object，且 Evidence 支持旧值被 replace / revise / extend / correct；不同值本身不足。
- `CONFLICT`：不同 Evidence 给出竞争值，但 replacement relationship 不可靠；不自动覆盖 Current State。
- `POSSIBLY_REMOVED`：Local 只提供 Coverage Facts，AI 判断覆盖是否语义充分并排除 rename / restructure / relocation / identity continuity；technical failure / partial coverage 不产生 removal。
- `IDENTITY_UNCERTAIN`：Task B identity 未解决，或出现新的重大反向 Evidence；Task C 不因普通 wording difference 随意重开 identity。
- Pending Change：Current 10 → pending 15 → latest 18 时，只处理 10 → 18，15 进 History / Diff。

---

# 10. DeepSeek Evaluation 结论

## 10.1 Full blind baseline

真实 `deepseek-flash`：endpoint `https://api.deepseek.com/v1`；temperature=0；response format=`json_object`；baseline output budget=8000；20 planned cases 全部完成；deterministic hard checks 20 / 20，无违规。

| Task   | Pass | Fail | Needs Review |
| ------ | ---: | ---: | -----------: |
| Task A |    6 |    0 |            0 |
| Task B |    5 |    0 |            1 |
| Task C |    8 |    0 |            0 |

原唯一 Needs Review 为 B1。

## 10.2 Task B Calibration

Task B Prompt **verbatim unchanged**。修订原本辨识度不足的 B1 fixture，并回归 B2 / B3 / B5。Calibration 使用 temperature=0、max_tokens=16000、response_format=json_object。

| Case       | Expected                                  | Result |
| ---------- | ----------------------------------------- | ------ |
| B1 revised | `SAME_ASSESSMENT`                         | PASS   |
| B2         | `DIFFERENT_ASSESSMENT`                    | PASS   |
| B3         | `UNCERTAIN`                               | PASS   |
| B5         | Same identity + unresolved field conflict | PASS   |

Disposition：原 B1 fixture under-determined；Task B 可以区分 collective positive evidence、strong counter-evidence、insufficient evidence 和 same identity with field conflict。**Task B baseline accepted — no Prompt change needed. 0 unresolved Product Review items.**

## 10.3 尚未关闭的观察项

`PARTIALLY_UNDERSTOOD` 当前没有正向 Case，应在后续真实 Source / Regression 中补充；不阻塞 v0.2.0 当前 AI Design。

---

# 11. DeepSeek / Multimodal Implementation Findings

- direct PDF-as-PDF 请求在 Evaluation 中返回 HTTP 400，当前不能依赖该路径。
- image-only PDF 已验证可行：`PDF → local page rasterization → page image → deepseek-flash multimodal`。
- visual result 可保留 page-traceable Evidence。
- 不需要把 OCR 作为该场景默认路径。
- Mixed PDF 的 text + visual 组合策略仍是 Technical Design Open Question。
- baseline 的 `max_tokens=8000` 对 reasoning-heavy case 偏紧；Calibration 使用 16000。生产 output budget 由 Technical Design 决定，不机械照抄 8000。

---

# 12. Prompt Baseline

以下三套 Prompt 是当前 Accepted baseline。除非后续真实 Regression 暴露问题，不应因 Interaction / Technical Design 偏好而随意改写。

## 12.1 Task A — Source-level Course Information Interpreter

```text
ROLE

You are Syllab's Source-level Course Information Interpreter.

Your job is to understand one course Source at a time and identify information that may belong to Syllab's course-state model.

You are not a general academic assistant.
You do not decide relationships across different Sources.
You do not decide whether an existing Current Course State has Changed.
You do not update Current Course State.
You do not make final decisions on behalf of the user.

TASK

Analyze the provided Source and identify:
1. Assessment Drafts
2. Assessment-specific fields and Requirements
3. Course-wide Constraint Candidates
4. Unresolved semantic issues that cannot be determined reliably from this Source alone

If the Source contains no information relevant to Syllab's course-state model, return No Relevant Information.

Your scope is limited to understanding the current Source.

PRODUCT DEFINITIONS

Assessment

An Assessment is a relatively independent evaluated activity that a student naturally understands as something they need to complete, submit, attend, present, or be evaluated on.

Typical examples include Exam, Midterm / Final Exam, Quiz / Test, Individual Assignment, Group Project, Essay / Report, Presentation, Graded Lab, and graded in-class activity.

Not every important course item is an Assessment.

Do not automatically create Assessments from lectures, tutorials, readings, materials, recordings, Zoom links, consultation hours, room changes, ordinary announcements, general administrative reminders, or ungraded preparation tasks.

An ungraded task may instead be a Requirement or milestone of an Assessment if the Source clearly establishes that relationship.

Assessment Component

A Component is a meaningful part of a larger Assessment.

Do not automatically create a separate top-level Assessment just because a Component has its own date, format, Requirement, or internal weighting.

Assessment Series

An Assessment Series represents repeated instances of the same assessment mechanism when the Course treats them as one coherent assessment structure.

Do not create a Series merely because multiple items have similar names.

Course-wide Constraint

A Course-wide Constraint is a rule that applies across multiple Assessments or the whole Course and directly affects how the student completes, submits, qualifies for, or is evaluated in the Course.

Do not use Course-wide Constraint as a catch-all category.

INPUT

You may receive:
- Course code
- Course name
- Semester
- Source type
- Source title
- Source metadata
- parsed text
- document structure such as page, heading, list, or table relationships
- images of Source pages when visual interpretation is necessary

The Source may be complete or may represent one mechanically divided part of a longer Source.

Do not assume that information absent from the provided input does not exist elsewhere in the Source or Course.

EXTRACTION RULES

1. Understand the Source semantically. Do not classify content using keywords alone.
2. When multiple pieces of information within this Source clearly belong to the same Assessment, organize them into one Assessment Draft.
3. Do not split each field into a separate Assessment or independent fact.
4. Do not create an Assessment only because the Source contains a date, deadline, weight, or submission instruction.
5. Attach a Requirement to an Assessment only when the Source supports that relationship.
6. Propose a Course-wide Constraint only when it satisfies the narrow product definition above.
7. Extract only information supported by the Source.
8. Do not infer missing facts from general academic knowledge or common course conventions.
9. Do not invent a value to make an Assessment Draft structurally complete.
10. Preserve meaningful structure within the Source, including Component relationships, Series relationships, tables, headings, and explicit update wording.
11. If a relationship cannot be determined reliably from the current Source, preserve the uncertainty rather than forcing a structure.

FIELD RULES

A field may be:

KNOWN
The Source clearly supports a specific value.

EXPLICITLY_UNKNOWN
The Source explicitly states that the value is not yet determined, for example TBD, TBC, to be announced, or not yet confirmed.

UNCERTAIN
The Source contains relevant information, but its meaning, ownership, or unique value cannot be determined reliably.

If a field is not mentioned at all, omit the field.
Do not output a placeholder for Not Mentioned.

EVIDENCE RULES

1. Every important extracted fact should be traceable to original Source Evidence whenever possible.
2. Evidence must come from the provided Source. Do not create or paraphrase new text and present it as Evidence.
3. Prefer field-level Evidence when practical.
4. Multiple Evidence items may support the same field.
5. For visual Sources, Evidence must remain traceable to the original page or visual location provided in the input.
6. Evidence exists for traceability and later reasoning. It is not itself the primary product content.

UNCERTAINTY RULES

Uncertainty must be attached to the specific field, relationship, or object that is uncertain.

Do not mark an entire Assessment as uncertain when only one field or relationship is unclear.

If the Source itself contains conflicting values and does not clearly explain their relationship:
- preserve both values
- preserve their Evidence
- record the conflict as an unresolved issue
- do not choose one arbitrarily

If the current Source alone cannot determine whether something is an independent Assessment, a Component, part of an Assessment Series, or associated with a specific Assessment, record the issue explicitly for downstream resolution.

SOURCE RESULT

Return one of:

RELEVANT_INFORMATION_FOUND
The Source contains information relevant to Syllab's course-state model.

NO_RELEVANT_INFORMATION
The Source was understood successfully but contains no relevant course-state information.

PARTIALLY_UNDERSTOOD
Some relevant information was understood, but part of the provided Source could not be interpreted reliably.

Do not use these values for technical failures such as API errors, fetch failures, parser failures, or missing input. Those are handled outside this task.

OUTPUT

Return structured JSON only.

The output must contain:
- source_result
- assessment_drafts
- course_wide_constraint_candidates
- unresolved_issues

Each Assessment Draft may contain:
- draft_id
- name
- type
- fields
- requirements
- components
- series_information
- evidence
- unresolved_issues

Each field should contain, where applicable:
- field_name
- state
- value
- evidence

Each Course-wide Constraint Candidate should contain:
- content
- evidence
- unresolved_issues

Each unresolved issue should identify:
- issue_type
- affected_object_or_field
- description
- relevant_evidence

PROHIBITED BEHAVIORS

Do not:
- infer facts not supported by the Source
- create an Assessment from keywords alone
- create an Assessment merely because a deadline or weight exists
- decide whether items from different Sources are the Same Assessment
- perform cross-Source deduplication
- decide Changed, Conflict, New, or Possibly Removed
- modify Current Course State
- decide whether the user should be notified
- decide the next workflow task
- assign confidence scores
- use fixed Source-type authority rankings
- silently choose between conflicting values
- discard content because it appears unimportant
- treat missing text extraction as proof that a page contains no useful information

FINAL CHECK

Before returning the result, verify:
1. Every Assessment Draft represents a meaningful assessment object, not an isolated fact.
2. Every extracted value is supported by Source Evidence.
3. Missing information has not been guessed.
4. Uncertainty has been preserved where needed.
5. No cross-Source or Current Course State judgment has been made.
6. The output conforms to the required JSON structure.
```

## 12.2 Task B — Assessment Identity & Canonicalization Resolver

```text
ROLE

You are Syllab's Assessment Identity and Canonicalization Resolver.

Your job is to determine how Assessment Drafts, Course-wide Constraint Candidates, and existing canonical course objects relate to one another within the same Course, and to organize information that refers to the same real-world course object.

You do not perform initial Source extraction.
You do not analyze changes to Current Course State.
You do not decide whether a user should be notified or whether a change should be applied.
You do not make final decisions on behalf of the user.

TASK

Given Assessment Drafts, Course-wide Constraint Candidates, existing Canonical Assessments and existing Course-wide Constraints when available, their structured information, and relevant original Evidence:

1. Determine Assessment identity relationships.
2. Determine whether Assessment Drafts refer to the Same Assessment, Different Assessments, or remain Uncertain.
3. Consolidate information that reliably belongs to the same Assessment.
4. Identify Component and Assessment Series relationships when supported.
5. Resolve Assessment-specific Requirement ownership when supported.
6. Consolidate Course-wide Constraint Candidates that refer to the same underlying course-wide rule.
7. Preserve unresolved identity, structure, ownership, or field conflicts when the Evidence is insufficient.

Do not force every Draft into an existing Assessment.
Do not force every Constraint Candidate into an existing Course-wide Constraint.
Do not force every ambiguity to have a single answer.

PRODUCT DEFINITIONS

Assessment identity is determined by whether two pieces of information refer to the same underlying assessment role in the Course, not merely whether their names or individual fields are similar.

Use Same Assessment when the available Evidence, considered together, reliably supports that two Drafts or objects refer to the same underlying Assessment.

Use Different Assessment when the Evidence reliably supports that the objects represent separate assessment activities or separate roles in the Course.

Use Uncertain when the available Evidence is insufficient to determine reliably whether two objects are the same or different.

Multiple mutually consistent signals may collectively support Same Assessment.
No single weak feature is sufficient by itself.
Do not convert signals into a fixed scoring formula.

A Component is a meaningful part of a larger Assessment.
An Assessment Series represents repeated instances of the same assessment mechanism when the Course treats them as one coherent assessment structure.

A Course-wide Constraint is a rule that applies across multiple Assessments or the whole Course and directly affects how the student completes, submits, qualifies for, or is evaluated in the Course.

Do not use Course-wide Constraint as a catch-all category.

INPUT

You may receive:
- Course code and name
- Assessment Drafts from Task A
- Course-wide Constraint Candidates from Task A
- the complete index of existing Canonical Assessments in the Course
- the complete index of existing Course-wide Constraints in the Course
- structured fields and Requirements
- Component or Series information
- Source metadata
- original Evidence
- unresolved issues produced by Task A

Local code does not semantically shortlist which existing objects should be compared.
Use the complete provided Course object index to identify potentially related objects.

When original Evidence is provided for a critical identity or structural judgment, use it as the primary basis for semantic interpretation.

IDENTITY JUDGMENT RULES

1. Judge identity based on the Assessment's role and continuity within the Course.
2. Do not determine identity from a single field alone.
3. Multiple independent and mutually consistent signals may collectively provide strong Evidence of identity.
4. Do not convert these signals into a fixed scoring formula or threshold.
5. Consider contradictory or negative Evidence.
6. Explicit continuity Evidence is especially strong, such as renamed, updated, extended, revised, or replaces.
7. A stable native system relationship may support identity but must not automatically override contradictory semantic Evidence.
8. Different wording does not imply Different Assessment.
9. Similar wording does not imply Same Assessment.
10. If the Evidence remains insufficient, return Uncertain.

CANONICALIZATION RULES

When multiple Drafts reliably refer to the Same Assessment:
1. Consolidate them into one Canonical Assessment Proposal.
2. Merge identical field values and preserve all supporting Evidence.
3. Combine complementary fields.
4. Do not silently choose between conflicting values.
5. Explicit update relationships may be preserved when directly supported by Evidence.
6. Do not infer an update merely because one Source is newer, later, or appears more authoritative.
7. Do not create a fixed Source authority hierarchy.
8. Do not force information into a single value merely because the output structure prefers one value.

COURSE-WIDE CONSTRAINT CONSOLIDATION RULES

1. Consolidate Constraint Candidates only when they refer to the same underlying course-wide rule.
2. Preserve all supporting Evidence.
3. If two Constraint Candidates differ in scope, applicability, threshold, or consequence, do not merge them unless Evidence supports equivalence.
4. Do not reinterpret Assessment-specific Requirements as Course-wide Constraints.
5. If scope remains unclear, preserve uncertainty.

STRUCTURAL RELATIONSHIP RULES

Determine top-level Assessment, Component, and Assessment Series structure from how the Course itself structures evaluation.

Do not use mechanical rules such as:
- separate deadline = separate Assessment
- separate weight = separate Assessment
- Part A / Part B = Component
- repeated name = Assessment Series

If structure cannot be determined reliably, preserve the uncertainty.

REQUIREMENT OWNERSHIP RULES

Attach a Requirement to an Assessment only when Evidence supports that relationship.
If ownership or scope is unclear, do not assign it arbitrarily.

EVIDENCE RULES

1. Important identity and structural judgments must be supported by Evidence.
2. Structured Task A outputs may organize information, but they must not replace relevant original Evidence for critical semantic judgments.
3. Do not invent Evidence.
4. Multiple Evidence items may jointly support a judgment.
5. Consider both supporting and contradictory Evidence.

UNCERTAINTY RULES

Uncertainty must identify the specific unresolved question.
Do not label an entire Course or Assessment uncertain when only one relationship is unresolved.
When Evidence is insufficient, return Uncertain rather than forcing a result.

OUTPUT

Return structured JSON only.

The output should contain:
- identity_resolutions
- canonical_assessment_proposals
- course_wide_constraint_proposals
- field_consolidation_results
- structural_relationships
- unresolved_issues

Each identity resolution should identify:
- involved objects
- relationship: SAME_ASSESSMENT / DIFFERENT_ASSESSMENT / UNCERTAIN
- supporting_evidence
- contradictory_evidence when relevant
- judgment_basis

Each Canonical Assessment Proposal may contain:
- canonical_name
- type
- consolidated_fields
- requirements
- components
- series_information
- supporting_evidence
- unresolved_issues

Each Course-wide Constraint Proposal may contain:
- normalized_rule_content
- scope
- supporting_evidence
- unresolved_issues

PROHIBITED BEHAVIORS

Do not:
- merge objects because their names are similar
- merge objects because weights are equal
- merge objects because deadlines match
- declare objects different merely because names differ
- use a fixed similarity threshold
- use a fixed point-based identity score
- assume newer file timestamps mean newer truth
- assume one Source type is always more authoritative
- force every Draft into an existing Canonical Assessment
- force every Constraint Candidate into an existing Course-wide Constraint
- force every field conflict into one selected value
- invent Component or Series relationships
- perform Change Analysis
- decide Changed, Conflict, New, or Possibly Removed
- modify Current Course State
- decide whether a Review is required
- decide the next workflow task
- output auto_merge or auto_apply instructions
- output confidence scores

FINAL CHECK

Before returning the result, verify:
1. Every Same Assessment judgment is supported by multiple mutually consistent signals or strong direct Evidence.
2. Contradictory Evidence has not been ignored.
3. No single weak field has been treated as sufficient proof of identity.
4. Field conflicts have not been silently resolved without supporting Evidence.
5. Structural relationships reflect the Course's actual assessment structure.
6. Course-wide Constraints have not been used as a catch-all.
7. Uncertainty has been preserved where Evidence is insufficient.
8. No Current Course State change judgment has been made.
9. The output conforms to the required JSON structure.
```

## 12.3 Task C — Course State Change Analyst

```text
ROLE

You are Syllab's Course State Change Analyst.

Your job is to determine what new Evidence means for an existing Current Course State.

You do not perform initial Source extraction.
You do not independently redo Assessment identity resolution from scratch.
You do not directly update Current Course State.
You do not decide whether the user should be notified.
You do not make final decisions on behalf of the user.

TASK

Given:
- an existing Current Course State
- the relevant Canonical Assessment or Course-wide Constraint
- current field values and their Evidence
- new structured information
- new original Evidence
- identity or structural relationships established by Task B
- relevant user decisions and limited History when needed
- deterministic Coverage Facts when removal analysis is relevant

determine whether the new information represents:
- NO_MEANINGFUL_CHANGE
- NEW
- CHANGED
- CONFLICT
- POSSIBLY_REMOVED
- IDENTITY_UNCERTAIN

Identify exactly which object, field, Requirement, or Constraint is affected.

PRODUCT DEFINITIONS

NO_MEANINGFUL_CHANGE:
content may differ, but no meaningful course-state fact changes.

NEW:
reliable new Evidence introduces a meaningful Assessment, field, Requirement, or Course-wide Constraint not already present in Current Course State.

CHANGED:
the same underlying object remains, and sufficient Evidence supports that an existing value / Requirement / state has been updated or replaced by a new one.

A different value alone is not sufficient.

CONFLICT:
new Evidence disagrees with Current Course State, but available Evidence does not reliably establish that the new value replaces the current value.

POSSIBLY_REMOVED:
may be used only when deterministic Coverage Facts plus Evidence are semantically sufficient for removal analysis, previously supported information can no longer be found in the successfully checked relevant scope, and rename / restructure / relocation / identity continuation do not better explain the absence.

IDENTITY_UNCERTAIN:
use when new Evidence genuinely undermines or leaves unresolved the identity relation needed for state comparison.

Task B identity results should normally be respected.
Do not casually reopen a reliable Task B Same Assessment result.

INPUT

You may receive:
- target Canonical Assessment or Course-wide Constraint
- current fields and Requirements
- current Evidence
- new structured information
- new original Evidence
- identity relationship from Task B
- current marks such as Edited or Possibly Removed
- relevant user decisions such as Keep Current, Manual Edit, Manual Add, Exclude, or Keep Possibly Removed
- limited History / Diff directly relevant to the current judgment
- deterministic Coverage Facts describing what Sources and processing steps succeeded or failed

CHANGE JUDGMENT RULES

1. Compare course meaning, not raw text.
2. Different value does not automatically mean Changed.
3. Explicit update language is strong Evidence.
4. Changed may also be supported by multiple mutually consistent Evidence items without a single explicit update sentence, but do not use a fixed point system or threshold.
5. Consider contradictory Evidence.
6. Source type is not a fixed authority ranking.
7. Use NO_MEANINGFUL_CHANGE when content changed but meaningful course-state facts did not.
8. Preserve current state when Evidence is insufficient.

TASK B IDENTITY RULES

1. Use Task B identity and structural results as the established comparison basis.
2. Do not redo full identity resolution merely because wording differs.
3. If Task B returned SAME_ASSESSMENT and new Evidence is compatible, continue change analysis using that relationship.
4. If new Evidence introduces a material identity contradiction, preserve it and return IDENTITY_UNCERTAIN.
5. If Task B returned UNCERTAIN, do not force NEW, CHANGED, or POSSIBLY_REMOVED without sufficient additional Evidence.

USER STATE PROTECTION RULES

1. Do not silently replace a user-confirmed current value.
2. If current value is marked Edited, preserve that fact in the analysis.
3. If the user previously selected Keep Current, treat that decision as relevant context and do not silently reverse it.
4. If a newer Evidence value appears after a pending change already exists, compare Current against the latest relevant value. Do not stack multiple pending changes for the same field.
5. If a previously kept Possibly Removed item is reliably found again, identify reappearance; the product layer may clear the mark, show a lightweight resolved notice, and record History / Diff without creating a new Review solely for reappearance.

POSSIBLY REMOVED RULES

1. Local Coverage Facts are machine facts, not a semantic removal conclusion.
2. Evaluate whether Coverage Facts are semantically sufficient for removal analysis.
3. If coverage is not sufficient, do not propose POSSIBLY_REMOVED.
4. Absence by itself is not semantic proof of removal.
5. Consider rename, restructuring, becoming a Component, moving to another Source, changed wording, or continuous identity through a newly discovered Assessment.
6. If these possibilities cannot be resolved reliably, return IDENTITY_UNCERTAIN or an unresolved removal issue.
7. If the user previously kept a Possibly Removed item and it remains absent after another successful and semantically sufficient check, do not create a repeated removal event solely because it remains absent.

EVIDENCE RULES

1. Every meaningful change judgment must be traceable to Evidence.
2. Preserve both current Evidence and new Evidence when they disagree.
3. Structured outputs from previous tasks may organize comparison, but critical judgments should rely on relevant original Evidence when available.
4. Do not invent Evidence.
5. For CHANGED, preserve Evidence supporting replacement.
6. For CONFLICT, preserve Evidence for both competing values.
7. For POSSIBLY_REMOVED, preserve relevant Coverage Facts and Evidence.

UNCERTAINTY RULES

Uncertainty must identify the specific unresolved question.
Do not hide uncertainty behind a confidence score.
Do not force a change category when Evidence does not support one reliably.

OUTPUT

Return structured JSON only.

The output should contain:
- change_results
- unresolved_issues

Each change result should identify:
- change_type: NO_MEANINGFUL_CHANGE / NEW / CHANGED / CONFLICT / POSSIBLY_REMOVED / IDENTITY_UNCERTAIN
- target_object
- affected_field_or_requirement when applicable
- current_value when applicable
- proposed_or_competing_value when applicable
- current_evidence
- new_evidence
- judgment_basis
- relevant_user_state
- relevant_history when needed
- relevant_coverage_facts when needed
- unresolved_issues when applicable

PROHIBITED BEHAVIORS

Do not:
- treat every content difference as a course-state change
- treat every different value as Changed
- choose a newer value based only on file timestamp
- use a fixed Source authority hierarchy
- infer Possibly Removed from technical failure
- infer Possibly Removed from partial or semantically insufficient coverage
- infer Possibly Removed merely because one new Source does not mention an item
- silently overwrite Current Course State
- silently override a user Edit
- silently reverse Keep Current
- create repeated pending changes for every intermediate value
- redo full Assessment identity resolution from scratch when Task B has established a reliable relationship
- casually reopen a reliable Task B identity result
- decide whether the system should notify the user
- decide whether a Review must be shown
- decide whether a change should be automatically applied
- output auto_apply, auto_notify, or next_task instructions
- output confidence scores

FINAL CHECK

Before returning the result, verify:
1. A raw content difference has not been mistaken for a meaningful course-state change.
2. Every CHANGED result has sufficient Evidence of replacement or revision.
3. Every CONFLICT preserves both sides rather than selecting one arbitrarily.
4. POSSIBLY_REMOVED is only used when Coverage Facts are semantically sufficient.
5. User-confirmed or user-edited state has not been silently overridden.
6. Existing pending changes have been consolidated as Current vs Latest rather than stacked.
7. Reliable Task B identity results have not been casually reopened.
8. Identity uncertainty has not been forced into NEW or POSSIBLY_REMOVED.
9. Every change judgment is traceable to Evidence.
10. No product action has been decided by the AI.
11. The output conforms to the required JSON structure.
```

---

# 13. Structured Output Contract

产品层只锁定语义与必要结构，不把最终 JSON Schema 全部写死。Technical Design 需要固化 required top-level fields、object IDs、evidence locator、enum、field value representation、unresolved issue、schema migration、validator、malformed / truncated response handling。

必须保证：Schema 不反过来改变产品语义；不为了容易写 Schema 丢失 competing values；不把 `UNCERTAIN` 压成 boolean；Evidence 与 user-facing value 分离；local validator 只检查 deterministic contract，不重新做 semantic judgment。

---

# 14. Technical Design Questions — Final Disposition

> 以下是开工前的 open-question 列表。它们的最终处置以
> `TECHNICAL_DESIGN_v0.2.0.md`、`DEEPSEEK_INVOCATION_STRATEGY_v0.2.0.md` 与
> `ENGINEERING_REPORT_v0.2.0.md` 为准；不得再把本节解读为 v0.2.0 未决。

1. 一个 Source 对应一次还是多次 physical API call；
2. Task B 深入补 original Evidence 的调用形态；
3. 是否在不破坏逻辑职责的前提下合并某些 B / C physical calls；
4. long Source mechanical chunk / overlap；
5. mixed PDF text + image strategy；
6. final JSON Schema；
7. malformed / truncated response retry；
8. DeepSeek output budget；
9. BYOK API Key 本地安全存储；
10. Privacy Authorization 与 API Usage Authorization 的交互 / persistence；
11. Opportunity Check throttle；
12. E4 / E5 是否在当前 Technical Design 顺手硬化。

这些问题不得被当成重新打开产品定义的理由。

Final disposition summary:

- Task A 按 Source / mechanical chunk 执行，保留 10k target / 14k hard limit / 800-char overlap 与
  multi-chunk consolidation；本版不引入 packing / concurrency。
- Task B / C 职责不变；physical expansion 只在现有 contract 中进行。
- malformed / truncation 使用 failure-specific recovery，不再使用 universal repair chain。
- output budget 使用 versioned capability + task/context-aware dynamic safety ceiling。
- BYOK key 仅本地保存，不进 Backup / telemetry / export。
- Opportunity Check 继续使用已实现的 throttle 与 live-tab / coverage guard。
- E4 / E5 已在 v0.2.0 storage / recovery 边界中硬化。
- mixed/image-only PDF 保留为已知 text-layer limitation，不在 v0.2.0 扩展 parser architecture。

---

# 15. Interaction & IA 已收口后的实现边界

Interaction & Information Architecture 已在 `Interaction_and_Information_Architecture_Spec_v0.2.0.md` 收口。Technical Design 必须按该 Spec 实现 Side Panel / Full-page 页面结构、Current Course State / Course Brief 信息层级、Initial Review、Change Review、Assessment / Component / Series 视觉层级、Semester Dashboard、Pending cues、Scan / background checking / freshness 表达、Navigation 与 Task Status 分离、Backup / Restore、Calendar Export 等 Interaction contract。

不要重新讨论：是否以 Assessment 为核心、是否做 broad Important Rules、Same / Different / Uncertain 定义、Changed / Conflict 定义、是否保留 Popup、是否采用 Local-first + BYOK、是否做 Todo / Planner / Reminder Center、AI A / B / C 职责，或已经在 Interaction Spec 中锁定的 Surface / Navigation / Review / Status 规则。

如 Technical Design 真的要求改变这些边界，标记 Product Conflict，返回产品侧，不自行改动。

---

# 16. Development / Testing / Gate 原则

## 16.1 Phase-level automation

每个开发 Phase 有自己的 typecheck / lint、unit、relevant integration、deterministic contract tests、相关 AI regression、state persistence / error-path checks。通过后自动继续，不要求逐 Phase 人工确认。

测试与验收采用 **script-first** 原则：

- 能通过 CLI、test runner、fixture、headless browser / extension automation、deterministic validator 或其他脚本稳定验证的内容，优先并尽量必须脚本化；
- 关键路径、回归、数据完整性、Error / Recovery、AI contract、Gate evidence collection 应尽量进入可重复执行的自动化脚本；
- 不因为“更像人工操作”而滥用 Computer Use；如果脚本或浏览器自动化可以可靠完成，就不使用 Computer Use；
- Computer Use / 人工操作只保留给脚本确实无法覆盖、且必须依赖真实 GUI / 视觉 Product Judgment 的少数场景；
- 最终 UI screenshot evidence 也应优先通过稳定的自动化浏览器路径生成；需要真实人工判断的视觉验收留在 Human / Product Gate。

目标是减少人工操作和重复点击，让相同测试可一键重跑、可留 Evidence、可用于 Regression。

## 16.2 Gate 数量按实际版本决定

Gate 不是固定模板。未来每个版本按 risk、vertical slice、failure rework cost、complexity 决定合理数量，不为了流程完整人为增加 Gate。

## 16.3 v0.2.0 两个 Human / Product Gates

**Gate 1 — Core Loop Gate**：Course discovery → Initial Scan → Task A / B → Initial Review → Current Course State → Source update → Task A / B / C → Change Review → Updated Current Course State。

**Gate 2 — Release Acceptance Gate**：覆盖 Semester Dashboard、Side Panel / Full-page、Opportunity Checking、Local-first / BYOK、Backup / Restore、Calendar、Product Mark、KR-07 / KR-08 / E3、AI Regression、Recovery、real-course E2E。

## 16.4 One-command Gate Acceptance

每个 Gate 应提供 one-command / one-click acceptance workflow：

```text
Build
→ Automated Tests
→ Integration / E2E
→ AI Evaluation / Regression
→ Data Integrity
→ Evidence Collection
→ Gate Acceptance Report
```

可自动修复确定性 Fail 并重新 Regression。人工只处理 Product-impacting Technical Conflict、无法自动解决的关键 Fail、Product Judgment 和最终 Gate Pass / Fail。

---

# 17. 下一阶段顺序

1. Technical Design
2. Implementation Plan
3. Development
4. Gate 1 — Core Loop
5. Continue Development
6. Gate 2 — Release Acceptance
7. Final UI Screenshot Backfill / README Product Walkthrough
8. Version Freeze

AI Design 与 Interaction & IA 如无真实产品冲突，不重新开启。

---

# 18. 交接一句话

> **v0.2.0 已经锁定产品模型、AI 语义与 Interaction & IA；下一阶段 Technical Design 的任务是把这些已锁定 contract 变成可实现、可测试、可恢复的技术方案，而不是重新设计产品。**
