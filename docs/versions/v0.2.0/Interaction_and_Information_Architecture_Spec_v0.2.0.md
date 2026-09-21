# Syllab for NTU Learn Interaction & Information Architecture Spec v0.2.0

**产品版本：** v0.2.0  
**文档状态：** Final Accepted Interaction & Information Architecture  
**阶段：** Engineering Freeze / Final Acceptance  
**语言规范：** 说明性内容使用中文；产品对象、状态、模块名与正式 UI copy 保留 English。

---

# 1. 文档职责与事实源

本 Spec 属于 Product Design，但独立于 PRD 保存。

三份正式产品设计事实源的职责如下：

| 文档                                                      | 负责内容                                                                                                  |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `PRD_v0.2.0.md`                                           | 产品定位、范围、产品模型、产品行为、Product / User Flow、Acceptance Criteria                              |
| `PRODUCT_HANDOFF_v0.2.0.md`                               | AI Behavior、Task A / B / C、Context、Evidence、Prompt baseline、Evaluation 与 AI implementation contract |
| `Interaction_and_Information_Architecture_Spec_v0.2.0.md` | Screen、Navigation、Information hierarchy、Interaction、UI state、Error / Recovery、Surface behavior      |

配套：

- 本 Spec **直接按 Screen Family / 页面类别组织主章节**。Semester、Course、Initial Scan、Initial Review、Change Review、Rebuild、Calendar、Settings / Data 各自成章；每章开头列出该类 Screen / State，后面立即展开对应页面的布局、信息层级、交互、状态、返回路径与截图回填位置。不存在独立 Screen Inventory，也不再用另一套主题章节重复描述同一页面。
- README 是产品展示和用户说明，不是产品事实源。

如果本 Spec 与 PRD 的产品规则发生冲突，以 PRD 为准并标记 Product Conflict；不得为了 UI 方便改变产品模型。

当前检查结果：

> **Product Conflict: None**

本阶段没有重新定义 Assessment、Course-wide Constraint、Same / Different / Uncertain、New / Changed / Conflict / Possibly Removed、Task A / B / C、Local / AI / User 边界、Local-first + BYOK 等已锁定语义。

---

# 2. 全局 Interaction 原则与产品壳层

v0.2.0 的 Interaction 目标不是把内部 workflow 全部展示给用户，而是让用户始终清楚四件事：

1. **我现在在哪。**
2. **当前 Course State 是什么。**
3. **有没有事情需要我决定。**
4. **系统现在是否正在工作，或是否需要我处理问题。**

因此必须分开四层：

```text
Navigation
= Semester / Course / Settings

Current State
= Current Course State / Course Brief

User Decision
= Initial Review / Change Review

System Status
= Working / Waiting / Failed / Saved(recoverability) / Freshness
```

Review 不是导航。
Task Status 不是导航。
Evidence 不是主体内容。
Calendar 不是第二个事实模型。

## 2.1 Surface model

### 2.1.1 Side Panel

Side Panel 是贴着当前 NTU Learn 使用的工作区，但不只提供摘要。

它包含：

- 完整 Course Brief；
- Initial Scan；
- Initial Review；
- Change Review；
- Course Task Status；
- 当前 Semester 的轻量 Course List。

Side Panel 的 Semester view 只用于快速切 Course，不复制 Full-page Dashboard 的 Assessment preview。

### 2.1.2 Full-page Extension Page

Full-page 是完整 Semester / Course workspace。

它包含：

- Current Semester Dashboard；
- Historical Semester Dashboard；
- 完整 Course Brief；
- Settings；
- Backup / Restore；
- 更完整的课程浏览与管理。

### 2.1.3 两个 Surface 的关系

```text
Same product model
Same Current Course State
Same Review decisions
Same status semantics
Different information density
```

Side Panel 不是简化数据模型。
Full-page 也不是第二份 Course Brief。

## 2.2 Toolbar entry

Toolbar icon 只作为 Syllab 入口，不打开 Popup。

```mermaid
flowchart TB
    T["Toolbar · Syllab Product Mark"] --> C{"Current Tab 有可识别的<br/>NTU Learn Course Context?"}
    C -- Yes --> SP["Open Side Panel<br/>Current Course View"]
    C -- No --> FP["Open Full-page<br/>Current Semester Dashboard"]
```

规则：

- 有明确 Current Course Context → Side Panel；
- 没有明确 Course Context → Full-page Current Semester Dashboard；
- Toolbar 不要求用户先选择 Side Panel / Full-page；
- Toolbar 不打开旧 Popup。

---

# 3. Semester & Navigation Screens

本章就是 Semester / Navigation 类页面的完整设计章节。页面清单、交互规则与后续截图回填都在这里维护，不再去另一章查页面分类。

| ID       | Screen / State                  | Surface    | 作用                                            | 最终截图 |
| -------- | ------------------------------- | ---------- | ----------------------------------------------- | -------- |
| `SEM-01` | Current Semester Dashboard      | Full-page  | 完整 Semester 总览；展示 Course preview 与状态  | 必须     |
| `SEM-02` | Current Semester Course List    | Side Panel | 轻量 Course list；只用于快速切 Course           | 必须     |
| `SEM-03` | Semester Switcher               | Both       | 在 Current / Historical Semester 间切换         | 重要状态 |
| `SEM-04` | Historical Semester Dashboard   | Full-page  | 浏览历史 Semester 与 Historical Course          | 必须     |
| `SEM-05` | Historical Semester Course List | Side Panel | 历史 Semester 的轻量 Course list                | 必须     |
| `SEM-06` | Empty Semester                  | Both       | 当前 / 历史 Semester 无可显示 Course 时的空状态 | 必须     |
| `SEM-07` | Not Established Course Prompt   | Both       | 点击未建立 Course 后，引导 `Scan course`        | 必须     |

## 3.0 Semester-level navigation

Side Panel 与 Full-page 使用同一套 Semester → Course 导航心智模型：

```text
Semester View
    ↓ select Course
Course View
    ↑
    ‹
```

- Full-page：Semester View 是完整 Semester Dashboard；
- Side Panel：Semester View 是轻量 Course List；
- 点击 Established Course → 进入对应 Course View；
- 点击 Not Established Course → 进入轻量 Scan Prompt，不先进入空 Course page；
- Course View 左上角无文字 chevron `‹` 返回各自的 Semester View。

Semester 名称本身也是 switcher：

```text
AY2026/27 · Semester 1
```

点击后展开 Current / Historical Semester：

```text
AY2026/27 · Semester 1   Current
AY2025/26 · Semester 2
AY2025/26 · Semester 1
...
```

不建立常驻的 `Current Semester / Historical Semester` 两个一级导航。

## 3.1 Full-page Current Semester Dashboard

### Purpose

让用户在一个页面快速看懂当前 Semester 有哪些 Curriculum Courses、哪些已经建立、每门 Course 的主要 Assessment 结构、哪些 Course 需要注意。

### Layout

```text
Syllab

AY2026/27 · Semester 1              Semester Status Area

[Course card]
[Course card]
[Course card]
...

Settings
```

### Established Course card

展示轻量 Course Brief preview：

