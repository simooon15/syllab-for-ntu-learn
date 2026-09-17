# Syllab — Technical Design + Implementation Plan 启动提示词 — v0.1.0

我们现在继续推进 **Syllab for NTU Learn**。

你正在接手一个已经完成产品需求、真实 Technical Spike、MVP 详细交互设计和信息架构的项目。

当前产品版本：

> **v0.1.0**

这一轮不是重新做产品 Brainstorming，也不是开始正式 Coding。

你的任务是：

> **完成 Technical Design + Implementation Plan，并为产品侧提供一份易读的技术摘要。**

完成后必须停止，不要开始正式 MVP Coding。

---

# 一、先阅读事实源

请按以下顺序完整阅读：

1. `00_PRODUCT_HANDOFF_README_v0.1.0.md`
2. `01_Syllab_PRD_v0.1.0.md`
3. `04_Spike_Report_v0.1.0.md`
4. `05_Product_Decision_Log_v0.1.0.md`
5. `06_MVP_Interaction_IA_Spec_v0.1.0.md`

优先级：

## 产品需求

`01_Syllab_PRD_v0.1.0.md`

是当前产品需求事实源。

不得自行重新定义：

- 用户问题；
- MVP Scope；
- AI Boundary；
- Data Boundary；
- Review；
- Course Brief；
- Calendar；
- Saved Courses；
- Scan again；
- Non-goals。

## 交互与信息架构

`06_MVP_Interaction_IA_Spec_v0.1.0.md`

是当前交互事实源。

必须尊重：

- 4 个主要界面；
- Entry / Navigation；
- Scan Flow；
- Permission Flow；
- Review Flow；
- Course Brief；
- Calendar Export；
- Partial / Failed / Interrupted / Unsupported；
- 字段级 unresolved；
- Source 默认隐藏；
- Saved Courses 的边界。

## 产品决策

`05_Product_Decision_Log_v0.1.0.md`

里面的正式决定不得自行推翻。

如果技术实现与正式产品决定冲突：

> 不要静默修改产品。

请记录为：

### Product-impacting Technical Conflict

说明：

1. 冲突的产品规则；
2. 真实技术限制；
3. 已有证据；
4. 可选技术 / 产品方案；
5. 每个方案影响；
6. 你的建议。

然后留给产品侧确认。

## Technical Spike

`04_Spike_Report_v0.1.0.md`

Technical Spike 已经：

> `PASS WITH KNOWN RISKS`

不要重新做整个 Spike。

Spike 结果用于告诉你：

- 什么已经被真实验证；
- 什么只是 PARTIAL；
- 什么仍未验证；
- 哪些 Known Risks 必须在正式架构里处理。

Spike 实验代码不是正式 MVP 工程基线。

---

# 二、本轮必须完成的工作

## 1. Technical Design

输出：

`07_Technical_Design_v0.1.0.md`

至少需要覆盖：

### A. Extension Architecture

明确正式 MVP 的主要模块及职责，例如：

- Popup / UI；
- content script；
- service worker / background；
- Blackboard 页面上下文；
- Scan Engine；
- Fetch / Parse；
- AI Extraction；
- Review State；
- Course Brief State；
- 本地持久化；
- Calendar Export。

不要为了套模板强行采用这些名字，最终结构以技术设计为准。

### B. Data Flow

至少覆盖：

```text
Current Course Detection
→ Discover Sources
→ Fetch
→ Parse
→ Normalize
→ AI Extract
→ Candidate State
→ Review
→ Course Brief
→ Calendar Export
```

同时说明：

- 数据在哪一层产生；
- 哪一层拥有事实；
- Source Evidence 如何关联；
- 用户修改后如何保留原始证据。

### C. State Model

至少覆盖：

#### Scan
- Ready
- Scanning
- Waiting for Permission
- Complete
- Partial
- Failed
- Interrupted

#### Candidate
- Detected
- Needs Review
- Confirmed
- Edited + Confirmed
- Ignored

#### Field
- Confirmed
- Unresolved

字段级状态只做满足产品需求的最小范围。

### D. Scan Lifecycle

必须明确：

- Scan 从哪里启动；
- Popup 关闭后发生什么；
- `关闭 Extension ≠ Cancel` 如何实现；
- Scan 被中断时如何形成 Interrupted；
- Continue / Retry 的真实技术含义；
- 是否需要 checkpoint。

