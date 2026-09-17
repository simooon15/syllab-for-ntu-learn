# Syllab — 产品交接说明 — v0.1.0

> **产品版本**：v0.1.0  
> **交接日期**：2026-09-16  
> **当前阶段**：Formal MVP Coding 进行中；Rule Association Product Alignment（D-014）已通过  
> **Technical Spike**：`PASS WITH KNOWN RISKS`  
> **下一位负责人**：Codex  
> **下一阶段任务**：继续当前 Phase 5–9 Milestone；先落地 D-014 Rule Association delta，再完成该 Milestone Gate

---

# 1. 当前结论

Syllab 已完成：

```text
项目方向确认
→ 需求 Brainstorming
→ PRD
→ Technical Spike
→ PASS WITH KNOWN RISKS
→ MVP 详细交互设计
→ Information Architecture
→ Product Design Alignment Check
→ Technical Design
→ Implementation Plan
→ Product Alignment Check（PASS WITH REQUIRED FIXES）
→ Required Fixes
```

当前状态：

> **Required Fixes 已完成；Product-side Final Delta Alignment Check 已通过。**

后续阶段顺序：

```text
PRD
→ Technical Spike
→ MVP Interaction / IA
→ Technical Design
→ Implementation Plan
→ Product Alignment Check
→ Required Fixes
→ Final Delta Alignment Check
→ Formal MVP Coding
```

下一步不再重新讨论：

- 要不要做 Syllab；
- MVP 做什么；
- Review 是否存在；
- Course Brief 是否存在；
- Saved Courses 是否做 Dashboard；
- Scan Coverage 是否需要；
- Calendar 是否导出 `.ics`。

本次 Required Fixes 已定向完成：

```text
D-013 External AI Access Architecture
+
DeepSeek Backend / Anonymous Installation Authentication
+
Active Scan Routing
+
Implementation Plan / Coding Handoff Sync
```

Formal MVP Coding 已经开始，真实 vertical slice 已运行到 Review。Discovery、Fetch、Parse、Normalize、DeepSeek Extraction、Review persistence、prompt v3 与本地 Candidate deduplication 保持现状。

Rule Association 产品对齐已通过并形成 D-014。下一位 Codex 完成 handoff cleanup preflight 后，**不得重启 Phase 1 或重做已完成链路**；应从 D-014 relationship schema / Review context / Brief persistence / Scan again matching 继续当前 Phase 5–9 Milestone。

---

# 2. Codex 必读文件

按优先级阅读：

## 1. `01_Syllab_PRD_v0.1.0.md`

当前产品需求事实源。

定义：

- 用户问题；
- 产品目标；
- 产品边界；
- AI Boundary；
- Data Boundary；
- MVP Scope；
- Review；
- Course Brief；
- Calendar；
- Saved Courses；
- 状态模型；
- Scan again；
- Non-goals。

如果技术设计与 PRD 冲突：

> 先停下并回到产品侧确认。

---

## 2. `06_MVP_Interaction_IA_Spec_v0.1.0.md`

当前 MVP 交互与信息架构事实源。

定义：

- 4 个核心界面；
- 导航关系；
- Entry Flow；
- Scan Flow；
- Permission Flow；
- Scan Overview / Coverage；
- Review Flow；
- Course Brief；
- Calendar Export；
- Saved Courses；
- Partial / Failed / Unsupported / Interrupted；
- 关键 Interaction Rules。

技术设计必须实现这些产品行为，但不需要照搬文档中的示意文案或视觉形式。

---

## 3. `05_Product_Decision_Log_v0.1.0.md`

记录已经确认、后续开发不得自行改写的产品决定。

特别注意：

- D-001：动态、精确的附件域权限方向；
- D-006：已确认主体允许带未解决字段进入 Course Brief；
- D-010：Complete / Partial / Failed / Interrupted 的状态边界；
- D-011：MVP 支持主动 Scan again，但不能清空或无故覆盖已有事实；
- D-012：MVP 不做 Ignore memory。
- D-013：外部 AI 固定为 DeepSeek `deepseek-flash`，经轻量 Syllab Backend 调用，并采用匿名 installation authentication 与用量保护。
- D-014：Assessment-specific Date / Rule 使用稳定 parent relationship；Review 保持扁平分类，确认后归入 parent Assessment 并防止顶层重复。

---

## 4. `04_Spike_Report_v0.1.0.md`

Technical Spike 的最终事实源。

当前 Gate：

> `PASS WITH KNOWN RISKS`

它定义：

- 已经真实证明的技术链路；
- PASS / PARTIAL / NOT TESTED；
- Known Risks；
- 不应被误写成已经验证的能力。