```text
MA6081                              2 changes to review
Fundamentals of Project Management

Assignments
Individual Assignment · 30% · 18 Oct

Projects
Group Project · 40% · 12 Nov

Exams
Final Exam · 30%

+ 2 more assessments
```

规则：

- 使用和 Course Brief 一致的 Assessment Type 分组；
- 只显示核心字段，优先 Name / Weight / Date；
- 不显示长 Requirements；
- 不展开完整 Component / Series detail；
- 不展开 Evidence；
- 卡片允许有限自适应高度，但有 preview 上限；
- 点击卡片主体 → Course Brief；
- 点击 Pending Review status → 对应 Review。

### Not Established Course

Dashboard 不显示：

```text
Not Established
Not set up
```

它只通过视觉表达“尚未被 Syllab 建立 / 未接触”。

点击后不先进入空 Course page，而是出现轻量提示：

```text
This course hasn’t been set up yet.

[ Scan course ]
```

Auto-discovery 不等于 Auto-scan。

### Dashboard 不做的内容

- 不做跨 Course Upcoming Deadline list；
- 不做 Todo；
- 不做 Priority Ranking；
- 不做全局 Review Inbox；
- 不把 History / Diff 做成 Dashboard 主体。

## 3.2 Side Panel Semester Course List

只显示 Course，主要用于切换：

```text
AY2026/27 · Semester 1

MA6081
Fundamentals of Project Management

MA6082
...

Open full dashboard
```

不显示 Course Brief preview。

逻辑与 Full-page 对齐：

- Established → 进入 Side Panel Course Brief；
- Not Established → 轻量 Scan prompt；
- Pending Review / Needs Attention 可显示 compact status；
- Semester 名称可切换历史 Semester。

## 3.3 Historical Semester

Historical Semester 保留和 Current Semester 相同的基本浏览结构，但：

- 默认不继续 Opportunity Checking；
- 不主动提供 `Check for updates`；
- 历史 Course Brief 仍可正常阅读；
- Field / Requirement Evidence 仍可查看；
- 不删除历史用户 edit、decision、History / Diff。

## 3.4 Empty Semester

Current Semester 尚未发现 Curriculum Course：

```text
No courses found yet.
```

不增加 setup wizard。

Historical Semester 如果为空，也只显示轻量空状态，不提供 Scan。

## 3.5 Not Established Course Prompt

Not Established Course 与相邻 Course 使用相同的卡片形态与交替色节奏，不再使用虚线或另一种弱化容器。
卡片底部显示一行轻量说明，告知用户该 Course 尚未建立。这是开工后 Product Owner
确认的最终规则，覆盖本节早期“只通过视觉表达、不显示文字”的 baseline；历史变化保留在
`DIRECTION_ADJUSTMENTS_v0.2.0.md` §2.20 与 `DECISION_LOG_v0.2.0.md`。

点击卡片后，不先进入空 Course page，而出现轻量提示：

```text
This course hasn’t been set up yet.

[ Scan course ]
```

用户明确点击 `Scan course` 后才进入 Initial Course Setup / Scan。

Auto-discovery 不等于 Auto-scan。

## 3.6 Semester Status Area

位于 Semester Dashboard 右上角。

正常无事时为空。

可显示：

```text
Checking courses…
1 course needs attention
API key needs attention
Permission required
```

规则：

- 只放 Semester-wide activity、global configuration problem、跨 Course 聚合 attention；
- 不把所有 Course-specific detail 堆在右上角；
- 点击聚合 attention 后再看到具体 Course 和处理入口；
- Pending Review 不做全局 Review Inbox，仍回到对应 Course context。

## 3.7 Side Panel 无法识别 Current Course

Side Panel 无法识别 Current Course 时，直接落到当前 Semester Course List，而不是显示 `No current course` 死页。

规则：直接落到当前 Semester Course List，不显示 `No current course` 死页。

---

# 4. Course State / Course Brief Screens

本章覆盖 Current Course State / Course Brief 相关的所有完整页面与重要状态。Side Panel 与 Full-page 使用同一内容模型，只调整布局密度。

| ID       | Screen / State       | Surface    | 作用                                                                   | 最终截图 |
| -------- | -------------------- | ---------- | ---------------------------------------------------------------------- | -------- |
| `CRS-01` | Course Brief         | Full-page  | 完整 Current Course State                                              | 必须     |
| `CRS-02` | Course Brief         | Side Panel | 同一完整 Current Course State 的窄布局                                 | 必须     |
| `CRS-03` | Assessment Detail    | Both       | 查看单个 Assessment 的完整 Fields / Requirements / Components / Series | 必须     |
| `CRS-04` | Assessment Edit      | Both       | 用户可读的原位编辑                                                     | 必须     |
| `CRS-05` | Evidence Reveal      | Both       | Field / Requirement 的 fact ↔ evidence 原位切换                        | 重要状态 |
| `CRS-06` | No Assessments Found | Both       | Scan 成功但没有 Assessment 时的正常空状态                              | 必须     |

Course Brief 内部继续按以下层级表达，不把它们拆成平级页面：

```text
Course Brief
├─ Assessment groups
│  ├─ Assessment
│  │  ├─ Fields
│  │  ├─ Requirements
│  │  ├─ Components（需要时）
│  │  └─ Assessment Series（需要时）
│  └─ ...
└─ Course-wide Constraints
```

## 4.0 Entry / Return

Course View 可以从：

- Full-page Semester Dashboard；
- Side Panel Semester Course List；
- Toolbar 在明确 Current Course Context 下直接打开 Side Panel；

进入。

进入 Course 后，左上角使用无文字 chevron `‹`：

- Side Panel → 返回 Semester Course List；
- Full-page → 返回 Semester Dashboard。

有 Pending Review / Checking / Needs attention 时，也不改变这一主导航结构。

## 4.1 Course header

Side Panel 与 Full-page 都使用：

```text
‹

MA6081                              Course Status Area
Fundamentals of Project Management
```

不在 Course header 常驻 Semester 名称。

## 4.2 Course Brief 是默认主体

有 Pending Review 时仍先展示 Current Course State。

Review 不自动抢占第一屏。

用户通过 Course Status Area 进入 Review。

## 4.3 Assessment grouping

Assessment 先做轻量 UI 分组，再组内稳定排序。

推荐固定顺序：

1. Assignments
2. Projects
3. Quizzes & Tests
4. Exams
5. Other

组内按 Assessment Name 稳定排序。

这只是 View grouping，不产生新的产品对象，也不使用 AI Importance Ranking。

## 4.4 Assessment presentation

普通 Assessment：

```text
Group Project
40% · Due 18 Oct · Group of 4–5

Submit a written report and presentation.
```

规则：

- Assessment name 是主标题；
- 常用短字段可以并排；
- 长 Requirement 自然换行；
- Assessment 默认展开；
- 很长的 Requirement 可 `Show more`；
- 不展示 Raw JSON。

## 4.5 Component

Component 必须视觉上属于父 Assessment：

```text
Group Project

Written Report
25% · Due 18 Oct

Presentation
15% · 25 Oct
```

通过缩进、较弱标题、内部结构表达 parent-child relationship。

Component 有自己的 Date / Weight 也不自动提升为顶层 Assessment。

## 4.6 Assessment Series

先展示 Series 整体：

