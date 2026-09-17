# Syllab — Important Rules Change Manifest — v0.1.0

> 日期：2026-09-17  
> 用途：让 Codex 不需要逐文件 diff。只按这里列出的行级锚点应用修改。

## 0. 行号说明

当前 Codex workspace 已经包含后续开发和 D-014，而本包可读取的正式上传基线早于这些变化，因此**绝对数字行号已经不稳定**。

为了避免 Codex 花 token 重新比对全文，本 Manifest 使用更稳的“行级定位”：

> `文件名 → section → 原文行 / 唯一锚点 → 操作 → 新内容`

这比写一个已经可能偏移的 `L1234` 更安全。自动脚本会按这些唯一原文行直接修改；找不到时会 fail fast，不会猜。

---

# 1. `01_Syllab_PRD_v0.1.0.md`

## Change PRD-01

**位置**：`## 13.2 MVP 提取范围` → `### C. 重要规则`

**原文行**：

```text
- 其他明显影响学生行动的重要规则。
```

**替换为**：

```text
- 其他对成绩、计分资格、Assessment 有效性或有成绩要求的课程义务存在直接或较近影响的 course-level rule。
```

**紧跟该行新增**：

```text
MVP Important Rules 只收录违反后会直接影响成绩，或通过很短且明确的因果链影响 assessment validity、grading eligibility、marks，或有成绩要求的课程义务的 course-level rule。

如果与成绩的关系很远、需要推测，或必须经过独立纪律 / 政策流程才可能产生学业后果，则不进入 Important Rules。通用版权、材料传播、课堂拍照 / 录像 / 录音、隐私、校园行为和其他政策性 boilerplate 默认排除，除非来源明确把它与成绩、计分资格或 assessment validity 直接关联。
```

**不改**：本节已有 Word Limit / Group Size / Submission Format / Submission Channel / Late Penalty / Attendance Requirement 列表；D-014 已有 Assessment-specific Rule 归属规则保持不变。

## Change PRD-02

**位置**：`## 27.5 规则验收`

**原文行**：

```text
- 其他高影响规则。
```

**替换为**：

```text
- 其他对成绩、计分资格、Assessment 有效性或有成绩要求的课程义务存在直接或较近影响的 course-level rule。
```

**在 `不能：` 前新增**：

```text
Course-level Important Rule 的验收使用 Grade Impact Gate：如果违反规则不会明确影响 marks / grade / grading eligibility / assessment validity，或这种影响只能通过很远、推测性的纪律或政策链路成立，则不应提取为 Important Rule。

其中：

- course-wide submission channel / late penalty / 明确 attendance grading consequence 等应识别；
- 通用 copyright / redistribution / recording / privacy / conduct boilerplate 默认不应识别；
- 不能因为文本出现 must / required / prohibited / mandatory 就自动判定为 Important Rule；
- 不能自行推测没有写明的成绩后果。
```

---

# 2. `05_Product_Decision_Log_v0.1.0.md`

## Change DL-01

**位置**：文档头部更新时间

**原文行**：

```text
> **更新时间**：2026-09-16
```

**替换为**：

```text
> **更新时间**：2026-09-17
```

如果 workspace 已经是更晚日期，不回退日期。

## Change DL-02

**位置**：Current Decisions 末尾

**操作**：追加 `D-015`。**不要修改 D-014。**

**新增内容**：

```markdown
## D-015｜MVP Course-level Important Rules 使用 Grade Impact Gate

**状态**：已确认

### 观察

真实扫描会把两类都带有强规则语气的文本提成 Important Rule：一类是 course-wide submission / grading requirement，另一类是 copyright、材料传播、录音录像等政策性 boilerplate。若只使用“重要”或“影响学生行动”作为边界，Important Rules 会快速变成政策垃圾桶。

### 为什么重要

Important Rules 的价值是帮助学生完成课程和 Assessment，并避免直接影响成绩的错误。过宽会增加 Review 成本和 Course Brief 噪声；过窄又可能漏掉真正影响 marks、grading eligibility 或 submission validity 的要求。

### 产品决定

MVP Course-level Important Rules 使用 **Grade Impact Gate**。

只有当一条 course-level rule：

- 违反后会直接影响成绩；或
- 通过很短、很明确的因果链影响 assessment validity、grading eligibility、marks，或有成绩要求的课程义务；

才进入独立 Important Rules。

与成绩之间只有远距离、推测性关系，或必须经过独立纪律 / 政策流程才可能产生学业后果的规则，不进入 MVP Important Rules。

实例：

- `All written assignments must be submitted via Turnitin/NTULearn.` → Include；
- 通用 course-material copyright / redistribution / lecture recording prohibition → Exclude by default。

如果后者明确写有扣分、判零分、submission invalid 或 grading eligibility 后果，则按实际 grade impact 判断。

Assessment-specific Rule 继续按 D-014 归入对应 Assessment；D-014 不变。

执行层：

- AI Extraction Prompt 是主要语义过滤层；
- Prompt Evaluation 固定正反例做回归门禁；
- 本地 deterministic validation 只做 schema、evidence、scope / relation 等确定性校验，不新增广泛关键词黑名单或通用 policy classifier；
- Review 继续作为最终纠错层，但不能用“全部先进入 Review”替代前置过滤。

### 对后续阶段的影响

- 收紧 PRD Important Rules 的正式定义；
- Technical Design 明确语义过滤职责；
- Implementation Plan Phase 7 增加 prompt / evaluation 验收；
- 不改变 IA、Review flow、Course Brief section、Candidate kind、Provider / Model 或数据 schema。

**决定日期**：2026-09-17
```

