# Syllab for NTU Learn — 产品需求文档（PRD） — v0.1.0

> **产品版本**：v0.1.0
> **阶段**：`v0.1.0 IMPLEMENTED · GATE D PASS · ACCEPTED BASELINE`
> **产品形态**：Chrome 浏览器扩展
> **目标平台**：NTU Learn（Blackboard）
> **技术验证结论**：`PASS WITH KNOWN RISKS`
> **本文档用途**：作为 Syllab 当前产品需求事实源。后续交互规范、技术设计、实现计划、MVP 开发与验收必须以本文档为产品边界；若实现与本文档冲突，应回到产品侧确认，不应自行扩大或修改范围。

> **Lifecycle Note**：本文档是 v0.1.0 已实现、已验收的产品基线，不是下一版的变更草案。Gate D 后的产品反馈、候选方向与待决策问题集中记录在 `product-design-review-input-post-v0.1.0.md`；在产品侧形成新的正式决定前，不改变本文档的规范性需求。

---

# 1. 项目概述

## 1.1 一句话定位

**Syllab 是建立在 NTU Learn 之上的个人课程信息整理层，将散落在课程页面、公告、作业和课程文件中的重要信息，整理成结构化、可信、可执行的个人课程视图。**

产品显示名称：

# Syllab
## for NTU Learn

---

## 1.2 产品不是什么

Syllab 不是：

- Blackboard / NTU Learn 的替代品；
- AI 聊天机器人；
- 通用 AI 学习助手；
- 作业生成或 Quiz 答题工具；
- 自动提交作业的 Agent；
- 新的课程内容发布平台；
- 大而全的学生管理系统。

NTU Learn 仍然是课程原始信息的主要来源和承载平台。

Syllab 的职责是：

> **读取 → 理解 → 整理 → 确认 → 汇总 → 后续持续维护**

而不是替代原平台。

---

# 2. 项目背景

## 2.1 NTU Learn 是课程信息的重要官方入口

NTU 学生在整个学期内会反复进入 NTU Learn。教师会在其中发布或更新：

- 课程内容；
- 公告；
- 作业；
- 课程大纲；
- PDF / PPT / Word 等课程文件；
- 其他与课程安排和考核有关的信息。

因此，NTU Learn 是学生获取课程信息和教师更新的重要平台。

---

## 2.2 课程信息虽然集中托管在 NTU Learn，但并未形成“学生行动视图”

NTU Learn 已经是统一的课程平台，但它的主要职责仍然是：

> **发布和存储课程信息。**

它并不会主动替学生整理成：

- 这门课有哪些正式 Assessment？
- 每项考核 占多少分？
- 最近有哪些截止日期？
- 哪些规则会影响提交？
- 多门课程放在一起，这周到底要做什么？

学生需要自己从多个页面和文件中寻找并组合这些信息。

---

## 2.3 不同课程的信息组织方式存在差异

相同类型的信息，在不同课程中可能出现在不同位置。

例如：

- 一门课可能主要依赖 课程大纲；
- 一门课可能频繁通过公告更新日期；
- 一门课可能将任务说明放在作业页面；
- 另一门课可能把重要规则写进 PPT 或 Word 文档。

学生不能依赖一个固定的信息查找路径。

---

## 2.4 课程信息会在整个学期持续变化

课程开始时的信息不一定在整个学期保持不变。

教师可能：

- 新增 Assignment；
- 修改 Deadline；
- 发布新的测验 / 展示安排；
- 通过公告更新原有规则；
- 上传新的课程文件。

因此，课程信息管理不是一次性任务，而是持续发生的过程。

---

## 2.5 学生同时管理多门课程

学生通常并不是只管理一门课，而是同时面对多门课程。

每门课都有独立的：

- 内容结构；
- Assessment；
- Deadline；
- 更新节奏；
- 教师习惯。

当课程数量增加后，信息管理成本会进一步叠加。

---

## 2.6 重要信息中存在大量非结构化内容

考核项、截止日期、权重、提交规则 等信息并不总是以统一字段存在。

它们可能位于：

- 自然语言段落；
- 表格；
- PDF；
- PPT；
- Word；
- Announcement；
- Assignment 描述。

这为自动整理带来了 AI 理解价值，也带来了准确性和来源追溯风险。

---

# 3. 目标用户与核心场景

## 3.1 目标用户

核心目标用户：

> **使用 NTU Learn 管理课程信息的 NTU 学生。**

其中痛点更明显的用户包括：

- 没有稳定课程整理习惯的学生；
- 容易忘记回头检查课程更新的学生；
- 同时管理多门课程、信息量较大的学生；
- 不愿意手动维护复杂 Notion / 日历 / 待办系统的学生。

已经有良好整理习惯的学生同样存在价值：

> Syllab 可以降低他们从 NTU Learn 手动复制、整理和持续维护信息的成本。

---

## 3.2 核心使用场景

### 场景 A：学期初建立课程认知

学生希望快速了解：

- 课程考核项；
- Weight；
- 重要 Deadline；
- 重要规则。

### 场景 B：学期中检查课程信息

学生进入 NTU Learn，想知道：

- 最近有什么要交；
- 有没有新的作业 / 测验；
- 有没有新的公告；
- 原有安排是否需要重新确认。

MVP 允许用户主动重新扫描，但不自动识别新增、变化或可能删除的内容。

### 场景 C：重要节点前再次确认

例如考试、展示或作业截止前，学生会再次检查：

- 日期；
- 时间；
- 提交方式；
- Word Limit；
- Group Size；
- 其他规则。

### 场景 D：多门课程同时推进

学生需要知道：

- 哪门课最近有任务；
- 不同课程 Deadline 是否集中；
- 有没有重要更新被漏掉。

其中，多课程统一视图属于完整产品核心体验，不属于 MVP 第一阶段验证范围。

---

# 4. 当前用户流程

当前学生通常没有固定搜索路径，而是根据课程结构来回寻找信息。

典型流程为：

```text
进入 NTU Learn
    ↓
进入某门课程
    ↓
查看课程内容 / 公告 / 作业
    ↓
打开 课程大纲或课程文件
    ↓
寻找考核、截止日期和规则
    ↓
在不同来源之间来回确认
    ↓
自己判断是否已经“找全”
    ↓
选择：
A. 不额外记录，以后需要时再回来找
B. 手动复制到日历 / 笔记 / 待办 / 文档
```

