# Syllab — Rule Association Coding Handoff — v0.1.0

> **HISTORICAL INPUT · SUPERSEDED**
> 本文件保留 D-014 对齐后的 Phase 5–9 实现语境。D-014 仍是 v0.1.0 基线，但该 Coding handoff 已随 Gate D PASS 完成使命，不得作为当前执行入口。

> 产品版本：v0.1.0
> 状态：`RULE ASSOCIATION ALIGNMENT: PASS`
> 正式决定：D-014｜Assessment-specific Date / Rule Ownership
> Coding：继续当前 Phase 5–9 Milestone，不重启 Phase 1

## 1. 当前真实状态

真实 NTU Learn vertical slice 已工作到：

```text
Discovery
→ Fetch
→ Parse
→ Normalize
→ DeepSeek Extraction
→ Review
```

Prompt 与本地 deduplication 优化后，当前真实 Review 结果为 38 candidates：4 Assessments + Important Dates + Important Rules。

以下工作保持现状，不要为了本 delta 重做：

- Discovery；
- Fetch；
- Parse；
- Normalize；
- DeepSeek Extraction 基础链路；
- Review persistence；
- prompt v3；
- local Candidate deduplication。

没有 confirmed / edited / ignored / user-added facts 因本次对齐被覆盖。

## 2. 已确认产品决定

采用 Option A：Relational ownership, flat Review grouping。

### Ownership

- Assessment-specific Date / Rule 属于 parent Assessment；
- course-level Rule 才是独立 Important Rule。

### Review

Review 仍保持：

```text
Assessments
Important Dates
Important Rules
```

不做 nested Review。

明确关联的 child candidate 显示：

> `Applies to <Assessment>`

归属或 parent 关系不明确 → Needs Review，不得猜测。

### Confirmation

- Confirm child 只确认 child；
- 不确认 parent Assessment；
- 不确认 sibling facts；
- `Confirm all important rules` 只确认 eligible Detected Rule candidates，不确认 parent。

### Course Brief

- attached Date / Rule 归入 parent Assessment；
- attached Date 不在 Other Important Dates 重复；
- attached Rule 不在 Important Rules 重复；
- course-level Rules 才留在 Important Rules。

如果 child 已确认但 parent 尚未确认：

- 保存 child confirmation；
- 不自动创建 confirmed parent；
- parent 确认后再投影 child；
- parent 最终 Ignore / Reject 时，child 不得静默改成 course-level，必须重新 Review / reclassify 或保持不进入 Brief。

### Rule structure

优先复用自然字段，如：

- Format；
- Group / Individual。

其他 Assessment-specific Rule 放在 Requirements / Key Requirements。

不要为每种规则扩张出复杂专用字段系统。

## 3. Required implementation delta

只做以下必要改动。

### A. Candidate contract

为 Important Date / Rule 增加稳定关系：

```text
scope: course | assessment
appliesToAssessmentKey?: stable parent reference
```

字段名可以等价调整，但不能只把 parent 写进 free-form `proposedValue`。

### B. Extraction / validation

DeepSeek 输出和本地 schema validation 必须支持该 relationship。

- 明确 parent → Detected；
- ownership / parent 不明确 → Needs Review；
- 不得猜 parent。

不要因为 schema delta 重新调用 DeepSeek，除非现有真实 candidate 数据无法通过 deterministic migration / local remap 安全获得 relationship，且必须有明确技术理由。

### C. Candidate merger / dedup

匹配需要考虑：

```text
kind
+ semantic value
+ evidence/source identity
+ parent Assessment relationship
```

同一事实 parent 不同不能被盲目合并。

### D. Review UI

不改变 Review 主结构。

只增加 parent context，例如：

```text
Maximum 8 slides
Applies to CA1
```

Batch confirm 保持现有 category semantics。

### E. Brief persistence / projection

允许 child BriefItem（或等价持久结构）稳定关联 parent Assessment。

Renderer / selector 必须保证：

```text
assessment child
→ render under parent
→ exclude from top-level date/rule sections
```

### F. Scan again

保守匹配加入 parent relationship。

parent 变化、不明确或出现冲突时进入 Review / Resolve，不自动改已有 Brief。

## 4. Acceptance examples

期望结构：

```text
CA1
  Dates
    Slides deadline
    Role-play script deadline
    Batch 1 presentation
    Batch 2 presentation
    Peer evaluation deadline
  Requirements
    Group size 5–6
    Maximum 8 slides
    Maximum 7 role-play pages
    Participation requirement

CA2
  Date
    MCQ test date/time
  Requirements
    LockDown Browser
    Calculator

CA3
  Date
    Case study date/time
  Requirements
    Closed-book
    Submit via NTULearn within one hour

Final Examination
  Format / Requirement
    Restricted open-book

Important Rules
  General extension policy
  General attendance policy
  Course-wide GAI policy
```

`restricted open-book` 不应作为无关 course-level Rule 重复出现。

## 5. Required tests before continuing

至少覆盖：

1. Assessment-specific Rule 有稳定 parent relationship；
2. course-level Rule 无 parent；
3. relationship ambiguous → Needs Review；
4. Review 显示 `Applies to <Assessment>`；
5. Confirm child 不确认 parent；
6. `Confirm all important rules` 不确认 parent；
7. parent + child 都确认后，child 只在 parent 下展示一次；
8. child confirmed / parent unconfirmed 时不自动创建 parent；
9. parent ignored/rejected 后 child 不静默变 course-level；
10. Scan again same child + same parent 保守匹配；
11. same child + changed parent 不自动覆盖；
12. 现有 confirmed / edited / ignored / user-added 数据不被 migration 覆盖。

## 6. Coding / Gate discipline

阶段内测试继续做，但不要每完成一个 Phase 就停下来等待产品侧验证。

当前属于 Phase 5–9 Milestone：

```text
Phase 5–9
→ phase-level self-test / regression
→ continue automatically
→ stop at Milestone Gate
```

只有以下情况提前停止：

- Product-impacting Technical Conflict；
- D-014 无法在当前产品边界内实现；
- migration 会破坏已有 user-confirmed facts；
- 关键测试无法在当前范围内解决。

## 7. Handoff cleanup

开始前自动清理 stale handoff artifacts，但只删除能明确确认过时的交接文件。

保留当前 canonical：

- `00_PRODUCT_HANDOFF_README_v0.1.0.md`
- `10_CODING_HANDOFF_README_v0.1.0.md`
- `11_CODING_START_PROMPT_v0.1.0.md`
- `12_RULE_ASSOCIATION_HANDOFF_v0.1.0.md`
- 当前 `Syllab_Rule_Association_Handoff_v0.1.0.zip`（若 repo 中保留 ZIP）

可自动删除：

- 旧产品版本 handoff；
- 已被本包替代的旧 Coding / Rule Association handoff ZIP；
- `(1)` / `(2)` / `copy` / `old` / `backup` / `previous` 等明确重复 handoff。

绝对不要因此删除 PRD、Spike、Decision Log、IA、Technical Design、Implementation Plan、Product Review Summary、代码、测试或真实项目资产。

不确定是否 stale → 保留并列出。

## 8. Resume instruction

完成 cleanup 与必读文档检查后，直接实现 D-014 delta。

不要重新做产品 Brainstorming，不重做 Spike，不重跑已工作的 vertical slice，不重新设计 Review IA。

完成 D-014 的实现与回归测试后，继续当前 Phase 5–9 Milestone，到 Milestone Gate 再停下来汇报。
