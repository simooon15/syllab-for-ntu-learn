# Syllab — Coding Handoff README — v0.1.0

> **HISTORICAL INPUT · DO NOT USE AS CURRENT CODING HANDOFF**
> 本文件保留 Phase 5–9 时的执行上下文。v0.1.0 已实现并于 2026-09-17 通过 Gate D。当前事实源是 `../docs/final-acceptance-v0.1.0.md`；不要按本文档继续 Coding。

> 产品版本：v0.1.0
> 下一阶段：继续 Formal MVP Coding 当前 Milestone
> 当前 Gate：RULE ASSOCIATION ALIGNMENT: PASS — D-014 APPROVED
> 重要：不要重启 Phase 1。下一位 Codex 完成 handoff cleanup preflight 后，按 `12_RULE_ASSOCIATION_HANDOFF_v0.1.0.md` 继续当前 Phase 5–9 Milestone。

## 1. 当前项目状态

已完成：

```text
产品需求
→ Technical Spike（PASS WITH KNOWN RISKS）
→ 产品决策记录
→ MVP Interaction / IA
→ Technical Design
→ Implementation Plan
→ 产品技术评审摘要
→ Product Alignment Check（PASS WITH REQUIRED FIXES）
→ D-013 / DeepSeek Backend / Active Scan Routing Required Fixes
```

Formal MVP Coding 已经开始。当前真实 vertical slice 已运行通过 Discovery → Fetch → Parse → Normalize → DeepSeek Extraction → Review；Review persistence、prompt v3 与本地 Candidate deduplication 已存在。Rule / Assessment presentation 与 Brief persistence 曾暂停等待产品决定，现 D-014 已通过，可以继续。

不要回滚或重做上述已工作链路；没有新证据时也不要把 Spike 实验代码当正式工程基线。

## 2. 下一位 Codex 必读顺序

必须完整阅读：

1. `00_PRODUCT_HANDOFF_README_v0.1.0.md`
2. `01_Syllab_PRD_v0.1.0.md`
3. `04_Spike_Report_v0.1.0.md`
4. `05_Product_Decision_Log_v0.1.0.md`
5. `06_MVP_Interaction_IA_Spec_v0.1.0.md`
6. `07_Technical_Design_v0.1.0.md`
7. `08_Implementation_Plan_v0.1.0.md`
8. `09_Product_Review_Summary_v0.1.0.md`
9. 本文件
10. `11_CODING_START_PROMPT_v0.1.0.md`
11. `12_RULE_ASSOCIATION_HANDOFF_v0.1.0.md`

优先级仍为：PRD 是产品需求事实源；Interaction / IA 是交互事实源；Decision Log 的正式决定不可自行推翻；Technical Design 与 Implementation Plan 负责“怎么实现”。



## 2.1 Coding 前 Handoff Cleanup Preflight

开始阅读和 Coding 前，先扫描项目根目录及文档目录中的 handoff artifacts，并自动删除已被本包取代的过时 handoff。

**必须保留：**

- `00_PRODUCT_HANDOFF_README_v0.1.0.md`
- `10_CODING_HANDOFF_README_v0.1.0.md`
- `11_CODING_START_PROMPT_v0.1.0.md`
- `12_RULE_ASSOCIATION_HANDOFF_v0.1.0.md`
- 当前版本 `Syllab_Rule_Association_Handoff_v0.1.0.zip`（若项目保留 ZIP）

**可以直接删除：**

- 旧产品版本的 `*HANDOFF*.md` / `*HANDOFF*.zip`；
- 旧产品版本的 `*CODING_START_PROMPT*.md`；
- 明显重复的 handoff 副本，例如 `(1)`、`(2)`、`copy`、`old`、`backup`、`previous`；
- 已明确由当前 v0.1.0 Coding Handoff 取代的旧交接 ZIP。

**不得删除：** PRD、Spike、Decision Log、Interaction / IA、Technical Design、Implementation Plan、Product Review Summary，以及代码、测试、项目资产。