当信息发生更新时：

```text
收到通知 / 主动再次进入 NTU Learn
    ↓
找到新的公告 / Assignment / 文件
    ↓
依靠记忆判断是否与原信息不同
    ↓
必要时重新打开旧资料比较
    ↓
更新自己的认知或外部记录
```

如果不同来源出现冲突：

```text
比较来源
    ↓
如果是明确的新 Announcement 更新旧信息
→ 通常采用新信息

如果没有明确的新旧关系
→ 重新查找 / 询问老师或同学
```

---

# 5. 核心痛点

> 本节描述当前用户流程中存在的问题，不等同于产品功能或产品需求。

## 5.1 信息查找成本高

学生往往需要在多个页面和文件之间反复切换：

- 课程内容；
- Announcement；
- Assignment；
- 课程大纲；
- PDF；
- PPT；
- Word。

问题不一定在于信息不存在，而在于：

> **用户需要自己寻找“重要信息到底藏在哪里”。**

不同课程的组织方式又不统一，因此学生很难形成稳定搜索路径。

---

## 5.2 找完之后仍然难以确认是否有遗漏

学生往往不是在一个明确的“完成状态”下结束查找，而是在：

> “我应该差不多找全了。”

的主观判断下停止。

尤其当一门课同时存在 课程大纲、公告、作业页面 和多个附件时，用户很难快速确认是否还有信息遗漏。

这不仅是效率问题，也是完整性和可靠性问题。

---

## 5.3 核心信息虽然通常已经存在，但仍需要学生自己提取和整理

很多课程的课程大纲 已经比较清楚地写出了：

- Assessment；
- Weight；
- Deadline；
- Grading Scheme；
- 课程规则。

真正的问题是：

> **这些信息仍然需要学生自己从原始页面和文件中提取，再整理成自己可持续查看和使用的结构。**

---

## 5.4 课程更新后，需要反复重新检查和维护认知

课程信息并不是静态的。学生需要自己判断新的公告、Assignment 或文件是否影响原有认知和外部记录。

---

## 5.5 多门课程之间缺少统一的个人视图

NTU Learn 以课程为基本组织单位，但学生实际安排时间时思考的是：

> **“我这周总体要做什么？”**

当前学生往往需要一门门打开、自己记住、再在脑中合并，或者自己维护日历 / 待办 / 笔记。

---

## 5.6 信息冲突时缺少明确、可靠的判断依据

需要区分：

### A. 明确更新

新的来源明确说明原信息被修改。

### B. 真正冲突

不同来源给出不同信息，但没有明确的新旧关系。

### C. 属性不确定

例如任务存在，但无法确定它是否是正式计分 Assessment。

这些情况要求用户回查来源并做判断。

---

## 5.7 横向痛点：课程信息管理过度依赖个人整理习惯

如果学生不主动整理，容易反复查找和遗漏；如果主动整理，又要承担复制、维护和同步成本。

---

## 5.8 横向痛点：重要节点仍依赖学生自己记住并主动检查

NTU Learn 的通知不等于一个持续告诉学生“接下来真正要做什么”的统一个人行动视图。

---

# 6. 用户需求

> 本节描述用户希望达到的结果，不直接等同于具体功能。

## 6.1 单门课程信息统一结构化

用户需要：

> **将一门课程中分散的重要信息整理成统一、稳定、可以持续查看的课程结构。**

至少能够清楚看到：

- Assessment；
- Important Dates；
- 重要规则。

---

## 6.2 快速获得课程关键信息

目标不是简单“总结课程”，而是：

> **快速获得和自己行动直接相关的课程关键信息。**

---

## 6.3 确认重要信息没有明显遗漏

用户需要知道：

> **这次整理覆盖了哪些来源，哪些来源没有成功处理。**

因此，产品必须帮助用户建立覆盖感，而不是制造虚假的完整性。

---

## 6.4 清楚处理冲突、不确定和来源问题

用户需要：

- 知道信息来自哪里；
- 能查看原始依据；
- 在来源冲突时看到冲突；
- 在 AI 无法可靠判断时由自己决定。

---

## 6.5 快速识别课程变化及其影响

完整产品中，用户需要知道什么是新的、什么被修改、什么可能被删除。

MVP 不做自动变化识别，但允许用户主动重新扫描，重新获取当前课程内容。

---

## 6.6 多门课程统一汇总

完整产品最终需要把各门课已经确认的信息汇总成统一视图。

该能力不进入 MVP。

---

## 6.7 降低手动整理和维护成本

Syllab 应尽量将用户从：

> “手动复制、手动整理、手动同步”

转变为：

> “AI 自动整理普通内容，用户只处理关键判断和异常情况。”

---

## 6.8 重要节点主动提醒

提醒属于后续能力，不进入当前 MVP。

---

# 7. 产品目标

## 7.1 核心目标

> **把 NTU Learn 中分散的课程信息整理成结构化、可信、可执行的个人课程视图，让学生可以更快、更完整地掌握课程任务、时间和重要要求。**

---

## 7.2 目标拆解

### 结构化

将页面、课程大纲、公告、作业和文件中的重要信息整理成统一结构。

### 可信

- 保留来源；
- 暴露冲突；
- 暴露不确定性；
- 高风险信息由用户确认；
- 不让 AI 猜测课程事实；
- 不把“未识别到”表达成“不存在”。

### 可执行

信息最终能够进入：

- Course Brief；
- Calendar；
- 后续 Reminder；
- 后续多课程 Dashboard。

### 多课程统一

完整产品最终从单门课程结构扩展到个人跨课程视图。

---

# 8. 产品定义与边界

## 8.1 产品边界

### PB-01 只管理课程信息，不完成学习任务

Syllab 可以告诉用户有什么 考核、截止日期和规则，但不写作业、不回答测验、不自动完成课程任务。

### PB-02 Syllab 是 NTU Learn 之上的信息整理层

NTU Learn 保留原始内容；Syllab 负责读取和整理，不成为新的官方信息源。

