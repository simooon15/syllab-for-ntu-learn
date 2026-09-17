# Syllab for NTU Learn — MVP 交互与信息架构规范 — v0.1.0

> **产品版本**：v0.1.0
> **当前阶段**：v0.1.0 实现后验证
> **状态**：`v0.1.0 IMPLEMENTED AND VALIDATED · BASELINE PRESERVED`
> **产品形态**：Chrome 扩展
> **目标平台**：NTU Learn（Blackboard）
> **上游产品事实源**：`01_Syllab_PRD_v0.1.0.md`
> **技术验证状态**：`PASS WITH KNOWN RISKS`
> **文档用途**：定义 MVP 的界面结构、导航关系、核心交互、状态、异常处理和完整用户流程，作为进入技术设计前的产品设计事实源。本文档不定义代码、API、数据库、模型、Prompt、Parser 或具体工程实现。

---

# 1. 交互原则

## 1.1 结果优先

用户打开 Syllab 的目标不是观察 AI 在做什么，而是尽快得到可使用的课程信息。

因此：

- 结果优先于过程；
- Course Brief 优先于来源证据；
- 扫描过程中只告诉用户系统正在做什么；
- 完整的扫描覆盖情况只在扫描结束后展示；
- 技术日志不进入普通用户界面。

---

## 1.2 不制造虚假的完整性

Syllab 不能把“系统没有展示”表达成“课程中不存在”。

如果发生：

- 部分扫描成功；
- 来源读取失败；
- 格式暂不支持；
- 权限被拒绝；
- 解析失败；
- 扫描被中断；

必须让用户知道。

同时，不使用无法证明的：

- 覆盖率百分比；
- “100% 完成”；
- “全部课程信息已找到”；
- 不可靠的剩余时间。

---

## 1.3 降低 Review 成本

普通候选：

> `Detected`

允许快速浏览，并按类别批量确认。

高风险候选：

> `Needs Review`

需要逐条处理。

MVP 不提供全局 `Confirm all`。

---

## 1.4 用户只处理高价值判断

系统负责：

- 扫描；
- 整理；
- 分类；
- 关联；
- 普通候选组织；
- 冲突和不确定信息提示。

用户主要负责：

- Confirm；
- Edit；
- Ignore；
- Resolve；
- Add；
- 冲突判断。

---

## 1.5 来源是证据，不是主内容

主界面展示当前可用结果。

来源、原始值、原文片段和冲突证据默认隐藏。

用户需要时，再通过：

- `View Source`
- `View Details`

查看。

---

## 1.6 Course Brief 是当前事实层

AI 提取结果只是候选。

正式进入 Course Brief 的信息包括：

- Confirmed；
- Edited + Confirmed；
- User-added + Confirmed。

如果一个主体已经确认，但某个字段仍有冲突或缺失，可以以：

> **已确认主体 + 未解决字段**

进入 Course Brief。

未解决字段必须明确标记，不能表现成已经确认的事实。

---

## 1.7 MVP 仍以单课程为核心

MVP 可以保存多门课程，但核心体验仍然是单课程。

Saved Courses 只负责：

- 课程导航；
- 显示当前整理状态。

它不是：

- 多课程 Dashboard；
- 跨课程 Deadline 聚合；
- Task Center；
- Reminder Center。

---

## 1.8 错误尽量落到具体来源

单个来源的问题不应让整门课程作废。

优先采用：

> 具体来源问题 → 扫描整体状态汇总

只有在无法形成可用扫描结果时，才进入整次扫描失败。

---

# 2. MVP 信息架构

MVP 只保留 4 个主要界面：

1. Saved Courses
2. Scan
3. Review
4. Course Brief

其中：

- **Saved Courses**：课程导航层；
- **Scan**：扫描任务流程；
- **Review**：候选确认任务流程；
- **Course Brief**：已扫描课程的长期主界面。

`Extension Entry` 不是独立页面，只负责判断当前上下文并路由。

以下内容也不是独立页面：

- 当前课程识别；
- 未扫描课程；
- 扫描进度；
- 扫描结果概览；
- 部分扫描；
- 整次扫描失败；
- 扫描中断；
- 权限请求；
- 来源证据；
- Edit；
- Add；
- Resolve；
- Calendar Export。

它们分别属于：

- 同一界面的不同状态；
- 临时交互。

---

# 3. 主要界面清单