---

# 3. 产品版本与文件规则

当前产品版本：

> `v0.1.0`

所有项目文档：

- 不设置独立文件版本号；
- 文件名保持稳定；
- 统一跟随产品版本。

不要创建：

```text
01_Syllab_PRD_v2.md
06_MVP_Interaction_IA_Spec_v1.1.md
```

应继续使用：

```text
01_Syllab_PRD_v0.1.0.md
06_MVP_Interaction_IA_Spec_v0.1.0.md
```

版本变化只跟随产品版本管理。

---

# 4. MVP 产品骨架

MVP 只有 4 个主要界面：

1. Saved Courses
2. Scan
3. Review
4. Course Brief

基本结构：

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

不要自行增加：

- Home Dashboard；
- 多 Tab 课程工作台；
- Multi-course Dashboard；
- Chat；
- Reminder；
- 自动 Change Detection。

---

# 5. 必须保持的核心产品规则

## 5.1 Entry

- 当前课程上下文优先；
- 未扫描课程进入 Scan Ready；
- 已扫描课程进入 Course Brief；
- 不在课程页进入 Saved Courses。

---

## 5.2 Scan

- 用户明确点击后才开始；
- 不让用户手动选择扫描来源；
- Scan Progress 使用轻量任务列表；
- 不显示百分比和 ETA；
- Coverage 在 Scan 完成后展示；
- 不制造虚假完整性。

---

## 5.3 Permission

- 优先动态申请实际发现的精确 Blackboard / Xythos 文件域权限；
- 用户拒绝后，其他来源继续；
- 可以以 Partial 结束；
- 同一次 Scan 不反复请求。

具体 Chrome API 实现留给技术设计。

---

## 5.4 Review

一个 Review 界面，两个处理区：

- Needs Review；
- Detected。

Needs Review：

- 逐条处理；
- 显示最小必要证据；
- 支持 Skip for now。

Detected：

- 按 Assessments / Important Dates / Important Rules 分组；
- 只做分类级 `Confirm all`；
- 不做全局 `Confirm all detected`。

Review 进度自动保存。

---

## 5.5 Course Brief

Course Brief 是已扫描课程的默认主界面和事实层。

结构：

- Assessments；
- Other Important Dates；
- Important Rules。

允许：

> 已确认主体 + 未解决字段

例如：

```text
Final Presentation
Weight: 20%
Due: ⚠ Needs review
```

未解决日期不能进入 Calendar Export。

---

## 5.6 Source

Source 是证据，不是主内容。

要求：

- 原始 Source 和原始提取结果保留；
- 主界面默认隐藏；
- 用户主动查看时再展示；
- 用户 Edit / Resolve 后，不删除原始证据。

---

## 5.7 Calendar

- 从 Course Brief 统一进入；
- 只导出 Confirmed Date；
- 默认选择全部可导出日期；
- 用户只取消不需要的项目；
- 输出 `.ics`；
- Calendar Export 不负责修改事实。

---

## 5.8 Saved Courses

Saved Courses 只负责：

- 导航；
- 当前处理状态。

不得扩展成：

- Deadline 聚合；
- Task Center；
- Multi-course Dashboard。

---

## 5.9 Error / Partial / Unsupported

Scan-level：

- Complete
- Partial
- Failed
- Interrupted

Source-level：

- Permission denied
- Unsupported format
- Parsing failed
- Could not access source
- Interrupted processing

规则：

- Partial 不阻断 Review；
- Failed 不进入正常 Review；
- Interrupted 不得伪装成 Partial；
- Unsupported 不提供无意义 Retry；
- 已有 Course Brief 不因新一次 Failed / Interrupted 被清空。

---

## 5.10 Scan again

MVP 支持用户主动：

> `Scan again`

但：

- 不清空现有 Course Brief；
- 不无故覆盖用户确认、修改或新增的事实；
- 新的或冲突信息再进入 Review / Resolve；
- MVP 不做自动 Change Detection；
- MVP 不做 Ignore memory。

---

# 6. Technical Spike 已证明什么

真实 NTU Learn 环境已经证明：

- 可以识别当前课程；
- 可以访问 Blackboard Content API；
- 可以完成真实课程内容遍历；
- 可以读取 Announcement 正文；
- 可以发现真实附件；
- 已验证 NTU Learn → Blackboard → Xythos 附件链；
- Chrome Extension 在精确权限下可以取得真实附件字节；
- 18 个真实 PDF 已取得 HTTP 200 与有效内容；
- 15 个真实 PDF 已通过 PDF.js 解析，共产生 667 页结果；
- 已形成带 Source Metadata、Source Identity 和 Content Hash 的 Raw Scan Result。