### E. Source Discovery / Traversal

结合 Spike 真实结果设计：

- 页面；
- Announcements；
- Assignments；
- 文件；
- 多层 folder；
- URL / item 去重；
- traversal completeness 风险。

不要把已发现来源的处理成功率包装成绝对完整性。

### F. Attachment Permission

产品方向已经确定：

> 优先动态请求实际发现的精确 Blackboard / Xythos host permission。

需要验证和设计：

- Chrome 用户手势要求；
- 申请时机；
- Allow 后如何恢复；
- Deny 后如何继续；
- 同一次 Scan 如何避免反复请求；
- 动态精确权限若不可行，有什么真实限制。

如果这个方向技术上不可行，不得自行改成广泛域名权限。

### G. File Pipeline

至少设计：

- PDF；
- PPTX；
- DOCX；
- legacy PPT / DOC 的识别；
- Unsupported；
- Parsing Failed；
- 大文件；
- parser 生命周期；
- 单文件失败隔离。

### H. AI / Extraction Boundary

只设计满足当前 PRD 的：

- 输入边界；
- 输出结构；
- Source association；
- Detected / Needs Review；
- 冲突信息；
- 去重 / 关联的责任边界。

不要在本轮扩大成 Chat、RAG 平台或其他 AI 能力。

### I. Course Brief / Review Data Relationship

必须说明：

- Candidate 如何进入 Course Brief；
- Confirmed / Edited / User-added 的关系；
- `已确认主体 + unresolved field` 怎么表示；
- unresolved date 为什么不能进入 Calendar；
- Edit / Resolve 后 Source Evidence 如何保留。

### J. Scan Again

MVP 支持主动 `Scan again`。

需要设计：

- 旧 Course Brief 如何保护；
- 如何避免覆盖 Confirmed / Edited / User-added；
- 新候选如何进入 Review；
- Retry 与 Rescan 的数据合并；
- 如何减少重复候选。

注意：

MVP 不要求自动 Change Detection。

MVP 不要求 Ignore memory。

### K. Local Data / Persistence

明确：

- 哪些数据必须持久化；
- 哪些可以是临时状态；
- Course / Source / Candidate / Brief / Review Progress 的关系；
- 数据更新和恢复原则。

### L. Calendar Export

只消费：

> Confirmed Date

输出：

> `.ics`

不要让 Calendar 层重新决定课程事实。

### M. Failure Isolation

设计：

- 单 Source Failed；
- Partial；
- Full Failed；
- Interrupted；
- Unsupported；
- Permission Denied；
- Parsing Failed；
- No Items Detected。

必须保持产品已经确认的恢复路径。

### N. Security / Privacy Boundary

结合 PRD 说明：

- 不读取 NTU 密码；
- 不保存 SSO / MFA 凭证；
- 不修改 Blackboard；
- 最小权限；
- 发送给外部 AI 的数据边界；
- 本地保存边界。

### O. Known Risks

逐项处理 Spike 的：

- 跨课程兼容性；
- PPTX / DOCX 真实端到端验证；
- legacy PPT / DOC；
- traversal completeness；
- attachment host permission；
- large file handling。

明确：

- 当前设计怎么处理；
- 哪些仍需在 Coding / Testing 中验证；
- 哪些可能形成产品影响。

---

# 三、Implementation Plan

同时输出：

`08_Implementation_Plan_v0.1.0.md`

它必须基于已经完成的 Technical Design。

不要写成泛泛的 Todo List。

需要拆成可以真正执行和验收的阶段。

建议至少包含：

1. Project foundation
2. Current course detection / routing
3. Scan discovery
4. Fetch / attachment permission
5. Parsers
6. Source normalization
7. AI extraction
8. Review state
9. Course Brief
10. Error / Partial / Interrupted
11. Calendar export
12. Scan again
13. Integration
14. MVP testing
15. Final acceptance

每一阶段至少说明：

- 目标；
- 主要实现内容；
- 依赖；
- 验收条件；
- 主要风险；
- 是否需要真实 NTU Learn 环境验证。

Implementation Plan 必须体现：

> 先建立完整闭环，再逐步增强。

不要一开始就追求所有边界场景的最复杂实现。