## 3.1 Saved Courses

### 作用

用于：

- 当前不在可识别的 NTU Learn 课程页时进入；
- 主动切换到其他已保存课程；
- 查看每门课程当前整理状态。

### 不负责

不负责：

- 跨课程任务聚合；
- 最近 Deadline；
- Assessment 数量统计；
- 多课程 Calendar；
- 跨课程 Reminder。

---

## 3.2 Scan

### 作用

负责：

- 首次扫描；
- 扫描进度；
- 扫描中的权限请求；
- 扫描结果概览；
- 部分成功 / 失败 / 中断；
- 用户主动 `Scan again`。

扫描结果概览属于 Scan 界面，不是独立页面。

---

## 3.3 Review

### 作用

负责处理：

- 还没有进入 Course Brief 的普通候选；
- 整条信息仍然不确定的高风险候选。

Review 不负责处理已经进入 Course Brief 的未解决字段。

---

## 3.4 Course Brief

### 作用

Course Brief 是已扫描课程的默认主界面。

负责：

- 展示当前确认后的课程事实；
- 显示待 Review 状态；
- 显示部分扫描状态；
- Edit；
- Add；
- Resolve 未解决字段；
- 查看来源；
- Calendar Export；
- `Scan again`。

---

# 4. 状态清单

## 4.1 课程级状态

- 未扫描
- 已完成
- 有待 Review 内容
- 部分扫描
- 有待 Review 内容 + 部分扫描
- 空 Course Brief

---

## 4.2 扫描级状态

- 准备扫描
- 扫描中
- 等待权限
- 扫描完成
- 部分成功
- 扫描失败
- 扫描中断
- 未检测到结果

---

## 4.3 来源级状态

- 已处理
- 权限被拒绝
- 格式暂不支持
- 解析失败
- 无法访问
- 处理中断

“格式暂不支持”不作为普通 Error 文案处理。

---

## 4.4 条目级状态

- Detected
- Needs Review
- Confirmed
- Edited + Confirmed
- User-added + Confirmed
- Ignored

---

## 4.5 字段级状态

只在真实需要时使用：

- Confirmed
- Needs Review / Unresolved

MVP 不把所有字段都设计成复杂状态系统。

只有主体已确认，但个别字段存在冲突或缺失时，才使用字段级未解决状态。

---

# 5. 导航模型

MVP 不使用：

```text
Brief | Review | Scan | Calendar
```

这类多 Tab 导航。

采用：

> **层级导航 + Course Brief 作为课程主落点**

结构：

```text
Saved Courses
    ↓
Current Course
    │
    ├─ 未扫描 → Scan
    │             ↓
    │           Review
    │             ↓
    └────────→ Course Brief
                  │
                  ├─ Continue Review
                  ├─ Resolve Field
                  ├─ View Issues
                  ├─ Edit / Add
                  ├─ Export Calendar
                  └─ Scan Again
```

规则：

- Saved Courses 是课程切换层；
- Scan 和 Review 是任务流程；
- Course Brief 是已扫描课程的默认落点；
- Calendar Export 是 Course Brief 内的临时交互；
- 已扫描课程从 Saved Courses 进入时，先进入 Course Brief，不直接跳到 Review。

---

# 6. 入口流程

## 6.1 打开扩展

```text
Open Syllab
      ↓
识别当前页面
      ↓
┌──────────────────────┐
│ 是否为可识别课程页面 │
└──────────────────────┘
      ↓ 是                   ↓ 否
识别当前课程              Saved Courses
      ↓
┌────────────────┐
│ 课程是否已扫描 │
└────────────────┘
  ↓ 否         ↓ 是
Scan Ready   Course Brief
```

---

## 6.2 当前课程优先

如果用户当前就在可识别的 NTU Learn 课程页：

### 未扫描

进入：

> Scan Ready

### 已扫描

进入：

> Course Brief

---

## 6.3 当前没有课程上下文

如果用户当前不在可识别课程页：

进入：

> Saved Courses

---

# 7. 扫描流程

## 7.1 Scan Ready

首次进入未扫描课程时，不自动扫描。

用户先看到：

- 课程身份；
- 扫描范围的轻量说明；
- Review 机制提示；
- 可能出现额外文件访问权限的弱提示。

示意：