```text
Quizzes
20% · 6 quizzes · Best 4 count

Quiz 1     12 Sep
Quiz 2     26 Sep
Quiz 3     10 Oct
```

规则：

- Series 是顶层用户对象；
- Instance 视觉层级更轻；
- Instance 很多时可以默认折叠一部分；
- Requirement 挂在真正所属层级。

## 4.7 Course-wide Constraint

放在 Assessment sections 之后。

不参与 Assessment Type grouping。

它保持轻量，不能成为 `Important Rules` 杂项桶。

## 4.8 Current State marks

### Edited / Changed

尽量挂到具体 fact：

```text
Deadline
18 Oct   Changed
```

而不是把整个 Assessment 标成 Changed。

### Possibly Removed

可以挂到 object 层：

```text
Group Project
Possibly removed
```

不把整条内容变淡，也不当作 error。

用户 Keep 后仍属于 Current Course State。

### Uncertainty

UI 不显示笼统：

```text
Uncertain
```

而应显示具体 unresolved question，例如：

```text
Date is unclear
Applies to this assessment?
Relationship unclear
```

Evidence 默认完全退居后台。

不提供显式：

```text
View source
View evidence
>
```

具体 Field / Requirement 本身就是 Evidence trigger。

## 4.9 Fact ↔ Evidence toggle

默认：

```text
Deadline
18 Oct
```

点击 `18 Oct`：

1. 文字有很轻的 fade feedback；
2. 原位切换到 Evidence；
3. 再点返回 fact。

```text
Course Guide · p.6
“Submission is due on 18 October…”
```

多个 Evidence 时在同一 Evidence state 中展示多条来源。

规则：

- 不用 Modal；
- 不新增 Source page；
- Evidence 不改变 Current State；
- Requirement 使用同一逻辑；
- Conflict 中每个 competing value 可以分别点击自己的 Evidence。

## 4.10 Assessment Detail

正常 Course Brief 中不为每张 Assessment 常驻一排操作按钮。

点击 Assessment 进入 detail / action state，再显示 `Edit` 等操作。

Evidence 仍通过点击具体 field / requirement 触发，不与 detail action 冲突。

## 4.11 Edit

- Course Brief：在当前 Assessment detail 中进入编辑态；
- Review：当前 Assessment 原位进入编辑态；
- 用户编辑结构化字段，不输入 JSON。

## 4.12 Manual Add Assessment

Manual Add 是 Course-level 能力，不属于某一条 Assessment 的纠错操作。

入口收在 Course `More`：

```text
More
├─ Add assessment
├─ Check for updates
├─ Export calendar
└─ Rebuild course
```

Manual Add 打开独立的 Assessment creation view。

完成后进入同一个 Current Course State，不长期显示 `User-added`。

## 4.13 Exclude

Exclude 只出现在 Review 中，语义是“错误识别”。

点击后使用轻量 Undo feedback：

```text
Assessment excluded.   Undo
```

Side Panel、Full-page Course View、Full-page Course card 使用同一套 status semantics。

## 4.14 Placement

- Course View：Course header 右侧；
- Full-page Dashboard：Course card header 右侧；
- Side Panel Semester List：必要时使用 compact status。

## 4.15 Copy

Pending Review：

```text
Side Panel: Review · 2
Full-page: 2 changes to review
```

其他可用：

```text
Checking…
Needs attention
API key required
Permission required
```

## 4.16 Priority

同一时刻不堆多个状态。

```text
Needs user action
> Pending Review
> Checking
> transient Freshness
```

## 4.17 Freshness

正常进入 Course 时可以短暂显示：

```text
Checked 2h ago
```

随后收起。

正常 freshness 可以在 Course `More` 中再次查看。

长期 / 重复无法成功检查时，才升级为持续状态：

```text
Needs attention
```

点击后：

```text
Course information may be out of date
Last successful check: 8 Sep
Try again
```

不把单次 failure 变成 stale warning。

## 4.18 No Assessments Found

Scan 成功但未形成 Assessment：

```text
No assessments found
```

这不是 Error。

允许 Manual Add Assessment。

如果只形成 Course-wide Constraint，也允许建立 Course State。

这不是 Error。允许 `Manual Add Assessment`。如果只形成 Course-wide Constraint，也允许建立 Course State。

---

# 5. Initial Course Setup / Scan Screens

本章覆盖 Not Established Course 从 Scan Prompt 到扫描完成 / Waiting / Failed 的全部页面。

| ID       | Screen / State            | Surface | 作用                                     | 最终截图 |
| -------- | ------------------------- | ------- | ---------------------------------------- | -------- |
| `ISC-01` | Scan Prompt               | Both    | 未建立 Course 的首次 Scan 入口           | 必须     |
| `ISC-02` | Scan Working              | Both    | 显示当前真实用户阶段，不显示百分比       | 必须     |
| `ISC-03` | Scan Waiting — API Key    | Both    | 说明 API Key 缺失 / 失效并引导处理       | 必须     |
| `ISC-04` | Scan Waiting — Permission | Both    | 说明具体 Permission / Authorization 缺失 | 必须     |
| `ISC-05` | Scan Failed               | Both    | 不可继续时提供 Retry / Details           | 必须     |
| `ISC-06` | Scan Error Details        | Both    | 展示具体原因与 stable error code         | 重要状态 |

`ISC-02` 的阶段固定映射为：

1. `Finding course content…`
2. `Reading course materials…`
3. `Understanding course information…`
4. `Organizing assessments…`

## 5.1 Not Established → Scan

```mermaid
flowchart TB
    A["Not Established Course"] --> B["Lightweight Scan Prompt"]
    B --> C["Scan course"]
    C --> D["Finding course content…"]
    D --> E["Reading course materials…"]
    E --> F["Understanding course information…"]
    F --> G["Organizing assessments…"]
    G --> H["Initial Review"]
```

## 5.2 Working stages

正式 UI 阶段：

1. `Finding course content…`
2. `Reading course materials…`
3. `Understanding course information…`
4. `Organizing assessments…`

不显示百分比。

不显示内部 technical stage。

省略号使用轻量循环动画表达系统仍在工作。

## 5.3 Closing / returning

- 关闭 Side Panel ≠ Cancel；
- Task 可以继续；
- 重新打开显示真实当前阶段；
- 不显示虚假的 `Resume scan`；
- 已有 Course 的 Rebuild / Check 不得封锁现有 Course Brief。

## 5.4 Scan completion

如果用户主动启动 Scan 并仍在当前界面：

> Scan 完成且存在待确认 Assessment → 直接进入 Initial Review。

如果 Scan 完成时用户已经离开：

> 下次进入 Course 时通过 Pending Review status 进入，不强制自动跳 Review。

## 5.5 Recoverable / Failed

临时可恢复 failure 先自动 Retry，不立即制造大 Error。

真正无法继续时：

```text
Scan couldn’t be completed.

[ Try again ]
View details
```

Error code 只在 `View details` 中出现。

具体 code taxonomy 留给 Technical Design。

## 5.6 Waiting

`Waiting` 是内部 task state，不作为用户文案。

用户必须看到具体原因：

```text
DeepSeek API key required
Add your API key to continue.

[ Open Settings ]
```

或：

```text
Permission required
Allow access to continue.

[ Grant permission ]
```