### PB-03 不向 NTU Learn 写回数据

不修改作业、课程内容，不自动提交、回复或操作 Blackboard。

### PB-04 只结构化与学生行动相关的重要信息

Syllab 不复制整门课程内容。

### PB-05 不处理 NTU 登录和凭证

使用用户已经登录 NTU Learn 的浏览器状态，不保存 NTU 密码、SSO 凭证、MFA 信息。

### PB-06 只处理明确支持的数据源

不支持的内容必须明确标记 `Unsupported`（暂不支持）或跳过，不承诺“只要 NTU Learn 里有就一定能解析”。

---

# 9. AI、数据与人工边界

## 9.1 AI 的职责

AI 可以负责：

- 语义理解；
- 信息提取；
- 分类；
- 考核与截止日期 / 规则关联；
- 去重候选；
- 显式更新关系识别；
- 冲突识别；
- 不确定性识别；
- Review 风险路由。

---

## 9.2 AI 不允许做的事情

AI 不得：

- 凭常识补全课程事实；
- 将不确定日期直接变成确定日期；
- 在没有依据时判断哪个冲突来源一定正确；
- 将未确认结果伪装为最终事实。

例如：

> “Quiz in Week 7”

如果没有足够证据映射到具体日期，则不能自行生成一个日期。

---

## 9.3 数据范围

MVP 处理 NTU Learn 生态内的：

### Blackboard 原生内容

- 课程内容；
- 公告；
- Assignment Pages。

### 文件

- **P0：PDF**；
- **P1：PPTX、DOCX**；
- **Compatibility / later：legacy PPT、DOC**。

旧版 PPT / DOC 在 MVP 中如果无法可靠解析，必须正确识别并标记 `Unsupported`（暂不支持），不能假装解析成功。

当前不处理：

- Panopto 视频理解；
- Turnitin 深度集成；
- 第三方 LTI；
- 复杂外部网站；
- 需要额外系统登录的外部平台；
- 学生成绩；
- 提交记录；
- 已提交文件；
- 教师个人反馈。

---

## 9.4 自动化与人工边界

### 系统自动完成

- 扫描；
- 抓取；
- 文本解析；
- 信息识别；
- 分类；
- 候选关联；
- 风险判断；
- 普通候选组织。

### 用户负责

- 最终确认重要事实；
- 修改错误内容；
- 忽略无关候选；
- 手动补充遗漏；
- 处理真正存在歧义的冲突。

原则：

> **让用户做判断，不让用户做机械录入。**

---

# 10. 完整产品方案

## 10.1 解题策略

```text
先可靠结构化一门课程
        ↓
建立用户确认过的课程事实
        ↓
持续识别课程变化
        ↓
汇总多门课程
        ↓
形成个人课程行动视图
```

产品原则：

1. 单课结构化优先于多课汇总；
2. AI 生成候选，用户确认事实；
3. 结果优先展示，来源按需回查；
4. 普通项减少操作，高风险项重点 Review；
5. 完整产品后续只 Review 变化内容；
6. 下游只消费已确认数据。

---

## 10.2 完整产品核心能力

### F1. 获取

读取用户当前有权限访问的课程页面和支持文件，并保留来源、来源类型、来源链接、来源身份和基本位置。

### F2. 理解

识别考核项、截止日期、权重、考试、测验、展示、规则等候选。

### F3. 处理

处理去重、实体关系、考核 ↔ 截止日期 / 规则关联、明确更新关系、来源冲突和模糊信息。

### F4. 行动

将确认后的信息转为 Course Brief、重要日期和日历，以及后续周课程地图 / 提醒。

### F5. 更新

完整产品后续支持新增、变化和可能删除状态。

### F6. 跨课程汇总

完整产品后续支持近期任务、重要日期、测验 / 考试 / 展示、近期变化和提醒。

---

# 11. 完整产品闭环

## 11.1 第一次建立课程

```text
进入课程
→ Scan
→ Capture
→ Understand
→ Resolve
→ Review
→ Confirm / Edit / Ignore
→ 建立 Course Brief
→ 加入个人课程体系
```

---

## 11.2 后续课程更新

完整产品目标：

```text
课程发生变化
→ 系统重新检查
→ 与旧状态比较
→ 识别新增、变化和可能删除
→ 用户只 Review 变化内容
→ Confirm
→ 更新 Course Brief
→ 同步下游
```

MVP 只提供用户主动 `Scan again`，不实现上面的自动变化识别逻辑。

---

## 11.3 下游同步

完整产品中，一条变化被确认后，应同步影响 Course Brief、多课程总览、日历和提醒。

---

## 11.4 删除处理

“可能删除”属于后续变化识别能力，不进入 MVP。

---

# 12. MVP 定义

## 12.1 MVP 核心假设

> **Syllab 能否可靠地把一门真实 NTU Learn 课程中分散的重要信息整理成统一结构，并让用户通过较低的 Review 成本形成一个真正可用的 Course Brief。**

MVP 不验证：

- 完整多课程 Dashboard；
- 自动变化识别；
- 自动后台更新；
- Reminder；
- Chat。

---

## 12.2 MVP 验证目标

### 1. 找得到

能从真实课程中找到：

- Assessment；
- Important Dates；
- 重要规则。

### 2. 整理得对

能正确：

- 分类；
- 关联；
- 保留 Source；
- 暴露冲突和不确定性。

### 3. 能行动

能将确认结果转成：

- Course Brief；
- `.ics` Calendar。

---

# 13. MVP 范围

## 13.1 扫描输入范围

用户点击：

> **Scan this course**

后，系统默认扫描当前课程中所有当前支持来源。

用户不需要提前：

- 一个个打开页面；
- 一个个点击附件；
- 手动选择要扫描的来源。

支持范围遵循第 9.3 节的数据范围与格式优先级。

---

## 13.2 MVP 提取范围

### A. 考核项

包括：

- Assignment；
- Quiz；
- Presentation；
- Project；
- Exam；
- Weight。

### B. 重要日期

包括：

- Due Date；
- Exam Date；
- Quiz Date；
- Presentation Date；
- Submission Deadline。

### C. 重要规则

包括：