```text
MA6081
Fundamentals of Project Management

Syllab will check:
Course pages · Announcements · Assignments · Supported documents

You’ll review detected information before it is added to Course Brief.

[Scan this course]

Some course files may need additional access.
```

规则：

- 用户明确点击 `Scan this course` 后才开始；
- 不让用户手动选择扫描来源；
- 不提前请求附件权限；
- 不在这里展示 Known Risks；
- 不展示 parser、文件大小等技术信息。

---

## 7.2 扫描进度

采用：

> **轻量任务列表**

示意：

```text
Scanning MA6081

✓ Reading course pages
✓ Reading announcements
● Reading assignments
○ Processing documents
○ Extracting course information
```

建议控制在 4–5 个用户可理解的阶段。

### 不显示

不显示：

- 扫描百分比；
- ETA；
- `8 / 17 files` 作为完成比例；
- 长技术日志；
- 全量文件列表。

任务列表只用于表达：

> 系统当前在做哪一类工作。

它不承诺严格的技术执行顺序。

---

## 7.3 扫描过程中关闭扩展

关闭扩展：

> **不等于取消扫描。**

只有用户明确执行：

> `Cancel scan`

才表示主动取消。

如果技术条件允许继续：

- 用户再次打开时继续显示扫描状态。

如果技术条件导致执行无法继续：

- 下次进入显示“扫描中断”；
- 提供 Continue / Retry。

具体后台执行方式留给技术设计。

---

# 8. 权限流程

## 8.1 触发时机

只有扫描实际发现需要访问新的 Blackboard / Xythos 文件域时，才请求对应权限。

不在扫描前一次性请求宽权限。

---

## 8.2 用户体验

权限请求发生在扫描中，但尽量放在自然停顿点。

不要因为单个来源立即打断所有当前可继续的扫描工作。

示意：

```text
Some course files need additional access.

[Allow access]
[Continue without them]
```

主文案使用用户能理解的语言，例如：

> Access course files

而不是直接展示技术权限术语。

具体域名可以作为次级信息。

---

## 8.3 用户允许

用户允许后：

- 继续处理对应来源；
- 扫描继续。

---

## 8.4 用户拒绝或跳过

用户拒绝或选择继续：

- 其他来源继续；
- 同一次扫描不反复请求；
- 最终可以以“部分成功”结束；
- 扫描结果概览明确显示有来源未访问；
- Course Brief 保留部分扫描提示。

---

# 9. 扫描结果概览与覆盖情况

扫描结果概览仍属于 Scan 界面。

采用：

> **结果优先 + 轻量覆盖说明**

---

## 9.1 正常完成

示意：

```text
Scan complete

15 items found
10 detected
5 need review

21 sources processed

[Review results]
```

如果没有候选需要 Review：

```text
[Open Course Brief]
```

---

## 9.2 部分成功

示意：

```text
Scan completed with some issues

15 items found
10 detected
5 need review

21 sources processed
2 sources need attention

[Review results]

View issues
```

部分成功不阻断 Review。

---

## 9.3 覆盖展示规则

允许展示：

- 已处理来源数；
- 有问题的来源数；
- 提取结果数；
- Needs Review 数。

不展示：

- 92% coverage；
- 100% complete；
- 未经证明的“全部来源已找到”。

原因：

> 系统只能确认已发现来源的处理情况，不能把遍历范围包装成绝对完整。

---

## 9.4 View Issues

具体失败、Unsupported、Permission 等问题只在：

> `View issues`

里展开。

不把问题列表直接铺满扫描结果概览。

---

# 10. Review 流程

Review 是 MVP 最重要的核心交互。

采用：

> **一个 Review 界面，两个明确处理区**

```text
Review

1. Needs Review
2. Detected
```

这是推荐顺序，不是强制步骤。

用户可以：

- 暂时跳过；
- 去看另一类；
- 中途退出；
- 下次继续。

---

## 10.1 Needs Review

### 用途

用于整条候选仍然存在：

- 冲突；
- 低确定性；
- 重要信息缺失；
- 是否成立本身不确定。

### 展示原则

直接展示：

> 用户做判断需要的最小证据。

例如：

```text
Final Project deadline

18 Oct — Course Outline
20 Oct — Assignment Page

This information conflicts.

[Use 18 Oct]
[Use 20 Oct]
[Edit]
[Ignore]

Skip for now
View source
```

不要求用户先打开来源，才知道冲突是什么。