完成后恢复原 Scan context。

## 5.7 `NO_RELEVANT_INFORMATION`

Task A 的 Source-level `NO_RELEVANT_INFORMATION` 不直接暴露为用户 warning。

## 5.8 `PARTIALLY_UNDERSTOOD`

不显示内部 enum。

已可靠理解的信息继续使用；具体无法可靠理解的部分以 specific unresolved question 表达。

---

# 6. Initial Review Screens

本章覆盖 Initial Review 及其结构纠错、编辑和首次提示。

| ID       | Screen / State              | Surface | 作用                                    | 最终截图 |
| -------- | --------------------------- | ------- | --------------------------------------- | -------- |
| `IRV-01` | Initial Review — Assessment | Both    | 一次聚焦一个完整 Assessment             | 必须     |
| `IRV-02` | Initial Review — Edit       | Both    | 当前 Assessment 原位编辑                | 必须     |
| `IRV-03` | Same assessment as…         | Both    | 用户表达 Merge / identity correction    | 必须     |
| `IRV-04` | Split                       | Both    | 将一个错误组合拆成两个或更多 Assessment | 必须     |
| `IRV-05` | First-use Contextual Hint   | Both    | 首次使用操作时的短提示                  | 重要状态 |
| `IRV-06` | Exclude Undo Feedback       | Both    | Exclude 后的轻量 Undo                   | 可选     |

## 6.1 Review unit

一次聚焦一个完整 Assessment，不做 Candidate wall，也不先做 Assessment overview wall。

顶部只放轻量进度：

```text
‹ MA6081                         2 of 5
```

允许前后切换。

## 6.2 Information hierarchy

```text
Assessment Name
Type

Key Fields
Weight · Deadline · Group Size · Submission

Requirements

Components / Series（需要时）
```

Not Mentioned 的字段不显示。

Source 明确写 TBD / TBC 时，可以显示 Explicitly Unknown 的用户表达。

## 6.3 Actions

```text
[ Confirm ]
Edit
Exclude
Review later
More…
    ├─ Same assessment as…
    └─ Split
```

`Confirm` 是主操作。

`Same assessment as… / Split` 默认隐藏，避免按钮堆满界面。

## 6.4 Same assessment as…

它是用户对 Merge 的理解方式：

> “这条其实和之前 / 已存在的某个 Assessment 是同一条。”

点击后出现选择框，选择目标 Assessment。

内部 Review Decision 仍可记录 Merge 语义。

## 6.5 Split

针对当前一个 item：

> “这里其实混了两个或更多独立 Assessment。”

用户进入轻量结构编辑，再返回当前 Review context。

## 6.6 Review later

- 弱操作；
- 点击后进入下一项；
- 当前 item 继续留在 Pending Review。

## 6.7 Confirm

- Confirm 后立即进入 Current Course State；
- 不等待全部 Initial Review 完成；
- 自动进入下一条 pending item；
- 最后一条处理完后直接回 Course Brief；
- 可短暂显示 `Review complete`，不建立完成页。

## 6.8 First-use contextual onboarding

操作第一次使用时提供 1–2 句就地提示。

示例：

```text
Split
Use this when this item actually contains two or more separate assessments.
```

规则：

- 不集中做 onboarding tutorial；
- 不遮挡主体；
- 用到再教；
- 看过一次后默认不重复出现。

---

# 7. Change Review Screens

本章覆盖 Change Review 的全部用户决策页面；`New Assessment Review` 复用 Initial Review pattern，不建立第二套 UI。

| ID       | Screen / State            | Surface | 作用                                   | 最终截图      |
| -------- | ------------------------- | ------- | -------------------------------------- | ------------- |
| `CRV-01` | Changed Field Review      | Both    | Current → Latest；只处理实际变化字段   | 必须          |
| `CRV-02` | New Assessment Review     | Both    | 复用 Initial Review pattern            | 复用 `IRV-01` |
| `CRV-03` | Conflict Review           | Both    | Current + competing values；由用户解决 | 必须          |
| `CRV-04` | Possibly Removed Review   | Both    | Keep / Remove                          | 必须          |
| `CRV-05` | Identity Uncertain Review | Both    | Same assessment / Different assessment | 必须          |
| `CRV-06` | Review Complete Feedback  | Both    | 短暂完成反馈后回 Course Brief          | 可选          |

Change Review 是独立决策页面，不作为 Course Brief 常驻 section，也不作为一级导航。

## 7.1 Entry

用户通过 Course Status Area：

- Full-page：`2 changes to review`
- Side Panel：`Review · 2`

进入。

## 7.2 Changed

只显示变化字段，不重新展示整个 Assessment：

```text
Group Project

Deadline
Current
10 Oct

Latest
18 Oct

[ Accept change ]
Keep current
```

Keep Current 不等于永久忽略真实 discrepancy。

## 7.3 New Assessment

完全复用 Initial Review UI 和操作，不建立第二套 Review pattern。

## 7.4 Conflict

```text
Deadline

Current
10 Oct

Other values
18 Oct
20 Oct
```

用户可以：

- 选择一个现有 competing value；
- `Edit` 输入正确值。

规则：

- 不推荐某个 Source；
- 不使用 authority ranking；
- 每个值都可点击 Evidence。

## 7.5 Possibly Removed

```text
Group Project
Possibly removed

[ Keep ]
Remove
```

Keep 后：

- Assessment 继续属于 Current Course State；
- Course Brief 正常显示，不变淡；
- 保留 `Possibly removed` mark；
- 不重复制造同一个 removal Review；
- 其中满足条件的 confirmed date 继续参与 Calendar Export。

Evidence 后续重新出现：

- 自动清除 mark；
- 不重新 Review；
- 给轻量 resolved feedback；
- 记录 History / Diff。

## 7.6 Identity Uncertain

直接让用户判断：

```text
Is this the same assessment?

Group Project
↕
Final Group Project

[ Same assessment ]
Different assessment
```

- Same → 继续使用同一 canonical identity；
- Different → 按 New Assessment 继续处理。

## 7.7 Current vs Latest

Pending change 始终是 Current vs Latest：

```text
Current 10 Oct
pending 15 Oct
latest 18 Oct
```

UI 只显示：

```text
10 Oct → 18 Oct
```

15 Oct 进入 History / Diff。

---

# 8. Rebuild Screens

本章覆盖 Rebuild 的入口、Working、Preview 与 Failure。Rebuild 不做 Diff。

| ID       | Screen / State         | Surface | 作用                                         | 最终截图    |
| -------- | ---------------------- | ------- | -------------------------------------------- | ----------- |
| `RBL-01` | Rebuild Confirmation   | Both    | 说明重新扫描，但旧 Current State 暂不改变    | 必须        |
| `RBL-02` | Rebuild Working        | Both    | 复用 Initial Scan 四阶段                     | 复用 / 必须 |
| `RBL-03` | Rebuilt Course Preview | Both    | 展示新的完整 rebuilt Course Brief；不做 Diff | 必须        |
| `RBL-04` | Rebuild Failed         | Both    | 复用 Scan Failed；旧 State 不变              | 复用 / 必须 |

## 8.1 Entry

Course `More → Rebuild course`。

Rebuild 是低频恢复能力。

开始前解释：