无法确定是否过时的文件不要删除；保留并在 preflight 汇报中列出。Cleanup 后简短汇报删除列表，然后直接继续，不需要向产品侧再次请求确认。

## 3. Technical Design 核心结论

- 使用 Chrome Manifest V3 扩展；Popup 只做 UI，不拥有扫描任务。
- Content Script / Page Bridge 只读 NTU Learn 上下文；Service Worker 编排任务。
- Service Worker 是短生命周期，所有扫描用 IndexedDB / `chrome.storage.local` checkpoint，可重入。
- 扫描流水线：Course Detection → Discover → Fetch → Parse → Normalize → AI Extract → Candidate → Review → Course Brief → Calendar。
- Source / Evidence、Candidate、Course Brief 三层分离；Course Brief 才是用户事实层。
- 文件解析在独立 Worker / Offscreen Document，单文件隔离，不长期保存完整文件。
- AI 链路固定为 Extension → Syllab Backend / AI Proxy → DeepSeek `deepseek-flash`；AI 只输出候选和证据关联，不直接写 Brief。
- Backend 负责匿名 installation authentication、registration、rate limit、usage cap、global budget guard 和 DeepSeek Secret；不拥有 Course Brief 或长期课程数据。
- Extension 不含 DeepSeek API Key；GitHub 只允许 `.env.example`，生产 Key 由 Backend server-side Secret 注入。
- 动态权限由 Popup 的用户点击请求精确 origin；Deny 后其他来源继续并可 Partial。
- Popup 关闭不等于 Cancel；checkpoint 失去执行时明确 Interrupted。
- 当前课程存在 Scanning、Waiting for Permission 或可恢复 Interrupted 时，Entry 优先进入 Scan，即使旧 Course Brief 已存在。
- Scan again 新建 scanId，不清空或自动覆盖 Confirmed、Edited、User-added。
- Calendar 只读取 Confirmed Date，输出 `.ics`，不重新决定事实。

## 4. 已确认的关键技术决定

1. Course ID 优先使用 Blackboard 原生 ID；不以标题猜测身份。
2. Content API 为发现主路径；显式队列、分页、visited set 与分支诊断处理多层遍历。
3. Source identity 不使用 signed URL；优先原生 item / attachment ID，辅以 canonical URL、parent 和 content hash。
4. IndexedDB 保存结构化持久数据；`chrome.storage.local` 保存轻量索引与任务指针；不使用 sync。
5. 必须使用 checkpoint；Continue 同一 scanId，Full Try again 新 scanId。
6. 动态权限请求必须由用户手势触发；每个 Scan 用 requested / denied origin 集合避免反复请求。
7. PDF 用本地 PDF.js；PPTX / DOCX 用本地 ZIP/XML；legacy PPT / DOC 正确识别后允许 Unsupported。
8. Candidate risk routing 以证据、冲突与不确定性为依据；无 evidence 候选不能进入 Detected。
9. 字段级状态只用于真实需要的少量 Unresolved 字段。
10. Retry 与 Scan again 分离；Retry 幂等恢复当前 Scan，Scan again 是新的主动全量扫描。
11. D-013：v0.1.0 唯一 Provider / Model 为 DeepSeek / `deepseek-flash`；不做 Router、Pro、模型切换或 fallback。
12. Backend 只是 AI Proxy + Access Control + Usage Protection；不做账号、Cloud Course Database、Cloud Sync 或 Admin Dashboard。
13. 匿名 installation token 由 Backend 独立签发；所有 AI 请求先过认证、rate limit、usage cap 和 global budget guard。
14. Active Scan Routing 优先于旧 Brief，但仍然只有 4 个主要界面。
15. D-014：Assessment-specific Date / Rule 必须有稳定 parent Assessment relationship；Review 保持分类扁平并显示 parent context，确认后 child 归入 parent 且不得在顶层重复。

## 5. 开发时不可改变的产品规则