- Word Limit；
- Group Size；
- Submission Format；
- Submission Channel；
- Late Penalty；
- Attendance Requirement；
- 其他对 marks、grading、assessment validity、assessment eligibility 或有成绩要求的课程义务存在直接或较近影响的 course-level rules。

**D-015 Grade-Impact Boundary**：Important Rules 只收录违反后会直接，或通过很短且明确的因果链，影响 marks、grading、assessment validity、assessment eligibility，或有成绩要求的课程义务是否完成的 course-level rules。Assessment-specific Rule 继续归入对应 Assessment。通用 copyright、材料传播、privacy、campus conduct 或政策性 boilerplate，如果与成绩的联系只是远距离、推测性或依赖独立纪律流程，默认不纳入。

---

## 13.3 MVP 不提取

第一版不处理：

- Weekly Course Map；
- 完整教学周安排；
- Tutorial / Hybrid Teaching Arrangement；
- Materials 自动整理；
- Lecture 内容总结。

---

# 14. MVP 信息状态

## 14.1 条目级状态

| 状态 | 含义 |
|---|---|
| `Detected` | AI 已识别，证据较清晰，但用户尚未确认 |
| `Needs Review` | 存在明确风险，需要重点人工确认 |
| `Confirmed` | 用户已经确认 |
| `Edited` | 用户修改后确认 |
| `User-added` | 用户手动新增并确认 |
| `Ignored` | 用户决定不采用 |

完整产品后续增加：

- `Changed`；
- `Possibly Removed`。

---

## 14.2 Detected

适用于：

- 证据明确；
- 没有明显冲突；
- 关联较清楚；
- 但尚未经过用户最终确认的普通候选。

---

## 14.3 Needs Review

适用于：

- 两个来源冲突；
- 日期表达模糊；
- 无法确定是否为正式计分 Assessment；
- 考核与截止日期 / 规则的归属或关联不确定；
- 其他明显风险。

前端不展示类似“92% Confidence”的虚假精确数字。

用户应看到：

> **为什么需要检查，以及做判断所需的最小证据。**

---

## 14.4 字段级未解决状态

MVP 允许一个已经确认存在的主体包含尚未解决的字段。

例如：

```text
Final Presentation      Confirmed
Weight: 20%             Confirmed
Due date: Needs Review  Unresolved
```

规则：

- 如果连整条信息是否成立都不确定，整条留在 Review；
- 如果主体已经可以确认，只是某个字段有冲突或缺失，主体可以进入 Course Brief；
- 未解决字段必须明确标记 `Needs Review` / `Unresolved`；
- 未解决日期不能进入 日历导出；
- MVP 不把所有字段都做成复杂状态系统，只在真实需要时使用字段级 unresolved。

---

# 15. MVP Review 机制

## 15.1 Review 界面

Review 是一个主要界面，内部包含两个明确处理区：

1. `Needs Review`；
2. `Detected`。

推荐先处理 `Needs Review`，再处理 `Detected`，但不是强制向导流程；用户可以跳过、切换或中途退出。

---

## 15.2 Review 按信息类型组织

`Detected` 按：

- Assessment；
- Important Dates；
- 重要规则；

组织，不按 Source 作为主结构。

Source 是证据，不是主导航。

---

## 15.3 普通候选支持分类级批量确认

不能要求用户：

> 30 条结果点击 30 次 Confirm。

普通 `Detected`：

- 用户快速浏览；
- 每个类别支持独立 `Confirm all`；
- 不提供全局 `Confirm all detected`；
- 批量确认 只作用于当前仍未处理的 `Detected` 项；
- 已 Edit / Ignore / Confirm 的项目不被覆盖；
- 批量确认 不增加二次确认弹窗，可提供短暂 Undo。

---

## 15.4 高风险候选逐条处理

`Needs Review` 必须单独处理。

用户可：

- Confirm / Choose；
- Edit；
- Ignore；
- Skip for now；
- View Source。

`Skip for now` 不改变候选状态，只表示本轮暂时不处理。

对于冲突候选，卡片应直接展示做判断所需的关键差异；完整 Source 仍按需展开。

---

## 15.5 Review 可以中途退出

Review 状态自动保存。

用户之后回来可以继续。

保存的是：

- 每条候选的处理状态；
- 已确认项；
- 已修改项；
- 已忽略项；
- 未处理候选；
- Skip 后仍待处理的候选。

不要求恢复到上一次具体滚动位置。

Review 进度使用数量表达，例如：

> `7 of 10 reviewed`

不使用百分比。

---

## 15.6 Review 完成

不设置独立 `Review 完成` 页面。

当本轮没有剩余未处理候选时，直接进入 Course Brief。

进入 Course Brief 后，如果仍有未解决字段或部分扫描状态，则继续在对应位置显示。

---

# 16. Course Brief（课程简报）

## 16.1 Course Brief 的角色

Course Brief 是：

> **这门课程在 Syllab 中当前经过用户认可的课程事实源。**

AI 扫描结果只是候选层。

---

## 16.2 Course Brief 信息结构

MVP 固定使用：

### 考核项

Assessment 可以包含：

- Name；
- Type；
- Weight；
- 已确认截止日期（如有）；
- 已确认且明确属于该 Assessment 的行动规则 / Requirements（如 Format、Group、提交条件等）；
- 其他已经确认、直接影响行动的字段。

### 其他重要日期

只展示不属于某个 Assessment 的独立重要日期。

如果某个日期已经绑定在 Assessment 上，主视图不在 其他重要日期 中重复展示。

### 重要规则

只展示不属于某个 Assessment 的课程级重要规则和必要说明。

如果某条 Rule 已经明确绑定到 Assessment，主视图将其归入该 Assessment，不在 Important Rules 中重复展示。关系不明确时进入 Needs Review，不得猜测。

---

## 16.3 进入 Course Brief 的信息

可以进入 Course Brief 的包括：

- Confirmed；
- Edited；
- User-added 且已确认；
- 主体已确认、但个别字段仍 unresolved 的项目。

仍然不允许：

- 整条 `Detected` 候选直接进入；
- 整条是否成立都不确定的 `Needs Review` 候选进入。

---

## 16.4 未完成 Review 时

用户不需要处理完所有候选才能查看 Course Brief。