这些结果足以支持进入正式 MVP 技术设计。

Spike 实验代码不是正式 MVP 工程基线。

---

# 7. Known Risks

以下风险已经接受，不再阻塞项目进入技术设计：

## KR-01｜跨课程兼容性

当前真实证据仍主要来自有限课程环境。

## KR-02｜PPTX / DOCX 真实端到端验证

仍需在正式开发和测试中补充。

## KR-03｜Legacy PPT / DOC

必须能够正确识别；如果 MVP 无法解析，可以进入 Unsupported，但不得静默跳过或伪装成功。

## KR-04｜Traversal completeness

不能把已发现来源的成功率包装成绝对课程完整性。

## KR-05｜动态附件权限

产品方向已定，但 Chrome 用户手势和恢复机制仍需技术设计。

## KR-06｜大文件处理

需要考虑：

- batching；
- memory；
- parser 生命周期；
- 失败隔离。

Spike 中的实验限制不是正式产品需求。

---

# 8. Technical Design 需要回答的问题

下一阶段应回答“怎么实现”，而不是重新决定“产品做什么”。

至少需要覆盖：

## 8.1 扩展整体架构

明确：

- Popup / UI；
- content script；
- service worker / background；
- 页面上下文；
- Scan 生命周期；
- 状态持久化。

---

## 8.2 当前课程识别与路由

如何可靠实现：

- 当前是否为 NTU Learn；
- 当前是否为课程页；
- Course Identity；
- Saved / Not Scanned；
- 对应默认落点。

---

## 8.3 Scan Pipeline

设计：

```text
Discover
→ Fetch
→ Parse
→ Normalize
→ Extract
→ Review Candidates
```

但不得把技术流水线直接等同于 UI 的任务列表。

---

## 8.4 Source Identity 与 Provenance

需要定义：

- Source ID；
- Source Type；
- Parent / Child；
- URL；
- Title；
- Evidence；
- Content Hash；
- 与 Course Brief 条目的关联。

---

## 8.5 文件处理

至少处理：

- PDF；
- PPTX；
- DOCX；
- legacy PPT / DOC 的识别与 Unsupported 路径；
- 大文件失败隔离。

---

## 8.6 状态模型

至少覆盖：

### Scan

- Ready
- Scanning
- Waiting for Permission
- Complete
- Partial
- Failed
- Interrupted

### Candidate

- Detected
- Needs Review
- Confirmed
- Edited + Confirmed
- Ignored

### Field

- Confirmed
- Unresolved

字段级状态只做最小必要范围。

---

## 8.7 Review 持久化

明确：

- 条目状态如何保存；
- 中途关闭后如何恢复；
- 分类级 Confirm all 如何作用；
- Skip for now 如何保存。

---

## 8.8 Scan again 数据合并

必须回答：

- 如何识别已有条目；
- 如何避免覆盖用户事实；
- 新候选如何进入 Review；
- Retry 后如何避免重复；
- User-added 条目如何保护。

产品没有要求自动 Change Detection。

---

## 8.9 Permission

需要验证：

- 动态精确 host permission 是否可行；
- Chrome 用户手势要求；
- 权限请求的具体时机；
- Allow 后如何恢复；
- Deny 后如何形成 Partial。

---

## 8.10 Scan 关闭与恢复

产品要求：

> 关闭 Extension ≠ Cancel。

技术设计必须明确：

- Popup 关闭后能否继续；
- 如果不能，如何形成 Interrupted；
- 是否需要 checkpoint；
- Continue / Retry 的真实含义。

---

## 8.11 Calendar Export

只消费 Confirmed Date，生成 `.ics`。

不要在这里重新解析或修改课程事实。

---

# 9. Technical Design 不应做什么

不要在下一阶段：

- 重新 Brainstorm 产品方向；
- 扩大 MVP；
- 加 Chat；
- 加 Reminder；
- 加 Multi-course Dashboard；
- 加自动 Change Detection；
- 加自动后台监控；
- 做 Ignore memory；
- 做完整版本历史；
- 把 Source Evidence 常驻到主界面；
- 把 Spike 实验代码直接当生产架构；
- 因实现方便而静默改变 Product Decision。

---

# 10. 技术问题与产品问题的边界

如果 Technical Design 发现：

> 某个产品行为在 Chrome / Blackboard 环境中无法可靠实现，

请记录：

### Product-impacting Technical Conflict

至少说明：

- 冲突的产品规则；
- 真实技术限制；
- 已验证证据；
- 可选方案；
- 每个方案对用户体验和产品边界的影响；
- Codex 的技术建议。