### 操作

- Confirm / Choose
- Edit
- Ignore
- Skip for now
- View Source

### Skip for now

Skip：

- 不改变候选状态；
- 不算已处理；
- 下次仍是 Needs Review；
- 只是让用户暂时继续处理其他内容。

### 不显示 AI 置信度

不显示：

- AI confidence 62%
- Risk score 0.73

这类容易制造虚假精确感的数字。

---

## 10.2 Detected

Detected 按以下类别分组：

1. Assessments
2. Important Dates
3. Important Rules

Assessment-specific Date / Rule 仍留在原类别中 Review，不改成嵌套 Review；如果归属明确，条目显示轻量上下文，例如：

> `Applies to CA1`

如果 `assessment-specific vs course-wide` 归属不明确，该候选进入 Needs Review，不得猜测。

每个类别支持：

> **分类级 Confirm all**

示意：

```text
Assessments · 3

...

[Confirm all 3]
```

单条仍支持：

- Confirm
- Edit
- Ignore
- View Source

### 不提供全局 Confirm all

MVP 不提供：

> `Confirm all detected`

这样可以降低用户一次性误确认所有类别的风险。

### 分类级批量确认规则

分类级 `Confirm all`：

- 只作用于当前仍然是 Detected 的候选；
- 已 Edit / Ignore / Confirm 的内容不被覆盖；
- 不弹二次确认；
- 可以提供短暂 Undo。

---

## 10.3 Review 进度

Review 自动保存每条候选的处理状态。

中途退出后：

- 已 Confirm 保留；
- 已 Edit 保留；
- 已 Ignore 保留；
- Skip 仍待处理；
- 未处理 Detected 保留。

再次进入时：

> 从剩余内容继续。

不恢复精确的 UI 滚动位置。

进度用数量表达：

```text
7 of 10 reviewed
```

不用百分比。

---

## 10.4 Review 完成

最后一条当前候选处理完成后：

> **直接进入 Course Brief。**

不做：

- 独立完成页；
- Celebration 页面；
- 额外确认步骤。

如果 Course Brief 里仍有未解决字段：

- 直接在对应字段继续显示 Needs Review 标记。

---

# 11. Course Brief

## 11.1 角色

Course Brief 是：

> 当前课程在 Syllab 中的事实主界面。

用户以后重新打开一门已扫描课程，默认进入 Course Brief。

---

## 11.2 主信息结构

固定为：

```text
Assessments

Other Important Dates

Important Rules
```

---

## 11.3 Assessments

Assessment 自己携带相关确认字段，例如：

- Title；
- Weight；
- Due Date；
- Format；
- Group / Individual；
- Key Requirement / Requirements。

已确认且明确属于该 Assessment 的 Date / Rule 在 Course Brief 中归入该 Assessment。具体字段仍以 PRD 的提取范围为准，不要求为每一种 Rule 新建专用字段。

---

## 11.4 Other Important Dates

只显示：

> 不属于某个 Assessment 主体的独立重要日期。

如果一个 Deadline 已经绑定在 Assessment 上：

- 数据上仍然是 Date；
- Course Brief 主视图不重复展示；
- Calendar Export 仍可以使用。

---

## 11.5 Important Rules

只用于不属于某个 Assessment 的课程级重要规则，例如：

- General extension / late policy；
- General attendance policy；
- Course-wide submission channel policy；
- Course-wide GAI / integrity policy；
- 其他已确认、对全课行动有明确影响的规则。

如果同类 Rule 明确只适用于某个 Assessment，则归入该 Assessment，不在 Important Rules 中重复展示。

---

## 11.6 待 Review 提示

如果仍有候选没有处理：

```text
3 items need review

[Continue review]
```

只有存在待 Review 内容时显示。

---

## 11.7 部分扫描提示

如果当前课程最近一次有效扫描为部分成功：

```text
Partial scan · 2 sources need attention

[View issues]
```

待 Review 和部分扫描分开显示。

不合并为模糊的：

> Needs attention

因为它们代表不同问题和不同动作。

---

## 11.8 正常状态

如果：

- 没有待 Review；
- 没有部分扫描；

顶部保持干净。

不需要展示：

> Everything looks good

之类占位状态。

---

## 11.9 已确认主体 + 未解决字段

这是本阶段新增的重要产品细化。

如果：

- 条目主体已经可以确认；
- 只有个别字段存在冲突或缺失；