---

# 3. `07_Technical_Design_v0.1.0.md`

## Change TD-01

**位置**：`### 8.3 输出结构与风险路由`

**原文行**：

```text
- Important Rule：PRD 允许的行动相关规则；
```

**替换为**：

```text
- Important Rule：仅限满足 PRD Grade Impact Gate 的 course-level rule；Assessment-specific Rule 继续关联到对应 Assessment；
```

## Change TD-02

**位置**：同一 `### 8.3`，在 `路由：` 段落前

**新增**：

```text
Important Rule 的语义边界主要由 AI Extraction Prompt 执行，并通过固定 Evaluation cases 回归验证。本地 response validation 继续负责 schema、evidenceRefs、Source 存在性和确定性 scope / relation 校验；MVP 不使用广泛关键词黑名单去推断 grade impact，也不新增通用 policy classifier，以避免误杀真实高影响规则。偶发 false positive 仍可在 Review 中 Ignore / Edit，但 Review 不是主要过滤层。
```

---

# 4. `08_Implementation_Plan_v0.1.0.md`

## Change IP-01

**位置**：`## 8. 阶段 7｜AI extraction` → `主要实现内容`

**原文锚点**：

```text
- Assessment、Important Date、Important Rule JSON Schema；
```

**紧跟该行新增**：

```text
- Important Rule Grade Impact Gate：Extraction Prompt 只提出满足 PRD / D-015 的 course-level Important Rule；Assessment-specific Rule 继续挂到 Assessment；通用 copyright / redistribution / recording / privacy / conduct boilerplate 默认排除；不推测远距离成绩后果；
- Important Rule Prompt Evaluation fixtures：固定 include / exclude 边界样本，作为后续 Prompt 改动的回归测试；
```

## Change IP-02

**位置**：同一 Phase 7 → `验收条件`，在 `**主要风险**` 前新增

```text
- Important Rule evaluation 至少覆盖：course-wide Turnitin / submission validity → include；course-wide late penalty → include；attendance 明确关联 marks / eligibility → include；只有 mandatory / expected 且无 grade consequence 的 attendance → exclude；copyright / redistribution / recording boilerplate → exclude；明确 zero-mark / grade penalty → include；
- 不因 must / required / prohibited / mandatory 等强词单独生成 Important Rule；
- 不用广泛 deterministic keyword blacklist 替代 Prompt 语义判断；本地 hard validation 只做已有结构、证据与关系门禁；
```

---

# 5. 明确不修改

下列文件本轮保持原样，Codex 不需要打开它们来做本次 delta：

```text
04_Spike_Report_v0.1.0.md
06_MVP_Interaction_IA_Spec_v0.1.0.md
09_Product_Review_Summary_v0.1.0.md
10_CODING_HANDOFF_README_v0.1.0.md
11_CODING_START_PROMPT_v0.1.0.md
```

也不修改：

- Candidate / Brief schema；
- Review flow；
- Course Brief IA；
- Provider / Model；
- Backend architecture；
- D-014。

---

# 6. Codex 最省 token 的执行方式

不要自己逐项 diff。

直接运行：

```bash
python 14_apply_product_alignment_delta_v0.1.0.py .
```

脚本会：

1. 只打开上述 4 个正式文件；
2. 只按本 Manifest 的唯一原文行 / section anchor 修改；
3. 已经存在的新内容会自动 skip；
4. 缺少必需 anchor 时直接报错，不自行猜；
5. 不碰其他文件。

脚本成功后继续当前 Coding phase。