- 只有 Saved Courses、Scan、Review、Course Brief 4 个主要界面；不做多 Tab 工作台。
- 当前课程上下文优先；首次扫描由用户明确点击启动。
- 同一课程存在 active / recoverable Scan 时，入口优先回到 Scan；旧 Brief 仍保留。
- Scan 不允许用户选择来源；进度无百分比和 ETA；Coverage 不承诺课程绝对完整。
- Review 一个界面、Needs Review / Detected 两区；只有分类级 Confirm all，无全局 Confirm all。
- Course Brief 是事实层；允许已确认主体 + Unresolved field；未解决日期不可导出。
- Assessment-specific Date / Rule 仍独立 Review，但必须显示 `Applies to <Assessment>`；关系不明确进入 Needs Review。
- Confirm child fact 不自动 Confirm parent；确认后 child 归入 parent Assessment，不在 Other Important Dates / Important Rules 重复。
- Source 默认隐藏，但 Edit / Resolve 后原始证据仍保留。
- Saved Courses 只做导航与处理状态，不做 Dashboard。
- Partial 可进入 Review；Failed 不进入正常 Review；Interrupted 不得伪装成 Partial。
- Unsupported 无无意义 Retry；No Items Detected 不等于课程没有信息。
- Popup 关闭不等于 Cancel；已有 Brief 不因失败或中断清空。
- Scan again 不清空 / 自动覆盖 Confirmed、Edited、User-added。
- MVP 不做自动 Change Detection、Ignore memory、Chat、Reminder、多课程 Dashboard。
- MVP 不做 Syllab Account、Login、OAuth、Cloud Sync、Admin Dashboard、多模型或 DeepSeek Pro。
- 不读取 NTU 密码，不保存 SSO / MFA，不读取成绩 / 提交记录，不修改 Blackboard。

## 6. 正式 Coding 推荐顺序

严格按 `08_Implementation_Plan_v0.1.0.md`：

1. Project foundation（同时建立 Extension Foundation + Backend Foundation，不实现完整 AI Extraction）
2. Current course detection / routing
3. Scan discovery
4. Fetch / attachment permission
5. Parsers（5A PDF vertical slice；5B PPTX / DOCX / legacy detection / large-file enhancement）
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

先用 PDF 完成一个来源的完整闭环，再补 PPTX / DOCX 等格式；不要在最初阶段同时追求所有格式、课程结构和异常的最复杂实现。

## 7. 每阶段测试纪律

每个阶段仍必须自测和满足自身验收，但**不需要每个 Phase 停下来等产品侧确认**。正常情况下测试通过后继续执行，只有到 Milestone Gate（1–4 / 5–9 / 10–12 / 13–15）才停下来做产品侧 Review；Product-impacting Technical Conflict 或关键测试无法解决时随时提前停止。

阶段内必须：

- 跑 typecheck / lint / unit / relevant integration；
- 验证状态持久化和错误分支，不只验证 happy path；
- 对该阶段标记“真实 NTU Learn：必须”的项目立即实测；
- 记录测试命令、结果、浏览器版本、样本类型、未验证项；
- 人工检查渲染和完整用户路径，不以 build success 代替体验验收；
- 更新阶段验收记录后才进入下一阶段。

测试重点按阶段：

- 1–2：Extension / Backend 启动、Secret 边界、Manifest、最小权限、Active Scan 路由、Course ID；
- 3–4：多层遍历、分页、Announcement / Assignment、Allow / Deny / resume；
- 5–7：PDF vertical slice、PPTX / DOCX、locator、去重、DeepSeek schema、匿名认证与用量门禁、冲突与模糊日期；
- 8–9：所有 Review 操作、自动保存、Brief 事实保护、证据保留；
- 10：Complete / Partial / Failed / Interrupted、Cancel / Continue / Retry；
- 11：Confirmed Date 门禁与 `.ics` 客户端导入；
- 12：相同、新增、冲突、旧来源缺失、Ignored 再出现；
- 13–15：完整闭环、人工基准、多课程、Known Risks、安全与范围审计。