则主体可以进入 Course Brief。

例如：

```text
Final Presentation
20%

Due: ⚠ Needs review
```

这里表示：

- Final Presentation：Confirmed；
- Weight：Confirmed；
- Due：Unresolved。

### 边界

如果连：

> 这是不是一个 Assessment / Date / Rule

本身都不确定：

- 整条继续留在 Review；
- 不进入 Course Brief。

---

## 11.10 在 Course Brief 内 Resolve

用户点击：

```text
Due: ⚠ Needs review
```

在 Course Brief 内直接处理。

示意：

```text
Due date needs review

18 Oct
20 Oct

[Use 18 Oct]
[Use 20 Oct]
[Edit]
```

处理后：

```text
Due: 20 Oct
```

不强制跳回整个 Review。

---

## 11.11 Edit

采用：

> 单条 Edit。

不做整个 Course Brief 的编辑模式。

用户保存后：

> 直接成为 Edited + Confirmed。

不要求再次 Confirm。

---

## 11.12 Add

每个分类内允许对应 Add：

- Add Assessment；
- Add Important Date；
- Add Important Rule。

用户保存后：

> User-added + Confirmed。

---

# 12. 来源证据与详情

## 12.1 默认隐藏

Course Brief 主界面默认不展示：

- 来源；
- 原始值；
- 原文片段；
- 冲突历史；
- 修改历史。

---

## 12.2 数据保留

原始数据不删除。

如果用户：

- Edit；
- Resolve；
- Confirm；

原始来源和原始提取结果仍然保留。

---

## 12.3 查看详情

用户主动查看时，才展示：

- 当前值；
- 原始来源；
- 必要的原始值；
- 冲突证据；
- 必要的用户修改信息。

MVP 不做完整版本历史系统。

原则：

> 数据保留，主界面隐藏。

---

# 13. Calendar Export

## 13.1 入口

Calendar Export 从：

> Course Brief

统一进入。

不在每条日期旁边放单独的：

> Add to calendar

---

## 13.2 可导出日期

只有：

> **Confirmed Date**

可以进入 Calendar Export。

以下内容不能进入：

- Needs Review Date；
- Unresolved Date；
- 未确认冲突日期。

---

## 13.3 选择方式

默认选中全部可导出的 Confirmed Dates。

用户只取消不想导出的项目。

示意：

```text
Export Calendar

☑ Group Project
   18 Oct · Assessment · 30%

☑ Final Presentation
   20 Oct · Assessment

☑ Course Registration Deadline
   25 Aug · Important Date

[Export .ics]
```

---

## 13.4 每条事件显示内容

每条事件显示：

- Event Name；
- Confirmed Date；
- 必要的轻量类型信息；
- Assessment 可以带 Weight 等少量上下文。

不显示：

- Source；
- AI confidence；
- 冲突历史；
- Review 状态。

---

## 13.5 不在导出页编辑

Calendar Export 只负责：

> 导出已确认事实。

如果用户发现日期不对：

> 回 Course Brief Edit / Resolve。

---

# 14. Saved Courses

## 14.1 角色

Saved Courses 只负责：

- 导航；
- 课程当前处理状态。

---

## 14.2 课程卡片结构

每张卡片只包含：

```text
Course Code
Course Name

Primary Status
Secondary Issue（需要时）
```

例如：

```text
MA6081
Fundamentals of Project Management

Completed
```

或：

```text
MA6094
Project Management Systems

3 items to review
```

或：

```text
MA6102
Operations Management

Partial scan
2 sources need attention
```

如果同时有待 Review 和部分扫描：

```text
3 items to review
Partial scan · 2 sources need attention
```

两者都显示。

---

## 14.3 不展示

MVP Saved Courses 不展示：

- Assessment 数量；
- Deadline 数量；
- Next Deadline；
- Calendar 状态；
- Source 总数；
- Scan 百分比；
- 跨课程任务。

---

## 14.4 点击行为

### 未扫描课程

点击：

> Scan Ready

### 已扫描课程

点击：

> Course Brief

即使课程还有：

> `3 items to review`

也先进入 Course Brief，再由：

> `Continue review`

进入 Review。

---

# 15. 异常、部分成功与不支持状态

## 15.1 两层异常模型

采用：

> **扫描整体状态 + 具体来源原因**

---