> Rebuild 会重新扫描并整理这门 Course；在新结果被用户采用前，现有 Current Course State 保持不变。

## 8.2 Working

完全复用 Initial Scan 四阶段 UI：

```text
Finding course content…
Reading course materials…
Understanding course information…
Organizing assessments…
```

不设计独立 Rebuild progress language。

## 8.3 Result

结果展示一份新的、完整 rebuilt Course Brief。

这是 Preview，不是 Diff。

不做：

- Current vs Proposed 对比；
- field-by-field Diff；
- 逐项 Accept / Reject。

只提供整体决策：

```text
[ Use rebuilt course ]
Keep current course
```

Use rebuilt course 后才替换 Current Course State。

Keep current course 后返回旧 Course Brief。

## 8.4 Failure

Rebuild failure 完全不影响 Current Course State。

复用 Scan Failed UI。

---

# 9. Calendar Export Screens

本章覆盖 Calendar Export 的 Preview 与反馈页面。

| ID       | Screen / State          | Surface | 作用                                   | 最终截图 |
| -------- | ----------------------- | ------- | -------------------------------------- | -------- |
| `CAL-01` | Calendar Export Preview | Both    | 预览可导出的 Current State date events | 必须     |
| `CAL-02` | Calendar Export Success | Both    | 轻量成功反馈                           | 可选     |

入口：

```text
Course More → Export calendar
```

不在 Course header 常驻 Calendar button。

## 9.1 Preview

```text
Export calendar

4 events

Individual Assignment   18 Oct
Group Project           12 Nov
Final Exam               3 Dec

[ Export ]
```

规则：

- 不建立完整 Calendar page；
- 不重新 Scan；
- 不重新调用 AI；
- 读取 Current Course State；
- unresolved Conflict 不导出；
- event-equivalent facts 合并成一个 event；
- Component 如果确实代表独立现实 event，可以导出独立 event；
- Keep 的 Possibly Removed confirmed date 继续导出；
- 导出成功只给轻量 feedback；
- filename 使用用户可识别 Course Code / Name。

---

# 10. Settings / Data / Backup & Restore Screens

本章把 Settings 及其 Data / Backup / Restore 作为同一 Page Family 管理。

| ID       | Screen / State          | Surface            | 作用                                        | 最终截图   |
| -------- | ----------------------- | ------------------ | ------------------------------------------- | ---------- |
| `SET-01` | Settings                | Full-page          | AI / Authorization / Data / About 总入口    | 必须       |
| `SET-02` | AI — API Key            | Full-page          | 配置 DeepSeek API Key                       | 必须       |
| `SET-03` | API Key Validation      | Full-page          | Valid / Invalid / Missing 状态              | 重要状态   |
| `SET-04` | Authorization           | Full-page          | Privacy 与 API Usage Authorization 分开管理 | 必须       |
| `SET-05` | About                   | Full-page          | Product Mark + Product Version              | 可合并截图 |
| `BKP-01` | Data — Backup / Restore | Full-page Settings | Backup / Restore 入口                       | 必须       |
| `BKP-02` | Restore File Summary    | Full-page          | Backup summary + Full Replace warning       | 必须       |
| `BKP-03` | Restore Working         | Full-page          | Reading / Validating / Restoring            | 必须       |
| `BKP-04` | Restore Failed          | Full-page          | 失败时保留原 State                          | 必须       |
| `BKP-05` | Backup Export Success   | Full-page          | 轻量成功反馈                                | 可选       |

## 10.0 Entry / Return

`Settings` 是 Full-page 的统一配置入口，不拆出 `Data / AI / Authorization` 多个一级导航。

如果用户是因为当前 Task 缺少 API Key / Authorization 被带入 Settings，配置完成后必须恢复进入 Settings 前的原界面和原任务上下文。

Return Context 至少应保留：

```text
Surface
+ Semester
+ Course
+ Current View
+ Relevant Task / Review State
```

如果用户只是从 Semester Dashboard 主动进入 Settings，完成后返回 Semester Dashboard。

## 10.1 Structure

```text
Settings
├─ AI
│  └─ DeepSeek API Key
├─ Authorization
│  ├─ Privacy Authorization
│  └─ API Usage Authorization
├─ Data
│  ├─ Backup
│  └─ Restore
└─ About
```

## 10.2 AI / API Key

- 只配置 DeepSeek API Key；
- 不提供 model selector；
- 默认 masked；
- 可 Reveal / Hide；
- Update 后立即做轻量 validation；
- Valid / Invalid / Missing 必须可理解。

例如：

```text
This API key isn’t working.
```

而不是只显示 `Failed`。

## 10.3 Authorization

Privacy Authorization 与 API Usage Authorization 分开。

每个授权用 1–2 句说明“允许什么”。

任务中缺少授权时，直接定位到对应 section；完成后回原任务。

## 10.4 About

保持轻量：

```text
[Product Mark]
Syllab
v0.2.0
```

## 10.5 Backup

Settings → Data → Backup。

主操作：

```text
Export backup
```

不让用户选择备份哪些 Course / object。

简要说明包含完整 Syllab state，并明确：

```text
Your DeepSeek API key is not included.
```

成功后：

```text
Backup exported
```

不建立成功页。

## 10.6 Restore

流程：

```mermaid
flowchart TB
    A["Restore from backup"] --> B["Choose file"]
    B --> C["Validate backup"]
    C --> D["Show backup summary + Full Replace warning"]
    D --> E{"User confirms?"}
    E -- No --> X["Cancel"]
    E -- Yes --> F["Restore"]
    F --> G["Current Semester Dashboard"]
```

Backup summary 可以展示：

```text
AY2025/26 · Semester 2
AY2026/27 · Semester 1

8 courses
27 assessments
```

## 10.7 Full Replace

v0.2.0：

> **Restore = Full Replace**

不支持 Merge。

Merge Restore 只作为 future option。

恢复前必须明确告诉用户会覆盖当前本地 Syllab state。

## 10.8 Restore Working

不显示百分比。

可使用：

```text
Reading backup…
Validating backup…
Restoring course data…
```

Interaction 要求：

- 用户不能看到半恢复 state；
- Validation / Restore 失败时原 state 保持完整；
- 成功后直接进入恢复后的 Current Semester Dashboard；
- API Key 不恢复。

具体原子写入策略属于 Technical Design。

---

# 11. Shared Status / Feedback / Recovery Patterns

以下不是另一套页面，而是跨多个 Screen Family 复用的统一 Interaction Pattern。每个 Pattern 的实际截图仍回填到它出现的页面章节。

以下不是独立页面，但必须作为统一 Interaction Pattern 设计、实现和验收，不能散落成不同逻辑：

| ID       | Pattern                      | 主要位置                              | 规则                                                                             |
| -------- | ---------------------------- | ------------------------------------- | -------------------------------------------------------------------------------- |
| `SYS-01` | Course Status Area           | Course header / Dashboard Course card | Pending Review / Checking / Needs attention / transient Freshness 共用同一状态位 |
| `SYS-02` | Semester Status Area         | Semester header 右上角                | Semester-wide checking / global attention                                        |
| `SYS-03` | Attention Detail             | Course / Semester                     | 展开原因、last successful check、Try again                                       |
| `SYS-04` | Evidence Toggle              | Field / Requirement                   | 点击 fact → 轻微 fade → Evidence；再点恢复                                       |
| `SYS-05` | Contextual Hint              | First-use action                      | 1–2 句，只在首次使用时出现                                                       |
| `SYS-06` | Toast / Lightweight Feedback | Export / Exclude / Review completion  | 短暂反馈，不建立完成页                                                           |
| `SYS-07` | Error Details                | Failed task                           | 用户友好原因优先；error code 藏在 details                                        |

