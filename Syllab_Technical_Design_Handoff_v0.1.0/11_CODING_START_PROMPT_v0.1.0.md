# Syllab — Coding Start Prompt — v0.1.0

> **HISTORICAL PROMPT · DO NOT RUN**
> 该启动提示词对应的 Formal MVP Coding 已完成，Gate D 已 PASS。当前状态见 `../docs/final-acceptance-v0.1.0.md`；本文下方指令仅作历史记录。

我们现在继续 Syllab for NTU Learn 的 Formal MVP Coding。

当前产品版本：

> v0.1.0

产品需求、真实 Technical Spike、正式产品决定、MVP Interaction / IA、Technical Design 和 Implementation Plan 已经完成。不要重新做产品 Brainstorming，不要重做整个 Spike，不要重新设计 Technical Design。

Formal MVP Coding 已经开始。当前真实 vertical slice 已运行到 Review；Rule Association 的窄产品冲突已经完成 Alignment，D-014 已确认并同步到正式文档。

**不要重启 Phase 1，不要重做已经工作的 Discovery / Fetch / Parse / Normalize / DeepSeek Extraction / Review persistence / prompt v3 / local Candidate deduplication。**

当前继续入口是 `12_RULE_ASSOCIATION_HANDOFF_v0.1.0.md`。


## 0. Handoff Cleanup Preflight（先执行）

在开始任何 Coding 前，先扫描当前项目根目录和文档目录，自动清理过时 handoff 文件。不要向产品侧再次请求确认。

保留以下当前 canonical handoff：

- `00_PRODUCT_HANDOFF_README_v0.1.0.md`
- `10_CODING_HANDOFF_README_v0.1.0.md`
- `11_CODING_START_PROMPT_v0.1.0.md`
- `12_RULE_ASSOCIATION_HANDOFF_v0.1.0.md`
- 当前版本 `Syllab_Rule_Association_Handoff_v0.1.0.zip`（若项目保留 ZIP）

自动删除：

- 更早产品版本的 `*HANDOFF*.md`、`*HANDOFF*.zip`；
- 更早产品版本的 `*CODING_START_PROMPT*.md`；
- 明显重复的 handoff 副本，如 `(1)`、`(2)`、`copy`、`old`、`backup`、`previous`；
- 已明确被当前 v0.1.0 Coding Handoff 取代的旧 handoff ZIP。

不要删除：

- PRD；
- Spike Report；
- Product Decision Log；
- MVP Interaction / IA Spec；
- Technical Design；
- Implementation Plan；
- Product Review Summary；
- 任何代码、测试、真实项目资产；
- 任何无法确定是否属于 stale handoff 的文件。

如果不确定，保留该文件并在汇报里标记。Cleanup 完成后，简短输出：

1. `Deleted stale handoff files`；
2. `Kept canonical handoff files`；
3. `Ambiguous files kept`（如无则写 None）。

然后继续执行本提示词，不等待下一次确认；不要回到 Phase 1。

## 必读文件

请按以下顺序完整阅读：

1. `00_PRODUCT_HANDOFF_README_v0.1.0.md`
2. `01_Syllab_PRD_v0.1.0.md`
3. `04_Spike_Report_v0.1.0.md`
4. `05_Product_Decision_Log_v0.1.0.md`
5. `06_MVP_Interaction_IA_Spec_v0.1.0.md`
6. `07_Technical_Design_v0.1.0.md`
7. `08_Implementation_Plan_v0.1.0.md`
8. `09_Product_Review_Summary_v0.1.0.md`
9. `10_CODING_HANDOFF_README_v0.1.0.md`
10. `12_RULE_ASSOCIATION_HANDOFF_v0.1.0.md`

优先级：

- `01_Syllab_PRD_v0.1.0.md` 是产品需求事实源；
- `06_MVP_Interaction_IA_Spec_v0.1.0.md` 是交互事实源；
- `05_Product_Decision_Log_v0.1.0.md` 的正式决定不得自行推翻；
- `07_Technical_Design_v0.1.0.md` 是正式实现架构；
- `08_Implementation_Plan_v0.1.0.md` 是阶段执行与验收依据。

## 开始位置

不要从阶段 1 重启。当前项目已经进入 Phase 5–9 的核心 vertical-slice Milestone。

先执行：

> `12_RULE_ASSOCIATION_HANDOFF_v0.1.0.md`

目标只是在现有工作链路上完成 D-014：

```text
Candidate relationship schema
→ Review parent context
→ Brief child → parent persistence
→ top-level no-duplication
→ Scan again relationship matching
→ regression tests
```

完成后继续当前 Milestone 的剩余工作。不要为了 D-014 重构无关模块。

## 执行要求