如果仍有整条待处理候选，Course Brief 顶部明确显示：

> **还有 X 条待处理信息**

并提供：

> **Continue review**

---

## 16.5 部分扫描状态

如果上一次扫描为部分成功，Course Brief 顶部独立显示：

> **Partial scan · X sources need attention**

并提供：

> **View issues**

待 Review 与部分扫描 分开显示，不合并成模糊的 “需要处理”。

如果两个状态都不存在，不显示占位提示。

---

## 16.6 在 Course Brief 内解决未解决字段

已经进入 Course Brief 的已确认条目，如果某个字段仍未解决，用户可以直接在 Course Brief 内处理，不强制跳回整个 Review 界面。

处理时只展示做判断所需的最小信息；完整 Source 默认隐藏。

---

## 16.7 后续编辑与新增

Course Brief 使用：

- 单条 Edit；
- 分类内 Add；
- 不做整页 Edit Mode。

用户 Save 后：

- Edit 结果直接成为当前已确认事实；
- 用户新增结果直接成为 `User-added + Confirmed`；
- 不再额外要求一次 Confirm。

用户修改后，不因为新值与原始来源 不同就自动打回 Needs Review。

---

# 17. 来源与可追溯性

## 17.1 来源是证据，不是主内容

每条重要结构化结果应尽可能保留：

- Source Type；
- Source Name；
- Source URL；
- 页面 / 文件位置；
- PDF Page；
- PPT Slide；
- 必要原文片段。

主界面以当前可用结果为主。

---

## 17.2 来源默认隐藏

原始来源、原始提取值和冲突证据继续保留，但默认不常驻 Course Brief 主界面。

用户主动进入：

- View Source；
- View Details；

时再展示。

如果用户 Edit / Resolve：

- 当前事实显示用户最终确认后的值；
- 原始来源 和原始提取值不删除、不改写；
- 不做常驻的完整版本历史 UI。

如果无法做到精确 段落级深层链接，至少应能打开原始 NTU Learn 页面或原始文件。

---

# 18. 扫描覆盖与异常模型

## 18.1 扫描结果概览

扫描结束后显示轻量结果概览。

结构遵循：

> **结果优先 + 轻量 Coverage**

第一层优先告诉用户：

- 提取了多少候选；
- 多少为 Detected；
- 多少为 Needs Review。

第二层告诉用户：

- 已处理多少已发现来源；
- 是否有来源需要注意。

不展示 扫描覆盖 百分比，也不把已处理来源数量解释为“课程整体完整度”。

具体失败来源通过 `View issues` 按需展开。

---

## 18.2 扫描级状态

Scan 使用以下整体状态：

### Complete（完成）

扫描正常完成，所有已发现且当前支持的来源均完成处理。

### Partial（部分成功）

扫描正常走完，但部分已发现来源：

- 无权限；
- 读取失败；
- 解析失败；
- Unsupported；
- 或其他问题未完成处理。

Partial 不阻断 Review。

### Failed（失败）

Scan 没有形成可以正常进入 Review 的可信结果。

### Interrupted（中断）

Scan 本身没有正常走完，例如执行被中断。

`Interrupted`（中断）不等于 `Partial`（部分成功）。

---

## 18.3 来源级状态

具体 来源可使用：

- Processed；
- Permission denied / Access not granted；
- Unsupported format；
- Parsing failed；
- Couldn’t access source；
- Interrupted processing。

只有真实存在恢复路径时才显示动作：

- Permission → Allow access；
- 临时读取 / 解析失败 → Retry；
- Interrupted → Continue / Retry；
- `Unsupported`（暂不支持）→ 不显示无意义的重试。

用户界面不展示 HTTP 状态、解析器堆栈、host API 等技术日志。

---

## 18.4 部分扫描

Partial Scan 后：

- 用户可以直接 Review 已成功结果；
- 可以通过 `View issues` 查看失败来源；
- 可以对可恢复来源执行 Allow / Retry；
- 单一 Source 错误不能让整门课结果作废。

重试 / 补扫不能无故破坏已经确认、修改或新增的 Course Brief 事实。

具体复用、重试和结果合并方式留给技术设计。

---

## 18.5 整次扫描失败

整次扫描失败留在 Scan 界面，不进入正常 Review。

界面应提供：

- 简短用户层原因；
- 主要恢复动作；
- View details。

如果这是已保存课程的一次后续扫描：

> **失败不能删除已有 Course Brief。**

---

## 18.6 未检测到结果

Scan 正常完成但没有提取候选时，不算 Failed。

应表达为：

> **No items detected**

而不是：

> “这门课程没有考核 / 日期 / 规则”。

用户仍可以进入空的 Course Brief 并 新增信息。

---

# 19. 日历导出

## 19.1 入口

日历导出 从整个 Course Brief 统一进入。

不在每一个日期旁边提供独立 `Add to calendar`。

---

## 19.2 日历数据来源

只消费已经确认的日期。

可以导出：

- 已确认日期；
- Edited 后确认的 Date；
- 用户新增并确认的日期。

不能导出：

- Detected；
- Needs Review；
- Ignored；
- unresolved date。

---

## 19.3 默认行为

导出时：

> **默认选中全部 已确认日期s。**

用户只取消不想导出的个别事件。

每条事件显示：

- 事件名称；
- 已确认日期；
- 必要的简短类型信息；
- 考核项可显示有帮助的权重信息。

不展示 Source、AI 置信度、冲突历史。

日历导出不提供日期编辑；日期有问题时回 Course Brief 修改或处理。

输出：

> `.ics`

不绑定 Google Calendar 或其他单一平台。

---

# 20. 多课程保存与导航

## 20.1 MVP 已保存课程

MVP 可以保存多个独立课程。

Saved Courses（已保存课程）只负责：

- 课程导航；
- 当前整理状态。

每门课程只需要显示：

- Course Code；
- Course Name；
- 主要状态；
- 必要时显示 次级问题。

例如：

- Completed；
- 3 items to review；
- Partial scan；
- Partial scan · 2 sources need attention。

如果同时存在待 Review 和部分扫描，两者都显示，不合并。

---

## 20.2 已保存课程不承担总览面板职责

不展示：