Course Status Area 同时存在多个状态时，不堆叠显示。优先级：

```text
Needs user action
> Pending Review
> Checking
> transient Freshness
```

## 11.1 Product interaction meaning

`Checking…` 不等于“AI 正在工作”。

Opportunity Checking 第一层是低成本 Local Source Change Check。

```mermaid
flowchart TB
    A["Opportunity / Manual Check"] --> B["Fetch / deterministic Source check"]
    B --> C{"Source machine-different?"}
    C -- No --> Q["Quiet end<br/>No AI"]
    C -- Yes --> A1["Task A / B / C as required"]
    A1 --> M{"Meaningful Course State change?"}
    M -- No --> Q2["Quiet end<br/>Update freshness"]
    M -- Yes --> R["Pending Review cue"]
```

具体 fingerprint / hash / machine comparison 方式属于 Technical Design。

## 11.2 User experience

- 不要求用户进入 monitoring mode；
- 不每次打开页面都全量处理所有 Course；
- throttle 由 Technical Design 决定；
- 正常 background check 不弹窗；
- Source 未变 → 不调用 AI；
- Source 变但无 meaningful change → 静默结束；
- 有 meaningful change → status 更新，不自动跳 Review；
- Manual `Check for updates` 与 Opportunity Checking 共用同一 Change Detection 链路。

## 11.3 Saved / Persistence / Resume

`Saved` 主要是 persistence / recoverability state，不作为常驻视觉状态。

规则：

- Scan / Review 自动保存真实进度；
- 不提供 `Save progress`；
- 关闭 Side Panel 不丢失任务；
- 已 Confirm 的内容已经属于 Current Course State；
- 未解决 Review 继续 Pending；
- 重新进入时恢复真实页面与 task context；
- 只有在确实需要解释“已保存，可稍后继续”时，才短暂显示 Saved feedback。

## 11.4 Core rule

Error 不能破坏已有可信 Current Course State。

## 11.5 Single background failure

单次 background failure：

- 默认静默；
- 后续 opportunity 再重试；
- 不制造 Review；
- 不产生 Possibly Removed；
- 不立刻显示 stale warning。

## 11.6 Long-term failure

长期 / 重复无法成功检查：

```text
Needs attention
```

详情：

```text
Course information may be out of date
Last successful check: 8 Sep
Try again
```

## 11.7 Waiting vs Failed

### Waiting

系统知道缺少什么，而且用户可以解决。

UI 必须说具体原因：

- API key required；
- API key needs attention；
- Permission required；
- Authorization required。

### Failed

任务当前无法继续。

提供：

- 用户可理解原因；
- Try again；
- View details；
- details 内 stable error code。

---

# 12. Complete User Flows

Interaction Flow 只把 PRD Product Flow 映射到具体 Screen、入口、返回与状态，不建立第二套 User Flow。

## 12.1 New user / first Course

```mermaid
flowchart TB
    A["Open Syllab"] --> B["Current Semester"]
    B --> C["Discovered Course · visually not established"]
    C --> D["Scan Prompt"]
    D --> E{"API Key / Authorization ready?"}
    E -- No --> F["Settings / Authorization"]
    F --> E
    E -- Yes --> G["Initial Scan"]
    G --> H["Initial Review"]
    H --> I["Current Course State / Course Brief"]
```

不先做长 onboarding。

只在用户真正开始建立 Course 时请求必要配置。

## 12.2 Established Course daily use

```mermaid
flowchart TB
    A["Toolbar on Course page"] --> B["Side Panel Course Brief"]
    B --> C["Read Current Course State"]
    B --> D["‹ Semester Course List"]
    B --> E["More / Detail / Evidence"]
```

## 12.3 Continuous maintenance

```mermaid
flowchart TB
    A["Opportunity / Manual Check"] --> B["Local Source Change Check"]
    B --> C{"Source changed?"}
    C -- No --> D["Quiet end"]
    C -- Yes --> E["AI semantic processing"]
    E --> F{"Meaningful change?"}
    F -- No --> G["Quiet end + freshness"]
    F -- Yes --> H["Course Status Area · Pending Review"]
    H --> I["Change Review"]
    I --> J["Update Current Course State"]
    J --> K["Course Brief"]
```

## 12.4 Settings interruption / return

```mermaid
flowchart TB
    A["Original Screen / Task"] --> B["Configuration required"]
    B --> C["Settings · exact section"]
    C --> D["Configuration completed"]
    D --> A
```

## 12.5 Restore

```mermaid
flowchart TB
    A["Settings → Data"] --> B["Choose Backup"]
    B --> C["Validate + Summary"]
    C --> D["Confirm Full Replace"]
    D --> E["Restore"]
    E --> F["Restored Current Semester Dashboard"]
```

---

# 13. Side Panel vs Full-page Adaptation Rules

| Topic                      | Side Panel                      | Full-page                  |
| -------------------------- | ------------------------------- | -------------------------- |
| Semester                   | Course List                     | Full Dashboard             |
| Course Brief               | Full content                    | Full content               |
| Course navigation          | `‹` → Semester Course List      | `‹` → Semester Dashboard   |
| Established Course preview | No                              | Yes                        |
| Not Established            | visual state + Scan prompt      | visual state + Scan prompt |
| Pending Review copy        | `Review · 2`                    | `2 changes to review`      |
| Checking copy              | compact                         | normal                     |
| Settings                   | 由需要时打开 Full-page Settings | Full Settings              |
| Backup / Restore           | 不作为 Side Panel 主体          | Settings → Data            |
| Historical Semester        | Course List                     | Dashboard                  |
| Evidence                   | Same interaction                | Same interaction           |
| Review                     | Same semantic flow              | Same semantic flow         |

原则：

> **语义统一，密度自适应。**

不要为了 Side Panel 窄而改变产品对象或 Review semantics。

---

# 14. Screen Design Deliverables & Final Screenshot Backfill

每个上表中的完整 Screen / 重要 State 后续都应作为同一份 Spec 的组成部分继续维护。开发完成后：

- `必须` 标记的 Screen / State 至少保存一张最终真实截图；
- Side Panel / Full-page 有明显布局差异时分别截图；
- 截图直接回填到本 Spec 对应 Screen / State 章节，不集中放在单独附件；
- 截图下配简短文字：页面是什么、主要区域是什么、用户如何操作；
- README 从本 Spec 的最终截图中选择主要页面形成 Product Walkthrough；
- 不再维护独立 Screen Inventory 文档。

所有完整页面和重要状态以本 Spec 各个 **Screen Family 页面章节开头的 Screen 表** 为实现、验收与截图清单。

每个 Screen 的设计说明至少包含：

```text
Purpose
Entry
Layout / Information hierarchy
Primary actions
Secondary actions
States
Exit / Return
Side Panel / Full-page behavior
Error / Empty behavior
```