1. 严格按 Implementation Plan 推进，但从当前已完成状态继续，不重启前序阶段。
2. 先完成 D-014 delta，并保持现有真实 vertical slice 可回归。
3. 每阶段开始前说明目标、依赖和本阶段不会做什么。
4. 每阶段完成后逐项验证验收条件并运行相关自动测试；测试通过后直接继续，不需要每个 Phase 停下来等待产品确认。
5. 仅在 Milestone Gate（Phase 1–4 / 5–9 / 10–12 / 13–15）停止做产品侧 Review；Product-impacting Technical Conflict 或关键测试无法解决时随时提前停止。
6. 标记“真实 NTU Learn：必须”的阶段必须在真实环境验证并保存脱敏证据。
7. 不以 build success 代替完整用户闭环和人工检查。
8. 到 Milestone Gate 时汇报：实现内容、测试结果、真实环境结果、未验证项、Known Risks 变化、下一 Milestone 建议。

## 不可改变的产品规则

- 只有 Saved Courses、Scan、Review、Course Brief 4 个主要界面；
- 当前课程上下文优先；首次 Scan 由用户明确启动；
- 同一课程有 Scanning、Waiting for Permission 或可恢复 Interrupted 时，Entry 优先进入 Scan，即使旧 Course Brief 已存在；
- Scan 不选择来源，不显示百分比或 ETA，不制造绝对完整性；
- 动态请求实际发现的精确 Blackboard / Xythos host permission；
- Deny 后其他来源继续，同一次 Scan 不反复请求；
- Review 一个界面、Needs Review / Detected 两区；只做分类级 Confirm all；
- Assessment-specific Date / Rule 仍在原类别 Review，并显示 `Applies to <Assessment>`；关系不明确进入 Needs Review；
- Confirm child fact 不自动确认 parent Assessment；确认后 child 归入 parent，不在顶层日期 / Rules 重复展示；
- Course Brief 是事实层；允许已确认主体 + Unresolved field；
- Source 默认隐藏，原始证据永久保留；
- Calendar 只消费 Confirmed Date 并输出 `.ics`；
- Saved Courses 只做导航与处理状态；
- Partial 可 Review；Failed 不进入正常 Review；Interrupted 不等于 Partial；
- Unsupported 无无意义 Retry；No Items Detected 不表示课程没有信息；
- Popup 关闭不等于 Cancel；旧 Brief 不因失败、中断或取消清空；
- Scan again 不清空、不自动覆盖 Confirmed / Edited / User-added；
- MVP 不做自动 Change Detection、Ignore memory、Chat、Reminder、多课程 Dashboard；
- External AI 只通过 Syllab Backend 调用 DeepSeek `deepseek-flash`；不做其他 Provider、DeepSeek Pro、Router、模型切换或 fallback；
- Extension 不持有 DeepSeek API Key；真实 Key 只由 Backend server-side Secret / Environment Variable 注入，不进入 GitHub；
- 用户无需账号或登录；采用匿名 installation identity + installation token；
- Backend 在 DeepSeek 前执行 token validation、installation enablement、rate limit、usage cap、global budget guard；
- Backend 只是 AI Proxy + Access Control + Usage Protection，不做 Cloud Course Database、Cloud Sync、Multi-device Sync 或 Admin Dashboard；
- 不读取密码、SSO / MFA，不读取成绩 / 提交记录，不修改 Blackboard。

## 实现偏差

如果实际实现需要偏离 Technical Design，先记录：原设计、实际限制、证据、影响和替代方案。

如果偏差会改变产品行为，必须按以下格式提交并停止该路径：

1. 冲突的产品规则；
2. 真实技术限制；
3. 已有证据；
4. 可选技术 / 产品方案；
5. 每个方案影响；
6. 技术建议。

不得自行：

- 改成广泛 Blackboard 域权限；
- 删除 Review；
- 让 AI 直接写 Course Brief；
- 覆盖用户事实；
- 为方便开发扩大 MVP。
- 把 DeepSeek Key 放进 Extension、GitHub、客户端配置或日志；
- 增加账号、OAuth、Invite Code、多模型或云端 Course Brief 存储。

## 真实环境失败

遇到真实 NTU Learn 失败时，先定位身份、API、登录态、权限、重定向、parser、数据规模或模型层原因；保留脱敏复现证据。单 Source 失败按 Partial 隔离，不以硬编码或隐藏错误处理。如果失败迫使产品行为变化，停止并交回产品侧确认。

## 阶段停止条件

以下情况立即停止并交回产品侧：

- 动态精确权限真实验证不可行；
- DeepSeek 官方 API 变化会影响已确认产品行为；
- 匿名认证或用量保护无法在不增加账号的边界内成立；
- 必须改变正式 Product Decision 才能继续；
- 必须扩大到 Non-goal；
- 会自动覆盖 Confirmed / Edited / User-added；
- 外部 AI 数据边界无法满足；
- 一个关键阶段的真实环境 Gate 无法通过且没有范围内修复路径。

完成阶段 15 Final acceptance 后也必须停止，提交完整验收证据，由产品侧决定下一步。

完成下面的 Handoff Cleanup Preflight，并确认已完整阅读上述文件后，直接开始阶段 1 Project foundation：Extension Foundation + Backend Foundation。