## 15.2 扫描整体状态

### Complete

扫描正常完成。

### Partial

扫描正常走完，但部分已发现来源存在：

- 没有权限；
- 格式暂不支持；
- 解析失败；
- 访问失败。

仍然可以：

> Review → Course Brief

### Failed

没有形成可用、可信任的扫描结果。

不进入正常 Review。

### Interrupted

扫描本身没有正常走完。

Interrupted 不等于 Partial。

---

## 15.3 来源级问题

可能包括：

- Permission Denied
- Unsupported Format
- Parsing Failed
- Could Not Access Source
- Interrupted Processing

---

## 15.4 Issue Details 的操作

只有用户当前存在真实恢复路径时，才显示操作。

### Permission Denied

```text
[Allow access]
```

### 临时访问 / 加载失败

```text
[Retry]
```

### Parsing Failed

可以提供：

```text
[Retry]
```

但不承诺一定成功。

### Unsupported Format

不提供 Retry。

说明：

> Currently not supported by Syllab.

### 来源不可用

不提供无意义 Retry。

可以在后续主动 `Scan again` 时重新尝试。

---

## 15.5 部分成功不阻断 Review

部分扫描后：

```text
[Review results]
View issues
```

用户可以直接使用已经成功获得的结果。

---

## 15.6 Retry / 恢复

如果问题后续恢复成功：

- 已 Confirm 的事实保留；
- 已完成 Review 不无故重置；
- 新发现或重新产生的不确定内容再进入 Review。

具体合并和去重规则留给技术设计。

---

## 15.7 整次扫描失败

整次扫描失败留在 Scan 界面。

示意：

```text
Scan couldn't be completed

Syllab couldn't build a reliable result from this course.

[Try again]

View details
```

如果存在明确可恢复问题：

```text
[Allow access and retry]
```

整次扫描失败：

- 不进入正常 Review；
- 不删除已有旧 Course Brief；
- 不把失败后的少量结果包装成完整扫描结果。

---

## 15.8 扫描中断

如果扫描没有正常走完：

```text
Scan interrupted

Your scan didn't finish.

[Continue / Try again]
```

产品层只定义恢复入口。

具体：

- 后台继续；
- checkpoint；
- 局部重跑；
- 全量重跑；

留给技术设计。

---

## 15.9 未检测到结果

如果扫描正常完成，但没有提取到候选：

```text
Scan complete

No items detected.
18 sources processed.

[Open Course Brief]
```

这不是 Failed。

文案不能写成：

> This course has no assessments.

进入 Course Brief 后：

```text
No confirmed information yet.

[Add information]
```

---

# 16. Scan Again

## 16.1 入口

所有已扫描课程都允许用户主动：

> `Scan again`

但它是次级操作。

不要让它抢过 Course Brief 主内容。

---

## 16.2 Scan again 不是清空重来

Scan again：

- 不清空现有 Course Brief；
- 不无故覆盖 Confirmed；
- 不无故覆盖 Edited；
- 不无故覆盖 User-added。

新的、冲突的或重新发现的不确定内容：

> 再进入 Review / Resolve。

---

## 16.3 MVP 不做自动 Change Detection

MVP 不做：

- 自动后台监控；
- New / Changed / Possibly Removed 状态；
- Reminder；
- 自动增量更新；
- Change Timeline。

---

## 16.4 MVP 的 Ignore 规则

MVP 不做 Ignore memory。

如果用户：

```text
第一次 Scan
→ Candidate A
→ Ignore
```

之后主动：

```text
Scan again
→ Candidate A 再次被检测
```

则：

> Candidate A 可以再次进入 Review。

MVP 不做：

- 跨扫描 Ignore 抑制；
- 同一候选匹配；
- 实质变化判断；
- “之前 Ignore 过”提示。

---

# 17. 关键交互规则