Technical Design 不得以实现方便为理由跳过这些 Interaction contract。

Interaction & IA Spec 在开发前定义设计，在开发完成后做一次 Final Implementation Update。

## 14.1 Screenshot rule

开发完成后：

- 每一个完整 Screen 至少一张最终实现截图；
- 每一个会明显改变用户理解的重要 State 至少一张截图；
- Side Panel / Full-page 有明显布局差异时分别截图；
- 截图必须来自最终真实实现；
- 截图插入本 Spec 对应 Screen / State 章节，而不是集中丢到文档最后；
- 截图下配简短说明：页面是什么、主要区域是什么、用户如何操作。

本版设计阶段使用以下占位规则：

> **Final implementation screenshot: To be inserted after implementation.**

## 14.2 Gate integration

Gate 2 的 Evidence Collection 应检查：

- required screens 已实现；
- required screenshots 已保存；
- screenshot 与当前代码实现一致；
- Interaction Spec 已完成 screenshot backfill。

## 14.3 README Product Walkthrough

README 不成为新的产品事实源。

开发完成后，用最终真实截图更新 README 的页面示意 / Product Walkthrough。

建议至少展示：

1. Semester Dashboard；
2. Side Panel Semester Course List；
3. Course Brief；
4. Initial Scan；
5. Initial Review；
6. Change Review；
7. Settings / Backup & Restore。

每个部分用简单文字说明：

- 这是哪个页面；
- 这个区域有什么作用；
- 用户怎么操作。

不需要在 README 展示全部细分 Error State；完整状态记录留在本 Spec。

---

# 15. Relationship to PRD Product Flow

Interaction Flow 不是第二套 User Flow。

PRD Product Flow 是主干：

```text
Course discovered
→ Initial Scan
→ Initial Review
→ Current Course State
→ Opportunity Check
→ Change Review
→ Updated Current Course State
```

本 Spec 只把同一条主干映射到具体页面、入口、返回、状态和动作。

例如：

```text
PRD:
Change Review → Update Current Course State

Interaction:
Course Brief
→ Review · 2
→ Changed Field Review
→ Accept change
→ Course Brief
```

两者不能维护成两套互相独立的产品链路。

---

# 16. Technical Design Handoff Boundaries

Technical Design 可以决定：

- UI component implementation；
- state management implementation；
- local persistence representation；
- exact Source fingerprint / hash；
- throttle；
- physical API call layout；
- error code taxonomy；
- atomic Restore implementation；
- schema / migration / validator。

Technical Design 不得改变：

- Screen purpose；
- Side Panel / Full-page职责；
- Current State priority；
- Review semantics；
- Evidence interaction meaning；
- Assessment / Component / Series hierarchy；
- Restore Full Replace；
- Rebuild Preview → Use / Keep；
- Local Source Change Check before AI；
- Toolbar routing；
- navigation / task status separation。

如果实现要求改变以上规则：

> **Product Conflict — return to Product Design.**

---

# 17. Final Interaction Acceptance Summary

v0.2.0 Interaction & IA 在进入 Technical Design 前应满足：

- Side Panel / Full-page 的职责明确；
- Toolbar routing 已关闭 open decision；
- Semester → Course 导航一致；
- Course Brief 是默认主体；
- Review 是独立决策页，不是常驻导航；
- Initial Scan 不暴露 technical pipeline，但显示真实用户阶段；
- Initial Review 使用完整 Assessment；
- Merge 的 UI 表达为 `Same assessment as…`；
- Split 为低频结构纠错；
- Evidence 默认隐藏，通过 Field / Requirement 点击原位切换；
- Assessment / Component / Series 层级明确；
- Course Status / Semester Status placement 明确；
- Working / Waiting / Failed / Saved / Freshness 不混为一个状态；
- Opportunity Checking 先 Local Source Change Check，Source 未变不调用 AI；
- Change Review 覆盖 Changed / New / Conflict / Possibly Removed / Identity Uncertain；
- Rebuild 不做 Diff，只 Preview rebuilt Course Brief 后整体 Use / Keep；
- Restore 为 Full Replace；
- Calendar Export 只基于 Current Course State；
- 新用户 / 已有 Course / Historical Semester / Error / Recovery 路径明确；
- Screen Family 已直接作为本 Spec 的正式章节结构；每个页面类别的 Screen 清单、设计说明与截图回填位置在同一章内维护；
- 开发后的 final screenshot backfill 与 README walkthrough 已成为正式交付要求。

> **Interaction & Information Architecture Design v0.2.0 — Closed. Ready for Technical Design.**

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

---

# 附录 A. Final Implementation Screenshots

每张截图都来自 v0.2.0 的最终真实实现，由 `npm run gate:2` 的自动化浏览器路径生成，
不是设计稿或生成式示意图。Side Panel 与 Full-page 布局差异明显时分别截图。

## SEM-01 — Current Semester Dashboard (Full-page)

![Current Semester Dashboard (Full-page)](docs/versions/v0.2.0/images/SEM-01.png)

Full-page entry point. The header carries the semester name, which doubles as the Current / Historical switcher, and the Semester Status Area on the right. Each established Course card is a lightweight Course Brief preview grouped by Assessment type. A Course that has not been set up carries the same card, with the prompt line where the others carry a status cue and no preview above it.

## SEM-02 — Current Semester Course List (Side Panel)

![Current Semester Course List (Side Panel)](docs/versions/v0.2.0/images/SEM-02.png)

The Side Panel's semester view. It lists the semester's Courses for switching and deliberately does not repeat the dashboard's Assessment preview; `Open full dashboard` hands over to the Full-page surface.

## SEM-03 — Semester Switcher

![Semester Switcher](docs/versions/v0.2.0/images/SEM-03.png)

Clicking the semester name expands the Current / Historical Semester list. There is no permanent Current / Historical navigation.

## SEM-04 — Historical Semester Dashboard (Full-page)

![Historical Semester Dashboard (Full-page)](docs/versions/v0.2.0/images/SEM-04.png)

A past semester keeps the same browsing structure but offers no `Check for updates` and is never a target of background checking. Every Course Brief, field and Evidence record stays readable.

## SEM-05 — Historical Semester Course List (Side Panel)

![Historical Semester Course List (Side Panel)](docs/versions/v0.2.0/images/SEM-05.png)

The Side Panel equivalent for a past semester.

## SEM-06 — Empty Semester

![Empty Semester](docs/versions/v0.2.0/images/SEM-06.png)

A semester with no Curriculum Course shows a single quiet line. There is no setup wizard and no Scan affordance.

## SEM-07 — Not Established Course Prompt

![Not Established Course Prompt](docs/versions/v0.2.0/images/SEM-07.png)

Choosing a Course Syllab has not been set up for asks one question before anything happens. The Course is only established after the user explicitly selects `Scan course`: auto-discovery is never auto-scan.

## CRS-01 — Course Brief (Full-page)

![Course Brief (Full-page)](docs/versions/v0.2.0/images/CRS-01.png)

Current Course State is the default body of the Course view. Assessments are grouped in the fixed order Assignments / Projects / Quizzes & Tests / Exams / Other; a Component sits under its parent, an Assessment Series shows its instances beneath it, and Course-wide Constraints come last. No raw JSON and no internal identifiers appear anywhere.