- 跨课程 Deadline 汇总；
- 跨课程 Task 汇总；
- 最近 Deadline；
- Assessment 数量；
- Calendar 汇总；
- 总览分析。

---

## 20.3 当前课程识别与入口路由

扩展入口 不是独立页面，而是路由判断。

如果用户当前位于可识别的 NTU Learn 课程页面：

### 未扫描

进入该课程的 Scan Ready。

### 已扫描

直接进入该课程 Course Brief。

如果用户当前不在可识别的 课程页面：

> 进入 Saved Courses。

---

## 20.4 已保存课程点击行为

点击一门课程：

- `Not scanned` → Scan Ready；
- 已扫描课程 → Course Brief；
- 即使还有待 Review 或部分扫描，也先进入 Course Brief，再通过 `Continue review` / `View issues` 进入对应处理。

---

## 20.5 MVP 不使用多标签页导航

MVP 不采用：

> Brief | Review | Scan | Calendar

这样的平级 Tab。

层级关系为：

- Saved Courses = 课程切换层；
- Course Brief = 已扫描课程默认主界面；
- Scan = 任务流程；
- Review = 任务流程；
- 日历导出 / 来源 / 编辑 / 权限等 = 临时交互。

---

# 21. MVP 信息架构与用户流程

## 21.1 主要界面

MVP 只保留 4 个主要 Surface：

1. **Saved Courses**；
2. **Scan**；
3. **Review**；
4. **Course Brief**。

以下不是独立主页面：

- 扩展入口；
- Current Course Detection；
- Scan Overview；
- Partial Scan；
- Failed Sources；
- Unsupported Source；
- Permission Request；
- Source Evidence；
- Edit / Add；
- Resolve Field；
- 日历导出。

这些分别属于 状态或临时交互。

---

## 21.2 主流程

```text
Open Syllab
        ↓
识别当前上下文
        ↓
┌─────────────────────────┐
│ 当前是 NTU 课程页面? │
└─────────────────────────┘
      ↓ Yes                      ↓ No
识别课程状态                 Saved Courses
      ↓
┌───────────────┐
│ 已扫描过？    │
└───────────────┘
 ↓ No          ↓ Yes
Scan Ready    Course Brief
   ↓
Scan
   ↓
Scan Overview
   ↓
Review
   ↓
Course Brief
   ↓
日历导出 / 编辑 / 新增 / 处理未解决字段 / 查看问题
```

---

## 21.3 准备扫描

首次进入未扫描课程时，不自动开始 Scan。

用户看到：

- 当前课程身份；
- Syllab 大致会读取哪些来源；
- 结果需要经过 Review 后才形成 Course Brief；
- 部分课程文件可能需要额外访问权限。

主动作：

> **Scan this course**

用户不能手动选择只扫描部分来源。

---

## 21.4 Scan → Review

Scan 正常或 Partial 完成后：

- 有候选 → `Review results`；
- 没有需要 Review 的候选 → 可直接打开 Course Brief；
- 未检测到候选 → 仍可进入空 Course Brief；
- 整次扫描失败 → 不进入正常 Review。

---

## 21.5 Review → Course Brief

当本轮没有剩余未处理候选时，直接进入 Course Brief。

不做独立完成页。

---

# 22. MVP 扫描进度、权限与中断

## 22.1 扫描进度

扫描不能是无反馈黑箱。

使用轻量阶段任务列表，例如：

- Reading course pages；
- Reading announcements；
- Reading assignments；
- Processing documents；
- Extracting course information。

表现规则：

- 已完成步骤可显示 ✓；
- 当前步骤显示 加载状态；
- 不显示百分比；
- 不显示 ETA；
- 不在 扫描过程中展示完整 Coverage 数字；
- 不展示技术日志。

完整覆盖情况留到扫描结果概览。

---

## 22.2 动态附件域权限

产品方向：

> **优先动态申请实际发现的 Blackboard / Xythos 精确域权限。**

具体 Chrome API、用户手势约束和回退机制留给技术设计。

交互规则：

- 不在 Scan 开始前一次性请求未知附件域权限；
- Scan 发现真实需要的新文件域后，再触发授权；
- 尽量在自然停顿点请求，不立刻打断当前可继续任务；
- 主文案解释用户目的，例如 `Access course files`，不以技术域名作为主标题；
- 用户可以 `Allow access`；
- 用户可以 `Continue without them`；
- 拒绝后其余 Scan 继续，最终可以 Partial 结束；
- 同一次 Scan 不反复追问同一权限。

---

## 22.3 关闭扩展与主动取消

产品规则：

> **关闭扩展界面 ≠ 主动取消扫描。**

只有用户明确执行 `Cancel scan` 才算主动取消。

如果技术上关闭界面后可以继续，重新打开时继续展示 Scan 状态。

如果技术上无法继续，重新打开时显示：

> `Interrupted`

并提供恢复入口。

具体后台生命周期与恢复机制属于待技术设计问题。

已有 Course Brief 不因扫描中断或主动取消被清空。

---

# 23. 本地数据与保存

## 23.1 MVP 存储方式

MVP 主要使用：

> **浏览器本地存储 / 本地数据库**

不建设：

- Syllab Account；
- Cloud Sync；
- Multi-device Sync。

具体本地技术方案在技术设计阶段决定。

---

## 23.2 保存内容

需要保存：

- Course ID；
- Course Brief；
- Review 状态；
- 用户修改；
- 用户新增条目；
- 未解决字段状态；
- Source Metadata；
- 必要 证据片段 / 位置；
- Source ID；
- Content Fingerprint；
- Scan ID；
- Fetched Time；
- 支持 Scan again 所需的必要本地关联信息。

---

## 23.3 不长期保存

默认不保存完整副本：

- PDF；
- PPT；
- Word。

原文件仍位于 NTU Learn。

也不保存：

- NTU Credentials；
- Grades；
- Submission Records。

---

# 24. 外部 AI 数据原则

MVP 可以调用外部 AI Model 处理必要课程文本。

原则：

- 只发送完成任务所需内容；
- 不发送 NTU 登录凭证；
- 不发送成绩；
- 不发送提交记录；
- 不发送无关个人信息；
- 默认不在 Syllab 云端长期复制完整课程文件。