---

# 四、给产品侧的技术摘要

输出：

`09_Product_Review_Summary_v0.1.0.md`

这份文档是给不懂技术的产品负责人看的。

要求：

- 主要使用中文；
- 尽量不用工程黑话；
- 如果必须出现技术名词，要顺手解释；
- 控制篇幅；
- 不重复整份 Technical Design。

至少回答：

1. 最终准备怎么搭这个 MVP；
2. Scan 大致怎么工作；
3. 为什么这样设计；
4. Popup 关闭后的 Scan 怎么处理；
5. 文件权限怎么处理；
6. Course Brief 和 Review 的数据怎么保护；
7. Scan again 怎么避免破坏已有事实；
8. 当前最大的 3–5 个技术风险；
9. 有没有任何需要产品侧重新确认的地方；
10. 是否建议进入正式 Coding。

不要替产品侧做新的产品决定。

---

# 五、本轮结束时必须自动准备下一轮 Handoff

完成前三份文档后，不要直接开始 Coding。

你还必须输出：

`10_CODING_HANDOFF_README_v0.1.0.md`

以及：

`11_CODING_START_PROMPT_v0.1.0.md`

用于下一轮：

> Formal MVP Coding

## Coding Handoff 必须包含

- 当前项目状态；
- 本轮 Technical Design 结论；
- Implementation Plan；
- 已确认的关键技术决定；
- 未解决风险；
- 开发时不可改变的产品规则；
- 正式 Coding 的推荐执行顺序；
- 每一阶段需要跑的测试；
- 哪些步骤必须在真实 NTU Learn 环境验证。

## Coding 启动提示词必须明确

下一位 Codex：

- 先读哪些文件；
- 从哪一个 Implementation 阶段开始；
- 不要重新做产品设计；
- 不要重新做 Technical Design；
- 如何记录实现偏差；
- 如何处理真实环境失败；
- 每完成一个阶段如何验收；
- 什么时候停止并交回产品侧。

---

# 六、自动打包下一轮 Handoff 包

本轮结束时，请自动创建：

`Syllab_Coding_Handoff_v0.1.0.zip`

至少包含：

- `00_PRODUCT_HANDOFF_README_v0.1.0.md`
- `01_Syllab_PRD_v0.1.0.md`
- `04_Spike_Report_v0.1.0.md`
- `05_Product_Decision_Log_v0.1.0.md`
- `06_MVP_Interaction_IA_Spec_v0.1.0.md`
- `07_Technical_Design_v0.1.0.md`
- `08_Implementation_Plan_v0.1.0.md`
- `09_Product_Review_Summary_v0.1.0.md`
- `10_CODING_HANDOFF_README_v0.1.0.md`
- `11_CODING_START_PROMPT_v0.1.0.md`

如果正式 Coding 还需要其他文件，可以补充。

---

# 七、文件与语言规则

## 文件名

所有正式项目文档文件名：

> 必须在末尾加产品版本号 `v0.1.0`。

例如：

```text
07_Technical_Design_v0.1.0.md
```

不要自行使用：

```text
07_Technical_Design_v1.md
07_Technical_Design_final.md
07_Technical_Design_new.md
```

## 文档标题

所有正式文档的一级标题末尾同样加：

> `v0.1.0`

## 语言

文档尽量使用中文。

只保留必要的：

- 产品专有名；
- 状态名；
- 技术名；
- API / Library / File Format；
- 代码标识。

避免大范围中英混杂。

---

# 八、这一轮明确不要做什么

不要：

- 写正式 MVP 代码；
- 重做整个 Technical Spike；
- 重做产品 Brainstorming；
- 修改 PRD；
- 修改 Interaction / IA；
- 扩大 MVP；
- 加 Chat；
- 加 Reminder；
- 加 Multi-course Dashboard；
- 加自动 Change Detection；
- 加 Ignore memory；
- 因技术方便直接改产品规则。

---

# 九、本轮 Gate

完成：

```text
Technical Design
+
Implementation Plan
+
Product Review Summary
+
Coding Handoff
+
Coding Start Prompt
+
Coding Handoff ZIP
```

然后：

> **停止。**

不要开始正式 Coding。

我会先对 Technical Design 和 Implementation Plan 做一次 Alignment Check，再决定是否进入正式开发。