## CRS-02 — Course Brief (Side Panel)

![Course Brief (Side Panel)](docs/versions/v0.2.0/images/CRS-02.png)

The same Current Course State at Side Panel density. Objects, marks and Review semantics are identical; only the layout is narrower.

## CRS-03 — Assessment Detail

![Assessment Detail](docs/versions/v0.2.0/images/CRS-03.png)

Selecting an Assessment opens its detail and action state. Actions are not permanently attached to every card in the Brief.

## CRS-04 — Assessment Edit

![Assessment Edit](docs/versions/v0.2.0/images/CRS-04.png)

Editing happens in place on structured fields. The user edits a value, never JSON.

## CRS-05 — Evidence Reveal

![Evidence Reveal](docs/versions/v0.2.0/images/CRS-05.png)

Clicking a fact swaps it in place for the original Evidence that supports it; clicking again returns to the fact. There is no modal, no separate Evidence page and no `View evidence` control.

## CRS-06 — No Assessments Found

![No Assessments Found](docs/versions/v0.2.0/images/CRS-06.png)

A successful Scan that produced no Assessment is a normal state, not an error, and Manual Add Assessment remains available.

## ISC-01 — Scan Prompt

![Scan Prompt](docs/versions/v0.2.0/images/ISC-01.png)

The first Scan for a Course starts from an explicit prompt.

## ISC-02 — Scan Working

![Scan Working](docs/versions/v0.2.0/images/ISC-02.png)

One start carries the Scan through every safe stage. The UI names only the four user-facing stages and never shows a percentage or an internal pipeline name.

## ISC-03 — Scan Waiting — API Key

![Scan Waiting — API Key](docs/versions/v0.2.0/images/ISC-03.png)

When the run needs the user's DeepSeek API key it says so and offers a way to fix it. `Waiting` is an internal state and is never the user-facing word.

## ISC-04 — Scan Waiting — Permission / Authorization

![Scan Waiting — Permission / Authorization](docs/versions/v0.2.0/images/ISC-04.png)

The same waiting pattern for host permission or the content-sending authorization. Completing the configuration resumes the original Scan context.

## ISC-05 — Scan Failed

![Scan Failed](docs/versions/v0.2.0/images/ISC-05.png)

A failure that cannot continue offers `Try again` plus `View details`; stable error codes appear only inside the details.

## ISC-06 — Scan Error Details

![Scan Error Details](docs/versions/v0.2.0/images/ISC-06.png)

The user-readable reason comes first and the stable error code second.

## IRV-01 — Initial Review — Assessment

![Initial Review — Assessment](docs/versions/v0.2.0/images/IRV-01.png)

One complete Assessment at a time with lightweight progress. `Confirm` is the primary action; structural correction stays behind `More…`.

## IRV-02 — Initial Review — Edit

![Initial Review — Edit](docs/versions/v0.2.0/images/IRV-02.png)

Editing an item during Review keeps the user inside the Review context.

## IRV-03 — Same assessment as…

![Same assessment as…](docs/versions/v0.2.0/images/IRV-03.png)

Merge is expressed in the user's own terms: this item is actually the same Assessment as an existing one.

## IRV-04 — Split

![Split](docs/versions/v0.2.0/images/IRV-04.png)

Split handles the low-frequency case where one item actually contains two or more separate Assessments.

## IRV-05 — First-use Contextual Hint

![First-use Contextual Hint](docs/versions/v0.2.0/images/IRV-05.png)

Structural actions teach themselves the first time only, inline, without covering the content and without a tutorial.

## CRV-01 — Changed Field Review

![Changed Field Review](docs/versions/v0.2.0/images/CRV-01.png)

Only the changed field is shown, as Current against Latest, with `Accept change` as the primary action and `Keep current` recorded as a real decision rather than permanent suppression.

## CRV-03 — Conflict Review

![Conflict Review](docs/versions/v0.2.0/images/CRV-03.png)

Competing values stay side by side with their own Evidence. The product never recommends a source, and Current State is not overwritten until the user decides.

## CRV-04 — Possibly Removed Review

![Possibly Removed Review](docs/versions/v0.2.0/images/CRV-04.png)

Keep and Remove are the two real decisions. A kept object stays inside Current State without fading, keeps its mark, and is not asked about again while the evidence stays absent.

## CRV-05 — Identity Uncertain Review

![Identity Uncertain Review](docs/versions/v0.2.0/images/CRV-05.png)

When identity itself is unresolved the user is asked directly whether the two items are the same Assessment.

## RBL-01 — Rebuild Confirmation

![Rebuild Confirmation](docs/versions/v0.2.0/images/RBL-01.png)

Rebuild explains before it starts that the existing Current Course State stays unchanged until the new result is adopted.

## RBL-02 — Rebuild Working

![Rebuild Working](docs/versions/v0.2.0/images/RBL-02.png)

Rebuild reuses the Initial Scan stages rather than inventing its own progress language.

## RBL-03 — Rebuilt Course Preview

![Rebuilt Course Preview](docs/versions/v0.2.0/images/RBL-03.png)

The result is a complete rebuilt Course Brief, not a field-by-field diff. The decision is taken as a whole: use the rebuilt Course or keep the current one.

## CAL-01 — Calendar Export Preview

![Calendar Export Preview](docs/versions/v0.2.0/images/CAL-01.png)

Export reads Current Course State and never re-scans or re-calls the model, and the list and the file come from one call, so the preview cannot promise an event the download does not contain. Equivalent facts collapse into one event; unresolved Conflicts are excluded. A date the Source wrote without a year (`18 Oct`) is completed from the Course's Semester instead of being dropped, and a date the Source left open (the Final Exam's) is not a settled fact, so it appears in neither the list nor the file.

## SET-01 — Settings

![Settings](docs/versions/v0.2.0/images/SET-01.png)

One Full-page Settings entry covering AI, Authorization, Data and About. Entering Settings from a task returns to that task's exact context afterwards.

## SET-02 — AI — API Key

![AI — API Key](docs/versions/v0.2.0/images/SET-02.png)

Only the DeepSeek API key is configured here; there is no model selector. The key is masked until revealed and is stored locally, never in a Backup.

## SET-04 — Authorization

![Authorization](docs/versions/v0.2.0/images/SET-04.png)

Privacy Authorization and API Usage Authorization are separate: allowing course content to be sent to the model is not the same as allowing unlimited background spending.

## SET-05 — About

![About](docs/versions/v0.2.0/images/SET-05.png)

The Product Mark and the product version, nothing more.

## BKP-01 — Data — Backup / Restore

![Data — Backup / Restore](docs/versions/v0.2.0/images/BKP-01.png)

Backup exports the complete local Syllab state; the API key is explicitly not included and the user is not asked to choose Courses.

## BKP-02 — Restore File Summary

![Restore File Summary](docs/versions/v0.2.0/images/BKP-02.png)

Before anything is written, the backup is validated and summarised, and the Full Replace consequence is stated plainly.

## BKP-04 — Restore Failed

![Restore Failed](docs/versions/v0.2.0/images/BKP-04.png)

If validation or the write fails, the previous local state is left untouched and the failure says why.