具体模型和服务商策略在技术设计阶段确定。

---

# 25. MVP 不做范围

MVP 明确不做：

1. 多课程统一 Dashboard；
2. 自动变化识别；
3. Incremental Scan；
4. 自动后台检查课程更新；
5. 自动识别新增 / 变化 / 可能删除；
6. 主动提醒；
7. AI Chat / Course Q&A；
8. Weekly Course Map；
9. Materials 自动整理；
10. 第三方 Calendar API 深度集成；
11. Grades；
12. Submission Records；
13. Personal Feedback；
14. NTU Login / SSO / MFA；
15. Panopto 视频理解；
16. Turnitin 深度集成；
17. 第三方 LTI；
18. 多人协作；
19. 多租户；
20. 自动修改或提交 NTU Learn 内容；
21. Ignore 跨扫描持久抑制；
22. 完整版本历史 / 审计日志；
23. Global `Confirm all detected`。

**说明：用户主动重新扫描属于 MVP，不属于“不做范围”。**

---

# 26. MVP 主动重新扫描与后续增量更新边界

## 26.1 MVP 支持用户主动重新扫描

所有已扫描课程都允许用户主动：

> **Scan again**

但它是 Course Brief 的次级操作，不是主操作。

---

## 26.2 重新扫描不清空已有 Course Brief

用户之前已经：

- Confirm；
- Edit；
- Add；

的事实不能因为一次重新扫描被无条件删除或覆盖。

新的扫描结果仍需要经过 Review 或字段处理后才能影响 Course Brief。

具体候选匹配、合并与去重策略留给技术设计。

---

## 26.3 MVP 不做自动变化识别

MVP 的重新扫描不承诺：

- 自动标记 New；
- 自动标记 Changed；
- 自动标记“可能删除”；
- 只 Review 变化内容。

这些仍属于后续 Phase 2。

---

## 26.4 Ignore 不在 MVP 中跨扫描记忆

如果用户在一次扫描中 Ignore 某候选，之后主动重新扫描时同一内容再次被检测到：

> **允许再次进入 Review。**

MVP 不做：

- Ignore 记忆；
- 同一候选跨 Scan 抑制；
- 实质变化判断；
- “你之前 Ignore 过”提示。

---

## 26.5 为后续能力保留数据

MVP 应尽量保留：

- `course_id`
- `source_id`
- `source_type`
- `source_url`
- `title`
- `fetched_at`
- `content_hash`
- `scan_id`

这些数据可为后续变化识别提供基础，但 MVP 不因此承诺完整变化识别。

---

# 27. 验证与验收

## 27.1 总体验收原则

MVP 不能只证明：

- Extension 能运行；
- API 能调用；
- AI 能返回 JSON。

必须证明：

> **真实 NTU 课程可以被可靠整理成一个用户真正能用的 Course Brief。**

---

## 27.2 人工基准答案

使用真实 NTU 课程建立人工 人工基准答案。

人工提前标记：

- 正式 Assessment；
- Important Dates；
- 重要规则；
- 正确关联关系；
- 重要来源。

再与 Syllab 输出比较。

---

## 27.3 考核项验收

重点检查：

- 是否漏掉正式计分 Assessment；
- 是否误将练习任务当成正式 Assessment；
- Weight 是否正确；
- 是否与正确 Source 关联。

如果无法判断某任务是否计分：

> 必须进入 Needs Review。

不能自动确认为正式 Assessment。

---

## 27.4 截止日期验收

Deadline 属于最高风险信息。

要求：

- 关键 Deadline 不应遗漏；
- 错误日期不能直接进入 Confirmed；
- 模糊日期必须进入 Review 或作为未解决字段；
- 冲突日期必须展示冲突；
- 未解决日期不得进入日历；
- 修改或处理后的日期导出日历时必须使用最终确认值。

原则：

> **宁愿多一次 Review，也不能自信地输出错误截止日期。**

---

## 27.5 规则验收

需要尽量识别：

- Word Limit；
- Group Size；
- Submission Format；
- Submission Channel；
- Late Penalty；
- Attendance Requirement；
- 其他对 marks、grading、assessment validity、assessment eligibility 或有成绩要求的课程义务存在直接或较近影响的 course-level rules。

不能：

- 不因规则看起来“重要”、语气严肃或属于正式政策就自动纳入；
- 不根据远距离纪律后果、一般风险或常识推导 grade impact；
- 将普通说明误判为正式规则；
- 根据常识补规则；
- 编造课程要求。

---

## 27.6 用户修改量

如果大部分结果需要重写、重分类、重新关联，则即使“提取成功”，产品也没有真正降低人工成本。

---

## 27.7 核心闭环验收

至少要在真实课程中完整跑通：

```text
Entry
→ Scan
→ 权限 / 部分成功（如发生）
→ Scan Overview
→ Review
→ Confirm / Edit / Ignore / Add / Skip
→ Course Brief
→ 处理未解决字段（如发生）
→ .ics Export
→ Saved Courses 再次进入
```

---

## 27.8 日历验收

要求：

- 只导出 已确认日期；
- 未解决日期不进入导出列表；
- Date 正确；
- Time 正确；
- 课程 / 任务标题正确；
- 不产生 Duplicate；
- 修改或处理后的日期使用最终确认值。

---

## 27.9 覆盖 / 异常验收

要求：

- Complete / Partial / Failed / Interrupted 四种扫描状态能正确区分；
- Unsupported 不伪装成成功；
- Partial 不阻断已有结果 Review；
- 单 Source 错误不无故使整课失效；
- 0 items detected 不被表达成“课程不存在这些信息”；
- 扫描覆盖 不使用虚假百分比表达整体完整度。

---

## 27.10 Review 成本验收

重点观察：

- Detected 是否可以按类别快速批量确认；
- Needs Review 是否只展示做判断所需的关键信息；
- 用户是否需要频繁打开 Source；
- Review 是否比自己重新整理课程更省事。

---

## 27.11 用户价值验收

实际体验需要比手动查 NTU Learn 更好。

重点观察：

- 查找时间是否降低；
- 是否更容易确认重要内容没有漏；
- 用户是否愿意继续使用 Course Brief。