## 8. 必须真实 NTU Learn 验证的步骤

- 当前课程识别与 SPA 路由；
- Content API、多层 folder、分页、Announcements、Assignments；
- Blackboard → Xythos 重定向和真实附件字节；
- 精确 host permission 的 Chrome 用户手势、提示、Allow、Deny、恢复、同 Scan 不重复；
- 真实 PDF、PPTX、DOCX 端到端；legacy PPT / DOC 真实识别（有样本时）；
- 大文件内存、耗时、失败隔离；
- Popup 关闭、Service Worker 回收、断网、Interrupted / Continue；
- 真实候选 Review → Brief → `.ics`；
- 同课程 Scan again；
- 多门不同结构课程与人工基准答案。

Backend / AI 还必须验证：未认证、无效 token、rate limit、usage cap、global budget guard 均不会触发 DeepSeek；Extension bundle 与 Git tracked files 不含真实 Key；Backend 仅从 server-side Secret 读取 `DEEPSEEK_API_KEY`。

## 9. 未解决风险

- KR-01 跨课程兼容性；
- KR-02 PPTX / DOCX 真实端到端；
- KR-03 legacy PPT / DOC；
- KR-04 traversal completeness；
- KR-05 动态精确附件权限；
- KR-06 large file handling。

不得把这些项目在没有新证据时写成 PASS。

## 10. 实现偏差怎么记录

普通工程偏差记录：

- 原计划；
- 实际实现；
- 原因；
- 测试证据；
- 是否影响数据、交互、权限或 MVP 范围。

如果影响正式产品决定，必须记录 Product-impacting Technical Conflict：

1. 冲突的产品规则；
2. 真实技术限制；
3. 已有证据与复现；
4. 可选技术 / 产品方案；
5. 每个方案影响；
6. 技术建议。

然后停止该冲突路径，交回产品确认。不得为了方便直接申请广泛域权限、改变 Review / Brief 或扩大 MVP。

## 11. 真实环境失败怎么处理

- 先确认是 fixture 差异、登录态、权限、API 变化、parser、数据规模还是模型问题；
- 保留脱敏复现证据，不保存 Cookie、Token、Signed URL query 或无关课程正文；
- 单 Source 失败按两层异常模型处理，不立即改成整课 Failed；
- 不用隐藏错误、硬编码课程或放宽产品边界“修复”；
- 若影响产品行为，使用上节冲突流程；
- 若只是实现缺陷，修复并重跑该阶段及相关回归测试。

## 12. 每阶段如何验收与何时停止

每阶段以 `08_Implementation_Plan_v0.1.0.md` 对应的“验收条件”逐项勾验。只要有必需条件未满足，该阶段保持未完成。

正式开发应在以下时点交回产品侧：

- 出现产品影响技术冲突；
- 一个阶段需要扩大 MVP 才能继续；
- 动态精确权限验证失败；
- 真实课程证据显示当前边界显著损害核心价值；
- 阶段 15 完成，提交最终验收材料，由产品决定发布或继续修正。

不要在交回前自行重做产品设计或 Technical Design。

## 13. 下一轮第一步

Product-side Final Delta Alignment Check 已通过。

> 不要重启 Phase 1。先阅读 `12_RULE_ASSOCIATION_HANDOFF_v0.1.0.md`，在现有真实 vertical slice 上完成 D-014：relationship schema → Review context label → Brief child/parent persistence + no-duplication → Scan again relationship matching → 回归测试。

D-014 范围完成并通过阶段内测试后，继续当前 Phase 5–9 Milestone；到 Milestone Gate 再停下来汇报。

## 14. 上游事实源未变化

D-013 和 Required Fixes 属于技术接入与路由收口，不修改：

- `01_Syllab_PRD_v0.1.0.md`；
- `04_Spike_Report_v0.1.0.md`；
- `06_MVP_Interaction_IA_Spec_v0.1.0.md`。