1. 打开扩展时，当前课程上下文优先。
2. Entry 是路由逻辑，不是页面。
3. 未扫描课程必须由用户明确点击后才开始 Scan。
4. Scan 不允许用户手动选择来源范围。
5. Scan Progress 不显示百分比和 ETA。
6. Scan Progress 使用轻量任务列表。
7. Coverage 统一在 Scan 完成后展示。
8. Permission 按实际发现的文件域动态请求。
9. Permission Denied 不让整个 Scan 立即作废。
10. Partial Scan 可以直接进入 Review。
11. Full Scan Failed 不进入正常 Review。
12. Interrupted 不等于 Partial。
13. Unsupported 不提供无意义 Retry。
14. Review 使用一个界面，分 Needs Review / Detected 两个处理区。
15. Needs Review 优先，但不是强制顺序。
16. Detected 按 Assessments / Important Dates / Important Rules 分组。
17. Detected 只支持分类级 Batch Confirm。
18. 不提供全局 `Confirm all detected`。
19. Needs Review 支持 `Skip for now`。
20. Review 自动保存条目处理状态。
21. Review 完成后直接进入 Course Brief。
22. Course Brief 是已扫描课程的默认主界面。
23. Assessment 自带已确认且明确关联的 Date / Rule；这些事实不在 Other Important Dates / Important Rules 重复展示。
24. Confirmed Item 可以带 Unresolved Field。
25. Unresolved Field 可以在 Course Brief 内直接 Resolve。
26. 未解决日期不能进入 Calendar Export。
27. Course Brief 的 Source 默认隐藏，但原始数据保留。
28. Edit / Add 保存后直接成为 Confirmed。
29. Calendar Export 只负责导出事实，不负责修改事实。
30. Saved Courses 只负责导航和处理状态。
31. Scan again 不清空已有 Course Brief。
32. MVP 不做 Change Detection。
33. MVP 不做 Ignore memory。
34. 关闭扩展不等于主动取消扫描。
35. 已有 Course Brief 不因新一次 Scan Failed / Interrupted 被清空。
36. Review 保持按 Assessments / Important Dates / Important Rules 分类；Assessment-specific Date / Rule 只增加 `Applies to <Assessment>` 上下文，不改成 nested Review。
37. Assessment-specific vs course-wide 归属不明确时进入 Needs Review，不得猜测。
38. Confirm attached child fact 只确认该 Date / Rule，不自动确认 parent Assessment 或其其他 child facts；分类级 Confirm all 也不确认 parent Assessment。
39. 已确认 child fact 只有在 parent Assessment 已进入 Course Brief 后才投影到其下；如果 parent 未确认，不得凭 child confirmation 自动创建已确认 Assessment。

---

# 18. 本阶段新增或细化的产品决策

以下内容是在详细交互设计阶段确认，并需要与 PRD 保持一致的产品规则。

## 18.1 四个核心界面

MVP 的主要界面固定为：

- Saved Courses；
- Scan；
- Review；
- Course Brief。

Entry 只负责路由。

---

## 18.2 Course Brief 是已扫描课程的默认落点

已扫描课程不直接进入 Review。

即使存在待 Review 内容：

> 先进入 Course Brief，再通过 `Continue review` 进入 Review。

---

## 18.3 Scan Overview 属于 Scan

扫描结果概览不是新页面。

它是 Scan 的完成状态。

---

## 18.4 已确认主体允许存在未解决字段

如果主体已经确定，而个别字段存在冲突或缺失：

- 主体可以进入 Course Brief；
- 未解决字段必须明确标记；
- 未解决日期不能进入 Calendar Export。

---

## 18.5 Source 默认隐藏

Source 和原始数据保留，但不在 Course Brief 主界面常驻展示。

---

## 18.6 MVP 支持用户主动 Scan again

MVP 支持：

> 用户主动重新扫描课程。

但不支持：

- 自动 Change Detection；
- 自动后台更新；
- 增量状态体系；
- New / Changed / Removed。

---

## 18.7 Ignore 不跨 Scan 记忆

MVP 中 Ignore 只作用于当前候选处理。

重新 Scan 后，同一内容可以再次出现。

---

# 19. 待技术设计确认的问题

以下问题已经暴露，但本阶段不回答具体实现。

## 19.1 扩展关闭后的 Scan 生命周期

需要技术设计确认：

- Popup 关闭后扫描能否继续；
- 是否需要后台任务；
- 是否需要 checkpoint；
- Interrupted 后如何恢复。

产品要求：

> 关闭扩展不等于 Cancel。

---

## 19.2 Scan Again 的数据合并

需要技术设计确认：

- 如何识别已有条目；
- 如何避免无故覆盖 Confirmed / Edited / User-added；
- 新候选如何与旧数据合并；
- 重复候选如何处理。

产品要求：

> Scan again 不清空已有 Course Brief。

---

## 19.3 Retry 后的结果合并