然后：

> 停止自行改产品规则，交回产品侧确认。

---

# 11. 当前正式交付物

当前交接包包含：

## `07_Technical_Design_v0.1.0.md`

应包括：

- 系统结构；
- 模块职责；
- 数据流；
- 状态持久化；
- Scan 生命周期；
- Permission 机制；
- Source / Candidate / Course Brief 数据关系；
- Parser 边界；
- 错误隔离；
- Scan again 合并策略；
- 已知风险处理；
- 仍需产品决定的问题。

## `08_Implementation_Plan_v0.1.0.md`

实现计划必须建立在同一轮已经写出的技术设计上。

## `09_Product_Review_Summary_v0.1.0.md`

用非技术语言总结：
- 系统准备怎么搭；
- 关键技术选择；
- 已知风险；
- 哪些问题仍需要产品确认；
- 是否存在任何可能改变既定产品行为的技术冲突。

同时包含：

- `10_CODING_HANDOFF_README_v0.1.0.md`；
- `11_CODING_START_PROMPT_v0.1.0.md`；
- `Syllab_Coding_Handoff_v0.1.0.zip`。

本轮未修改 `01_Syllab_PRD_v0.1.0.md`、`04_Spike_Report_v0.1.0.md`、`06_MVP_Interaction_IA_Spec_v0.1.0.md`，也未开始 Coding。

---

# 12. 阶段 Gate

当前 Gate：

> **FINAL DELTA ALIGNMENT CHECK: PASS — CODING GATE OPEN**

Final Delta Alignment Check 已确认：

- 是否完整覆盖 PRD；
- 是否完整覆盖 `06_MVP_Interaction_IA_Spec_v0.1.0.md`；
- 是否尊重 `05_Product_Decision_Log_v0.1.0.md`；
- 是否处理 `04_Spike_Report_v0.1.0.md` 的 Known Risks；
- 是否增加未经确认的产品能力；
- 是否存在无法恢复的用户死路；
- 是否保护用户已确认事实；
- 是否避免虚假完整性。
- D-013 是否完整进入 Technical Design、Implementation Plan 和 Coding Handoff；
- Active Scan 是否在 Entry Routing 中优先于旧 Course Brief；
- Phase 1 是否同时建立 Extension / Backend Foundation，但未提前实现 AI Extraction。

结论：

```text
Final Delta Alignment Check: PASS
→ Formal MVP Coding 已开始
→ Rule Association Alignment: PASS
→ 继续 Phase 5–9 Milestone
```

---

# 13. Coding 启动前 Handoff Cleanup

下一位 Codex 在继续当前 Coding Milestone 前，必须先自动清理项目中的过时 handoff artifacts。

保留当前 canonical handoff：

- `00_PRODUCT_HANDOFF_README_v0.1.0.md`
- `10_CODING_HANDOFF_README_v0.1.0.md`
- `11_CODING_START_PROMPT_v0.1.0.md`
- `12_RULE_ASSOCIATION_HANDOFF_v0.1.0.md`
- 当前版本 `Syllab_Rule_Association_Handoff_v0.1.0.zip`（如果项目中保留 ZIP）

可以自动删除、无需再次询问：

- 更早产品版本的 `*HANDOFF*.md` / `*HANDOFF*.zip`；
- 更早产品版本的 `*CODING_START_PROMPT*.md`；
- 明显重复副本，例如文件名含 `(1)`、`(2)`、`copy`、`old`、`backup`、`previous`，且内容已被当前 canonical handoff 覆盖；
- 已明确被本包取代的旧 Coding / Product handoff ZIP。

绝对不要因为 cleanup 删除：

- `01_Syllab_PRD_v0.1.0.md`；
- `04_Spike_Report_v0.1.0.md`；
- `05_Product_Decision_Log_v0.1.0.md`；
- `06_MVP_Interaction_IA_Spec_v0.1.0.md`；
- `07_Technical_Design_v0.1.0.md`；
- `08_Implementation_Plan_v0.1.0.md`；
- `09_Product_Review_Summary_v0.1.0.md`；
- 任何代码、测试、真实项目资产或无法确定是否过时的文件。

如果某文件是否属于“过时 handoff”无法确定：

> 不删除，保留并在 preflight 汇报中列出。

Cleanup 完成后，Codex 应简短列出已删除的 stale handoff 文件和保留的 canonical handoff 文件，然后按 `12_RULE_ASSOCIATION_HANDOFF_v0.1.0.md` 继续当前 Milestone，不需要再向产品侧请求确认。