---

## 27.12 数值阈值

当前阶段不人为设定 95%、98% 等没有真实基线的数字。

第一轮真实课程 MVP 测试后，再基于 人工基准答案 和实际错误分布确定合理阈值。

---

# 28. 关键假设与风险

## 28.1 课程信息主要存在于 NTU Learn

Syllab 无法保证捕获：

- 课堂口头通知；
- 私人邮件；
- Teams / WhatsApp；
- 没有同步到 NTU Learn 的教师通知。

---

## 28.2 Review 成本不能过高

如果学生为了确认 AI 结果，需要重新读一遍全部原始资料，则产品失去核心价值。

---

## 28.3 不同课程表达方式差异可能导致 AI 不稳定

不同教师的文档格式、表格、用词和考核表述可能差异很大。

必须使用多个不同结构的真实课程测试。

---

## 28.4 来源可追溯性可能不足

如果只能告诉用户“AI 从某个文件里看到的”，但无法提供有效位置或原文证据，会降低 Review 效率和信任。

---

## 28.5 文件结构解析可能丢失语义

PDF / PPT / Word 中的表格、多栏、标题层级、图文组合可能造成：

- 截止日期 ↔ 考核项错配；
- 权重 ↔ 考核项错配。

---

## 28.6 虚假完整性感知

Syllab 必须始终区分：

> “我没有识别到”

和：

> “这个信息不存在”。

因此 扫描覆盖 是重要信任机制。

---

## 28.7 大课程的扫描成本

部分课程可能包含大量文件。

需要在真实 MVP 中观察：

- Source 数量；
- 文件体积；
- Token 量；
- 扫描耗时；
- AI 成本。

在有数据前不提前过度优化。

---

## 28.8 Technical Spike（技术验证）已知风险

Technical Spike（技术验证）已 `PASS WITH KNOWN RISKS`。以下风险转入技术设计 / MVP 测试，不再作为重新做 Spike 的理由：

- **KR-01：跨课程兼容性**；
- **KR-02：PPTX / DOCX 真实端到端验证**；
- **KR-03：旧版 PPT / DOC 兼容策略**；
- **KR-04：遍历完整性 与 扫描覆盖**；
- **KR-05：动态精确附件 域权限 UX**；
- **KR-06：大文件处理**。

这些风险不得被写成“已经完全解决”。

---

# 29. Technical Spike（技术验证）阶段结论

## 29.1 当前状态

Technical Spike（技术验证）已正式收口：

> **PASS WITH KNOWN RISKS**

核心 内容获取路线已经有真实 NTU Learn 证据支持，包括：

- 当前课程识别；
- Content API 访问；
- 多层内容遍历；
- 公告正文读取；
- 附件发现；
- NTU Learn → Blackboard → Xythos 重定向链；
- 精确权限下的扩展附件字节访问；
- 真实 PDF 按页解析；
- Source Metadata / Source Identity / Content Hash。

---

## 29.2 当前设计约束

Technical Spike 的已知风险现在作为：

> **交互设计 / 技术设计 / MVP 测试的约束。**

不再继续做 Spike 来阻塞产品设计。

---

## 29.3 权限方向

当前产品方向已确认：

> **优先动态申请实际发现的 Blackboard / Xythos 精确域权限。**

具体 Chrome 权限 API、用户手势约束和失败回退仍待技术设计验证。

不得未经产品确认切换为广泛 `*.blackboard.com` 权限。

---

# 30. 后续产品能力

MVP 验证成功后，再逐步扩展：

## Phase 2｜课程更新

- Automatic / structured Change Detection；
- Changed / New / Possibly Removed；
- Change Review；
- Incremental Scan；
- Ignore 记忆 / 更稳定的跨扫描候选匹配。

> 注：基础的用户主动重新扫描已进入 MVP；Phase 2 负责变化识别和增量处理，不是第一次加入重新扫描入口。

## Phase 3｜多课程总览

- Upcoming Tasks；
- Cross-course Deadlines；
- Exam / Quiz；
- Recent Changes。

## Phase 4｜行动层

- Reminder；
- Calendar Sync；
- Weekly Course Map；
- Materials Organization。

具体优先级根据 MVP 使用结果重新评估，不在当前 PRD 提前锁定。

---

# 31. 当前阶段结论

Syllab 当前 MVP 的本质不是：

> **“给 NTU Learn 加一个 AI 总结按钮。”**

而是验证：

> **能否把真实课程里分散的重要信息可靠地转化成一个经过用户确认、可以持续使用的课程事实结构。**

当前 MVP 的核心体验链路已经对齐为：

```text
当前课程 / Saved Courses
        ↓
准备扫描
        ↓
扫描
        ↓
权限 / 部分成功 / 异常处理
        ↓
扫描结果概览
        ↓
Review
        ↓
Course Brief
        ↓
编辑 / 新增 / 处理未解决字段 / 查看来源
        ↓
日历导出
        ↓
Saved Courses / 后续主动重新扫描
```

本版实际完成路径：

```text
需求对齐
    ↓
PRD
    ↓
Technical Spike（技术验证）
    ↓
PASS WITH KNOWN RISKS
    ↓
MVP 详细交互与信息架构
    ↓
产品设计对齐检查
    ↓
产品交接文档
    ↓
技术设计
    ↓
实现计划
    ↓
正式 MVP 开发
    ↓
真实课程验收
```

## 31.1 Implementation validation outcome

- Phase 1–15 与 Gate A–D 全部完成；Gate D 于 2026-09-17 PASS。
- 两门真实 NTU Learn 课程完成 Scan → Review → Course Brief → Calendar 闭环验收。
- 真实 PDF 与 ZIP 已端到端验证；真实 PPTX、DOCX、legacy Office、超大、无文本和损坏样本仍为 `NOT TESTED`。
- KR-07（Calendar 可静默漏掉已确认日期）与 KR-08（`Retry extraction` 可重跑付费提取）是开放缺陷，不改变 Gate D 结果。
- 完整验收事实源为 `final-acceptance-v0.1.0.md`。

当前下一步是产品交接与 post-v0.1.0 决策，不是重开 Technical Spike 或继续 v0.1.0 Coding。