需要技术设计确认：

- Retry 单个来源后如何补入结果；
- 如何保留既有 Review 进度；
- 如何避免重复候选。

产品要求：

> Retry 不应无故让用户重新 Review 已处理内容。

---

## 19.4 字段级 Unresolved 的最小数据结构

需要技术设计确认：

- 如何记录 Item-level 状态；
- 如何记录少量 Field-level unresolved；
- 如何保证 Calendar 只读取 Confirmed Date。

产品要求：

> 不要把整个 MVP 扩展成复杂字段状态系统。

---

## 19.5 动态附件权限的恢复机制

需要技术设计确认：

- 精确 host permission 的请求方式；
- 用户后续允许权限后如何恢复来源处理；
- 同一 Scan 内如何避免重复请求。

产品方向保持：

> 优先动态请求实际发现的 Blackboard / Xythos 精确 host permission。

---

## 19.6 大文件和格式风险

需要结合 Spike 已知风险继续设计工程边界：

- PPTX / DOCX 真实端到端验证；
- legacy PPT / DOC；
- large file handling；
- attachment host compatibility；
- traversal completeness。

这些属于技术风险和设计约束，不重新定义产品方向。

---

# 20. 产品设计对齐检查

| 检查项 | 结果 |
|---|---|
| 覆盖完整 MVP 闭环 | ✅ |
| 与 PRD 核心目标一致 | ✅ |
| 未重新扩大产品方向 | ✅ |
| 保持单课程核心 | ✅ |
| Saved Courses 未变成 Dashboard | ✅ |
| Review 成本足够低 | ✅ |
| Needs Review 有清楚判断路径 | ✅ |
| Course Brief 仍是事实层 | ✅ |
| 字段级冲突不会隐藏已确认主体 | ✅ |
| Source 没有淹没结果 | ✅ |
| Scan Coverage 不制造虚假完整性 | ✅ |
| Permission 有继续路径 | ✅ |
| Partial 不阻断已有价值 | ✅ |
| Full Scan Failed 有恢复路径 | ✅ |
| Interrupted 与 Partial 已区分 | ✅ |
| Unsupported 不提供无意义 Retry | ✅ |
| 0 items 不等于课程不存在信息 | ✅ |
| Calendar 只导出 Confirmed Date | ✅ |
| Scan again 不清空用户事实 | ✅ |
| 未加入 Reminder / Chat / 自动 Change Detection | ✅ |

结论：

> **MVP Interaction / IA 已完成产品设计对齐，可以进入 Product Handoff。**

下一阶段：

```text
Technical Design
→ Implementation Plan
→ Formal MVP Coding
```

---

# 21. 本阶段最终结构摘要

```text
Open Extension
      ↓
Router
├─ No Current Course → Saved Courses
│
└─ Current Course
   ├─ Not Scanned → Scan Ready
   │                  ↓
   │                Scan
   │                  ↓
   │             Scan Overview
   │                  ↓
   │                Review
   │                  ↓
   └──────────────→ Course Brief
                        │
                        ├─ Continue Review
                        ├─ Resolve Field
                        ├─ Edit / Add
                        ├─ View Source
                        ├─ View Issues
                        ├─ Calendar Export
                        └─ Scan Again
```

MVP 的主体验可以压缩成一句话：

> **在当前课程中扫描信息 → 低成本确认 → 形成可信的 Course Brief → 按需导出日期；任何未完成、失败或不确定状态都明确可见，但不阻断已经获得的价值。**

---

# 22. Post-implementation validation note（non-normative）

Gate D 真实使用确认了 v0.1.0 闭环，也暴露了下一版需要重新评审的产品问题：

- 四个 surface 的顶部表达是状态轨道，无法承担跨 surface 导航。
- Active Scan 优先入口保护了可恢复工作，但会增加返回旧 Course Brief 的摩擦。
- 首次 Scan 的阶段点击与近义动作过多，且操作后果不够清楚。
- Course Brief 的事实呈现、Assessment 归组、日期聚合和归属表达不足以支持舒适阅读。
- Review 暴露过多 Assessment 别名和身份清理工作，用户承担了本应由系统预处理的责任。

这些是 post-v0.1.0 评审输入，不修改本文档的 v0.1.0 规范性行为。证据、候选方向与待决问题见 `../docs/product-design-review-input-post-v0.1.0.md`。
